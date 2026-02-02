/**
 * Rename a file in Google Drive
 *
 * Usage:
 *   npx tsx src/cli.ts rename <file-id> <new-name>
 */

import { getDrive } from './auth.js';

interface RenameResult {
  id: string;
  name: string;
  url: string;
}

/**
 * Rename a file in Google Drive
 */
export async function renameFile(fileId: string, newName: string): Promise<RenameResult> {
  const drive = await getDrive();

  const response = await drive.files.update({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      name: newName,
    },
    fields: 'id, name, webViewLink',
  });

  return {
    id: response.data.id!,
    name: response.data.name!,
    url: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}`,
  };
}

// CLI handler
export async function main(args: string[]) {
  const fileId = args[0];
  const newName = args[1];

  if (!fileId || !newName) {
    console.error('Usage: rename <file-id> <new-name>');
    console.error('Example: rename "1abc..." "New Document Name"');
    process.exit(1);
  }

  console.log(`Renaming file: ${fileId}`);
  console.log(`New name: ${newName}`);
  console.log();

  const result = await renameFile(fileId, newName);

  console.log('✅ File renamed!');
  console.log(`   Name: ${result.name}`);
  console.log(`   ID: ${result.id}`);
  console.log(`   URL: ${result.url}`);
}
