/**
 * publish-github-release-mac.mjs
 *
 * Pre-flight checks, then uploads signed + notarized macOS artifacts to the
 * GitHub release for the current package version.
 *
 * Required env vars (must be set before running `npm run release:mac`):
 *   APPLE_ID                  – your Apple ID email
 *   APPLE_APP_SPECIFIC_PASSWORD – app-specific password from appleid.apple.com
 *   APPLE_TEAM_ID             – 10-char team ID from developer.apple.com
 *
 * A valid "Developer ID Application" certificate must also be installed in the
 * login keychain (added by Xcode or `security import`).
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

// ─── paths ───────────────────────────────────────────────────────────────────

const workspaceDir = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(workspaceDir, "package.json"), "utf8")
);
const version = packageJson.version;
const tag = `v${version}`;
const repo = `${packageJson.build.publish.owner}/${packageJson.build.publish.repo}`;
const distDir = path.join(workspaceDir, "dist");

// ─── helpers ─────────────────────────────────────────────────────────────────

const fail = (msg) => {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
};

const warn = (msg) => console.warn(`⚠️   ${msg}`);

const runGh = (args) =>
  execFileSync("gh", args, { cwd: workspaceDir, stdio: "pipe", encoding: "utf8" }).trim();

// ─── 1. Pre-flight: Apple env vars ───────────────────────────────────────────

console.log("🔍  Checking notarization credentials…");

const missingVars = ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"].filter(
  (v) => !process.env[v]
);
if (missingVars.length > 0) {
  fail(
    `Missing required environment variable(s): ${missingVars.join(", ")}\n` +
      "Export them before running this script:\n" +
      "  export APPLE_ID=you@example.com\n" +
      "  export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx\n" +
      "  export APPLE_TEAM_ID=XXXXXXXXXX"
  );
}

// ─── 2. Pre-flight: signing certificate in Keychain ──────────────────────────

console.log("🔍  Checking for Developer ID Application certificate…");

let signingIdentity = null;
try {
  const identities = execSync(
    'security find-identity -v -p codesigning login.keychain 2>/dev/null || ' +
    'security find-identity -v -p codesigning',
    { encoding: "utf8" }
  );
  const match = identities.match(/Developer ID Application:[^\n]+/);
  if (match) {
    signingIdentity = match[0].replace(/^\d+\)\s+[0-9A-F]+\s+"/, "").replace(/"$/, "");
    console.log(`✅  Found: ${signingIdentity}`);
  } else {
    fail(
      "No 'Developer ID Application' certificate found in your Keychain.\n" +
        "Install your certificate via Xcode → Settings → Accounts, or import it with:\n" +
        "  security import YourCert.p12 -k ~/Library/Keychains/login.keychain-db"
    );
  }
} catch {
  fail("Could not query Keychain. Make sure you are running on macOS.");
}

// ─── 3. Pre-flight: GitHub CLI auth ──────────────────────────────────────────

console.log("🔍  Checking GitHub CLI authentication…");
try {
  runGh(["auth", "status"]);
  console.log("✅  GitHub CLI authenticated.");
} catch {
  fail(
    "GitHub CLI is not authenticated.\n" +
      "Run `gh auth login` or export GH_TOKEN before publishing."
  );
}

// ─── 4. Collect artifacts ────────────────────────────────────────────────────

console.log(`\n📦  Collecting macOS artifacts for ${tag}…`);

const base = `Figma-Shopify-AutoBuild-${version}`;

// electron-builder produces DMG + ZIP for each arch, plus blockmaps and latest-mac.yml
const candidateFiles = [
  // DMGs
  `${base}-x64.dmg`,
  `${base}-arm64.dmg`,
  // ZIPs (for auto-updater)
  `${base}-mac.zip`,          // fallback single-arch name
  `${base}-x64-mac.zip`,
  `${base}-arm64-mac.zip`,
  // blockmaps
  `${base}-x64.dmg.blockmap`,
  `${base}-arm64.dmg.blockmap`,
  `${base}-mac.zip.blockmap`,
  `${base}-x64-mac.zip.blockmap`,
  `${base}-arm64-mac.zip.blockmap`,
  // auto-updater manifest
  "latest-mac.yml",
];

const assets = candidateFiles
  .map((f) => path.join(distDir, f))
  .filter((f) => fs.existsSync(f));

if (assets.length === 0) {
  fail(
    `No macOS release artifacts found in ${distDir}.\n` +
      "Run `npm run dist:mac` first."
  );
}

console.log(`✅  Found ${assets.length} artifact(s):`);
assets.forEach((a) => console.log(`    • ${path.basename(a)}`));

// ─── 5. Create or reuse the GitHub release ───────────────────────────────────

console.log(`\n🚀  Preparing GitHub release ${tag}…`);

let releaseExists = true;
try {
  runGh(["release", "view", tag, "--repo", repo]);
} catch {
  releaseExists = false;
}

if (!releaseExists) {
  const notes = [
    `## macOS Release ${tag}`,
    "",
    "This build is **code-signed** with a Developer ID Application certificate and **notarized by Apple** — no Gatekeeper warnings.",
    "",
    "### Installation",
    "1. Download the `.dmg` for your Mac's architecture:",
    "   - **Apple Silicon (M1/M2/M3)** → `*-arm64.dmg`",
    "   - **Intel** → `*-x64.dmg`",
    "2. Open the DMG, drag **Figma Shopify AutoBuild** to `/Applications`.",
    "3. Launch from Launchpad or Spotlight.",
  ].join("\n");

  runGh(["release", "create", tag, "--repo", repo, "--title", tag, "--notes", notes]);
  console.log(`✅  Created release ${tag}.`);
} else {
  console.log(`✅  Release ${tag} already exists — uploading assets.`);
}

// ─── 6. Upload ───────────────────────────────────────────────────────────────

console.log("\n⬆️   Uploading assets…");
runGh(["release", "upload", tag, "--repo", repo, "--clobber", ...assets]);
console.log(`\n✅  Uploaded ${assets.length} asset(s) to ${repo} @ ${tag}.`);
