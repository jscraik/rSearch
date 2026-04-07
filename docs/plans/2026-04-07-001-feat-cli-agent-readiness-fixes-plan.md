---
status: active
depth: standard
created: 2026-04-07
author: claude
---

# Plan: CLI Agent-Readiness Fixes

## Problem Frame

The rsearch CLI scores well on structured output (--json envelope, versioned schemas, exit codes 0-4) but has gaps that degrade the experience for autonomous agents and scripted pipelines:

1. Subcommands lack examples — agents can't discover usage from `--help` alone
2. Numeric bounds are undocumented — agents hit validation errors unnecessarily
3. No dry-run for downloads — agents waste bandwidth before knowing what would happen
4. Non-TTY output defaults to human-readable — agents must explicitly pass `--json`
5. Error messages lack invocation hints — agents can't self-correct from errors
6. Pipeline composition is undocumented — agents don't know `--plain` feeds into `cut`/`awk`
7. Large ID batches have no guard — agents silently send 500+ IDs without bounding
8. Category list has no output limit — agents dump the full 150+ category taxonomy

**Scope boundary:** All changes target `src/cli.ts` with supporting changes in `src/config.ts` (RSEARCH_OUTPUT env var). No changes to the ArxivClient, output envelope schema, or exit code semantics.

**Non-goals:** Refactoring `cli.ts` into multiple files, adding new commands, changing the JSON envelope format, or bumping schema versions.

---

## Implementation Units

### IU-1: Add `.example()` to all subcommands

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Add `.example()` calls to each command builder so `rsearch <command> --help` shows usage examples.

**Decisions:**
- Place `.example()` on the builder yargs instance (`y`) inside each command's builder function — this is the yargs 18.x pattern for command-level examples
- Use `$0` interpolation so examples show the actual binary name
- Each command gets 1-2 examples covering the most common agent use case (pipe-friendly output) and the most common human use case

**Examples to add (per command):**

| Command | Example |
|---------|---------|
| `search` | `$0 search "cat:cs.AI" --max-results 5 --sort-by submittedDate` |
| `fetch` | `$0 fetch 2101.00001 2101.00002 --json` |
| `download` | `$0 download 2101.00001 --out-dir ./papers` |
| `urls` | `$0 urls "cat:cs.AI" --max-results 5 --plain` |
| `categories list` | `$0 categories list --group "Computer Science"` |
| `categories tree` | `$0 categories tree` |
| `categories search` | `$0 categories search "machine learning"` |
| `categories show` | `$0 categories show cs.AI` |

**Test scenarios:**
- `rsearch search --help` output contains `cat:cs.AI`
- `rsearch fetch --help` output contains `2101.00001`
- `rsearch download --help` output contains `--out-dir`
- `rsearch categories list --help` output contains `--group`

---

### IU-2: Document bounds in option descriptions

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Append bound information to `describe` strings for `--max-results` and `--page-size` options across all commands where they appear.

**Decisions:**
- Inline the bound into the existing `describe` string rather than adding new `.check()` logic (bounds validation already exists in `validatePagingArgs`)
- Format: `"Max results to return (default 100, max 30000)"` — concise, machine-skimmable
- Apply consistently across all 4 commands that use `--max-results` (search, fetch, download, urls) and all that use `--page-size`

**Changes:**

| Option | Current describe | New describe |
|--------|-----------------|--------------|
| `--max-results` | `"Max results to return"` | `"Max results to return (default 100, max 30000)"` |
| `--page-size` | `"API page size (<=2000)"` | `"API page size (max 2000)"` |

Apply to: search (line 207, 208), fetch (line 272, 273), download (line 332, 333), urls (line 464, 465).

**Test scenarios:**
- `rsearch search --help` output contains `default 100, max 30000`
- `rsearch search --help` output contains `max 2000` for page-size

---

### IU-3: Add `--dry-run` to download command

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Add a `--dry-run` boolean flag to the download command. When set, resolve IDs, check file existence, and output a download plan without actually downloading.

