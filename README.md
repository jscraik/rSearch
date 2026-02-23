<div align="center">
  <img src="./brand/rsearch-brand-logo.png" alt="rSearch Logo" width="200" />
</div>

# rSearch helps developers search, fetch, and download arXiv papers from the terminal

[![License](https://img.shields.io/badge/license-MIT-informational.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@brainwav/rsearch)](https://www.npmjs.com/package/@brainwav/rsearch)
[![CI](https://github.com/jscraik/rSearch/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jscraik/rSearch/actions/workflows/ci.yml)
[![Security Policy](https://img.shields.io/badge/security-policy-informational.svg)](SECURITY.md)
[![Issues](https://img.shields.io/github/issues/jscraik/rSearch)](https://github.com/jscraik/rSearch/issues)

One sentence: This repo provides a Node/TypeScript CLI for arXiv search, metadata fetch, downloads, category browsing, and URL output.

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

- Audience: Developers and researchers using the CLI to search, fetch, and download arXiv papers.
- Scope: Installation, core commands, verification steps, and usage constraints.
- Non-scope: Contribution workflow, security reporting, and internal architecture (see `CONTRIBUTING.md`, `SECURITY.md`, `docs/ADR-001-architecture.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites

- Required: Node.js 20+, npm
- Optional: Git, a POSIX shell

## Quickstart

### 1) Install

```sh
npm install -g @brainwav/rsearch
```

### 2) Run a search

```sh
rsearch search "cat:cs.AI" --max-results 5
```

### 3) Verify

Expected output:

- A list of results with IDs and titles.

## Common tasks

### Search arXiv by query

- What you get: titles and IDs (plus URLs in JSON output).
- Steps:

```sh
rsearch search "cat:cs.LG" --max-results 10
```

- Verify: output shows `Total results` and a list of entries.

### Filter search results to entries with license metadata

- What you get: only results that include license metadata in arXiv records.
- Steps:

```sh
rsearch search "cat:cs.AI" --require-license --max-results 10
```

- Verify: summary mentions filtered results when license metadata is missing.

### Fetch metadata by arXiv ID

- What you get: full metadata including abstract, authors, and PDF URL.
- Steps:

```sh
rsearch fetch 2002.00762 --json
```

- Verify: JSON includes `absUrl` and `pdfUrl`.

### Download PDFs

- What you get: a PDF per ID in the output directory.
- Steps:

```sh
rsearch download 2002.00762 --out-dir ./papers
```

- Verify: `./papers/2002.00762.pdf` exists.

### Export Markdown or JSON with extracted text

- What you get: Markdown or JSON output with text extracted from the PDF.
- Steps:

```sh
rsearch download 2002.00762 --format md --out-dir ./papers
rsearch download 2002.00762 --format json --out-dir ./papers
```

- Verify: `./papers/2002.00762.md` or `./papers/2002.00762.json` exists.

### Enforce license metadata on downloads

- What you get: downloads fail if arXiv does not provide license metadata.
- Steps:

```sh
rsearch download 2002.00762 --format json --require-license --out-dir ./papers
```

- Verify: failures are reported with `License metadata missing` when unavailable.

### Keep PDF while exporting text formats

- What you get: both the text export and the PDF.
- Steps:

```sh
rsearch download 2002.00762 --format md --keep-pdf --out-dir ./papers
```

- Verify: both `2002.00762.md` and `2002.00762.pdf` exist.

### Return URLs for agents

- What you get: abstract and PDF URLs per result.
- Steps:

```sh
rsearch urls "cat:cs.AI"
rsearch urls --ids 2002.00762 2101.00001
rsearch urls "cat:cs.AI" --require-license
```

- Verify: each line includes an abs URL and PDF URL.

### Browse categories

- What you get: the arXiv category taxonomy.
- Steps:

```sh
rsearch categories tree
rsearch categories list --group "Computer Science"
```

- Verify: group names and category IDs are listed.

## Risks and assumptions

- Assumes arXiv API availability and that users respect rate limits.
- Assumes users review license metadata before reuse; the CLI does not grant rights.
- PDF text extraction may fail on scanned or complex layouts.
- Output files overwrite only when `--overwrite` is used; verify output paths before running batch downloads.

## Troubleshooting

### Symptom: “Provide a search query” or “Provide arXiv IDs”

Cause:

- Missing positional argument or stdin input.
Fix:

```sh
rsearch search "cat:cs.AI"
rsearch fetch 2002.00762
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

- Repo: <https://github.com/jscraik/rSearch.git>
- Commands:
  - `search`, `fetch`, `download`, `urls`, `categories`, `config`, `help`
- Constraints:
  - Default API delay: 3s
  - Retry defaults: max-retries=3, retry-base-delay=500ms (`--no-retry` to disable)
  - `page-size` <= 2000
  - `max-results` <= 30000
- Output schema:
  - `schemas/cli-output.schema.json`
  - `schemas/cli-error.schema.json`
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

## Acceptance criteria

- [ ] Doc requirements reflect current CLI scope and ownership.
- [ ] Examples match available commands and scripts in this repo.
- [ ] License and usage policy notes are present and accurate.
- [ ] Risks and assumptions are explicit and up to date.
- [ ] Links resolve to existing files or URLs.

## Evidence bundle

- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy guidance for license usage.
- Brand compliance: Documentation signature added; assets present in `brand/`.
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.

---

<img
  src="./brand/brand-mark.webp"
  srcset="./brand/brand-mark.webp 1x, ./brand/brand-mark@2x.webp 2x"
  alt="brAInwav"
  height="28"
  align="left"
/>

<br clear="left" />

**brAInwav**  
_from demo to duty_
