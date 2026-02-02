# Google Drive CLI

CLI tool for interacting with Google Drive, Google Docs, and Google Sheets. Used for reading, creating, and managing documents programmatically.

## Setup

Requires OAuth credentials. Setup is handled automatically on first run - browser will open for consent.

```bash
npm install
```

## Usage

All commands run from the repo root:

```bash
npx tsx src/cli.ts <command> [args]
```

---

## Commands Reference

### list

List files in a folder.

```bash
npx tsx src/cli.ts list "<folder-id>"
```

---

### read

Read a Google Doc as plain text.

```bash
npx tsx src/cli.ts read "<doc-id>"
npx tsx src/cli.ts read "<doc-id>" --list-tabs     # List tabs in doc
npx tsx src/cli.ts read "<doc-id>" --tab "TabName" # Read specific tab
npx tsx src/cli.ts read "<doc-id>" --tab 0         # Read tab by index
```

---

### search

Search for files by name.

```bash
npx tsx src/cli.ts search "<query>" [--docs-only]
```

---

### create

Create a new Google Doc.

```bash
npx tsx src/cli.ts create "<title>" --folder "<folder-id>" --content "<text>" [--markdown]
```

**Options:**
- `--folder` — Target folder ID (required for shared drives)
- `--content` — Document content
- `--markdown` — Parse content as markdown and apply formatting

---

### update

Update an existing Google Doc's content (replaces all content).

```bash
npx tsx src/cli.ts update "<doc-id>" --content "<text>" [--markdown]
```

---

### rename

Rename a file in Google Drive.

```bash
npx tsx src/cli.ts rename "<file-id>" "<new-name>"
```

---

### revisions

List revision history or compare revisions of a Google Doc.

```bash
npx tsx src/cli.ts revisions "<doc-id>"                      # List revisions
npx tsx src/cli.ts revisions "<doc-id>" --diff <rev1> <rev2> # Compare two revisions
npx tsx src/cli.ts revisions "<doc-id>" --export <rev-id>    # Export revision content
```

---

### comments

List, reply to, or resolve comments on a Google Drive file.

```bash
npx tsx src/cli.ts comments "<file-id>"                              # List comments
npx tsx src/cli.ts comments "<file-id>" --reply <comment-id> --stdin # Reply to comment
npx tsx src/cli.ts comments "<file-id>" --resolve <comment-id>       # Resolve comment
```

**IMPORTANT: Replying to comments**

To avoid shell escaping issues with special characters (`!`, `?`, etc.), always use `--stdin` and pipe the message:

```bash
echo "Your reply here" | npx tsx src/cli.ts comments "<file-id>" --reply "<comment-id>" --stdin
```

**Limitation:** The `--resolve` function may not work for comments created by other users due to Google Drive permissions. Only the comment author or document owner can resolve comments.

---

### delete

Delete a file by ID.

```bash
npx tsx src/cli.ts delete "<file-id>"
```

---

### sheets-read

Read data from a Google Sheet.

```bash
npx tsx src/cli.ts sheets-read "<sheet-id>"              # Read first sheet
npx tsx src/cli.ts sheets-read "<sheet-id>" "<tab-name>" # Read specific tab
```

---

### sheets-write

Write data to a Google Sheet (overwrites range).

```bash
npx tsx src/cli.ts sheets-write "<sheet-id>" "<range>" '<json-data>'
```

**Example:**
```bash
npx tsx src/cli.ts sheets-write "1abc..." "Sheet1!A1:B2" '[["Name","Age"],["John",30]]'
```

---

### sheets-append

Append rows to a Google Sheet.

```bash
npx tsx src/cli.ts sheets-append "<sheet-id>" "<tab-name>" '<json-data>'
```

**Example:**
```bash
npx tsx src/cli.ts sheets-append "sheet-id" "Sheet1" '[["Row1Col1","Row1Col2"],["Row2Col1","Row2Col2"]]'
```

---

## Shared Drives

All commands support shared drives automatically (`supportsAllDrives: true` is set).
