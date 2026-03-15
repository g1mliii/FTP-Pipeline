import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const workspaceDir = path.resolve(import.meta.dirname, "..");
const packageJsonPath = path.join(workspaceDir, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const tag = `v${version}`;
const repo = `${packageJson.build.publish.owner}/${packageJson.build.publish.repo}`;
const distDir = path.join(workspaceDir, "dist");
const latestWinPath = path.join(distDir, "latest.yml");

const runGh = (args) =>
  execFileSync("gh", args, { cwd: workspaceDir, stdio: "pipe", encoding: "utf8" }).trim();

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

try {
  runGh(["auth", "status"]);
} catch {
  fail("GitHub CLI is not authenticated. Run `gh auth login` or export `GH_TOKEN` before publishing.");
}

// Collect assets: only pick up files matching the configured artifactName pattern
const artifactBase = `Figma-Shopify-AutoBuild-${version}-win-x64`;
const assetPaths = [`${artifactBase}.exe`, `${artifactBase}.exe.blockmap`]
  .map((f) => path.join(distDir, f))
  .filter((f) => fs.existsSync(f));

// Include latest.yml if present (enables auto-update)
if (fs.existsSync(latestWinPath)) {
  assetPaths.push(latestWinPath);
} else {
  console.warn(
    "Warning: latest.yml not found. Auto-updates will not work for this release.\n" +
    "To enable auto-updates, run `npm run dist:win:publish` instead."
  );
}

if (assetPaths.length === 0) {
  fail(`No Windows release assets found in ${distDir}. Run \`npm run dist:win\` first.`);
}

let releaseExists = true;
try {
  runGh(["release", "view", tag, "--repo", repo]);
} catch {
  releaseExists = false;
}

if (!releaseExists) {
  runGh([
    "release",
    "create",
    tag,
    "--repo",
    repo,
    "--title",
    tag,
    "--notes",
    [
      `## Windows Release ${tag}`,
      "",
      "> **Note:** This build is unsigned. Windows SmartScreen may show a warning when running the installer.",
      "> Click **More info → Run anyway** to proceed.",
      "",
      "### Installation",
      "Download and run the `.exe` installer below.",
    ].join("\n"),
  ]);
}

runGh(["release", "upload", tag, "--repo", repo, "--clobber", ...assetPaths]);
console.log(`Uploaded ${assetPaths.length} asset(s) to ${repo} ${tag}.`);
