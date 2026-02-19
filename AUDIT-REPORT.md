# claude-devtools Security Audit Report

**Date**: 2026-02-19
**Commit audited**: `4f1e401` (Merge pull request #30 from matt1398/dev)
**Fork**: heynicebits/claude-devtools
**Upstream**: matt1398/claude-devtools
**Auditor**: Claude Code (Opus 4.6)

## Summary

Overall risk assessment: **LOW**. The codebase demonstrates strong privacy-by-design principles with no telemetry, no analytics, and no hidden network calls. The only confirmed outbound network vectors were: (1) `electron-updater` auto-update checks to GitHub Releases (now disabled), (2) user-initiated SSH connections for remote session viewing, and (3) user-clicked URLs opened via `shell.openExternal`. After disabling auto-update, the app makes zero automatic outbound network connections.

## Network & Telemetry

### Confirmed Outbound Calls (FLAG)

| # | Component | File:Line | Destination | Status |
|---|-----------|-----------|-------------|--------|
| 1 | **electron-updater** | `src/main/services/infrastructure/UpdaterService.ts` | `api.github.com/repos/matt1398/claude-devtools/releases` | **DISABLED** - replaced with no-op stub |
| 2 | **SSH connections** | `src/main/services/infrastructure/SshConnectionManager.ts:135-143` | User-specified remote hosts | User-initiated only; requires explicit action |

### Safe / Local-Only Operations

| Component | File | Classification | Notes |
|-----------|------|----------------|-------|
| HTTP server (Fastify) | `src/main/services/infrastructure/HttpServer.ts` | **SAFE** | Binds to `127.0.0.1` only (localhost) |
| Renderer fetch calls | `src/renderer/api/httpClient.ts` | **SAFE** | All requests to localhost HTTP server |
| SSE streaming | `src/main/http/events.ts` | **SAFE** | Localhost keep-alive pings |
| `shell.openExternal` | `src/main/ipc/utility.ts:62-89` | **SAFE** | Protocol-validated (http/https/mailto only), user-initiated |
| `child_process` | `src/main/ipc/config.ts` | **SAFE** | Opens user's editor, SSH key gen test |

### Not Found (Confirmed Absent)

- No telemetry: Sentry, Mixpanel, Amplitude, PostHog, Google Analytics, Segment
- No crash reporting services
- No phone-home or beacon patterns
- No external CDN loads for scripts, fonts, or assets
- No hardcoded API keys or authentication tokens
- No DNS/hostname resolution (except user-provided SSH hosts)

## Auto-Update Status

**Was electron-updater present?** Yes.

`electron-updater` v6.7.3 was a production dependency with:
- Auto-check on every app startup (3 seconds after window load)
- `autoDownload = false` (user must confirm download)
- `autoInstallOnAppQuit = true` (silent install after download)
- GitHub releases as the update provider
- `--publish always` flag on all dist scripts

**Was it disabled?** Yes.

Changes made (commit `103049c`):
1. `UpdaterService.ts` replaced with no-op stub that logs and returns "not-available"
2. Auto-check `setTimeout()` removed from `src/main/index.ts`
3. `electron-updater` removed from `package.json` dependencies
4. `--publish always` changed to `--publish never` on all dist scripts
5. `publish` config set to `null` in electron-builder config
6. macOS `notarize` set to `false` for unsigned local builds

The no-op stub preserves the class interface so all IPC handlers, HTTP routes, preload bridge, and Zustand store slice compile without changes. The updater UI components (UpdateDialog, UpdateBanner) remain but will never activate since "not-available" is always sent.

## File System Access

### Confirmed Expected Paths

| Path | Access Type | Purpose |
|------|-------------|---------|
| `~/.claude/projects/{encoded-path}/*.jsonl` | Read-only | Session data |
| `~/.claude/todos/{sessionId}.json` | Read-only | Task data |
| `~/.claude/rules/` | Read-only | User configuration rules |
| `~/.claude/claude-devtools-config.json` | Read/Write | App configuration |
| `~/.claude/` (CLAUDE.md files) | Read-only | Project documentation |

### Path Validation Implementation

**Confirmed implemented** in `src/main/utils/pathValidation.ts`:
- `validateFilePath()` enforces absolute paths, traversal prevention, and sensitive pattern blocking
- Blocks 24+ sensitive patterns: `.ssh/`, `.aws/`, `.env`, `.git-credentials`, `.pem`, `.key`, `id_rsa`, `/etc/passwd`, etc.
- Symlink escape prevention via `fs.realpathSync.native()`
- Used by file-reading IPC handlers (`read-mentioned-file`, `shell:openPath`)

### Flagged Gaps

| Issue | File:Line | Severity |
|-------|-----------|----------|
| `validate-path` IPC handler uses weak `isPathContained()` instead of `validateFilePath()` | `src/main/ipc/validation.ts:64-90` | MEDIUM |
| `validate-mentions` IPC handler uses same weak validation | `src/main/ipc/validation.ts:97-117` | MEDIUM |
| Enterprise config paths (`/etc/claude-code/CLAUDE.md`) read without `validateFilePath()` | `src/main/services/parsing/ClaudeMdReader.ts:214-222` | LOW |

### SSH File Access (Intentional Exceptions)

The app supports remote session viewing via SSH. When SSH mode is activated by the user:
- `~/.ssh/config` is read for host alias resolution
- `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, `~/.ssh/id_ecdsa` are read for key-based auth
- `SSH_AUTH_SOCK` environment variable is checked for agent forwarding
- SSH passwords are held in memory only, never persisted to disk

## Dependency Review

### pnpm audit

npm audit endpoint returned HTTP 500 (service unavailable at time of audit). Manual review performed instead.

### Production Dependencies (Manual Review)

| Package | Risk | Notes |
|---------|------|-------|
| `@dnd-kit/*` | LOW | Drag-and-drop UI library, no network |
| `@fastify/cors`, `@fastify/static`, `fastify` | LOW | HTTP server for localhost only |
| `@tanstack/react-virtual` | LOW | Virtual scrolling, no network |
| `date-fns` | LOW | Date formatting utility |
| `idb-keyval` | LOW | IndexedDB wrapper for context snapshots (5min TTL) |
| `lucide-react` | LOW | Icon library, no network |
| `react`, `react-dom` | LOW | UI framework |
| `react-markdown`, `remark-gfm`, `remark-parse`, `unified`, `mdast-util-to-hast` | LOW | Markdown rendering pipeline |
| `ssh-config` | LOW | Parses `~/.ssh/config` format |
| `ssh2` | **REVIEW** | SSH client library - legitimate for remote session feature but has network capabilities |
| `zustand` | LOW | State management, no network |

### Removed Dependencies

| Package | Reason |
|---------|--------|
| `electron-updater` | Auto-update removed for security |

## Electron Security

| Setting | Value | Status |
|---------|-------|--------|
| `nodeIntegration` | `false` | SECURE |
| `contextIsolation` | `true` | SECURE |
| `webSecurity` | (default: `true`) | SECURE |
| `allowRunningInsecureContent` | (default: `false`) | SECURE |
| `enableRemoteModule` | Not used | SECURE |
| Preload bridge | `contextBridge.exposeInMainWorld()` | SECURE - minimal surface area |
| IPC pattern | All use `.handle()` (request/response) | SECURE |
| `shell.openExternal` | Protocol whitelist: http, https, mailto | SECURE |
| `protocol.register` | Not used | SECURE |
| Content Security Policy | **NOT CONFIGURED** | RECOMMENDATION: Add CSP meta tag |
| DevTools | Development mode only | SECURE |

## Sensitive Data Handling

### Storage Mechanisms

| Storage | Data | TTL | Risk |
|---------|------|-----|------|
| `localStorage` | Theme preference only | Permanent | LOW |
| `IndexedDB` (idb-keyval) | Context snapshots (UI state, session metadata) | 5 minutes | LOW |
| In-memory cache (`DataCache`) | Parsed session objects (50 max, LRU) | 10 minutes | LOW |
| Config file | App settings, SSH connection metadata (no passwords) | Permanent | LOW |

### Credential Exposure Concerns

- **Session log content is displayed as-is without sanitization**. If a user's Claude Code session contains API keys, tokens, or passwords (e.g., in Bash tool output), these are visible in the UI. This is inherent to the app's purpose as a log viewer.
- **No API keys are extracted or transmitted** by the app itself.
- **SSH passwords are in-memory only** during connection, never persisted to disk.
- **Clipboard access is user-initiated only** (copy buttons on code blocks and paths).

## Changes Made to Fork

| Commit | Description |
|--------|-------------|
| `103049c` | `security: disable auto-updater for trusted local builds` |

Changes in this commit:
- `src/main/services/infrastructure/UpdaterService.ts` — Replaced with no-op stub
- `src/main/index.ts` — Removed auto-check on startup
- `package.json` — Removed `electron-updater`, changed `--publish always` to `--publish never`, set `publish: null`, set `notarize: false`
- `pnpm-lock.yaml` — Updated to reflect dependency removal

## Build Verification

**Platform**: Linux x86_64 (macOS .dmg build requires macOS; Linux artifacts produced instead)

| Artifact | SHA-256 |
|----------|---------|
| `release/claude-devtools-0.1.0.AppImage` | `8c09a3f3bf31f20655af2208ba12999c8fba62bc91aa7ef03e57a409ac2301c5` |
| `release/claude-devtools_0.1.0_amd64.deb` | `6a4cc7e41a99f22ae90ea04c67621e15b743298f76ade036903f517c8b445624` |

**Test suite**: 32 files, 501 tests — all passing
**TypeScript**: Clean (zero errors)
**Build**: electron-vite build successful (main, preload, renderer)

## Recommendation

**Safe to install from this fork** with the auto-updater disabled. The app is a well-architected local-only Electron tool with:

- No telemetry or analytics
- No automatic outbound network connections (post-audit)
- Proper Electron security configuration (contextIsolation, no nodeIntegration)
- Strict path validation preventing access to sensitive files
- All network-capable features (SSH) require explicit user action

### Remaining Considerations

1. **SSH feature**: If you don't need remote session viewing, consider removing `ssh2` and `ssh-config` dependencies entirely for a smaller attack surface.
2. **Missing CSP**: Adding a Content Security Policy meta tag to `index.html` would provide defense-in-depth against XSS.
3. **Validation gaps**: Two IPC validation handlers use weaker checks than the main path validation — consider upgrading to `validateFilePath()`.
4. **Session log content**: The app displays raw session logs without filtering. Sensitive data in your Claude Code sessions (API keys, etc.) will be visible.

### Suggested Little Snitch / Network Monitor Rules

After installing, configure your network monitor to:
- **BLOCK all outbound** from `claude-devtools` (the app should make zero network calls)
- **ALLOW SSH (port 22)** only if you use the remote session feature
- **ALERT on any other connection attempt** — this would indicate unexpected behavior

### Re-Auditing After Upstream Syncs

```bash
git fetch upstream
git diff main upstream/main -- src/    # Review source changes
git merge upstream/main                 # Merge if satisfied
# Re-run security audit on the diff before rebuilding
pnpm build && pnpm dist:mac
```
