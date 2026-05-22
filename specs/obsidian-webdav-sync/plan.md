# Obsidian WebDAV Sync Plugin — Implementation Plan

> Derived from: `specs/obsidian-webdav-sync/spec.md`

---

## Overview

This plan decomposes the spec into 35 atomic tasks across 4 phases. Each phase produces a buildable, testable state. Tasks are sized to ~30–60 minutes. Dependency ordering ensures no blockers mid-implementation.

---

## Phase 1: Scaffold, Settings, Transport, Test Harness

**Goal:** Plugin builds, settings persist, WebDAV transport talks to a server, test harness runs.

### Task P1-T01: Initialize Plugin Scaffold
- **Depends On:** None
- **Files:** `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `.gitignore`
- **Acceptance Criteria:**
  - [ ] `npm install` succeeds with `obsidian` as a dev dependency.
  - [ ] `npm run build` produces `main.js` in the project root.
  - [ ] Build output is valid ES module with no TypeScript errors.
- **Spec Reference:** Section 4 (Project Structure)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T02: Create `manifest.json`
- **Depends On:** P1-T01
- **Files:** `manifest.json`
- **Acceptance Criteria:**
  - [ ] `manifest.json` contains valid fields: `id: obsidian-proton-drive-sync`, `name: Proton Drive Sync`, `author`, `minAppVersion: 1.0.0`, `version: 0.1.0`.
  - [ ] Manifest passes Obsidian community-plugin schema validation.
- **Spec Reference:** Section 3.4 (Manifest), Decisions Log #7
- **Estimated Time:** 15 min
- **Complexity:** Low

### Task P1-T03: Create `SyncSettings` Interface and Defaults
- **Depends On:** P1-T01
- **Files:** `src/settings.ts`
- **Acceptance Criteria:**
  - [ ] `SyncSettings` interface defined with all fields (url, username, password, remoteRoot, deviceId, timeoutMs, ignorePatterns).
  - [ ] `DEFAULT_SETTINGS` object provides sensible defaults (timeout: 30000, ignorePatterns: `[]`).
  - [ ] Settings load from and save to plugin `data.json` via `Plugin.loadData` / `Plugin.saveData`.
- **Spec Reference:** US-001, Section 3.1
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T04: Implement Settings Tab UI
- **Depends On:** P1-T03
- **Files:** `src/ui/settings-tab.ts`
- **Acceptance Criteria:**
  - [ ] `SettingsTab` extends `PluginSettingTab` with input fields for all settings.
  - [ ] Password field is masked (`TextComponent.setPlaceholder` + type handling).
  - [ ] Changes persist immediately to `data.json`.
  - [ ] UI renders correctly in Obsidian desktop test vault.
- **Spec Reference:** US-001, Section 3.1
- **Estimated Time:** 45 min
- **Complexity:** Medium

### Task P1-T05: Create WebDAV Transport Types
- **Depends On:** P1-T01
- **Files:** `src/transport/types.ts`
- **Acceptance Criteria:**
  - [ ] `WebDAVConfig`, `WebDAVResource`, `ServerCapabilities` interfaces defined.
  - [ ] Types match contract from Section 3.2 of spec.
- **Spec Reference:** Section 3.2
- **Estimated Time:** 15 min
- **Complexity:** Low

### Task P1-T06: Implement WebDAV PROPFIND
- **Depends On:** P1-T05
- **Files:** `src/transport/webdav-client.ts`
- **Acceptance Criteria:**
  - [ ] `propfind(remotePath)` sends authenticated PROPFIND request.
  - [ ] Parses XML response into `WebDAVResource[]` with path, size, mtime, etag, isDirectory.
  - [ ] Handles depth=1 for directory listings.
  - [ ] Unit test: mock fetch response returns expected resource array.
- **Spec Reference:** Section 3.2
- **Estimated Time:** 45 min
- **Complexity:** Medium

### Task P1-T07: Implement WebDAV GET
- **Depends On:** P1-T05
- **Files:** `src/transport/webdav-client.ts`
- **Acceptance Criteria:**
  - [ ] `get(remotePath)` returns `Uint8Array`.
  - [ ] Handles HTTP errors (401, 404, 500) with descriptive errors.
  - [ ] Unit test: mock fetch returns binary data, parsed correctly.
- **Spec Reference:** Section 3.2
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T08: Implement WebDAV PUT
- **Depends On:** P1-T05
- **Files:** `src/transport/webdav-client.ts`
- **Acceptance Criteria:**
  - [ ] `put(remotePath, data)` uploads `Uint8Array`.
  - [ ] Sets correct `Content-Type` (`application/octet-stream`).
  - [ ] Handles HTTP errors with descriptive errors.
  - [ ] Unit test: mock fetch verifies request body and headers.
- **Spec Reference:** Section 3.2
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T09: Implement WebDAV MKCOL
- **Depends On:** P1-T05
- **Files:** `src/transport/webdav-client.ts`
- **Acceptance Criteria:**
  - [ ] `mkcol(remotePath)` creates intermediate directories.
  - [ ] Handles 201 (created) and 405 (already exists) as success.
  - [ ] Unit test: mock fetch verifies MKCOL method and path.
- **Spec Reference:** Section 3.2
- **Estimated Time:** 20 min
- **Complexity:** Low

### Task P1-T10: Implement Connection Validation Command
- **Depends On:** P1-T06, P1-T04
- **Files:** `src/commands/validate.ts`, `src/main.ts`
- **Acceptance Criteria:**
  - [ ] `validateConnection()` sends PROPFIND to remote root.
  - [ ] Success: shows `Notice("Connection valid")`.
  - [ ] Failure: shows `Notice` with specific reason (auth, timeout, network).
  - [ ] Registered as command palette item: "WebDAV Sync: Validate Connection".
  - [ ] Manual test: validate against real WebDAV endpoint succeeds/fails appropriately.
- **Spec Reference:** US-001, Section 3.3
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T11: Set Up Vitest Test Harness
- **Depends On:** P1-T01
- **Files:** `vitest.config.ts`, `tests/setup.ts`, `.gitignore`
- **Acceptance Criteria:**
  - [ ] `npm run test` runs Vitest and passes a dummy test.
  - [ ] TypeScript path aliases resolved (e.g., `@/` maps to `src/`).
  - [ ] Coverage reporter configured (text + lcov).
- **Spec Reference:** Section 6 (Testing Strategy)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P1-T12: Write Transport Unit Tests
- **Depends On:** P1-T11, P1-T06, P1-T07, P1-T08, P1-T09
- **Files:** `tests/unit/transport.test.ts`
- **Acceptance Criteria:**
  - [ ] Tests for PROPFIND parsing (valid XML, malformed XML, empty directory).
  - [ ] Tests for GET (success, 404, 401).
  - [ ] Tests for PUT (success, 403).
  - [ ] Tests for MKCOL (success, already exists, nested path).
  - [ ] All tests pass; coverage for transport module ≥ 80%.
- **Spec Reference:** Section 6 (Testing Strategy)
- **Estimated Time:** 45 min
- **Complexity:** Medium

**Phase 1 Validation Gate:**
- [ ] `npm run build` produces valid `main.js`.
- [ ] `npm run test` passes all transport unit tests.
- [ ] Settings tab renders in Obsidian test vault; settings persist across reload.
- [ ] Validation command shows correct success/failure notices.

---

## Phase 2: Planner, Preview, Pull

**Goal:** Plugin can compute a sync plan, show a preview, and safely pull remote changes.

### Task P2-T01: Create `FileSnapshot` Types and Helpers
- **Depends On:** P1-T01
- **Files:** `src/planner/snapshot.ts`
- **Acceptance Criteria:**
  - [ ] `FileSnapshot` interface with path, size, mtime, etag, hash fields.
  - [ ] `normalizePath(path)` strips leading slashes, collapses `.` and `..`.
  - [ ] `snapshotsEqual(a, b)` compares snapshots with etag fallback to size+mtime.
  - [ ] Unit tests for normalization edge cases and equality logic.
- **Spec Reference:** Section 3.1, Section 5 (Path Handling)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P2-T02: Implement Ignore Pattern Matching
- **Depends On:** P2-T01
- **Files:** `src/planner/ignore.ts`
- **Acceptance Criteria:**
  - [ ] `shouldIgnore(path, patterns)` supports minimatch globs (`*.tmp`, `.git/**`).
  - [ ] `.obsidian/` is ignored by default (Obsidian system folder).
  - [ ] Unit tests for exact match, glob, nested directory, and default ignores.
- **Spec Reference:** Section 5 (Path Handling), Decisions Log #4
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P2-T03: Implement Sync Planner Diff Engine
- **Depends On:** P2-T01, P2-T02
- **Files:** `src/planner/planner.ts`
- **Acceptance Criteria:**
  - [ ] `computePlan(local, remote, snapshot)` returns `SyncPlan` with pulls, pushes, conflicts, skips.
  - [ ] Identical local/remote/snapshot → all skips.
  - [ ] Local newer (mtime/size/hash changed), remote matches snapshot → push.
  - [ ] Remote newer, local matches snapshot → pull.
  - [ ] Both diverged from snapshot → conflict.
  - [ ] New local file → push; new remote file → pull.
  - [ ] Unit tests cover all cases above plus edge cases (missing snapshot, etag-only changes).
- **Spec Reference:** US-002, US-003, US-004, US-005, Section 3.1
- **Estimated Time:** 60 min
- **Complexity:** High

### Task P2-T04: Implement SyncState Load/Save
- **Depends On:** P1-T03
- **Files:** `src/state.ts`
- **Acceptance Criteria:**
  - [ ] `loadState(plugin)` reads `data.json` and returns `SyncState` with schema version check.
  - [ ] `saveState(plugin, state)` writes `SyncState` to `data.json`.
  - [ ] Missing `data.json` → returns empty state (version 1, empty snapshots).
  - [ ] `SyncState.version` field present; future migration stub documented.
  - [ ] Unit tests for load/save round-trip and missing data.
- **Spec Reference:** US-006, Section 3.1
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P2-T05: Implement Preview Command (Dry Run)
- **Depends On:** P2-T03, P2-T04, P1-T06
- **Files:** `src/commands/preview.ts`, `src/ui/preview-modal.ts`, `src/main.ts`
- **Acceptance Criteria:**
  - [ ] "WebDAV Sync: Preview Sync Plan" command computes plan without modifying files.
  - [ ] Modal displays: file path, operation type (pull/push/conflict/skip), reason.
  - [ ] Modal is scrollable and shows summary counts.
  - [ ] Preview completes in ≤ 5 seconds for 1,000 files.
  - [ ] Manual test: preview shows expected plan against test vault.
- **Spec Reference:** US-002, Section 3.3
- **Estimated Time:** 45 min
- **Complexity:** Medium

### Task P2-T06: Implement Pull Command
- **Depends On:** P2-T05, P1-T07, P1-T09, P2-T04
- **Files:** `src/commands/pull.ts`, `src/main.ts`
- **Acceptance Criteria:**
  - [ ] "WebDAV Sync: Pull from Remote" executes all pull operations from plan.
  - [ ] Uses Obsidian `Vault.create` / `TFile.modifyBinary` for writes (no Node APIs).
  - [ ] Creates intermediate directories via `Vault.create` with folder path.
  - [ ] Conflicts produce local side-by-side copy with naming convention `file.conflict-{deviceId}-{timestamp}.md`.
  - [ ] After successful pull, state snapshots are updated and saved.
  - [ ] Summary `Notice` shows: pulled, created, conflicts, errors.
  - [ ] Partial failures: continue with remaining files, report errors in summary.
- **Spec Reference:** US-003, US-005, US-006, Section 3.3
- **Estimated Time:** 60 min
- **Complexity:** High

### Task P2-T07: Write Planner Unit Tests
- **Depends On:** P2-T03
- **Files:** `tests/unit/planner.test.ts`
- **Acceptance Criteria:**
  - [ ] Test: no changes → all skips.
  - [ ] Test: local newer → push.
  - [ ] Test: remote newer → pull.
  - [ ] Test: both changed → conflict.
  - [ ] Test: new local file → push.
  - [ ] Test: new remote file → pull.
  - [ ] Test: ignore patterns filter out matching files.
  - [ ] Coverage for planner module ≥ 80%.
- **Spec Reference:** Section 6 (Testing Strategy)
- **Estimated Time:** 45 min
- **Complexity:** Medium

### Task P2-T08: Write Snapshot/State Unit Tests
- **Depends On:** P2-T01, P2-T04
- **Files:** `tests/unit/snapshot.test.ts`, `tests/unit/state.test.ts`
- **Acceptance Criteria:**
  - [ ] Snapshot tests: normalization, equality with/without etag, hash comparison.
  - [ ] State tests: load missing file, save and reload, schema version field present.
  - [ ] Coverage for snapshot and state modules ≥ 80%.
- **Spec Reference:** Section 6 (Testing Strategy)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P2-T09: Integration Test — Clean Pull + Conflict
- **Depends On:** P1-T12, P2-T06, P2-T07
- **Files:** `tests/integration/webdav-server.test.ts`
- **Acceptance Criteria:**
  - [ ] Spin up local `webdav-server` in test setup.
  - [ ] Test: remote has files, local vault is empty → pull creates local files matching remote.
  - [ ] Test: remote and local both changed same file independently → pull creates conflict copy.
  - [ ] Test: state snapshots match remote after pull.
- **Spec Reference:** Section 6 (Integration Tests)
- **Estimated Time:** 45 min
- **Complexity:** Medium

**Phase 2 Validation Gate:**
- [ ] `npm run test` passes all unit and integration tests.
- [ ] Preview command shows accurate dry-run plan in Obsidian test vault.
- [ ] Pull command correctly downloads remote files and creates conflict copies.
- [ ] State persists across plugin reloads.

---

## Phase 3: Push, State Hardening, Idempotency

**Goal:** Plugin can push local changes, handles retries, and repeat syncs are no-ops.

### Task P3-T01: Implement Push Command
- **Depends On:** P2-T06, P1-T08, P1-T09, P2-T04
- **Files:** `src/commands/push.ts`, `src/main.ts`
- **Acceptance Criteria:**
  - [ ] "WebDAV Sync: Push to Remote" executes all push operations from plan.
  - [ ] Uses `vault.readBinary` to read local files (no Node APIs).
  - [ ] Creates remote intermediate directories via MKCOL before PUT.
  - [ ] Conflicts produce remote side-by-side copy with deterministic naming.
  - [ ] After successful push, state snapshots are updated and saved.
  - [ ] Summary `Notice` shows: uploaded, created, conflicts, errors.
  - [ ] Partial failures: continue with remaining files, report errors.
- **Spec Reference:** US-004, US-005, US-006, Section 3.3
- **Estimated Time:** 60 min
- **Complexity:** High

### Task P3-T02: Implement Retry Logic with Exponential Backoff
- **Depends On:** P1-T06, P1-T07, P1-T08
- **Files:** `src/transport/webdav-client.ts`
- **Acceptance Criteria:**
  - [ ] Transport methods retry up to 3 times on transient errors (5xx, network timeout, ECONNRESET).
  - [ ] Backoff delays: 1s, 2s, 4s between retries.
  - [ ] Non-transient errors (401, 403, 404) fail immediately without retry.
  - [ ] Unit tests simulate transient failures and verify retry behavior.
- **Spec Reference:** Section 7 (Availability / Reliability)
- **Estimated Time:** 30 min
- **Complexity:** Medium

### Task P3-T03: Add State Schema Versioning
- **Depends On:** P2-T04
- **Files:** `src/state.ts`
- **Acceptance Criteria:**
  - [ ] `SyncState.version` is set to `1` for new states.
  - [ ] `loadState` checks version; if unknown version, throws with clear error.
  - [ ] Migration function stub exists for future v1→v2 upgrades.
  - [ ] Unit test: loading future-version state throws; loading v1 succeeds.
- **Spec Reference:** US-006, Section 7 (Maintainability)
- **Estimated Time:** 20 min
- **Complexity:** Low

### Task P3-T04: Idempotency Test — Repeat Sync No-Op
- **Depends On:** P2-T09, P3-T01
- **Files:** `tests/integration/idempotency.test.ts`
- **Acceptance Criteria:**
  - [ ] Run pull on clean vault; state saved.
  - [ ] Run pull again immediately with no remote changes.
  - [ ] Assert: zero files downloaded; plan is all skips.
  - [ ] Same test for push: push once, push again → zero uploads.
- **Spec Reference:** Success Criteria #3, Section 6 (Integration Tests)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P3-T05: Pull-Then-Push Stability Test
- **Depends On:** P3-T04
- **Files:** `tests/integration/stability.test.ts`
- **Acceptance Criteria:**
  - [ ] Start with empty local vault, remote has files.
  - [ ] Pull → local matches remote.
  - [ ] Push immediately → zero uploads (no local changes to push).
  - [ ] State remains stable after cycle.
- **Spec Reference:** Success Criteria #4, Section 6 (Integration Tests)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P3-T06: Integration Test — Conflict Creation on Push
- **Depends On:** P2-T09, P3-T01
- **Files:** `tests/integration/webdav-server.test.ts`
- **Acceptance Criteria:**
  - [ ] Sync once to establish baseline state.
  - [ ] Change file locally and independently on remote.
  - [ ] Push → assert conflict file created on remote with correct naming.
  - [ ] Original remote file is not overwritten.
- **Spec Reference:** US-005, Section 6 (Integration Tests)
- **Estimated Time:** 30 min
- **Complexity:** Low

**Phase 3 Validation Gate:**
- [ ] `npm run test` passes all unit and integration tests including idempotency and stability.
- [ ] Push command uploads files and creates conflict copies correctly.
- [ ] Retry logic tested with mocked transient failures.
- [ ] Pull-then-push cycle is stable.

---

## Phase 4: Documentation, Proton Guide, Release Packaging

**Goal:** Plugin is documented, release-ready, and passes community-plugin checklist.

### Task P4-T01: Write `README.md`
- **Depends On:** None (content-only)
- **Files:** `README.md`
- **Acceptance Criteria:**
  - [ ] Installation instructions (manual and community-plugin browser).
  - [ ] WebDAV configuration steps with screenshots or field descriptions.
  - [ ] Proton Drive bridge setup guide (rclone, proton-webdav-bridge examples).
  - [ ] Limitations section (no auto-sync, no auto-delete, 25 MB file size note).
  - [ ] Troubleshooting section (auth errors, timeouts, bridge caveats).
  - [ ] Data flow and privacy disclosure (credentials stored in plugin data, network usage).
  - [ ] Backup guidance: "Back up your vault before first sync."
- **Spec Reference:** Section 9 (Phase 4), Section 7 (Security)
- **Estimated Time:** 45 min
- **Complexity:** Low

### Task P4-T02: Write `docs/architecture.md`
- **Depends On:** None (content-only)
- **Files:** `docs/architecture.md`
- **Acceptance Criteria:**
  - [ ] Layered architecture diagram (Settings/UI → Planner → Transport → State).
  - [ ] Description of each layer's responsibility.
  - [ ] Data flow: how a sync request moves through the system.
  - [ ] Deferral rationale for auto-sync, deletion propagation, content merge.
- **Spec Reference:** Section 9 (Phase 4)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P4-T03: Write `docs/security-considerations.md`
- **Depends On:** None (content-only)
- **Files:** `docs/security-considerations.md`
- **Acceptance Criteria:**
  - [ ] Credential storage: encrypted at rest by OS via Obsidian plugin data.
  - [ ] No telemetry or external network calls beyond configured WebDAV endpoint.
  - [ ] Conflict-safety invariant explained.
  - [ ] Proton bridge security notes (data decrypted at bridge layer).
  - [ ] Recommendations: use strong WebDAV credentials, enable 2FA on Proton where available.
- **Spec Reference:** Section 7 (Security)
- **Estimated Time:** 30 min
- **Complexity:** Low

### Task P4-T04: Write `CHANGELOG.md`
- **Depends On:** None
- **Files:** `CHANGELOG.md`
- **Acceptance Criteria:**
  - [ ] Follows Keep a Changelog format.
  - [ ] v0.1.0 entry lists MVP features: WebDAV sync, pull/push/preview, conflict safety, Proton compatibility.
- **Spec Reference:** Section 9 (Phase 4)
- **Estimated Time:** 15 min
- **Complexity:** Low

### Task P4-T05: Add `LICENSE`
- **Depends On:** None
- **Files:** `LICENSE`
- **Acceptance Criteria:**
  - [ ] MIT license (standard for Obsidian community plugins unless otherwise specified).
- **Spec Reference:** Section 9 (Phase 4)
- **Estimated Time:** 10 min
- **Complexity:** Low

### Task P4-T06: Mobile Smoke Test
- **Depends On:** P3-T05
- **Files:** None (manual validation)
- **Acceptance Criteria:**
  - [ ] Plugin loads in Obsidian mobile (or mobile emulator) without errors.
  - [ ] Settings tab renders and accepts input.
  - [ ] Validation command runs and reports result.
  - [ ] Preview command computes and displays plan.
  - [ ] Pull and push complete without Node API errors.
- **Spec Reference:** Success Criteria #6, Section 6 (Mobile Compatibility)
- **Estimated Time:** 30 min
- **Complexity:** Medium

### Task P4-T07: Community Plugin Checklist Validation
- **Depends On:** P4-T01, P4-T04, P4-T05, P1-T02
- **Files:** `manifest.json`, `README.md`, `CHANGELOG.md`, `LICENSE`
- **Acceptance Criteria:**
  - [ ] `manifest.json` is valid and complete.
  - [ ] `main.js` is unminified and unobfuscated (esbuild with `minify: false`).
  - [ ] README includes network/account disclosures.
  - [ ] No prohibited APIs (`eval`, `new Function`, dynamic `require`).
  - [ ] Plugin loads in fresh Obsidian test vault without console errors.
- **Spec Reference:** Success Criteria #5, Section 7 (Compliance)
- **Estimated Time:** 30 min
- **Complexity:** Low

**Phase 4 Validation Gate:**
- [ ] All documentation complete and accurate.
- [ ] Mobile smoke test passes.
- [ ] Community-plugin checklist passes.
- [ ] Release tag `v0.1.0` created with `main.js`, `manifest.json`, `styles.css` (if any).

---

## Dependency Graph Summary

```
Phase 1 (Scaffold)
├── P1-T01 → P1-T02, P1-T03, P1-T05, P1-T11
├── P1-T03 → P1-T04
├── P1-T05 → P1-T06, P1-T07, P1-T08, P1-T09
├── P1-T06 + P1-T04 → P1-T10
└── P1-T06..P1-T09 + P1-T11 → P1-T12

Phase 2 (Planner + Pull)
├── P1-T01 → P2-T01
├── P2-T01 → P2-T02, P2-T03
├── P2-T02 + P2-T01 → P2-T03
├── P1-T03 → P2-T04
├── P2-T03 + P2-T04 + P1-T06 → P2-T05
├── P2-T05 + P1-T07 + P1-T09 + P2-T04 → P2-T06
├── P2-T03 → P2-T07
├── P2-T01 + P2-T04 → P2-T08
└── P1-T12 + P2-T06 + P2-T07 → P2-T09

Phase 3 (Push + Hardening)
├── P2-T06 + P1-T08 + P1-T09 + P2-T04 → P3-T01
├── P1-T06..P1-T08 → P3-T02
├── P2-T04 → P3-T03
├── P2-T09 + P3-T01 → P3-T04, P3-T06
├── P3-T04 → P3-T05

Phase 4 (Docs + Release)
├── P3-T05 → P4-T06
└── P4-T01 + P4-T04 + P4-T05 + P1-T02 → P4-T07
```

---

## Parallelization Opportunities

Within each phase, these task groups can proceed in parallel:

- **Phase 1:** P1-T03 (settings) and P1-T05..P1-T09 (transport) are independent until P1-T10.
- **Phase 2:** P2-T01 (snapshot) and P2-T04 (state) are independent; P2-T07 and P2-T08 can run in parallel.
- **Phase 3:** P3-T02 (retries) and P3-T03 (versioning) are independent of each other and of P3-T01.
- **Phase 4:** P4-T01..P4-T05 (all docs) can be written in parallel.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Obsidian mobile API limitations (no streaming binary) | Medium | Medium | Document 25 MB limit; full-buffer approach already planned. |
| WebDAV bridge metadata inconsistency (missing etag/mtime) | High | Medium | Conservative planner uses size+mtime fallback; hash for additional confidence. |
| `webdav-server` npm package unmaintained / broken | Low | Low | Fallback to `wsgidav` Python or manual mock in tests. |
| Conflict naming collisions on repeated syncs | Medium | Medium | Timestamp + deviceId ensures uniqueness; document cleanup guidance. |
| Obsidian `vault.create` / `modifyBinary` behavior differences on mobile | Medium | High | Mobile smoke test in P4-T06 catches this early. |
| Plugin data.json corruption on crash mid-write | Low | High | Atomic write not available via Obsidian API; accept risk for MVP; document backup guidance. |

---

## Coverage Traceability Matrix

| Spec Acceptance Criterion | Covering Task(s) |
|--------------------------|------------------|
| US-001 AC: Settings fields | P1-T03, P1-T04 |
| US-001 AC: Password masked | P1-T04 |
| US-001 AC: Validation command | P1-T10 |
| US-002 AC: Preview computes plan | P2-T05 |
| US-002 AC: Preview displays operations | P2-T05 |
| US-002 AC: Preview timing | P2-T05 |
| US-003 AC: Pull fetches changes | P2-T06 |
| US-003 AC: Pull skips unchanged | P2-T06, P2-T03 |
| US-003 AC: Pull conflict copies | P2-T06 |
| US-003 AC: Pull summary | P2-T06 |
| US-004 AC: Push uploads changes | P3-T01 |
| US-004 AC: Push skips unchanged | P3-T01, P2-T03 |
| US-004 AC: Push conflict copies | P3-T01 |
| US-004 AC: Push summary | P3-T01 |
| US-005 AC: Conflict copies created | P2-T06, P3-T01, P3-T06 |
| US-005 AC: Deterministic naming | P2-T06, P3-T01 |
| US-005 AC: No auto-deletion | P2-T06, P3-T01 (boundary rule) |
| US-006 AC: State persists | P2-T04, P2-T06, P3-T01, P3-T03 |
| US-006 AC: Schema versioning | P3-T03 |
| US-007 AC: Proton bridge compatibility | P1-T06..P1-T09 (transport), P4-T01 (docs) |
| US-007 AC: README Proton guide | P4-T01 |
| Success Criterion #1: Configure in 5 min | P1-T04, P1-T10, P4-T01 |
| Success Criterion #2: No silent overwrite | P2-T06, P3-T01, P2-T03 |
| Success Criterion #3: Idempotent repeat | P3-T04 |
| Success Criterion #4: Pull-then-push stable | P3-T05 |
| Success Criterion #5: Community checklist | P4-T07 |
| Success Criterion #6: Mobile compatible | P1-T01..P1-T12 (no Node APIs), P4-T06 |
| Success Criterion #7: ≥80% coverage | P1-T12, P2-T07, P2-T08, P2-T09, P3-T04..P3-T06 |

---

## Verification Checklist

- [x] Every spec acceptance criterion is covered by at least one task.
- [x] Every task has all required fields (ID, Title, Depends On, Files, Acceptance Criteria, Spec Reference, Estimated Time, Complexity).
- [x] Dependency graph has no cycles.
- [x] Each phase produces a buildable, testable state.
- [x] Parallel tracks identified within phases.
- [x] Risk assessment with mitigations included.
- [x] Coverage traceability matrix maps spec ACs to tasks.
