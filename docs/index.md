# Find the right rSearch docs fast

One sentence: This index points developers to the right doc for each task.

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
- Audience: Developers and maintainers looking for the right doc quickly.
- Scope: Navigation map to CLI, configuration, troubleshooting, and policy docs.
- Non-scope: Detailed usage or configuration steps (see linked docs).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: Node.js 20+, npm

## Quickstart
### 1) Read the main README
- Start with `README.md`

### 2) Verify
Expected output:
- You can run `node dist/cli.js help` after building.

## Common tasks
### Use the CLI
- See: `docs/cli-reference.md`

### Configure the CLI
- See: `docs/configuration.md`

### Check license metadata
- See: `docs/cli-reference.md` and `docs/faq.md`
```sh
node dist/cli.js search "cat:cs.AI" --require-license
```

### Resolve common failures
- See: `docs/troubleshooting.md`

### Review FAQs
- See: `docs/faq.md`

### Understand the repository layout
- See: `docs/structure.md`

### Track roadmap ideas
- See: `docs/roadmap.md`

### Understand release versioning
- See: `docs/release-policy.md`

## Risks and assumptions
- Assumes filenames and paths stay stable across releases.
- Index can become stale when new docs are added; update in the same PR.

## Troubleshooting
### Symptom: “Not sure which doc to read”
Cause:
- Docs are split by task.
Fix:
- Use this index and go to the matching section.

## Reference
- Repo: https://github.com/jscraik/rSearch.git
- Support: `SUPPORT.md`
- Contributing: `CONTRIBUTING.md`
- Governance: `GOVERNANCE.md`
- Security: `SECURITY.md`
- Output schema: `schemas/cli-output.schema.json`
- FAQ: `docs/faq.md`

## Acceptance criteria
- [ ] All links resolve to existing files or URLs.
- [ ] Doc list reflects current repo structure.
- [ ] Risks and assumptions are explicit.
- [ ] Ownership and cadence are stated.
- [ ] Table of contents matches section headings.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links).
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
