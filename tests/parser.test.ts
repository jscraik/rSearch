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

  it("parses arxiv:license href metadata", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
    <arxiv:license href="https://creativecommons.org/licenses/by/4.0/" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(entry.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
  });

  it("falls back to safe pagination metadata when feed values are invalid", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>not-a-number</opensearch:totalResults>
  <opensearch:startIndex>-3</opensearch:startIndex>
  <opensearch:itemsPerPage>unknown</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Test Title</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);

    expect(parsed.totalResults).toBe(0);
    expect(parsed.startIndex).toBe(0);
    expect(parsed.itemsPerPage).toBe(1);
  });

  it("drops malformed author/category/link fields instead of emitting placeholder strings", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Test Title</title>
    <summary>Test summary</summary>
    <author></author>
    <category></category>
    <link rel="alternate" type="text/html" />
    <arxiv:primary_category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.authors).toEqual([]);
    expect(entry.categories).toEqual([]);
    expect(entry.links).toEqual([]);
  });

  it("preserves absolute abstract URLs regardless of scheme casing", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>HTTPS://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Test Title</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.id).toBe("1234.5678v1");
    expect(entry.absUrl).toBe("HTTPS://arxiv.org/abs/1234.5678v1");
  });

  it("skips malformed entries that are missing arXiv IDs", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>2</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <entry>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Malformed</title>
    <summary>Missing id</summary>
    <author><name>Alice</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Valid</title>
    <summary>Valid summary</summary>
    <author><name>Bob</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.id).toBe("1234.5678v1");
  });

  it("strips query/hash fragments from arXiv IDs extracted from entry URLs", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>https://arxiv.org/abs/1234.5678v1?context=foo#ref</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Valid</title>
    <summary>Valid summary</summary>
    <author><name>Bob</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.id).toBe("1234.5678v1");
    expect(entry.absUrl).toBe("https://arxiv.org/abs/1234.5678v1?context=foo#ref");
  });

  it("strips trailing slashes from arXiv IDs extracted from entry URLs", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>https://arxiv.org/abs/1234.5678v1/</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Valid</title>
    <summary>Valid summary</summary>
    <author><name>Bob</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.id).toBe("1234.5678v1");
  });

  it("strips query/hash fragments from raw non-URL entry IDs", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>1234.5678v1?context=foo#bar</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Valid</title>
    <summary>Valid summary</summary>
    <author><name>Bob</name></author>
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const parsed = parseAtom(xml);
    const entry = parsed.entries[0];

    expect(entry.id).toBe("1234.5678v1");
    expect(entry.absUrl).toBe("https://arxiv.org/abs/1234.5678v1?context=foo#bar");
  });
});
