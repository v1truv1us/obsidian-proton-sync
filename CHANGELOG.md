# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-22

### Added
- WebDAV connection setup with URL, credentials, remote root, device ID, and timeout
- Connection validation command
- Manual sync commands: Pull, Push, and Preview (dry run)
- File-level conflict detection with deterministic conflict copy naming
- Per-file sync state persistence in plugin data.json
- Mobile-compatible implementation (no Node/Electron APIs)
- Proton Drive compatibility via WebDAV bridges (rclone, proton-webdav-bridge)
- Minimatch-style ignore patterns
- Exponential backoff retry on transient errors
- Schema-versioned sync state for future migrations
- 36 tests (31 unit + 5 integration) with Vitest
