# arXiv-CLI helps developers search, fetch, and download arXiv papers from the terminal

[![License](https://img.shields.io/badge/license-MIT-informational.svg)](LICENSE)
[![Issues](https://img.shields.io/github/issues/jscraik/arXiv-CLI)](https://github.com/jscraik/arXiv-CLI/issues)

One sentence: This repo provides a Node/TypeScript CLI for arXiv search, metadata fetch, downloads, category browsing, and URL output.

Last updated: 2026-01-03

## Table of contents
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

## Prerequisites
- Required: Node.js 20+, npm
- Optional: Git, a POSIX shell

## Quickstart
### 1) Install or set up
```sh
npm install
npm run build
```

### 2) Run it
```sh
node dist/cli.js search "cat:cs.AI" --max-results 5
```

### 3) Verify
Expected output:
- A list of results with IDs and titles.

## Common tasks
### Search arXiv by query
- What you get: titles and IDs (plus URLs in JSON output).
- Steps:
```sh
node dist/cli.js search "cat:cs.LG" --max-results 10
```
- Verify: output shows `Total results` and a list of entries.

### Filter search results to entries with license metadata
- What you get: only results that include license metadata in arXiv records.
- Steps:
```sh
node dist/cli.js search "cat:cs.AI" --require-license --max-results 10
```
- Verify: summary mentions filtered results when license metadata is missing.

### Fetch metadata by arXiv ID
- What you get: full metadata including abstract, authors, and PDF URL.
- Steps:
```sh
node dist/cli.js fetch 2002.00762 --json
```
- Verify: JSON includes `absUrl` and `pdfUrl`.

### Download PDFs
- What you get: a PDF per ID in the output directory.
- Steps:
```sh
node dist/cli.js download 2002.00762 --out-dir ./papers
```
- Verify: `./papers/2002.00762.pdf` exists.

### Export Markdown or JSON with extracted text
- What you get: Markdown or JSON output with text extracted from the PDF.
- Steps:
```sh
node dist/cli.js download 2002.00762 --format md --out-dir ./papers
node dist/cli.js download 2002.00762 --format json --out-dir ./papers
```
- Verify: `./papers/2002.00762.md` or `./papers/2002.00762.json` exists.

### Enforce license metadata on downloads
- What you get: downloads fail if arXiv does not provide license metadata.
- Steps:
```sh
node dist/cli.js download 2002.00762 --format json --require-license --out-dir ./papers
```
- Verify: failures are reported with `License metadata missing` when unavailable.

### Keep PDF while exporting text formats
- What you get: both the text export and the PDF.
- Steps:
```sh
node dist/cli.js download 2002.00762 --format md --keep-pdf --out-dir ./papers
```
- Verify: both `2002.00762.md` and `2002.00762.pdf` exist.

### Return URLs for agents
- What you get: abstract and PDF URLs per result.
- Steps:
```sh
node dist/cli.js urls "cat:cs.AI"
node dist/cli.js urls --ids 2002.00762 2101.00001
node dist/cli.js urls "cat:cs.AI" --require-license
```
- Verify: each line includes an abs URL and PDF URL.

### Browse categories
- What you get: the arXiv category taxonomy.
- Steps:
```sh
node dist/cli.js categories tree
node dist/cli.js categories list --group "Computer Science"
```
- Verify: group names and category IDs are listed.

## Troubleshooting
### Symptom: “Provide a search query” or “Provide arXiv IDs”
Cause:
- Missing positional argument or stdin input.
Fix:
```sh
node dist/cli.js search "cat:cs.AI"
node dist/cli.js fetch 2002.00762
```

### Symptom: “arXiv API request failed (429/5xx)”
Cause:
- Rate limiting or transient server errors.
Fix:
- Re-run; the CLI already retries with backoff. Lower `--max-results` if needed.

### Symptom: “Failed to fetch taxonomy”
Cause:
- arXiv taxonomy endpoint unavailable or network blocked.
Fix:
- Re-run later or use `--refresh` once connectivity is restored.

## Reference
- Repo: https://github.com/jscraik/arXiv-CLI.git
- Commands:
  - `search`, `fetch`, `download`, `urls`, `categories`, `config`, `help`
- Constraints:
  - Default API delay: 3s
  - `page-size` <= 2000
  - `max-results` <= 30000
- Output schema:
  - `schemas/cli-output.schema.json`
- License use:
  - arXiv content is licensed by the authors. The CLI may expose a license URL when provided, but it does not grant rights. Always verify permitted use on the arXiv abstract page.
- Usage policy:
  - Be courteous to arXiv: include contact info (`--contact`) and keep rate limits conservative (`--rate-limit`).
- Docs:
  - `docs/index.md`
  - `CHANGELOG.md`
  - `SECURITY.md`
  - `SUPPORT.md`
  - `CODE_OF_CONDUCT.md`
  - `CONTRIBUTING.md`
  - `docs/cli-reference.md`
  - `docs/configuration.md`
  - `docs/release-policy.md`
  - `docs/troubleshooting.md`
  - `docs/faq.md`
  - `docs/roadmap.md`
  - `docs/ADR-001-architecture.md`
