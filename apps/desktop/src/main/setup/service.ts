import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import AdmZip from "adm-zip";
import type { Event as ElectronEvent, WebContents } from "electron";
import { suggestDesignSlug, isValidFigmaUrl, isValidStoreDomain, normalizeStoreDomain, sanitizeDesignSlug } from "../../shared/build-utils";
import type {
  ActionResult,
  BackupReport,
  BuildDraft,
  CheckId,
  CheckResult,
  ProviderId,
  RuntimeState,
  SecretId,
  SetupInputState,
  SetupSnapshot
} from "../../shared/setup-types";
import { backupTargets, ensureDirectoryCopy } from "../../shared/config-utils";
import { parseClaudeAuthStatus, parseClaudeMcpStatus, parseClaudePluginList, parseCodexMcpGet, parseShopifyVersion } from "../../shared/parsers";
import { detectFirstUrl, runCommand, runNpmGlobalInstall, runShopifyCommand } from "./commands";
import { SecretStore } from "./secret-store";
import { findWorkspaceRoot, getUserPaths } from "./paths";

const require = createRequire(import.meta.url);
const { BrowserWindow, app, shell } = require("electron");

const CHECK_ORDER: CheckId[] = [
  "node",
  "npm",
  "repoDeps",
  "shopifyCli",
  "playwrightPkg",
  "playwrightBrowser",
  "codexCli",
  "claudeCli",
  "claudeAuth",
  "claudeSkill",
  "claudeFigma",
  "claudePlaywright",
  "codexFigmaMcp",
  "codexPlaywrightMcp",
  "shopifyAuth"
];

const CHECK_META: Record<CheckId, { label: string; required: boolean }> = {
  node: { label: "Node.js", required: true },
  npm: { label: "npm", required: true },
  repoDeps: { label: "Repo dependencies", required: true },
  shopifyCli: { label: "Shopify CLI", required: true },
  playwrightPkg: { label: "Playwright package", required: true },
  playwrightBrowser: { label: "Playwright Chromium", required: true },
  codexCli: { label: "Codex CLI", required: true },
  claudeCli: { label: "Claude CLI", required: true },
  claudeAuth: { label: "Claude auth", required: true },
  claudeSkill: { label: "Claude repo skill", required: true },
  claudeFigma: { label: "Claude Figma", required: true },
  claudePlaywright: { label: "Claude Playwright", required: true },
  codexFigmaMcp: { label: "Codex Figma MCP", required: true },
  codexPlaywrightMcp: { label: "Codex Playwright MCP", required: true },
  shopifyAuth: { label: "Shopify auth", required: true }
};

const INPUT_STATE_FILE = "setup-state.json";
const SNAPSHOT_CACHE_FILE = "setup-snapshot.json";
const MAX_STATE_BYTES = 12 * 1024;
const MAX_AUTH_TEXT_BYTES = 64 * 1024;
const MAX_SECRET_VALUE_BYTES = 8 * 1024;
const STATUS_CHECK_TIMEOUT_MS = 10_000;
const ALLOWED_AUTH_HOST_SUFFIXES = ["figma.com", "shopify.com", "myshopify.com", "mcp.figma.com"];
const ALLOWED_LOCAL_AUTH_HOSTS = new Set(["localhost", "127.0.0.1"]);
const VOLATILE_BOOTSTRAP_CHECKS = new Set<CheckId>([
  "claudeAuth",
  "claudeFigma",
  "claudePlaywright",
  "codexFigmaMcp",
  "codexPlaywrightMcp",
  "shopifyAuth"
]);

const check = (id: CheckId, status: CheckResult["status"], detail?: string, command?: string): CheckResult => ({
  id,
  label: CHECK_META[id].label,
  required: CHECK_META[id].required,
  status,
  detail,
  command
});

const truncate = (value: string, maxBytes: number) => {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) {
    return value;
  }

  return Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
};

