import { XMLParser } from "fast-xml-parser";
import type { ArxivEntry } from "./types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  ignoreDeclaration: true,
  ignorePiTags: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  removeNSPrefix: true
});

const normalizeArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text || text === "undefined" || text === "null") {
    return undefined;
  }
  return text;
};

const extractId = (entryId: string): string => {
  const absMatch = entryId.match(/arxiv\.org\/abs\/([^?#]+)/i);
  if (absMatch?.[1]) {
    return absMatch[1].replace(/\/+$/, "");
  }

  if (/^https?:\/\//i.test(entryId)) {
    try {
      const parsed = new URL(entryId);
      if (parsed.hostname.toLowerCase().endsWith("arxiv.org")) {
        const marker = "/abs/";
        const lowerPath = parsed.pathname.toLowerCase();
        const idx = lowerPath.indexOf(marker);
        if (idx !== -1) {
          return parsed.pathname.slice(idx + marker.length).replace(/\/+$/, "");
        }
      }
    } catch {
      // Fall through to raw value.
    }
  }

  return entryId.replace(/[?#].*$/, "").replace(/\/+$/, "");
};

const extractAbsUrl = (entryId: string): string => {
  if (/^https?:\/\//i.test(entryId)) {
    return entryId;
  }
  return `https://arxiv.org/abs/${entryId}`;
};

const pickPdfUrl = (links: ArxivEntry["links"]): string | undefined => {
  const pdfLink = links.find((link) => link.title === "pdf")
    ?? links.find((link) => link.type === "application/pdf")
    ?? links.find((link) => link.href.includes("/pdf/"));
  return pdfLink?.href;
};

const pickLicenseUrl = (links: ArxivEntry["links"]): string | undefined =>
  links.find((link) => link.rel === "license")?.href;

const looksLikeUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value);

const pickLicenseFields = (rawLicense: unknown): { license?: string; licenseUrl?: string } => {
  const values = Array.isArray(rawLicense) ? rawLicense : [rawLicense];

  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      return {
        license: trimmed,
        licenseUrl: looksLikeUrl(trimmed) ? trimmed : undefined
      };
    }

    if (typeof value === "object") {
      const node = value as Record<string, unknown>;
      const href = typeof node.href === "string" ? node.href.trim() : "";
      const text =
        typeof node["#text"] === "string"
          ? node["#text"].trim()
          : typeof node.text === "string"
            ? node.text.trim()
            : "";

      const license = text || href || undefined;
      const licenseUrl = [href, text].find((candidate) => candidate && looksLikeUrl(candidate));
      if (license || licenseUrl) {
        return { license, licenseUrl };
      }
    }
  }

  return {};
};

const parseNonNegativeInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.trunc(parsed);
};

/**
 * Parsed arXiv Atom feed result.
 *
 * @public
 */
export type ParsedFeed = {
  /** Total number of results matching the query */
  totalResults: number;
  /** Starting index of this page */
  startIndex: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Array of parsed paper entries */
  entries: ArxivEntry[];
};

/**
 * Parses arXiv Atom XML feed into structured data.
 *
 * @param xml - Raw XML string from arXiv API
 * @returns Parsed feed with entries
 *
 * @remarks
 * Extracts IDs, titles, summaries, authors, categories, links,
 * and license information from the Atom feed format.
 *
 * @public
 */
export const parseAtom = (xml: string): ParsedFeed => {
  const parsed = parser.parse(xml);
  const feed = parsed?.feed ?? {};
  const entriesRaw = normalizeArray(feed.entry);

  const entries: ArxivEntry[] = entriesRaw
    .map((entry: any): ArxivEntry | null => {
    const links = normalizeArray(entry.link)
      .map((link: any): ArxivEntry["links"][number] | null => {
        const href = normalizeText(link?.href ?? (typeof link === "string" ? link : undefined));
        if (!href) {
          return null;
        }

        const normalized: ArxivEntry["links"][number] = { href };
        const rel = normalizeText(link?.rel);
        const type = normalizeText(link?.type);
        const title = normalizeText(link?.title);
        if (rel) normalized.rel = rel;
        if (type) normalized.type = type;
        if (title) normalized.title = title;
        return normalized;
      })
      .filter((link): link is ArxivEntry["links"][number] => link !== null);

    const categories = normalizeArray(entry.category)
      .map((cat: any) => normalizeText(cat?.term ?? cat))
      .filter((category): category is string => Boolean(category));

    const authors = normalizeArray(entry.author)
      .map((author: any) => normalizeText(author?.name ?? author))
      .filter((author): author is string => Boolean(author));

      const entryId = normalizeText(entry.id) ?? "";
      const arxivId = normalizeText(extractId(entryId));
      if (!arxivId) {
        return null;
      }
      const absUrl = extractAbsUrl(entryId);

      const primaryCategory = normalizeText(entry.primary_category?.term);

      const record: ArxivEntry = {
        id: arxivId,
        title: normalizeText(entry.title) ?? "",
        summary: normalizeText(entry.summary) ?? "",
        published: normalizeText(entry.published) ?? "",
        updated: normalizeText(entry.updated) ?? "",
        authors,
        categories,
        primaryCategory,
        links,
        doi: normalizeText(entry.doi),
        comment: normalizeText(entry.comment),
        journalRef: normalizeText(entry.journal_ref),
        absUrl
      };

      const parsedLicense = pickLicenseFields(entry.license);
      record.pdfUrl = pickPdfUrl(links);
      record.license = parsedLicense.license;
      record.licenseUrl = pickLicenseUrl(links)
        ?? parsedLicense.licenseUrl;

      return record;
    })
    .filter((entry): entry is ArxivEntry => entry !== null);

  return {
    totalResults: parseNonNegativeInt(feed.totalResults, 0),
    startIndex: parseNonNegativeInt(feed.startIndex, 0),
    itemsPerPage: parseNonNegativeInt(feed.itemsPerPage, entries.length),
    entries
  };
};
