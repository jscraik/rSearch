import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { CliError } from "./utils/errors.js";

/**
 * Zod schema for validating rSearch configuration files.
 *
 * @internal
 */
const configSchema = z.object({
  apiBaseUrl: z.string().url().optional(),
  pdfBaseUrl: z.string().url().optional(),
  userAgent: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
  minIntervalMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
  retryBaseDelayMs: z.number().int().nonnegative().optional(),
  cache: z.boolean().optional(),
  cacheDir: z.string().optional(),
  cacheTtlMs: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  defaultDownloadDir: z.string().optional(),
  debug: z.boolean().optional()
});

/**
 * Configuration file schema type.
 *
 * @remarks
 * All properties are optional; unset values will be overridden by
 * environment variables or CLI flags.
 *
 * @public
 */
export type FileConfig = z.infer<typeof configSchema>;

/**
 * Result of loading configuration from files.
 *
 * @public
 */
export type LoadedConfig = {
  /** Merged configuration from all loaded files */
  config: FileConfig;
  /** Paths to files that were successfully loaded */
  configPaths: string[];
};

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");

const readConfigFile = async (path: string, required: boolean): Promise<FileConfig | null> => {
  try {
    const contents = await readFile(path, "utf8");
    const parsed = JSON.parse(contents);
    return configSchema.parse(parsed);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "ENOENT") {
      if (required) {
        throw new CliError(`Config file not found: ${path}`, 2, "E_USAGE");
      }
      return null;
    }
    if (error instanceof SyntaxError) {
      throw new CliError(`Invalid JSON in config file ${path}: ${error.message}`, 2, "E_VALIDATION");
    }
    if (error instanceof z.ZodError) {
      throw new CliError(`Invalid config in ${path}: ${formatZodError(error)}`, 2, "E_VALIDATION");
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(`Failed to read config file ${path}: ${message}`, 1, "E_INTERNAL");
  }
};

const xdgConfigHome = () =>
  process.env.XDG_CONFIG_HOME
    ? resolve(process.env.XDG_CONFIG_HOME)
    : join(homedir(), ".config");

/**
 * Returns the default user config file path.
 *
 * @returns Path to `~/.config/rsearch/config.json`
 *
 * @remarks
 * Respects `XDG_CONFIG_HOME` environment variable if set.
 *
 * @public
 */
export const defaultUserConfigPath = () =>
  join(xdgConfigHome(), "rsearch", "config.json");

/**
 * Returns the default project config file path.
 *
 * @param cwd - Current working directory
 * @returns Path to `<cwd>/.rsearchrc.json`
 *
 * @public
 */
export const defaultProjectConfigPath = (cwd: string) =>
  resolve(cwd, ".rsearchrc.json");

/**
 * Loads and merges configuration from user and project config files.
 *
 * @param cwd - Current working directory for resolving project config path
 * @param explicitPath - Optional explicit config file path (skips default paths)
 * @returns Promise resolving to loaded config with source paths
 * @throws {CliError} If explicit path is required but not found
 * @throws {CliError} If config file contains invalid JSON or fails schema validation
 *
 * @example
 * ```ts
 * const { config, configPaths } = await loadConfig(process.cwd());
 * console.log("Loaded configs from:", configPaths);
 * ```
 *
 * @example
 * ```ts
 * // Load from explicit path
 * const { config } = await loadConfig(process.cwd(), "./my-config.json");
 * ```
 *
 * @remarks
 * Config precedence (later sources override earlier):
 * 1. User config: `~/.config/rsearch/config.json`
 * 2. Project config: `<cwd>/.rsearchrc.json`
 *
 * When `explicitPath` is provided, only that file is loaded.
 * Missing optional files are silently skipped.
 *
 * @public
 */
