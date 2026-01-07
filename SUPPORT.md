# Get help through GitHub Issues

One sentence: This guide tells developers how to get support for rSearch.

Last updated: 2026-01-07

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
- Audience: Users and contributors seeking help.
- Scope: How to request support, report bugs, and request features.
- Non-scope: Security vulnerability reporting (see `SECURITY.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: GitHub account
- Optional: CLI logs (`--debug`) and reproduction steps

## Quickstart
### 1) Search existing issues
- Check whether the issue already exists:
  - https://github.com/jscraik/rSearch/issues

### 2) Open a new issue
- Include:
  - Command you ran
  - Output and errors
  - Your OS + Node.js version

## Common tasks
### Report a bug
- What you get: a tracked bug report with reproduction steps.
- Steps:
  1) Run with `--debug` if possible.
  2) Open an issue with logs and expected behavior.

### Request a feature
- What you get: a tracked feature request.
- Steps:
  1) Describe the use case and expected output.
  2) Provide example commands if possible.

## Risks and assumptions
- Assumes GitHub Issues is the primary support channel.
- Issue triage latency depends on maintainer availability.
- Logs may include sensitive data; redact before posting.

## Troubleshooting
### Symptom: “No response on issue”
Cause:
- Maintainers triage in batches.
Fix:
- Add reproducible steps and logs to increase priority.

## Reference
- Code of conduct: `CODE_OF_CONDUCT.md`
- Security issues: `SECURITY.md`

## Acceptance criteria
- [ ] Support steps match current repository workflows.
- [ ] Sensitive data guidance is included.
- [ ] Links resolve to existing files or URLs.
- [ ] Risks and assumptions are explicit.
- [ ] Ownership and cadence are stated.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy guidance for logs.
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
