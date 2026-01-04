[**arxiv-cli**](../../../README.md)

***

[arxiv-cli](../../../README.md) / [arxiv/types](../README.md) / ArxivSearchResult

# Type Alias: ArxivSearchResult

> **ArxivSearchResult** = `object`

Defined in: [src/arxiv/types.ts:62](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L62)

Complete search result from the arXiv API.

## Properties

### entries

> **entries**: [`ArxivEntry`](ArxivEntry.md)[]

Defined in: [src/arxiv/types.ts:72](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L72)

Array of paper entries

***

### itemsPerPage

> **itemsPerPage**: `number`

Defined in: [src/arxiv/types.ts:70](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L70)

Number of items per page

***

### query

> **query**: `string`

Defined in: [src/arxiv/types.ts:64](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L64)

The search query that produced these results

***

### startIndex

> **startIndex**: `number`

Defined in: [src/arxiv/types.ts:68](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L68)

Starting index of this page

***

### totalResults

> **totalResults**: `number`

Defined in: [src/arxiv/types.ts:66](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/types.ts#L66)

Total number of matching papers on arXiv
