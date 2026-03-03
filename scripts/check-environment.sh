#!/usr/bin/env bash
# Strict local environment check for rsearch.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"

while [[ $# -gt 0 ]]; do
	case "$1" in
	--contract)
		CONTRACT_PATH="$REPO_ROOT/${2:-}"
		shift 2
		;;
	*)
		echo "Unknown argument: $1" >&2
		exit 1
		;;
	esac
done

cd "$REPO_ROOT"

echo "== rsearch environment check =="

if [[ ! -f "$REPO_ROOT/scripts/codex-preflight.sh" ]]; then
	echo "Error: scripts/codex-preflight.sh is missing." >&2
	exit 1
fi

# shellcheck source=/dev/null
source "$REPO_ROOT/scripts/codex-preflight.sh"
preflight_repo \
	rsearch \
	"git,bash,sed,rg,fd,jq,node,npm,python3" \
	"AGENTS.md,package.json,harness.contract.json,src,scripts,docs"

require_file() {
	local file_path="$1"
	if [[ ! -f "$file_path" ]]; then
		echo "Error: missing required file '$file_path'." >&2
		exit 1
	fi
}

required_files=(
	"memory.json"
	"scripts/validate-commit-msg.js"
	"scripts/setup-git-hooks.js"
	"scripts/check-environment.sh"
	"ai/diagrams/.gitkeep"
	"ai/context/diagram-context.md"
	".diagramrc"
	"prek.toml"
	".github/ISSUE_TEMPLATE/issue.yml"
	".github/ISSUE_TEMPLATE/feature.yml"
	".github/ISSUE_TEMPLATE/security.yml"
	".github/ISSUE_TEMPLATE/config.yml"
	"Makefile"
)

for required_file in "${required_files[@]}"; do
	require_file "$REPO_ROOT/$required_file"
done

echo "Validating memory.json schema..."
jq -e '
	.repo == "rsearch"
	and .meta.version == "1.0"
	and (.preamble.bootstrap | type == "boolean")
	and (.preamble.search | type == "boolean")
	and (.entries | type == "array")
' "$REPO_ROOT/memory.json" >/dev/null

echo "Validating simple-git-hooks config..."
jq -e '
	.["simple-git-hooks"]["pre-commit"] == "npm run lint:types && npm run typecheck"
	and .["simple-git-hooks"]["commit-msg"] == "node scripts/validate-commit-msg.js $1"
	and .["simple-git-hooks"]["pre-push"] == "npm run ci"
' "$REPO_ROOT/package.json" >/dev/null

echo "Validating diagram ignore policy..."
jq -e '
	.ignore | index("ai/diagrams") != null
' "$REPO_ROOT/.diagramrc" >/dev/null

echo "Checking harness CLI..."
npm exec -- harness --version >/dev/null

echo "Running harness preflight gate..."
npm exec -- harness preflight-gate --contract "$CONTRACT_PATH"

echo "Environment check passed!"
