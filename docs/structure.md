# Use this directory map to navigate the repo

One sentence: This document describes the repo layout and what each folder contains.

Last updated: 2026-01-03

## Top-level
- `.github/`: CI workflows and repo automation.
- `docs/`: User and contributor documentation.
- `schemas/`: JSON schema for CLI output.
- `scripts/`: Release and maintenance scripts.
- `src/`: CLI source code.
- `tests/`: Automated tests.
- `package.json`: Scripts and dependencies.
- `CHANGELOG.md`: Release notes.
- `SECURITY.md`: Security policy.

## Source layout (`src/`)
- `src/cli.ts`: CLI entrypoint and command wiring.
- `src/arxiv/`: arXiv API client, parsers, and domain logic.
- `src/utils/`: Utilities for IO, output, errors, PDF parsing.

## Docs layout (`docs/`)
- `docs/index.md`: Docs landing page.
- `docs/cli-reference.md`: CLI command reference.
- `docs/configuration.md`: Config, env vars, and flags.
- `docs/troubleshooting.md`: Common failure modes.
- `docs/faq.md`: FAQ (canonical).
- `docs/FAQ.md`: Alias pointing to the canonical FAQ.
- `docs/release-policy.md`: SemVer and release process.
- `docs/roadmap.md`: Roadmap intake.
- `docs/ADR-001-architecture.md`: Architecture decision record.
