import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import pty, { type IPty } from "node-pty";
import type { BrowserWindow } from "electron";
import { createChildProcessEnv } from "../security/child-env";
import type { LaunchClaudeContext } from "../../shared/setup-types";

const MAX_TERMINAL_CHUNK = 4096;

const resolveClaudeExecutable = () => {
  if (process.platform !== "win32") {
    return "claude";
  }

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

    const env = createChildProcessEnv();
    if (context?.storeDomain) {
      env.SHOPIFY_STORE = context.storeDomain;
    }

    this.terminal = pty.spawn(resolveClaudeExecutable(), [], {
      name: "xterm-color",
      cwd: this.workspaceRoot,
      env: env as Record<string, string>,
      cols: 120,
      rows: 32,
      useConpty: process.platform === "win32"
    });

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
