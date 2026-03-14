import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { BrowserWindow } from "electron";
import { createChildProcessEnv } from "../security/child-env";
import { buildClaudePrompt, isValidDesignSlug, isValidFigmaUrl, sanitizeDesignSlug } from "../../shared/build-utils";
import type { BuildInput, BuildRunState } from "../../shared/setup-types";

const BUILD_OUTPUT_CHANNEL = "build:output";
const BUILD_STATUS_CHANNEL = "build:status";
class BuildCancelledError extends Error {}

const redactSecrets = (value: string, secrets: string[]) => {
  let next = value;
  for (const secret of secrets.filter(Boolean)) {
    next = next.split(secret).join("[REDACTED]");
  }
  return next;
};

const normalizeInput = (input: BuildInput): BuildInput => ({
  figmaUrl: input.figmaUrl.trim(),
  storeDomain: input.storeDomain.trim().toLowerCase(),
  designSlug: sanitizeDesignSlug(input.designSlug)
});

export class ClaudeBuildManager {
  private child: ChildProcessWithoutNullStreams | null = null;
  private state: BuildRunState = { status: "idle", command: "" };
  private runPromise: Promise<void> | null = null;
  private cancelRequested = false;
  private secretValues: string[] = [];

  constructor(private readonly window: BrowserWindow, private readonly workspaceRoot: string) {}

  private canPublish() {
    return !this.window.isDestroyed() && !this.window.webContents.isDestroyed();
  }

  getState() {
    return this.state;
  }

  private publishState() {
    if (this.canPublish()) {
      this.window.webContents.send(BUILD_STATUS_CHANNEL, this.state);
    }
  }

  private publishOutput(text: string) {
    if (this.canPublish()) {
      this.window.webContents.send(BUILD_OUTPUT_CHANNEL, text);
    }
  }

  private startStage(summary: string, command: string) {
    this.state = {
      ...this.state,
      status: "running",
      command,
      summary,
      startedAt: this.state.startedAt ?? new Date().toISOString()
    };
    this.publishState();
    this.publishOutput(`[system] ${summary}\n`);
  }

  private async runProcess(command: string, args: string[], env: NodeJS.ProcessEnv, summary: string, commandLabel: string) {
    if (this.cancelRequested) {
      throw new BuildCancelledError("Claude build cancelled.");
    }

    this.startStage(summary, commandLabel);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.workspaceRoot,
        env,
        shell: false,
        windowsHide: true
      });

      this.child = child;

      child.stdout.on("data", (chunk) => {
        this.publishOutput(redactSecrets(chunk.toString(), this.secretValues));
      });
      child.stderr.on("data", (chunk) => {
        this.publishOutput(redactSecrets(chunk.toString(), this.secretValues));
      });
      child.on("error", (error) => {
        this.child = null;
        reject(error);
      });
      child.on("close", (code, signal) => {
        this.child = null;
        if (this.cancelRequested || this.state.status === "cancelled") {
          reject(new BuildCancelledError(signal ? `Claude build cancelled (${signal}).` : "Claude build cancelled."));
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`${commandLabel} exited with code ${code ?? "unknown"}.`));
      });
    });
  }

  private async runPipeline(normalized: BuildInput, prompt: string, env: NodeJS.ProcessEnv) {
    try {
      await this.runProcess(
        "claude",
        ["-p", prompt],
        env,
        `Running Claude build for ${normalized.designSlug}.`,
        `claude -p ${JSON.stringify(prompt)}`
      );

      this.state = {
        ...this.state,
        status: "succeeded",
        finishedAt: new Date().toISOString(),
        exitCode: 0,
        summary: "Claude build completed."
      };
      this.publishState();
    } catch (error) {
      const cancelled = this.cancelRequested || error instanceof BuildCancelledError;
      this.state = {
        ...this.state,
        status: cancelled ? "cancelled" : "failed",
        finishedAt: new Date().toISOString(),
        exitCode: cancelled ? null : -1,
        summary:
          error instanceof Error
            ? error.message
            : cancelled
              ? "Claude build cancelled."
              : "Claude build failed."
      };
      this.publishState();
    } finally {
      this.child = null;
      this.secretValues = [];
      this.cancelRequested = false;
      this.runPromise = null;
    }
  }

  async launch(input: BuildInput, secrets: { figmaToken?: string | null; storefrontPassword?: string | null }) {
    if (this.child || this.runPromise) {
      throw new Error("A Claude build is already running.");
    }

    const normalized = normalizeInput(input);
    if (!isValidFigmaUrl(normalized.figmaUrl)) {
      throw new Error("A valid Figma file URL is required.");
    }
    if (!normalized.storeDomain.endsWith(".myshopify.com")) {
      throw new Error("Store domain must be a valid *.myshopify.com hostname.");
    }
    if (!isValidDesignSlug(normalized.designSlug)) {
      throw new Error("Design slug must contain only lowercase letters, numbers, and dashes.");
    }

    const prompt = buildClaudePrompt(normalized);
    const env = createChildProcessEnv({
      DESIGN_SLUG: normalized.designSlug,
      SHOPIFY_STORE: normalized.storeDomain
    });

    if (secrets.figmaToken) {
      env.FIGMA_TOKEN = secrets.figmaToken;
    }
    if (secrets.storefrontPassword) {
      env.SHOPIFY_STOREFRONT_PASSWORD = secrets.storefrontPassword;
    }

    this.state = {
      status: "running",
      command: `claude -p ${JSON.stringify(prompt)}`,
      startedAt: new Date().toISOString(),
      summary: `Running Claude build for ${normalized.designSlug}.`
    };
    this.publishState();
    this.publishOutput(`[system] Starting Claude build for ${normalized.designSlug}.\n`);

    this.cancelRequested = false;
    this.secretValues = [secrets.figmaToken ?? "", secrets.storefrontPassword ?? ""];
    this.runPromise = this.runPipeline(normalized, prompt, env);

    return this.state;
  }

  cancel() {
    if (!this.child && !this.runPromise) {
      return this.state;
    }

    this.cancelRequested = true;
    this.state = {
      ...this.state,
      status: "cancelled",
      summary: "Cancelling current build step..."
    };
    this.publishState();
    this.child?.kill();
    return this.state;
  }
}
