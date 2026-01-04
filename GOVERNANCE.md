# Define how decisions are made for arXiv-CLI

One sentence: This document explains ownership and decision-making for the project.

Last updated: 2026-01-04

## Table of contents
- [Doc requirements](#doc-requirements)
- [Scope](#scope)
- [Working agreements](#working-agreements)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Common tasks](#common-tasks)
- [Risks and assumptions](#risks-and-assumptions)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)
- [Acceptance criteria](#acceptance-criteria)
- [Evidence bundle](#evidence-bundle)

## Doc requirements
- Audience: Maintainers and contributors making governance or approval decisions.
- Scope: Ownership, decision-making, and change approval rules for this repo.
- Non-scope: Technical design details and security response process (see `docs/ADR-001-architecture.md`, `SECURITY.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Scope
This doc defines how the project is maintained, how changes are reviewed, and which decisions require approval.

## Working agreements
- Changes require a pull request (PR) via fork.
- CI checks must pass (`npm run typecheck`, `npm test`).
- User-visible CLI changes require doc updates.
- Breaking changes should be flagged in `CHANGELOG.md`.

## Prerequisites
- Required access: GitHub account
- Required tooling: Node.js 20+, npm

## Quickstart
### 1) Propose a change
```sh
git checkout -b my-change
```

### 2) Verify changes
```sh
npm run typecheck
npm test
```

### 3) Open a PR
- Use GitHub Issues to discuss large changes first.

## Common tasks
### Approve a change
- Preconditions:
  - Tests pass
  - Docs updated if user-facing
- Steps:
  - Review code and merge

### Make a breaking change
- Preconditions:
  - Issue describing the change
- Steps:
  1) Update `CHANGELOG.md`
  2) Bump version (SemVer guidance)
  3) Document migration steps

## Risks and assumptions
- Assumes maintainers are available to review and merge PRs.
- Assumes contributors follow the PR-based workflow.
- Unclear ownership can delay urgent fixes; use issues to request assignments.

## Troubleshooting
### Symptom: “Unclear decision ownership”
Cause:
- No maintainer assigned to an area.
Fix:
- Open an issue and request a maintainer assignment.

## Reference
- Repo: https://github.com/jscraik/arXiv-CLI.git
- Support: `SUPPORT.md`

## Acceptance criteria
- [ ] Scope and approval rules are current.
- [ ] Working agreements match actual CI checks and workflows.
- [ ] Ownership expectations are explicit and actionable.
- [ ] Risks and assumptions reflect current project reality.
- [ ] Links resolve to existing files or URLs.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), governance clarity.
- Automated checks: vale run on 2026-01-04 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-04.
- Deviations: None.
