# Architecture

## Overview

Proton Drive Sync uses a layered architecture to keep sync logic testable and decoupled from UI concerns.

```
┌─────────────────────────────────────────┐
│  UI Layer (Obsidian-specific)           │
│  ├── SettingsTab                        │
│  ├── PreviewModal                       │
│  └── Commands (validate, preview, pull, │
│               push)                     │
├─────────────────────────────────────────┤
│  Sync Engine Layer                      │
│  ├── buildLocalFileMap()                │
│  ├── buildRemoteFileMap()               │
│  └── buildSyncPlan()                    │
├─────────────────────────────────────────┤
│  Planner Layer (pure logic)             │
│  ├── computePlan()                      │
│  ├── FileSnapshot                       │
│  └── Ignore patterns                    │
├─────────────────────────────────────────┤
│  Transport Layer                        │
│  └── WebDAVClient                       │
│      ├── PROPFIND, GET, PUT, MKCOL      │
│      └── Retry with exponential backoff │
├─────────────────────────────────────────┤
│  State Layer                            │
│  ├── SyncState (snapshots, version)     │
│  └── data.json persistence              │
└─────────────────────────────────────────┘
```

## Layer Responsibilities

### UI Layer

- **SettingsTab** — Obsidian `PluginSettingTab` for configuration
- **PreviewModal** — Displays sync plan in a scrollable modal
- **Commands** — Register with Obsidian's command palette; orchestrate calls to lower layers

### Sync Engine Layer

- Builds file maps from local vault (via Obsidian API) and remote server (via WebDAV)
- Converts state to/from planner-compatible maps
- Is the only layer that coordinates across multiple other layers

### Planner Layer

- **Pure functions** — No side effects, no Obsidian or network dependencies
- `computePlan()` takes three maps (local, remote, snapshot) and returns a `SyncPlan`
- Decision logic: compare etag → fallback to size+mtime → classify as skip/push/pull/conflict

### Transport Layer

- `WebDAVClient` wraps `fetch()` with:
  - Basic authentication
  - Timeout via `AbortController`
  - Exponential backoff retry (1s, 2s, 4s) for transient errors
  - Immediate failure for auth errors (401/403/404)
- Uses `DOMParser` for XML parsing (available in both browser and jsdom test environments)

### State Layer

- Persists per-file snapshots in plugin `data.json`
- Schema-versioned from day one (`SyncState.version`)
- Future migrations can be added by bumping `CURRENT_VERSION`

## Data Flow

### Pull Operation

```
User → pull command → buildSyncPlan()
                          ├── buildLocalFileMap()  (Obsidian Vault API)
                          ├── buildRemoteFileMap() (WebDAV PROPFIND)
                          └── computePlan()
                       ← SyncPlan
    → Execute pulls → WebDAV GET → vault.createBinary/modifyBinary
    → Execute conflicts → WebDAV GET → vault.createBinary (conflict name)
    → Update state → saveState() → data.json
    → Show summary Notice
```

### Push Operation

```
User → push command → buildSyncPlan()
    → Execute pushes → vault.readBinary → WebDAV PUT + MKCOL
    → Execute conflicts → vault.readBinary → WebDAV PUT (conflict name)
    → Update state → saveState() → data.json
    → Show summary Notice
```

## Deferral Rationale

| Feature | Status | Rationale |
|---------|--------|-----------|
| Auto-sync scheduler | Post-MVP | Requires careful battery impact analysis on mobile; conflict policy needs user input |
| Deletion propagation | Post-MVP | Risky; needs safe-deletion window, trash vs permanent, undo mechanism |
| Content-level merge | Post-MVP | Complex merge strategies (3-way, LCS); UI complexity beyond MVP scope |
| Multi-remote profiles | Post-MVP | Not needed for single-vault Proton Drive use case |
| End-to-end encryption UX | Post-MVP | Proton Drive already encrypts at rest; redundant layer adds key management complexity |
