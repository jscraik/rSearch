#!/usr/bin/env node
/**
 * Configure simple-git-hooks for rsearch (npm-based workflow).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const PACKAGE_JSON_PATH = resolve(process.cwd(), "package.json");
const REQUIRED_HOOKS = {
	"pre-commit": "npm run lint:types && npm run typecheck",
	"commit-msg": "node scripts/validate-commit-msg.js $1",
	"pre-push": "npm run ci",
};

function main() {
	if (!existsSync(PACKAGE_JSON_PATH)) {
		console.error("Error: package.json not found in current directory");
		process.exit(1);
	}

	let packageJson = {};
	try {
		packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8"));
	} catch {
		console.error("Error: Failed to parse package.json");
		process.exit(1);
	}

	let modified = false;

	if (!packageJson.devDependencies || typeof packageJson.devDependencies !== "object") {
		packageJson.devDependencies = {};
	}
	const deps = packageJson.devDependencies;
	if (!deps["simple-git-hooks"]) {
		deps["simple-git-hooks"] = "^2.13.1";
		console.info("✓ Added simple-git-hooks to devDependencies");
		modified = true;
	}

	if (!packageJson.scripts || typeof packageJson.scripts !== "object") {
		packageJson.scripts = {};
	}
	const scripts = packageJson.scripts;
	if (!scripts.postinstall) {
		scripts.postinstall = "simple-git-hooks";
		console.info("✓ Added postinstall script");
		modified = true;
	} else if (!scripts.postinstall.includes("simple-git-hooks")) {
		scripts.postinstall = `simple-git-hooks && ${scripts.postinstall}`;
		console.info("✓ Prepended simple-git-hooks to postinstall");
		modified = true;
	}

	if (!packageJson["simple-git-hooks"] || typeof packageJson["simple-git-hooks"] !== "object") {
		packageJson["simple-git-hooks"] = {};
		modified = true;
	}
	const hooks = packageJson["simple-git-hooks"];
	for (const [hookName, hookCommand] of Object.entries(REQUIRED_HOOKS)) {
		if (hooks[hookName] !== hookCommand) {
			hooks[hookName] = hookCommand;
			console.info(`✓ Set ${hookName} hook`);
			modified = true;
		}
	}

	if (modified) {
		writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + "\n");
		console.info("\n✓ package.json updated");
	}

	console.info("\nInstalling dependencies to activate hooks...");
	try {
		execFileSync("npm", ["install"], { stdio: "inherit" });
		console.info("\n✓ Git hooks installed and active!");
		console.info("  • pre-commit: npm run lint:types && npm run typecheck");
		console.info("  • commit-msg: node scripts/validate-commit-msg.js $1");
		console.info("  • pre-push: npm run ci");
	} catch {
		console.error("\n⚠️  Failed to run npm install. Run it manually to activate hooks.");
		process.exit(1);
	}
}

main();
