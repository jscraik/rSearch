[**rSearch**](../../../README.md)

***

[rSearch](../../../README.md) / [arxiv/types](../README.md) / ArxivEntry

# Type Alias: ArxivEntry

> **ArxivEntry** = `object`

Defined in: [src/arxiv/types.ts:22](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L22)

Complete metadata for an arXiv paper entry.

## Properties

### absUrl?

> `optional` **absUrl**: `string`

Defined in: [src/arxiv/types.ts:48](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L48)

Direct URL to abstract page

***

### authors

> **authors**: `string`[]

Defined in: [src/arxiv/types.ts:34](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L34)

List of author names

***

### categories

> **categories**: `string`[]

Defined in: [src/arxiv/types.ts:36](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L36)

arXiv category IDs (e.g., ["cs.AI", "cs.LG"])

***

### comment?

> `optional` **comment**: `string`

Defined in: [src/arxiv/types.ts:44](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L44)

Author comments

***

### doi?

> `optional` **doi**: `string`

Defined in: [src/arxiv/types.ts:42](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L42)

Digital Object Identifier

***

### id

> **id**: `string`

Defined in: [src/arxiv/types.ts:24](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L24)

arXiv paper ID (e.g., "2301.00001")

***

### journalRef?

> `optional` **journalRef**: `string`

Defined in: [src/arxiv/types.ts:46](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L46)

Journal reference (if published)

***

### license?

> `optional` **license**: `string`

Defined in: [src/arxiv/types.ts:52](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L52)

License name (e.g., "http://arxiv.org/licenses/nonexclusive-distrib/1.0/")

***

### licenseUrl?

> `optional` **licenseUrl**: `string`

Defined in: [src/arxiv/types.ts:54](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L54)

Full license URL

***

### links

> **links**: [`ArxivLink`](ArxivLink.md)[]

Defined in: [src/arxiv/types.ts:40](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L40)

All associated links

***

### pdfUrl?

> `optional` **pdfUrl**: `string`

Defined in: [src/arxiv/types.ts:50](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L50)

Direct URL to PDF download

***

### primaryCategory?

> `optional` **primaryCategory**: `string`

Defined in: [src/arxiv/types.ts:38](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L38)

Primary category ID

***

### published

> **published**: `string`

Defined in: [src/arxiv/types.ts:30](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L30)

ISO 8601 publication date

***

### summary

> **summary**: `string`

Defined in: [src/arxiv/types.ts:28](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L28)

Abstract summary

***

### title

> **title**: `string`

Defined in: [src/arxiv/types.ts:26](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L26)

Paper title

***

### updated

> **updated**: `string`

Defined in: [src/arxiv/types.ts:32](https://github.com/jscraik/rSearch/blob/main/src/arxiv/types.ts#L32)

ISO 8601 last updated date
