#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MARKDOWNLINT="./node_modules/.bin/markdownlint-cli2"
if [[ ! -x "$MARKDOWNLINT" ]]; then
	MARKDOWNLINT="markdownlint-cli2"
fi

lint_changed_markdown() {
	local message="$1"
	shift
	local changed_markdown=()

	for path in "$@"; do
		case "$path" in
			.diagram/*)
				continue
				;;
		esac
		changed_markdown+=("$path")
	done

	if [[ ${#changed_markdown[@]} -eq 0 ]]; then
		echo "$message"
		exit 0
	fi

	exec "$MARKDOWNLINT" "${changed_markdown[@]}"
}

if [[ -n "${CI_BASE_SHA:-}" && -n "${CI_HEAD_SHA:-}" ]]; then
	changed_file_list="$(mktemp)"
	trap 'rm -f "$changed_file_list"' EXIT
	if ! diff_base="$(git merge-base "$CI_BASE_SHA" "$CI_HEAD_SHA")"; then
		echo "Unable to resolve docs lint merge base: $CI_BASE_SHA...$CI_HEAD_SHA" >&2
		exit 1
	fi
	if ! git diff --name-only -z --diff-filter=ACMR "$diff_base" "$CI_HEAD_SHA" -- '*.md' >"$changed_file_list"; then
		echo "Unable to resolve docs lint diff range: $CI_BASE_SHA..$CI_HEAD_SHA" >&2
		exit 1
	fi
	mapfile -d '' changed_markdown <"$changed_file_list"
	lint_changed_markdown "No changed markdown files detected for docs lint." "${changed_markdown[@]}"
fi

if [[ "${DOCS_LINT_SCOPE:-all}" == "staged" ]]; then
	changed_file_list="$(mktemp)"
	trap 'rm -f "$changed_file_list"' EXIT
	if ! git diff --cached --name-only -z --diff-filter=ACMR -- '*.md' >"$changed_file_list"; then
		echo "Unable to resolve staged docs lint diff." >&2
		exit 1
	fi
	mapfile -d '' changed_markdown <"$changed_file_list"
	lint_changed_markdown "No staged markdown files detected for docs lint." "${changed_markdown[@]}"
fi

exec "$MARKDOWNLINT" "**/*.md" "#node_modules" "#dist" "#artifacts" "#.diagram"
