#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"

changed_only=1
fast_mode=0
strict_mode=0
repo_root=""
governance_mode="project-local"

usage() {
	cat <<'USAGE'
Usage: scripts/verify-work.sh [options]

Canonical repo-local verification runner.

Options:
  --all              Run full test coverage in --fast mode
  --changed-only     Prefer changed-file validation in --fast mode (default)
  --project-governance
                     Run governance checks in project-local mode (default)
  --workspace-governance
                     Run cross-repo governance checks from docs/hooks-governance/repo-scope.manifest.json
  --strict           Fail when fast-mode fallbacks are needed
  --fast             Run preflight + lint + typecheck + tests instead of the full check bundle
  --repo-root PATH   Run checks in a specific repository root
  -h, --help         Show this help text
USAGE
}

detect_stack() {
	if [[ -f package.json ]]; then
		echo js
		return
	fi
	if [[ -f pyproject.toml ]]; then
		echo py
		return
	fi
	if [[ -f Cargo.toml ]]; then
		echo rust
		return
	fi
	echo repo
}

preflight_bins_csv() {
	case "$1" in
		js) echo 'git,bash,sed,rg,jq,curl,node,python3,pnpm' ;;
		py) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		rust) echo 'git,bash,sed,rg,jq,curl,python3,cargo' ;;
		repo) echo 'git,bash,sed,rg,jq,curl,python3' ;;
		*) echo "[verify-work] unknown stack: $1" >&2; return 2 ;;
	esac
}

preflight_paths_csv() {
	case "$1" in
		js) echo 'package.json,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		py) echo 'pyproject.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		rust) echo 'Cargo.toml,CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		repo) echo 'CONTRIBUTING.md,Makefile,scripts,scripts/codex-preflight.sh,scripts/verify-work.sh' ;;
		*) echo "[verify-work] unknown stack: $1" >&2; return 2 ;;
	esac
}

has_package_script() {
	local script_name="$1"
	[[ -f "$repo_root/package.json" ]] || return 1
	jq -e --arg script_name "$script_name" '(.scripts // {}) | has($script_name)' "$repo_root/package.json" >/dev/null 2>&1
}

