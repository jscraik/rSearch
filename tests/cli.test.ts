import { describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, "src", "cli.ts");

const runCli = (args: string[], input?: string) =>
  spawnSync(process.execPath, ["--import", "tsx", cliPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: "test" },
    encoding: "utf8",
    input
  });

const runCliAsync = (args: string[], input?: string) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolvePromise) => {
    const child = spawn(process.execPath, ["--import", "tsx", cliPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: "test" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolvePromise({ status, stdout, stderr });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });

const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 34 >>
stream
BT 72 72 Td (Hello) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000190 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
273
%%EOF
`;

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

  it("rejects whitespace-only search queries", () => {
    const result = runCli(["search", "   ", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("Provide a search query");
  });

  it("rejects whitespace-only urls queries", () => {
    const result = runCli(["urls", "   ", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("Provide a search query or IDs");
  });

  it("respects --no-input for download --query -", () => {
    const result = runCli(["download", "--query", "-", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toMatch(/--no-input/);
  });

  it("rejects whitespace-only download --query values", () => {
    const result = runCli(["download", "--query", "   ", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("non-empty query");
  });

  it("rejects missing download --query values when followed by another flag", () => {
    const result = runCli(["download", "--query", "--no-input", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("non-empty query");
  });

  it("rejects empty stdin for download --query -", async () => {
    const result = await runCliAsync(["download", "--query", "-", "--json"], "");

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("non-empty query");
  });

  it("rejects mixing a query with --ids for urls", () => {
    const result = runCli(["urls", "cat:cs.AI", "--ids", "1234.5678", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("either a search query or --ids");
  });

  it("rejects mixing --query with positional IDs for download", () => {
    const result = runCli(["download", "1234.5678", "--query", "cat:cs.AI", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("either --query or IDs");
  });

  it("parses whitespace-separated IDs from stdin", async () => {
    let observedIdList = "";
    const expectedIds = ["1234.5678", "2345.6789"];

    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api")) {
        const url = new URL(req.url, "http://localhost");
        observedIdList = url.searchParams.get("id_list") ?? "";
        const ids = observedIdList === expectedIds.join(",") ? expectedIds : [];
        const entries = ids
          .map(
            (id) => `
  <entry>
    <id>http://arxiv.org/abs/${id}</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>${id}</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/${id}" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/${id}" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>`
          )
          .join("");
        const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>${ids.length}</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>${ids.length}</opensearch:itemsPerPage>${entries}
