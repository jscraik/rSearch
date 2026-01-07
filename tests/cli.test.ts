import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, "src", "cli.ts");

const runCli = (args: string[], input?: string) =>
  spawnSync(process.execPath, ["--import", "tsx", cliPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "test" },
    encoding: "utf8",
    input
  });

describe("cli", () => {
  it("prints help", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("search");
    expect(result.stdout).toContain("download");
  });

  it("emits JSON error envelope on usage error", () => {
    const result = runCli(["search", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.error.v1");
    expect(payload.errors).toContain("E_USAGE");
  });

  it("respects --no-input when query is missing", () => {
    const result = runCli(["urls", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.error.message).toMatch(/--no-input/);
  });

  it("fails when explicit config file is missing", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const missingPath = resolve(tempDir, "missing-config.json");
    const result = runCli(["config", "--config", missingPath, "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.error.message).toContain("Config file not found");
  });

  it("rejects invalid numeric flags", () => {
    const result = runCli(["search", "cat:cs.AI", "--timeout", "abc", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
  });

  it("maps --no-retry to maxRetries=0", () => {
    const result = runCli(["config", "--no-retry", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.maxRetries).toBe(0);
  });
});
