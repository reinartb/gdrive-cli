/**
 * List and reply to comments on a Google Drive file
 *
 * Usage:
 *   npx tsx src/cli.ts comments <file-id>                              # List comments
 *   npx tsx src/cli.ts comments <file-id> --reply <comment-id> --stdin # Reply (message from stdin)
 *   npx tsx src/cli.ts comments <file-id> --resolve <comment-id>       # Resolve a comment
 *
 * For --reply, use --stdin to avoid shell escaping issues with special characters:
 *   echo "Your message here!" | npx tsx src/cli.ts comments <file-id> --reply <comment-id> --stdin
 */

import { getDrive } from './auth.js';

interface Comment {
  id: string;
  content: string;
  resolved: boolean;
  author?: {
    displayName?: string;
  };
  quotedFileContent?: {
    value?: string;
  };
  replies?: Array<{
    content: string;
    author?: {
      displayName?: string;
    };
  }>;
}

/**
 * List all comments on a file
 */
export async function listComments(fileId: string): Promise<Comment[]> {
  const drive = await getDrive();

  const res = await drive.comments.list({
    fileId,
    fields: 'comments(id,content,author(displayName),quotedFileContent(value),resolved,replies(content,author(displayName)))',
    includeDeleted: false,
  });

  return (res.data.comments || []) as Comment[];
}

/**
 * Reply to a comment
 */
export async function replyToComment(fileId: string, commentId: string, message: string): Promise<void> {
  const drive = await getDrive();

  await drive.replies.create({
    fileId,
    commentId,
    fields: 'id,content,author(displayName)',
    requestBody: {
      content: message,
    },
  });
}

/**
 * Resolve a comment (mark as resolved)
 *
 * NOTE: This may silently fail if you don't have permission.
 * Only the comment author or document owner can resolve comments.
 */
export async function resolveComment(fileId: string, commentId: string): Promise<boolean> {
  const drive = await getDrive();

  // First get the comment to get its content (required for update)
  const existing = await drive.comments.get({
    fileId,
    commentId,
    fields: 'content,resolved',
  });

  if (existing.data.resolved) {
    return true; // Already resolved
  }

  await drive.comments.update({
    fileId,
    commentId,
    fields: 'id,resolved',
    requestBody: {
      content: existing.data.content || '',
      resolved: true,
    },
  });

  // Verify it actually resolved
  const after = await drive.comments.get({
    fileId,
    commentId,
    fields: 'resolved',
  });

  return after.data.resolved === true;
}

/**
 * Read all data from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

// CLI handler
export async function main(args: string[]) {
  const fileId = args[0];

  if (!fileId) {
    console.error('Usage:');
    console.error('  comments <file-id>                                    List all comments');
    console.error('  comments <file-id> --reply <comment-id> --stdin       Reply (message from stdin)');
    console.error('  comments <file-id> --resolve <comment-id>             Resolve a comment');
    console.error('');
    console.error('Examples:');
    console.error('  comments "1abc123..."');
    console.error('  echo "Done! Updated." | comments "1abc..." --reply "AAAAjXzRFRk" --stdin');
    console.error('  comments "1abc123..." --resolve "AAAAjXzRFRk"');
    process.exit(1);
  }

  // Parse options
  const replyIndex = args.indexOf('--reply');
  const resolveIndex = args.indexOf('--resolve');
  const useStdin = args.includes('--stdin');

  if (replyIndex !== -1) {
    // Reply mode
    const commentId = args[replyIndex + 1];

    if (!commentId || commentId.startsWith('--')) {
      console.error('Error: --reply requires <comment-id>');
      process.exit(1);
    }

    let message: string;
    if (useStdin) {
      message = await readStdin();
    } else {
      // Try to get message from next arg (legacy support, but discouraged)
      message = args[replyIndex + 2] || '';
    }

    if (!message) {
      console.error('Error: No message provided. Use --stdin and pipe your message.');
      console.error('Example: echo "Your reply" | npx tsx src/cli.ts comments <file-id> --reply <comment-id> --stdin');
      process.exit(1);
    }

    console.log(`Replying to comment ${commentId}...`);
    await replyToComment(fileId, commentId, message);
    console.log('✅ Reply posted!');
    return;
  }

  if (resolveIndex !== -1) {
    // Resolve mode
    const commentId = args[resolveIndex + 1];

    if (!commentId) {
      console.error('Error: --resolve requires <comment-id>');
      process.exit(1);
    }

    console.log(`Resolving comment ${commentId}...`);
    const success = await resolveComment(fileId, commentId);

    if (success) {
      console.log('✅ Comment resolved!');
    } else {
      console.log('⚠️  Could not resolve comment. You may not have permission.');
      console.log('   (Only the comment author or document owner can resolve comments)');
    }
    return;
  }

  // List mode (default)
  console.log(`Fetching comments for: ${fileId}`);
  console.log('');

  const comments = await listComments(fileId);

  if (comments.length === 0) {
    console.log('No comments found.');
    return;
  }

  console.log(`Found ${comments.length} comment(s):\n`);

  for (const comment of comments) {
    const status = comment.resolved ? '✅ RESOLVED' : '💬 OPEN';
    const author = comment.author?.displayName || 'Unknown';

    console.log(`${status} [${comment.id}] — ${author}`);

    if (comment.quotedFileContent?.value) {
      // Clean up HTML entities
      const quoted = comment.quotedFileContent.value
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      console.log(`   📌 On: "${quoted}"`);
    }

    console.log(`   💭 ${comment.content}`);

    if (comment.replies && comment.replies.length > 0) {
      for (const reply of comment.replies) {
        const replyAuthor = reply.author?.displayName || 'Unknown';
        console.log(`      ↳ ${replyAuthor}: ${reply.content}`);
      }
    }

    console.log('');
  }
}
