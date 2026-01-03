# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning.

## [Unreleased]

### Added
- Core Node/TypeScript CLI for arXiv search, fetch, download, and category navigation.
- Query builder + Atom XML parsing.
- Config layering (flags > env > project > user).
- Rate limiting, retries with exponential backoff, and optional debug logging.
- Unit tests for parser and query builder.
