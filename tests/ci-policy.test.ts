import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = {
	uses?: string;
	run?: string;
	if?: string;
	env?: Record<string, string>;
	with?: Record<string, unknown>;
	"continue-on-error"?: boolean;
};
type Job = { name?: string; steps: Step[]; "continue-on-error"?: boolean };
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };
type Check = {
	displayName: string;
	githubCheckName: string;
	sourceAppSlug: string;
	sourceAppId: string;
	externalIdPattern: string;
	requiredOnEvents: string[];
};
type Manifest = { activeProvider: string; requiredChecks: Check[] };
type Contract = {
	ciProviderPolicy: { primaryCheckName: string };
	branchProtection: { requiredChecks: string[] };
	reviewPolicy: { requiredChecks: string[] };
};

function inputs() {
	const manifest: Manifest = JSON.parse(
		readFileSync(".harness/ci-required-checks.json", "utf8"),
	);
	const contract: Contract = JSON.parse(
		readFileSync("harness.contract.json", "utf8"),
	);
	const workflows: Workflow[] = readdirSync(".github/workflows")
		.filter((path) => /\.ya?ml$/.test(path))
		.map(
			(path) =>
				parse(readFileSync(`.github/workflows/${path}`, "utf8")) as Workflow,
		);
	return { manifest, contract, workflows };
}

function verify({ manifest, contract, workflows }: ReturnType<typeof inputs>) {
	assert.equal(manifest.activeProvider, "github-actions");
	assert.equal(
		contract.ciProviderPolicy.primaryCheckName,
		"pr-pipeline",
		"Preserve the legacy review-check failure/fallback order",
	);
	const names = manifest.requiredChecks.map((check) => check.displayName);
	assert.equal(new Set(names).size, names.length, "Duplicate required check");
	assert.deepEqual(
		[...names].sort(),
		[...contract.branchProtection.requiredChecks].sort(),
		"Contract and manifest disagree",
	);
	for (const name of contract.reviewPolicy.requiredChecks)
		assert(names.includes(name), `Unmapped review control: ${name}`);
	for (const check of manifest.requiredChecks) {
		assert.equal(check.githubCheckName, check.displayName);
		assert.equal(check.externalIdPattern, `^${check.displayName}$`);
		if (check.displayName === "CodeRabbit") {
			assert.equal(check.sourceAppSlug, "coderabbitai");
			assert.equal(check.sourceAppId, "347564");
			continue;
		}
		assert.equal(check.sourceAppSlug, "github-actions");
		assert.equal(check.sourceAppId, "15368");
		for (const event of check.requiredOnEvents) {
			const matching = workflows.flatMap((workflow) =>
				Object.hasOwn(workflow.on ?? {}, event)
					? Object.entries(workflow.jobs)
							.filter(([id, job]) => (job.name ?? id) === check.displayName)
							.map(([, job]) => job)
					: [],
			);
			assert(matching.length > 0, `No ${event} job emits ${check.displayName}`);
			assert(
				matching.every(
					(job) =>
						!job["continue-on-error"] &&
						job.steps.every((step) => !step["continue-on-error"]),
				),
				`Soft-failing required job: ${check.displayName}`,
			);
		}
	}
}