resolve_path() {
	local base_dir="$1"
	local value="$2"
	if [[ "$value" = /* ]]; then
		printf '%s\n' "$value"
	else
		printf '%s/%s\n' "$base_dir" "$value"
	fi
}

run_project_governance() {
	local governance_dir="$repo_root/docs/hooks-governance"
	local rollout_script="$repo_root/scripts/hook-governance/rollout_check.py"
	local docstring_script="$repo_root/scripts/hook-governance/evaluate_docstring_ratchet.py"
	local inventory="$governance_dir/repo-profile-matrix.json"
	local classification="$governance_dir/public-api-classification.json"
	local metrics="$governance_dir/docstring-ratchet-metrics.json"
	local tmp_dir=""
	local rollout_out=""
	local docstring_out=""

	if [[ ! -f "$rollout_script" || ! -f "$docstring_script" ]]; then
		echo "[verify-work] missing hook-governance scripts under scripts/hook-governance/" >&2
		exit 1
	fi

	if [[ ! -f "$inventory" || ! -f "$classification" || ! -f "$metrics" ]]; then
		echo "[verify-work] missing required project-local governance inputs in docs/hooks-governance/" >&2
		exit 1
	fi

	tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/verify-work-governance.XXXXXX")"
	rollout_out="$tmp_dir/rollout-check-report.json"
	docstring_out="$tmp_dir/docstring-ratchet-report.json"

	echo
	echo "==> governance (project-local)"
	python3 "$rollout_script" \
		--inventory "$inventory" \
		--recovery-slo-hours 24 \
		--out "$rollout_out"
	python3 "$docstring_script" \
		--classification "$classification" \
		--metrics "$metrics" \
		--window-days 14 \
		--out "$docstring_out"

	echo "[verify-work] project-local governance artifacts:"
	echo "  - $rollout_out"
	echo "  - $docstring_out"
}

run_workspace_governance() {
	local governance_dir="$repo_root/docs/hooks-governance"
	local rollout_script="$repo_root/scripts/hook-governance/rollout_check.py"
	local docstring_script="$repo_root/scripts/hook-governance/evaluate_docstring_ratchet.py"
	local manifest="$governance_dir/repo-scope.manifest.json"
	local tmp_dir=""
	local repo_count=""
	local idx=""

	if [[ ! -f "$rollout_script" || ! -f "$docstring_script" ]]; then
		echo "[verify-work] missing hook-governance scripts under scripts/hook-governance/" >&2
		exit 1
	fi

	if [[ ! -f "$manifest" ]]; then
		echo "[verify-work] missing workspace governance manifest: $manifest" >&2
		exit 1
	fi

	repo_count="$(jq -r '.repos | length' "$manifest")"
	if [[ "$repo_count" -eq 0 ]]; then
		echo "[verify-work] workspace governance manifest has no repos: $manifest" >&2
		exit 1
	fi

	tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/verify-work-workspace-governance.XXXXXX")"

	echo
	echo "==> governance (workspace)"
	for ((idx = 0; idx < repo_count; idx++)); do
		local name root inventory classification metrics repo_root_abs
		local inventory_abs classification_abs metrics_abs
		local safe_name rollout_out docstring_out

		name="$(jq -r ".repos[$idx].name // \"repo-$idx\"" "$manifest")"
		root="$(jq -r ".repos[$idx].root // \".\"" "$manifest")"
		inventory="$(jq -r ".repos[$idx].inventory // empty" "$manifest")"
		classification="$(jq -r ".repos[$idx].classification // empty" "$manifest")"
		metrics="$(jq -r ".repos[$idx].metrics // empty" "$manifest")"

		if [[ -z "$inventory" || -z "$classification" || -z "$metrics" ]]; then
			echo "[verify-work] repo entry '$name' is missing inventory/classification/metrics in $manifest" >&2
			exit 1
		fi

		repo_root_abs="$(resolve_path "$repo_root" "$root")"
		inventory_abs="$(resolve_path "$repo_root_abs" "$inventory")"
		classification_abs="$(resolve_path "$repo_root_abs" "$classification")"
		metrics_abs="$(resolve_path "$repo_root_abs" "$metrics")"

		if [[ ! -f "$inventory_abs" || ! -f "$classification_abs" || ! -f "$metrics_abs" ]]; then
			echo "[verify-work] repo entry '$name' has missing files:" >&2
			echo "  inventory: $inventory_abs" >&2
			echo "  classification: $classification_abs" >&2
			echo "  metrics: $metrics_abs" >&2
			exit 1
		fi

		safe_name="$(printf '%s' "$name" | tr -cs 'A-Za-z0-9._-' '_')"
		rollout_out="$tmp_dir/${safe_name}-rollout-check-report.json"
		docstring_out="$tmp_dir/${safe_name}-docstring-ratchet-report.json"

		python3 "$rollout_script" \
			--inventory "$inventory_abs" \
			--recovery-slo-hours 24 \
			--out "$rollout_out"
		python3 "$docstring_script" \
			--classification "$classification_abs" \
			--metrics "$metrics_abs" \
			--window-days 14 \
			--out "$docstring_out"
	done

	echo "[verify-work] workspace governance artifacts directory: $tmp_dir"
}

while (( $# > 0 )); do
	case "$1" in
		--all|--all-skills)
			changed_only=0
			shift
			;;
		--changed-only)
			changed_only=1
			shift
			;;
		--project-governance)
			governance_mode="project-local"
			shift
			;;
		--workspace-governance)
			governance_mode="workspace"
			shift
			;;
		--strict)
			strict_mode=1
			shift
			;;
		--fast)
			fast_mode=1
			shift
			;;
		--repo-root)
			repo_root="${2:-}"
			shift 2
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "[verify-work] unknown argument: $1" >&2
			usage >&2
			exit 2
			;;
	esac
done

if [[ -z "$repo_root" ]]; then
	repo_root="$REPO_ROOT"
fi

cd "$repo_root"
echo "[verify-work] repo root: $repo_root"

stack="$(detect_stack)"
bins_csv="$(preflight_bins_csv "$stack")"
paths_csv="$(preflight_paths_csv "$stack")"

echo
echo "==> codex-preflight"
bash "$repo_root/scripts/codex-preflight.sh" \
	--stack "$stack" \
	--mode required \
	--bins "$bins_csv" \
	--paths "$paths_csv"

case "$governance_mode" in
	project-local)
		run_project_governance
		;;
	workspace)
		run_workspace_governance
		;;
	*)
		echo "[verify-work] unsupported governance mode: $governance_mode" >&2
		exit 2
		;;
esac

if [[ "$fast_mode" -eq 0 ]]; then
	echo
	echo "==> check"
	pnpm check
	exit 0
fi

echo
echo "==> lint"
pnpm lint

echo
echo "==> typecheck"
pnpm typecheck

if [[ "$changed_only" -eq 1 ]]; then
	if has_package_script "test:related"; then
		echo
		echo "==> test:related"
		pnpm test:related
	else
		if [[ "$strict_mode" -eq 1 ]]; then
			echo "[verify-work] missing package script: test:related" >&2
			exit 1
		fi
		echo "[verify-work] test:related unavailable; falling back to full test run"
		echo
		echo "==> test"
		pnpm test
	fi
else
	echo
	echo "==> test"
	pnpm test
fi
