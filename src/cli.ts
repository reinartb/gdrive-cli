#!/usr/bin/env npx tsx
/**
 * Google Drive CLI
 *
 * Commands:
 *   list <folder-path-or-id>     List files in a folder
 *   read <doc-id>                Read a Google Doc as text
 *   search <query> [--docs-only] Search for files
 *   create <title> [options]     Create a new Google Doc
 *   sheets-read <id> [range]     Read data from a Google Sheet
 *   sheets-write <id> <range> <json>  Write data to a Google Sheet
 *   sheets-append <id> <range> <json> Append rows to a Google Sheet
 *
 * Setup:
 *   1. Download OAuth credentials.json from Google Cloud Console
 *   2. Run: npm install (in this directory)
 *   3. Run any command - browser will open for consent
 *
 * Examples:
 *   npx tsx src/cli.ts list "/"
 *   npx tsx src/cli.ts read "1abc123..."
 *   npx tsx src/cli.ts sheets-read "1abc..." "Sheet1!A1:D10"
 *   npx tsx src/cli.ts sheets-append "1abc..." "A:C" '[["Jane",25]]'
 */

import * as list from './list.js';
import * as read from './read.js';
import * as search from './search.js';
import * as create from './create.js';
import * as update from './update.js';
import * as rename from './rename.js';
import * as revisions from './revisions.js';
import * as comments from './comments.js';
import * as deleteCmd from './delete.js';
import * as sheetsRead from './sheets-read.js';
import * as sheetsWrite from './sheets-write.js';

const commands: Record<string, { main: (args: string[]) => Promise<void>; description: string }> = {
  list: { main: list.main, description: 'List files in a folder' },
  read: { main: read.main, description: 'Read a Google Doc as text' },
  search: { main: search.main, description: 'Search for files' },
  create: { main: create.main, description: 'Create a new Google Doc' },
  update: { main: update.main, description: 'Update a Google Doc content' },
  rename: { main: rename.main, description: 'Rename a file' },
  revisions: { main: revisions.main, description: 'List/diff Google Doc revisions' },
  comments: { main: comments.main, description: 'List comments on a file' },
  delete: { main: deleteCmd.main, description: 'Delete a file by ID' },
  'sheets-read': { main: sheetsRead.main, description: 'Read data from a Google Sheet' },
  'sheets-write': { main: sheetsWrite.main, description: 'Write data to a Google Sheet' },
  'sheets-append': { main: sheetsWrite.appendMain, description: 'Append rows to a Google Sheet' },
};

function showHelp() {
  console.log('Google Drive CLI');
  console.log('');
  console.log('Usage: npx tsx src/cli.ts <command> [args]');
  console.log('');
  console.log('Commands:');
  for (const [name, cmd] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(10)} ${cmd.description}`);
  }
  console.log('');
  console.log('Setup:');
  console.log('  1. Run: gcloud auth application-default login \\');
  console.log('       --scopes="https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/drive.file"');
  console.log('  2. Run: npm install (in this directory)');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx src/cli.ts list "/"');
  console.log('  npx tsx src/cli.ts list "/Key For Her/Ads/Scripts"');
  console.log('  npx tsx src/cli.ts read "1abc123..."');
  console.log('  npx tsx src/cli.ts search "ad script" --docs-only');
  console.log('  npx tsx src/cli.ts create "New Brief" --folder "/Ads/Briefs"');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const cmd = commands[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help to see available commands');
    process.exit(1);
  }

  try {
    await cmd.main(args.slice(1));
  } catch (error: any) {
    if (error.message?.includes('Could not load the default credentials')) {
      console.error('');
      console.error('❌ Not authenticated. Run this command first:');
      console.error('');
      console.error('   gcloud auth application-default login \\');
      console.error('     --scopes="https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/drive.file"');
      console.error('');
      process.exit(1);
    }
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
