# Configure arXiv-CLI with flags, env vars, and config files

One sentence: This doc explains configuration precedence and available options.

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
- Audience: Developers configuring the CLI.
- Scope: Config precedence, config file locations, environment variables, and flags.
- Non-scope: Command reference details (see `docs/cli-reference.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: Node.js 20+, npm

## Quickstart
### 1) Create a user config
```sh
mkdir -p ~/.config/arxiv-cli
cat > ~/.config/arxiv-cli/config.json <<'JSON'
{
  "userAgent": "arxiv-cli/0.1.0 (mailto:you@example.com)",
  "timeoutMs": 20000,
  "minIntervalMs": 3000,
  "pageSize": 100
}
JSON
```

### 2) Run with defaults
```sh
node dist/cli.js config --json
```

### 3) Verify
Expected output:
- `config` object and a list of `sources` paths.

## Common tasks
### Override with environment variables
```sh
ARXIV_TIMEOUT_MS=30000 ARXIV_RATE_LIMIT_MS=4000 node dist/cli.js search "cat:cs.AI"
```

### Override with flags
```sh
node dist/cli.js search "cat:cs.AI" --timeout 30000 --rate-limit 4000
```

### Enable the on-disk HTTP cache (optional)
The CLI only uses a disk cache if you opt in with `--cache-dir` or `ARXIV_CACHE_DIR`.
```sh
ARXIV_CACHE_DIR=~/.cache/arxiv-cli ARXIV_CACHE_TTL_MS=86400000 node dist/cli.js search "cat:cs.AI"
```

### License filtering is per-command
`--require-license` is a command flag (not a config option). Use it on `search`, `fetch`, `urls`, or `download` when you want to exclude records missing license metadata.
```sh
node dist/cli.js search "cat:cs.AI" --require-license
```

### Set a default download directory
```sh
ARXIV_DOWNLOAD_DIR=./papers node dist/cli.js download 2002.00762
```

## Risks and assumptions
- Config files must be valid JSON; invalid files are ignored with errors.
- Environment variables override project/user config; verify precedence before debugging.
- Disk cache is opt-in and may increase storage usage; set TTLs appropriately.

## Troubleshooting
### Symptom: “Config not applied”
Cause:
- Wrong file path or invalid JSON/schema.
Fix:
- Check `node dist/cli.js config --json` for loaded paths and fix any reported validation errors.

## Reference
### Precedence
Flags > Environment > Project config > User config

### Config files
- Project: `.arxivrc.json`
- User: `~/.config/arxiv-cli/config.json`

### Environment variables
- `ARXIV_API_BASE_URL`
- `ARXIV_PDF_BASE_URL`
- `ARXIV_USER_AGENT`
- `ARXIV_TIMEOUT_MS` (positive integer)
- `ARXIV_RATE_LIMIT_MS` (positive integer)
- `ARXIV_MAX_RETRIES` (non-negative integer)
- `ARXIV_RETRY_BASE_DELAY_MS` (non-negative integer)
- `ARXIV_CACHE_DIR`
- `ARXIV_CACHE_TTL_MS` (positive integer)
- `ARXIV_PAGE_SIZE` (positive integer)
- `ARXIV_DOWNLOAD_DIR`
- `ARXIV_CONTACT_EMAIL`
- `ARXIV_CACHE` (true/false)
- `ARXIV_DEBUG` (true/false)
- `NO_COLOR`

## Acceptance criteria
- [ ] Precedence order matches implementation.
- [ ] Config paths and env vars are current.
- [ ] Examples produce expected output.
- [ ] Risks and assumptions are explicit.
- [ ] Table of contents matches section headings.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy guidance for config.
- Automated checks: vale run on 2026-01-04 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-04.
- Deviations: None.
