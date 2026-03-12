/// <reference types="vite/client" />

import type {
  ActionResult,
  BackupReport,
  BuildDraft,
  BuildInput,
  BuildRunState,
  LaunchClaudeContext,
  ProviderId,
  SecretId,
  SecretStatus,
  SetupInputState,
  SetupSnapshot
} from "../../shared/setup-types";

declare global {
  interface Window {
    desktopApi: {
      runChecks(inputs?: Partial<SetupInputState>): Promise<SetupSnapshot>;
      getBootstrapState(): Promise<SetupSnapshot>;
      installDependencies(): Promise<ActionResult>;
      backupConfigs(): Promise<BackupReport>;
      configureClaude(): Promise<ActionResult>;
      configureCodex(): Promise<ActionResult>;
      startShopifyAuth(storeDomain: string): Promise<ActionResult>;
      startClaudeAuth(): Promise<ActionResult>;
      startCodexAuth(): Promise<ActionResult>;
      startFigmaAuth(provider: ProviderId): Promise<ActionResult>;
      getRuntimeState(inputs?: Partial<SetupInputState>): Promise<SetupSnapshot>;
      getConnectionState(): Promise<SetupInputState>;
      saveConnectionState(state: Partial<SetupInputState>): Promise<ActionResult>;
      saveSecret(secretId: SecretId, value: string): Promise<ActionResult>;
      deleteSecret(secretId: SecretId): Promise<ActionResult>;
      getSecretStatus(): Promise<SecretStatus[]>;
      startConnectionClaudeAuth(): Promise<ActionResult>;
      getBuildDraft(): Promise<BuildDraft>;
      launchBuild(input: BuildInput): Promise<BuildRunState>;
      cancelBuild(): Promise<BuildRunState | undefined>;
      getBuildStatus(): Promise<BuildRunState | undefined>;
      readClipboardText(): Promise<string>;
      launchClaudeTerminal(context?: LaunchClaudeContext): Promise<boolean>;
      closeClaudeTerminal(): Promise<boolean>;
      writeTerminal(data: string): Promise<boolean>;
      resizeTerminal(cols: number, rows: number): Promise<boolean>;
      onTerminalData(listener: (data: string) => void): () => void;
      onTerminalSystem(listener: (data: string) => void): () => void;
      onTerminalExit(listener: () => void): () => void;
      onBuildOutput(listener: (data: string) => void): () => void;
      onBuildStatus(listener: (state: BuildRunState) => void): () => void;
    };
  }
}

export {};