**Decisions:**
- **Resolution only:** Fetch metadata (needed for license checks and path planning) but skip `client.download()` and `downloadAsTextFormats()`
- **Output format:** Reuse existing `outputResult()` with schema `arxiv.download.dryrun.v1` — each entry has `{ id, path, status }` where status is `"would-download"` | `"would-skip"` (file exists) | `"would-fail"` (license missing)
- **Exit code:** Always 0 (dry-run never fails), unless license metadata is missing and `--require-license` is set (exit 3)
- **No network for ID-only mode:** When `--dry-run` is used with explicit IDs (no `--query`), skip the metadata fetch and just report file existence. When `--query` is used, the search API call is unavoidable (needed to resolve IDs)
- **Reuses `createClientContext()`:** Config, rate limits, and caching still apply

**Implementation approach:**
Add `--dry-run` option to download command builder. In the handler, after resolving IDs, branch:
```
if (args.dryRun) {
  // For each ID: check file existence, produce { id, path, status: "would-download" | "would-skip" }
  // If --require-license: fetch metadata, apply license filter, mark filtered as "would-fail"
  // Output via outputResult with schema "arxiv.download.dryrun.v1"
  return;
}
```

**Test scenarios:**
- `rsearch download 2101.00001 --dry-run --json` outputs `{ schema: "arxiv.download.dryrun.v1", data: { results: [{ id: "2101.00001", path: "...", status: "would-download" }] } }`
- `rsearch download 2101.00001 --dry-run --out-dir /tmp` exits 0, no file created
- `rsearch download 2101.00001 --dry-run --require-license --json` with missing license shows `would-fail` status
- Existing download tests still pass (no regressions)

---

### IU-4: Auto-detect non-TTY output format + RSEARCH_OUTPUT env var

**Files:** `src/cli.ts`, `src/config.ts`
**Test file:** `tests/cli.test.ts`

**What:** When stdout is not a TTY and no output flag (`--json`/`--plain`/`--quiet`) is explicitly set, default to `--json`. Also support `RSEARCH_OUTPUT` env var as an explicit override.

**Decisions:**
- **Detection point:** Modify `outputResult()` (line 947) — before checking `args.json`, resolve the effective output mode considering TTY state and env var
- **RSEARCH_OUTPUT values:** `"json"` | `"plain"` | `"quiet"` — parsed in `envConfig()` alongside existing `RSEARCH_*` vars, validated with a simple enum check
- **Precedence:** Explicit CLI flag (`--json`/`--plain`/`--quiet`) > `RSEARCH_OUTPUT` env var > auto-detect (`!stdout.isTTY` → json) > default (human)
- **No behavior change for TTY:** When stdout is a TTY and no flag is set, human-readable output remains the default
- **`isJsonRequested()` update:** Also check `RSEARCH_OUTPUT` and TTY state so the `.fail()` handler and `emitError()` produce JSON errors when auto-detected
- **Backward compatibility:** Explicit `--json`/`--plain`/`--quiet` still works exactly as before. The new logic only activates when no flag is set

**Implementation approach:**

1. Add to `src/config.ts` `envConfig()`:
   ```ts
   output: parseOutputEnv("RSEARCH_OUTPUT", process.env.RSEARCH_OUTPUT),
   ```
   Where `parseOutputEnv` validates against `"json" | "plain" | "quiet"` and returns `undefined` when unset.

2. Add `output?: "json" | "plain" | "quiet"` to `FileConfig` type.

3. In `src/cli.ts`, add a `resolveOutputMode(args)` helper:
   ```ts
   const resolveOutputMode = (args: OutputArgs): "json" | "plain" | "quiet" | "human" => {
     if (args.json) return "json";
     if (args.plain) return "plain";
     if (args.quiet) return "quiet";
     const envOutput = process.env.RSEARCH_OUTPUT;
     if (envOutput === "json" || envOutput === "plain" || envOutput === "quiet") return envOutput;
     if (!process.stdout.isTTY) return "json";
     return "human";
   };
   ```

