import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { CliError } from "./utils/errors.js";

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

export type FileConfig = z.infer<typeof configSchema>;

export type LoadedConfig = {
  config: FileConfig;
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

export const defaultUserConfigPath = () =>
  join(xdgConfigHome(), "arxiv-cli", "config.json");

export const defaultProjectConfigPath = (cwd: string) =>
  resolve(cwd, ".arxivrc.json");

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

export const envConfig = (): FileConfig => ({
  apiBaseUrl: process.env.ARXIV_API_BASE_URL,
  pdfBaseUrl: process.env.ARXIV_PDF_BASE_URL,
  userAgent: process.env.ARXIV_USER_AGENT,
  timeoutMs: parsePositiveIntEnv("ARXIV_TIMEOUT_MS", process.env.ARXIV_TIMEOUT_MS),
  minIntervalMs: parsePositiveIntEnv("ARXIV_RATE_LIMIT_MS", process.env.ARXIV_RATE_LIMIT_MS),
  maxRetries: parseNonNegativeIntEnv("ARXIV_MAX_RETRIES", process.env.ARXIV_MAX_RETRIES),
  retryBaseDelayMs: parseNonNegativeIntEnv(
    "ARXIV_RETRY_BASE_DELAY_MS",
    process.env.ARXIV_RETRY_BASE_DELAY_MS
  ),
  cache: parseBooleanEnv("ARXIV_CACHE", process.env.ARXIV_CACHE),
  cacheDir: process.env.ARXIV_CACHE_DIR,
  cacheTtlMs: parsePositiveIntEnv("ARXIV_CACHE_TTL_MS", process.env.ARXIV_CACHE_TTL_MS),
  pageSize: parsePositiveIntEnv("ARXIV_PAGE_SIZE", process.env.ARXIV_PAGE_SIZE),
  defaultDownloadDir: process.env.ARXIV_DOWNLOAD_DIR,
  debug: parseBooleanEnv("ARXIV_DEBUG", process.env.ARXIV_DEBUG)
});
