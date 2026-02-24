# Validation and checks

Use fail-fast order; stop on first failure and fix before continuing.

## Documentation-only changes
1. Verify referenced files exist with `rg --files`.
2. Run `npm run docs:check-links`.

## Code or behavior changes
1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `npm run build`.
4. Run `npm run ci` before release-facing changes.

## Release guardrails
- `preversion` enforces main branch and prepublish checks.
- `prepublishOnly` runs `npm run ci`.
