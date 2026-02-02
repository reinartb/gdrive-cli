/**
 * Markdown to Google Docs formatter
 *
 * Converts markdown text to Google Docs API batchUpdate requests
 * with proper formatting (headings, bold, bullets, etc.)
 */

import { docs_v1 } from 'googleapis';

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface ParsedLine {
  type: 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'paragraph';
  segments: TextSegment[];
  rawText: string;
}

/**
 * Parse inline formatting (bold, italic) within a line
 */
function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = text;

  // Pattern for **bold** and *italic*
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    // Determine if bold or italic
    if (match[2]) {
      // **bold**
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      // *italic*
      segments.push({ text: match[3], italic: true });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  // If no formatting found, return the whole text as one segment
  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

/**
 * Parse a single line of markdown
 */
function parseLine(line: string): ParsedLine | null {
  // Skip empty lines (we'll handle spacing differently)
  if (!line.trim()) {
    return null;
  }

  // Heading 1: # Title
  if (line.startsWith('# ')) {
    const content = line.slice(2);
    return {
      type: 'heading1',
      segments: parseInlineFormatting(content),
      rawText: content,
    };
  }

  // Heading 2: ## Title
  if (line.startsWith('## ')) {
    const content = line.slice(3);
    return {
      type: 'heading2',
      segments: parseInlineFormatting(content),
      rawText: content,
    };
  }

  // Heading 3: ### Title
  if (line.startsWith('### ')) {
    const content = line.slice(4);
    return {
      type: 'heading3',
      segments: parseInlineFormatting(content),
      rawText: content,
    };
  }

  // Bullet: - item or * item
  if (line.match(/^[\-\*]\s+/)) {
    const content = line.replace(/^[\-\*]\s+/, '');
    return {
      type: 'bullet',
      segments: parseInlineFormatting(content),
      rawText: content,
    };
  }

  // Numbered list: 1. item (treat as bullet for simplicity)
  if (line.match(/^\d+\.\s+/)) {
    const content = line.replace(/^\d+\.\s+/, '');
    return {
      type: 'bullet',
      segments: parseInlineFormatting(content),
      rawText: content,
    };
  }

  // Regular paragraph
  return {
    type: 'paragraph',
    segments: parseInlineFormatting(line),
    rawText: line,
  };
}

/**
 * Convert markdown to Google Docs API requests
 */
export function markdownToDocsRequests(markdown: string): docs_v1.Schema$Request[] {
  const lines = markdown.split('\n');
  const requests: docs_v1.Schema$Request[] = [];

  // Parse all lines
  const parsedLines: ParsedLine[] = [];
  let previousWasEmpty = false;

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      // Add paragraph break if there was an empty line before (except at start)
      if (previousWasEmpty && parsedLines.length > 0) {
        parsedLines.push({
          type: 'paragraph',
          segments: [{ text: '' }],
          rawText: '',
        });
      }
      parsedLines.push(parsed);
      previousWasEmpty = false;
    } else {
      previousWasEmpty = true;
    }
  }

  // Build the full text first (we need to insert text, then format it)
  let fullText = '';
  const linePositions: { start: number; end: number; line: ParsedLine }[] = [];

  for (const parsed of parsedLines) {
    const start = fullText.length + 1; // +1 because Google Docs index starts at 1
    const lineText = parsed.segments.map(s => s.text).join('');
    fullText += lineText + '\n';
    const end = fullText.length; // end is after the newline
    linePositions.push({ start, end, line: parsed });
  }

  // Insert all text first
  if (fullText) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: fullText,
      },
    });
  }

  // Now add formatting requests (in reverse order to not mess up indices)
  const formatRequests: docs_v1.Schema$Request[] = [];

  for (const { start, end, line } of linePositions) {
    const lineEnd = end - 1; // Don't include the newline in formatting

    // Apply paragraph style (headings)
    if (line.type === 'heading1') {
      formatRequests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType',
        },
      });
    } else if (line.type === 'heading2') {
      formatRequests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: 'HEADING_2' },
          fields: 'namedStyleType',
        },
      });
    } else if (line.type === 'heading3') {
      formatRequests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: 'HEADING_3' },
          fields: 'namedStyleType',
        },
      });
    } else if (line.type === 'bullet') {
      formatRequests.push({
        createParagraphBullets: {
          range: { startIndex: start, endIndex: end },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
    }

    // Apply inline formatting (bold, italic)
    let currentIndex = start;
    for (const segment of line.segments) {
      const segmentEnd = currentIndex + segment.text.length;

      if (segment.bold && segment.text.length > 0) {
        formatRequests.push({
          updateTextStyle: {
            range: { startIndex: currentIndex, endIndex: segmentEnd },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
      }

      if (segment.italic && segment.text.length > 0) {
        formatRequests.push({
          updateTextStyle: {
            range: { startIndex: currentIndex, endIndex: segmentEnd },
            textStyle: { italic: true },
            fields: 'italic',
          },
        });
      }

      currentIndex = segmentEnd;
    }
  }

  // Add format requests after insert
  requests.push(...formatRequests);

  return requests;
}

/**
 * Strip markdown formatting to get plain text (for backwards compatibility)
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,3}\s+/gm, '') // Remove heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.+?)\*/g, '$1') // Remove italic markers
    .replace(/^[\-\*]\s+/gm, '• '); // Convert bullets to bullet char
}
