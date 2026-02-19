# Upstream Update Procedure

This is a fork of `matt1398/claude-devtools`. The upstream remote should point there.
When the user asks to pull/merge/sync upstream updates, follow this procedure.

## Setup (if needed)
```bash
git remote add upstream https://github.com/matt1398/claude-devtools.git
```

## Step-by-step process

### 1. Fetch and preview
```bash
git fetch upstream
git diff --stat main...upstream/main
```
Show the user a summary of what changed.

### 2. Dependency review (HIGH PRIORITY)
```bash
git diff main...upstream/main -- package.json pnpm-lock.yaml
```
Flag any new or changed dependencies. New packages are the #1 risk vector for supply chain attacks in an Electron app. For each new dependency:
- State what it does
- Check if it's well-known/trusted
- Note if it has native/binary components
- Warn if it requests Node.js permissions (fs, net, child_process)

### 3. Main process review (HIGH PRIORITY)
```bash
git diff main...upstream/main -- src/main/ src/preload/
```
Main process code runs with full system access. Review for:
- New IPC channels or changed handlers
- File system access changes
- Network requests to new endpoints
- Shell command execution
- Changes to webPreferences or security settings
- Re-introduction of auto-updater code (was removed in our security audit)

### 4. Build/packaging review
```bash
git diff main...upstream/main -- electron-builder.* build/ package.json
```
Check for changes to build config, signing, or packaging.

### 5. Low-risk changes (quick review)
Renderer-side changes (components, styles, hooks) are sandboxed and low risk.
Still worth a glance but don't need deep review.

### 6. Merge and verify
After user approves:
```bash
git checkout main
git merge upstream/main
pnpm install
pnpm audit
pnpm typecheck
pnpm test
pnpm build
```

### 7. Conflict resolution
Our fork has these intentional divergences from upstream — preserve them during merges:
- **`UpdaterService.ts`**: Gutted to a no-op stub. Do NOT restore auto-updater functionality.
- **`package.json`**: `electron-updater` removed from dependencies. Do NOT re-add it.
- **`src/main/index.ts`**: Update menu items removed.
- **`AUDIT-REPORT.md`**: Our file, not in upstream.
- **`update-from-upstream.sh`**: Our file, not in upstream.

If upstream touches these files, resolve conflicts by keeping our security changes.

## Quick reference
There is also a helper script: `./update-from-upstream.sh`
