#!/usr/bin/env node

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const commitTypes = {
    'feat': 'A new feature',
    'fix': 'A bug fix',
    'docs': 'Documentation only changes',
    'style': 'Changes that do not affect the meaning of the code',
    'refactor': 'A code change that neither fixes a bug nor adds a feature',
    'perf': 'A code change that improves performance',
    'test': 'Adding missing tests or correcting existing tests',
    'chore': 'Changes to the build process or auxiliary tools',
    'ci': 'Changes to CI configuration files and scripts'
};

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createCommit() {
    console.log('🚀 Conventional Commit Helper\n');

    // Show commit types
    console.log('Available commit types:');
    Object.entries(commitTypes).forEach(([type, desc]) => {
        console.log(`  ${type.padEnd(10)} - ${desc}`);
    });
    console.log();

    const type = await question('Commit type: ');
    if (!commitTypes[type]) {
        console.log('❌ Invalid commit type');
        process.exit(1);
    }

    const scope = await question('Scope (optional): ');
    const breaking = await question('Breaking change? (y/N): ');
    const description = await question('Description: ');
    const body = await question('Body (optional): ');

    // Build commit message
    let message = type;
    if (scope) message += `(${scope})`;
    if (breaking.toLowerCase() === 'y') message += '!';
    message += `: ${description}`;

    if (body) {
        message += `\n\n${body}`;
    }

    if (breaking.toLowerCase() === 'y') {
        const breakingDesc = await question('Breaking change description: ');
        message += `\n\nBREAKING CHANGE: ${breakingDesc}`;
    }

    console.log('\n📝 Commit message:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));

    const confirm = await question('\nCommit this message? (Y/n): ');
    if (confirm.toLowerCase() === 'n') {
        console.log('❌ Commit cancelled');
        process.exit(0);
    }

    try {
        execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
        console.log('✅ Commit created successfully!');
    } catch (error) {
        console.log('❌ Commit failed:', error.message);
        process.exit(1);
    }

    rl.close();
}

createCommit().catch(console.error);