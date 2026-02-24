# Tooling and command policy

## Shell and search defaults
- Run commands with `zsh -lc`.
- Use `rg` for text search.
- Use `fd` for file discovery.
- Use `jq` for JSON parsing and transforms.

## Package and scripts
- Package manager: `npm`.
- Install deps: `npm install`.
- Dev CLI: `npm run dev -- <args>`.
- Build: `npm run build`.
- Typecheck: `npm run typecheck`.
- Test: `npm test`.
- CI bundle: `npm run ci`.

## Docs and API tasks
- Link check: `npm run docs:check-links`.
- API docs generation: `npm run docs:api`.

## Change control
- Ask before adding dependencies.
- Ask before changing system settings.
- Keep execution single-threaded unless explicitly requested.
