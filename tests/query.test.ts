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
});
