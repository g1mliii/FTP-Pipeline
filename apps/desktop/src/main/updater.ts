import { createRequire } from "node:module";
import type { UpdateStatus } from "../shared/setup-types";

const require = createRequire(import.meta.url);

// Dynamically required so tree-shaking and conditional imports stay clean.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let autoUpdaterRef: any = null;
let initialized = false;
let currentStatus: UpdateStatus = { state: "idle" };
const statusListeners = new Set<(status: UpdateStatus) => void>();

const publishStatus = (status: UpdateStatus) => {
  currentStatus = status;
  for (const listener of statusListeners) {
    listener(status);
  }
};

const getAutoUpdater = () => {
  if (!autoUpdaterRef) {
    try {
      autoUpdaterRef = require("electron-updater").autoUpdater;
    } catch {
      return null;
    }
  }
  return autoUpdaterRef;
};

export const getUpdateStatus = () => currentStatus;

export const checkForUpdates = async () => {
  const { app } = require("electron");

  if (!app.isPackaged) {
    const status = {
      state: "unsupported",
      message: "Updates are only available in packaged builds."
    } satisfies UpdateStatus;
    publishStatus(status);
    return status;
  }

  const autoUpdater = getAutoUpdater();
  if (!autoUpdater) {
    const status = {
      state: "error",
      message: "electron-updater is unavailable in this build."
    } satisfies UpdateStatus;
    publishStatus(status);
    return status;
  }

  publishStatus({ state: "checking" });

  try {
    await autoUpdater.checkForUpdates();
    return currentStatus;
  } catch {
    const status = {
      state: "error",
      message: "Unable to check for updates right now."
    } satisfies UpdateStatus;
    publishStatus(status);
    return status;
  }
};

export const initAutoUpdater = (getMainWindow: () => Electron.BrowserWindow | null, onStatus?: (status: UpdateStatus) => void) => {
  const { app, dialog } = require("electron");

  if (onStatus) {
    statusListeners.add(onStatus);
    onStatus(currentStatus);
  }

  if (!app.isPackaged || initialized) {
    return;
  }

  const autoUpdater = getAutoUpdater();
  if (!autoUpdater) return;
  initialized = true;

  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    publishStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", (info: { version?: string }) => {
    publishStatus({
      state: "available",
      version: info?.version,
      message: info?.version ? `Version ${info.version} is downloading in the background.` : "A new version is downloading in the background."
    });
  });

  autoUpdater.on("download-progress", (progress: { percent?: number }) => {
    const percent = typeof progress?.percent === "number" ? Math.round(progress.percent) : null;
    publishStatus({
      state: "downloading",
      message: percent === null ? "Downloading update…" : `Downloading update… ${percent}%`
    });
  });

  autoUpdater.on("update-not-available", (info: { version?: string }) => {
    publishStatus({
      state: "up-to-date",
      version: info?.version ?? app.getVersion(),
      message: "You already have the latest version."
    });
  });

  autoUpdater.on("update-downloaded", (info: { version?: string }) => {
    publishStatus({
      state: "downloaded",
      version: info?.version,
      message: info?.version ? `Version ${info.version} is ready to install.` : "An update is ready to install."
    });

    const window = getMainWindow();
    void dialog
      .showMessageBox(window ?? undefined, {
        type: "info",
        title: "Update Ready",
        message: "A new version of Figma Shopify AutoBuild is ready.",
        detail: "Restart the app now to apply the update, or continue and it will install on next launch.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }: { response: number }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      })
      .catch(() => {});
  });

  autoUpdater.on("error", () => {
    publishStatus({
      state: "error",
      message: "Unable to reach the update service."
    });
  });

  setTimeout(() => {
    void checkForUpdates();
  }, 5_000);
};
