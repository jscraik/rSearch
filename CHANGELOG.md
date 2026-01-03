# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-01-03

### Added
- CLI commands: search, fetch, download, urls, categories, config.
- Output formats: human, plain, JSON (schema in `schemas/cli-output.schema.json`).
- PDF download and text export to Markdown/JSON with optional `--keep-pdf`.
- License metadata surfaced; `--require-license` filtering with policy exit codes.
- Rate limiting, retries with backoff, optional disk cache.
- Comprehensive docs, security workflows, and tests.

### Added
- Core Node/TypeScript CLI for arXiv search, fetch, download, and category navigation.
- Query builder + Atom XML parsing.
- Config layering (flags > env > project > user).
- Rate limiting, retries with exponential backoff, and optional debug logging.
- Unit tests for parser and query builder.