export const loadConfig = async (cwd: string, explicitPath?: string): Promise<LoadedConfig> => {
  const paths = explicitPath
    ? [resolve(explicitPath)]
    : [defaultUserConfigPath(), defaultProjectConfigPath(cwd)];

  const configs: FileConfig[] = [];
  const loadedPaths: string[] = [];

  for (const path of paths) {
    const config = await readConfigFile(path, Boolean(explicitPath));
    if (config) {
      configs.push(config);
      loadedPaths.push(path);
    }
  }

  return {
    config: Object.assign({}, ...configs),
    configPaths: loadedPaths
  };
};

const parseBooleanEnv = (name: string, value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  throw new CliError(`Invalid ${name} (expected true/false): ${value}`, 2, "E_VALIDATION");
};

const parsePositiveIntEnv = (name: string, value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(`Invalid ${name} (expected positive integer): ${value}`, 2, "E_VALIDATION");
  }
  return parsed;
};

const parseNonNegativeIntEnv = (name: string, value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new CliError(`Invalid ${name} (expected non-negative integer): ${value}`, 2, "E_VALIDATION");
  }
  return parsed;
};

/**
 * Reads configuration from environment variables.
 *
 * @returns Configuration object with values from environment
 *
 * @remarks
 * Supported environment variables:
 * - `RSEARCH_API_BASE_URL` - API base URL
 * - `RSEARCH_PDF_BASE_URL` - PDF base URL
 * - `RSEARCH_USER_AGENT` - User-Agent header
 * - `RSEARCH_TIMEOUT_MS` - Request timeout (positive integer)
 * - `RSEARCH_RATE_LIMIT_MS` - Rate limit interval (positive integer)
 * - `RSEARCH_MAX_RETRIES` - Max retry attempts (non-negative integer)
 * - `RSEARCH_RETRY_BASE_DELAY_MS` - Retry base delay (non-negative integer)
 * - `RSEARCH_CACHE` - Enable/disable cache (true/false/1/0)
 * - `RSEARCH_CACHE_DIR` - Disk cache directory path
 * - `RSEARCH_CACHE_TTL_MS` - Cache TTL in milliseconds (positive integer)
 * - `RSEARCH_PAGE_SIZE` - Default page size (positive integer)
 * - `RSEARCH_DOWNLOAD_DIR` - Default download directory
 * - `RSEARCH_DEBUG` - Enable debug logging (true/false/1/0)
 *
 * @example
 * ```ts
 * const env = envConfig();
 * if (env.debug) {
 *   console.log("Debug mode enabled");
 * }
 * ```
 *
 * @public
 */
export const envConfig = (): FileConfig => ({
  apiBaseUrl: process.env.RSEARCH_API_BASE_URL,
  pdfBaseUrl: process.env.RSEARCH_PDF_BASE_URL,
  userAgent: process.env.RSEARCH_USER_AGENT,
  timeoutMs: parsePositiveIntEnv("RSEARCH_TIMEOUT_MS", process.env.RSEARCH_TIMEOUT_MS),
  minIntervalMs: parsePositiveIntEnv("RSEARCH_RATE_LIMIT_MS", process.env.RSEARCH_RATE_LIMIT_MS),
  maxRetries: parseNonNegativeIntEnv("RSEARCH_MAX_RETRIES", process.env.RSEARCH_MAX_RETRIES),
  retryBaseDelayMs: parseNonNegativeIntEnv(
    "RSEARCH_RETRY_BASE_DELAY_MS",
    process.env.RSEARCH_RETRY_BASE_DELAY_MS
  ),
  cache: parseBooleanEnv("RSEARCH_CACHE", process.env.RSEARCH_CACHE),
  cacheDir: process.env.RSEARCH_CACHE_DIR,
  cacheTtlMs: parsePositiveIntEnv("RSEARCH_CACHE_TTL_MS", process.env.RSEARCH_CACHE_TTL_MS),
  pageSize: parsePositiveIntEnv("RSEARCH_PAGE_SIZE", process.env.RSEARCH_PAGE_SIZE),
  defaultDownloadDir: process.env.RSEARCH_DOWNLOAD_DIR,
  debug: parseBooleanEnv("RSEARCH_DEBUG", process.env.RSEARCH_DEBUG)
});
