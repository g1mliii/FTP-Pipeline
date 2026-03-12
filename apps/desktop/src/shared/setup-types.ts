export type SetupStepId = "dependencies" | "agent" | "connections" | "build";

export type CheckId =
  | "node"
  | "npm"
  | "repoDeps"
  | "shopifyCli"
  | "playwrightPkg"
  | "playwrightBrowser"
  | "codexCli"
  | "codexAuth"
  | "claudeCli"
  | "claudeAuth"
  | "claudeSkill"
  | "claudeFigma"
  | "claudePlaywright"
  | "codexFigmaMcp"
  | "codexPlaywrightMcp"
  | "shopifyAuth";

export type CheckStatus = "idle" | "running" | "installing" | "auth_required" | "ready" | "action_required" | "error";

export type ProviderId = "claude" | "codex";

export type SecretId = "figmaToken" | "shopifyStorefrontPassword";

export interface SetupInputState {
  storeDomain: string;
  figmaUrl: string;
  designSlugDraft: string;
}

export interface CheckResult {
  id: CheckId;
  label: string;
  required: boolean;
  status: CheckStatus;
  detail?: string;
  command?: string;
}

export interface RuntimeState {
  provider: ProviderId;
  installed: boolean;
  authenticated: boolean;
  integrations: string[];
  detail?: string;
}

export interface SecretStatus {
  id: SecretId;
  label: string;
  stored: boolean;
  detail: string;
}

export interface SetupSnapshot {
  workspaceRoot: string;
  inputs: SetupInputState;
  checks: CheckResult[];
  runtimeStates: RuntimeState[];
  secretStatuses: SecretStatus[];
}

export interface CommandOutcome {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  command: string;
}

export interface BackupRecord {
  source: string;
  backup: string;
}

export interface BackupReport {
  createdAt: string;
  location: string;
  entries: BackupRecord[];
}

export interface ActionResult {
  ok: boolean;
  message: string;
  outcome?: CommandOutcome;
  snapshot: SetupSnapshot;
}

export interface LaunchClaudeContext {
  storeDomain?: string;
}

export interface BuildDraft {
  figmaUrl: string;
  storeDomain: string;
  designSlug: string;
  figmaTokenStored: boolean;
  storefrontPasswordStored: boolean;
}

export type BuildStatus = "idle" | "running" | "succeeded" | "failed" | "cancelled";

export interface BuildInput {
  figmaUrl: string;
  storeDomain: string;
  designSlug: string;
}

export interface BuildRunState {
  status: BuildStatus;
  command: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  summary?: string;
}
