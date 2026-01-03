import { describe, expect, it } from "vitest";
import { parseAtom } from "../src/arxiv/parser.js";

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
    <link href="https://creativecommons.org/licenses/by/4.0/" rel="license" type="text/html" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

describe("parseAtom", () => {
  it("parses entries and metadata", () => {
    const parsed = parseAtom(SAMPLE_FEED);
    expect(parsed.totalResults).toBe(1);
    expect(parsed.entries).toHaveLength(1);

    const entry = parsed.entries[0];
    expect(entry.id).toBe("1234.5678v1");
    expect(entry.title).toBe("Test Title");
    expect(entry.summary).toBe("Test summary");
    expect(entry.primaryCategory).toBe("cs.AI");
    expect(entry.pdfUrl).toBe("http://arxiv.org/pdf/1234.5678v1");
    expect(entry.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
  });
});
