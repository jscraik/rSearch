# Find the right arXiv-CLI docs fast

One sentence: This index points developers to the right doc for each task.

Last updated: 2026-01-03

## Table of contents
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

## Prerequisites
- Required: Node.js 20+, npm

## Quickstart
### 1) Read the main README
- Start here: `README.md`

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

## Troubleshooting
### Symptom: “Not sure which doc to read”
Cause:
- Docs are split by task.
Fix:
- Use this index and go to the matching section.

## Reference
- Repo: https://github.com/jscraik/arXiv-CLI.git
- Support: `SUPPORT.md`
- Contributing: `CONTRIBUTING.md`
- Governance: `GOVERNANCE.md`
- Security: `SECURITY.md`
- Output schema: `schemas/cli-output.schema.json`
- FAQ alias: `docs/FAQ.md`
