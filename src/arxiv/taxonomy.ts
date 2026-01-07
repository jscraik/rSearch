import { load } from "cheerio";
import { RateLimiter } from "./rateLimiter.js";
import { VERSION } from "../version.js";

/**
 * A single arXiv category.
 *
 * @public
 */
export type TaxonomyCategory = {
  /** Category ID (e.g., "cs.AI") */
  id: string;
  /** Human-readable category name */
  name: string;
  /** Optional description of the category */
  description?: string;
  /** Group this category belongs to (e.g., "Computer Science") */
  group: string;
};

/**
 * A group of related arXiv categories.
 *
 * @public
 */
export type TaxonomyGroup = {
  /** Group name */
  name: string;
  /** Categories in this group */
  categories: TaxonomyCategory[];
};

/**
 * Complete arXiv taxonomy result.
 *
 * @public
 */
export type TaxonomyResult = {
  /** URL where the taxonomy was fetched from */
  sourceUrl: string;
  /** Hierarchical groups */
  groups: TaxonomyGroup[];
  /** Flat list of all categories */
  categories: TaxonomyCategory[];
};

/**
 * Configuration for fetching arXiv taxonomy.
 *
 * @public
 */
export type TaxonomyConfig = {
  /** URL of the arXiv category taxonomy page */
  taxonomyUrl: string;
  /** User-Agent header for requests */
  userAgent: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Minimum interval between requests */
  minIntervalMs: number;
};

const defaultConfig: TaxonomyConfig = {
  taxonomyUrl: "https://arxiv.org/category_taxonomy",
  userAgent: `rsearch/${VERSION}`,
  timeoutMs: 15000,
  minIntervalMs: 3000
};

let cachedHtml: string | null = null;
let cachedResult: TaxonomyResult | null = null;

const parseCategoryHeading = (text: string): { id: string; name: string } | null => {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([A-Za-z0-9.\-]+)\s*\((.+)\)$/);
  if (match) {
    return { id: match[1], name: match[2].trim() };
  }

  const parts = trimmed.split(/\s+-\s+/);
  if (parts.length === 2) {
    return { id: parts[0].trim(), name: parts[1].trim() };
  }

  return { id: trimmed, name: trimmed };
};

const normalizeGroupName = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

/**
 * Parses arXiv taxonomy HTML into structured data.
 *
 * @param html - Raw HTML from arXiv category taxonomy page
 * @param sourceUrl - URL where the HTML was fetched (included in result)
 * @returns Parsed taxonomy with groups and categories
 *
 * @remarks
 * Extracts category IDs, names, descriptions, and groupings
 * from the arXiv category taxonomy page structure.
 *
 * @public
 */
export const parseTaxonomyHtml = (html: string, sourceUrl: string): TaxonomyResult => {
  const $ = load(html);
  const scope = $("#content").length ? $("#content") : $("main").length ? $("main") : $("body");

  const groups = new Map<string, TaxonomyCategory[]>();
  let currentGroup = "";

  scope.find("h2, h4").each((_, element) => {
    const tag = element.tagName.toLowerCase();
    const text = $(element).text();

    if (tag === "h2") {
      const groupName = normalizeGroupName(text);
      if (!groupName) {
        return;
      }
      if (groupName.toLowerCase().includes("classification")) {
        return;
      }
      currentGroup = groupName;
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      return;
    }

    if (tag === "h4" && currentGroup) {
      const parsed = parseCategoryHeading(text);
      if (!parsed) {
        return;
      }

      const description = $(element)
        .nextUntil("h2, h4")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const category: TaxonomyCategory = {
        id: parsed.id,
        name: parsed.name,
        description: description || undefined,
        group: currentGroup
      };

      groups.get(currentGroup)?.push(category);
    }
  });

  const groupList: TaxonomyGroup[] = Array.from(groups.entries()).map(([name, categories]) => ({
    name,
    categories
  }));

  const allCategories = groupList.flatMap((group) => group.categories);

  return {
    sourceUrl,
    groups: groupList,
    categories: allCategories
  };
};

/**
 * Fetches the arXiv category taxonomy.
 *
 * @param config - Optional configuration overrides
 * @param options - Options for cache behavior
 * @returns Promise resolving to parsed taxonomy
 * @throws {Error} If the HTTP request fails
 *
 * @example
 * ```ts
 * const taxonomy = await fetchTaxonomy();
 * console.log(`Found ${taxonomy.categories.length} categories`);
 * ```
 *
 * @example
 * ```ts
 * // Force refresh cache
 * const taxonomy = await fetchTaxonomy({}, { refresh: true });
 * ```
 *
 * @remarks
 * Results are cached in-memory. Use `{ refresh: true }` to bypass cache.
 *
 * @public
 */
export const fetchTaxonomy = async (
  config: Partial<TaxonomyConfig> = {},
  options: { refresh?: boolean } = {}
): Promise<TaxonomyResult> => {
  const resolved = { ...defaultConfig, ...config };

  if (!options.refresh && cachedResult) {
    return cachedResult;
  }

  if (!options.refresh && cachedHtml) {
    cachedResult = parseTaxonomyHtml(cachedHtml, resolved.taxonomyUrl);
    return cachedResult;
  }

  const limiter = new RateLimiter(resolved.minIntervalMs);
  await limiter.wait();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolved.timeoutMs);

  const response = await fetch(resolved.taxonomyUrl, {
    headers: {
      "User-Agent": resolved.userAgent,
      Accept: "text/html"
    },
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch taxonomy (${response.status} ${response.statusText})`);
  }

  const html = await response.text();
  cachedHtml = html;
  cachedResult = parseTaxonomyHtml(html, resolved.taxonomyUrl);
  return cachedResult;
};
