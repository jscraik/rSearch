# Contradictions and cleanup

## Resolved contradiction
1. Repository posture source conflict:
   - Input statement described a "configuration-only repo" with package manager "none".
   - Observed repo facts show a Node CLI with `package.json`, `package-lock.json`, and npm scripts.
   - Resolution (confirmed by user): canonical guidance follows observed npm-based repo facts.

## Flag for deletion or consolidation
1. Keep shared policy in `AGENTS.md` + `docs/agents/*`; avoid duplicating shared rules across assistant-specific files.
