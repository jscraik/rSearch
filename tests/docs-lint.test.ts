import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function fixture(paths: string[], gitStatus = 0) {
  const root = mkdtempSync(join(tmpdir(), "rsearch-docs-lint-"));
  fixtures.push(root);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "bin"));
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  copyFileSync("scripts/docs-lint.sh", join(root, "scripts/docs-lint.sh"));
  writeFileSync(join(root, "paths"), paths.length ? `${paths.join("\0")}\0` : "");
  writeFileSync(join(root, "bin/git"), `#!/bin/sh\ncat paths\nexit ${gitStatus}\n`, { mode: 0o755 });
  writeFileSync(join(root, "node_modules/.bin/markdownlint-cli2"), '#!/bin/sh\nprintf "%s\\0" "$@" > linted\n', { mode: 0o755 });
  return root;
}

describe("docs lint shell entrypoint", () => {
  for (const mode of ["staged", "range"]) {
    it(`preserves spaces and newlines in ${mode} paths and excludes diagrams`, () => {
      const root = fixture(["guide with spaces.md", "guide\ncontinued.md", ".diagram/generated.md"]);
      const result = spawnSync("/bin/bash", ["scripts/docs-lint.sh"], {
        cwd: root,
        env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, DOCS_LINT_SCOPE: mode,
          CI_BASE_SHA: mode === "range" ? "base" : "", CI_HEAD_SHA: mode === "range" ? "head" : "" },
        encoding: "utf8"
      });
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, "linted"), "utf8")).toBe("guide with spaces.md\0guide\ncontinued.md\0");
    });
  }

  it("succeeds for an empty staged diff", () => {
    const root = fixture([]);
    const result = spawnSync("/bin/bash", ["scripts/docs-lint.sh"], {
      cwd: root, env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, DOCS_LINT_SCOPE: "staged", CI_BASE_SHA: "", CI_HEAD_SHA: "" }, encoding: "utf8"
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("No staged markdown files");
  });

  it("fails when Git cannot resolve the requested diff", () => {
    const root = fixture([], 1);
    const result = spawnSync("/bin/bash", ["scripts/docs-lint.sh"], {
      cwd: root, env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, CI_BASE_SHA: "missing", CI_HEAD_SHA: "head" }, encoding: "utf8"
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unable to resolve docs lint diff range");
  });
});
