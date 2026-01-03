import type { ArxivSearchOptions } from "./types.js";

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 2000;
export const MAX_TOTAL_RESULTS = 30000;

export type BuildQueryOptions = ArxivSearchOptions & {
  pageSize?: number;
  start?: number;
};

export type BuiltQuery = {
  url: string;
  query: string;
  params: URLSearchParams;
};

const normalizeList = (value: string[] | undefined): string[] | undefined => {
  if (!value) return undefined;
  return value
    .flatMap((item) => item.split(/\s*,\s*/))
    .map((item) => item.trim())
    .filter(Boolean);
};

export const buildQuery = (
  baseUrl: string,
  options: BuildQueryOptions
): BuiltQuery => {
  const params = new URLSearchParams();

  const idList = normalizeList(options.idList);

  if (options.searchQuery) {
    params.set("search_query", options.searchQuery);
  }

  if (idList && idList.length > 0) {
    params.set("id_list", idList.join(","));
  }

  if (!params.has("search_query") && !params.has("id_list")) {
    throw new Error("Provide a search query or at least one arXiv id.");
  }

  if (typeof options.start === "number") {
    if (options.start < 0) {
      throw new Error("start must be >= 0");
    }
    params.set("start", String(options.start));
  }

  if (typeof options.maxResults === "number") {
    if (options.maxResults < 1) {
      throw new Error("maxResults must be >= 1");
    }
    params.set("max_results", String(options.maxResults));
  }

  if (options.sortBy) {
    params.set("sortBy", options.sortBy);
  }

  if (options.sortOrder) {
    params.set("sortOrder", options.sortOrder);
  }

  const url = `${baseUrl}?${params.toString()}`;
  return { url, query: params.toString(), params };
};
