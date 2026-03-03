# Harness utility Makefile for rsearch

.PHONY: \
	help install setup hooks \
	dev build \
	lint typecheck test ci check \
	docs-check-links \
	audit security \
	clean reset \
	diagrams env-check harness-preflight

help: ## Show available targets
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install npm dependencies
	npm install

setup: install hooks ## Install dependencies and configure git hooks

hooks: ## Install simple-git-hooks
	npm exec -- simple-git-hooks

dev: ## Run CLI in dev mode
	npm run dev

build: ## Build TypeScript
	npm run build

lint: ## Run type-focused lint gate
	npm run lint:types

typecheck: ## Run TypeScript typecheck
	npm run typecheck

test: ## Run tests
	npm test

ci: ## Run repo CI command
	npm run ci

check: lint typecheck test ## Run local quality checks

docs-check-links: ## Check markdown links
	npm run docs:check-links

audit: ## Run npm audit with repo policy
	npm run audit

security: audit ## Run security checks

clean: ## Remove generated artifacts
	rm -rf dist coverage artifacts

reset: clean ## Reset dependencies
	npm install

diagrams: ## Generate architecture diagrams
	npm exec -- diagram all . --output-dir ai/diagrams

env-check: ## Validate optional harness environment setup
	@bash scripts/check-environment.sh

harness-preflight: ## Run harness preflight gate against contract
	npm exec -- harness preflight-gate --contract harness.contract.json
