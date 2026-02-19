/**
 * UpdaterService - No-op stub replacing electron-updater's autoUpdater.
 *
 * Auto-update has been disabled for this fork to prevent the upstream author
 * from pushing new code after the initial security audit. All public methods
 * are preserved as no-ops so that IPC handlers, HTTP routes, and the renderer
 * store continue to compile without changes.
 */

import { createLogger } from '@shared/utils/logger';

import type { BrowserWindow } from 'electron';

const logger = createLogger('UpdaterService');

export class UpdaterService {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    logger.info('Auto-updater disabled for security (fork build)');
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  async checkForUpdates(): Promise<void> {
    logger.info('checkForUpdates called but auto-updater is disabled');
    // Send "not-available" so the UI stays in a clean state
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status', { type: 'not-available' });
    }
  }

  async downloadUpdate(): Promise<void> {
    logger.info('downloadUpdate called but auto-updater is disabled');
  }

  quitAndInstall(): void {
    logger.info('quitAndInstall called but auto-updater is disabled');
  }
}
