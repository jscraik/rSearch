[**rSearch**](../../README.md)

***

[rSearch](../../README.md) / [config](../README.md) / envConfig

# Function: envConfig()

> **envConfig**(): `object`

Defined in: [src/config.ts:218](https://github.com/jscraik/rSearch/blob/main/src/config.ts#L218)

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
- `RSEARCH_API_BASE_URL` - API base URL
- `RSEARCH_PDF_BASE_URL` - PDF base URL
- `RSEARCH_USER_AGENT` - User-Agent header
- `RSEARCH_TIMEOUT_MS` - Request timeout (positive integer)
- `RSEARCH_RATE_LIMIT_MS` - Rate limit interval (positive integer)
- `RSEARCH_MAX_RETRIES` - Max retry attempts (non-negative integer)
- `RSEARCH_RETRY_BASE_DELAY_MS` - Retry base delay (non-negative integer)
- `RSEARCH_CACHE` - Enable/disable cache (true/false/1/0)
- `RSEARCH_CACHE_DIR` - Disk cache directory path
- `RSEARCH_CACHE_TTL_MS` - Cache TTL in milliseconds (positive integer)
- `RSEARCH_PAGE_SIZE` - Default page size (positive integer)
- `RSEARCH_DOWNLOAD_DIR` - Default download directory
- `RSEARCH_DEBUG` - Enable debug logging (true/false/1/0)

## Example

```ts
const env = envConfig();
if (env.debug) {
  console.log("Debug mode enabled");
}
```