4. Update `outputResult()` to use `resolveOutputMode()` instead of checking `args.json`/`args.plain`/`args.quiet` directly.

5. Update `isJsonRequested()` to also check resolved output mode for consistent error formatting.

**Test scenarios:**
- `rsearch config` with piped stdout (not TTY) outputs JSON envelope
- `RSEARCH_OUTPUT=plain rsearch config` outputs tab-separated plain
- `rsearch config --plain` explicitly still works (flag overrides env/auto)
- `rsearch config --json` explicitly still works
- Error case: `RSEARCH_OUTPUT=invalid rsearch config` exits 2 with E_VALIDATION
- `isJsonRequested()` returns true when stdout is not TTY and no flag set (for error envelope formatting)

---

### IU-5: Enrich error messages with example invocations

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Append a short example invocation to error messages thrown for missing required arguments, so agents can self-correct without reading help text.

**Decisions:**
- **Scope:** Only enrich errors thrown in `resolveIds()`, `resolveQuery()`, and the handler-level "provide X" errors. Do not modify validation errors (those already state the constraint)
- **Format:** Append `\nExample: rsearch <command> <example>` to the error message
- **Keep messages single-line for JSON:** The `\n` renders as newline in human mode but JSON error messages already contain newlines in the envelope. This is fine — the `message` field in the JSON envelope is a string and can contain newlines

**Changes:**

| Location | Current message | New message |
|----------|----------------|-------------|
| `resolveIds` no-input (line 664) | `"Provide arXiv IDs; stdin disabled by --no-input."` | `"Provide arXiv IDs; stdin disabled by --no-input.\nExample: rsearch fetch 2101.00001 2101.00002"` |
| `resolveIds` TTY (line 667) | `"Provide arXiv IDs or pipe them via stdin."` | `"Provide arXiv IDs or pipe them via stdin.\nExample: rsearch fetch 2101.00001 or echo '2101.00001' \| rsearch fetch"` |
| `resolveQuery` no-input (line 676) | `"Provide a query string; stdin disabled by --no-input."` | `"Provide a query string; stdin disabled by --no-input.\nExample: rsearch search 'cat:cs.AI'"` |
| `resolveQuery` TTY (line 679) | `"Provide a query string or pipe it via stdin."` | `"Provide a query string or pipe it via stdin.\nExample: rsearch search 'cat:cs.AI' or echo 'cat:cs.AI' \| rsearch search"` |
| search handler (line 222) | `"Provide a search query."` | `"Provide a search query.\nExample: rsearch search 'cat:cs.AI' --max-results 5"` |
| fetch handler (line 277) | `"Provide one or more arXiv IDs."` | `"Provide one or more arXiv IDs.\nExample: rsearch fetch 2101.00001 2101.00002"` |
| download handler (line 350) | `"Provide arXiv IDs or a --query to download."` | `"Provide arXiv IDs or a --query to download.\nExample: rsearch download 2101.00001 --out-dir ./papers"` |
| urls handler (line 483) | `"Provide a search query or IDs via --ids."` | `"Provide a search query or IDs via --ids.\nExample: rsearch urls 'cat:cs.AI' or rsearch urls --ids 2101.00001"` |

**Test scenarios:**
- `rsearch fetch --no-input --json` error message contains `Example: rsearch fetch`
- `rsearch search --json` error message contains `Example: rsearch search`
- `rsearch download --json` error message contains `Example: rsearch download`
- Existing error code checks still pass (E_USAGE, exit code 2)

---

### IU-6: Document pipeline composition in help text

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Add `.epilog()` to key commands showing pipeline composition patterns. Replace the current single global epilog with command-specific epilogs that include pipeline examples.

