import { buildQuery, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_TOTAL_RESULTS } from "./query.js";
import { parseAtom } from "./parser.js";
import type { ArxivEntry, ArxivSearchOptions, ArxivSearchResult } from "./types.js";
import { RateLimiter } from "./rateLimiter.js";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { VERSION } from "../version.js";

/**
 * Configuration options for the arXiv API client.
 *
 * @remarks
 * This configuration controls API endpoint URLs, request behavior,
 * caching, retry logic, and debugging output.
 *
 * @example
 * ```ts
 * const config: ArxivClientConfig = {
 *   apiBaseUrl: "https://export.arxiv.org/api/query",
 *   pdfBaseUrl: "https://arxiv.org/pdf/",
 *   userAgent: "my-app/1.0 (mailto:me@example.com)",
 *   timeoutMs: 20000,
 *   minIntervalMs: 3000,
 *   pageSize: 100,
 *   maxRetries: 3,
 *   retryBaseDelayMs: 500,
 *   cache: true,
 *   debug: false
 * };
 * ```
 *
 * @public
 */
export type ArxivClientConfig = {
  /** Base URL for the arXiv API query endpoint. */
  apiBaseUrl: string;
  /** Base URL for arXiv PDF downloads. */
  pdfBaseUrl: string;
  /** User-Agent header for API requests. */
  userAgent: string;
  /** HTTP request timeout in milliseconds. */
  timeoutMs: number;
  /** Minimum interval between API requests in milliseconds (rate limiting). */
  minIntervalMs: number;
  /** Enable in-memory caching of API responses. */
  cache: boolean;
  /** Optional directory for on-disk HTTP cache. */
  cacheDir?: string;
  /** Optional TTL for on-disk cache entries in milliseconds. */
  cacheTtlMs?: number;
  /** Default page size for paginated queries. */
  pageSize: number;
  /** Maximum number of retry attempts for transient failures. */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff retries. */
  retryBaseDelayMs: number;
  /** Enable debug logging to stderr. */
  debug: boolean;
};

const defaultConfig: ArxivClientConfig = {
  apiBaseUrl: "https://export.arxiv.org/api/query",
  pdfBaseUrl: "https://arxiv.org/pdf/",
  userAgent: `rsearch/${VERSION}`,
  timeoutMs: 20000,
  minIntervalMs: 3000,
  cache: true,
  cacheDir: undefined,
  cacheTtlMs: undefined,
  pageSize: DEFAULT_PAGE_SIZE,
  maxRetries: 3,
  retryBaseDelayMs: 500,
  debug: false
};

const normalizeArxivId = (id: string): string =>
  id
    .trim()
    .replace(/^arxiv:/i, "")
    .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\.pdf$/i, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")
    .replace(/\s+/g, "");

