# Obsidian WebDAV Sync Plugin — Feature Specification

## Overview

An Obsidian community plugin that provides reliable, manual vault synchronization via WebDAV, with practical compatibility for Proton Drive through local bridge layers. The MVP prioritizes data safety over automation and must function identically on desktop and mobile platforms.

---

## 1. Objective

### What This Feature Does and Why

Obsidian users who store vaults in Proton Drive (or any WebDAV-capable storage) lack a safe, transparent sync mechanism within Obsidian itself. Existing solutions require external sync clients or lack conflict safety. This plugin provides a manual, conflict-aware sync workflow that keeps the user in control of every data movement decision.

### Target Users

- **Primary**: Obsidian users on desktop and mobile who want to sync vaults through WebDAV (especially Proton Drive via bridge).
- **Secondary**: Users who value data safety and explicit control over automated background sync.

### Measurable Success Criteria

1. A user can configure a WebDAV endpoint, validate the connection, and perform a dry-run preview within 5 minutes of installation.
2. Sync operations never silently overwrite data: conflicts produce deterministic side-by-side copies.
3. A repeat sync with no changes on either side is a deterministic no-op (idempotent).
4. Pull-then-push on a clean vault remains stable across multiple cycles.
5. The plugin passes community-plugin review checklist (compliant manifest, no telemetry, no obfuscation, clear README disclosures).
6. The plugin runs on both desktop and mobile Obsidian (`isDesktopOnly: false`).
7. All core sync logic has ≥80% unit-test coverage; integration tests cover happy-path and conflict scenarios.

---

## 2. User Stories

### US-001: Configure WebDAV Connection

**As an** Obsidian user  
**I want to** enter my WebDAV endpoint URL, credentials, remote root path, and device identifier  
**So that** the plugin knows where to sync my vault

#### Acceptance Criteria
- [ ] Settings tab exposes fields: WebDAV URL, username, password, remote root path, device ID, connection timeout.
- [ ] Password is masked in the UI and stored in plugin `data.json`.
- [ ] Validation command tests connectivity and reports success or specific failure reason (auth, network, timeout).
- [ ] Invalid URLs or unreachable endpoints produce clear error messages.

### US-002: Preview Sync Plan (Dry Run)

**As an** Obsidian user  
**I want to** see what files would be created, updated, or conflicted before any data moves  
**So that** I can review and approve the plan

#### Acceptance Criteria
- [ ] A "Sync Preview" command computes the operation plan without modifying local or remote files.
- [ ] Preview displays: file path, operation type (pull, push, conflict), reason for operation.
- [ ] Preview renders in a modal or sidebar panel with scrollable list.
- [ ] Preview computation completes within 5 seconds for vaults up to 1,000 files.

### US-003: Pull Remote Changes

**As an** Obsidian user  
**I want to** download remote files that have changed since my last sync  
**So that** my local vault stays up to date

#### Acceptance Criteria
- [ ] "Pull" command fetches changed files from remote and writes them locally.
- [ ] Files unchanged since last snapshot are skipped.
- [ ] If a local file diverged from the snapshot, a conflict copy is created instead of overwriting.
- [ ] New remote files are created locally.
- [ ] Pull reports a summary: files updated, files created, conflicts created, errors encountered.

### US-004: Push Local Changes

**As an** Obsidian user  
**I want to** upload local files that have changed since my last sync  
**So that** my remote vault stays up to date

#### Acceptance Criteria
- [ ] "Push" command uploads changed files to remote.
- [ ] Files unchanged since last snapshot are skipped.
- [ ] If a remote file diverged from the snapshot, a conflict copy is created on remote instead of overwriting.
- [ ] New local files are created on remote (including intermediate directories via MKCOL).
- [ ] Push reports a summary: files uploaded, files created, conflicts created, errors encountered.

### US-005: Conflict Safety

**As an** Obsidian user  
**I want to** never lose data when both local and remote changed the same file  
**So that** I can manually reconcile differences later

#### Acceptance Criteria
- [ ] When both sides changed since last snapshot, the plugin creates a deterministic conflict file instead of overwriting either side.
- [ ] Conflict naming convention: `{original-name}.conflict-{deviceId}-{isoTimestamp}{ext}`.
- [ ] Conflict creation is reported in the operation summary.
- [ ] No automatic deletion of conflict files; user must clean up manually.

### US-006: Per-File Sync State

