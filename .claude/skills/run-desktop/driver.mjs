// REPL driver for the claude-devtools Electron app (Playwright _electron).
// Designed for agents: wrap in tmux, send-keys commands, capture-pane output.
// Prereqs: `pnpm build` in the repo root, `npm install` in this directory.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

import { _electron as electron } from 'playwright-core';

const APP_DIR = path.resolve(import.meta.dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let app = null;
let page = null;

const electronBin =
  process.platform === 'darwin'
    ? path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : path.join(APP_DIR, 'node_modules/electron/dist/electron');

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched');
    if (!fs.existsSync(electronBin)) {
      console.log('ERROR: Electron binary missing at', electronBin);
      console.log('pnpm skipped electron\'s postinstall download (build-script approval gate).');
      console.log('Fix: node ' + path.join(APP_DIR, 'node_modules/electron/install.js'));
      console.log('Permanent fix: pnpm approve-builds (approve "electron")');
      return;
    }
    if (!fs.existsSync(path.join(APP_DIR, 'dist-electron/main/index.cjs'))) {
      console.log('ERROR: build output missing — run `pnpm build` in', APP_DIR);
      return;
    }
    app = await electron.launch({
      executablePath: electronBin,
      args: process.platform === 'linux' ? ['--no-sandbox', APP_DIR] : [APP_DIR],
      timeout: 30_000,
    });
    page = await app.firstWindow();
    // Ready = React has rendered into #root. Poll up to 10s.
    for (let i = 0; i < 20; i++) {
      page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? page;
      const ready = await page
        .evaluate(() => (document.querySelector('#root')?.children.length ?? 0) > 0)
        .catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log('launched.', app.windows().length, 'windows:');
    for (const w of app.windows()) console.log(' ', w.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  // Click via evaluate(), not locator.click() — DOM click avoids coordinate
  // mismatches and works regardless of overlay layering.
  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click();
      return 'OK';
    }, sel);
    console.log('click', sel, '→', r);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('button, a, [role="button"], [role="tab"]')];
      const el =
        els.find((e) => e.getAttribute('title') === t || e.getAttribute('aria-label') === t) ??
        els.find((e) => e.textContent?.trim() === t) ??
        els.find((e) => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click();
      return 'OK: ' + el.tagName;
    }, text);
    console.log('click-text', JSON.stringify(text), '→', r);
  },

  async type(text) {
    if (page) await page.keyboard.type(text, { delay: 30 });
  },
  async press(key) {
    if (page) await page.keyboard.press(key);
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForSelector(sel, { timeout: 10_000 });
      console.log('found:', sel);
    } catch {
      console.log('TIMEOUT:', sel);
    }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try {
      console.log(JSON.stringify(await page.evaluate(expr)));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(
      await page.evaluate(
        (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
        sel || null
      )
    );
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first');
    for (const w of app.windows()) console.log(' ', w.url());
    const wcs = await app.evaluate(({ webContents }) =>
      webContents.getAllWebContents().map((w) => ({ id: w.id, type: w.getType(), url: w.getURL() }))
    );
    console.log('webContents:');
    for (const w of wcs) console.log(` [${w.id}] ${w.type}: ${w.url}`);
  },

  // ---- app-specific commands ----

  /** Print the app version via the same IPC the About section uses. */
  async version() {
    if (!page) return console.log('ERROR: launch first');
    console.log('version:', await page.evaluate(() => window.electronAPI?.getAppVersion?.()));
  },

  /** Open Settings via the More (…) menu in the tab bar. */
  async 'goto-settings'() {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const el = btns.find((b) =>
        b.querySelector('svg.lucide-ellipsis, svg.lucide-more-horizontal')
      );
      if (!el) return 'NOT_FOUND: more-menu button';
      el.click();
      return 'OK';
    });
    if (r !== 'OK') return console.log(r);
    await new Promise((r2) => setTimeout(r2, 400));
    await COMMANDS['click-text']('Settings');
    await new Promise((r2) => setTimeout(r2, 600));
    console.log('settings open');
  },

  /** Switch settings tab: General | Connection | Workspaces | Notifications | Advanced */
  async 'settings-tab'(tab) {
    if (!page) return console.log('ERROR: launch first');
    await COMMANDS['click-text'](tab || 'Advanced');
    await new Promise((r2) => setTimeout(r2, 600));
  },

  async quit() {
    if (app) await app.close().catch(() => {});
    app = null;
    page = null;
  },
  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

// Stop Electron from stealing stdin — use the raw fd.
const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async (line) => {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (!cmd) return rl.prompt();
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.log('unknown:', cmd, '— try: help');
    return rl.prompt();
  }
  try {
    await fn(rest.join(' '));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  if (cmd === 'quit') {
    rl.close();
    process.exit(0);
  }
  rl.prompt();
});
rl.on('close', async () => {
  await COMMANDS.quit();
  process.exit(0);
});

console.log('claude-devtools driver — "help" for commands, "launch" to start');
rl.prompt();
