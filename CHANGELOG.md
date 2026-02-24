# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning.

Last updated: 2026-02-23

## Doc requirements
- Audience: Users and maintainers tracking release changes.
- Scope: User-visible changes and release history.
- Non-scope: Release process steps (see `docs/release-policy.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## [Unreleased]

### Added

### Changed

- [2026-02-23] [f3c12dd] chore: add per-repo release notes
- [2026-02-23] [1021969] chore(deps): bump actions/setup-node from 4 to 6
- [2026-02-23] [15116e8] security(deps-dev): bump @types/node from 25.2.2 to 25.3.0 (#19)
- [2026-02-23] [2d25bda] chore(deps): bump actions/github-script from 7 to 8 (#16)
- [2026-02-23] [5c35bec] chore(deps): bump github/codeql-action from 3 to 4 (#15)
- [2026-02-23] [e6ffc03] chore(deps): bump actions/checkout from 4 to 6 (#13)

### Fixed

## [0.1.6] - 2026-02-23

### Added

### Changed

### Fixed

## [0.1.5] - 2026-02-23

### Added

### Changed

### Fixed

## [0.1.4] - 2026-02-23

### Added

### Changed

### Fixed

## [0.1.3] - 2026-02-23

### Added

### Changed

### Fixed

## [0.1.2] - 2026-02-23

### Added

### Changed

### Fixed

## [0.1.0] - 2026-01-05

### Added
- JSON error envelope schema (`schemas/cli-error.schema.json`) and documented error output example.
- CLI tests covering help output, JSON error envelopes, `--no-input`, numeric validation, and `--no-retry`.
- Retry tuning flags: `--max-retries`, `--retry-base-delay`, and `--no-retry`.

### Changed
- `--no-input` now blocks stdin reads with explicit usage errors.
- Output modes (`--json`, `--plain`, `--quiet`) are mutually exclusive and validated in CLI.
- Config parsing now reports invalid JSON/schema or missing explicit config path.

### Fixed
- `download --query` no longer attempts stdin ID resolution before running the query.
- Comma-separated IDs are accepted consistently across commands.

## [0.1.0] - 2026-01-03

### Added
- CLI commands: search, fetch, download, urls, categories, config.
- Output formats: human, plain, JSON (schema in `schemas/cli-output.schema.json`).
- PDF download and text export to Markdown/JSON with optional `--keep-pdf`.
- License metadata surfaced; `--require-license` filtering with policy exit codes.
- Rate limiting, retries with backoff, optional disk cache.
- Comprehensive docs, security workflows, and tests.

### Added
- Core Node/TypeScript CLI for arXiv search, fetch, download, and category navigation.
- Query builder + Atom XML parsing.
- Config layering (flags > env > project > user).
- Rate limiting, retries with exponential backoff, and optional debug logging.
- Unit tests for parser and query builder.

## Acceptance criteria
- [ ] Entries follow Keep a Changelog format.
- [ ] Release dates and versions are accurate.
- [ ] User-visible changes are captured.
- [ ] Ownership and cadence are stated.
- [ ] Links resolve to existing files or URLs.

## Evidence bundle
- Standards mapping: CommonMark structure, release documentation best practices.
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