describe("required CI policy", () => {
	it("maps each declared check to the correct provider and a real job", () =>
		verify(inputs()));

	it("rejects removed jobs, changed provider identities and divergent contracts", () => {
		for (const mutation of ["missing", "identity", "contract"]) {
			const data = inputs();
			if (mutation === "missing")
				for (const workflow of data.workflows)
					delete workflow.jobs["security-scan"];
			if (mutation === "identity")
				data.manifest.requiredChecks.find(
					(check) => check.displayName === "CodeRabbit",
				)!.sourceAppId = "15368";
			if (mutation === "contract")
				data.contract.branchProtection.requiredChecks.push("missing-control");
			expect(() => verify(data)).toThrow();
		}
	});

	it("runs real dependency and security controls without success fallbacks", () => {
		const pipeline = parse(
			readFileSync(".github/workflows/pr-pipeline.yml", "utf8"),
		) as Workflow;
		const dependencies = pipeline.jobs["dependency-review"].steps;
		expect(
			dependencies.some(
				(step) =>
					step.uses?.startsWith("actions/dependency-review-action@") &&
					step.if === "github.event_name == 'pull_request'" &&
					step.with?.["fail-on-severity"] === "high",
			),
		).toBe(true);
		expect(
			dependencies.some((step) => step.run === "npm ci && npm run audit"),
		).toBe(true);
		expect(
			dependencies.some((step) =>
				/unsupported|no-op|skipping/i.test(step.run ?? ""),
			),
		).toBe(false);
		const security = pipeline.jobs["security-scan"].steps;
		const installer = security.findIndex((step) =>
			step.uses?.startsWith("aquasecurity/setup-trivy@"),
		);
		const checkout = security.findIndex((step) =>
			step.uses?.startsWith("actions/checkout@"),
		);
		expect(installer).toBeGreaterThanOrEqual(0);
		expect(installer).toBeLessThan(checkout);
		expect(security.some((step) => step.run === "npm run audit")).toBe(true);
		expect(
			security.some(
				(step) =>
					step.run?.includes(
						'"$scan_dir/gitleaks" git --redact --exit-code 1',
					) &&
					step.env?.SCAN_BASE?.includes("merge_group.base_sha") &&
					step.env?.SCAN_HEAD?.includes("merge_group.head_sha") &&
					!step.if,
			),
		).toBe(true);
		expect(
			security.some(
				(step) =>
					step.run ===
					"trivy fs --severity HIGH,CRITICAL --exit-code 1 --no-progress .",
			),
		).toBe(true);
		expect(
			security.some(
				(step) =>
					/semgrep\/semgrep@sha256:[0-9a-f]{64}/.test(step.run ?? "") &&
					step.run?.includes(
						"semgrep scan --config p/security-audit --error --metrics off --disable-version-check .",
					) &&
					step.run.includes('"$PWD:/src:ro"'),
			),
		).toBe(true);
		expect(
			pipeline.jobs["docs-gate"].steps.some(
				(step) =>
					step.run?.includes("npm run docs:lint") &&
					step.env?.CI_BASE_SHA &&
					step.env?.CI_HEAD_SHA,
			),
		).toBe(true);
	});

	it.each([
		"pull_request",
		"merge_group",
	])("rejects an unverified secret scanner before execution for %s", (event) => {
		const pipeline = parse(
			readFileSync(".github/workflows/pr-pipeline.yml", "utf8"),
		) as Workflow;
		const step = pipeline.jobs["security-scan"].steps.find((item) =>
			item.run?.includes('"$scan_dir/gitleaks" git'),
		);
		assert(step?.run);
		const root = mkdtempSync(join(tmpdir(), "rsearch-secret-scanner-"));
		try {
			mkdirSync(join(root, "bin"));
			writeFileSync(join(root, "bin/curl"), "#!/bin/sh\nexit 0\n", {
				mode: 0o755,
			});
			writeFileSync(
				join(root, "bin/sha256sum"),
				"#!/bin/sh\ncat >/dev/null\nexit 1\n",
				{ mode: 0o755 },
			);
			writeFileSync(
				join(root, "bin/tar"),
				"#!/bin/sh\ntouch SHOULD_NOT_EXTRACT\nexit 0\n",
				{ mode: 0o755 },
			);
			const result = spawnSync("/bin/bash", ["-c", step.run], {
				cwd: root,
				encoding: "utf8",
				timeout: 5000,
				env: {
					PATH: `${root}/bin:/usr/bin:/bin`,
					TMPDIR: root,
					GITHUB_EVENT_NAME: event,
					SCAN_BASE: "a".repeat(40),
					SCAN_HEAD: "b".repeat(40),
				},
			});
			expect(result.status, result.stderr).toBe(1);
			expect(existsSync(join(root, "SHOULD_NOT_EXTRACT"))).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
