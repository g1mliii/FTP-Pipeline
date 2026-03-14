import path from "node:path";
import { createRequire } from "node:module";
import { cpSync, existsSync, readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { app } = require("electron");


const looksLikeWorkspaceRoot = (candidate: string) =>
  existsSync(path.join(candidate, "package.json")) &&
  existsSync(path.join(candidate, "scripts", "fetch-figma-file.mjs")) &&
  existsSync(path.join(candidate, "scripts", "push-preview-theme.mjs"));

const readStarterManifestVersion = (candidate: string) => {
  try {
    const raw = readFileSync(path.join(candidate, "starter-manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "";
  } catch {
    return "";
  }
};

const copyStarterWorkspace = (source: string, target: string) => {
  cpSync(source, target, { recursive: true, force: true });
};

const findBundledWorkspaceSource = () => {
  const candidates = [
    path.join(process.resourcesPath, "starter-workspace"),
    path.resolve(import.meta.dirname, "..", "..", "..", "build", "starter-workspace")
  ];

  return candidates.find(looksLikeWorkspaceRoot);
};

export const findWorkspaceRoot = () => {
  if (app.isPackaged) {
    const bundledSource = findBundledWorkspaceSource();
    if (bundledSource) {
      const target = path.join(app.getPath("userData"), "workspace");
      if (
        !looksLikeWorkspaceRoot(target) ||
        readStarterManifestVersion(target) !== readStarterManifestVersion(bundledSource)
      ) {
        copyStarterWorkspace(bundledSource, target);
      }

      if (looksLikeWorkspaceRoot(target)) {
        return target;
      }
    }
  }

  const candidates = [process.cwd(), app.getAppPath(), path.resolve(import.meta.dirname, "..", "..", "..", "..")];

  for (const candidate of candidates) {
    let current = candidate;
    for (let i = 0; i < 6; i += 1) {
      if (looksLikeWorkspaceRoot(current)) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  throw new Error("Unable to locate the repo workspace root.");
};

export const getUserPaths = () => {
  const home = app.getPath("home");
  return {
    home,
    claudeRoot: path.join(home, ".claude"),
    claudeSettings: path.join(home, ".claude", "settings.json"),
    claudeJson: path.join(home, ".claude.json"),
    claudeSkills: path.join(home, ".claude", "skills"),
    codexRoot: path.join(home, ".codex"),
    codexConfig: path.join(home, ".codex", "config.toml"),
    appDataRoot: app.getPath("userData")
  };
};
