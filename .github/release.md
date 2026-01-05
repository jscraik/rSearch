# Release Process

This document outlines the automated release process for @brainwav/arxiv-cli.

## Automated Release Workflows

### 1. Manual Release (Recommended)

Trigger a release manually with full control:

```bash
# Go to GitHub Actions → Release workflow → Run workflow
# Choose version type: patch, minor, or major
# Optionally run as dry-run first
```

### 2. Auto Release (Conventional Commits)

Automatic releases based on conventional commit messages:

- `feat:` → minor version bump
- `fix:`, `perf:` → patch version bump  
- `feat!:`, `fix!:`, or `BREAKING CHANGE` → major version bump

### 3. Local Release

For manual local releases:

```bash
# Patch release (0.1.0 → 0.1.1)
npm run release

# Minor release (0.1.0 → 0.2.0)  
npm run release:minor

# Major release (0.1.0 → 1.0.0)
npm run release:major
```

## What Happens During Release

1. **CI Checks**: Run tests, linting, and build
2. **Version Bump**: Update package.json version
3. **Changelog Update**: Move unreleased changes to new version section
4. **Git Operations**: Commit, tag, and push changes
5. **NPM Publish**: Publish to npm registry with provenance
6. **GitHub Release**: Create release with changelog notes

## Conventional Commits

Use these commit message formats for auto-releases:

```bash
feat: add new search filter option
fix: resolve PDF download timeout issue
perf: improve query parsing performance
docs: update API documentation
chore: update dependencies

# Breaking changes
feat!: change CLI argument structure
fix!: remove deprecated --legacy flag
```

## Prerequisites

### GitHub Secrets

Set these secrets in your GitHub repository:

- `NPM_TOKEN`: npm authentication token with publish permissions

### NPM Setup

1. Create npm account and verify email
2. Generate access token: `npm token create --access public`
3. Add token to GitHub secrets as `NPM_TOKEN`

## Changelog Format

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [Unreleased]

### Added
- New features

### Changed  
- Changes to existing functionality

### Fixed
- Bug fixes

## [1.0.0] - 2026-01-05
### Added
- Initial release
```

## Troubleshooting

### Release Failed

- Check GitHub Actions logs
- Verify NPM_TOKEN is valid
- Ensure all CI checks pass
- Check for merge conflicts

### Changelog Issues

- Run `npm run changelog:update` locally to test
- Verify CHANGELOG.md format matches template
- Check for proper version sections

### NPM Publish Issues

- Verify package name availability
- Check npm token permissions
- Ensure version doesn't already exist
