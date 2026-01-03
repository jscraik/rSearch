# Define how decisions are made for arXiv-CLI

One sentence: This document explains ownership and decision-making for the project.

Last updated: 2026-01-03

## Table of contents
- [Scope](#scope)
- [Working agreements](#working-agreements)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

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

## Troubleshooting
### Symptom: “Unclear decision ownership”
Cause:
- No maintainer assigned to an area.
Fix:
- Open an issue and request a maintainer assignment.

## Reference
- Repo: https://github.com/jscraik/arXiv-CLI.git
- Support: `SUPPORT.md`
