import { buildQuery, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_TOTAL_RESULTS } from "./query.js";
import { parseAtom } from "./parser.js";
import type { ArxivEntry, ArxivSearchOptions, ArxivSearchResult } from "./types.js";
import { RateLimiter } from "./rateLimiter.js";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { VERSION } from "../version.js";

export type ArxivClientConfig = {
  apiBaseUrl: string;
  pdfBaseUrl: string;
  userAgent: string;
  timeoutMs: number;
  minIntervalMs: number;
  cache: boolean;
  cacheDir?: string;
  cacheTtlMs?: number;
  pageSize: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  debug: boolean;
};

const defaultConfig: ArxivClientConfig = {
  apiBaseUrl: "https://export.arxiv.org/api/query",
  pdfBaseUrl: "https://arxiv.org/pdf/",
  userAgent: `arxiv-cli/${VERSION}`,
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

export class ArxivClient {
  private config: ArxivClientConfig;
  private cache = new Map<string, string>();
  private limiter: RateLimiter;

  constructor(config: Partial<ArxivClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.limiter = new RateLimiter(this.config.minIntervalMs);
  }

  getConfig(): ArxivClientConfig {
    return { ...this.config };
  }

  async search(options: ArxivSearchOptions): Promise<ArxivSearchResult> {
    const requestedPageSize = options.pageSize ?? this.config.pageSize;
    if (requestedPageSize > MAX_PAGE_SIZE) {
      throw new Error(`pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
    }

    const pageSize = requestedPageSize || DEFAULT_PAGE_SIZE;
    const maxResults = options.maxResults ?? pageSize;

    if (maxResults < 1) {
      throw new Error("maxResults must be >= 1");
    }

    if (maxResults > MAX_TOTAL_RESULTS) {
      throw new Error(`maxResults cannot exceed ${MAX_TOTAL_RESULTS}.`);
    }

    const start = options.start ?? 0;
    if (start < 0) {
      throw new Error("start must be >= 0");
    }

    const fetchAll = options.maxResults !== undefined && maxResults > pageSize;

    const entries: ArxivEntry[] = [];
    let totalResults = 0;
    let startIndex = start;
    let itemsPerPage = pageSize;
    let remaining = maxResults;

    while (remaining > 0) {
      const batchSize = Math.min(pageSize, remaining);
      const { url } = buildQuery(this.config.apiBaseUrl, {
        ...options,
        start: startIndex,
        maxResults: batchSize
      });

      const xml = await this.request(url);
      const parsed = parseAtom(xml);

      if (entries.length === 0) {
        totalResults = parsed.totalResults;
        startIndex = parsed.startIndex;
        itemsPerPage = parsed.itemsPerPage;
      }

      entries.push(...parsed.entries);

      if (!fetchAll) {
        break;
      }

      if (parsed.entries.length === 0) {
        break;
      }

      remaining -= parsed.entries.length;
      startIndex += parsed.entries.length;
    }

    return {
      query: options.searchQuery ?? "",
      totalResults,
      startIndex,
      itemsPerPage,
      entries
    };
  }

  async fetchByIds(ids: string[], options: Omit<ArxivSearchOptions, "idList"> = {}) {
    return this.search({ ...options, idList: ids });
  }

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
      const safeId = id.replace(/\s+/g, "").replace(/\.pdf$/i, "");
      const filename = `${safeId}.pdf`;
      const outputPath = resolve(outputDir, filename);

      try {
        const exists = await fileExists(outputPath);
        if (exists && !overwrite) {
          results.push({ id: safeId, path: outputPath, status: "skipped" });
          continue;
        }

        const pdfUrl = `${this.config.pdfBaseUrl}${safeId}`;

        const response = await this.requestBinary(pdfUrl);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, response);
        results.push({ id: safeId, path: outputPath, status: "downloaded" });
      } catch (error) {
        results.push({
          id: safeId,
          path: outputPath,
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  async downloadPdfBuffer(id: string): Promise<Uint8Array> {
    const safeId = id.replace(/\s+/g, "").replace(/\.pdf$/i, "");
    const pdfUrl = `${this.config.pdfBaseUrl}${safeId}`;
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
          throw new Error(`${response.status} ${response.statusText}`);
        }

        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        const delay = retryAfter ?? computeBackoffDelay(this.config.retryBaseDelayMs, attempt);
        await sleep(delay);
      } catch (error) {
        clearTimeout(timeout);
        if (!isRetryableError(error) || attempt >= this.config.maxRetries) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = computeBackoffDelay(this.config.retryBaseDelayMs, attempt);
        await sleep(delay);
      }

      attempt += 1;
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

const shouldRetry = (status: number): boolean => status === 429 || status >= 500;

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return true;
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
