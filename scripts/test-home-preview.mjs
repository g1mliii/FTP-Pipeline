import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const previewPort = 4173;
const previewUrl = `http://127.0.0.1:${previewPort}`;
const screenshotDir = path.join(rootDir, "output", "playwright");
const specPath = path.join(rootDir, "input", "normalized", "jewelry-home.json");
const spec = JSON.parse(await readFile(specPath, "utf8"));

const hero = spec.sections.find((section) => section.type === "hero_stack");
const trending = spec.sections.find((section) => section.type === "trending_grid");
const processSection = spec.sections.find((section) => section.type === "process_steps");
const collections = spec.sections.find((section) => section.type === "collection_grid");

await mkdir(screenshotDir, { recursive: true });

const server = spawn(process.execPath, ["scripts/serve-preview.mjs"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PREVIEW_PORT: String(previewPort)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const waitForServer = async () =>
  new Promise((resolve, reject) => {
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
      const text = chunk.toString().trim();
      if (text) {
        clearTimeout(timer);
        reject(new Error(text));
      }
    });

    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview server exited early with code ${code}.`));
    });
  });

const expectCount = async (page, selector, expected, label) => {
  const actual = await page.locator(selector).count();
  if (actual !== expected) {
    throw new Error(`Unexpected ${label} count: ${actual} (expected ${expected})`);
  }
};

try {
  await waitForServer();

  const browser = await chromium.launch();
  const desktopPage = await browser.newPage({
    viewport: {
      width: 1440,
      height: 2200
    }
  });

  await desktopPage.goto(previewUrl, { waitUntil: "networkidle" });

  await desktopPage.locator(".jewelry-hero__title").first().waitFor();
  await desktopPage.locator(".jewelry-trending__grid").waitFor();
  await desktopPage.locator(".jewelry-process__steps").waitFor();
  await desktopPage.locator(".jewelry-collections__grid").waitFor();

  const heroHeading = (await desktopPage.locator(".jewelry-hero__title").first().innerText()).replace(/\s+/g, " ").trim();
  const trendingHeading = (await desktopPage.locator(".jewelry-trending .section-heading").innerText()).replace(/\s+/g, " ").trim();
  const processHeading = (await desktopPage.locator(".jewelry-process .section-heading").innerText()).replace(/\s+/g, " ").trim();
  const collectionHeading = (await desktopPage.locator(".jewelry-collections .section-heading").innerText()).replace(/\s+/g, " ").trim();

  if (heroHeading !== "START YOUR STACK") {
    throw new Error(`Unexpected hero heading: ${heroHeading}`);
  }

  if (trendingHeading !== "Personalised Keepsakes") {
    throw new Error(`Unexpected trending heading: ${trendingHeading}`);
  }

  if (processHeading !== "How It Works") {
    throw new Error(`Unexpected process heading: ${processHeading}`);
  }

  if (collectionHeading !== "Browse by Collection") {
    throw new Error(`Unexpected collection heading: ${collectionHeading}`);
  }

  await expectCount(desktopPage, ".jewelry-hero__panel", hero.blocks.length, "hero panel");
  await expectCount(desktopPage, ".jewelry-product-card", trending.blocks.length, "trending card");
  await expectCount(desktopPage, ".jewelry-process__card", processSection.blocks.length, "process card");
  await expectCount(desktopPage, ".jewelry-collection-card", collections.blocks.length, "collection card");

  await desktopPage.screenshot({
    path: path.join(screenshotDir, "jewelry-home-desktop.png"),
    fullPage: true
  });

  const mobilePage = await browser.newPage({
    viewport: {
      width: 390,
      height: 1400
    }
  });

  await mobilePage.goto(previewUrl, { waitUntil: "networkidle" });
  await mobilePage.locator(".jewelry-hero__title").first().waitFor();

  await mobilePage.screenshot({
    path: path.join(screenshotDir, "jewelry-home-mobile.png"),
    fullPage: true
  });

  await browser.close();
  console.log(`Playwright smoke test passed: ${previewUrl}`);
} finally {
  server.kill("SIGTERM");
}
