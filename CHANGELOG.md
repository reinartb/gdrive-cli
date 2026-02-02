# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-02-02

### Changed
- **BREAKING**: Commands renamed to resource-namespaced format
  - `list` → `folders-list`
  - `search` → `files-search`
  - `rename` → `files-rename`
  - `delete` → `files-delete`
  - `comments` → `files-comments`
  - `read` → `docs-read`
  - `create` → `docs-create`
  - `update` → `docs-update`
  - `revisions` → `docs-revisions`

## [1.0.0] - 2025-02-02

### Added
- Initial public release
- `list` - List files in a folder
- `read` - Read Google Docs with tab support
- `search` - Search files by name
- `create` - Create new Google Docs with optional markdown formatting
- `update` - Update existing Google Doc content
- `rename` - Rename files in Google Drive
- `revisions` - View and compare document revisions
- `comments` - List, reply to, and resolve comments
- `delete` - Delete files by ID
- `sheets-read` - Read data from Google Sheets
- `sheets-write` - Write data to Google Sheets
- `sheets-append` - Append rows to Google Sheets
- Shared drive support for all commands
