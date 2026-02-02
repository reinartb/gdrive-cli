/**
 * Read data from a Google Spreadsheet
 *
 * Usage:
 *   npx tsx src/cli.ts sheets-read <spreadsheet-id> [range]
 *
 * Examples:
 *   npx tsx src/cli.ts sheets-read "1abc123..."              # Read entire first sheet
 *   npx tsx src/cli.ts sheets-read "1abc123..." "Sheet1!A1:D10"  # Read specific range
 *   npx tsx src/cli.ts sheets-read "1abc123..." "A:D"        # Read columns A-D
 */

import { getSheets } from './auth.js';

export async function main(args: string[]) {
  const spreadsheetId = args[0];
  const range = args[1];

  if (!spreadsheetId) {
    console.error('Usage: sheets-read <spreadsheet-id> [range]');
    console.error('');
    console.error('Examples:');
    console.error('  sheets-read "1abc123..."              # Read entire first sheet');
    console.error('  sheets-read "1abc123..." "Sheet1!A1:D10"  # Read specific range');
    console.error('  sheets-read "1abc123..." "A:D"        # Read columns A-D');
    process.exit(1);
  }

  const sheets = await getSheets();

  // If no range specified, get sheet names first
  if (!range) {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    console.log(`Spreadsheet: ${spreadsheet.data.properties?.title}`);
    console.log(`Sheets: ${sheetNames.join(', ')}`);
    console.log('');

    // Read entire first sheet
    const firstSheet = sheetNames[0] || 'Sheet1';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: firstSheet,
    });

    printValues(response.data.values);
  } else {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    printValues(response.data.values);
  }
}

function printValues(values: any[][] | null | undefined) {
  if (!values || values.length === 0) {
    console.log('No data found.');
    return;
  }

  // Calculate column widths
  const colWidths: number[] = [];
  for (const row of values) {
    for (let i = 0; i < row.length; i++) {
      const cellStr = String(row[i] || '');
      colWidths[i] = Math.max(colWidths[i] || 0, cellStr.length);
    }
  }

  // Print as table
  for (const row of values) {
    const cells = row.map((cell, i) => {
      const cellStr = String(cell || '');
      return cellStr.padEnd(colWidths[i] || 0);
    });
    console.log(cells.join(' | '));
  }

  console.log('');
  console.log(`${values.length} rows`);
}

/**
 * Read spreadsheet data and return as array of objects (using first row as headers)
 */
export async function readAsObjects(spreadsheetId: string, range?: string): Promise<Record<string, any>[]> {
  const sheets = await getSheets();

  let actualRange = range;
  if (!actualRange) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    actualRange = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: actualRange,
  });

  const values = response.data.values;
  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0].map((h: any) => String(h).trim());
  const rows = values.slice(1);

  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

/**
 * Read raw values from spreadsheet
 */
export async function readRaw(spreadsheetId: string, range?: string): Promise<any[][]> {
  const sheets = await getSheets();

  let actualRange = range;
  if (!actualRange) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    actualRange = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: actualRange,
  });

  return response.data.values || [];
}
