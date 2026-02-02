/**
 * Delete a Google Drive file
 *
 * Usage:
 *   npx tsx src/cli.ts delete <file-id>
 */

import { getDrive } from './auth.js';

/**
 * Delete a file by ID
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = await getDrive();
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

// CLI handler
export async function main(args: string[]) {
  const fileId = args[0];

  if (!fileId) {
    console.error('Usage: delete <file-id>');
    console.error('Example: delete "1abc123..."');
    process.exit(1);
  }

  console.log(`Deleting file: ${fileId}`);

  await deleteFile(fileId);

  console.log('✅ File deleted');
}