**Decisions:**
- **Global epilog stays:** Keep `"Docs: https://clig.dev | Support: jscraik@brainwav.io"` at the root level
- **Command epilogs are additive:** Each command's builder gets an `.epilog()` showing pipe-friendly usage
- **Focus on 3 pipeline patterns:**
  1. ID chaining: `rsearch search --plain | cut -f1 | rsearch fetch`
  2. URL extraction: `rsearch urls --quiet > urls.txt`
  3. JSON processing: `rsearch search --json | jq '.data.entries[].id'`

**Examples to add (per command):**

| Command | Epilog |
|---------|--------|
| `search` | `Pipeline: rsearch search "cat:cs.AI" --plain \| cut -f1 \| xargs rsearch fetch` |
| `fetch` | `Pipeline: echo "2101.00001" \| rsearch fetch --json \| jq '.data.entries[0].title'` |
| `download` | `Pipeline: rsearch search "cat:cs.AI" --plain \| cut -f1 \| xargs rsearch download` |
| `urls` | `Pipeline: rsearch urls "cat:cs.AI" --quiet > pdf_urls.txt` |
| `categories list` | `Pipeline: rsearch categories list --ids-only --group "Computer Science"` |

**Test scenarios:**
- `rsearch search --help` output contains `Pipeline:`
- `rsearch fetch --help` output contains `jq`
- `rsearch download --help` output contains `xargs`

---

### IU-7: Soft warning when >50 IDs passed to fetch without --max-results

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** When the `fetch` command receives more than 50 IDs and `--max-results` is not explicitly set, emit a warning to stderr. Do NOT block execution — the fetch still proceeds.

**Decisions:**
- **Warning target:** `fetch` command only (search already has `--max-results`; download has `--query` for batch)
- **Threshold:** 50 IDs — matches arXiv API practical batch limits
- **Output:** Warning goes to stderr (not stdout) so it doesn't corrupt JSON/plain output
- **Format (human):** `Warning: Fetching 123 IDs without --max-results. Consider adding --max-results to bound the response.`
- **Format (JSON):** Include in the `summary` field and set `status: "warn"`. Do NOT change exit code.
- **Do not warn in JSON mode to stderr** — the warning is embedded in the JSON envelope instead
- **Flag is advisory:** `--max-results` is not required. The warning is informational only

**Implementation approach:**

In the `fetch` handler, after `resolveIds()`:
```ts
const ids = await resolveIds(args.ids, args.input === false);
const warnLargeBatch = ids.length > 50 && args.maxResults === undefined;

if (warnLargeBatch && !args.json && !args.plain && !args.quiet) {
  process.stderr.write(`Warning: Fetching ${ids.length} IDs without --max-results. Consider adding --max-results to bound the response.\n`);
}
```

Then in `outputResult`, if `warnLargeBatch`, set `status: "warn"` and append to summary.

**Test scenarios:**
- `rsearch fetch` with 51 IDs (via stdin) prints warning to stderr
- `rsearch fetch` with 50 IDs does not print warning
- `rsearch fetch` with 51 IDs and `--max-results 100` does not print warning (explicitly bounded)
- `rsearch fetch` with 51 IDs and `--json` embeds warning in JSON envelope status/summary, not stderr
- Exit code remains 0 (warning does not change exit code)

---

### IU-8: Add `--limit` to categories list

**Files:** `src/cli.ts`
**Test file:** `tests/cli.test.ts`

**What:** Add a `--limit` option to the `categories list` subcommand to cap the number of categories returned.

**Decisions:**
- **Type:** Positive integer, validated by `coercePositiveInt`
- **Default:** No limit (return all categories — backward compatible)
- **Apply after filtering:** `--limit` applies after `--group` filtering, so `--limit 10 --group "Computer Science"` returns up to 10 CS categories
- **Affects all output modes:** JSON array is truncated, plain/human text is truncated, quiet text is truncated
- **Summary includes total:** `"Returned 10 of 155 category(ies)"` when limit is set, showing both the capped count and total available

**Implementation approach:**

