[**rSearch**](../../../README.md)

***

[rSearch](../../../README.md) / [arxiv/client](../README.md) / ArxivClient

# Class: ArxivClient

Defined in: [src/arxiv/client.ts:97](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L97)

arXiv API client for searching, fetching metadata, and downloading papers.

## Remarks

The client handles rate limiting, retries with exponential backoff,
caching, and pagination automatically. It supports both search queries
and ID-based lookups via the arXiv Atom API.

## Example

```ts
const client = new ArxivClient({ userAgent: "my-app/1.0" });
const results = await client.search({
  searchQuery: "cat:cs.AI",
  maxResults: 10
});
console.log(results.entries);
```

## Constructors

### Constructor

> **new ArxivClient**(`config`): `ArxivClient`

Defined in: [src/arxiv/client.ts:116](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L116)

Creates a new arXiv API client with optional configuration overrides.

#### Parameters

##### config

`Partial`\<[`ArxivClientConfig`](../type-aliases/ArxivClientConfig.md)\> = `{}`

Partial configuration to override defaults

#### Returns

`ArxivClient`

#### Example

```ts
const client = new ArxivClient({
  timeoutMs: 30000,
  minIntervalMs: 5000,
  debug: true
});
```

## Methods

### download()

> **download**(`ids`, `outputDir`, `overwrite`): `Promise`\<`object`[]\>

Defined in: [src/arxiv/client.ts:279](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L279)

Downloads PDF files for the given arXiv IDs to a directory.

#### Parameters

##### ids

`string`[]

Array of arXiv paper IDs to download

##### outputDir

`string`

Directory path where PDFs will be saved

##### overwrite

`boolean` = `false`

Whether to overwrite existing files (default: false)

#### Returns

`Promise`\<`object`[]\>

Promise resolving to download results with status per ID

#### Example

```ts
const results = await client.download(
  ["2301.00001", "2101.00001"],
  "./papers",
  false
);
for (const r of results) {
  if (r.status === "downloaded") {
    console.log(`${r.id} -> ${r.path}`);
  }
}
```

#### Remarks

Each result has a status:
- `"downloaded"`: Successfully saved to outputDir
- `"skipped"`: File exists and overwrite is false
- `"failed"`: Network or file system error (see error property)

***

### downloadPdfBuffer()

> **downloadPdfBuffer**(`id`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [src/arxiv/client.ts:339](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L339)

Downloads a single arXiv PDF as a byte buffer.

#### Parameters

##### id

`string`

arXiv paper ID (e.g., "2301.00001" or "2301.00001.pdf")

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Promise resolving to the PDF file contents as a Uint8Array

#### Example

```ts
const buffer = await client.downloadPdfBuffer("2301.00001");
// buffer is a Uint8Array containing the PDF data
```

#### Remarks

The ID is normalized: whitespace is removed and ".pdf" suffix is stripped if present.
Useful for in-memory PDF processing without writing to disk.

***

### fetchByIds()

> **fetchByIds**(`ids`, `options`): `Promise`\<[`ArxivSearchResult`](../../types/type-aliases/ArxivSearchResult.md)\>

Defined in: [src/arxiv/client.ts:247](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L247)

Fetches metadata for specific arXiv paper IDs.

#### Parameters

##### ids

`string`[]

Array of arXiv paper IDs (e.g., ["2301.00001", "cs.AI/0001001"])

##### options

`Omit`\<[`ArxivSearchOptions`](../../types/type-aliases/ArxivSearchOptions.md), `"idList"`\> = `{}`

Optional search parameters (exclude idList)

#### Returns

`Promise`\<[`ArxivSearchResult`](../../types/type-aliases/ArxivSearchResult.md)\>

Promise resolving to search results for the specified IDs

#### Example

```ts
const results = await client.fetchByIds([
  "2301.00001",
  "2101.00001"
], { sortBy: "submittedDate" });
```

***

### getConfig()

> **getConfig**(): [`ArxivClientConfig`](../type-aliases/ArxivClientConfig.md)

Defined in: [src/arxiv/client.ts:126](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L126)

Returns a copy of the current client configuration.

#### Returns

[`ArxivClientConfig`](../type-aliases/ArxivClientConfig.md)

A shallow copy of the configuration object

***

### search()

> **search**(`options`): `Promise`\<[`ArxivSearchResult`](../../types/type-aliases/ArxivSearchResult.md)\>

Defined in: [src/arxiv/client.ts:162](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L162)

Searches arXiv with the given options and returns matching entries.

#### Parameters

##### options

[`ArxivSearchOptions`](../../types/type-aliases/ArxivSearchOptions.md)

Search parameters including query, ID list, and pagination

#### Returns

`Promise`\<[`ArxivSearchResult`](../../types/type-aliases/ArxivSearchResult.md)\>

Promise resolving to search results with entries and metadata

#### Throws

If pageSize exceeds MAX_PAGE_SIZE (2000)

#### Throws

If maxResults exceeds MAX_TOTAL_RESULTS (30000)

#### Throws

If start is negative

#### Examples

```ts
const results = await client.search({
  searchQuery: "cat:cs.AI AND ti:neural",
  maxResults: 50,
  sortBy: "relevance",
  sortOrder: "descending"
});
console.log(`Found ${results.totalResults} papers`);
```

```ts
// Fetch by specific IDs
const results = await client.search({
  idList: ["2301.00001", "2301.00002"]
});
```

#### Remarks

The client automatically handles pagination when maxResults exceeds pageSize.
Multiple API requests are made transparently to fetch all requested results.
