# Proton Drive Sync

An [Obsidian](https://obsidian.md) community plugin that provides reliable, manual vault synchronization via WebDAV, with practical compatibility for Proton Drive through local bridge layers.

> **Status:** MVP — manual sync with conflict safety. Auto-sync and deletion propagation are deferred to post-MVP.

---

## Features

- **WebDAV Sync** — Pull, push, and preview changes between your local vault and any WebDAV server
- **Conflict Safety** — Never silently overwrite your data; deterministic conflict copies keep both versions
- **Proton Drive Compatible** — Works with rclone and proton-webdav-bridge WebDAV endpoints
- **Mobile Ready** — Runs on both desktop and mobile Obsidian (`isDesktopOnly: false`)
- **Preview Before Sync** — Review exactly what will change before any data moves
- **Per-File State Tracking** — Resumes sync safely after closing and reopening Obsidian

---

## Installation

### Community Plugin Browser (when approved)

1. Open **Settings → Community Plugins**
2. Turn on **Safe Mode** (if off)
3. Click **Browse** and search for "Proton Drive Sync"
4. Click **Install**
5. Enable the plugin

### Manual Installation

1. Download the latest release: `main.js`, `manifest.json`, and optionally `styles.css`
2. Copy them to your vault's `.obsidian/plugins/obsidian-proton-drive-sync/` folder
3. Reload Obsidian and enable the plugin in **Settings → Community Plugins**

---

## Setup

### 1. Configure WebDAV Settings

Open **Settings → Proton Drive Sync** and fill in:

| Field | Description | Example |
|-------|-------------|---------|
| **WebDAV URL** | Your WebDAV server URL | `http://localhost:8080` |
| **Username** | WebDAV username | `user` |
| **Password** | WebDAV password | `password` |
| **Remote root path** | Directory on the remote server | `/vault` |
| **Device ID** | Unique name for this device (used in conflict filenames) | `macbook-pro` |
| **Connection timeout** | Request timeout in milliseconds | `30000` |
| **Ignore patterns** | Comma-separated globs to skip | `*.tmp, .git/**` |

### 2. Validate Connection

Run **Command Palette → "WebDAV Sync: Validate Connection"** to verify your settings.

### 3. First Sync

> ⚠️ **Back up your vault before the first sync.**

1. Run **"WebDAV Sync: Preview Sync Plan"** to review what will change
2. Run **"WebDAV Sync: Pull from Remote"** to download remote files
3. Run **"WebDAV Sync: Push to Remote"** to upload local files

---

## Proton Drive Setup

Proton Drive does not expose a native WebDAV API. Use a bridge:

### Option A: rclone

1. [Install rclone](https://rclone.org/install/)
2. Configure Proton Drive: `rclone config` → create `protondrive` remote
3. Serve WebDAV: `rclone serve webdav protondrive: --addr :8080 --user USER --pass PASS`
4. Set Obsidian plugin URL to `http://localhost:8080`

### Option B: proton-webdav-bridge

1. Install [proton-webdav-bridge](https://github.com/ProtonDrive/proton-webdav-bridge) (if available)
2. Follow the bridge's setup instructions
3. Point the plugin at the bridge's WebDAV URL

### Known Bridge Caveats

- **Mixed metadata quality** — Some bridges provide etag/lastmodified, others don't. The plugin uses size+mtime as fallback.
- **Performance** — Bridge throughput is typically slower than native sync.
- **Latency** — Local bridge adds a network hop; large vaults may take longer.
- **File size limit** — The plugin loads files entirely into memory. Files > 25 MB may cause issues.

---

## Sync Behavior

### Commands

| Command | What it does |
|---------|-------------|
| **Validate Connection** | Tests WebDAV credentials and reachability |
| **Preview Sync Plan** | Shows what would happen without changing anything |
| **Pull from Remote** | Downloads remote changes; creates conflict copies if needed |
| **Push to Remote** | Uploads local changes; creates conflict copies if needed |

### Conflict Resolution

When both local and remote changed the same file since the last sync:

- The original file is **not overwritten**
- A **conflict copy** is created with naming: `{name}.conflict-{deviceId}-{timestamp}{ext}`
- You manually reconcile the two versions
- Conflict copies are **never auto-deleted**

### Deletion Policy (MVP)

- **No automatic deletion propagation.**
- If you delete a file locally, it remains on remote until you delete it there too.
- Auto-delete options are deferred to post-MVP.

---

## Limitations

- **Manual sync only** — No background auto-sync scheduler in MVP
- **No content-level merge** — Conflicts create side-by-side copies; you merge manually
- **No auto-delete** — Deleted files are not propagated
- **Single remote** — One WebDAV endpoint per vault
- **Memory** — Files are loaded fully into memory; very large files (> 25 MB) may fail
- **No encryption layer** — Relies on Proton Drive's end-to-end encryption at rest; WebDAV traffic traverses your local bridge unencrypted

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Authentication failed" | Check username/password; some bridges require specific credentials |
| "Connection timed out" | Increase timeout in settings; check bridge is running |
| "PROPFIND failed" | Verify the URL includes scheme (`http://` or `https://`) |
| Files not appearing after pull | Check ignore patterns; `.obsidian/` is ignored by default |
| Conflict copies everywhere | Both sides changed since last sync — this is expected behavior |

---

## Privacy & Data Flow

- **No telemetry** — The plugin makes zero external network calls except to your configured WebDAV endpoint
- **No analytics** — No usage data is collected
- **Credentials** — Stored in Obsidian's plugin data file (`data.json`), encrypted at rest by your OS
- **Data flow** — File content traverses the WebDAV bridge and network; Proton Drive encrypts at rest

---

## Development

```bash
npm install
npm run build      # Production build
npm run test       # Run tests
npm run test:coverage  # Coverage report
```

---

## License

MIT
