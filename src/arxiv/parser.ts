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

const extractId = (entryId: string): string => {
  const absMatch = entryId.match(/arxiv\.org\/abs\/(.+)$/i);
  return absMatch?.[1] ?? entryId;
};

const extractAbsUrl = (entryId: string): string => {
  if (entryId.startsWith("http://") || entryId.startsWith("https://")) {
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

  const entries: ArxivEntry[] = entriesRaw.map((entry: any) => {
    const links = normalizeArray(entry.link).map((link: any) => ({
      href: String(link.href ?? link),
      rel: link.rel ? String(link.rel) : undefined,
      type: link.type ? String(link.type) : undefined,
      title: link.title ? String(link.title) : undefined
    }));

    const categories = normalizeArray(entry.category).map((cat: any) =>
      String(cat.term ?? cat)
    );

    const authors = normalizeArray(entry.author).map((author: any) =>
      String(author.name ?? author)
    );

    const entryId = String(entry.id ?? "");
    const arxivId = extractId(entryId);
    const absUrl = extractAbsUrl(entryId);

    const primaryCategory = entry.primary_category?.term
      ? String(entry.primary_category.term)
      : undefined;

    const record: ArxivEntry = {
      id: arxivId,
      title: String(entry.title ?? "").replace(/\s+/g, " ").trim(),
      summary: String(entry.summary ?? "").replace(/\s+/g, " ").trim(),
      published: String(entry.published ?? ""),
      updated: String(entry.updated ?? ""),
      authors,
      categories,
      primaryCategory,
      links,
      doi: entry.doi ? String(entry.doi) : undefined,
      comment: entry.comment ? String(entry.comment) : undefined,
      journalRef: entry.journal_ref ? String(entry.journal_ref) : undefined,
      absUrl
    };

    record.pdfUrl = pickPdfUrl(links);
    record.license = entry.license ? String(entry.license).trim() : undefined;
    record.licenseUrl = pickLicenseUrl(links)
      ?? (record.license && looksLikeUrl(record.license) ? record.license : undefined);

    return record;
  });

  return {
    totalResults: Number(feed.totalResults ?? 0),
    startIndex: Number(feed.startIndex ?? 0),
    itemsPerPage: Number(feed.itemsPerPage ?? entries.length),
    entries
  };
};
