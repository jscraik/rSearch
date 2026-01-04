/**
 * A link associated with an arXiv entry.
 *
 * @public
 */
export type ArxivLink = {
  /** The URL of the link */
  href: string;
  /** Link relation type (e.g., "license") */
  rel?: string;
  /** MIME type of the linked resource */
  type?: string;
  /** Human-readable title of the link */
  title?: string;
};

/**
 * Complete metadata for an arXiv paper entry.
 *
 * @public
 */
export type ArxivEntry = {
  /** arXiv paper ID (e.g., "2301.00001") */
  id: string;
  /** Paper title */
  title: string;
  /** Abstract summary */
  summary: string;
  /** ISO 8601 publication date */
  published: string;
  /** ISO 8601 last updated date */
  updated: string;
  /** List of author names */
  authors: string[];
  /** arXiv category IDs (e.g., ["cs.AI", "cs.LG"]) */
  categories: string[];
  /** Primary category ID */
  primaryCategory?: string;
  /** All associated links */
  links: ArxivLink[];
  /** Digital Object Identifier */
  doi?: string;
  /** Author comments */
  comment?: string;
  /** Journal reference (if published) */
  journalRef?: string;
  /** Direct URL to abstract page */
  absUrl?: string;
  /** Direct URL to PDF download */
  pdfUrl?: string;
  /** License name (e.g., "http://arxiv.org/licenses/nonexclusive-distrib/1.0/") */
  license?: string;
  /** Full license URL */
  licenseUrl?: string;
};

/**
 * Complete search result from the arXiv API.
 *
 * @public
 */
export type ArxivSearchResult = {
  /** The search query that produced these results */
  query: string;
  /** Total number of matching papers on arXiv */
  totalResults: number;
  /** Starting index of this page */
  startIndex: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Array of paper entries */
  entries: ArxivEntry[];
};

/**
 * Options for searching the arXiv API.
 *
 * @public
 */
export type ArxivSearchOptions = {
  /** arXiv search query syntax (e.g., "cat:cs.AI AND ti:neural") */
  searchQuery?: string;
  /** List of specific arXiv IDs to fetch */
  idList?: string[];
  /** Starting index for pagination (default: 0) */
  start?: number;
  /** Maximum total results to return */
  maxResults?: number;
  /** Results per page (max: 2000) */
  pageSize?: number;
  /** Sort field for results */
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  /** Sort order for results */
  sortOrder?: "ascending" | "descending";
};
