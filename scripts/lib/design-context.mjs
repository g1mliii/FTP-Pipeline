import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..", "..");

export const resolveDesignSlug = (value) => value || process.env.DESIGN_SLUG || "";

export const getDesignContext = (value) => {
  const designSlug = resolveDesignSlug(value);
  if (!designSlug) {
    throw new Error("DESIGN_SLUG is required. Pass it as an argument or set it in the environment.");
  }
  const designInputDir = path.join(rootDir, "input", "designs", designSlug);
  const normalizedDir = path.join(designInputDir, "normalized");
  const rawFigmaDir = path.join(rootDir, "input", "figma", designSlug);
  const outputDir = path.join(rootDir, "output", designSlug);

  return {
    designSlug,
    designInputDir,
    normalizedDir,
    rawFigmaDir,
    outputDir,
    themeDir: path.join(outputDir, "theme"),
    previewDir: path.join(outputDir, "preview"),
    playwrightDir: path.join(outputDir, "playwright"),
    files: {
      home: path.join(normalizedDir, "home.json"),
      shell: path.join(normalizedDir, "site-shell.json"),
      routeMap: path.join(normalizedDir, "site-route-map.json")
    }
  };
};
