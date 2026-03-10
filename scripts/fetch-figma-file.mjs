import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDesignContext } from "./lib/design-context.mjs";

const fileKey = process.argv[2] || process.env.FIGMA_FILE_KEY;
const designContext = getDesignContext(process.argv[3]);
const figmaToken = process.env.FIGMA_TOKEN;

if (!fileKey) {
  console.error("Usage: npm run fetch:figma -- <figma-file-key>");
  console.error("Or set FIGMA_FILE_KEY in the environment.");
  process.exit(1);
}

if (!figmaToken) {
  console.error("FIGMA_TOKEN is required to fetch a real Figma file.");
  process.exit(1);
}

const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
  headers: {
    "X-Figma-Token": figmaToken
  }
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Figma API request failed (${response.status}): ${body}`);
}

const outputDir = designContext.rawFigmaDir;
await mkdir(outputDir, { recursive: true });

const outputPath = path.join(outputDir, `${fileKey}.json`);
const data = await response.json();

await writeFile(outputPath, JSON.stringify(data, null, 2), "utf8");

console.log(`Saved raw Figma file JSON to ${path.relative(process.cwd(), outputPath)}`);
