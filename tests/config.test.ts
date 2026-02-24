import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { envConfig, loadConfig } from "../src/config.js";
import { CliError } from "../src/utils/errors.js";

const createdDirs: string[] = [];
const touchedEnvKeys = [
  "XDG_CONFIG_HOME",
  "RSEARCH_API_BASE_URL",
  "RSEARCH_PDF_BASE_URL",
  "RSEARCH_USER_AGENT",
  "RSEARCH_CACHE",
  "RSEARCH_CACHE_DIR",
  "RSEARCH_DOWNLOAD_DIR",
  "RSEARCH_TIMEOUT_MS",
  "RSEARCH_MAX_RETRIES",
  "RSEARCH_RETRY_BASE_DELAY_MS"
];
const envBackup = new Map<string, string | undefined>();

for (const key of touchedEnvKeys) {
  envBackup.set(key, process.env[key]);
}

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true });
  }

  for (const key of touchedEnvKeys) {
    const original = envBackup.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe("loadConfig", () => {
  it("supports explicit config paths with ~", async () => {
    const dir = await mkdtemp(join(homedir(), ".rsearch-config-test-"));
    createdDirs.push(dir);
    const configPath = join(dir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        timeoutMs: 12345
      }),
      "utf8"
    );

    const tildePath = `~/${relative(homedir(), configPath)}`;
    const { config, configPaths } = await loadConfig(process.cwd(), tildePath);

    expect(config.timeoutMs).toBe(12345);
    expect(configPaths).toHaveLength(1);
    expect(configPaths[0]).toBe(configPath);
  });

  it("resolves explicit relative config paths against the provided cwd", async () => {
    const dir = await mkdtemp(join(homedir(), ".rsearch-config-test-"));
    createdDirs.push(dir);
    const configPath = join(dir, "custom-config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        timeoutMs: 2468
      }),
      "utf8"
    );

    const { config, configPaths } = await loadConfig(dir, "./custom-config.json");

    expect(config.timeoutMs).toBe(2468);
    expect(configPaths).toContain(configPath);
  });

  it("expands ~ in XDG_CONFIG_HOME when loading default user config", async () => {
    const dir = await mkdtemp(join(homedir(), ".rsearch-xdg-test-"));
    createdDirs.push(dir);
    process.env.XDG_CONFIG_HOME = `~/${relative(homedir(), dir)}`;

    const configPath = join(dir, "rsearch", "config.json");
    await mkdir(join(dir, "rsearch"), { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        timeoutMs: 4242
      }),
      "utf8"
    );

    const { config, configPaths } = await loadConfig(process.cwd());

    expect(config.timeoutMs).toBe(4242);
    expect(configPaths).toContain(configPath);
  });

  it("rejects non-http(s) URLs in config files", async () => {
    const dir = await mkdtemp(join(homedir(), ".rsearch-config-test-"));
    createdDirs.push(dir);
    const configPath = join(dir, "config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        apiBaseUrl: "ftp://example.com/api"
      }),
      "utf8"
    );

    await expect(loadConfig(process.cwd(), configPath)).rejects.toThrow(CliError);
  });
});

describe("envConfig", () => {
  it("parses trimmed environment values", () => {
    process.env.RSEARCH_API_BASE_URL = " https://export.arxiv.org/api/query ";
    process.env.RSEARCH_PDF_BASE_URL = " https://arxiv.org/pdf/ ";
    process.env.RSEARCH_USER_AGENT = " custom-agent/1.0 ";
    process.env.RSEARCH_CACHE = "  true  ";
    process.env.RSEARCH_CACHE_DIR = " /tmp/rsearch-cache ";
    process.env.RSEARCH_DOWNLOAD_DIR = " /tmp/rsearch-downloads ";
    process.env.RSEARCH_TIMEOUT_MS = " 20000 ";
    process.env.RSEARCH_MAX_RETRIES = " 3 ";
    process.env.RSEARCH_RETRY_BASE_DELAY_MS = " 500 ";

    const config = envConfig();

    expect(config.apiBaseUrl).toBe("https://export.arxiv.org/api/query");
    expect(config.pdfBaseUrl).toBe("https://arxiv.org/pdf/");
    expect(config.userAgent).toBe("custom-agent/1.0");
    expect(config.cache).toBe(true);
    expect(config.cacheDir).toBe("/tmp/rsearch-cache");
    expect(config.defaultDownloadDir).toBe("/tmp/rsearch-downloads");
    expect(config.timeoutMs).toBe(20000);
    expect(config.maxRetries).toBe(3);
    expect(config.retryBaseDelayMs).toBe(500);
  });

  it("treats whitespace-only env values as unset", () => {
    process.env.RSEARCH_API_BASE_URL = "   ";
    process.env.RSEARCH_PDF_BASE_URL = "   ";
    process.env.RSEARCH_USER_AGENT = "   ";
    process.env.RSEARCH_CACHE = "   ";
    process.env.RSEARCH_CACHE_DIR = "   ";
    process.env.RSEARCH_DOWNLOAD_DIR = "   ";
    process.env.RSEARCH_TIMEOUT_MS = "   ";
    process.env.RSEARCH_MAX_RETRIES = "   ";
    process.env.RSEARCH_RETRY_BASE_DELAY_MS = "   ";

    const config = envConfig();

    expect(config.apiBaseUrl).toBeUndefined();
    expect(config.pdfBaseUrl).toBeUndefined();
    expect(config.userAgent).toBeUndefined();
    expect(config.cache).toBeUndefined();
    expect(config.cacheDir).toBeUndefined();
    expect(config.defaultDownloadDir).toBeUndefined();
    expect(config.timeoutMs).toBeUndefined();
    expect(config.maxRetries).toBeUndefined();
    expect(config.retryBaseDelayMs).toBeUndefined();
  });

  it("throws CliError for invalid boolean values", () => {
    process.env.RSEARCH_CACHE = "maybe";

    expect(() => envConfig()).toThrow(CliError);
  });

  it("throws CliError for invalid url values", () => {
    process.env.RSEARCH_API_BASE_URL = "not-a-url";

    expect(() => envConfig()).toThrow(CliError);
  });

  it("throws CliError for non-http(s) url values", () => {
    process.env.RSEARCH_API_BASE_URL = "ftp://example.com/api";

    expect(() => envConfig()).toThrow(CliError);
  });
});
