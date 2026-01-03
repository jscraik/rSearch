# Answer common questions about arXiv-CLI usage

One sentence: This FAQ helps developers resolve common usage questions quickly.

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
