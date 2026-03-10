import type { CheckResult, SetupStepId } from "../../../shared/setup-types";

export const steps: Array<{ id: SetupStepId; title: string; description: string }> = [
  { id: "dependencies", title: "Dependencies", description: "Node, npm, Shopify CLI, Playwright, and Codex." },
  { id: "claude", title: "Claude", description: "Claude auth, skills, and plugins." },
  { id: "codex", title: "Codex", description: "Codex CLI plus Figma and Playwright MCPs." },
  { id: "connections", title: "Connections", description: "Store context, auth, and secure vault values." },
  { id: "build", title: "Build", description: "Launch a Claude build and stream the output live." }
];

export const stepChecks: Record<SetupStepId, string[]> = {
  dependencies: ["node", "npm", "repoDeps", "shopifyCli", "playwrightPkg", "playwrightBrowser", "codexCli"],
  claude: ["claudeCli", "claudeAuth", "claudeSkill", "claudeFigma", "claudePlaywright"],
  codex: ["codexFigmaMcp", "codexPlaywrightMcp"],
  connections: ["shopifyAuth"],
  build: []
};

export const connectionDependencyIds = [
  "shopifyCli",
  "playwrightPkg",
  "playwrightBrowser",
  "claudeAuth",
  "claudeFigma",
  "claudePlaywright",
  "codexFigmaMcp",
  "codexPlaywrightMcp",
  "shopifyAuth"
];

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
