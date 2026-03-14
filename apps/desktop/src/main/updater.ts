import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Dynamically required so tree-shaking and conditional imports stay clean.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _autoUpdater: any = null;

const getAutoUpdater = () => {
  if (!_autoUpdater) {
    // electron-updater is a runtime dependency; access lazily so dev mode
    // module resolution issues never crash the app.
    try {
      _autoUpdater = require("electron-updater").autoUpdater;
    } catch {
      return null;
    }
  }
  return _autoUpdater;
};

export const initAutoUpdater = (getMainWindow: () => Electron.BrowserWindow | null) => {
  const { app, dialog } = require("electron");

  // Only run in a packaged build — in dev the updater cannot resolve a feed URL
  // and would throw or log confusing errors.
  if (!app.isPackaged) {
    return;
  }

  const au = getAutoUpdater();
  if (!au) return;

  // Keep the updater completely silent in logs.
  au.logger = null;

  // Download automatically in the background; don't auto-quit on download.
  au.autoDownload = true;
  au.autoInstallOnAppQuit = false;
  au.allowPrerelease = false;

  // When a newer version has been fully downloaded, prompt the user once.
  au.on("update-downloaded", () => {
    const window = getMainWindow();
    dialog
      .showMessageBox(window ?? undefined, {
        type: "info",
        title: "Update Ready",
        message: "A new version of Figma Shopify AutoBuild is ready.",
        detail: "Restart the app now to apply the update, or continue and it will install on next launch.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) {
          au.quitAndInstall(false, true);
        }
      })
      .catch(() => {});
  });

  // Swallow every error silently — no releases yet, network down, unsigned build,
  // version already current — none of these should produce visible errors.
  au.on("error", () => {});

  // Check after a short delay so the window is visible before any update dialog.
  setTimeout(() => {
    au.checkForUpdates().catch(() => {});
  }, 5_000);
};
