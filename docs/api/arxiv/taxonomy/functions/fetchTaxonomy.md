[**rSearch**](../../../README.md)

***

[rSearch](../../../README.md) / [arxiv/taxonomy](../README.md) / fetchTaxonomy

# Function: fetchTaxonomy()

> **fetchTaxonomy**(`config`, `options`): `Promise`\<[`TaxonomyResult`](../type-aliases/TaxonomyResult.md)\>

Defined in: [src/arxiv/taxonomy.ts:194](https://github.com/jscraik/rSearch/blob/main/src/arxiv/taxonomy.ts#L194)

Fetches the arXiv category taxonomy.

## Parameters

### config

`Partial`\<[`TaxonomyConfig`](../type-aliases/TaxonomyConfig.md)\> = `{}`

Optional configuration overrides

### options

Options for cache behavior

#### refresh?

`boolean`

## Returns

`Promise`\<[`TaxonomyResult`](../type-aliases/TaxonomyResult.md)\>

Promise resolving to parsed taxonomy

## Throws

If the HTTP request fails

## Examples

```ts
const taxonomy = await fetchTaxonomy();
console.log(`Found ${taxonomy.categories.length} categories`);
```

```ts
// Force refresh cache
const taxonomy = await fetchTaxonomy({}, { refresh: true });
```

## Remarks

Results are cached in-memory. Use `{ refresh: true }` to bypass cache.
