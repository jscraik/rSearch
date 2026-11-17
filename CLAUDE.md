# Claude AI Governance

This repository contains governance rules for Claude Code and other AI assistants
working in this codebase.

---

## AI Assistance Governance (Model A)

This project follows **Model A** AI artifact governance: prompts and session logs
are committed artifacts in the repository.

## When creating PRs with AI assistance

Claude must:

1. **Save artifacts to `ai/` directory**:
   - Final prompt → `ai/prompts/YYYY-MM-DD-<slug>.yaml`
   - Session summary → `ai/sessions/YYYY-MM-DD-<slug>.json`

2. **Commit both files in the PR branch**:

   ```bash
   git add ai/prompts/YYYY-MM-DD-<slug>.yaml ai/sessions/YYYY-MM-DD-<slug>.json
   ```

3. **Reference exact paths in PR body**:
   - Under **AI assistance** section:
     - Prompt: `ai/prompts/YYYY-MM-DD-<slug>.yaml`
     - Session: `ai/sessions/YYYY-MM-DD-<slug>.json`
   - In **AI Session Log** details:
     - Log file: `ai/sessions/YYYY-MM-DD-<slug>.json`
     - Prompt file: `ai/prompts/YYYY-MM-DD-<slug>.yaml`

4. **Do NOT**:
   - Embed prompt/log excerpts in the PR body
   - Link to external logs or pastebins
   - Skip creating artifacts when AI assistance is acknowledged

5. **Abort** if artifacts cannot be created and committed.

## Artifact Templates

See `ai/prompts/.template.yaml` and `ai/sessions/.template.json` for required fields.

## PR Template

All PRs must use `.github/PULL_REQUEST_TEMPLATE.md` and record truthful validation
outcomes and review artifacts in its existing sections.

## Command preflight helper

- Before destructive or path-sensitive work, invoke the preflight CLI with
  `bash scripts/codex-preflight.sh`; use `--help` to select the required stack,
  binaries and paths. Do not source the CLI or infer its scope from command count.
- Validate required bins and target paths first so mistakes are prevented before
  edits.
