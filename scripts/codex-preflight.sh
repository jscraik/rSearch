#!/usr/bin/env bash
set -euo pipefail

preflight_repo() {
  local expected_repo="${1:-}"
  local bins_csv="${2:-git,bash,sed,rg}"
  local paths_csv="${3:-AGENTS.md,docs,docs/plans}"

  echo "== Codex Preflight =="
  echo "pwd: $(pwd)"

  if ! command -v git >/dev/null 2>&1; then
    echo "❌ missing binary: git" >&2
    return 2
  fi

  local root
  if ! root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    echo "❌ not inside a git repo (git rev-parse failed)" >&2
    return 2
  fi

  if [[ -z "${root}" ]]; then
    echo "❌ git rev-parse returned empty root" >&2
    return 2
  fi

  root="$(cd "${root}" && pwd -P)"
  local workspace_root
  workspace_root="$(cd "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
  echo "repo root: ${root}"

  if [[ "${root}" != "${workspace_root}" ]]; then
    echo "❌ script workspace mismatch: expected ${workspace_root}" >&2
    return 2
  fi

  if [[ -n "${expected_repo}" ]] && [[ "${root}" != *"${expected_repo}"* ]]; then
    echo "❌ repo mismatch: expected fragment '${expected_repo}' in '${root}'" >&2
    return 2
  fi

  cd "${root}"

  local -a bins=()
  local -a missing_bins=()
  IFS=',' read -r -a bins <<< "${bins_csv}"
  local b
  for b in "${bins[@]}"; do
    [[ -z "${b}" ]] && continue
    if ! command -v "${b}" >/dev/null 2>&1; then
      missing_bins+=("${b}")
    fi
  done

  if (( ${#missing_bins[@]} > 0 )); then
    echo "❌ missing binaries: ${missing_bins[*]}" >&2
    return 2
  fi
  echo "✅ binaries ok: ${bins_csv}"

  local -a paths=()
  IFS=',' read -r -a paths <<< "${paths_csv}"
  local p
  for p in "${paths[@]}"; do
    [[ -z "${p}" ]] && continue

    local -a matches=()
    shopt -s nullglob
    for match in ${p}; do
      matches+=("${match}")
    done
    shopt -u nullglob

    if (( ${#matches[@]} == 0 )); then
      matches+=("${p}")
    fi

    local found=0
    local match abs
    for match in "${matches[@]}"; do
      if [[ -e "${match}" ]]; then
        found=1
        if ! abs="$(python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "${match}")"; then
          echo "❌ failed to resolve path: ${match}" >&2
          return 2
        fi
        if [[ "${abs}" != "${root}" && "${abs}" != "${root}"/* ]]; then
          echo "❌ path escapes repo root: ${match} -> ${abs}" >&2
          return 2
        fi
      fi
    done

    if (( found == 0 )); then
      echo "❌ missing path: ${p}" >&2
      return 2
    fi
  done
  echo "✅ paths ok: ${paths_csv}"

  echo "git branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "clean?: $(git status --porcelain | wc -l | tr -d ' ') changes"
  echo "✅ preflight passed"
}

preflight_js() {
  local expected_repo="${1:-}"
  local paths_csv="${2:-AGENTS.md,package.json,docs,docs/plans}"
  local bins_csv="${3:-git,bash,sed,rg,node,npm,pnpm}"
  preflight_repo "$expected_repo" "$bins_csv" "$paths_csv"
}

preflight_rust() {
  local expected_repo="${1:-}"
  local paths_csv="${2:-AGENTS.md,Cargo.toml,docs,docs/plans}"
  local bins_csv="${3:-git,bash,sed,rg,python3,cargo}"
  preflight_repo "$expected_repo" "$bins_csv" "$paths_csv"
}

preflight_py() {
  local expected_repo="${1:-}"
  local paths_csv="${2:-AGENTS.md,pyproject.toml,docs,docs/plans}"
  local bins_csv="${3:-git,bash,sed,rg,python3}"
  preflight_repo "$expected_repo" "$bins_csv" "$paths_csv"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  stack="repo"
  expected_repo=""
  bins_csv=""
  paths_csv=""

  while (($# > 0)); do
    case "$1" in
      --stack)
        if [[ -z "${2:-}" ]]; then
          echo "❌ --stack requires a value" >&2
          exit 2
        fi
        stack="$2"
        shift 2
        ;;
      --mode)
        # Supported for CLI compatibility; current preflight behavior does not
        # vary by mode.
        if [[ -z "${2:-}" ]]; then
          echo "❌ --mode requires a value" >&2
          exit 2
        fi
        shift 2
        ;;
      --expected-repo)
        if [[ -z "${2:-}" ]]; then
          echo "❌ --expected-repo requires a value" >&2
          exit 2
        fi
        expected_repo="$2"
        shift 2
        ;;
      --bins)
        if [[ -z "${2:-}" ]]; then
          echo "❌ --bins requires a value" >&2
          exit 2
        fi
        bins_csv="$2"
        shift 2
        ;;
      --paths)
        if [[ -z "${2:-}" ]]; then
          echo "❌ --paths requires a value" >&2
          exit 2
        fi
        paths_csv="$2"
        shift 2
        ;;
      -h|--help)
        cat <<'USAGE'
Usage: scripts/codex-preflight.sh [--stack repo|auto|js|py|rust] [--mode optional|required] [--expected-repo FRAGMENT] [--bins csv] [--paths csv]
USAGE
        exit 0
        ;;
      *)
        if [[ -z "${expected_repo}" ]]; then
          expected_repo="$1"
          shift
        else
          echo "❌ unknown argument: $1" >&2
          exit 2
        fi
        ;;
    esac
  done

  case "${stack}" in
    auto|js)
      preflight_js "${expected_repo}" "${paths_csv:-}" "${bins_csv:-}"
      ;;
    py)
      preflight_py "${expected_repo}" "${paths_csv:-}" "${bins_csv:-}"
      ;;
    rust)
      preflight_rust "${expected_repo}" "${paths_csv:-}" "${bins_csv:-}"
      ;;
    repo|"")
      preflight_repo "${expected_repo}" "${bins_csv:-}" "${paths_csv:-}"
      ;;
    *)
      echo "❌ unsupported stack: ${stack}" >&2
      exit 2
      ;;
  esac
fi