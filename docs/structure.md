# Use this directory map to navigate the repo

One sentence: This document describes the repo layout and what each folder contains.

Last updated: 2026-01-04

## Doc requirements
- Audience: Developers navigating the repository.
- Scope: Directory map and key file descriptions.
- Non-scope: Detailed usage instructions (see `README.md` and `docs/`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

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
- `docs/release-policy.md`: SemVer and release process.
- `docs/roadmap.md`: Roadmap intake.
- `docs/ADR-001-architecture.md`: Architecture decision record.

## Risks and assumptions
- Assumes file and folder names stay stable across releases.
- New docs must be added to this list to keep navigation accurate.

## Acceptance criteria
- [ ] Entries match actual repo paths.
- [ ] Descriptions are accurate and concise.
- [ ] Risks and assumptions are explicit.
- [ ] Ownership and cadence are stated.
- [ ] Links resolve to existing files or URLs.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (clear headings).
- Automated checks: vale run on 2026-01-04 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-04.
- Deviations: None.
