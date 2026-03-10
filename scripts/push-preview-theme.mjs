import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { getDesignContext } from "./lib/design-context.mjs";

const firstArg = process.argv[2];
const secondArg = process.argv[3];
const thirdArg = process.argv[4];
const looksLikeStore = (value) => Boolean(value) && value.includes(".myshopify.com");

const designContext = getDesignContext(looksLikeStore(firstArg) ? undefined : firstArg);
const themePath = designContext.themeDir;

const store = (looksLikeStore(firstArg) ? firstArg : secondArg) || process.env.SHOPIFY_STORE;
const themeId = (looksLikeStore(firstArg) ? secondArg : thirdArg) || process.env.SHOPIFY_PREVIEW_THEME_ID;
const shopifyPs1 = path.join(process.env.APPDATA || "", "npm", "shopify.ps1");
const shopifyCommand =
  process.platform === "win32" && existsSync(shopifyPs1) ? "powershell.exe" : "shopify";

if (!store) {
  console.error("SHOPIFY_STORE is required. Example: vfnrmy-kz.myshopify.com");
  process.exit(1);
}

if (!themeId) {
  console.error("SHOPIFY_PREVIEW_THEME_ID is required.");
  console.error("Create or choose an unpublished preview theme once, then reuse that theme ID.");
  process.exit(1);
}

const versionCheck = spawnSync(
  shopifyCommand,
  process.platform === "win32" && existsSync(shopifyPs1)
    ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", shopifyPs1, "version"]
    : ["version"],
  {
  encoding: "utf8"
}
);

if (versionCheck.status !== 0) {
  console.error("Shopify CLI is not installed or not on PATH.");
  process.exit(1);
}

const push = spawnSync(
  shopifyCommand,
  process.platform === "win32" && existsSync(shopifyPs1)
    ? [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        shopifyPs1,
        "theme",
        "push",
        "--theme",
        String(themeId),
        "--json",
        "--strict",
        "--store",
        store,
        "--path",
        themePath
      ]
    : [
        "theme",
        "push",
        "--theme",
        String(themeId),
        "--json",
        "--strict",
        "--store",
        store,
        "--path",
        themePath
      ],
  {
    stdio: "inherit"
  }
);

process.exit(push.status ?? 1);
