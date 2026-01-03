import { describe, expect, it } from "vitest";
import { filterByLicense, hasLicenseMetadata } from "../src/arxiv/license.js";
import type { ArxivEntry } from "../src/arxiv/types.js";

const withLicense = (id: string): ArxivEntry => ({
  id,
  title: "Title",
  summary: "Summary",
  published: "2020-01-01T00:00:00Z",
  updated: "2020-01-01T00:00:00Z",
  authors: ["Alice"],
  categories: ["cs.AI"],
  links: [],
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
});

const withoutLicense = (id: string): ArxivEntry => ({
  id,
  title: "Title",
  summary: "Summary",
  published: "2020-01-01T00:00:00Z",
  updated: "2020-01-01T00:00:00Z",
  authors: ["Alice"],
  categories: ["cs.AI"],
  links: []
});

describe("license helpers", () => {
  it("detects license metadata", () => {
    expect(hasLicenseMetadata(withLicense("1234.5678v1"))).toBe(true);
    expect(hasLicenseMetadata(withoutLicense("1234.5678v2"))).toBe(false);
  });

  it("filters entries without license metadata", () => {
    const entries = [withLicense("1234.5678v1"), withoutLicense("1234.5678v2")];
    const result = filterByLicense(entries);

    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0]?.id).toBe("1234.5678v1");
    expect(result.missingIds).toEqual(["1234.5678v2"]);
  });
});