const parseHttpUrl = (label: string, value: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use http or https.`);
  }
  return parsed;
};

const normalizeApiBaseUrl = (value: string): string =>
  parseHttpUrl("apiBaseUrl", value).toString();

const normalizePdfBaseUrl = (value: string): string => {
  const parsed = parseHttpUrl("pdfBaseUrl", value);
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.toString();
};

const buildPdfUrl = (baseUrl: string, id: string): string => {
  const base = normalizePdfBaseUrl(baseUrl);
  return new URL(id, base).toString();
};

const assertIntegerConfig = (
  label: string,
  value: number,
  { min, allowZero }: { min?: number; allowZero?: boolean } = {}
): void => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }

  if (allowZero && value === 0) {
    return;
  }

  if (typeof min === "number" && value < min) {
    if (min === 0) {
      throw new Error(`${label} must be a non-negative integer.`);
    }
    throw new Error(`${label} must be an integer >= ${min}.`);
  }

  if (!allowZero && value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
};

const toSafeFileStem = (id: string): string => {
  const stem = normalizeArxivId(id).replace(/[^A-Za-z0-9._-]/g, "_");
  return stem || "paper";
};

const normalizeRequiredIds = (ids: string[]): string[] => {
  const normalized = ids.map(normalizeArxivId);
  if (normalized.some((id) => !id)) {
    throw new Error("Invalid arXiv ID in id list.");
  }
  return normalized;
};

/**
 * arXiv API client for searching, fetching metadata, and downloading papers.
 *
 * @remarks
 * The client handles rate limiting, retries with exponential backoff,
 * caching, and pagination automatically. It supports both search queries
 * and ID-based lookups via the arXiv Atom API.
 *
 * @example
 * ```ts
 * const client = new ArxivClient({ userAgent: "my-app/1.0" });
 * const results = await client.search({
 *   searchQuery: "cat:cs.AI",
 *   maxResults: 10
 * });
 * console.log(results.entries);
 * ```
 *
 * @public
 */
export class ArxivClient {
  private config: ArxivClientConfig;
  private cache = new Map<string, string>();
  private limiter: RateLimiter;

  /**
   * Creates a new arXiv API client with optional configuration overrides.
   *
   * @param config - Partial configuration to override defaults
   *
   * @example
   * ```ts
   * const client = new ArxivClient({
   *   timeoutMs: 30000,
   *   minIntervalMs: 5000,
   *   debug: true
   * });
   * ```
   */
  constructor(config: Partial<ArxivClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.config.apiBaseUrl = normalizeApiBaseUrl(this.config.apiBaseUrl);
    this.config.pdfBaseUrl = normalizePdfBaseUrl(this.config.pdfBaseUrl);
    assertIntegerConfig("timeoutMs", this.config.timeoutMs);
    assertIntegerConfig("minIntervalMs", this.config.minIntervalMs, { min: 0, allowZero: true });
    assertIntegerConfig("maxRetries", this.config.maxRetries, { min: 0, allowZero: true });
    assertIntegerConfig("retryBaseDelayMs", this.config.retryBaseDelayMs, { min: 0, allowZero: true });
    assertIntegerConfig("pageSize", this.config.pageSize, { min: 1 });
    this.limiter = new RateLimiter(this.config.minIntervalMs);
  }

  /**
   * Returns a copy of the current client configuration.
   *
   * @returns A shallow copy of the configuration object
   */
  getConfig(): ArxivClientConfig {
    return { ...this.config };
  }

  /**
   * Searches arXiv with the given options and returns matching entries.
   *
   * @param options - Search parameters including query, ID list, and pagination
   * @returns Promise resolving to search results with entries and metadata
   * @throws {Error} If pageSize exceeds MAX_PAGE_SIZE (2000)
   * @throws {Error} If maxResults exceeds MAX_TOTAL_RESULTS (30000)
   * @throws {Error} If start is negative
   *
   * @example
   * ```ts
   * const results = await client.search({
   *   searchQuery: "cat:cs.AI AND ti:neural",
   *   maxResults: 50,
   *   sortBy: "relevance",
   *   sortOrder: "descending"
   * });
   * console.log(`Found ${results.totalResults} papers`);
   * ```
   *
   * @example
   * ```ts
   * // Fetch by specific IDs
   * const results = await client.search({
   *   idList: ["2301.00001", "2301.00002"]
   * });
   * ```
   *
   * @remarks
   * The client automatically handles pagination when maxResults exceeds pageSize.
   * Multiple API requests are made transparently to fetch all requested results.
   */
  async search(options: ArxivSearchOptions): Promise<ArxivSearchResult> {
    const requestedPageSize = options.pageSize ?? this.config.pageSize;
    if (!Number.isFinite(requestedPageSize) || !Number.isInteger(requestedPageSize) || requestedPageSize < 1) {
      throw new Error("pageSize must be a positive integer.");
    }
    if (requestedPageSize > MAX_PAGE_SIZE) {
      throw new Error(`pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
    }

    const pageSize = requestedPageSize || DEFAULT_PAGE_SIZE;
    const maxResults = options.maxResults ?? pageSize;

    if (!Number.isFinite(maxResults) || !Number.isInteger(maxResults) || maxResults < 1) {
      throw new Error("maxResults must be a positive integer.");
    }

    if (maxResults > MAX_TOTAL_RESULTS) {
      throw new Error(`maxResults cannot exceed ${MAX_TOTAL_RESULTS}.`);
    }

    const start = options.start ?? 0;
    if (!Number.isFinite(start) || !Number.isInteger(start) || start < 0) {
      throw new Error("start must be a non-negative integer.");
    }

    const fetchAll = options.maxResults !== undefined && maxResults > pageSize;

    const entries: ArxivEntry[] = [];
    let totalResults = 0;
    let resultStartIndex = start;
    let requestStartIndex = start;
    let itemsPerPage = pageSize;
    let remaining = maxResults;

    while (remaining > 0) {
      const batchSize = Math.min(pageSize, remaining);
      const { url } = buildQuery(this.config.apiBaseUrl, {
        ...options,
        start: requestStartIndex,
        maxResults: batchSize
      });

      const xml = await this.request(url);
      const parsed = parseAtom(xml);

      if (entries.length === 0) {
        totalResults = parsed.totalResults;
        resultStartIndex = parsed.startIndex;
        itemsPerPage = parsed.itemsPerPage;
      }

      entries.push(...parsed.entries);

      if (!fetchAll) {
        break;
      }

      if (parsed.entries.length === 0) {
        break;
      }

      if (requestStartIndex + parsed.entries.length >= parsed.totalResults) {
        break;
      }

      remaining -= parsed.entries.length;
      requestStartIndex += parsed.entries.length;
    }

    return {
      query: options.searchQuery ?? "",
      totalResults,
      startIndex: resultStartIndex,
      itemsPerPage,
      entries
    };
  }

  /**
   * Fetches metadata for specific arXiv paper IDs.
   *
   * @param ids - Array of arXiv paper IDs (e.g., ["2301.00001", "cs.AI/0001001"])
   * @param options - Optional search parameters (exclude idList)
   * @returns Promise resolving to search results for the specified IDs
   *
   * @example
   * ```ts
   * const results = await client.fetchByIds([
   *   "2301.00001",
   *   "2101.00001"
   * ], { sortBy: "submittedDate" });
   * ```
   */
  async fetchByIds(ids: string[], options: Omit<ArxivSearchOptions, "idList"> = {}) {
    if (ids.length === 0) {
      const requestedPageSize = options.pageSize ?? this.config.pageSize;
      if (!Number.isFinite(requestedPageSize) || !Number.isInteger(requestedPageSize) || requestedPageSize < 1) {
        throw new Error("pageSize must be a positive integer.");
      }
      if (requestedPageSize > MAX_PAGE_SIZE) {
        throw new Error(`pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
      }

      if (options.maxResults !== undefined) {
        if (!Number.isFinite(options.maxResults) || !Number.isInteger(options.maxResults) || options.maxResults < 1) {
          throw new Error("maxResults must be a positive integer.");
        }
        if (options.maxResults > MAX_TOTAL_RESULTS) {
          throw new Error(`maxResults cannot exceed ${MAX_TOTAL_RESULTS}.`);
        }
      }

      const start = options.start ?? 0;
      if (!Number.isFinite(start) || !Number.isInteger(start) || start < 0) {
        throw new Error("start must be a non-negative integer.");
      }

      return {
        query: "",
        totalResults: 0,
        startIndex: start,
        itemsPerPage: 0,
        entries: []
      };
    }

    const normalizedIds = normalizeRequiredIds(ids);
    const maxResults = options.maxResults ?? normalizedIds.length;
    return this.search({ ...options, idList: normalizedIds, maxResults });
  }

  /**
   * Downloads PDF files for the given arXiv IDs to a directory.
   *
   * @param ids - Array of arXiv paper IDs to download
   * @param outputDir - Directory path where PDFs will be saved
   * @param overwrite - Whether to overwrite existing files (default: false)
   * @returns Promise resolving to download results with status per ID
   *
   * @example
   * ```ts
   * const results = await client.download(
   *   ["2301.00001", "2101.00001"],
   *   "./papers",
   *   false
   * );
   * for (const r of results) {
   *   if (r.status === "downloaded") {
   *     console.log(`${r.id} -> ${r.path}`);
   *   }
   * }
   * ```
   *
   * @remarks
   * Each result has a status:
   * - `"downloaded"`: Successfully saved to outputDir
   * - `"skipped"`: File exists and overwrite is false
   * - `"failed"`: Network or file system error (see error property)
   */
  async download(ids: string[], outputDir: string, overwrite = false): Promise<{
    id: string;
    path: string;
    status: "downloaded" | "skipped" | "failed";
    error?: string;
  }[]> {
    const results: {
      id: string;
      path: string;
      status: "downloaded" | "skipped" | "failed";
      error?: string;
    }[] = [];

    for (const id of ids) {
      const normalizedId = normalizeArxivId(id);
      const filename = `${toSafeFileStem(id)}.pdf`;
      const outputPath = resolve(outputDir, filename);
      if (!normalizedId) {
        results.push({
          id: normalizedId,
          path: outputPath,
          status: "failed",
          error: "Invalid arXiv ID"
        });
        continue;
      }

      try {
        const exists = await fileExists(outputPath);
        if (exists && !overwrite) {
          results.push({ id: normalizedId, path: outputPath, status: "skipped" });
          continue;
        }

        const pdfUrl = buildPdfUrl(this.config.pdfBaseUrl, normalizedId);

        const response = await this.requestBinary(pdfUrl);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, response);
        results.push({ id: normalizedId, path: outputPath, status: "downloaded" });
      } catch (error) {
        results.push({
          id: normalizedId,
          path: outputPath,
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Downloads a single arXiv PDF as a byte buffer.
   *
   * @param id - arXiv paper ID (e.g., "2301.00001" or "2301.00001.pdf")
   * @returns Promise resolving to the PDF file contents as a Uint8Array
   *
   * @example
   * ```ts
   * const buffer = await client.downloadPdfBuffer("2301.00001");
   * // buffer is a Uint8Array containing the PDF data
   * ```
   *
   * @remarks
   * The ID is normalized: whitespace is removed and ".pdf" suffix is stripped if present.
   * Useful for in-memory PDF processing without writing to disk.
   */
  async downloadPdfBuffer(id: string): Promise<Uint8Array> {
    const normalizedId = normalizeArxivId(id);
    if (!normalizedId) {
      throw new Error("Invalid arXiv ID.");
    }
    const pdfUrl = buildPdfUrl(this.config.pdfBaseUrl, normalizedId);
    return this.requestBinary(pdfUrl);
  }

  private async request(url: string): Promise<string> {
    if (this.config.cache && this.cache.has(url)) {
      return this.cache.get(url) ?? "";
    }

    if (this.config.cache && this.config.cacheDir) {
      const cached = await readDiskCache(url, this.config.cacheDir, this.config.cacheTtlMs);
      if (cached !== null) {
        this.cache.set(url, cached);
        return cached;
      }
    }

    const response = await this.requestWithRetry(url, {
      headers: {
        "User-Agent": this.config.userAgent,
        Accept: "application/atom+xml"
      }
    });

    const text = await response.text();
    if (this.config.cache) {
      this.cache.set(url, text);
    }
    if (this.config.cache && this.config.cacheDir) {
      await writeDiskCache(url, this.config.cacheDir, text);
    }
    return text;
  }

  private async requestBinary(url: string): Promise<Uint8Array> {
    const response = await this.requestWithRetry(url, {
      headers: {
        "User-Agent": this.config.userAgent
      }
    });

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private async requestWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.config.maxRetries) {
      await this.limiter.wait();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const started = Date.now();

      try {
        if (this.config.debug) {
          // Log to stderr without exposing response bodies.
          process.stderr.write(`DEBUG request: ${url}\n`);
        }

        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (this.config.debug) {
          const elapsed = Date.now() - started;
          process.stderr.write(`DEBUG response: ${response.status} ${response.statusText} (${elapsed}ms)\n`);
        }

        if (response.ok) {
          return response;
        }

        if (!shouldRetry(response.status) || attempt >= this.config.maxRetries) {
          throw new ResponseError(response.status, response.statusText);
        }

        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        const delay = retryAfter ?? computeBackoffDelay(this.config.retryBaseDelayMs, attempt);
        await sleep(delay);
        attempt += 1;
        continue;
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof ResponseError) {
          throw error;
        }
        if (!isRetryableError(error) || attempt >= this.config.maxRetries) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = computeBackoffDelay(this.config.retryBaseDelayMs, attempt);
        await sleep(delay);
        attempt += 1;
        continue;
      }
    }

    throw lastError ?? new Error("Request failed");
  }
}

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

class ResponseError extends Error {
  readonly status: number;
  constructor(status: number, statusText: string) {
    super(`${status} ${statusText}`);
    this.name = "ResponseError";
    this.status = status;
  }
}

const shouldRetry = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof ResponseError) {
    return false;
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || error instanceof TypeError;
  }
  return false;
};

const parseRetryAfter = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    const diff = parsed - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
};

const computeBackoffDelay = (baseDelayMs: number, attempt: number): number => {
  const maxDelay = baseDelayMs * 16;
  const exp = Math.min(maxDelay, baseDelayMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return exp + jitter;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cacheFilenameForUrl = (url: string): string =>
  createHash("sha256").update(url).digest("hex");

const readDiskCache = async (
  url: string,
  cacheDir: string,
  ttlMs?: number
): Promise<string | null> => {
  const filename = cacheFilenameForUrl(url);
  const path = resolve(cacheDir, filename);

  try {
    const stats = await stat(path);
    if (typeof ttlMs === "number") {
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs > ttlMs) {
        return null;
      }
    }
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
};

const writeDiskCache = async (
  url: string,
  cacheDir: string,
  payload: string
): Promise<void> => {
  const filename = cacheFilenameForUrl(url);
  const path = resolve(cacheDir, filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, payload, "utf8");
};
