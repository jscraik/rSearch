/** Verify real published consumer behavior; this is not review clearance. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [major, minor] = process.versions.node.split(".").map(Number);
assert(
	major > 26 || (major === 26 && minor >= 3),
	"Published harness 0.15.3 requires Node >=26.3.0",
);
const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "rsearch-harness-consumer-"));
const integrity =
	"G3KGxVdEmieYzyQa0ANj9XoKHBaEIaZ5+Bu8rn+W4WVYcmYBYk2Ued9hm9L/R53EQ/npFfHa3hvYwzCyvCuXJA==";
try {
	const archive = join(scratch, "harness.tgz");
	execFileSync(
		"curl",
		[
			"--fail",
			"--silent",
			"--show-error",
			"--max-time",
			"60",
			"--max-filesize",
			"33554432",
			"--output",
			archive,
			"https://registry.npmjs.org/@brainwav/coding-harness/-/coding-harness-0.15.3.tgz",
		],
		{ timeout: 65000 },
	);
	const archiveBytes = readFileSync(archive);
	assert(archiveBytes.length <= 33554432, "Oversized published archive");
	assert.equal(
		createHash("sha512").update(archiveBytes).digest("base64"),
		integrity,
		"Published archive integrity changed",
	);
	// The exact verified public release is trusted before extraction/import.
	execFileSync(
		"tar",
		["-xzf", archive, "-C", scratch, "package/dist", "package/package.json"],
		{ timeout: 30000 },
	);
	const load = (path) =>
		import(pathToFileURL(join(scratch, "package/dist", path)).href);
	const { createCIProviderAdapter } = await load("lib/ci/provider-adapter.js");
	const {
		resolveDefaultReviewCheckName,
		resolveReviewCheckResult,
		resolveRequiredCheckSources,
	} = await load("lib/review-gate/required-checks.js");
	const { matchesExpectedSource } = await load(
		"lib/review-gate/required-check-sources.js",
	);
	const manifest = JSON.parse(
		readFileSync(join(root, ".harness/ci-required-checks.json"), "utf8"),
	);
	const contractPath = join(root, "harness.contract.json");
	const contract = JSON.parse(readFileSync(contractPath, "utf8"));
	const adapter = createCIProviderAdapter("github-actions");
	const actual = adapter.readRequiredChecks(root);
	assert.equal(actual.ok, true, actual.error);
	assert.equal(actual.value.length, manifest.requiredChecks.length);
	const requested = resolveDefaultReviewCheckName(contract, contractPath);
	assert.equal(requested, "pr-pipeline");
	const head = "a".repeat(40);
	const primary = {
		id: 10,
		name: "pr-pipeline",
		head_sha: head,
		status: "completed",
		conclusion: "failure",
	};
	const fallback = {
		id: 20,
		name: "risk-policy-gate",
		head_sha: head,
		status: "completed",
		conclusion: "success",
	};
	const both = resolveReviewCheckResult([primary, fallback], requested, head);
	assert.equal(both.resolvedCheckName, "pr-pipeline");
	assert.equal(both.checkResult.conclusion, "failure");
	const onlyFallback = resolveReviewCheckResult([fallback], requested, head);
	assert.equal(onlyFallback.resolvedCheckName, "risk-policy-gate");
	assert.equal(onlyFallback.checkResult.conclusion, "success");
	const sources = resolveRequiredCheckSources(contract, contractPath, [
		"security-scan",
		"CodeRabbit",
	]);
	for (const [name, slug, id] of [
		["CodeRabbit", "coderabbitai", 347564],
		["security-scan", "github-actions", 15368],
	]) {
		assert(sources.has(name));
		assert(matchesExpectedSource({ app: { slug, id } }, sources.get(name)));
		assert(
			!matchesExpectedSource(
				{ app: { slug: "other-app", id: 1 } },
				sources.get(name),
			),
		);
	}
	for (const kind of ["wrong-type", "missing"]) {
		const fixture = join(scratch, kind);
		mkdirSync(join(fixture, ".harness"), { recursive: true });
		const changed = structuredClone(manifest);
		if (kind === "wrong-type") changed.requiredChecks[0].githubCheckName = 1;
		else delete changed.requiredChecks[0].githubCheckName;
		writeFileSync(
			join(fixture, ".harness/ci-required-checks.json"),
			JSON.stringify(changed),
		);
		assert.equal(adapter.readRequiredChecks(fixture).ok, false, kind);
	}
	console.log(
		JSON.stringify({
			package: "@brainwav/coding-harness@0.15.3",
			integrity_verified: true,
			manifest_entries: actual.value.length,
			requested_check: requested,
			failing_primary_preserved: both.checkResult.conclusion === "failure",
			fallback_when_primary_absent: onlyFallback.resolvedCheckName,
			wrong_source_rejected: true,
			malformed_mapping_rejected: true,
			review_clearance: false,
		}),
	);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
