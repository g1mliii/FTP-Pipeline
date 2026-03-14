import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CommandOutcome } from "../../shared/setup-types";

export interface CommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

// On macOS/Linux, resolve the full PATH from the user's login shell once at
// startup so that tools installed via nvm, Homebrew, ~/.local/bin, etc. are
// all reachable without hardcoding version-specific paths.
let resolvedLoginPath: string | null = null;

export const getLoginShellPath = (): string => {
  if (process.platform === "win32") {
    return process.env.PATH || "";
  }
  if (resolvedLoginPath !== null) {
    return resolvedLoginPath;
  }
  try {
    const loginShell = process.env.SHELL || "/bin/zsh";
    const output = execFileSync(loginShell, ["-l", "-c", "echo $PATH"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000
    }).trim();
    resolvedLoginPath = output || process.env.PATH || "";
  } catch {
    resolvedLoginPath = process.env.PATH || "";
  }
  return resolvedLoginPath;
};

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

    let env = { ...process.env, ...options.env };

    if (process.platform !== "win32") {
      env.PATH = getLoginShellPath();
    }

    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      env,
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

// Runs a command and resolves as soon as a URL is found in the streamed output,
// without waiting for the process to finish. The process is killed after the URL
// is extracted. Used for auth commands that stay open waiting for browser completion.
export const runCommandAndExtractUrl = (command: string, args: string[], options: CommandOptions): Promise<{ url: string | null; stdout: string; stderr: string; command: string }> =>
  new Promise((resolve) => {
    const spawnSpec = buildSpawnSpec(command, args);
    let env = { ...process.env, ...options.env };
    if (process.platform !== "win32") {
      env.PATH = getLoginShellPath();
    }

    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      env,
      shell: spawnSpec.shell,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let resolved = false;

    const tryResolveUrl = () => {
      if (resolved) return;
      const combined = `${stdout}\n${stderr}`;
      const match = combined.match(/https?:\/\/[^\s"'<>]+/i);
      if (match) {
        resolved = true;
        child.kill();
        resolve({ url: match[0], stdout, stderr, command: [command, ...args].join(" ") });
      }
    };

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); tryResolveUrl(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); tryResolveUrl(); });

    child.on("error", () => {
      if (!resolved) { resolved = true; resolve({ url: null, stdout, stderr, command: [command, ...args].join(" ") }); }
    });
    child.on("close", () => {
      if (!resolved) { resolved = true; resolve({ url: null, stdout, stderr, command: [command, ...args].join(" ") }); }
    });

    if (typeof options.timeoutMs === "number" && options.timeoutMs > 0) {
      setTimeout(() => {
        if (!resolved) { resolved = true; child.kill(); resolve({ url: null, stdout, stderr, command: [command, ...args].join(" ") }); }
      }, options.timeoutMs);
    }
  });

export const runNpmGlobalInstall = (pkg: string, cwd: string, timeoutMs?: number) => runCommand("npm", ["install", "-g", pkg], { cwd, timeoutMs });

// Like runCommandAndExtractUrl but does NOT kill the process after finding the URL.
// Used for Shopify's device-code auth flow — the CLI must stay alive to poll for
// the user completing login in the browser.
export const runCommandStreamUrl = (command: string, args: string[], options: CommandOptions): Promise<string | null> =>
  new Promise((resolve) => {
    const spawnSpec = buildSpawnSpec(command, args);
    let env = { ...process.env, ...options.env };
    if (process.platform !== "win32") {
      env.PATH = getLoginShellPath();
    }

    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      env,
      shell: spawnSpec.shell,
      windowsHide: true
    });

    let buffer = "";
    let resolved = false;

    const tryResolve = () => {
      if (resolved) return;
      const match = buffer.match(/https?:\/\/[^\s"'<>]+/i);
      if (match) {
        resolved = true;
        resolve(match[0]);
        // Do NOT kill — process must keep running to receive the OAuth callback.
      }
    };

    child.stdout.on("data", (chunk) => { buffer += chunk.toString(); tryResolve(); });
    child.stderr.on("data", (chunk) => { buffer += chunk.toString(); tryResolve(); });
    child.on("error", () => { if (!resolved) { resolved = true; resolve(null); } });
    child.on("close", () => { if (!resolved) { resolved = true; resolve(null); } });

    if (typeof options.timeoutMs === "number" && options.timeoutMs > 0) {
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(null); }
        // Still do NOT kill on timeout — let the process finish naturally.
      }, options.timeoutMs);
    }
  });

// Streams output, calls onUrlFound as soon as a URL appears (for opening in browser),
// and then WAITS for the process to fully complete. Used for Shopify device-code auth:
// the CLI must stay alive to poll for the OAuth callback and save credentials before
// we consider auth done.
export const runCommandStreamUrlAndWait = (
  command: string,
  args: string[],
  options: CommandOptions,
  onUrlFound: (url: string) => void
): Promise<CommandOutcome> =>
  new Promise((resolve) => {
    const spawnSpec = buildSpawnSpec(command, args);
    let env = { ...process.env, ...options.env };
    if (process.platform !== "win32") {
      env.PATH = getLoginShellPath();
    }

    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      env,
      shell: spawnSpec.shell,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let urlNotified = false;
    let resolved = false;
    let timeout: NodeJS.Timeout | null = null;

    const finalize = (outcome: CommandOutcome) => {
      if (resolved) return;
      resolved = true;
      if (timeout) clearTimeout(timeout);
      resolve(outcome);
    };

    const tryNotifyUrl = () => {
      if (urlNotified) return;
      const match = `${stdout}\n${stderr}`.match(/https?:\/\/[^\s"'<>]+/i);
      if (match) {
        urlNotified = true;
        onUrlFound(match[0]);
      }
    };

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); tryNotifyUrl(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); tryNotifyUrl(); });
    child.on("error", (error) => finalize({ ok: false, code: -1, stdout, stderr: error.message, command: [command, ...args].join(" ") }));
    child.on("close", (code) => finalize({ ok: code === 0, code, stdout, stderr, command: [command, ...args].join(" ") }));

    if (typeof options.timeoutMs === "number" && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill();
        finalize({ ok: false, code: null, stdout, stderr: `Command timed out after ${options.timeoutMs}ms.`, command: [command, ...args].join(" ") });
      }, options.timeoutMs);
    }
  });

export const detectFirstUrl = (text: string) => text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? null;