**As an** Obsidian user  
**I want to** resume sync after closing and reopening Obsidian  
**So that** the plugin remembers what it last saw

#### Acceptance Criteria
- [ ] Plugin persists a sync-state snapshot to `data.json` after every successful operation.
- [ ] State includes: file path, last-known size, last-known mtime, optional etag/hash, last-seen revision markers.
- [ ] State schema includes a version field for future migrations.
- [ ] On startup, plugin loads state and uses it as the baseline for the next sync plan.

### US-007: Proton Drive Compatibility

**As a** Proton Drive user  
**I want to** use this plugin with my Proton account via a WebDAV bridge  
**So that** I don't need a native Proton API integration

#### Acceptance Criteria
- [ ] Plugin works with rclone `serve webdav` and `proton-webdav-bridge` endpoints.
- [ ] Plugin tolerates mixed metadata quality (some bridges provide `X-OC-Mtime`, some don't).
- [ ] README includes step-by-step Proton bridge setup instructions.
- [ ] README documents known bridge caveats (performance, metadata limitations).

---

## 3. Interface Contracts

### 3.1 Obsidian Plugin API Surface

```typescript
// main.ts — Plugin entry point
export default class WebDAVSyncPlugin extends Plugin {
  settings: SyncSettings;
  state: SyncState;

  async onload(): Promise<void>;
  async onunload(): Promise<void>;

  // Commands registered via addCommand
  async validateConnection(): Promise<void>;
  async previewSync(): Promise<SyncPlan>;
  async pull(): Promise<SyncResult>;
  async push(): Promise<SyncResult>;
}

// Settings types
interface SyncSettings {
  webdavUrl: string;
  username: string;
  password: string;
  remoteRoot: string;      // e.g., "/vaults/obsidian"
  deviceId: string;        // user-defined, used in conflict names
  timeoutMs: number;       // default: 30000
  ignorePatterns: string[]; // glob/regex patterns for files to skip
}

// Sync state types
interface FileSnapshot {
  path: string;            // vault-relative, normalized
  size: number;
  mtime: number;           // ms since epoch
  etag?: string;           // server-provided if available
  hash?: string;           // local content hash if computed
}

interface SyncState {
  version: number;         // schema version, starts at 1
  lastSyncAt: number;      // timestamp of last successful sync
  snapshots: Record<string, FileSnapshot>; // path -> snapshot
}

// Planner output
interface SyncPlan {
  pulls: PullOp[];
  pushes: PushOp[];
  conflicts: ConflictOp[];
  skips: SkipOp[];
}

type PullOp = { type: 'pull'; path: string; reason: string };
type PushOp = { type: 'push'; path: string; reason: string };
type ConflictOp = { type: 'conflict'; path: string; localSnapshot: FileSnapshot | null; remoteSnapshot: FileSnapshot };
type SkipOp = { type: 'skip'; path: string; reason: string };

interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflictsCreated: number;
  errors: SyncError[];
}

interface SyncError {
  path: string;
  operation: 'pull' | 'push' | 'conflict';
  message: string;
}
```

### 3.2 WebDAV Transport Layer Interface

```typescript
// src/transport/webdav-client.ts
interface WebDAVClient {
  constructor(config: WebDAVConfig);

  // Returns normalized file listing with metadata
  async propfind(remotePath: string): Promise<WebDAVResource[]>;

  async get(remotePath: string): Promise<Uint8Array>;

  async put(remotePath: string, data: Uint8Array): Promise<void>;

  async mkcol(remotePath: string): Promise<void>;

  // Optional: server capabilities probe
  async probe(): Promise<ServerCapabilities>;
}

interface WebDAVConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

interface WebDAVResource {
  path: string;        // remote-relative path
  isDirectory: boolean;
  size: number;
  mtime: number;
  etag?: string;
}

interface ServerCapabilities {
  supportsEtag: boolean;
  supportsXMtime: boolean; // X-OC-Mtime or similar
}
```

### 3.3 CLI / Command Palette Interface

| Command | Palette Name | Behavior |
|---------|-------------|----------|
| `webdav-sync:validate` | "WebDAV Sync: Validate Connection" | Tests credentials and endpoint; shows notice |
| `webdav-sync:preview` | "WebDAV Sync: Preview Sync Plan" | Computes and displays dry-run plan |
| `webdav-sync:pull` | "WebDAV Sync: Pull from Remote" | Executes pull operations |
| `webdav-sync:push` | "WebDAV Sync: Push to Remote" | Executes push operations |

### 3.4 Error Cases

| Error | User-Facing Message | Recovery |
|-------|-------------------|----------|
| Network timeout | "Connection timed out after {timeout}ms. Check URL and network." | Retry or check settings |
| Auth failure (401) | "Authentication failed. Check username and password." | Update credentials |
| Propfind parse failure | "Server returned unexpected WebDAV response." | Check bridge/server health |
| Local write failure | "Could not write {path}: {reason}" | Check file permissions |
| Remote upload failure | "Could not upload {path}: {status}" | Retry or check remote space |
| Conflict during operation | "Conflict detected for {path}. Created conflict copy." | User reconciles manually |

---

## 4. Project Structure

```
obsidian-proton-sync/
├── specs/
│   └── obsidian-webdav-sync/
│       └── spec.md              # This document
├── src/
│   ├── main.ts                  # Plugin entry point, command registration
│   ├── settings.ts              # SyncSettings interface, defaults, migration
│   ├── state.ts                 # SyncState load/save, schema migration
│   ├── planner/
│   │   ├── planner.ts           # Diff engine: local vs remote vs snapshot
│   │   ├── snapshot.ts          # FileSnapshot helpers
│   │   └── ignore.ts            # Ignore-pattern matching
│   ├── transport/
│   │   ├── webdav-client.ts     # WebDAV PROPFIND/GET/PUT/MKCOL
│   │   └── types.ts             # WebDAVResource, ServerCapabilities
│   ├── commands/
│   │   ├── validate.ts          # Connection validation command
│   │   ├── preview.ts           # Dry-run preview command
│   │   ├── pull.ts              # Pull execution command
│   │   └── push.ts              # Push execution command
│   └── ui/
│       ├── settings-tab.ts      # Obsidian PluginSettingTab implementation
│       └── preview-modal.ts     # Modal for displaying sync plan
├── tests/
│   ├── unit/
│   │   ├── planner.test.ts
│   │   ├── snapshot.test.ts
│   │   ├── ignore.test.ts
│   │   └── state.test.ts
│   └── integration/
│       └── webdav-server.test.ts # Against local test WebDAV server
├── docs/
│   ├── architecture.md
│   └── security-considerations.md
├── esbuild.config.mjs
├── manifest.json                # Obsidian community-plugin manifest
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### New Files to Create

All files in `src/`, `tests/`, `docs/`, `manifest.json`, `README.md`, `CHANGELOG.md`, plus standard TypeScript build tooling.

### Existing Files to Modify

None — this is a greenfield plugin repository.

---

## 5. Code Style

### Language and Framework

- **TypeScript** targeting ES2020.
- **Obsidian API**: Use official `obsidian` package types. Avoid `require('fs')`, `require('path')`, or any Node/Electron APIs.
- **Mobile compatibility**: All file I/O must use Obsidian's `Vault` and `TFile` APIs (`vault.readBinary`, `vault.modifyBinary`, `vault.create`, `vault.getAbstractFileByPath`).

### Naming Conventions

- `PascalCase` for classes, interfaces, types (`WebDAVClient`, `SyncPlan`).
- `camelCase` for variables, functions, methods (`computePlan`, `fileSnapshot`).
- `UPPER_SNAKE_CASE` for constants (`DEFAULT_TIMEOUT_MS = 30000`).
- Files named in `kebab-case.ts`.

### Import Organization

1. External packages (`obsidian`).
2. Internal types (`../types`).
3. Internal utilities.

### Error Handling

- All async transport calls must catch errors and wrap them in domain-specific `SyncError` objects.
- Never swallow errors silently; always surface to user via `Notice` or modal.
- Use `try/catch` at command boundaries; inner functions may throw for control flow but must document thrown types.

### Path Handling

- All internal paths are **vault-relative** and use forward slashes (`notes/daily/2025-05-22.md`).
- Normalize paths on ingress (strip leading `/`, collapse `..` and `.`).
- Never use platform-specific path separators.

---

## 6. Testing Strategy

### Framework

- **Unit tests**: **Vitest** — chosen for fast execution, native ESM support, and TypeScript integration.
- **Integration tests**: Spin up a local WebDAV server (e.g., `webdav-server` npm package or a lightweight Python `wsgidav` container) and run pull/push/conflict scenarios against it.

### Coverage Target

- Core sync logic (planner, snapshot, state): **≥ 80%** line coverage.
- Transport layer: Error-path coverage required; happy path covered by integration tests.
- UI components: Manual validation via Obsidian test vault; automated testing where feasible.

### Test Categories

#### Unit Tests

| Module | Test Cases |
|--------|-----------|
| `planner.ts` | Identical local/remote/snapshot → no-op; local newer → push; remote newer → pull; both changed → conflict; new local file → push; new remote file → pull; deleted file handling (MVP: no-op unless explicitly configured later) |
| `snapshot.ts` | Path normalization edge cases (`./a/../b`, trailing slashes); snapshot equality with/without etag; hash computation |
| `ignore.ts` | Glob matching (`*.tmp`, `.git/`); exact path matching; nested directory exclusions |
| `state.ts` | Load missing `data.json` → empty state; save and reload round-trip; schema v1 → v2 migration stub |

#### Integration Tests

| Scenario | Steps |
|----------|-------|
| Clean pull | Set up remote files; pull; assert local files match remote; state snapshots populated |
| Clean push | Create local files; push; assert remote files match local; state snapshots populated |
| Idempotent repeat | Run sync twice with no changes; assert second run is no-op (zero uploads/downloads) |
| Conflict creation | Change same file locally and remotely independently; sync; assert conflict copy exists on both sides |
| Directory creation | Push nested new file; assert intermediate directories created via MKCOL |
| Auth failure | Use bad password; assert clear 401 error, no partial writes |

#### Mobile Compatibility Validation

- Build plugin and load into Obsidian mobile (or mobile emulator).
- Smoke test: settings load, validation runs, preview renders, pull/push complete without Node API errors.

---

## 7. Non-Functional Requirements

### Security

- No client-side telemetry or analytics.
- No code obfuscation or minification that violates community-plugin policy.
- Password stored in plugin `data.json`; Obsidian encrypts plugin data at rest using OS-level mechanisms. Document that this is not zero-knowledge.
- README must disclose: network usage (WebDAV calls), account requirements (WebDAV credentials), and data flow (file content traverses the bridge and network).

### Performance

- Preview plan computation: ≤ 5 seconds for 1,000 files on desktop, ≤ 10 seconds on mobile.
- Per-file upload/download timeout: configurable, default 30 seconds.
- Memory: Obsidian's `vault.readBinary` returns full `ArrayBuffer`; accept full-buffer approach for MVP. Document a practical file size limit (e.g., 25 MB) in README.

### Availability / Reliability

- Partial failures: if one file errors, continue with remaining files and report summary.
- Network retries: 3 attempts with exponential backoff on transient errors (5xx, network timeout).

### Maintainability

- State schema versioned from day one (`SyncState.version`).
- All planner decisions logged with reason strings for debuggability.
- Documented architecture decision records for deferred features (auto-sync, deletion policies).

### Compliance

- Obsidian community plugin guidelines: compliant `manifest.json`, clear `README.md`, `LICENSE` file.
- No prohibited APIs (no `eval`, no `new Function`, no dynamic `require`).

---

## 8. Boundaries

### Always Do

1. **Always create conflict copies** when both local and remote diverged from the snapshot. Never overwrite silently.
2. **Always validate the connection** before the first sync; surface clear error messages.
3. **Always persist state** after every successful operation so the next sync has a reliable baseline.
4. **Always use Obsidian APIs** for file I/O; never import Node/Electron modules.
5. **Always report a summary** after pull, push, and preview operations.
6. **Always normalize paths** to vault-relative forward-slash format before any comparison or remote operation.
7. **Always write tests before feature code** for planner logic, snapshot rules, and state migrations.

### Ask First

1. **Auto-sync / scheduled sync**: MVP defers this. Before implementing, ask: what interval? conflict policy? battery impact on mobile?
2. **Deletion propagation**: MVP does not auto-delete. Before enabling, ask: safe-deletion window? trash vs permanent? undo mechanism?
3. **Content-level merge**: MVP creates conflict copies. Before adding merge UI, ask: what merge strategy (3-way, LCS)? which file types?
4. **Multi-remote profiles**: Before adding profile switching, ask: how many profiles typical? UI complexity budget?
5. **End-to-end encryption UX**: Before adding encryption layer, ask: key management? Proton already encrypts at rest — is this redundant?
6. **Hash algorithm choice**: Default recommendation is SHA-256 or xxhash for performance. Confirm if cryptographic strength is required or if fast non-cryptographic hash is acceptable for change detection.
7. **Ignore pattern syntax**: Default recommendation is minimatch-style globs. Confirm if gitignore-style negation patterns are needed for MVP.

### Never Do

1. **Never silently overwrite user data** — this is the core safety invariant.
2. **Never use Node.js or Electron APIs** (`fs`, `path`, `crypto` from Node) — breaks mobile compatibility.
3. **Never implement client-side telemetry** — violates privacy commitment and community policy.
4. **Never obfuscate or minify distributed code** — violates community-plugin transparency rules.
5. **Never auto-delete files during MVP** — deletion propagation is explicitly deferred.
6. **Never call Proton Drive native APIs** — Proton integration is WebDAV-bridge only.
7. **Never store credentials outside plugin data** (no localStorage, no separate credential files).

---

## 9. Delivery Sequencing

### Phase 1: Scaffold, Settings, Transport, Test Harness

- Plugin scaffold (`main.ts`, `manifest.json`, build toolchain).
- Settings tab with all configuration fields.
- WebDAV transport client with PROPFIND/GET/PUT/MKCOL.
- Unit test harness and first unit tests for transport utilities.
- **Validation gate**: Build produces valid `main.js`; settings persist and load.

### Phase 2: Planner, Preview, Pull

- Sync planner with diff logic (local vs remote vs snapshot).
- Preview command (dry-run modal).
- Pull command with conflict-safe writes.
- State persistence (`data.json` save/load).
- **Validation gate**: Unit tests pass for planner; integration test passes for clean pull + conflict.

### Phase 3: Push, State Hardening, Idempotency

- Push command with conflict-safe remote writes.
- State schema versioning and migration stub.
- Idempotency fixes: repeat sync with no changes is no-op.
- **Validation gate**: Pull-then-push stability test passes; idempotency test passes.

### Phase 4: Documentation, Proton Guide, Release Packaging

- `README.md` with setup, Proton bridge examples, limitations, troubleshooting.
- `docs/architecture.md` and `docs/security-considerations.md`.
- `CHANGELOG.md` and `LICENSE`.
- Community-plugin release assets (`manifest.json`, `main.js`, optional `styles.css`).
- Mobile smoke test.
- **Validation gate**: Plugin passes Obsidian community-plugin checklist; README disclosures complete.

---

## 10. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Test framework: Vitest** | Fast execution, native ESM support, TypeScript integration. |
| 2 | **Obsidian API version: `1.0.0`** | Minimum target for stable mobile plugin support. |
| 3 | **Hash algorithm: xxhash / MurmurHash** | Fast, non-cryptographic; sufficient for change detection. |
| 4 | **Ignore patterns: Minimatch globs** | Simple, well-understood; no negation for MVP. |
| 5 | **Large files: full-buffer, 25 MB limit** | Obsidian API constraint; document limit in README. |
| 6 | **Integration tests: `webdav-server` npm** | Zero extra system dependencies. |
| 7 | **Manifest branding** | `id: obsidian-proton-drive-sync`, `name: Proton Drive Sync`, `author: John Ferguson (john.ferguson@v1truv1us.dev)`, `minAppVersion: 1.0.0`. |

---

## 11. Appendix: Data Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Obsidian  │────▶│  SyncPlanner │────▶│  WebDAVClient   │
│   Vault     │     │  (diff engine)│     │  (transport)    │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Plugin     │     │  SyncState   │     │  WebDAV Server  │
│  data.json  │◄────│  (snapshots) │     │  (remote store) │
└─────────────┘     └──────────────┘     └─────────────────┘
```

---

## Verification Checklist

- [x] All six spec sections are present (Objective, Interfaces, Structure, Style, Testing, Boundaries).
- [x] All user stories have acceptance criteria.
- [x] Non-functional requirements defined (Security, Performance, Availability, Maintainability, Compliance).
- [x] Interface contracts include function signatures, error cases, and CLI commands.
- [x] Project structure lists all new files and their responsibilities.
- [x] Code style covers naming, imports, error handling, and path normalization.
- [x] Testing strategy specifies framework, coverage targets, unit + integration + mobile categories.
- [x] Boundaries include always-do, ask-first, and never-do rules.
- [x] All `[NEEDS CLARIFICATION]` markers resolved.
- [x] Delivery phases map to validation gates.
- [x] Success criteria are specific and measurable.
