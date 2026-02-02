/**
 * Create a new Google Doc
 *
 * Usage:
 *   npx tsx src/cli.ts create <title> [--folder <folder-id-or-path>] [--content <text>]
 *   npx tsx src/cli.ts create <title> --folder <id> --content <markdown> --markdown
 *   npx tsx src/cli.ts create "New Brief" --folder "/Key For Her/Ads/Briefs"
 *
 * Options:
 *   --markdown    Parse content as markdown and apply formatting (headings, bold, bullets)
 *
 * Also supports reading content from stdin:
 *   echo "Document content here" | npx tsx src/cli.ts create "New Brief"
 */

import { getDocs, getDrive } from './auth.js';
import { findFolderByPath } from './list.js';
import { markdownToDocsRequests } from './markdown-to-docs.js';

interface CreateResult {
  id: string;
  title: string;
  url: string;
}

/**
 * Create a new Google Doc
 */
export async function createDoc(
  title: string,
  options: { content?: string; folderId?: string; markdown?: boolean } = {}
): Promise<CreateResult> {
  const docs = await getDocs();
  const drive = await getDrive();

  // Create the document
  const createResponse = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const docId = createResponse.data.documentId!;

  // Move to folder if specified
  if (options.folderId) {
    await drive.files.update({
      fileId: docId,
      addParents: options.folderId,
      removeParents: 'root',
      fields: 'id, parents',
      supportsAllDrives: true,
    });
  }

  // Add content if provided
  if (options.content && options.content.trim()) {
    let requests;

    if (options.markdown) {
      // Parse markdown and create formatted requests
      requests = markdownToDocsRequests(options.content);
    } else {
      // Plain text insert
      requests = [
        {
          insertText: {
            location: { index: 1 },
            text: options.content,
          },
        },
      ];
    }

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }

  return {
    id: docId,
    title,
    url: `https://docs.google.com/document/d/${docId}/edit`,
  };
}

/**
 * Create a doc in a folder specified by path
 */
export async function createDocInPath(
  title: string,
  folderPath: string,
  content?: string,
  markdown?: boolean
): Promise<CreateResult> {
  const folderId = await findFolderByPath(folderPath);
  if (!folderId) {
    throw new Error(`Folder not found: ${folderPath}`);
  }
  return createDoc(title, { content, folderId, markdown });
}

// Read from stdin if available
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on('end', () => resolve(data));

    // Timeout after 100ms if no stdin
    setTimeout(() => resolve(data), 100);
  });
}

// CLI handler
export async function main(args: string[]) {
  // Parse arguments
  const title = args[0];
  let folder: string | undefined;
  let content: string | undefined;
  let markdown = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--folder' && args[i + 1]) {
      folder = args[++i];
    } else if (args[i] === '--content' && args[i + 1]) {
      content = args[++i];
    } else if (args[i] === '--markdown') {
      markdown = true;
    }
  }

  if (!title) {
    console.error('Usage: create <title> [--folder <path-or-id>] [--content <text>] [--markdown]');
    console.error('Example: create "New Brief" --folder "/Ads/Briefs"');
    console.error('');
    console.error('Options:');
    console.error('  --markdown    Parse content as markdown and apply formatting');
    console.error('');
    console.error('You can also pipe content:');
    console.error('  echo "Content here" | npx tsx src/cli.ts create "Doc Title"');
    process.exit(1);
  }

  // Try to read from stdin if no content provided
  if (!content) {
    content = await readStdin();
  }

  console.log(`Creating document: "${title}"`);
  if (folder) console.log(`In folder: ${folder}`);
  if (content) console.log(`With ${content.length} characters of content`);
  if (markdown) console.log(`Markdown formatting: enabled`);
  console.log();

  let result: CreateResult;

  if (folder?.startsWith('/')) {
    result = await createDocInPath(title, folder, content, markdown);
  } else {
    result = await createDoc(title, { content, folderId: folder, markdown });
  }

  console.log('✅ Document created!');
  console.log(`   Title: ${result.title}`);
  console.log(`   ID: ${result.id}`);
  console.log(`   URL: ${result.url}`);
}
