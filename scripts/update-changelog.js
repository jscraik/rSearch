#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

/**
 * Updates CHANGELOG.md with the current version and date
 * Moves unreleased changes to the new version section
 */

function updateChangelog() {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const today = new Date().toISOString().split('T')[0];

    let changelog = readFileSync('CHANGELOG.md', 'utf8');

    // Replace [Unreleased] with the new version
    const unreleasedRegex = /## \[Unreleased\]/;
    const newVersionHeader = `## [Unreleased]

### Added

### Changed

### Fixed

## [${version}] - ${today}`;

    if (unreleasedRegex.test(changelog)) {
        changelog = changelog.replace(unreleasedRegex, newVersionHeader);
    } else {
        // If no unreleased section exists, add one
        const firstVersionRegex = /(## \[\d+\.\d+\.\d+\])/;
        if (firstVersionRegex.test(changelog)) {
            changelog = changelog.replace(firstVersionRegex, `${newVersionHeader}\n\n$1`);
        } else {
            // Add after the doc requirements section
            const docRequirementsEnd = /## \[Unreleased\]|## Doc requirements[\s\S]*?(?=## )/;
            changelog = changelog.replace(docRequirementsEnd, `$&\n${newVersionHeader}\n\n`);
        }
    }

    // Update the "Last updated" date
    changelog = changelog.replace(
        /Last updated: \d{4}-\d{2}-\d{2}/,
        `Last updated: ${today}`
    );

    writeFileSync('CHANGELOG.md', changelog);
    console.log(`✅ Updated CHANGELOG.md for version ${version}`);
}

try {
    updateChangelog();
} catch (error) {
    console.error('❌ Failed to update changelog:', error.message);
    process.exit(1);
}