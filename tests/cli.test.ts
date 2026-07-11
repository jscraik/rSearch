import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, "src", "cli.ts");
const emptySearchFeedUrl =
  "data:text/xml,%3Cfeed%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2005%2FAtom%22%20xmlns%3Aopensearch%3D%22http%3A%2F%2Fa9.com%2F-%2Fspec%2Fopensearch%2F1.1%2F%22%3E%3Copensearch%3AtotalResults%3E0%3C%2Fopensearch%3AtotalResults%3E%3C%2Ffeed%3E#";

const testApiArgs = ["--api-base-url", emptySearchFeedUrl];

const runCli = (args: string[], input?: string, env?: Record<string, string>) =>
  spawnSync(process.execPath, ["--import", "tsx", cliPath, ...testApiArgs, ...args], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "test", RSEARCH_USE_TEST_CLIENT: "1", ...env },
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

// IU-1: Subcommand examples in help
describe("cli help examples", () => {
  it("search help shows example with cat:cs.AI", () => {
    const result = runCli(["search", "--help"]);
    expect(result.stdout).toContain("cat:cs.AI");
  });

  it("fetch help shows example with arXiv ID", () => {
    const result = runCli(["fetch", "--help"]);
    expect(result.stdout).toContain("2101.00001");
  });

  it("download help shows --out-dir example", () => {
    const result = runCli(["download", "--help"]);
    expect(result.stdout).toContain("--out-dir");
  });

  it("categories list help shows --group example", () => {
    const result = runCli(["categories", "list", "--help"]);
    expect(result.stdout).toContain("--group");
  });
});

// IU-2: Bounds documented in help descriptions
describe("cli bounds in help", () => {
  it("search help shows max-results bounds", () => {
    const result = runCli(["search", "--help"]);
    expect(result.stdout).toContain("default 100, max 30000");
  });

  it("search help shows page-size bounds", () => {
    const result = runCli(["search", "--help"]);
    expect(result.stdout).toContain("max 2000");
  });
});

