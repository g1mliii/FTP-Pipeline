import type { CheckResult, SetupStepId } from "../../../shared/setup-types";

export const steps: Array<{ id: SetupStepId; title: string; description: string }> = [
  { id: "dependencies", title: "Dependencies", description: "Core runtime, repo install, Shopify CLI, and Playwright browser." },
  { id: "agent", title: "Agent", description: "Claude-first setup with optional Codex support." },
  { id: "connections", title: "Connections", description: "Store context, auth, and secure vault values." },
  { id: "build", title: "Build", description: "Launch a Claude build and stream the output live." }
];

export const stepChecks: Record<SetupStepId, string[]> = {
  dependencies: ["node", "repoDeps", "shopifyCli", "playwrightBrowser"],
  agent: ["claudeCli", "claudeAuth", "claudeSkill", "claudeFigma", "claudePlaywright", "codexCli", "codexAuth", "codexFigmaMcp", "codexPlaywrightMcp"],
  connections: ["shopifyAuth"],
  build: []
};

export const statusTone = {
  ready: "is-ready",
  running: "is-progress",
  installing: "is-progress",
  auth_required: "is-action",
  action_required: "is-action",
  error: "is-error",
  idle: "is-idle"
} as const;

export const buildTone = {
  idle: "is-idle",
  running: "is-progress",
  succeeded: "is-ready",
  failed: "is-error",
  cancelled: "is-action"
} as const;

export const prettyStatus = (status: CheckResult["status"] | "idle" | "running" | "succeeded" | "failed" | "cancelled") =>
  status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
