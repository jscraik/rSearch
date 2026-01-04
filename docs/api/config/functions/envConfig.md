[**arxiv-cli**](../../README.md)

***

[arxiv-cli](../../README.md) / [config](../README.md) / envConfig

# Function: envConfig()

> **envConfig**(): `object`

Defined in: [src/config.ts:218](https://github.com/jscraik/arXiv-CLI/blob/main/src/config.ts#L218)

Reads configuration from environment variables.

## Returns

`object`

Configuration object with values from environment

### apiBaseUrl?

> `optional` **apiBaseUrl**: `string`

### cache?

> `optional` **cache**: `boolean`

### cacheDir?

> `optional` **cacheDir**: `string`

### cacheTtlMs?

> `optional` **cacheTtlMs**: `number`

### debug?

> `optional` **debug**: `boolean`

### defaultDownloadDir?

> `optional` **defaultDownloadDir**: `string`

### maxRetries?

> `optional` **maxRetries**: `number`

### minIntervalMs?

> `optional` **minIntervalMs**: `number`

### pageSize?

> `optional` **pageSize**: `number`

### pdfBaseUrl?

> `optional` **pdfBaseUrl**: `string`

### retryBaseDelayMs?

> `optional` **retryBaseDelayMs**: `number`

### timeoutMs?

> `optional` **timeoutMs**: `number`

### userAgent?

> `optional` **userAgent**: `string`

## Remarks

Supported environment variables:
- `ARXIV_API_BASE_URL` - API base URL
- `ARXIV_PDF_BASE_URL` - PDF base URL
- `ARXIV_USER_AGENT` - User-Agent header
- `ARXIV_TIMEOUT_MS` - Request timeout (positive integer)
- `ARXIV_RATE_LIMIT_MS` - Rate limit interval (positive integer)
- `ARXIV_MAX_RETRIES` - Max retry attempts (non-negative integer)
- `ARXIV_RETRY_BASE_DELAY_MS` - Retry base delay (non-negative integer)
- `ARXIV_CACHE` - Enable/disable cache (true/false/1/0)
- `ARXIV_CACHE_DIR` - Disk cache directory path
- `ARXIV_CACHE_TTL_MS` - Cache TTL in milliseconds (positive integer)
- `ARXIV_PAGE_SIZE` - Default page size (positive integer)
- `ARXIV_DOWNLOAD_DIR` - Default download directory
- `ARXIV_DEBUG` - Enable debug logging (true/false/1/0)

## Example

```ts
const env = envConfig();
if (env.debug) {
  console.log("Debug mode enabled");
}
```
