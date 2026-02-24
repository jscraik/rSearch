schema_version: 1

# rSearch Repository Guidelines

This repository provides a Node/TypeScript CLI for searching, fetching, and downloading arXiv papers.

## Mandatory workflow snippet
1. Explore project first, then invoke skill.
2. IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React, Tauri, Apps-SDK-ui, Tailwind, Vite, Storybook + Chat Widget tasks.
3. Add a Table of Contents for docs.

## Required essentials
- Package manager: **npm** (`/Users/jamiecraik/dev/rsearch/package-lock.json` present).
- Non-standard build/typecheck commands: `npm run build`, `npm run typecheck`.
- Default compatibility posture: **canonical-only**.

## Tooling essentials
- Run shell commands with `zsh -lc`.
- Prefer `rg`, `fd`, and `jq`.
- Before choosing tools, read `/Users/jamiecraik/.codex/instructions/tooling.md`.
- Ask before adding dependencies or system settings.
- Execution mode: single-threaded by default; do not parallelize or spawn subagents unless explicitly requested.

## References (informational)
- Global protocol: /Users/jamiecraik/.codex/AGENTS.md
- Security and standards baseline: /Users/jamiecraik/.codex/instructions/standards.md
- RVCP source of truth: /Users/jamiecraik/.codex/instructions/rvcp-common.md

## Global discovery order
1. `/Users/jamiecraik/.codex/AGENTS.md`.
2. Nearest repo `AGENTS.md`.
3. Linked instruction files.
4. If conflicts appear, pause and ask which instruction wins.

## Documentation map
### Table of Contents
- [Instruction map](docs/agents/01-instruction-map.md)
- [Tooling and command policy](docs/agents/02-tooling-policy.md)
- [Validation and checks](docs/agents/03-validation-and-checks.md)
- [Claude-specific governance](docs/agents/04-claude-governance.md)
- [Contradictions and cleanup](docs/agents/05-contradictions-and-cleanup.md)
- [Local memory workflow](docs/agents/06-local-memory.md)

## Flaky Test Artifact Capture
- Run `bash scripts/test-with-artifacts.sh all` (or `pnpm run test:artifacts` / `npm run test:artifacts` / `bun run test:artifacts`) to emit machine-readable flaky evidence under `artifacts/test`.
- Optional targeted modes:
  - `bash scripts/test-with-artifacts.sh unit`
  - `bash scripts/test-with-artifacts.sh integration`
  - `bash scripts/test-with-artifacts.sh e2e`
- Commit/retain stable artifact paths for local automation ingestion:
  - `artifacts/test/summary-*.json`
  - `artifacts/test/test-output-*.log`
  - `artifacts/test/junit-*.xml` (when supported by test runner)
  - `artifacts/test/*-results.json` (when supported by test runner)
  - `artifacts/test/artifact-manifest.json`
- Keep artifact filenames stable (no timestamps in filenames) so recurring flake scans can compare runs.

