/**
 * Update a Google Doc's content
 *
 * Usage:
 *   npx tsx src/cli.ts update <doc-id> --content <text> [--markdown]
 */

import { getDocs } from './auth.js';
import { markdownToDocsRequests } from './markdown-to-docs.js';

interface UpdateResult {
  id: string;
  url: string;
}

/**
 * Update a Google Doc by clearing content and inserting new content
 */
export async function updateDoc(
  docId: string,
  content: string,
  options: { markdown?: boolean } = {}
): Promise<UpdateResult> {
  const docs = await getDocs();

  // First, get the document to find its length
  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body?.content?.slice(-1)?.[0]?.endIndex || 1;

  // Build requests
  const requests: any[] = [];

  // Delete existing content (if any beyond the initial newline)
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex - 1,
        },
      },
    });
  }

  // Execute delete first
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }

  // Now insert new content
  let insertRequests;
  if (options.markdown) {
    insertRequests = markdownToDocsRequests(content);
  } else {
    insertRequests = [
      {
        insertText: {
          location: { index: 1 },
          text: content,
        },
      },
    ];
  }

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: insertRequests },
  });

  return {
    id: docId,
    url: `https://docs.google.com/document/d/${docId}/edit`,
  };
}

// CLI handler
export async function main(args: string[]) {
  const docId = args[0];
  let content: string | undefined;
  let markdown = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--content' && args[i + 1]) {
      content = args[++i];
    } else if (args[i] === '--markdown') {
      markdown = true;
    }
  }

  if (!docId || !content) {
    console.error('Usage: update <doc-id> --content <text> [--markdown]');
    console.error('Example: update "1abc..." --content "# Hello" --markdown');
    process.exit(1);
  }

  console.log(`Updating document: ${docId}`);
  console.log(`With ${content.length} characters of content`);
  if (markdown) console.log(`Markdown formatting: enabled`);
  console.log();

  const result = await updateDoc(docId, content, { markdown });

  console.log('✅ Document updated!');
  console.log(`   ID: ${result.id}`);
  console.log(`   URL: ${result.url}`);
}
