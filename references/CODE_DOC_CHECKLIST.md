# Code Documentation QA Checklist

Use this checklist when updating in-code documentation (JSDoc/TSDoc, Swift DocC, config docs).

## Public API coverage
- [ ] Public exports have summary, params, returns, and throws (if applicable).
- [ ] Examples included for non-obvious usage.
- [ ] Deprecated APIs include migration guidance.

## Behavior and constraints
- [ ] Docs describe behavior and constraints, not just intent.
- [ ] Side effects, error conditions, and invariants are documented.
- [ ] Performance or complexity notes included where non-trivial.

## Accessibility and safety
- [ ] Accessibility contracts documented for UI components.
- [ ] Security-sensitive fields or config keys called out.

## Validation
- [ ] Docs align with implementation and tests.
- [ ] Schema or validation mechanism referenced for config docs.
