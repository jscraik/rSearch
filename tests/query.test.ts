import { describe, expect, it } from "vitest";
import { buildQuery } from "../src/arxiv/query.js";

describe("buildQuery", () => {
  it("builds search query params", () => {
    const { url } = buildQuery("https://export.arxiv.org/api/query", {
      searchQuery: "cat:cs.AI",
      start: 0,
      maxResults: 10,
      sortBy: "relevance",
      sortOrder: "descending"
    });

    expect(url).toContain("search_query=cat%3Acs.AI");
    expect(url).toContain("start=0");
    expect(url).toContain("max_results=10");
    expect(url).toContain("sortBy=relevance");
    expect(url).toContain("sortOrder=descending");
  });

  it("builds id_list params", () => {
    const { url } = buildQuery("https://export.arxiv.org/api/query", {
      idList: ["2101.00001", "2101.00002"]
    });

    expect(url).toContain("id_list=2101.00001%2C2101.00002");
  });

  it("normalizes whitespace-separated values within id_list entries", () => {
    const { url } = buildQuery("https://export.arxiv.org/api/query", {
      idList: ["2101.00001  2101.00002", "2101.00003"]
    });

    expect(url).toContain("id_list=2101.00001%2C2101.00002%2C2101.00003");
  });

  it("trims search_query values", () => {
    const { url } = buildQuery("https://export.arxiv.org/api/query", {
      searchQuery: "   cat:cs.AI   "
    });

    expect(url).toContain("search_query=cat%3Acs.AI");
  });

  it("rejects whitespace-only queries when id_list is not provided", () => {
    expect(() =>
      buildQuery("https://export.arxiv.org/api/query", {
        searchQuery: "   "
      })
    ).toThrow("Provide a search query or at least one arXiv id.");
  });

  it("rejects non-integer start values", () => {
    expect(() =>
      buildQuery("https://export.arxiv.org/api/query", {
        searchQuery: "cat:cs.AI",
        start: 1.5
      })
    ).toThrow("start must be a non-negative integer.");
  });

  it("rejects non-integer maxResults values", () => {
    expect(() =>
      buildQuery("https://export.arxiv.org/api/query", {
        searchQuery: "cat:cs.AI",
        maxResults: 2.5
      })
    ).toThrow("maxResults must be a positive integer.");
  });

  it("preserves existing base URL query parameters", () => {
    const { url } = buildQuery("https://export.arxiv.org/api/query?foo=bar", {
      searchQuery: "cat:cs.AI",
      maxResults: 1
    });

    expect(url).toContain("foo=bar");
    expect(url).toContain("search_query=cat%3Acs.AI");
    expect(url).toContain("max_results=1");
  });

  it("rejects invalid base URLs", () => {
    expect(() =>
      buildQuery("not-a-url", {
        searchQuery: "cat:cs.AI"
      })
    ).toThrow("Invalid base URL: not-a-url");
  });
});
