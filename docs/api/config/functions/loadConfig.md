[**rSearch**](../../README.md)

***

[rSearch](../../README.md) / [config](../README.md) / loadConfig

# Function: loadConfig()

> **loadConfig**(`cwd`, `explicitPath?`): `Promise`\<[`LoadedConfig`](../type-aliases/LoadedConfig.md)\>

Defined in: [src/config.ts:139](https://github.com/jscraik/rSearch/blob/main/src/config.ts#L139)

Loads and merges configuration from user and project config files.

## Parameters

### cwd

`string`

Current working directory for resolving project config path

### explicitPath?

`string`

Optional explicit config file path (skips default paths)

## Returns

`Promise`\<[`LoadedConfig`](../type-aliases/LoadedConfig.md)\>

Promise resolving to loaded config with source paths

## Throws

If explicit path is required but not found

## Throws

If config file contains invalid JSON or fails schema validation

## Examples

```ts
const { config, configPaths } = await loadConfig(process.cwd());
console.log("Loaded configs from:", configPaths);
```

```ts
// Load from explicit path
const { config } = await loadConfig(process.cwd(), "./my-config.json");
```

## Remarks

Config precedence (later sources override earlier):
1. User config: `~/.config/rsearch/config.json`
2. Project config: `<cwd>/.arxivrc.json`

When `explicitPath` is provided, only that file is loaded.
Missing optional files are silently skipped.
