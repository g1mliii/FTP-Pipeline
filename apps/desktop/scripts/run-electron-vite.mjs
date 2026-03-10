import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];

if (!mode) {
  throw new Error("electron-vite mode is required.");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const cliPath = path.resolve(workspaceRoot, "..", "..", "node_modules", "electron-vite", "bin", "electron-vite.js");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(process.execPath, [cliPath, mode], {
  cwd: workspaceRoot,
  env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