const normalizeFigmaUrl = (value: string) => value.trim();

const isAllowedAuthUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    const isLoopback = ALLOWED_LOCAL_AUTH_HOSTS.has(parsed.hostname) && (parsed.protocol === "http:" || parsed.protocol === "https:");
    const isAllowedHost =
      parsed.protocol === "https:" &&
      ALLOWED_AUTH_HOST_SUFFIXES.some((suffix) => parsed.hostname === suffix || parsed.hostname.endsWith(`.${suffix}`));

    return isLoopback || isAllowedHost;
  } catch {
    return false;
  }
};

const fileExists = async (targetPath: string) => {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const normalizeInputState = (state?: Partial<SetupInputState>): SetupInputState => ({
  storeDomain: normalizeStoreDomain(state?.storeDomain ?? ""),
  figmaUrl: normalizeFigmaUrl(state?.figmaUrl ?? ""),
  designSlugDraft: sanitizeDesignSlug(state?.designSlugDraft ?? "")
});

const mergeInputState = (storedState: SetupInputState, nextState?: Partial<SetupInputState>): SetupInputState => {
  const figmaUrl = normalizeFigmaUrl(nextState?.figmaUrl ?? storedState.figmaUrl);
  const storeDomain = normalizeStoreDomain(nextState?.storeDomain ?? storedState.storeDomain);
  const explicitDraft = sanitizeDesignSlug(nextState?.designSlugDraft ?? storedState.designSlugDraft);
  const derivedDraft = suggestDesignSlug(figmaUrl, storeDomain);

  return {
    storeDomain,
    figmaUrl,
    designSlugDraft: explicitDraft || derivedDraft
  };
};

const readStoredState = async (): Promise<SetupInputState> => {
  const stateFile = path.join(app.getPath("userData"), INPUT_STATE_FILE);

  try {
    const raw = await readFile(stateFile, "utf8");
    return mergeInputState(normalizeInputState(), JSON.parse(raw) as Partial<SetupInputState>);
  } catch {
    return normalizeInputState();
  }
};

const writeStoredState = async (state: SetupInputState) => {
  const stateFile = path.join(app.getPath("userData"), INPUT_STATE_FILE);
  await writeFile(stateFile, truncate(JSON.stringify(state, null, 2), MAX_STATE_BYTES), { encoding: "utf8", mode: 0o600 });
};

const readSnapshotCache = async (): Promise<SetupSnapshot | null> => {
  const snapshotFile = path.join(app.getPath("userData"), SNAPSHOT_CACHE_FILE);

  try {
    const raw = await readFile(snapshotFile, "utf8");
    return JSON.parse(raw) as SetupSnapshot;
  } catch {
    return null;
  }
};

const writeSnapshotCache = async (snapshot: SetupSnapshot) => {
  const snapshotFile = path.join(app.getPath("userData"), SNAPSHOT_CACHE_FILE);
  await writeFile(snapshotFile, truncate(JSON.stringify(snapshot, null, 2), MAX_STATE_BYTES * 4), {
    encoding: "utf8",
    mode: 0o600
  });
};

const readCodexMcp = async (workspaceRoot: string, serverName: "figma" | "playwright") => {
  const outcome = await runCommand("codex", ["mcp", "get", serverName], { cwd: workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS });
  if (!outcome.ok) {
    return check(
      serverName === "figma" ? "codexFigmaMcp" : "codexPlaywrightMcp",
      "action_required",
      `${serverName} MCP is not configured.`,
      outcome.command
    );
  }

  const parsed = parseCodexMcpGet(outcome.stdout, serverName);
  return check(
    serverName === "figma" ? "codexFigmaMcp" : "codexPlaywrightMcp",
    parsed.enabled ? "ready" : "action_required",
    parsed.detail,
    outcome.command
  );
};

const runShopifyInstall = async (workspaceRoot: string) => {
  if (process.platform === "win32") {
    return runCommand(
      "winget",
      ["install", "--id", "Shopify.CLI", "-e", "--accept-package-agreements", "--accept-source-agreements"],
      { cwd: workspaceRoot }
    );
  }

  if (process.platform === "darwin") {
    return runCommand("brew", ["install", "shopify-cli"], { cwd: workspaceRoot });
  }

  return runNpmGlobalInstall("@shopify/cli", workspaceRoot);
};

const openAuthUrl = async (url: string) => {
  if (!isAllowedAuthUrl(url)) {
    throw new Error(`Blocked unsupported auth URL: ${url}`);
  }

  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    autoHideMenuBar: true,
    webPreferences: {
      partition: `auth-${Date.now()}`,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event: ElectronEvent, nextUrl: string) => {
    if (!isAllowedAuthUrl(nextUrl)) {
      event.preventDefault();
    }
  });
  window.webContents.session.setPermissionRequestHandler(
    (_webContents: WebContents, _permission: string, callback: (permissionGranted: boolean) => void) => {
      callback(false);
    }
  );

  await window.loadURL(url);
};

