import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArxivClient } from "../src/arxiv/client.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title> Test Title </title>
    <summary> Test summary </summary>
    <author><name>Alice</name></author>
    <link href="http://arxiv.org/abs/1234.5678v1" rel="alternate" type="text/html" />
    <link title="pdf" href="http://arxiv.org/pdf/1234.5678v1" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

const buildFeed = (
  ids: string[],
  {
    totalResults,
    startIndex,
    itemsPerPage
  }: { totalResults: number; startIndex: number; itemsPerPage: number }
) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>${totalResults}</opensearch:totalResults>
  <opensearch:startIndex>${startIndex}</opensearch:startIndex>
  <opensearch:itemsPerPage>${itemsPerPage}</opensearch:itemsPerPage>
  ${ids
    .map(
      (id) => `
  <entry>
    <id>http://arxiv.org/abs/${id}</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>${id}</title>
    <summary>${id} summary</summary>
    <author><name>Alice</name></author>
    <link href="http://arxiv.org/abs/${id}" rel="alternate" type="text/html" />
    <link title="pdf" href="http://arxiv.org/pdf/${id}" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>`
    )
    .join("\n")}
</feed>`;

type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;
let cacheDir: string | null = null;
const tempDirs: string[] = [];

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  if (cacheDir) {
    await rm(cacheDir, { recursive: true, force: true });
    cacheDir = null;
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("ArxivClient", () => {
  it("builds a search request and parses results", async () => {
    fetchMock.mockResolvedValue(new Response(SAMPLE_FEED, { status: 200 }));

    const client = new ArxivClient({ minIntervalMs: 0, cache: false });
    const result = await client.search({ searchQuery: "cat:cs.AI", maxResults: 1 });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.id).toBe("1234.5678v1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("search_query=");
    expect(url).toContain("max_results=1");
  });

  it("retries on retryable responses", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 500, statusText: "Server Error" }))
      .mockResolvedValueOnce(new Response(SAMPLE_FEED, { status: 200 }));

    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: false,
      maxRetries: 1,
      retryBaseDelayMs: 0
    });

    const result = await client.search({ searchQuery: "cat:cs.AI", maxResults: 1 });
    expect(result.entries).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 408 request timeout responses", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 408, statusText: "Request Timeout" }))
      .mockResolvedValueOnce(new Response(SAMPLE_FEED, { status: 200 }));

    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: false,
      maxRetries: 1,
      retryBaseDelayMs: 0
    });

    const result = await client.search({ searchQuery: "cat:cs.AI", maxResults: 1 });
    expect(result.entries).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable responses", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 400, statusText: "Bad Request" }));

    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: false,
      maxRetries: 2,
      retryBaseDelayMs: 0
    });

    await expect(client.search({ searchQuery: "cat:cs.AI", maxResults: 1 }))
      .rejects
      .toThrow("400 Bad Request");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates integer paging options", async () => {
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });

    await expect(client.search({ searchQuery: "cat:cs.AI", pageSize: 1.5 }))
      .rejects
      .toThrow("pageSize must be a positive integer.");
    await expect(client.search({ searchQuery: "cat:cs.AI", maxResults: 1.2 }))
      .rejects
      .toThrow("maxResults must be a positive integer.");
    await expect(client.search({ searchQuery: "cat:cs.AI", start: 0.5 }))
      .rejects
      .toThrow("start must be a non-negative integer.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses disk cache when configured", async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "rsearch-cache-"));
    fetchMock.mockResolvedValue(new Response(SAMPLE_FEED, { status: 200 }));

    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: true,
      cacheDir,
      cacheTtlMs: 60_000
    });

    await client.search({ searchQuery: "cat:cs.AI", maxResults: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    const client2 = new ArxivClient({
      minIntervalMs: 0,
      cache: true,
      cacheDir,
      cacheTtlMs: 60_000
    });

    await client2.search({ searchQuery: "cat:cs.AI", maxResults: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("fetchByIds requests all IDs by default", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0001v1", "1234.0002v1"], {
            totalResults: 3,
            startIndex: 0,
            itemsPerPage: 2
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0003v1"], {
            totalResults: 3,
            startIndex: 2,
            itemsPerPage: 1
          }),
          { status: 200 }
        )
      );

    const client = new ArxivClient({ minIntervalMs: 0, cache: false, pageSize: 2 });
    const result = await client.fetchByIds(["1234.0001v1", "1234.0002v1", "1234.0003v1"]);

    expect(result.entries).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves the original startIndex across paginated fetches", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0001v1", "1234.0002v1"], {
            totalResults: 3,
            startIndex: 0,
            itemsPerPage: 2
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0003v1"], {
            totalResults: 3,
            startIndex: 2,
            itemsPerPage: 1
          }),
          { status: 200 }
        )
      );

    const client = new ArxivClient({ minIntervalMs: 0, cache: false });
    const result = await client.search({ searchQuery: "cat:cs.AI", maxResults: 3, pageSize: 2 });

    expect(result.entries).toHaveLength(3);
    expect(result.startIndex).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops paginating once totalResults are exhausted", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0001v1", "1234.0002v1"], {
            totalResults: 3,
            startIndex: 0,
            itemsPerPage: 2
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          buildFeed(["1234.0003v1"], {
            totalResults: 3,
            startIndex: 2,
            itemsPerPage: 1
          }),
          { status: 200 }
        )
      )
      .mockResolvedValue(
        new Response(
          buildFeed([], {
            totalResults: 3,
            startIndex: 3,
            itemsPerPage: 0
          }),
          { status: 200 }
        )
      );

    const client = new ArxivClient({ minIntervalMs: 0, cache: false });
    const result = await client.search({ searchQuery: "cat:cs.AI", maxResults: 10, pageSize: 2 });

    expect(result.entries).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps downloaded files inside the output directory", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "rsearch-download-"));
    tempDirs.push(outputDir);
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));

    const client = new ArxivClient({ minIntervalMs: 0, cache: false });
    const [result] = await client.download(["../escape"], outputDir, true);

    expect(result?.status).toBe("downloaded");
    const relativePath = relative(outputDir, result?.path ?? "");
    expect(isAbsolute(relativePath)).toBe(false);
    expect(relativePath.split(/[\\/]+/)).not.toContain("..");
  });

  it("normalizes pdfBaseUrl when trailing slash is missing", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));
    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: false,
      pdfBaseUrl: "https://arxiv.org/pdf"
    });

    await client.downloadPdfBuffer("1234.5678");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toBe("https://arxiv.org/pdf/1234.5678");
  });

  it("normalizes arXiv IDs with leading slashes and full arXiv URLs for PDF downloads", async () => {
    fetchMock.mockImplementation(
      async () => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 })
    );
    const client = new ArxivClient({
      minIntervalMs: 0,
      cache: false,
      pdfBaseUrl: "https://arxiv.org/pdf/"
    });

    await client.downloadPdfBuffer("/1234.5678.pdf?download=1");
    await client.downloadPdfBuffer("https://arxiv.org/abs/5678.1234v2#section");
    await client.downloadPdfBuffer("arXiv:9999.0001v3");
    await client.downloadPdfBuffer("https://arxiv.org/abs/7777.0001v1/?context=foo");
    await client.downloadPdfBuffer("https://www.arxiv.org/abs/1111.2222v1");

    expect(fetchMock).toHaveBeenCalledTimes(5);
    const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0]);
    const thirdUrl = String(fetchMock.mock.calls[2]?.[0]);
    const fourthUrl = String(fetchMock.mock.calls[3]?.[0]);
    const fifthUrl = String(fetchMock.mock.calls[4]?.[0]);
    expect(firstUrl).toBe("https://arxiv.org/pdf/1234.5678");
    expect(secondUrl).toBe("https://arxiv.org/pdf/5678.1234v2");
    expect(thirdUrl).toBe("https://arxiv.org/pdf/9999.0001v3");
    expect(fourthUrl).toBe("https://arxiv.org/pdf/7777.0001v1");
    expect(fifthUrl).toBe("https://arxiv.org/pdf/1111.2222v1");
  });

  it("rejects non-http(s) base URLs at construction time", () => {
    expect(() => new ArxivClient({ apiBaseUrl: "ftp://example.com/api" }))
      .toThrow("apiBaseUrl must use http or https.");
    expect(() => new ArxivClient({ pdfBaseUrl: "file:///tmp/pdf/" }))
      .toThrow("pdfBaseUrl must use http or https.");
  });

  it("rejects invalid retry and timeout config at construction time", () => {
    expect(() => new ArxivClient({ maxRetries: -1 }))
      .toThrow("maxRetries must be a non-negative integer.");
    expect(() => new ArxivClient({ retryBaseDelayMs: -10 }))
      .toThrow("retryBaseDelayMs must be a non-negative integer.");
    expect(() => new ArxivClient({ timeoutMs: 0 }))
      .toThrow("timeoutMs must be a positive integer.");
  });

  it("returns an empty result for fetchByIds with no ids", async () => {
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });
    const result = await client.fetchByIds([]);

    expect(result.totalResults).toBe(0);
    expect(result.startIndex).toBe(0);
    expect(result.itemsPerPage).toBe(0);
    expect(result.entries).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates paging options even when fetchByIds is called with no ids", async () => {
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });

    await expect(client.fetchByIds([], { start: -1 }))
      .rejects
      .toThrow("start must be a non-negative integer.");
    await expect(client.fetchByIds([], { pageSize: 1.5 }))
      .rejects
      .toThrow("pageSize must be a positive integer.");
    await expect(client.fetchByIds([], { maxResults: 0 }))
      .rejects
      .toThrow("maxResults must be a positive integer.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs in fetchByIds", async () => {
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });

    await expect(client.fetchByIds(["   "]))
      .rejects
      .toThrow("Invalid arXiv ID in id list.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails invalid download IDs without issuing network requests", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "rsearch-download-invalid-"));
    tempDirs.push(outputDir);
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });

    const [result] = await client.download(["   "], outputDir, true);

    expect(result?.status).toBe("failed");
    expect(result?.error).toContain("Invalid arXiv ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs in downloadPdfBuffer", async () => {
    const client = new ArxivClient({ minIntervalMs: 0, cache: false });

    await expect(client.downloadPdfBuffer("   "))
      .rejects
      .toThrow("Invalid arXiv ID.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
