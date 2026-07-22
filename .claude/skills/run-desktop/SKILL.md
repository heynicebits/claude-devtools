---
name: run-desktop
description: Build, run, and drive the claude-devtools Electron desktop app. Use when asked to start the app, take a screenshot of it, verify a change in the real UI, or interact with its interface programmatically.
---

claude-devtools is an Electron app (electron-vite build). For agent/automated
use, drive it via the Playwright REPL at `.claude/skills/run-desktop/driver.mjs`.
On macOS it runs against the real window manager — no xvfb. On headless Linux,
prefix launches with `xvfb-run -a` and the driver adds `--no-sandbox` itself.

All paths are relative to the repo root.

## Prerequisites

```bash
pnpm install                                # app deps
cd .claude/skills/run-desktop && npm install  # playwright-core (kept out of app package.json)
```

**Electron binary check** — pnpm's build-script approval gate can silently skip
electron's postinstall download, leaving `node_modules/electron/dist/` missing.
The driver detects this and prints the fix:

```bash
node node_modules/electron/install.js   # one-off download
pnpm approve-builds                     # permanent: approve "electron"
```

## Build

```bash
pnpm build   # → dist-electron/ + out/renderer. The driver refuses to launch without it.
```

## Run (agent path)

```bash
# poll: portable wait (macOS has no GNU `timeout`)
poll() { for i in $(seq 1 $2); do tmux capture-pane -t app -p | grep -q "$1" && return 0; sleep 0.5; done; return 1; }

tmux new-session -d -s app -x 200 -y 50
tmux send-keys -t app 'cd /path/to/claude-devtools && node .claude/skills/run-desktop/driver.mjs' Enter
poll "driver>" 40
tmux send-keys -t app 'launch' Enter
poll "launched\\." 120
tmux send-keys -t app 'ss landing' Enter
poll "screenshot:" 20
tmux capture-pane -t app -p
```

Screenshots land in `/tmp/shots/` (override: `SCREENSHOT_DIR`). Always open and
look at the screenshot — a blank frame means the renderer did not load.

### Commands

| command | what it does |
|---|---|
| `launch` | launch the built app, wait until React renders into `#root` |
| `ss [name]` | screenshot → `$SCREENSHOT_DIR/<name>.png` |
| `click <css-sel>` | click element (DOM click, not coordinates) |
| `click-text <text>` | click button/link/tab by title, aria-label, or text |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` | evaluate in the page, print JSON |
| `text [css-sel]` | print innerText of selector (or whole body) |
| `windows` | list windows + all webContents |
| `version` | print app version via `window.electronAPI.getAppVersion()` |
| `goto-settings` | open Settings via the More (…) menu in the tab bar |
| `settings-tab <name>` | switch settings tab (General/Connection/Workspaces/Notifications/Advanced) |
| `quit` | close app, exit REPL |

## Run (human path)

```bash
pnpm dev   # hot-reload dev instance; Ctrl-C to quit
```

## Gotchas

- **Missing Electron binary after `pnpm install`** — pnpm skips electron's
  postinstall unless approved; launch fails ENOENT. See Prerequisites.
- **Version shows 0.1.0 upstream / 0.5.x here** — upstream stamps the real
  version from the git tag in CI only; this fork pins the release version in
  `package.json` so local builds display it (About = Settings → Advanced).
- **The More menu button has no title attr** — find it by its icon:
  `svg.lucide-ellipsis` / `svg.lucide-more-horizontal` (what `goto-settings` does).
- **Menus/tabs render async** — `goto-settings` and `settings-tab` include the
  needed 400–600ms settles; add the same after your own `click-text` on menus.
- **UI is a single BrowserWindow** — no BrowserView layering; `firstWindow()`
  is the real UI once `#root` has children (the `launch` poll handles it).
- **macOS has no GNU `timeout`** — use the `poll` helper above instead of
  `timeout N bash -c 'until …'` loops.
