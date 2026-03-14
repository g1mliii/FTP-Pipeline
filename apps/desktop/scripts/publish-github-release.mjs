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
const latestMacPath = path.join(distDir, "latest-mac.yml");

const runGh = (args) => execFileSync("gh", args, { cwd: workspaceDir, stdio: "pipe", encoding: "utf8" }).trim();

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

try {
  runGh(["auth", "status"]);
} catch {
  fail("GitHub CLI is not authenticated in this shell. Run `gh auth login` or export `GH_TOKEN` before publishing.");
}

if (!fs.existsSync(latestMacPath)) {
  fail(`Missing ${latestMacPath}. Run the mac dist build first.`);
}

const latestMac = fs.readFileSync(latestMacPath, "utf8");
const referencedFiles = [...latestMac.matchAll(/url:\s+([^\s]+)/g)].map((match) => match[1]);
const assetNames = new Set(["latest-mac.yml"]);

for (const file of referencedFiles) {
  assetNames.add(file);
  assetNames.add(`${file}.blockmap`);
}

const assets = [...assetNames]
  .map((file) => path.join(distDir, file))
  .filter((file) => fs.existsSync(file));

if (assets.length === 0) {
  fail(`No macOS release assets for ${version} were found in ${distDir}. Run the dist build first.`);
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
    `macOS release ${tag}`
  ]);
}

runGh(["release", "upload", tag, "--repo", repo, "--clobber", ...assets]);
console.log(`Uploaded ${assets.length} asset(s) to ${repo} ${tag}.`);
