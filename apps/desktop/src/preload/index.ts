import { createRequire } from "node:module";
import type { BuildInput, BuildRunState, LaunchClaudeContext, ProviderId, SecretId, SetupInputState, UpdateStatus } from "../shared/setup-types";

const require = createRequire(import.meta.url);
const { clipboard, contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  runChecks: (inputs?: Partial<SetupInputState>) => ipcRenderer.invoke("setup:runChecks", inputs),
  getBootstrapState: () => ipcRenderer.invoke("setup:getBootstrapState"),
  installDependencies: () => ipcRenderer.invoke("setup:installDependencies"),
  backupConfigs: () => ipcRenderer.invoke("setup:backupConfigs"),
  configureClaude: () => ipcRenderer.invoke("setup:configureClaude"),
  configureCodex: () => ipcRenderer.invoke("setup:configureCodex"),
  startShopifyAuth: (storeDomain: string) => ipcRenderer.invoke("setup:startShopifyAuth", storeDomain),
  startClaudeAuth: () => ipcRenderer.invoke("setup:startClaudeAuth"),
  startCodexAuth: () => ipcRenderer.invoke("setup:startCodexAuth"),
  startFigmaAuth: (provider: ProviderId) => ipcRenderer.invoke("setup:startFigmaAuth", provider),
  getRuntimeState: (inputs?: Partial<SetupInputState>) => ipcRenderer.invoke("setup:getRuntimeState", inputs),
  getConnectionState: () => ipcRenderer.invoke("connections:getState"),
  saveConnectionState: (state: Partial<SetupInputState>) => ipcRenderer.invoke("connections:saveState", state),
  saveSecret: (secretId: SecretId, value: string) => ipcRenderer.invoke("connections:saveSecret", secretId, value),
  deleteSecret: (secretId: SecretId) => ipcRenderer.invoke("connections:deleteSecret", secretId),
  getSecretStatus: () => ipcRenderer.invoke("connections:getSecretStatus"),
  startConnectionClaudeAuth: () => ipcRenderer.invoke("connections:startClaudeAuth"),
  getBuildDraft: () => ipcRenderer.invoke("build:getDraft"),
  launchBuild: (input: BuildInput) => ipcRenderer.invoke("build:launch", input),
  cancelBuild: () => ipcRenderer.invoke("build:cancel"),
  getBuildStatus: () => ipcRenderer.invoke("build:getStatus"),
  getUpdateStatus: () => ipcRenderer.invoke("app:getUpdateStatus"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  readClipboardText: () => Promise.resolve(clipboard.readText()),
  writeClipboardText: (text: string) => Promise.resolve(clipboard.writeText(text)),
  launchClaudeTerminal: (context?: LaunchClaudeContext) => ipcRenderer.invoke("chat:launchClaudeTerminal", context),
  closeClaudeTerminal: () => ipcRenderer.invoke("chat:closeClaudeTerminal"),
  writeTerminal: (data: string) => ipcRenderer.invoke("chat:write", data),
  resizeTerminal: (cols: number, rows: number) => ipcRenderer.invoke("chat:resize", cols, rows),
  onTerminalData: (listener: (data: string) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, data: string) => listener(data);
    ipcRenderer.on("chat:data", wrapped);
    return () => ipcRenderer.removeListener("chat:data", wrapped);
  },
  onTerminalSystem: (listener: (data: string) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, data: string) => listener(data);
    ipcRenderer.on("chat:system", wrapped);
    return () => ipcRenderer.removeListener("chat:system", wrapped);
  },
  onTerminalExit: (listener: () => void) => {
    const wrapped = () => listener();
    ipcRenderer.on("chat:exit", wrapped);
    return () => ipcRenderer.removeListener("chat:exit", wrapped);
  },
  onBuildOutput: (listener: (data: string) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, data: string) => listener(data);
    ipcRenderer.on("build:output", wrapped);
    return () => ipcRenderer.removeListener("build:output", wrapped);
  },
  onBuildStatus: (listener: (state: BuildRunState) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: BuildRunState) => listener(state);
    ipcRenderer.on("build:status", wrapped);
    return () => ipcRenderer.removeListener("build:status", wrapped);
  },
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => listener(status);
    ipcRenderer.on("app:updateStatus", wrapped);
    return () => ipcRenderer.removeListener("app:updateStatus", wrapped);
  }
});
