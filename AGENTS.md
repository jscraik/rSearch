# rSearch Agent Guide

<!-- AGENT-FIRST-SCAFFOLD:START -->
## Agent-First Scaffold Contract (managed by ~/.codex)

Use the repository's commands below for project verification. The global
scaffold convention applies when a task explicitly selects it.

Global references for a selected scaffold task:

- `/Users/jamiecraik/.codex/instructions/openai-agent-workflow-playbook.md`
- `/Users/jamiecraik/.codex/instructions/README.checklist.md`
- `/Users/jamiecraik/.codex/instructions/validator-contracts.md`
- `/Users/jamiecraik/.codex/instructions/strict-toggle-governance.md`
- `/Users/jamiecraik/.codex/instructions/agent-first-scaffold-spec.md`

Repo-level requirements:

- When a task selects the scaffold convention, maintain `.agent/PLANS.md`
  using the `tasks / id / depends_on` contract and validate it with:
  `python3 /Users/jamiecraik/.codex/scripts/plan-graph-lint.py <plan-file>`
- Run project verification from this repository root:
  `bash scripts/verify-work.sh --fast --all`.
  The repository-owned runner performs preflight, project-local governance,
  lint, typecheck and the full test suite. Its default (without `--fast`)
  delegates to the package `check` script after preflight and governance.
  A Configs/global verifier result does not verify rSearch.

The scaffold's rollout levels are illustrative until a repository implements
them; they are not switches or state transitions enforced by the plan linter.
<!-- AGENT-FIRST-SCAFFOLD:END -->
