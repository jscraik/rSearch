# Fix common rSearch errors quickly

One sentence: This guide lists the top CLI failure modes and how to resolve them.

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
- Audience: Users diagnosing CLI errors.
- Scope: Symptoms, causes, and fixes for common failures.
- Non-scope: Full command reference (see `docs/cli-reference.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

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

## Risks and assumptions
- Troubleshooting steps assume the CLI is built and run from `dist/`.
- Some failures depend on external arXiv availability; retries may be required.
- PDF text extraction quality varies by document.

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
- Set `--cache-dir` or `RSEARCH_CACHE_DIR`, and increase `--cache-ttl` if needed.

## Reference
- Support: `SUPPORT.md`

## Acceptance criteria
- [ ] Symptoms map to verified causes.
- [ ] Fixes are actionable and safe.
- [ ] Risks and assumptions are explicit.
- [ ] Links resolve to existing files or URLs.
- [ ] Table of contents matches section headings.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links).
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
