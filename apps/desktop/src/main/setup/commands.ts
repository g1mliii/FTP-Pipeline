import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CommandOutcome } from "../../shared/setup-types";

export interface CommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

const WINDOWS_SCRIPT_COMMANDS = new Set(["npm", "npx", "shopify", "codex", "claude"]);

const resolveWindowsScriptPath = (command: string) => {
  const candidates = [
    path.join(process.env.APPDATA || "", "npm", `${command}.cmd`),
    path.join(process.env.PROGRAMFILES || "", "nodejs", `${command}.cmd`),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "nodejs", `${command}.cmd`)
  ].filter(Boolean);

  const existingCandidate = candidates.find((candidate) => existsSync(candidate));
  if (existingCandidate) {
    return existingCandidate;
  }

  try {
    const resolved = execFileSync("where.exe", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().endsWith(".cmd") || line.toLowerCase().endsWith(".exe"));

    if (resolved) {
      return resolved;
    }
  } catch {
    // Fall back to the raw command name.
  }

  return command;
};

const buildSpawnSpec = (command: string, args: string[]) => {
  if (process.platform !== "win32" || !WINDOWS_SCRIPT_COMMANDS.has(command)) {
    return { command, args, shell: false };
  }

  const resolvedCommand = resolveWindowsScriptPath(command);
  return {
    command: resolvedCommand.toLowerCase().endsWith(".cmd") && /\s/u.test(resolvedCommand) ? `"${resolvedCommand}"` : resolvedCommand,
    args,
    shell: resolvedCommand.toLowerCase().endsWith(".cmd")
  };
};

export const runCommand = (command: string, args: string[], options: CommandOptions): Promise<CommandOutcome> =>
  new Promise((resolve) => {
    let resolved = false;
    let timeout: NodeJS.Timeout | null = null;
    const spawnSpec = buildSpawnSpec(command, args);
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: spawnSpec.shell,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const finalize = (outcome: CommandOutcome) => {
      if (resolved) {
        return;
      }

      resolved = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve(outcome);
    };

    child.on("error", (error) => {
      finalize({
        ok: false,
        code: -1,
        stdout,
        stderr: error.message,
        command: [command, ...args].join(" ")
      });
    });

    child.on("close", (code) => {
      finalize({
        ok: code === 0,
        code,
        stdout,
        stderr,
        command: [command, ...args].join(" ")
      });
    });

    timeout =
      typeof options.timeoutMs === "number" && options.timeoutMs > 0
        ? setTimeout(() => {
            child.kill();
            finalize({
              ok: false,
              code: null,
              stdout,
              stderr: `Command timed out after ${options.timeoutMs}ms.`,
              command: [command, ...args].join(" ")
            });
          }, options.timeoutMs)
        : null;
  });

export const runShopifyCommand = async (args: string[], cwd: string, timeoutMs?: number) => {
  return runCommand("shopify", args, { cwd, timeoutMs });
};

export const runNpmGlobalInstall = (pkg: string, cwd: string, timeoutMs?: number) => runCommand("npm", ["install", "-g", pkg], { cwd, timeoutMs });

export const detectFirstUrl = (text: string) => text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? null;
