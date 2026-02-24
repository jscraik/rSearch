import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTaxonomy, parseTaxonomyHtml } from "../src/arxiv/taxonomy.js";

const SAMPLE_TAXONOMY_HTML = `
<div id="content">
  <h2>Classification guide</h2>
  <h2>Group Name</h2>
  <h4>Category Name (Category ID)</h4>
</div>
<div id="category_taxonomy_list">
  <h2>Computer Science</h2>
  <div>
    <h4>cs.AI <span>(Artificial Intelligence)</span></h4>
    <p>AI description</p>
  </div>
  <h2>Mathematics</h2>
  <div>
    <h4>math.CO <span>(Combinatorics)</span></h4>
    <p>Combinatorics description</p>
  </div>
</div>
`;

describe("parseTaxonomyHtml", () => {
  it("ignores classification guide headers and parses category list groups", () => {
    const result = parseTaxonomyHtml(SAMPLE_TAXONOMY_HTML, "https://example.com/taxonomy");

    expect(result.groups.map((group) => group.name)).toEqual(["Computer Science", "Mathematics"]);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toMatchObject({
      id: "cs.AI",
      name: "Artificial Intelligence",
      group: "Computer Science"
    });
    expect(result.categories[1]).toMatchObject({
      id: "math.CO",
      name: "Combinatorics",
      group: "Mathematics"
    });
  });

  it("parses headings where category name appears before the category ID", () => {
    const html = `
<div id="category_taxonomy_list">
  <h2>Computer Science</h2>
  <div>
    <h4>Artificial Intelligence (cs.AI)</h4>
    <p>AI description</p>
  </div>
</div>`;

    const result = parseTaxonomyHtml(html, "https://example.com/taxonomy");

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({
      id: "cs.AI",
      name: "Artificial Intelligence",
      group: "Computer Science"
    });
  });

  it("parses legacy archive IDs when heading is name-first", () => {
    const html = `
<div id="category_taxonomy_list">
  <h2>Physics</h2>
  <div>
    <h4>High Energy Physics - Theory (hep-th)</h4>
    <p>HEP-TH description</p>
  </div>
</div>`;

    const result = parseTaxonomyHtml(html, "https://example.com/taxonomy");

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({
      id: "hep-th",
      name: "High Energy Physics - Theory",
      group: "Physics"
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchTaxonomy", () => {
  it("clears timeout handles when fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    await expect(
      fetchTaxonomy(
        {
          taxonomyUrl: "https://example.test/taxonomy",
          minIntervalMs: 0,
          timeoutMs: 5000
        },
        { refresh: true }
      )
    ).rejects.toThrow("network down");

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("caches taxonomy results per source URL", async () => {
    const htmlA = `<div id="category_taxonomy_list"><h2>Group A</h2><h4>a.AI (Alpha)</h4></div>`;
    const htmlB = `<div id="category_taxonomy_list"><h2>Group B</h2><h4>b.AI (Beta)</h4></div>`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(htmlA, { status: 200 }))
      .mockResolvedValueOnce(new Response(htmlB, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchTaxonomy(
      {
        taxonomyUrl: "https://example.test/a",
        minIntervalMs: 0,
        timeoutMs: 5000
      },
      { refresh: true }
    );

    const second = await fetchTaxonomy({
      taxonomyUrl: "https://example.test/b",
      minIntervalMs: 0,
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.sourceUrl).toBe("https://example.test/a");
    expect(second.sourceUrl).toBe("https://example.test/b");
    expect(second.categories[0]?.id).toBe("b.AI");
  });

  it("returns a defensive copy for cached taxonomy results", async () => {
    const html = `<div id="category_taxonomy_list"><h2>Group A</h2><h4>a.AI (Alpha)</h4></div>`;
    const fetchMock = vi.fn().mockResolvedValue(new Response(html, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchTaxonomy(
      {
        taxonomyUrl: "https://example.test/defensive",
        minIntervalMs: 0,
        timeoutMs: 5000
      },
      { refresh: true }
    );

    first.categories[0]!.id = "mutated";
    first.groups[0]!.categories[0]!.name = "Mutated";

    const second = await fetchTaxonomy({
      taxonomyUrl: "https://example.test/defensive",
      minIntervalMs: 0,
      timeoutMs: 5000
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.categories[0]?.id).toBe("a.AI");
    expect(second.groups[0]?.categories[0]?.name).toBe("Alpha");
  });
});
