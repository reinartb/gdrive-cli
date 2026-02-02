/**
 * List and compare Google Doc revisions
 *
 * Usage:
 *   npx tsx src/cli.ts revisions <doc-id>                    # List all revisions
 *   npx tsx src/cli.ts revisions <doc-id> --diff <rev1> <rev2>   # Diff two revisions
 *   npx tsx src/cli.ts revisions <doc-id> --export <rev-id>      # Export specific revision content
 */

import { getDrive, getAuth } from './auth.js';

interface Revision {
  id: string;
  modifiedTime: string;
  lastModifyingUser?: {
    displayName?: string;
    emailAddress?: string;
  };
  exportLinks?: Record<string, string>;
}

/**
 * List all revisions for a document
 */
export async function listRevisions(fileId: string): Promise<Revision[]> {
  const drive = await getDrive();

  const res = await drive.revisions.list({
    fileId,
    fields: 'revisions(id,modifiedTime,lastModifyingUser(displayName,emailAddress),exportLinks)',
  });

  return (res.data.revisions || []) as Revision[];
}

/**
 * Get content of a specific revision using export links
 */
export async function getRevisionContent(fileId: string, revisionId: string): Promise<string> {
  const drive = await getDrive();
  const auth = await getAuth();

  // Get revision with export links
  const res = await drive.revisions.get({
    fileId,
    revisionId,
    fields: 'id,exportLinks',
  });

  const exportLinks = res.data.exportLinks as Record<string, string> | undefined;

  if (!exportLinks || !exportLinks['text/plain']) {
    throw new Error(`No text export link available for revision ${revisionId}`);
  }

  // Fetch the content using the export link
  const token = (await auth.getAccessToken()).token!;
  const response = await fetch(exportLinks['text/plain'], {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch revision content: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Generate a simple line-by-line diff
 */
function simpleDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const changes: string[] = [];

  // Find removed lines (in old but not in new)
  for (const line of oldLines) {
    if (line.trim() && !newLines.some(n => n.trim() === line.trim())) {
      changes.push(`- ${line}`);
    }
  }

  // Find added lines (in new but not in old)
  for (const line of newLines) {
    if (line.trim() && !oldLines.some(o => o.trim() === line.trim())) {
      changes.push(`+ ${line}`);
    }
  }

  return changes.join('\n');
}

// CLI handler
export async function main(args: string[]) {
  const fileId = args[0];

  if (!fileId) {
    console.error('Usage:');
    console.error('  revisions <doc-id>                         List all revisions');
    console.error('  revisions <doc-id> --diff <rev1> <rev2>    Compare two revisions');
    console.error('  revisions <doc-id> --export <rev-id>       Export revision content');
    console.error('');
    console.error('Examples:');
    console.error('  revisions "1abc..." --diff 4 61');
    console.error('  revisions "1abc..." --export 4');
    process.exit(1);
  }

  // Parse options
  const diffIndex = args.indexOf('--diff');
  const exportIndex = args.indexOf('--export');

  if (diffIndex !== -1) {
    // Diff mode
    const rev1 = args[diffIndex + 1];
    const rev2 = args[diffIndex + 2];

    if (!rev1 || !rev2) {
      console.error('Error: --diff requires two revision IDs');
      process.exit(1);
    }

    console.log(`Comparing revisions ${rev1} → ${rev2}`);
    console.log('');

    const [content1, content2] = await Promise.all([
      getRevisionContent(fileId, rev1),
      getRevisionContent(fileId, rev2),
    ]);

    const diff = simpleDiff(content1, content2);

    if (!diff.trim()) {
      console.log('No text differences found.');
    } else {
      console.log('Changes:');
      console.log('─'.repeat(60));
      console.log(diff);
    }

  } else if (exportIndex !== -1) {
    // Export mode
    const revId = args[exportIndex + 1];

    if (!revId) {
      console.error('Error: --export requires a revision ID');
      process.exit(1);
    }

    console.log(`Exporting revision ${revId}...`);
    console.log('');

    const content = await getRevisionContent(fileId, revId);
    console.log(content);

  } else {
    // List mode (default)
    console.log(`Fetching revisions for: ${fileId}`);
    console.log('');

    const revisions = await listRevisions(fileId);

    if (revisions.length === 0) {
      console.log('No revisions found.');
      return;
    }

    console.log(`Found ${revisions.length} revision(s):\n`);

    for (const rev of revisions) {
      const date = new Date(rev.modifiedTime).toLocaleString();
      const user = rev.lastModifyingUser?.displayName ||
                   rev.lastModifyingUser?.emailAddress ||
                   'Unknown';
      const hasExport = rev.exportLinks ? '✓' : '✗';

      console.log(`  Rev ${rev.id.padEnd(4)} │ ${date.padEnd(22)} │ ${user.padEnd(25)} │ Export: ${hasExport}`);
    }

    console.log('');
    console.log('To compare revisions:');
    console.log(`  npx tsx src/cli.ts revisions "${fileId}" --diff <rev1> <rev2>`);
  }
}
