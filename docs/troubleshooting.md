# Fix common arXiv-CLI errors quickly

One sentence: This guide lists the top CLI failure modes and how to resolve them.

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
### 1) Re-run with debug
```sh
node dist/cli.js search "cat:cs.AI" --debug
```

### 2) Verify
Expected output:
- Debug lines showing request URLs and response status codes.

## Common tasks
### Validate config sources
```sh
node dist/cli.js config --json
```

## Troubleshooting
### Symptom: “Provide a search query”
Cause:
- Missing query argument or stdin.
Fix:
```sh
node dist/cli.js search "cat:cs.AI"
```

### Symptom: “arXiv API request failed (429/5xx)”
Cause:
- Rate limit or server error.
Fix:
- Retry later. The CLI already uses backoff and retries.

### Symptom: “Failed to fetch taxonomy”
Cause:
- Network or arXiv site unavailable.
Fix:
- Re-run later or use `--refresh` once connectivity returns.

### Symptom: “License metadata missing”
Cause:
- The arXiv record does not include license metadata.
Fix:
- Re-run without `--require-license`, or open the abstract page and verify the license manually.

### Symptom: “Extracted text is empty or garbled”
Cause:
- Some PDFs are scans or contain complex layouts that are not text-extractable.
Fix:
- Use the PDF output and run OCR with your preferred tool, then re-ingest the text.

### Symptom: “Cache not used”
Cause:
- Disk cache is opt-in or TTL expired.
Fix:
- Set `--cache-dir` or `ARXIV_CACHE_DIR`, and increase `--cache-ttl` if needed.

## Reference
- Support: `SUPPORT.md`
