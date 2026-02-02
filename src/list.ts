/**
 * List files in a Google Drive folder
 *
 * Usage:
 *   npx tsx src/cli.ts list <folder-id-or-path>
 *   npx tsx src/cli.ts list "root"                    # List root folder
 *   npx tsx src/cli.ts list "1abc123..."              # List by folder ID
 */

import { getDrive } from './auth.js';

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

/**
 * List files in a folder by ID
 */
export async function listFolder(folderId: string = 'root'): Promise<FileInfo[]> {
  const drive = await getDrive();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime)',
    orderBy: 'name',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || []) as FileInfo[];
}

/**
 * Find a folder by path (e.g., "/Key For Her/Ads/Scripts")
 */
export async function findFolderByPath(path: string): Promise<string | null> {
  const drive = await getDrive();
  const parts = path.split('/').filter(p => p.length > 0);

  let currentFolderId = 'root';

  for (const folderName of parts) {
    const response = await drive.files.list({
      q: `'${currentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folder = response.data.files?.[0];
    if (!folder?.id) {
      return null; // Folder not found
    }
    currentFolderId = folder.id;
  }

  return currentFolderId;
}

/**
 * List files by folder path
 */
export async function listByPath(path: string): Promise<FileInfo[]> {
  const folderId = await findFolderByPath(path);
  if (!folderId) {
    throw new Error(`Folder not found: ${path}`);
  }
  return listFolder(folderId);
}

// CLI handler
export async function main(args: string[]) {
  const pathOrId = args[0] || 'root';

  let files: FileInfo[];

  if (pathOrId.startsWith('/')) {
    // It's a path
    console.log(`Listing folder: ${pathOrId}\n`);
    files = await listByPath(pathOrId);
  } else {
    // It's an ID or "root"
    console.log(`Listing folder ID: ${pathOrId}\n`);
    files = await listFolder(pathOrId);
  }

  if (files.length === 0) {
    console.log('(empty folder)');
    return;
  }

  // Group by type
  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const docs = files.filter(f => f.mimeType === 'application/vnd.google-apps.document');
  const others = files.filter(f =>
    f.mimeType !== 'application/vnd.google-apps.folder' &&
    f.mimeType !== 'application/vnd.google-apps.document'
  );

  if (folders.length > 0) {
    console.log('📁 Folders:');
    folders.forEach(f => console.log(`   ${f.name}  [${f.id}]`));
    console.log();
  }

  if (docs.length > 0) {
    console.log('📄 Google Docs:');
    docs.forEach(f => console.log(`   ${f.name}  [${f.id}]`));
    console.log();
  }

  if (others.length > 0) {
    console.log('📎 Other files:');
    others.forEach(f => console.log(`   ${f.name}  [${f.id}]`));
    console.log();
  }

  console.log(`Total: ${files.length} items`);
}
