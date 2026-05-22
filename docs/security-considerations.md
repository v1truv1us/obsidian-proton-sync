# Security Considerations

## Credential Storage

- WebDAV credentials (username, password) are stored in Obsidian's plugin data file (`data.json`)
- Obsidian encrypts plugin data at rest using OS-level mechanisms (e.g., macOS Keychain, Windows DPAPI)
- This is **not** zero-knowledge storage — anyone with access to your device and OS credentials could potentially read them
- Use strong, unique passwords for your WebDAV endpoints

## Network Security

- The plugin communicates **only** with the configured WebDAV endpoint
- No telemetry, analytics, or external network calls are made
- When using a Proton Drive bridge:
  - Data is decrypted at the bridge layer before being served via WebDAV
  - WebDAV traffic on localhost is unencrypted (local-only)
  - If exposing the bridge beyond localhost, use HTTPS and authentication

## Data Integrity

### Conflict Safety Invariant

The plugin's core safety guarantee: **sync operations never silently overwrite data**.

When both local and remote versions of a file have changed since the last sync:
- The original file on each side is preserved
- A deterministic conflict copy is created: `{name}.conflict-{deviceId}-{timestamp}{ext}`
- The user must manually reconcile differences

### State Integrity

- Sync state is persisted after every successful operation
- State schema is versioned (`SyncState.version`) to support future migrations
- Partial failures: the operation continues with remaining files; successfully processed files update state

## Privacy

- No client-side telemetry or analytics
- No code obfuscation
- No data leaves your device except via the configured WebDAV endpoint
- The plugin does not read, transmit, or process file contents beyond sync operations

## Recommendations

1. **Back up your vault** before first sync and before changing sync settings
2. **Enable 2FA** on your Proton Drive account where available
3. **Use a strong WebDAV password** unique to this endpoint
4. **Run bridges on localhost only** — do not expose WebDAV to the network unless secured with HTTPS
5. **Review conflict copies regularly** — they accumulate until manually cleaned up

## Compliance

- No use of `eval()`, `new Function()`, or dynamic `require()`
- Source code is unobfuscated and auditable
- Compatible with Obsidian community plugin review requirements
