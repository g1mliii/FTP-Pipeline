import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { getDesignContext } from "./lib/design-context.mjs";

const designContext = getDesignContext(process.argv[2]);

const shopifyArgs =
  process.platform === "win32"
    ? [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(process.env.APPDATA || "", "npm", "shopify.ps1"),
        "version"
      ]
    : ["version"];

const versionCheck = spawnSync(
  process.platform === "win32" && existsSync(path.join(process.env.APPDATA || "", "npm", "shopify.ps1"))
    ? "powershell.exe"
    : "shopify",
  shopifyArgs,
  {
  encoding: "utf8"
}
);

if (versionCheck.status !== 0) {
  console.error("Shopify CLI is not installed or not on PATH.");
  console.error("Install it before running real Shopify validation.");
  process.exit(1);
}

console.log(versionCheck.stdout.trim());
console.log("Shopify CLI is available. Next real-world validation steps:");
console.log("1. Authenticate if needed: shopify theme list --store <store> --json");
console.log(`2. Run: shopify theme check --path ${designContext.themeDir}`);
console.log("3. For a stable unpublished preview theme, set SHOPIFY_STORE and SHOPIFY_PREVIEW_THEME_ID then run: npm run push:preview");
console.log(`4. For hot reload instead, run: shopify theme dev --store <store> --path ${designContext.themeDir}`);
console.log("5. If the storefront is password-protected, keep the storefront password ready for Playwright and theme dev.");
