[**rSearch**](../../../README.md)

***

[rSearch](../../../README.md) / [arxiv/types](../README.md) / ArxivSearchOptions

# Type Alias: ArxivSearchOptions

> **ArxivSearchOptions** = `object`

Defined in: [src/arxiv/types.ts:80](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L80)

Options for searching the arXiv API.

## Properties

### idList?

> `optional` **idList**: `string`[]

Defined in: [src/arxiv/types.ts:84](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L84)

List of specific arXiv IDs to fetch

***

### maxResults?

> `optional` **maxResults**: `number`

Defined in: [src/arxiv/types.ts:88](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L88)

Maximum total results to return

***

### pageSize?

> `optional` **pageSize**: `number`

Defined in: [src/arxiv/types.ts:90](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L90)

Results per page (max: 2000)

***

### searchQuery?

> `optional` **searchQuery**: `string`

Defined in: [src/arxiv/types.ts:82](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L82)

arXiv search query syntax (e.g., "cat:cs.AI AND ti:neural")

***

### sortBy?

> `optional` **sortBy**: `"relevance"` \| `"lastUpdatedDate"` \| `"submittedDate"`

Defined in: [src/arxiv/types.ts:92](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L92)

Sort field for results

***

### sortOrder?

> `optional` **sortOrder**: `"ascending"` \| `"descending"`

Defined in: [src/arxiv/types.ts:94](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L94)

Sort order for results

***

### start?

> `optional` **start**: `number`

Defined in: [src/arxiv/types.ts:86](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L86)

Starting index for pagination (default: 0)
