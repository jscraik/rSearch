import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

const configSchema = z.object({
  apiBaseUrl: z.string().url().optional(),
  pdfBaseUrl: z.string().url().optional(),
  userAgent: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
  minIntervalMs: z.number().int().positive().optional(),
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

const readConfigFile = async (path: string): Promise<FileConfig | null> => {
  try {
    const contents = await readFile(path, "utf8");
    const parsed = JSON.parse(contents);
    return configSchema.parse(parsed);
  } catch {
    return null;
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
    const config = await readConfigFile(path);
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

const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return undefined;
};

export const envConfig = (): FileConfig => ({
  apiBaseUrl: process.env.ARXIV_API_BASE_URL,
  pdfBaseUrl: process.env.ARXIV_PDF_BASE_URL,
  userAgent: process.env.ARXIV_USER_AGENT,
  timeoutMs: process.env.ARXIV_TIMEOUT_MS ? Number(process.env.ARXIV_TIMEOUT_MS) : undefined,
  minIntervalMs: process.env.ARXIV_RATE_LIMIT_MS ? Number(process.env.ARXIV_RATE_LIMIT_MS) : undefined,
  cache: parseBooleanEnv(process.env.ARXIV_CACHE),
  cacheDir: process.env.ARXIV_CACHE_DIR,
  cacheTtlMs: process.env.ARXIV_CACHE_TTL_MS ? Number(process.env.ARXIV_CACHE_TTL_MS) : undefined,
  pageSize: process.env.ARXIV_PAGE_SIZE ? Number(process.env.ARXIV_PAGE_SIZE) : undefined,
  defaultDownloadDir: process.env.ARXIV_DOWNLOAD_DIR,
  debug: parseBooleanEnv(process.env.ARXIV_DEBUG)
});
