# Use the rSearch commands to search, fetch, and download papers

One sentence: This reference lists commands, flags, and output formats for developers.

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
- Audience: Developers using CLI commands and flags.
- Scope: Command syntax, flags, output notes, and exit codes.
- Non-scope: Configuration precedence (see `docs/configuration.md`) and troubleshooting catalog (see `docs/troubleshooting.md`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Prerequisites
- Required: Node.js 20+, npm
- Optional: POSIX shell

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
- A list of IDs and titles.

## Common tasks
### Search
```sh
node dist/cli.js search "cat:cs.AI" --max-results 10
node dist/cli.js search "au:Goodfellow" --sort-by submittedDate --sort-order descending
node dist/cli.js search "cat:cs.AI" --require-license
```

### Fetch by ID
```sh
node dist/cli.js fetch 2002.00762 --json
node dist/cli.js fetch 2002.00762 --require-license --json
```

### Download
```sh
node dist/cli.js download 2002.00762 --out-dir ./papers
node dist/cli.js download 2002.00762 --format md --keep-pdf --out-dir ./papers
node dist/cli.js download 2002.00762 --format json --require-license --out-dir ./papers
```
Flags:
- `--format pdf|md|json`
- `--keep-pdf`
- `--require-license`
- `--out-dir <path>`
- `--overwrite`

### URLs
```sh
node dist/cli.js urls "cat:cs.AI"
node dist/cli.js urls --ids 2002.00762 2101.00001
node dist/cli.js urls "cat:cs.AI" --require-license
```

### Categories
```sh
node dist/cli.js categories tree
node dist/cli.js categories list --group "Computer Science"
```

## License and permitted use
arXiv content is governed by the license chosen by each author. The CLI includes any license URL found in the arXiv metadata, but it does not grant rights. Always review the license on the arXiv abstract page before using content for software improvement, training, or redistribution.
Use a contact email in the User-Agent (`--contact`) and keep `--rate-limit` conservative to respect arXiv usage policies.

## Risks and assumptions
- Assumes arXiv API endpoints and response formats remain stable.
- `--require-license` can reduce result sets; downstream automation should handle empty results.
- Large `--max-results` may trigger rate limits; prefer smaller batches.

## Troubleshooting
### Symptom: “Invalid usage”
Cause:
- Missing required argument.
Fix:
```sh
node dist/cli.js help
```

## Reference
### Global flags
- `--json` / `--plain`
- `-q, --quiet` / `-v, --verbose` / `--debug`
- `-V, --version`
- `--color=auto|always|never` / `--no-color`
- `--no-input` (disable stdin prompts/reads)
- `--config <path>`
- `--api-base-url <url>`
- `--pdf-base-url <url>`
- `--user-agent <ua>` / `--contact <email>`
- `--timeout <ms>` / `--rate-limit <ms>`
- `--max-retries <n>` / `--retry` / `--no-retry` / `--retry-base-delay <ms>`
- `--cache-dir <path>` / `--cache-ttl <ms>`
- `--page-size <n>` / `--no-cache`
- `--require-license` (supported by `search`, `fetch`, `urls`, `download`)

### Output notes
- Entries include `license` and `licenseUrl` when present in arXiv metadata.
- When `--require-license` is used, JSON output includes `missingLicenseIds` if any records were filtered.
- JSON output follows `schemas/cli-output.schema.json`.
- On errors with `--json`, output uses `schema: arxiv.error.v1` and includes `data.error.code` plus `errors: ["E_*"]`.
- Error schema: `schemas/cli-error.schema.json`.

Example error output (JSON):
```json
{
  "schema": "arxiv.error.v1",
  "meta": {
    "tool": "arxiv",
    "version": "0.1.0",
    "timestamp": "2026-01-04T00:00:00.000Z"
  },
  "summary": "Provide a search query.",
  "status": "error",
  "data": {
    "error": {
      "code": "E_USAGE",
      "message": "Provide a search query."
    },
    "exitCode": 2
  },
  "errors": [
    "E_USAGE"
  ]
}
```

### Retry behavior
- Defaults: `max-retries=3`, `retry-base-delay=500` (ms), with exponential backoff and jitter.
- Use `--no-retry` for strict single-attempt behavior.

### Exit codes
- `0`: success
- `1`: generic failure
- `2`: invalid usage
- `3`: policy refusal (missing license metadata with `--require-license`)
- `4`: partial download failure

### Commands
- `search <query>`
- `fetch [ids..]`
- `download [ids..]`
- `urls [query] --ids <id...>`
- `categories <list|tree|search|show>`
- `config`
- `help [command]`

## Acceptance criteria
- [ ] Flags and commands match current CLI implementation.
- [ ] Examples run successfully with current scripts.
- [ ] Output notes align with schema files.
- [ ] Risks and assumptions are explicit.
- [ ] Table of contents matches section headings.

## Evidence bundle
- Standards mapping: CommonMark structure, accessibility (descriptive links), security/privacy (license guidance).
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
