/**
 * Read a Google Doc's content as plain text
 *
 * Usage:
 *   npx tsx src/cli.ts read <doc-id>                    Read all tabs (or main content if no tabs)
 *   npx tsx src/cli.ts read <doc-id> --list-tabs        List available tabs
 *   npx tsx src/cli.ts read <doc-id> --tab "Tab Name"   Read specific tab by name
 *   npx tsx src/cli.ts read <doc-id> --tab 0            Read specific tab by index
 */

import { getDocs, getDrive } from './auth.js';

interface TabInfo {
  id: string;
  title: string;
  index: number;
}

interface DocContent {
  title: string;
  content: string;
  tabs?: TabInfo[];
}

/**
 * Extract text from paragraph elements
 */
function extractParagraphText(paragraph: any): string {
  let text = '';
  if (paragraph?.elements) {
    for (const element of paragraph.elements) {
      if (element.textRun?.content) {
        text += element.textRun.content;
      }
    }
  }
  return text;
}

/**
 * Extract text from a table
 */
function extractTableText(table: any): string {
  let text = '';
  if (table?.tableRows) {
    for (const row of table.tableRows) {
      const cells: string[] = [];
      if (row.tableCells) {
        for (const cell of row.tableCells) {
          let cellText = '';
          if (cell.content) {
            for (const element of cell.content) {
              if (element.paragraph) {
                cellText += extractParagraphText(element.paragraph);
              }
            }
          }
          cells.push(cellText.trim());
        }
      }
      text += cells.join(' | ') + '\n';
    }
    text += '\n';
  }
  return text;
}

/**
 * Extract content from a body structure (works for both main body and tab body)
 */
function extractBodyContent(body: any): string {
  let content = '';
  if (body?.content) {
    for (const element of body.content) {
      if (element.paragraph) {
        content += extractParagraphText(element.paragraph);
      } else if (element.table) {
        content += extractTableText(element.table);
      }
    }
  }
  return content;
}

/**
 * Parse tabs from document response
 */
function parseTabs(doc: any): TabInfo[] {
  const tabs: TabInfo[] = [];

  if (doc.tabs && Array.isArray(doc.tabs)) {
    for (let i = 0; i < doc.tabs.length; i++) {
      const tab = doc.tabs[i];
      const tabProps = tab.tabProperties || {};
      tabs.push({
        id: tabProps.tabId || `tab-${i}`,
        title: tabProps.title || `Tab ${i + 1}`,
        index: i,
      });
    }
  }

  return tabs;
}

/**
 * Read a Google Doc by ID and return its text content
 *
 * Options:
 *   - listTabs: Only return tab info, no content
 *   - tabSelector: Read specific tab by name (string) or index (number)
 *   - If no options, reads all tabs concatenated
 */
export async function readDoc(
  docId: string,
  options: { listTabs?: boolean; tabSelector?: string | number } = {}
): Promise<DocContent> {
  const docs = await getDocs();

  const response = await docs.documents.get({
    documentId: docId,
    includeTabsContent: true,
  });

  const doc = response.data;
  const title = doc.title || 'Untitled';
  const tabs = parseTabs(doc);

  // If listing tabs only
  if (options.listTabs) {
    return { title, content: '', tabs };
  }

  // If document has tabs
  if (doc.tabs && doc.tabs.length > 0) {
    // Read specific tab
    if (options.tabSelector !== undefined) {
      let targetTab: any;
      let tabInfo: TabInfo | undefined;

      if (typeof options.tabSelector === 'number') {
        // By index
        targetTab = doc.tabs[options.tabSelector];
        tabInfo = tabs[options.tabSelector];
      } else {
        // By name
        const idx = tabs.findIndex(
          t => t.title.toLowerCase() === options.tabSelector.toString().toLowerCase()
        );
        if (idx >= 0) {
          targetTab = doc.tabs[idx];
          tabInfo = tabs[idx];
        }
      }

      if (!targetTab || !targetTab.documentTab) {
        throw new Error(`Tab not found: ${options.tabSelector}`);
      }

      const content = extractBodyContent(targetTab.documentTab.body);
      return { title, content, tabs };
    }

    // Read all tabs (default)
    let content = '';
    for (let i = 0; i < doc.tabs.length; i++) {
      const tab = doc.tabs[i];
      const tabTitle = tabs[i]?.title || `Tab ${i + 1}`;

      if (doc.tabs.length > 1) {
        content += `\n${'═'.repeat(60)}\n`;
        content += `TAB: ${tabTitle}\n`;
        content += `${'═'.repeat(60)}\n\n`;
      }

      if (tab.documentTab?.body) {
        content += extractBodyContent(tab.documentTab.body);
      }
    }

    return { title, content: content.trim(), tabs };
  }

  // Fallback: no tabs, use doc.body (backwards compatibility)
  const content = extractBodyContent(doc.body);
  return { title, content };
}

/**
 * Find a doc by name in a folder and read it
 */
export async function readDocByName(
  name: string,
  folderId: string = 'root',
  options: { listTabs?: boolean; tabSelector?: string | number } = {}
): Promise<DocContent> {
  const drive = await getDrive();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and name contains '${name}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const file = response.data.files?.[0];
  if (!file?.id) {
    throw new Error(`Document not found: ${name}`);
  }

  return readDoc(file.id, options);
}

// CLI handler
export async function main(args: string[]) {
  const docId = args[0];
  let listTabs = false;
  let tabSelector: string | number | undefined;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--list-tabs') {
      listTabs = true;
    } else if (args[i] === '--tab' && args[i + 1]) {
      const val = args[++i];
      // Check if it's a number (index) or string (name)
      tabSelector = /^\d+$/.test(val) ? parseInt(val, 10) : val;
    }
  }

  if (!docId) {
    console.error('Usage: read <doc-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --list-tabs        List available tabs in the document');
    console.error('  --tab <name|index> Read a specific tab by name or index (0-based)');
    console.error('');
    console.error('Examples:');
    console.error('  read 1abc123...                    Read all tabs');
    console.error('  read 1abc123... --list-tabs        List tabs only');
    console.error('  read 1abc123... --tab 0            Read first tab');
    console.error('  read 1abc123... --tab "Summary"    Read tab named "Summary"');
    process.exit(1);
  }

  console.log(`Reading document: ${docId}\n`);

  const { title, content, tabs } = await readDoc(docId, { listTabs, tabSelector });

  console.log(`Title: ${title}`);

  // Show tabs if listing or if document has multiple tabs
  if (listTabs || (tabs && tabs.length > 1)) {
    console.log(`\nTabs (${tabs?.length || 0}):`);
    if (tabs && tabs.length > 0) {
      for (const tab of tabs) {
        console.log(`  [${tab.index}] ${tab.title}`);
      }
    } else {
      console.log('  (no tabs - single document)');
    }
  }

  if (!listTabs) {
    console.log('\n' + '─'.repeat(60));
    console.log(content);
  }
}
