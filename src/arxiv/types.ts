export type ArxivLink = {
  href: string;
  rel?: string;
  type?: string;
  title?: string;
};

export type ArxivEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: string[];
  categories: string[];
  primaryCategory?: string;
  links: ArxivLink[];
  doi?: string;
  comment?: string;
  journalRef?: string;
  absUrl?: string;
  pdfUrl?: string;
  license?: string;
  licenseUrl?: string;
};

export type ArxivSearchResult = {
  query: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: ArxivEntry[];
};

export type ArxivSearchOptions = {
  searchQuery?: string;
  idList?: string[];
  start?: number;
  maxResults?: number;
  pageSize?: number;
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
};
