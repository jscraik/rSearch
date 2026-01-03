import { load } from "cheerio";
import { RateLimiter } from "./rateLimiter.js";
import { VERSION } from "../version.js";

export type TaxonomyCategory = {
  id: string;
  name: string;
  description?: string;
  group: string;
};

export type TaxonomyGroup = {
  name: string;
  categories: TaxonomyCategory[];
};

export type TaxonomyResult = {
  sourceUrl: string;
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
};

export type TaxonomyConfig = {
  taxonomyUrl: string;
  userAgent: string;
  timeoutMs: number;
  minIntervalMs: number;
};

const defaultConfig: TaxonomyConfig = {
  taxonomyUrl: "https://arxiv.org/category_taxonomy",
  userAgent: `arxiv-cli/${VERSION}`,
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
