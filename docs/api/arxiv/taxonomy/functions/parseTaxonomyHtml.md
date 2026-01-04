[**arxiv-cli**](../../../README.md)

***

[arxiv-cli](../../../README.md) / [arxiv/taxonomy](../README.md) / parseTaxonomyHtml

# Function: parseTaxonomyHtml()

> **parseTaxonomyHtml**(`html`, `sourceUrl`): [`TaxonomyResult`](../type-aliases/TaxonomyResult.md)

Defined in: [src/arxiv/taxonomy.ts:106](https://github.com/jscraik/arXiv-CLI/blob/main/src/arxiv/taxonomy.ts#L106)

Parses arXiv taxonomy HTML into structured data.

## Parameters

### html

`string`

Raw HTML from arXiv category taxonomy page

### sourceUrl

`string`

URL where the HTML was fetched (included in result)

## Returns

[`TaxonomyResult`](../type-aliases/TaxonomyResult.md)

Parsed taxonomy with groups and categories

## Remarks

Extracts category IDs, names, descriptions, and groupings
from the arXiv category taxonomy page structure.
