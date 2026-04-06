#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, rmSync, readdirSync } from 'fs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function reset() {
  console.log('\n⚠️  WARNING: This will delete all data!\n');
  console.log('The following will be removed:');
  console.log('  - SQLite database (scripts.sqlite)');
  console.log('  - All uploaded scripts');
  console.log('  - All log files');
  console.log('  - Run history\n');

  const answer = await question('Are you sure you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('\nReset cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\nResetting database...');

  // Remove SQLite database
  const dbPath = join(rootDir, 'scripts.sqlite');
  if (existsSync(dbPath)) {
    rmSync(dbPath);
    console.log('✓ Deleted database');
  }

  const dbJournalPath = join(rootDir, 'scripts.sqlite-journal');
  if (existsSync(dbJournalPath)) {
    rmSync(dbJournalPath);
    console.log('✓ Deleted database journal');
  }

  // Clear scripts directory (keep .gitkeep)
  const scriptsDir = join(rootDir, 'scripts');
  if (existsSync(scriptsDir)) {
    const files = readdirSync(scriptsDir);
    let scriptCount = 0;
    for (const file of files) {
      if (file !== '.gitkeep') {
        rmSync(join(scriptsDir, file));
        scriptCount++;
      }
    }
    console.log(`✓ Deleted ${scriptCount} script file(s)`);
  }

  // Clear logs directory (keep .gitkeep)
  const logsDir = join(rootDir, 'logs');
  if (existsSync(logsDir)) {
    const files = readdirSync(logsDir);
    let logCount = 0;
    for (const file of files) {
      if (file !== '.gitkeep') {
        rmSync(join(logsDir, file));
        logCount++;
      }
    }
    console.log(`✓ Deleted ${logCount} log file(s)`);
  }

  console.log('\n✓ Reset complete! All data has been deleted.\n');
  rl.close();
}

reset().catch(err => {
  console.error('Error during reset:', err);
  rl.close();
  process.exit(1);
});
