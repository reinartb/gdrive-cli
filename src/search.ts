/**
 * Search for files in Google Drive
 *
 * Usage:
 *   npx tsx src/cli.ts search <query>
 *   npx tsx src/cli.ts search "ad script"
 *   npx tsx src/cli.ts search "brief" --docs-only
 */

import { getDrive } from './auth.js';

interface SearchResult {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

/**
 * Search for files by name
 */
export async function search(
  query: string,
  options: { docsOnly?: boolean; limit?: number } = {}
): Promise<SearchResult[]> {
  const drive = await getDrive();

  let q = `name contains '${query}' and trashed = false`;

  if (options.docsOnly) {
    q += ` and mimeType = 'application/vnd.google-apps.document'`;
  }

  const response = await drive.files.list({
    q,
    fields: 'files(id, name, mimeType, modifiedTime, parents)',
    orderBy: 'modifiedTime desc',
    pageSize: options.limit || 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || []) as SearchResult[];
}

/**
 * Get full path of a file (for display)
 */
export async function getFilePath(fileId: string): Promise<string> {
  const drive = await getDrive();
  const parts: string[] = [];

  let currentId: string | undefined = fileId;

  while (currentId) {
    const response = await drive.files.get({
      fileId: currentId,
      fields: 'name, parents',
      supportsAllDrives: true,
    });

    parts.unshift(response.data.name || '');

    currentId = response.data.parents?.[0];
    if (currentId === 'root' || !currentId) break;
  }

  return '/' + parts.join('/');
}

// CLI handler
export async function main(args: string[]) {
  const query = args[0];
  const docsOnly = args.includes('--docs-only');

  if (!query) {
    console.error('Usage: search <query> [--docs-only]');
    console.error('Example: search "ad script"');
    process.exit(1);
  }

  console.log(`Searching for: "${query}"${docsOnly ? ' (Google Docs only)' : ''}\n`);

  const results = await search(query, { docsOnly });

  if (results.length === 0) {
    console.log('No results found.');
    return;
  }

  for (const file of results) {
    const typeIcon = file.mimeType === 'application/vnd.google-apps.document' ? '📄' :
                     file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📎';

    console.log(`${typeIcon} ${file.name}`);
    console.log(`   ID: ${file.id}`);
    console.log(`   Modified: ${new Date(file.modifiedTime).toLocaleDateString()}`);
    console.log();
  }

  console.log(`Found ${results.length} results`);
}
