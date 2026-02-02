# gdrive-cli

CLI tool for Google Drive, Docs, and Sheets. Read, create, update, and manage documents programmatically.

## Features

- **Google Docs**: Read, create, update documents with markdown support
- **Google Sheets**: Read, write, append data
- **Google Drive**: List files, search, rename, delete
- **Revisions**: View history, diff between versions
- **Comments**: List, reply, resolve comments on documents
- **Shared Drives**: Full support for shared/team drives

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/gdrive-cli.git
cd gdrive-cli
npm install
```

### 2. Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - Google Drive API
   - Google Docs API
   - Google Sheets API
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Select **Desktop app**
6. Download the JSON file
7. Rename it to `credentials.json` and place in the repo root

### 3. Authenticate

Run any command and a browser will open for OAuth consent:

```bash
npx tsx src/cli.ts folders-list "<folder-id>"
```

This creates a `token.json` file (automatically gitignored).

## Usage

```bash
npx tsx src/cli.ts <command> [args]
```

### Commands

Commands are namespaced by resource type:

| Command | Description |
|---------|-------------|
| **Folders** | |
| `folders-list <folder-id>` | List files in a folder |
| **Files** | |
| `files-search <query>` | Search for files by name |
| `files-rename <file-id> <new-name>` | Rename a file |
| `files-delete <file-id>` | Delete a file |
| `files-comments <file-id>` | List/reply/resolve comments |
| **Docs** | |
| `docs-read <doc-id>` | Read a Google Doc as text |
| `docs-create <title> --folder <id>` | Create a new doc |
| `docs-update <doc-id> --content <text>` | Update a doc's content |
| `docs-revisions <doc-id>` | List revision history |
| **Sheets** | |
| `sheets-read <sheet-id> [tab]` | Read from a sheet |
| `sheets-write <sheet-id> <range> <json>` | Write to a sheet |
| `sheets-append <sheet-id> <tab> <json>` | Append rows to a sheet |

### Examples

```bash
# Read a Google Doc
npx tsx src/cli.ts docs-read "1abc123..."

# Create a doc with markdown formatting
npx tsx src/cli.ts docs-create "My Doc" --folder "folder-id" --content "# Hello" --markdown

# Search for docs
npx tsx src/cli.ts files-search "quarterly report" --docs-only

# Read a specific sheet tab
npx tsx src/cli.ts sheets-read "sheet-id" "Sheet1"

# Append rows to a sheet
npx tsx src/cli.ts sheets-append "sheet-id" "Sheet1" '[["Name","Value"],["Test",123]]'

# Compare two revisions
npx tsx src/cli.ts docs-revisions "doc-id" --diff 5 10

# Reply to a comment (use stdin to avoid shell escaping issues)
echo "Thanks for the feedback!" | npx tsx src/cli.ts files-comments "doc-id" --reply "comment-id" --stdin
```

## For Claude Code Users

A `CLAUDE.md` file is included with full command documentation. Claude will automatically use this when working with Google Drive in your projects.

## License

MIT
