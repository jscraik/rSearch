import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArxivClient } from "../src/arxiv/client.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;
let cacheDir: string | null = null;

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
});
