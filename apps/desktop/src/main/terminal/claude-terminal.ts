import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import pty, { type IPty } from "node-pty";
import type { BrowserWindow } from "electron";
import { createChildProcessEnv } from "../security/child-env";
import { getLoginShellPath } from "../setup/commands";
import type { LaunchClaudeContext } from "../../shared/setup-types";

const buildTerminalEnv = (context?: LaunchClaudeContext): Record<string, string> => {
  if (process.platform === "win32") {
    // Windows: use the filtered env (works on Windows as tested)
    const env = createChildProcessEnv();
    if (context?.storeDomain) env.SHOPIFY_STORE = context.storeDomain;
    if (context?.designSlug) env.DESIGN_SLUG = context.designSlug;
    if (typeof context?.figmaToken === "string") env.FIGMA_TOKEN = context.figmaToken;
    if (typeof context?.storefrontPassword === "string") env.SHOPIFY_STOREFRONT_PASSWORD = context.storefrontPassword;
    return env as Record<string, string>;
  }

  // macOS/Linux: start from the full process.env so node-pty has everything it
  // needs (USER, TMPDIR, SHELL, TERM, etc.), then override PATH and add extras.
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  env.PATH = getLoginShellPath();
  if (context?.storeDomain) env.SHOPIFY_STORE = context.storeDomain;
  if (context?.designSlug) env.DESIGN_SLUG = context.designSlug;
  if (typeof context?.figmaToken === "string") env.FIGMA_TOKEN = context.figmaToken;
  if (typeof context?.storefrontPassword === "string") env.SHOPIFY_STOREFRONT_PASSWORD = context.storefrontPassword;
  return env;
};

const MAX_TERMINAL_CHUNK = 4096;
const WINDOWS_SHELL = "powershell.exe";

const resolveClaudeExecutable = () => {
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.USERPROFILE || "", ".local", "bin", "claude.exe"),
      path.join(process.env.APPDATA || "", "npm", "claude.cmd"),
      path.join(process.env.APPDATA || "", "npm", "claude.exe")
    ];

    const existingCandidate = candidates.find((candidate) => candidate && existsSync(candidate));
    if (existingCandidate) {
      return existingCandidate;
    }

    try {
      const resolved = execFileSync("where.exe", ["claude"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true
      })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      if (resolved) {
        return resolved;
      }
    } catch {
      // Fall through to the plain command name.
    }

    return "claude";
  }

  const unixCandidates = [
    path.join(process.env.HOME || "", ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude"
  ];

  const existingCandidate = unixCandidates.find((candidate) => candidate && existsSync(candidate));
  if (existingCandidate) {
    return existingCandidate;
  }

  try {
    const resolved = execFileSync("which", ["claude"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    if (resolved && existsSync(resolved)) {
      return resolved;
    }
  } catch {
    // Fall through to the plain command name.
  }

  return "claude";
};

const toPowerShellCommand = (command: string) => {
  if (!command.includes("\\") && !command.includes("/")) {
    return command;
  }

  return `& '${command.replace(/'/g, "''")}'`;
};

export class ClaudeTerminalManager {
  private terminal: IPty | null = null;

  constructor(private readonly window: BrowserWindow, private readonly workspaceRoot: string) {}

  private send(channel: string, payload?: string) {
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
      return;
    }

    if (typeof payload === "undefined") {
      this.window.webContents.send(channel);
      return;
    }

    this.window.webContents.send(channel, payload);
  }

  launch(context?: LaunchClaudeContext) {
    this.dispose();

    const env = buildTerminalEnv(context);

    try {
      if (process.platform === "win32") {
        this.terminal = pty.spawn(
          WINDOWS_SHELL,
          ["-NoLogo", "-NoExit", "-Command", toPowerShellCommand(resolveClaudeExecutable())],
          {
            name: "xterm-color",
            cwd: this.workspaceRoot,
            env,
            cols: 120,
            rows: 32,
            useConpty: false
          }
        );
        this.send("chat:system", "Claude terminal started through Windows PowerShell for stability.");
      } else {
        const claudeExec = resolveClaudeExecutable();
        this.terminal = pty.spawn(claudeExec, [], {
          name: "xterm-color",
          cwd: this.workspaceRoot,
          env,
          cols: 120,
          rows: 32
        });
      }
    } catch (error) {
      this.terminal = null;
      const message = error instanceof Error ? error.message : "Claude terminal failed to start.";
      this.send("chat:system", message);
      throw error;
    }

    this.terminal.onData((data) => {
      this.send("chat:data", data);
    });
    this.terminal.onExit(() => {
      this.send("chat:exit");
      this.terminal = null;
    });

    this.send("chat:system", `Claude terminal started in ${this.workspaceRoot}.`);
  }

  write(data: string) {
    this.terminal?.write(data.slice(0, MAX_TERMINAL_CHUNK));
  }

  resize(cols: number, rows: number) {
    if (this.terminal && cols > 0 && rows > 0) {
      this.terminal.resize(cols, rows);
    }
  }

  dispose() {
    this.terminal?.kill();
    this.terminal = null;
  }
}
