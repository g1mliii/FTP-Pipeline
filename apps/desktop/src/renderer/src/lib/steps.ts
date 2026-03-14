import type { CheckResult, SetupStepId } from "../../../shared/setup-types";

export const steps: Array<{ id: SetupStepId; title: string; description: string }> = [
  { id: "dependencies", title: "Dependencies", description: "Install the core tools and browser." },
  { id: "agent", title: "Agent", description: "Set up Claude first. Add Codex only if needed." },
  { id: "connections", title: "Details", description: "Save store details and optional vault values." },
  { id: "build", title: "Build", description: "Run the build and watch the checks." }
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
