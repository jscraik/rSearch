[**rSearch**](../../../README.md)

***

[rSearch](../../../README.md) / [arxiv/client](../README.md) / ArxivClientConfig

# Type Alias: ArxivClientConfig

> **ArxivClientConfig** = `object`

Defined in: [src/arxiv/client.ts:35](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L35)

Configuration options for the arXiv API client.

## Remarks

This configuration controls API endpoint URLs, request behavior,
caching, retry logic, and debugging output.

## Example

```ts
const config: ArxivClientConfig = {
  apiBaseUrl: "https://export.arxiv.org/api/query",
  pdfBaseUrl: "https://arxiv.org/pdf/",
  userAgent: "my-app/1.0 (mailto:me@example.com)",
  timeoutMs: 20000,
  minIntervalMs: 3000,
  pageSize: 100,
  maxRetries: 3,
  retryBaseDelayMs: 500,
  cache: true,
  debug: false
};
```

## Properties

### apiBaseUrl

> **apiBaseUrl**: `string`

Defined in: [src/arxiv/client.ts:37](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L37)

Base URL for the arXiv API query endpoint.

***

### cache

> **cache**: `boolean`

Defined in: [src/arxiv/client.ts:47](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L47)

Enable in-memory caching of API responses.

***

### cacheDir?

> `optional` **cacheDir**: `string`

Defined in: [src/arxiv/client.ts:49](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L49)

Optional directory for on-disk HTTP cache.

***

### cacheTtlMs?

> `optional` **cacheTtlMs**: `number`

Defined in: [src/arxiv/client.ts:51](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L51)

Optional TTL for on-disk cache entries in milliseconds.

***

### debug

> **debug**: `boolean`

Defined in: [src/arxiv/client.ts:59](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L59)

Enable debug logging to stderr.

***

### maxRetries

> **maxRetries**: `number`

Defined in: [src/arxiv/client.ts:55](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L55)

Maximum number of retry attempts for transient failures.

***

### minIntervalMs

> **minIntervalMs**: `number`

Defined in: [src/arxiv/client.ts:45](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L45)

Minimum interval between API requests in milliseconds (rate limiting).

***

### pageSize

> **pageSize**: `number`

Defined in: [src/arxiv/client.ts:53](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L53)

Default page size for paginated queries.

***

### pdfBaseUrl

> **pdfBaseUrl**: `string`

Defined in: [src/arxiv/client.ts:39](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L39)

Base URL for arXiv PDF downloads.

***

### retryBaseDelayMs

> **retryBaseDelayMs**: `number`

Defined in: [src/arxiv/client.ts:57](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L57)

Base delay in milliseconds for exponential backoff retries.

***

### timeoutMs

> **timeoutMs**: `number`

Defined in: [src/arxiv/client.ts:43](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L43)

HTTP request timeout in milliseconds.

***

### userAgent

> **userAgent**: `string`

Defined in: [src/arxiv/client.ts:41](https://github.com/jscraik/rSearch/blob/main/src/arxiv/client.ts#L41)

User-Agent header for API requests.