In `categories list` builder, add:
```ts
.option("limit", { type: "number", describe: "Max categories to return" })
```

In the handler, after `filterByGroup()`:
```ts
const limited = args.limit ? categories.slice(0, args.limit) : categories;
const summary = args.limit
  ? `Returned ${limited.length} of ${categories.length} category(ies)`
  : `Returned ${categories.length} category(ies)`;
```

Pass `limited` to all output formatters instead of `categories`.

**Test scenarios:**
- `rsearch categories list --limit 5 --json` returns exactly 5 categories in the JSON array
- `rsearch categories list --limit 5` summary says `"Returned 5 of N category(ies)"`
- `rsearch categories list` (no limit) returns all categories (backward compatible)
- `rsearch categories list --limit 0` exits 2 with E_VALIDATION (coercePositiveInt rejects 0)
- `rsearch categories list --limit abc` exits 2 with E_VALIDATION

---

## Dependencies and Sequencing

```
IU-1 (examples) ─────────┐
IU-2 (bounds docs) ───────┤
IU-5 (error enrichment) ──┤── independent, can run in any order
IU-6 (pipeline epilogs) ──┤
IU-8 (--limit categories)─┘
         │
         ▼
IU-7 (batch warning) ───── depends on IU-5 error message format being stable
         │
         ▼
IU-4 (non-TTY auto-detect) ─ depends on outputResult() being stable
         │
         ▼
IU-3 (--dry-run download) ── depends on IU-4 (dry-run should respect auto-json)
```

**Recommended implementation order:** IU-1 → IU-2 → IU-5 → IU-6 → IU-8 → IU-7 → IU-4 → IU-3

---

## System-Wide Impact

- **Affected parties:** CLI users (human and agent), CI pipelines using `rsearch`, downstream scripts piping rsearch output
- **Risk:** Low. All changes are additive — no existing behavior is removed or changed unless the user opts in via new flags or is in a non-TTY context
- **Breaking change surface:** IU-4 (non-TTY auto-json) is the only potentially surprising change — agents that currently parse human-readable output from pipes will start receiving JSON. This is intentional (agents should prefer JSON) but worth noting in the changelog

---

## Verification Strategy

### Automated checks
- `npm run typecheck` — no type errors
- `npm test` — all existing tests pass
- New tests added to `tests/cli.test.ts` for each IU

### Manual verification
- `rsearch search --help` shows examples and bounds
- `rsearch download 2101.00001 --dry-run` outputs plan without downloading
- `rsearch config | jq .` works (non-TTY auto-json)
- `rsearch fetch $(seq 1 60 | sed 's/^/2101.0000/') 2>&1 | grep Warning` shows batch warning

### Standards mapping
- **clig.dev compliance:** Help text, examples, and pipeline documentation follow Command Line Interface Guidelines
- **POSIX output conventions:** stderr for warnings/diagnostics, stdout for data
- **JSON Schema stability:** No existing schemas modified; new schema `arxiv.download.dryrun.v1` follows existing pattern

### Checks executed
- TypeScript typecheck (required before commit)
- Vitest test suite (required before commit)
- `npm run ci` (pre-push hook enforces this)

### Review artifact
- Self-review against existing patterns in `src/cli.ts` (option definitions, outputResult contract, error routing)

### Deviations/risks
- IU-4 (non-TTY auto-json) changes default behavior for piped output — agents that currently parse human-readable piped output will break. This is an intentional improvement. Document in changelog as a potentially breaking change for non-human consumers.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Non-TTY auto-json breaks existing pipe scripts | Medium | Medium | Document in changelog; `RSEARCH_OUTPUT=human` escape hatch |
| `cli.ts` grows beyond 1200 LOC | High | Low | Already at 1082; 8 changes add ~100 lines. Acceptable for now, extraction is a future improvement backlog item |
| `--dry-run` with `--query` still makes API call | Expected | Low | Document in help text that `--query` requires API access to resolve IDs |
