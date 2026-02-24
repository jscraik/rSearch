# Local memory workflow

Use local-memory MCP only for durable, non-sensitive facts.

## Required read path before writing
1. `bootstrap(mode="minimal", include_questions=true, session_id="repo:rsearch:task:<id>")`
2. `search(query="<topic>", session_id="repo:rsearch:task:<id>")`

## Write rules
- Store durable facts only with `observe(...)`.
- Use stable tags.
- Do not store secrets, tokens, keys, or PII.
