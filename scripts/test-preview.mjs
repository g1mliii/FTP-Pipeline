import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const previewPort = 4173;
const previewUrl = `http://127.0.0.1:${previewPort}`;
const screenshotDir = path.join(rootDir, "output", "playwright");
const specPath = path.join(rootDir, "input", "normalized", "jewelry-home.json");
const spec = JSON.parse(await readFile(specPath, "utf8"));
const hero = spec.sections.find((section) => section.type === "hero_stack");

await mkdir(screenshotDir, { recursive: true });

const server = spawn(process.execPath, ["scripts/serve-preview.mjs"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PREVIEW_PORT: String(previewPort)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const waitForServer = async () => {
  const started = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for the preview server."));
    }, 10000);

    server.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.includes("Preview server running")) {
        clearTimeout(timer);
        resolve(true);
      }
    });

    server.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.trim()) {
        clearTimeout(timer);
        reject(new Error(text));
      }
    });

    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview server exited early with code ${code}.`));
    });
  });

  return started;
};

try {
  await waitForServer();

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1200
    }
  });

  await page.goto(previewUrl, { waitUntil: "networkidle" });

  await page.locator(".jewelry-hero__title").first().waitFor();
  await page.locator(".jewelry-hero__link").first().waitFor();
  await page.locator(".jewelry-hero__image").first().waitFor();

  const heading = await page.locator(".jewelry-hero__title").first().innerText();
  const panelCount = await page.locator(".jewelry-hero__panel").count();

  if (heading?.trim() !== "START YOUR\nSTACK") {
    throw new Error(`Unexpected heading text: ${heading}`);
  }

  if (panelCount !== hero.blocks.length) {
    throw new Error(`Unexpected panel count: ${panelCount}`);
  }

  await page.screenshot({
    path: path.join(screenshotDir, "jewelry-home-hero.png"),
    fullPage: true
  });

  await browser.close();
  console.log(`Playwright smoke test passed: ${previewUrl}`);
} finally {
  server.kill("SIGTERM");
}
