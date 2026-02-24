import type { ArxivSearchOptions } from "./types.js";

/** Default page size for arXiv API queries. */
export const DEFAULT_PAGE_SIZE = 100;

/** Maximum page size allowed by the arXiv API. */
export const MAX_PAGE_SIZE = 2000;

/** Maximum total results that can be retrieved in one search. */
export const MAX_TOTAL_RESULTS = 30000;

/**
 * Extended options for building arXiv API queries.
 *
 * @public
 */
export type BuildQueryOptions = ArxivSearchOptions & {
  pageSize?: number;
  start?: number;
};

/**
 * Result of building an arXiv API query.
 *
 * @public
 */
export type BuiltQuery = {
  /** Complete URL with query parameters */
  url: string;
  /** Query parameter string */
  query: string;
  /** Parsed query parameters */
  params: URLSearchParams;
};

/**
 * Builds an arXiv API query URL and parameters.
 *
 * @param baseUrl - Base URL for the arXiv API
 * @param options - Query options including search query, IDs, pagination
 * @returns Object containing URL, query string, and parameters
 * @throws {Error} If neither searchQuery nor idList is provided
 * @throws {Error} If start is negative
 * @throws {Error} If maxResults is less than 1
 *
 * @example
 * ```ts
 * const { url } = buildQuery("https://export.arxiv.org/api/query", {
 *   searchQuery: "cat:cs.AI",
 *   maxResults: 10
 * });
 * ```
 *
 * @public
 */
export const buildQuery = (
  baseUrl: string,
  options: BuildQueryOptions
): BuiltQuery => {
  const params = new URLSearchParams();
  const searchQuery = options.searchQuery?.trim();

  const idList = normalizeList(options.idList);

  if (searchQuery) {
    params.set("search_query", searchQuery);
  }

  if (idList && idList.length > 0) {
    params.set("id_list", idList.join(","));
  }

  if (!params.has("search_query") && !params.has("id_list")) {
    throw new Error("Provide a search query or at least one arXiv id.");
  }

  if (typeof options.start === "number") {
    if (!Number.isFinite(options.start) || !Number.isInteger(options.start) || options.start < 0) {
      throw new Error("start must be a non-negative integer.");
    }
    params.set("start", String(options.start));
  }

  if (typeof options.maxResults === "number") {
    if (!Number.isFinite(options.maxResults) || !Number.isInteger(options.maxResults) || options.maxResults < 1) {
      throw new Error("maxResults must be a positive integer.");
    }
    params.set("max_results", String(options.maxResults));
  }

  if (options.sortBy) {
    params.set("sortBy", options.sortBy);
  }

  if (options.sortOrder) {
    params.set("sortOrder", options.sortOrder);
  }

  const mergedParams = new URLSearchParams();
  let urlObject: URL;
  try {
    urlObject = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  for (const [key, value] of urlObject.searchParams.entries()) {
    mergedParams.set(key, value);
  }
  for (const [key, value] of params.entries()) {
    mergedParams.set(key, value);
  }

  const query = mergedParams.toString();
  urlObject.search = query;
  return { url: urlObject.toString(), query, params: mergedParams };
};

const normalizeList = (value: string[] | undefined): string[] | undefined => {
  if (!value) return undefined;
  return value
    .flatMap((item) => item.split(/[\s,]+/))
    .map((item) => item.trim())
    .filter(Boolean);
};
