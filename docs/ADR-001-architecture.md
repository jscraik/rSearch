# ADR-001: CLI Architecture and API Access

Last updated: 2026-01-07

## Doc requirements
- Audience: Maintainers and contributors reviewing architectural decisions.
- Scope: Rationale and decision for CLI architecture and API access.
- Non-scope: Implementation details (see `src/`).
- Doc owner: jscraik.
- Review cadence: Each release.
- Required approvals: 1 maintainer.

## Status
Accepted

## Context
We need a modern CLI to query the arXiv API, fetch metadata, download PDFs, and
make category navigation easy and script-friendly.

## Decision
Implement a Node/TypeScript CLI with:
- HTTP GET requests to the arXiv API Atom endpoint.
- A strict query builder for search and id_list queries.
- Atom XML parsing into typed JSON objects.
- Config precedence: flags > env > project config > user config.
- Rate limiting, retries, and timeouts for resilience.

## Consequences
- Users get a single, composable CLI with stable output modes.
- API usage respects arXiv constraints (rate limit, page size).
- No server component is required.

## Risks and assumptions
- Assumes arXiv API stability and continued availability of Atom endpoints.
- Node/TypeScript runtime constraints influence deployment options.
- Changes to arXiv rate limits may require future CLI updates.

## Acceptance criteria
- [ ] Decision and context remain accurate.
- [ ] Consequences are explicit and balanced.
- [ ] Risks and assumptions are stated.
- [ ] Ownership and cadence are stated.
- [ ] References to code location are accurate.

## Evidence bundle
- Standards mapping: CommonMark structure, ADR best practices.
- Automated checks: vale run on 2026-01-07 (0 errors, 0 warnings).
- Review artifact: Self-review completed on 2026-01-07.
- Deviations: None.
