import path from "node:path";
import { createRequire } from "node:module";
import type { BrowserWindow as ElectronBrowserWindow, Event as ElectronEvent, IpcMainInvokeEvent, WebContents } from "electron";
import { ClaudeBuildManager } from "./build/claude-build";
import { SetupService } from "./setup/service";
import { ClaudeTerminalManager } from "./terminal/claude-terminal";
import type { BuildInput, LaunchClaudeContext, ProviderId, SecretId, SetupInputState } from "../shared/setup-types";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain } = require("electron");

let mainWindow: ElectronBrowserWindow | null = null;
let terminalManager: ClaudeTerminalManager | null = null;
let buildManager: ClaudeBuildManager | null = null;
const setupService = new SetupService();
const MAX_TEXT_INPUT = 4096;
const MAX_URL_INPUT = 2048;
const MAX_SECRET_INPUT = 8192;
const MAX_SLUG_INPUT = 160;

const getAllowedRendererOrigins = () => {
  const allowed = new Set<string>();

  if (process.env.ELECTRON_RENDERER_URL) {
    allowed.add(new URL(process.env.ELECTRON_RENDERER_URL).origin);
  }

  allowed.add("file://");
  return allowed;
};

const isTrustedRendererUrl = (rawUrl: string) => {
  if (rawUrl.startsWith("file://")) {
    return true;
  }

  try {
    return getAllowedRendererOrigins().has(new URL(rawUrl).origin);
  } catch {
    return false;
  }
};

const assertTrustedEvent = (event: Electron.IpcMainInvokeEvent) => {
  const sourceUrl = event.senderFrame?.url ?? event.sender.getURL();
  if (!isTrustedRendererUrl(sourceUrl)) {
    throw new Error(`Blocked IPC call from untrusted renderer origin: ${sourceUrl || "unknown"}`);
  }
};

const handleIpc = <Args extends unknown[], Result>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result
) => {
  ipcMain.handle(channel, handler);
};

