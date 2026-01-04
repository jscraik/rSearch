# Answer common questions about arXiv-CLI usage

One sentence: This FAQ helps developers resolve common usage questions quickly.

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
- Audience: Users looking for quick answers about CLI behavior.
- Scope: Common questions and succinct guidance for usage and policy.
- Non-scope: Full command reference (see `docs/cli-reference.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: Node.js 20+, npm

## Quickstart
### 1) Install
```sh
npm install
npm run build
```

### 2) Run
```sh
node dist/cli.js search "cat:cs.AI" --max-results 5
```

### 3) Verify
Expected output:
- IDs and titles for the top results.

## Common tasks
### Use stdin for queries
```sh
echo "cat:cs.AI" | node dist/cli.js search -
```

### Export metadata + text
```sh
node dist/cli.js download 2002.00762 --format json --out-dir ./papers
```

### How do I enable the on-disk cache?
Use `--cache-dir` or `ARXIV_CACHE_DIR`. Cache is opt-in and can be given a TTL.
```sh
ARXIV_CACHE_DIR=~/.cache/arxiv-cli ARXIV_CACHE_TTL_MS=86400000 node dist/cli.js search "cat:cs.AI"
```

### How do I filter results by license metadata?
Use `--require-license` on `search`, `fetch`, `urls`, or `download` to exclude records with missing license metadata.
```sh
node dist/cli.js search "cat:cs.AI" --require-license
node dist/cli.js fetch 2002.00762 --require-license --json
node dist/cli.js urls "cat:cs.AI" --require-license
```

### Can I use arXiv papers to improve my software?
It depends on the license for each paper. arXiv hosts content under author-selected licenses. Use the license URL from the metadata (when present) and review the abstract page to confirm permitted use. This project does not grant rights or provide legal advice.

### How do I respect arXiv usage policy?
Use a contact email in the User-Agent, keep rate limits conservative, and avoid large batch pulls. The CLI supports `--contact` and `--rate-limit` for this.

## Risks and assumptions
- Answers assume the CLI is built (`npm run build`) and run via `node dist/cli.js`.
- License guidance is informational only; verify on the arXiv abstract page.
- Some PDFs require OCR for text extraction.

## Troubleshooting
### Symptom: “Why is output plain text?”
Cause:
- Default output mode is human-readable.
Fix:
```sh
node dist/cli.js search "cat:cs.AI" --json
```

## Reference
- CLI reference: `docs/cli-reference.md`

## Acceptance criteria
- [ ] FAQ answers reflect current CLI behavior.
- [ ] Examples run successfully with current scripts.
- [ ] Risks and assumptions are explicit.
- [ ] Links resolve to existing files or URLs.
- [ ] Table of contents matches section headings.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy (license guidance).
- Automated checks: vale run on 2026-01-04 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-04.
- Deviations: None.
