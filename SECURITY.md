# Security Policy

## Supported Versions

Only the latest minor release is supported.

## Reporting a Vulnerability

If you discover a security issue, please report it privately:

- Email: jscraik@brainwav.io
- Please include steps to reproduce, impact, and any proposed fixes.

We aim to acknowledge reports within 7 days.

## Scope

This project is a CLI client that talks to the public arXiv API over HTTPS.
It does not store credentials or user data beyond local output files created
explicitly by the user.

## Security automation

The repo uses automated security checks on pull requests and scheduled runs:
- CodeQL for static analysis.
- Semgrep for source scanning.
- npm audit for dependency vulnerabilities.
- Dependabot for dependency update PRs.
- Gitleaks for secret scanning in git history and changes.

## Dependency and lockfile policy
- Dependencies are managed with npm only.
- `package-lock.json` must be updated via npm and committed with dependency changes.
- Audit failures should be resolved by upgrading dependencies or opening a tracking issue.