const clampString = (value: string, maxLength: number, fieldName: string) => {
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds the maximum length.`);
  }
  return value;
};
const readOptionalString = (value: unknown, maxLength = MAX_TEXT_INPUT, fieldName = "value") =>
  typeof value === "string" ? clampString(value, maxLength, fieldName) : undefined;
const readRequiredString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }
  return clampString(value, MAX_TEXT_INPUT, fieldName);
};
const readProvider = (value: unknown): ProviderId => {
  if (value === "claude" || value === "codex") {
    return value;
  }
  throw new Error("provider must be either 'claude' or 'codex'.");
};
const readSecretId = (value: unknown): SecretId => {
  if (value === "figmaToken" || value === "shopifyStorefrontPassword") {
    return value;
  }
  throw new Error("secretId is invalid.");
};
const readTerminalSize = (value: unknown, fieldName: string) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 1000) {
    throw new Error(`${fieldName} must be a finite positive number.`);
  }
  return Math.floor(value);
};
const readBuildInput = (value: unknown): BuildInput => {
  if (!value || typeof value !== "object") {
    throw new Error("build input is required.");
  }

  const payload = value as Partial<BuildInput>;
  return {
    figmaUrl: readOptionalString(payload.figmaUrl, MAX_URL_INPUT, "figmaUrl") ?? "",
    storeDomain: readOptionalString(payload.storeDomain, 255, "storeDomain") ?? "",
    designSlug: readOptionalString(payload.designSlug, MAX_SLUG_INPUT, "designSlug") ?? ""
  };
};
const readSetupInput = (value?: Partial<SetupInputState>): Partial<SetupInputState> => ({
  storeDomain: readOptionalString(value?.storeDomain, 255, "storeDomain"),
  figmaUrl: readOptionalString(value?.figmaUrl, MAX_URL_INPUT, "figmaUrl"),
  designSlugDraft: readOptionalString(value?.designSlugDraft, MAX_SLUG_INPUT, "designSlugDraft")
});

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#FBF7F0",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webviewTag: false
    }
  });
  mainWindow = window;

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event: ElectronEvent, url: string) => {
    if (!isTrustedRendererUrl(url)) {
      event.preventDefault();
    }
  });
  window.webContents.session.setPermissionRequestHandler(
    (_webContents: WebContents, _permission: string, callback: (permissionGranted: boolean) => void) => {
      callback(false);
    }
  );

  terminalManager = new ClaudeTerminalManager(window, setupService.workspaceRoot);
  buildManager = new ClaudeBuildManager(window, setupService.workspaceRoot);

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(async () => {
  handleIpc("setup:runChecks", async (event, inputs?: Partial<SetupInputState>) => {
    assertTrustedEvent(event);
    return setupService.runChecks(readSetupInput(inputs));
  });
  handleIpc("setup:getBootstrapState", async (event) => {
    assertTrustedEvent(event);
    return setupService.getBootstrapSnapshot();
  });
  handleIpc("setup:installDependencies", async (event) => {
    assertTrustedEvent(event);
    return setupService.installDependencies();
  });
  handleIpc("setup:backupConfigs", async (event) => {
    assertTrustedEvent(event);
    return setupService.backupConfigs();
  });
  handleIpc("setup:configureClaude", async (event) => {
    assertTrustedEvent(event);
    return setupService.configureClaude();
  });
  handleIpc("setup:configureCodex", async (event) => {
    assertTrustedEvent(event);
    return setupService.configureCodex();
  });
  handleIpc("setup:startShopifyAuth", async (event, storeDomain: unknown) => {
    assertTrustedEvent(event);
    return setupService.startShopifyAuth(readRequiredString(storeDomain, "storeDomain"));
  });
  handleIpc("setup:startClaudeAuth", async (event) => {
    assertTrustedEvent(event);
    return setupService.startClaudeAuth();
  });
  handleIpc("setup:startCodexAuth", async (event) => {
    assertTrustedEvent(event);
    return setupService.startCodexAuth();
  });
  handleIpc("setup:startFigmaAuth", async (event, provider: unknown) => {
    assertTrustedEvent(event);
    return setupService.startFigmaAuth(readProvider(provider));
  });
  handleIpc("setup:getRuntimeState", async (event, inputs?: Partial<SetupInputState>) => {
    assertTrustedEvent(event);
    return setupService.runChecks(readSetupInput(inputs));
  });
  handleIpc("connections:getState", async (event) => {
    assertTrustedEvent(event);
    return setupService.getConnectionState();
  });
  handleIpc("connections:saveState", async (event, state?: Partial<SetupInputState>) => {
    assertTrustedEvent(event);
    return setupService.saveConnectionState(readSetupInput(state));
  });
  handleIpc("connections:saveSecret", async (event, secretId: unknown, value: unknown) => {
    assertTrustedEvent(event);
    return setupService.saveSecret(readSecretId(secretId), clampString(readRequiredString(value, "value"), MAX_SECRET_INPUT, "value"));
  });
  handleIpc("connections:deleteSecret", async (event, secretId: unknown) => {
    assertTrustedEvent(event);
    return setupService.deleteSecret(readSecretId(secretId));
  });
  handleIpc("connections:getSecretStatus", async (event) => {
    assertTrustedEvent(event);
    return setupService.getSecretStatuses();
  });
  handleIpc("connections:startClaudeAuth", async (event) => {
    assertTrustedEvent(event);
    return setupService.startClaudeAuth();
  });
  handleIpc("build:getDraft", async (event) => {
    assertTrustedEvent(event);
    return setupService.getBuildDraft();
  });
  handleIpc("build:launch", async (event, input: unknown) => {
    assertTrustedEvent(event);
    const buildInput = readBuildInput(input);
    const figmaToken = await setupService.getSecretValue("figmaToken");
    const storefrontPassword = await setupService.getSecretValue("shopifyStorefrontPassword");
    return buildManager?.launch(buildInput, { figmaToken, storefrontPassword });
  });
  handleIpc("build:cancel", async (event) => {
    assertTrustedEvent(event);
    return buildManager?.cancel();
  });
  handleIpc("build:getStatus", async (event) => {
    assertTrustedEvent(event);
    return buildManager?.getState();
  });
  handleIpc("chat:launchClaudeTerminal", async (event, context?: LaunchClaudeContext) => {
    assertTrustedEvent(event);
    terminalManager?.launch({ storeDomain: readOptionalString(context?.storeDomain) });
    return true;
  });
  handleIpc("chat:closeClaudeTerminal", async (event) => {
    assertTrustedEvent(event);
    terminalManager?.dispose();
    return true;
  });
  handleIpc("chat:write", async (event, data: unknown) => {
    assertTrustedEvent(event);
    terminalManager?.write(clampString(readRequiredString(data, "data"), MAX_TEXT_INPUT, "data"));
    return true;
  });
  handleIpc("chat:resize", async (event, cols: unknown, rows: unknown) => {
    assertTrustedEvent(event);
    terminalManager?.resize(readTerminalSize(cols, "cols"), readTerminalSize(rows, "rows"));
    return true;
  });

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  terminalManager?.dispose();
  buildManager?.cancel();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
