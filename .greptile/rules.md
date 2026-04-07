# Harness-managed Greptile rules

## Scope

These rules define the baseline Greptile review expectations for harness-managed repositories.

## Rule set

### 1) Independent validation is mandatory

- The coding agent must not act as approving reviewer on the same PR.
- Every merge-ready decision requires an independent review signal.

### 2) Governance surfaces must stay aligned

If a PR changes governance, workflow, or policy files, reviewers must verify consistency across:

- `harness.contract.json`
- `CONTRIBUTING.md`
- `README.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/*.yml`

### 3) Policy changes require evidence

- Policy, workflow, or review-gate changes must include test and validation evidence.
- Any reduction in mandatory checks or review gates is high risk.

### 4) Merge confidence threshold

- Confidence below `4/5` is merge-blocking.
- Confidence `4/5` may merge only when remaining items are low-risk polish.
- Confidence `5/5` is merge-ready.
