#!/usr/bin/env node
/**
 * Commit message validation hook for rsearch.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const COMMIT_MSG_FILE = process.argv[2];
const CONVENTIONAL_COMMIT_REGEX =
	/^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?!?:\s.+/;
const CO_AUTHOR_REGEX = /Co-authored-by:\s*.+/i;
const CODEX_TRAILER_REGEX = /Co-authored-by:\s*Codex <noreply@openai\.com>/i;

function main() {
	if (!COMMIT_MSG_FILE) {
		console.error("Usage: validate-commit-msg.js <commit-msg-file>");
		process.exit(1);
	}

	let commitMsg = "";
	try {
		commitMsg = readFileSync(COMMIT_MSG_FILE, "utf-8");
	} catch (error) {
		console.error(`Failed to read commit message file: ${error.message}`);
		process.exit(1);
	}

	const errors = [];
	const warnings = [];
	const lines = commitMsg.split("\n").filter((line) => !line.startsWith("#"));
	const subjectIndex = lines.findIndex((line) => line.trim() !== "");
	const firstLine = subjectIndex >= 0 ? lines[subjectIndex].trim() : "";

	if (!CONVENTIONAL_COMMIT_REGEX.test(firstLine)) {
		errors.push(
			"First line must follow conventional commit format: type(scope)!: description",
		);
	}

	if (firstLine.length > 72) {
		errors.push(`First line exceeds 72 characters (${firstLine.length} chars)`);
	}

	const bodyStartIndex = subjectIndex >= 0 ? subjectIndex + 1 : -1;
	if (bodyStartIndex >= 0 && lines.length > bodyStartIndex && lines[bodyStartIndex].trim() !== "") {
		warnings.push(
			"Body should be separated from subject by a blank line for readability",
		);
	}

	const branchName = getBranchName();
	const isAgentBranch = /codex|claude|agent/i.test(branchName);
	const hasCoAuthor = CO_AUTHOR_REGEX.test(commitMsg);
	const codexTrailerCount = (commitMsg.match(new RegExp(CODEX_TRAILER_REGEX, "gi")) || []).length;

	if (isAgentBranch && !hasCoAuthor) {
		warnings.push(
			"AI-assisted commit detected. Add: Co-authored-by: Codex <noreply@openai.com>",
		);
	}

	if (isAgentBranch && hasCoAuthor && !CODEX_TRAILER_REGEX.test(commitMsg)) {
		warnings.push(
			"Codex branch detected. Expected trailer: Co-authored-by: Codex <noreply@openai.com>",
		);
	}

	if (codexTrailerCount > 1) {
		warnings.push(
			"Codex trailer appears multiple times. Keep exactly one trailer at the end.",
		);
	}

	if (errors.length > 0) {
		console.error("\n❌ Commit message validation failed:\n");
		for (const error of errors) {
			console.error(`  ✗ ${error}`);
		}
		console.error(
			"\nExample:\n  feat(cli): improve arxiv query parsing\n\n  Explain what changed and why.\n\n  Co-authored-by: Codex <noreply@openai.com>",
		);
		process.exit(1);
	}

	if (warnings.length > 0) {
		console.info("\n⚠️  Commit message warnings:\n");
		for (const warning of warnings) {
			console.info(`  • ${warning}`);
		}
		console.info("");
	}
}

function getBranchName() {
	try {
		const output = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return output.trim();
	} catch {
		return "";
	}
}

main();
