import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const targetRoot = path.join(desktopRoot, "build", "starter-workspace");

const rootPackage = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const runtimePackage = {
  name: "figma-shopify-flow-runtime",
  private: true,
  type: "module",
  scripts: {
    "fetch:figma": "node scripts/fetch-figma-file.mjs",
    generate: "node scripts/generate-shopify-site.mjs",
    "build:preview": "node scripts/build-site-preview.mjs",
    preview: "node scripts/serve-preview.mjs",
    "validate:shopify": "node scripts/validate-shopify.mjs",
    "push:preview": "node scripts/push-preview-theme.mjs",
    "test:shopify-preview": "node scripts/test-shopify-preview.mjs",
    "test:preview:home": "node scripts/test-home-preview.mjs",
    "test:preview": "node scripts/test-site-preview.mjs",
    flow: "npm run generate && npm run build:preview && npm run test:preview:home && npm run test:preview"
  },
  dependencies: {
    playwright: rootPackage.dependencies.playwright
  }
};

const manifest = {
  version: rootPackage.version,
  generatedAt: new Date().toISOString()
};

const copyEntry = async (relativePath) => {
  await cp(path.join(repoRoot, relativePath), path.join(targetRoot, relativePath), {
    recursive: true,
    force: true
  });
};

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

for (const relativePath of ["AGENTS.md", "README.md", "figma-to-shopify-pipeline.skill", "scripts", "input/designs", "skills"]) {
  await copyEntry(relativePath);
}

await writeFile(path.join(targetRoot, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`, "utf8");
await writeFile(path.join(targetRoot, "starter-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Prepared starter workspace at ${targetRoot}.`);
