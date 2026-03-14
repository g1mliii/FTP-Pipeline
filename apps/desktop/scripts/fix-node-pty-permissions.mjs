import { chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prebuildsRoot = path.resolve(__dirname, "..", "node_modules", "node-pty", "prebuilds");

// node-pty ships spawn-helper without execute permission on some platforms.
// Without it node-pty throws "posix_spawnp failed" at runtime.
const helpers = [
  path.join(prebuildsRoot, "darwin-arm64", "spawn-helper"),
  path.join(prebuildsRoot, "darwin-x64", "spawn-helper"),
  path.join(prebuildsRoot, "linux-arm64", "spawn-helper"),
  path.join(prebuildsRoot, "linux-x64", "spawn-helper")
];

for (const helperPath of helpers) {
  if (existsSync(helperPath)) {
    await chmod(helperPath, 0o755);
    console.log(`Fixed permissions: ${helperPath}`);
  }
}