const maybeOpenAuthUrl = async (text: string) => {
  const url = detectFirstUrl(truncate(text, MAX_AUTH_TEXT_BYTES));
  if (!url || !isAllowedAuthUrl(url)) {
    return false;
  }

  try {
    await openAuthUrl(url);
    return true;
  } catch {
    await shell.openExternal(url);
    return true;
  }
};

export class SetupService {
  readonly workspaceRoot = findWorkspaceRoot();
  readonly secretStore = new SecretStore();

  private createIdleSnapshot(inputs: SetupInputState, secretStatuses: SetupSnapshot["secretStatuses"]): SetupSnapshot {
    return {
      workspaceRoot: this.workspaceRoot,
      inputs,
      checks: CHECK_ORDER.map((id) => check(id, "idle", "Checking desktop readiness…")),
      runtimeStates: [],
      secretStatuses
    };
  }

  private async composeSnapshot(currentState: SetupInputState): Promise<SetupSnapshot> {
    const userPaths = getUserPaths();
    const shopifyAuthPromise: Promise<CheckResult> = !currentState.storeDomain
      ? Promise.resolve(check("shopifyAuth", "action_required", "Enter a store domain to validate Shopify auth."))
      : !isValidStoreDomain(currentState.storeDomain)
        ? Promise.resolve(check("shopifyAuth", "action_required", "Store domain must be a valid *.myshopify.com hostname."))
        : runShopifyCommand(["theme", "list", "--store", currentState.storeDomain, "--json"], this.workspaceRoot, STATUS_CHECK_TIMEOUT_MS).then(
            (authOutcome) =>
              check(
                "shopifyAuth",
                authOutcome.ok ? "ready" : "auth_required",
                authOutcome.ok ? `Authenticated for ${currentState.storeDomain}.` : authOutcome.stderr || authOutcome.stdout || "Shopify auth is required.",
                authOutcome.command
              )
          );

    const [
      nodeVersion,
      npmVersion,
      repoDepsReady,
      shopifyVersion,
      playwrightVersion,
      playwrightBrowser,
      codexCheck,
      claudeCheck,
      claudeAuth,
      skillReady,
      claudePlugins,
      claudeMcpList,
      codexFigmaCheck,
      codexPlaywrightCheck,
      shopifyAuthCheck
    ] = await Promise.all([
      runCommand("node", ["--version"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      runCommand("npm", ["--version"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      fileExists(path.join(this.workspaceRoot, "node_modules")),
      runShopifyCommand(["version"], this.workspaceRoot, STATUS_CHECK_TIMEOUT_MS),
      runCommand("npx", ["playwright", "--version"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      runCommand(
        "node",
        ["-e", "import('playwright').then(({ chromium }) => { console.log(chromium.executablePath()); }).catch((error) => { console.error(error.message); process.exit(1); });"],
        { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }
      ),
      runCommand("codex", ["--help"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      runCommand("claude", ["--version"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      runCommand("claude", ["auth", "status"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      fileExists(path.join(userPaths.claudeSkills, "figma-to-shopify-pipeline", "SKILL.md")),
      runCommand("claude", ["plugin", "list"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      runCommand("claude", ["mcp", "list"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS }),
      readCodexMcp(this.workspaceRoot, "figma"),
      readCodexMcp(this.workspaceRoot, "playwright"),
      shopifyAuthPromise
    ]);

    const checks: CheckResult[] = [];
    const parsedShopify = parseShopifyVersion(shopifyVersion.stdout, shopifyVersion.stderr);
    const executablePath = playwrightBrowser.stdout.trim();
    const browserReady = playwrightBrowser.ok && executablePath.length > 0 && (await fileExists(executablePath));
    const parsedAuth = parseClaudeAuthStatus(claudeAuth.stdout, claudeAuth.stderr);
    const figmaPlugin = parseClaudePluginList(claudePlugins.stdout, "figma@claude-plugins-official");
    const playwrightPlugin = parseClaudePluginList(claudePlugins.stdout, "playwright@claude-plugins-official");
    const figmaMcp = parseClaudeMcpStatus(claudeMcpList.stdout, "figma");
    const playwrightMcp = parseClaudeMcpStatus(claudeMcpList.stdout, "playwright");

    checks.push(check("node", nodeVersion.ok ? "ready" : "error", nodeVersion.ok ? nodeVersion.stdout.trim() : nodeVersion.stderr || "Node.js missing.", nodeVersion.command));
    checks.push(check("npm", npmVersion.ok ? "ready" : "error", npmVersion.ok ? `npm ${npmVersion.stdout.trim()}` : npmVersion.stderr || "npm missing.", npmVersion.command));
    checks.push(check("repoDeps", repoDepsReady ? "ready" : "action_required", repoDepsReady ? "Root dependencies are installed." : "Run npm install in the repo root."));
    checks.push(check("shopifyCli", parsedShopify.installed ? "ready" : "action_required", parsedShopify.detail, shopifyVersion.command));
    checks.push(check("playwrightPkg", playwrightVersion.ok ? "ready" : "action_required", playwrightVersion.ok ? playwrightVersion.stdout.trim() : playwrightVersion.stderr || "Playwright package missing.", playwrightVersion.command));
    checks.push(check("playwrightBrowser", browserReady ? "ready" : "action_required", browserReady ? executablePath : playwrightBrowser.stderr || "Chromium is not installed.", playwrightBrowser.command));
    checks.push(check("codexCli", codexCheck.ok ? "ready" : "action_required", codexCheck.ok ? "Codex CLI is installed." : codexCheck.stderr || "Codex CLI missing.", codexCheck.command));
    checks.push(check("claudeCli", claudeCheck.ok ? "ready" : "action_required", claudeCheck.ok ? claudeCheck.stdout.trim() || claudeCheck.stderr.trim() : claudeCheck.stderr || "Claude CLI missing.", claudeCheck.command));
    checks.push(check("claudeAuth", parsedAuth.loggedIn ? "ready" : "auth_required", parsedAuth.detail, claudeAuth.command));
    checks.push(check("claudeSkill", skillReady ? "ready" : "action_required", skillReady ? "figma-to-shopify-pipeline skill is installed." : "Install the repo skill into Claude's user skills directory."));
    checks.push(
      check(
        "claudeFigma",
        figmaMcp.connected ? "ready" : figmaMcp.needsAuth ? "auth_required" : "action_required",
        figmaMcp.connected ? "Claude Figma MCP is connected." : figmaMcp.exists ? figmaMcp.detail : figmaPlugin.detail,
        figmaMcp.exists ? claudeMcpList.command : claudePlugins.command
      )
    );
    checks.push(
      check(
        "claudePlaywright",
        playwrightMcp.connected || playwrightPlugin.enabled ? "ready" : "action_required",
        playwrightMcp.connected ? "Claude Playwright MCP is connected." : playwrightPlugin.detail,
        playwrightMcp.exists ? claudeMcpList.command : claudePlugins.command
      )
    );
    checks.push(codexFigmaCheck);
    checks.push(codexPlaywrightCheck);
    checks.push(shopifyAuthCheck);

    const runtimeStates: RuntimeState[] = [
      {
        provider: "claude",
        installed: claudeCheck.ok,
        authenticated: parsedAuth.loggedIn,
        integrations: [
          figmaMcp.connected ? "figma" : "",
          playwrightMcp.connected || playwrightPlugin.enabled ? "playwright" : "",
          skillReady ? "figma-to-shopify-pipeline" : ""
        ].filter(Boolean)
      },
      {
        provider: "codex",
        installed: codexCheck.ok,
        authenticated: true,
        integrations: checks
          .filter((item) => item.id === "codexFigmaMcp" || item.id === "codexPlaywrightMcp")
          .filter((item) => item.status === "ready")
          .map((item) => (item.id === "codexFigmaMcp" ? "figma" : "playwright"))
      }
    ];

    return {
      workspaceRoot: this.workspaceRoot,
      inputs: currentState,
      checks: CHECK_ORDER.map((id) => checks.find((item) => item.id === id) ?? check(id, "idle")),
      runtimeStates,
      secretStatuses: await this.secretStore.getStatuses()
    };
  }

  async runChecks(nextInputs?: Partial<SetupInputState>): Promise<SetupSnapshot> {
    const storedState = await readStoredState();
    const currentState = mergeInputState(storedState, nextInputs);
    await writeStoredState(currentState);
    const snapshot = await this.composeSnapshot(currentState);
    await writeSnapshotCache(snapshot);
    return snapshot;
  }

  async getBootstrapSnapshot(): Promise<SetupSnapshot> {
    const inputs = await this.getConnectionState();
    const secretStatuses = await this.secretStore.getStatuses();
    const cachedSnapshot = await readSnapshotCache();
    if (!cachedSnapshot) {
      return this.createIdleSnapshot(inputs, secretStatuses);
    }

    const nextChecks = CHECK_ORDER.map((id) => {
      const cachedCheck = cachedSnapshot.checks.find((item) => item.id === id);

      if (id === "shopifyAuth" && inputs.storeDomain !== cachedSnapshot.inputs.storeDomain) {
        return check(
          "shopifyAuth",
          "idle",
          inputs.storeDomain ? "Refreshing Shopify auth status…" : "Enter a store domain to validate Shopify auth."
        );
      }

      if (
        cachedCheck &&
        VOLATILE_BOOTSTRAP_CHECKS.has(id) &&
        cachedCheck.status !== "ready" &&
        (id !== "shopifyAuth" || Boolean(inputs.storeDomain))
      ) {
        return check(id, "idle", `Refreshing ${CHECK_META[id].label.toLowerCase()} status…`);
      }

      return cachedCheck ?? check(id, "idle", "Checking desktop readiness…");
    });

    return {
      workspaceRoot: this.workspaceRoot,
      inputs,
      checks: nextChecks,
      runtimeStates: nextChecks.some((item) => VOLATILE_BOOTSTRAP_CHECKS.has(item.id) && item.status === "idle") ? [] : cachedSnapshot.runtimeStates ?? [],
      secretStatuses
    };
  }

  async getConnectionState() {
    const storedState = await readStoredState();
    return mergeInputState(storedState);
  }

  async saveConnectionState(nextState: Partial<SetupInputState>): Promise<ActionResult> {
    const storedState = await readStoredState();
    const currentState = mergeInputState(storedState, nextState);

    if (currentState.figmaUrl && !isValidFigmaUrl(currentState.figmaUrl)) {
      return {
        ok: false,
        message: "Figma URL must point to a Figma design or file.",
        snapshot: await this.composeSnapshot(currentState)
      };
    }

    await writeStoredState(currentState);
    return {
      ok: true,
      message: "Connection context saved.",
      snapshot: await this.composeSnapshot(currentState)
    };
  }

  async getBuildDraft(): Promise<BuildDraft> {
    const state = await this.getConnectionState();
    const secretStatuses = await this.secretStore.getStatuses();
    return {
      figmaUrl: state.figmaUrl,
      storeDomain: state.storeDomain,
      designSlug: state.designSlugDraft || suggestDesignSlug(state.figmaUrl, state.storeDomain),
      figmaTokenStored: secretStatuses.some((status) => status.id === "figmaToken" && status.stored),
      storefrontPasswordStored: secretStatuses.some((status) => status.id === "shopifyStorefrontPassword" && status.stored)
    };
  }

  async getSecretValue(id: SecretId) {
    return this.secretStore.getSecret(id);
  }

  async saveSecret(id: SecretId, value: string): Promise<ActionResult> {
    const normalized = value.trim();
    if (!(await this.secretStore.isAvailable())) {
      return {
        ok: false,
        message: "Secure OS-backed secret storage is unavailable.",
        snapshot: await this.runChecks()
      };
    }

    if (Buffer.byteLength(normalized, "utf8") > MAX_SECRET_VALUE_BYTES) {
      return {
        ok: false,
        message: "Secret is too large to store safely.",
        snapshot: await this.runChecks()
      };
    }

    if (!normalized) {
      await this.secretStore.deleteSecret(id);
      return {
        ok: true,
        message: "Secret removed.",
        snapshot: await this.runChecks()
      };
    }

    await this.secretStore.setSecret(id, normalized);
    return {
      ok: true,
      message: "Secret saved to the OS credential vault.",
      snapshot: await this.runChecks()
    };
  }

  async deleteSecret(id: SecretId): Promise<ActionResult> {
    if (!(await this.secretStore.isAvailable())) {
      return {
        ok: false,
        message: "Secure OS-backed secret storage is unavailable.",
        snapshot: await this.runChecks()
      };
    }

    await this.secretStore.deleteSecret(id);
    return {
      ok: true,
      message: "Secret removed.",
      snapshot: await this.runChecks()
    };
  }

  async getSecretStatuses() {
    return this.secretStore.getStatuses();
  }

  async backupConfigs(): Promise<BackupReport> {
    const userPaths = getUserPaths();
    const backupRoot = path.join(userPaths.appDataRoot, "setup-backups");
    await mkdir(backupRoot, { recursive: true, mode: 0o700 });
    return backupTargets([userPaths.claudeJson, userPaths.claudeSettings, userPaths.claudeSkills, userPaths.codexConfig], backupRoot);
  }

  async installDependencies(): Promise<ActionResult> {
    const repoInstall = await runCommand("npm", ["install"], { cwd: this.workspaceRoot });
    if (!repoInstall.ok) {
      return {
        ok: false,
        message: "Root npm install failed.",
        outcome: repoInstall,
        snapshot: await this.runChecks()
      };
    }

    const playwrightInstall = await runCommand("npx", ["playwright", "install", "chromium"], { cwd: this.workspaceRoot });
    if (!playwrightInstall.ok) {
      return {
        ok: false,
        message: "Playwright Chromium installation failed.",
        outcome: playwrightInstall,
        snapshot: await this.runChecks()
      };
    }

    const shopifyState = await runShopifyCommand(["version"], this.workspaceRoot);
    if (!shopifyState.ok) {
      const shopifyInstall = await runShopifyInstall(this.workspaceRoot);
      if (!shopifyInstall.ok) {
        return {
          ok: false,
          message: "Shopify CLI installation failed.",
          outcome: shopifyInstall,
          snapshot: await this.runChecks()
        };
      }
    }

    const codexState = await runCommand("codex", ["--help"], { cwd: this.workspaceRoot });
    if (!codexState.ok) {
      const codexInstall = await runNpmGlobalInstall("codex-cli", this.workspaceRoot);
      if (!codexInstall.ok) {
        return {
          ok: false,
          message: "Codex CLI installation failed.",
          outcome: codexInstall,
          snapshot: await this.runChecks()
        };
      }
    }

    return {
      ok: true,
      message: "Dependencies installed or refreshed.",
      snapshot: await this.runChecks()
    };
  }

  async configureClaude(): Promise<ActionResult> {
    await this.backupConfigs();
    const userPaths = getUserPaths();
    await mkdir(userPaths.claudeSkills, { recursive: true, mode: 0o700 });

    const packagedSkill = path.join(this.workspaceRoot, "figma-to-shopify-pipeline.skill");
    const extractedSkillRoot = path.join(userPaths.appDataRoot, "skill-cache", "figma-to-shopify-pipeline");
    await mkdir(extractedSkillRoot, { recursive: true, mode: 0o700 });
    new AdmZip(packagedSkill).extractAllTo(extractedSkillRoot, true);
    await ensureDirectoryCopy(path.join(extractedSkillRoot, "figma-to-shopify-pipeline"), path.join(userPaths.claudeSkills, "figma-to-shopify-pipeline"));

    const figmaInstall = await runCommand("claude", ["plugin", "install", "figma@claude-plugins-official"], { cwd: this.workspaceRoot });
    if (!figmaInstall.ok && !figmaInstall.stdout.includes("already installed")) {
      return {
        ok: false,
        message: "Claude Figma plugin installation failed.",
        outcome: figmaInstall,
        snapshot: await this.runChecks()
      };
    }

    const playwrightInstall = await runCommand("claude", ["plugin", "install", "playwright@claude-plugins-official"], { cwd: this.workspaceRoot });
    if (!playwrightInstall.ok && !playwrightInstall.stdout.includes("already installed")) {
      return {
        ok: false,
        message: "Claude Playwright integration installation failed.",
        outcome: playwrightInstall,
        snapshot: await this.runChecks()
      };
    }

    return {
      ok: true,
      message: "Claude setup completed.",
      snapshot: await this.runChecks()
    };
  }

  async configureCodex(): Promise<ActionResult> {
    await this.backupConfigs();

    const figmaGet = await runCommand("codex", ["mcp", "get", "figma"], { cwd: this.workspaceRoot });
    if (!figmaGet.ok) {
      const addFigma = await runCommand("codex", ["mcp", "add", "figma", "--url", "https://mcp.figma.com/mcp"], { cwd: this.workspaceRoot });
      if (!addFigma.ok) {
        return {
          ok: false,
          message: "Codex Figma MCP configuration failed.",
          outcome: addFigma,
          snapshot: await this.runChecks()
        };
      }
    }

    const playwrightGet = await runCommand("codex", ["mcp", "get", "playwright"], { cwd: this.workspaceRoot });
    if (!playwrightGet.ok) {
      const addPlaywright = await runCommand("codex", ["mcp", "add", "playwright", "--", "npx", "@playwright/mcp@latest"], { cwd: this.workspaceRoot });
      if (!addPlaywright.ok) {
        return {
          ok: false,
          message: "Codex Playwright MCP configuration failed.",
          outcome: addPlaywright,
          snapshot: await this.runChecks()
        };
      }
    }

    return {
      ok: true,
      message: "Codex setup completed.",
      snapshot: await this.runChecks()
    };
  }

  async startShopifyAuth(storeDomain: string): Promise<ActionResult> {
    const trimmedDomain = normalizeStoreDomain(storeDomain);
    await writeStoredState(mergeInputState(await readStoredState(), { storeDomain: trimmedDomain }));

    if (!isValidStoreDomain(trimmedDomain)) {
      return {
        ok: false,
        message: "Store domain must be a valid *.myshopify.com hostname.",
        snapshot: await this.runChecks({ storeDomain: trimmedDomain })
      };
    }

    const existingAuth = await runShopifyCommand(["theme", "list", "--store", trimmedDomain, "--json"], this.workspaceRoot, STATUS_CHECK_TIMEOUT_MS);
    if (existingAuth.ok) {
      return {
        ok: true,
        message: "Shopify auth finished.",
        outcome: existingAuth,
        snapshot: await this.runChecks({ storeDomain: trimmedDomain })
      };
    }

    const outcome = await runShopifyCommand(["auth", "login", "--store", trimmedDomain], this.workspaceRoot);
    await maybeOpenAuthUrl(`${outcome.stdout}\n${outcome.stderr}`);

    return {
      ok: outcome.ok,
      message: outcome.ok ? "Shopify auth finished." : "Shopify auth requires completion.",
      outcome,
      snapshot: await this.runChecks({ storeDomain: trimmedDomain })
    };
  }

  async startClaudeAuth(): Promise<ActionResult> {
    const currentAuth = await runCommand("claude", ["auth", "status"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS });
    const parsedAuth = parseClaudeAuthStatus(currentAuth.stdout, currentAuth.stderr);
    if (parsedAuth.loggedIn) {
      return {
        ok: true,
        message: "Claude auth finished.",
        outcome: currentAuth,
        snapshot: await this.runChecks()
      };
    }

    const outcome = await runCommand("claude", ["auth", "login"], { cwd: this.workspaceRoot });
    await maybeOpenAuthUrl(`${outcome.stdout}\n${outcome.stderr}`);
    return {
      ok: outcome.ok,
      message: outcome.ok ? "Claude auth finished." : "Claude auth requires completion.",
      outcome,
      snapshot: await this.runChecks()
    };
  }

  async startFigmaAuth(provider: ProviderId): Promise<ActionResult> {
    if (provider === "codex") {
      const outcome = await runCommand("codex", ["mcp", "login", "figma"], { cwd: this.workspaceRoot });
      await maybeOpenAuthUrl(`${outcome.stdout}\n${outcome.stderr}`);
      return {
        ok: outcome.ok,
        message: outcome.ok ? "Codex Figma auth finished." : "Codex Figma auth requires completion.",
        outcome,
        snapshot: await this.runChecks()
      };
    }

    const currentMcpState = await runCommand("claude", ["mcp", "list"], { cwd: this.workspaceRoot, timeoutMs: STATUS_CHECK_TIMEOUT_MS });
    const figmaMcp = parseClaudeMcpStatus(currentMcpState.stdout, "figma");
    if (figmaMcp.connected) {
      return {
        ok: true,
        message: "Claude Figma setup is already ready.",
        outcome: currentMcpState,
        snapshot: await this.runChecks()
      };
    }

    const installOutcome = await runCommand("claude", ["plugin", "install", "figma@claude-plugins-official"], { cwd: this.workspaceRoot });
    if (!installOutcome.ok && !installOutcome.stdout.includes("already installed")) {
      return {
        ok: false,
        message: "Claude Figma plugin installation failed.",
        outcome: installOutcome,
        snapshot: await this.runChecks()
      };
    }

    const snapshot = await this.runChecks();
    const nextFigmaState = snapshot.checks.find((item) => item.id === "claudeFigma");
    return {
      ok: nextFigmaState?.status === "ready",
      message:
        nextFigmaState?.status === "ready"
          ? "Claude Figma setup completed."
          : "Claude Figma plugin is installed. Refresh checks after Claude finishes loading the MCP connection.",
      outcome: installOutcome,
      snapshot
    };
  }
}
