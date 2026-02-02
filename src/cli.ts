#!/usr/bin/env npx tsx
/**
 * Google Drive CLI
 *
 * Commands are namespaced by resource type:
 *   folders-list                 List files in a folder
 *   files-search                 Search for files
 *   files-rename                 Rename a file
 *   files-delete                 Delete a file
 *   files-comments               List/reply/resolve comments
 *   docs-read                    Read a Google Doc as text
 *   docs-create                  Create a new Google Doc
 *   docs-update                  Update a Google Doc
 *   docs-revisions               List/diff revisions
 *   sheets-read                  Read data from a Google Sheet
 *   sheets-write                 Write data to a Google Sheet
 *   sheets-append                Append rows to a Google Sheet
 *
 * Setup:
 *   1. Download OAuth credentials.json from Google Cloud Console
 *   2. Run: npm install (in this directory)
 *   3. Run any command - browser will open for consent
 *
 * Examples:
 *   npx tsx src/cli.ts folders-list "<folder-id>"
 *   npx tsx src/cli.ts docs-read "1abc123..."
 *   npx tsx src/cli.ts sheets-read "1abc..." "Sheet1"
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
  // Folders
  'folders-list': { main: list.main, description: 'List files in a folder' },

  // Files (general operations)
  'files-search': { main: search.main, description: 'Search for files' },
  'files-rename': { main: rename.main, description: 'Rename a file' },
  'files-delete': { main: deleteCmd.main, description: 'Delete a file by ID' },
  'files-comments': { main: comments.main, description: 'List/reply/resolve comments' },

  // Docs
  'docs-read': { main: read.main, description: 'Read a Google Doc as text' },
  'docs-create': { main: create.main, description: 'Create a new Google Doc' },
  'docs-update': { main: update.main, description: 'Update a Google Doc content' },
  'docs-revisions': { main: revisions.main, description: 'List/diff Google Doc revisions' },

  // Sheets
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
    console.log(`  ${name.padEnd(16)} ${cmd.description}`);
  }
  console.log('');
  console.log('Setup:');
  console.log('  1. Run: gcloud auth application-default login \\');
  console.log('       --scopes="https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/drive.file"');
  console.log('  2. Run: npm install (in this directory)');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx src/cli.ts folders-list "<folder-id>"');
  console.log('  npx tsx src/cli.ts docs-read "1abc123..."');
  console.log('  npx tsx src/cli.ts files-search "report" --docs-only');
  console.log('  npx tsx src/cli.ts docs-create "New Doc" --folder "<folder-id>"');
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
