#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MARKDOWNLINT="./node_modules/.bin/markdownlint-cli2"
if [[ ! -x "$MARKDOWNLINT" ]]; then
	MARKDOWNLINT="markdownlint-cli2"
fi

if [[ -n "${CI_BASE_SHA:-}" && -n "${CI_HEAD_SHA:-}" ]]; then
	mapfile -d '' changed_markdown < <(
		git diff --name-only -z "$CI_BASE_SHA" "$CI_HEAD_SHA" -- '*.md'
	)

	if [[ ${#changed_markdown[@]} -eq 0 ]]; then
		echo "No changed markdown files detected for docs lint."
		exit 0
	fi

	exec "$MARKDOWNLINT" "${changed_markdown[@]}"
fi

exec "$MARKDOWNLINT" "**/*.md" "#node_modules" "#dist" "#artifacts"
