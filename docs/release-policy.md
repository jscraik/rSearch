# Release policy and SemVer

Last updated: 2026-01-03

## Summary
This project follows Semantic Versioning (SemVer) 2.0.0. Releases are documented in `CHANGELOG.md`.

## Versioning rules
- MAJOR: breaking changes to CLI behavior, output schemas, or config defaults.
- MINOR: new commands, flags, output fields, or additive behavior changes.
- PATCH: bug fixes, internal refactors, and documentation updates.

## Compatibility guarantees
- JSON output schemas are versioned and additive within a MAJOR version.
- Existing commands and flags remain stable within a MAJOR version.
- Deprecations are announced in `CHANGELOG.md` and removed only in the next MAJOR.

## Pre-releases
- Use pre-release tags (e.g., `1.2.0-beta.1`) for changes that need user validation.
- Pre-releases are not guaranteed to be stable.

## Release checklist
- Update `CHANGELOG.md` with user-facing changes.
- Run `npm run ci` locally.
- Ensure tests, typecheck, and audit pass in CI.
- Tag the release in Git using the SemVer version.

## npm publish checklist
- Confirm `dist/` is built and `package.json` `files` includes `dist` and `schemas`.
- Run `npm pack` and inspect the tarball contents.
- Publish with `npm publish` from a clean working tree.
- Verify `npm view arxiv-cli version` matches the tag.

## Security releases
- Security fixes are released as patch versions when possible.
- If a breaking fix is required, release a new MAJOR and document the impact clearly.
