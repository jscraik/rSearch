# Diagram Context Pack

This file is refreshed by the diagram pipeline for **rsearch**.

## Table of Contents

- [Usage for agents](#usage-for-agents)
- [Manual refresh](#manual-refresh)
- [Expected outputs](#expected-outputs)

When source files change, the diagram workflow:

1. Generates Mermaid diagrams from repository structure
2. Refreshes diagram artifacts under `ai/diagrams/`
3. Updates this context summary when architecture changes

## Usage for agents

Use this file to quickly understand:

- CLI entry points (`src/cli.ts`, command modules)
- arXiv query/download flow and parser/client boundaries
- test coverage for CLI behavior and parser/client utilities

## Manual refresh

```bash
# Ensure dependencies are installed
npm install

# Generate diagrams
npm exec diagram all . --output-dir ai/diagrams
```

## Expected outputs

- Mermaid sources and rendered assets under `ai/diagrams/`
- No unrelated source changes from diagram generation alone
