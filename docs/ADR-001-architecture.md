# ADR-001: CLI Architecture and API Access

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
