/**
 * Write data to a Google Spreadsheet
 *
 * Usage:
 *   npx tsx src/cli.ts sheets-write <spreadsheet-id> <range> <json-data>
 *   npx tsx src/cli.ts sheets-append <spreadsheet-id> <range> <json-data>
 *
 * Examples:
 *   npx tsx src/cli.ts sheets-write "1abc..." "A1:C2" '[["Name","Age"],["John",30]]'
 *   npx tsx src/cli.ts sheets-append "1abc..." "A:C" '[["Jane",25,"Engineer"]]'
 */

import { getSheets } from './auth.js';

export async function main(args: string[]) {
  const spreadsheetId = args[0];
  const range = args[1];
  const jsonData = args[2];

  if (!spreadsheetId || !range || !jsonData) {
    console.error('Usage: sheets-write <spreadsheet-id> <range> <json-data>');
    console.error('');
    console.error('Examples:');
    console.error('  sheets-write "1abc..." "A1:C2" \'[["Name","Age"],["John",30]]\'');
    console.error('  sheets-write "1abc..." "Sheet2!A1" \'[["Data"]]\'');
    process.exit(1);
  }

  let values: any[][];
  try {
    values = JSON.parse(jsonData);
  } catch (e) {
    console.error('Invalid JSON data. Expected array of arrays.');
    console.error('Example: \'[["Name","Age"],["John",30]]\'');
    process.exit(1);
  }

  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });

  console.log(`✅ Updated ${response.data.updatedCells} cells in ${response.data.updatedRange}`);
}

export async function appendMain(args: string[]) {
  const spreadsheetId = args[0];
  const range = args[1];
  const jsonData = args[2];

  if (!spreadsheetId || !range || !jsonData) {
    console.error('Usage: sheets-append <spreadsheet-id> <range> <json-data>');
    console.error('');
    console.error('Examples:');
    console.error('  sheets-append "1abc..." "A:C" \'[["Jane",25,"Engineer"]]\'');
    console.error('  sheets-append "1abc..." "Sheet1!A:D" \'[["Row1"],["Row2"]]\'');
    process.exit(1);
  }

  let values: any[][];
  try {
    values = JSON.parse(jsonData);
  } catch (e) {
    console.error('Invalid JSON data. Expected array of arrays.');
    console.error('Example: \'[["Name","Age"],["John",30]]\'');
    process.exit(1);
  }

  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });

  console.log(`✅ Appended ${response.data.updates?.updatedCells} cells`);
  console.log(`   Range: ${response.data.updates?.updatedRange}`);
}

/**
 * Write values to spreadsheet (overwrites existing data in range)
 */
export async function writeValues(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Append rows to spreadsheet (adds to end of data)
 */
export async function appendRows(
  spreadsheetId: string,
  range: string,
  rows: any[][]
): Promise<void> {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

/**
 * Clear a range of cells
 */
export async function clearRange(
  spreadsheetId: string,
  range: string
): Promise<void> {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

/**
 * Write array of objects to spreadsheet (first row becomes headers)
 */
export async function writeObjects(
  spreadsheetId: string,
  range: string,
  data: Record<string, any>[],
  headers?: string[]
): Promise<void> {
  if (data.length === 0) return;

  // Determine headers from first object or use provided headers
  const cols = headers || Object.keys(data[0]);

  // Build values array with header row
  const values: any[][] = [cols];

  for (const obj of data) {
    const row = cols.map(col => obj[col] ?? '');
    values.push(row);
  }

  await writeValues(spreadsheetId, range, values);
}
