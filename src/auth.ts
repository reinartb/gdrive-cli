/**
 * Auth helper using OAuth2 credentials
 *
 * Setup:
 *   1. Go to https://console.cloud.google.com/
 *   2. Create/select a project
 *   3. Enable "Google Drive API" and "Google Docs API"
 *   4. Go to Credentials → Create Credentials → OAuth client ID
 *   5. Choose "Desktop app", name it, create
 *   6. Download JSON and save as credentials.json in this folder
 *   7. Run: npx tsx src/cli.ts list "/" (will open browser for consent)
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
];

let oauth2Client: OAuth2Client | null = null;

/**
 * Load credentials from file
 */
function loadCredentials(): { client_id: string; client_secret: string; redirect_uris: string[] } {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ credentials.json not found!');
    console.error('');
    console.error('Setup instructions:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create or select a project');
    console.error('  3. Go to "APIs & Services" → "Library"');
    console.error('  4. Enable "Google Drive API" and "Google Docs API"');
    console.error('  5. Go to "APIs & Services" → "Credentials"');
    console.error('  6. Click "+ CREATE CREDENTIALS" → "OAuth client ID"');
    console.error('  7. If asked, configure consent screen (External, just your email)');
    console.error('  8. Application type: "Desktop app"');
    console.error('  9. Download JSON and save as:');
    console.error(`     ${CREDENTIALS_PATH}`);
    console.error('');
    process.exit(1);
  }

  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const credentials = JSON.parse(content);

  // Handle both "installed" and "web" credential types
  const creds = credentials.installed || credentials.web;
  if (!creds) {
    throw new Error('Invalid credentials.json format');
  }

  return creds;
}

/**
 * Load saved token if exists
 */
function loadToken(): any | null {
  if (fs.existsSync(TOKEN_PATH)) {
    const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

/**
 * Save token to file
 */
function saveToken(token: any): void {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log('✅ Token saved to', TOKEN_PATH);
}

/**
 * Get authorization code via local server
 */
async function getAuthCodeViaServer(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:3000`);
        const code = url.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>No code received</p>');
        }
      } catch (e) {
        reject(e);
      }
    });

    server.listen(3000, () => {
      console.log('');
      console.log('Opening browser for authentication...');
      console.log('If browser doesn\'t open, visit this URL:');
      console.log('');
      console.log(authUrl);
      console.log('');

      // Try to open browser
      const openCmd = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${openCmd} "${authUrl}"`);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout'));
    }, 120000);
  });
}

/**
 * Get authenticated OAuth2 client
 */
export async function getAuth(): Promise<OAuth2Client> {
  if (oauth2Client) return oauth2Client;

  const credentials = loadCredentials();

  oauth2Client = new OAuth2Client(
    credentials.client_id,
    credentials.client_secret,
    'http://localhost:3000'
  );

  // Check for existing token
  const token = loadToken();

  if (token) {
    oauth2Client.setCredentials(token);

    // Check if token needs refresh
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('Token expired, refreshing...');
      const { credentials: newToken } = await oauth2Client.refreshAccessToken();
      saveToken(newToken);
      oauth2Client.setCredentials(newToken);
    }

    return oauth2Client;
  }

  // Need to get new token
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  const code = await getAuthCodeViaServer(authUrl);
  const { tokens } = await oauth2Client.getToken(code);

  saveToken(tokens);
  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}

/**
 * Get authenticated Drive API client
 */
export async function getDrive() {
  const auth = await getAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Get authenticated Docs API client
 */
export async function getDocs() {
  const auth = await getAuth();
  return google.docs({ version: 'v1', auth });
}

/**
 * Get authenticated Sheets API client
 */
export async function getSheets() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}