</feed>`;
        res.statusCode = 200;
        res.setHeader("content-type", "application/atom+xml");
        res.end(feed);
        return;
      }

      res.statusCode = 404;
      res.end("not found");
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const result = await runCliAsync(
        ["fetch", "--api-base-url", `${baseUrl}/api`, "--json"],
        "1234.5678 2345.6789\n"
      );

      expect(result.status).toBe(0);
      expect(observedIdList).toBe(expectedIds.join(","));
      const payload = JSON.parse(result.stdout);
      expect(payload.data.entries.map((item: { id: string }) => item.id)).toEqual(expectedIds);
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
      });
    }
  });

  it("accepts --ids - as stdin sentinel", async () => {
    const expectedIds = ["1234.5678", "2345.6789"];
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>2</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>1234.5678</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/1234.5678" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/1234.5678" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2345.6789</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>2345.6789</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/2345.6789" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/2345.6789" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/atom+xml");
        res.end(feed);
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const result = await runCliAsync(
        ["urls", "--ids", "-", "--api-base-url", `${baseUrl}/api`, "--json"],
        "1234.5678 2345.6789\n"
      );

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.data.ids).toEqual(expectedIds);
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
      });
    }
  });

  it("fails when explicit config file is missing", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const missingPath = resolve(tempDir, "missing-config.json");
    const result = runCli(["config", "--config", missingPath, "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.error.message).toContain("Config file not found");
  });

  it("applies values from explicit config files", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const configPath = resolve(tempDir, "config.json");
    const cacheDir = resolve(tempDir, "cache");
    writeFileSync(
      configPath,
      JSON.stringify({
        timeoutMs: 12345,
        cacheDir
      }),
      "utf8"
    );

    const result = runCli(["config", "--config", configPath, "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.timeoutMs).toBe(12345);
    expect(payload.data.config.cacheDir).toBe(cacheDir);
  });

  it("shows effective default runtime config values", () => {
    const result = runCli(["config", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.timeoutMs).toBe(20000);
    expect(payload.data.config.minIntervalMs).toBe(3000);
    expect(payload.data.config.maxRetries).toBe(3);
    expect(payload.data.config.userAgent).toMatch(/^rsearch\//);
  });

  it("normalizes blank string config values to defaults", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const configPath = resolve(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        userAgent: "   ",
        cacheDir: "   ",
        defaultDownloadDir: "   "
      }),
      "utf8"
    );

    const result = runCli(["config", "--config", configPath, "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.userAgent).toMatch(/^rsearch\//);
    expect("cacheDir" in payload.data.config).toBe(false);
    expect("defaultDownloadDir" in payload.data.config).toBe(false);
  });

  it("expands ~ paths for cache and download directories", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const configPath = resolve(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        cacheDir: "~/.cache/rsearch-tests",
        defaultDownloadDir: "~/rsearch-downloads"
      }),
      "utf8"
    );

    const result = runCli(["config", "--config", configPath, "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.cacheDir).toBe(resolve(homedir(), ".cache/rsearch-tests"));
    expect(payload.data.config.defaultDownloadDir).toBe(resolve(homedir(), "rsearch-downloads"));
  });

  it("preserves mailto contacts in user agent", () => {
    const result = runCli(["config", "--contact", "mailto:test@example.com", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.userAgent).toMatch(/\(mailto:test@example\.com\)$/);
  });

  it("ignores blank contacts when building user agent", () => {
    const result = runCli(["config", "--contact", "   ", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.userAgent).toMatch(/^rsearch\/[^\s)]+$/);
  });

  it("ignores blank explicit user-agent values", () => {
    const result = runCli(["config", "--user-agent", "   ", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.userAgent).toMatch(/^rsearch\/[^\s)]+$/);
  });

  it("falls back to contact when user-agent is blank", () => {
    const result = runCli(["config", "--user-agent", "   ", "--contact", "person@example.com", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.userAgent).toMatch(/\(mailto:person@example\.com\)$/);
  });

  it("rejects invalid numeric flags", () => {
    const result = runCli(["search", "cat:cs.AI", "--timeout", "abc", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
  });

  it("rejects invalid URL flags", () => {
    const result = runCli(["config", "--api-base-url", "not-a-url", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
    expect(payload.data.error.message).toContain("Invalid api-base-url");
  });

  it("rejects non-http(s) URL flags", () => {
    const result = runCli(["config", "--api-base-url", "ftp://example.com/api", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.errors).toContain("E_VALIDATION");
    expect(payload.data.error.message).toContain("expected http(s) URL");
  });

  it("maps --no-retry to maxRetries=0", () => {
    const result = runCli(["config", "--no-retry", "--json"]);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.data.config.maxRetries).toBe(0);
  });

  it("shows command-specific help via help <command>", () => {
    const result = runCli(["help", "search"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("search <query>");
    expect(result.stdout).toContain("Search arXiv metadata");
  });

  it("shows nested command help via help <command...>", () => {
    const result = runCli(["help", "categories", "list"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("categories list");
    expect(result.stdout).toContain("List categories");
  });

  it("exits cleanly when stdout pipe closes early", () => {
    const nodePath = JSON.stringify(process.execPath);
    const quotedCliPath = JSON.stringify(cliPath);
    const script = `set -o pipefail; ${nodePath} --import tsx ${quotedCliPath} help categories list | head -n 3 >/dev/null`;
    const result = spawnSync("zsh", ["-lc", script], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: "test" },
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("EPIPE");
  });

  it("fails for unknown help targets", () => {
    const result = runCli(["help", "notacommand", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.error.v1");
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("Unknown command");
  });

  it("fails for unknown nested help targets", () => {
    const result = runCli(["help", "categories", "nope", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.error.v1");
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("Unknown command path");
  });

  it("fails for overly deep help command paths", () => {
    const result = runCli(["help", "categories", "list", "extra", "--json"]);

    expect(result.status).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.schema).toBe("arxiv.error.v1");
    expect(payload.errors).toContain("E_USAGE");
    expect(payload.data.error.message).toContain("Unknown command path");
  });

  it("keeps pdf when exporting markdown", async () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const outDir = resolve(tempDir, "out");
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Test Title</title>
    <summary>Test summary</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/1234.5678v1" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/1234.5678v1" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/atom+xml");
        res.end(feed);
        return;
      }

      if (req.url?.startsWith("/pdf/")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/pdf");
        res.end(Buffer.from(MINIMAL_PDF, "utf8"));
        return;
      }

      res.statusCode = 404;
      res.end("not found");
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const first = await runCliAsync([
        "download",
        "1234.5678v1",
        "--format",
        "md",
        "--out-dir",
        outDir,
        "--api-base-url",
        `${baseUrl}/api`,
        "--pdf-base-url",
        `${baseUrl}/pdf/`,
        "--json"
      ]);

      expect(first.status).toBe(0);
      const firstPayload = JSON.parse(first.stdout);
      expect(firstPayload.data.results[0]?.status).toBe("downloaded");
      expect(existsSync(resolve(outDir, "1234.5678v1.md"))).toBe(true);
      expect(existsSync(resolve(outDir, "1234.5678v1.pdf"))).toBe(false);

      const second = await runCliAsync([
        "download",
        "1234.5678v1",
        "--format",
        "md",
        "--keep-pdf",
        "--out-dir",
        outDir,
        "--api-base-url",
        `${baseUrl}/api`,
        "--pdf-base-url",
        `${baseUrl}/pdf/`,
        "--json"
      ]);

      expect(second.status).toBe(0);
      const secondPayload = JSON.parse(second.stdout);
      expect(secondPayload.data.results[0]?.status).toBe("skipped");
      expect(existsSync(resolve(outDir, "1234.5678v1.md"))).toBe(true);
      expect(existsSync(resolve(outDir, "1234.5678v1.pdf"))).toBe(true);
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
      });
    }
  }, 15000);

  it("writes distinct markdown files for different arXiv versions", async () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const outDir = resolve(tempDir, "out");
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>2</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Version 1</title>
    <summary>Test summary v1</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/1234.5678v1" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/1234.5678v1" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v2</id>
    <updated>2020-01-02T00:00:00Z</updated>
    <published>2020-01-02T00:00:00Z</published>
    <title>Version 2</title>
    <summary>Test summary v2</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/1234.5678v2" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/1234.5678v2" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/atom+xml");
        res.end(feed);
        return;
      }

      if (req.url?.startsWith("/pdf/")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/pdf");
        res.end(Buffer.from(MINIMAL_PDF, "utf8"));
        return;
      }

      res.statusCode = 404;
      res.end("not found");
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const result = await runCliAsync([
        "download",
        "1234.5678v1",
        "1234.5678v2",
        "--format",
        "md",
        "--out-dir",
        outDir,
        "--api-base-url",
        `${baseUrl}/api`,
        "--pdf-base-url",
        `${baseUrl}/pdf/`,
        "--json"
      ]);

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.data.results.map((item: { status: string }) => item.status)).toEqual([
        "downloaded",
        "downloaded"
      ]);
      expect(existsSync(resolve(outDir, "1234.5678v1.md"))).toBe(true);
      expect(existsSync(resolve(outDir, "1234.5678v2.md"))).toBe(true);
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
      });
    }
  }, 15000);

  it("normalizes URL-style IDs to stable markdown filenames", async () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "rsearch-"));
    const outDir = resolve(tempDir, "out");
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/1234.5678v1</id>
    <updated>2020-01-01T00:00:00Z</updated>
    <published>2020-01-01T00:00:00Z</published>
    <title>Version 1</title>
    <summary>Test summary v1</summary>
    <author><name>Alice</name></author>
    <link href="http://example.test/abs/1234.5678v1" rel="alternate" type="text/html" />
    <link title="pdf" href="http://example.test/pdf/1234.5678v1" type="application/pdf" />
    <arxiv:primary_category term="cs.AI" />
    <category term="cs.AI" />
  </entry>
</feed>`;

    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/atom+xml");
        res.end(feed);
        return;
      }

      if (req.url?.startsWith("/pdf/")) {
        res.statusCode = 200;
        res.setHeader("content-type", "application/pdf");
        res.end(Buffer.from(MINIMAL_PDF, "utf8"));
        return;
      }

      res.statusCode = 404;
      res.end("not found");
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const result = await runCliAsync([
        "download",
        "https://www.arxiv.org/abs/1234.5678v1/",
        "--format",
        "md",
        "--out-dir",
        outDir,
        "--api-base-url",
        `${baseUrl}/api`,
        "--pdf-base-url",
        `${baseUrl}/pdf/`,
        "--json"
      ]);

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.data.results[0]?.status).toBe("downloaded");
      expect(existsSync(resolve(outDir, "1234.5678v1.md"))).toBe(true);
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
      });
    }
  }, 15000);
});
