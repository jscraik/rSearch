import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wrapper = fileURLToPath(
	new URL("../scripts/verify-work.sh", import.meta.url),
);
const relatedTests = fileURLToPath(
	new URL("../scripts/check-related-tests.sh", import.meta.url),
);

describe("verification cleanup", () => {
	for (const mode of ["--project-governance", "--workspace-governance"]) {
		for (const coverage of ["--all", "--changed-only"]) {
			for (const scenario of ["success", "failure", "retained"]) {
				it(`${mode} ${coverage} cleans only its temporary reports (${scenario})`, () => {
					const root = mkdtempSync(resolve(tmpdir(), "rsearch verify "));
					try {
						const scripts = resolve(root, "scripts");
						const governance = resolve(root, "docs/hooks-governance");
						const bin = resolve(root, "bin");
						const temporary = resolve(root, "temporary");
						for (const directory of [
							resolve(scripts, "hook-governance"),
							governance,
							bin,
							temporary,
						]) {
							mkdirSync(directory, { recursive: true });
						}
						copyFileSync(wrapper, resolve(scripts, "verify-work.sh"));
						copyFileSync(
							relatedTests,
							resolve(scripts, "check-related-tests.sh"),
						);
						writeFileSync(
							resolve(scripts, "codex-preflight.sh"),
							"#!/bin/bash\nexit 0\n",
						);
						writeFileSync(
							resolve(root, "package.json"),
							JSON.stringify({
								scripts: {
									"test:related": "bash scripts/check-related-tests.sh",
								},
							}),
						);
						writeFileSync(resolve(temporary, "caller-owned"), "preserve\n");
						for (const name of [
							"rollout_check.py",
							"evaluate_docstring_ratchet.py",
						]) {
							writeFileSync(
								resolve(scripts, "hook-governance", name),
								"import pathlib, sys\npathlib.Path(sys.argv[-1]).write_text('{}')\n",
							);
						}
						for (const name of [
							"repo-profile-matrix.json",
							"public-api-classification.json",
							"docstring-ratchet-metrics.json",
						]) {
							writeFileSync(resolve(governance, name), "{}\n");
						}
						writeFileSync(
							resolve(governance, "repo-scope.manifest.json"),
							JSON.stringify({
								repos: [
									{
										name: "fixture",
										root: ".",
										inventory: "docs/hooks-governance/repo-profile-matrix.json",
										classification:
											"docs/hooks-governance/public-api-classification.json",
										metrics:
											"docs/hooks-governance/docstring-ratchet-metrics.json",
									},
								],
							}),
						);
						const calls = resolve(root, "npm-calls");
						writeFileSync(resolve(bin, "pnpm"), "#!/bin/bash\nexit 97\n", {
							mode: 0o755,
						});
						writeFileSync(
							resolve(bin, "git"),
							"#!/bin/bash\nprintf '%s\\n' 'src/module with spaces.ts' 'src/types.d.ts' 'src/ignored.test.ts' 'docs/guide.md'\n",
							{ mode: 0o755 },
						);
						writeFileSync(
							resolve(bin, "npm"),
							`#!/bin/bash
printf '%s\\n' "$*" >> "$VERIFY_CALLS"
if [[ "$1" == run && "$2" == test:related ]]; then
  exec bash scripts/check-related-tests.sh
fi
if [[ "$1" == exec ]]; then
  [[ "$#" == 7 && "$7" == 'src/module with spaces.ts' ]] || exit 98
fi
exit ${scenario === "failure" ? 23 : 0}
`,
							{ mode: 0o755 },
						);
						const result = spawnSync(
							"bash",
							[resolve(scripts, "verify-work.sh"), "--fast", coverage, mode],
							{
								cwd: root,
								encoding: "utf8",
								timeout: 10000,
								env: {
									...process.env,
									PATH: `${bin}:${process.env.PATH}`,
									TMPDIR: temporary,
									KEEP_ARTIFACTS: scenario === "retained" ? "1" : "",
									VERIFY_CALLS: calls,
								},
							},
						);
						expect(result.error).toBeUndefined();
						expect(result.status, result.stderr).toBe(
							scenario === "failure" ? 23 : 0,
						);
						expect(result.stderr).not.toContain("unbound variable");
						const testCalls =
							coverage === "--all"
								? ["test"]
								: [
										"run test:related",
										"exec -- vitest related --run --passWithNoTests src/module with spaces.ts",
									];
						expect(readFileSync(calls, "utf8").trim().split("\n")).toEqual(
							scenario === "failure"
								? ["run lint"]
								: ["run lint", "run typecheck", ...testCalls],
						);
						const remaining = readdirSync(temporary);
						expect(remaining).toContain("caller-owned");
						expect(remaining).toHaveLength(scenario === "retained" ? 2 : 1);
					} finally {
						rmSync(root, { recursive: true, force: true });
					}
				});
			}
		}
	}
});
