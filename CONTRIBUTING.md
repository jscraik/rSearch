# Contribute changes through forks and pull requests

One sentence: This guide explains how developers can propose changes safely and consistently.

Last updated: 2026-01-04

## Table of contents
- [Doc requirements](#doc-requirements)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Common tasks](#common-tasks)
- [Risks and assumptions](#risks-and-assumptions)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)
- [Acceptance criteria](#acceptance-criteria)
- [Evidence bundle](#evidence-bundle)

## Doc requirements
- Audience: Contributors proposing changes via PRs.
- Scope: Contribution workflow, verification steps, and code style expectations.
- Non-scope: Release process and governance (see `docs/release-policy.md`, `GOVERNANCE.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: Node.js 20+, npm, GitHub account
- Optional: `gh` CLI for convenience

## Quickstart
### 1) Fork and clone
```sh
# Fork the repo on GitHub, then:
git clone https://github.com/<you>/arXiv-CLI.git
cd arXiv-CLI
```

### 2) Install and verify
```sh
npm install
npm run typecheck
npm test
npm run audit
```

### Dependency hygiene
- Use npm for dependency changes.
- Do not edit `package-lock.json` manually.
- Keep `package.json` and `package-lock.json` in sync for every dependency change.
- If `npm audit` fails, open an issue and prefer upgrading dependencies over suppressing warnings.

### 3) Create a branch and make changes
```sh
git checkout -b my-change
```

### 4) Submit a PR
```sh
git push origin my-change
```

## Common tasks
### Add a CLI feature
- What you get: a new command or flag with tests.
- Steps:
  1) Update `src/cli.ts`.
  2) Add tests in `tests/`.
  3) Run `npm run lint:types`, `npm test`, and `npm run audit`.
- Verify:
  - Tests pass and help output is correct.

## Code style expectations
- Keep TypeScript strict and explicit where the compiler cannot infer intent.
- Prefer small, testable functions in `src/arxiv` and `src/utils`.
- Match existing formatting and naming conventions.
- Ensure `npm run lint:types` and `npm test` pass before opening a PR.

### Update docs
- What you get: user-facing documentation aligned with the CLI.
- Steps:
  1) Update README + relevant docs in `docs/`.
  2) Keep examples consistent with actual flags.
- Verify:
  - Docs match the CLI behavior.

## Risks and assumptions
- Assumes contributors can run Node.js 20+ locally.
- Assumes `npm audit` is used for dependency hygiene; failures may require coordinated upgrades.
- PR-only workflow may slow urgent fixes; use issues to flag urgency.

## Troubleshooting
### Symptom: “tests failing after changes”
Cause:
- Incomplete update to CLI parsing or output formats.
Fix:
```sh
npm run typecheck
npm test
```

### Symptom: “TypeScript build errors”
Cause:
- Type mismatch in CLI options or output helpers.
Fix:
- Update types in `src/arxiv/types.ts` and run `npm run typecheck`.

## Reference
- PRs are accepted via fork + pull request.
- Use clear commit messages and include tests for behavior changes.
- Support: GitHub Issues (see `SUPPORT.md`).

## Acceptance criteria
- [ ] Contribution steps match current scripts and tooling.
- [ ] Verification commands exist in `package.json`.
- [ ] Code style guidance reflects current codebase.
- [ ] Risks and assumptions are explicit.
- [ ] Links resolve to existing files or URLs.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy (audit guidance).
- Automated checks: vale run on 2026-01-04 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-04.
- Deviations: None.