// IU-3: --dry-run for download
describe("cli download --dry-run", () => {
  it("outputs dry-run plan without downloading", () => {
    const result = runCli(["download", "2101.00001", "--dry-run", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.download.dryrun.v1");
    expect(payload.data.results).toHaveLength(1);
    expect(payload.data.results[0].id).toBe("2101.00001");
    expect(payload.data.results[0].status).toMatch(/would-download|would-skip/);
  });

  it("shows --dry-run in download help", () => {
    const result = runCli(["download", "--help"]);

    expect(result.stdout).toContain("--dry-run");
  });

  it("returns warn status for dry-run with invalid ID", () => {
    const result = runCli(["download", "....", "--dry-run", "--json"]);

    expect(result.status).toBe(4);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.download.dryrun.v1");
    expect(payload.status).toBe("warn");
    expect(payload.data.results[0].status).toBe("would-fail");
    expect(payload.errors).toContain("dry_run_failure");
  });
});

// IU-4: Auto-detect non-TTY output + RSEARCH_OUTPUT env var
describe("cli output mode detection", () => {
  it("defaults to JSON when stdout is not a TTY and no flag set", () => {
    // runCli uses spawnSync which is never a TTY
    const result = runCli(["config"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.config.v1");
  });

  it("respects RSEARCH_OUTPUT env var", () => {
    const result = runCli(["config"], undefined, { RSEARCH_OUTPUT: "json" });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.config.v1");
  });

  it("explicit --plain overrides env var", () => {
    const result = runCli(["config", "--plain"], undefined, { RSEARCH_OUTPUT: "json" });

    expect(result.status).toBe(0);
    // --plain config outputs JSON.stringify (no tabs), just verify it's not the envelope format
    expect(result.stdout).not.toContain('"schema"');
  });

  it("-q alias prevents JSON auto-detection on non-TTY", () => {
    const result = runCli(["config", "-q"], undefined, { RSEARCH_OUTPUT: "json" });

    expect(result.status).toBe(0);
    // -q should be treated like --quiet, suppressing JSON envelope
    expect(result.stdout).not.toContain('"schema"');
  });
});

// IU-5: Error messages with example invocations
describe("cli error enrichment", () => {
  it("fetch error includes Example invocation", () => {
    const result = runCli(["fetch", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.error.message).toContain("Example: rsearch fetch");
  });

  it("search error includes example when query resolves to empty", () => {
    const result = runCli(["search", "-", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.error.message).toContain("Example: rsearch search");
  });

  it("download error includes example invocation", () => {
    const result = runCli(["download", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    // download uses resolveIds which references "rsearch fetch" in its example
    expect(payload.data.error.message).toContain("Example:");
  });

  it("urls error includes example invocation", () => {
    const result = runCli(["urls", "-", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    // urls uses resolveQuery which references "rsearch search" in its example
    expect(payload.data.error.message).toContain("Example:");
  });
});

// IU-6: Pipeline epilogs in help
describe("cli pipeline epilogs", () => {
  it("search help shows Pipeline composition", () => {
    const result = runCli(["search", "--help"]);
    expect(result.stdout).toContain("Pipeline:");
  });

  it("fetch help shows jq example", () => {
    const result = runCli(["fetch", "--help"]);
    expect(result.stdout).toContain("jq");
  });

  it("download help shows xargs example", () => {
    const result = runCli(["download", "--help"]);
    expect(result.stdout).toContain("xargs");
  });
});

// IU-7: Batch warning for >50 IDs in fetch
describe("cli fetch batch warning", () => {
  const makeIds = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      `2101.${String(i + 1).padStart(5, "0")}`
    );

  it("emits batch warning when fetching >50 IDs without --max-results", () => {
    const result = runCli(["fetch", ...makeIds(51), "--no-input"]);

    expect(result.stderr).toContain("Warning: Fetching 51 IDs without --max-results");
  });

  it("does not warn when --max-results is set", () => {
    const result = runCli(["fetch", ...makeIds(51), "--no-input", "--max-results", "100"]);

    expect(result.stderr).not.toContain("Warning: Fetching");
  });

  it("does not warn for 50 or fewer IDs", () => {
    const result = runCli(["fetch", ...makeIds(50), "--no-input"]);

    expect(result.stderr).not.toContain("Warning: Fetching");
  });

  it("embeds warning in JSON envelope instead of stderr", () => {
    const result = runCli(["fetch", ...makeIds(51), "--no-input", "--json"]);

    // In JSON mode, warning goes to envelope not stderr
    expect(result.stderr).not.toContain("Warning: Fetching");
  });
});

// IU-8: --limit for categories list
describe("cli categories list --limit", () => {
  it("accepts --limit option", () => {
    const result = runCli(["categories", "list", "--help"]);

    expect(result.stdout).toContain("--limit");
  });

  it("rejects --limit 0", () => {
    const result = runCli(["categories", "list", "--limit", "0", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
  });

  it("rejects non-numeric --limit", () => {
    const result = runCli(["categories", "list", "--limit", "abc", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
  });
});

// Robot mode
describe("cli robot mode", () => {
  const makeIds = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      `2101.${String(i + 1).padStart(5, "0")}`
    );

  it("corrects 'get' alias to 'fetch'", () => {
    const result = runCli(["get", ...makeIds(1), "--json"]);

    // Should succeed as fetch, with a correction note
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.fetch.v1");
    expect(payload.notes).toBeDefined();
    expect(payload.notes.some((n: { kind: string }) => n.kind === "corrected_command")).toBe(true);
  });

  it("corrects 'find' alias to 'search'", () => {
    const result = runCli(["find", "cat:cs.AI", "--json"], undefined, {
      RSEARCH_API_BASE_URL: emptySearchFeedUrl
    });

    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.search.v1");
    expect(payload.notes).toBeDefined();
    expect(payload.notes.some((n: { kind: string }) => n.kind === "corrected_command")).toBe(true);
  });

  it("returns rich error for completely unknown command", () => {
    const result = runCli(["foobarbaz", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.error.v1");
  });

  it("corrects flag typo --max-result to --max-results", () => {
    const result = runCli(["search", "cat:cs.AI", "--max-result", "5", "--json"], undefined, {
      RSEARCH_API_BASE_URL: emptySearchFeedUrl
    });

    // Should succeed with corrected flag
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.search.v1");
    expect(payload.notes).toBeDefined();
    expect(payload.notes.some((n: { kind: string }) => n.kind === "corrected_flag")).toBe(true);
  });

  it("normalizes arxiv: prefix on ID", () => {
    const result = runCli(["fetch", "arxiv:2101.00001", "--json"]);

    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.fetch.v1");
  });

  it("extracts ID from arXiv URL", () => {
    const result = runCli(["fetch", "https://arxiv.org/abs/2101.00001", "--json"]);

    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.fetch.v1");
  });

  it("activates robot mode via RSEARCH_ROBOT_MODE env var", () => {
    const result = runCli(["get", ...makeIds(1)], undefined, { RSEARCH_ROBOT_MODE: "1" });

    // With env var, robot mode should correct 'get' to 'fetch'
    // Output should be JSON (since robot mode → non-TTY auto-json)
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.fetch.v1");
  });

  it("corrects command alias even with preceding global option-value pair", () => {
    // Use --timeout (takes a value) before the command alias
    const result = runCli(["--timeout", "5000", "get", ...makeIds(1), "--json"]);

    // --timeout takes a value, so "get" should still be detected as the command
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.fetch.v1");
    expect(payload.notes).toBeDefined();
    expect(payload.notes.some((n: { kind: string }) => n.kind === "corrected_command")).toBe(true);
  });

  it("shows --robot in help", () => {
    const result = runCli(["--help"]);

    expect(result.stdout).toContain("--robot");
  });
});
