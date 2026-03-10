import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";
import { getDesignContext, rootDir } from "./lib/design-context.mjs";
import { getPlaywrightLaunchOptions, waitForClosingBeat, waitForHumanPause } from "./lib/playwright-visual-mode.mjs";
import { resolvePreviewPort } from "./lib/preview-port.mjs";

const designContext = getDesignContext(process.argv[2]);
const previewPort = await resolvePreviewPort(4173);
const previewUrl = `http://127.0.0.1:${previewPort}`;
const screenshotDir = designContext.playwrightDir;
const spec = JSON.parse(await readFile(designContext.files.home, "utf8"));

const requireSection = (type) => {
  const section = spec.sections.find((candidate) => candidate.type === type);
  if (!section) {
    throw new Error(`Expected ${type} in ${designContext.files.home}.`);
  }

  return section;
};

const hero = requireSection("hero_stack");
const trending = requireSection("trending_grid");
const processSection = requireSection("process_steps");
const collections = requireSection("collection_grid");

await mkdir(screenshotDir, { recursive: true });

const server = spawn(process.execPath, ["scripts/serve-preview.mjs"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PREVIEW_PORT: String(previewPort),
    PREVIEW_ROOT: designContext.previewDir,
    DESIGN_SLUG: designContext.designSlug
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

const clickInternalLinkIfPresent = async (page, locator) => {
  const href = await locator.getAttribute("href");
  if (!href?.startsWith("/")) {
    return;
  }

  const target = new URL(href, previewUrl);
  await locator.scrollIntoViewIfNeeded();
  await waitForHumanPause(page, 400);
  await locator.hover();
  await waitForHumanPause(page, 500);
  await Promise.all([
    page.waitForURL((url) => url.pathname === target.pathname, { timeout: 10000 }),
    locator.click()
  ]);
  await page.waitForLoadState("networkidle");
  await waitForHumanPause(page, 600);
  await page.goBack({ waitUntil: "networkidle" });
  await waitForHumanPause(page, 500);
};

let browser;

try {
  await waitForServer();

  const launchOptions = getPlaywrightLaunchOptions();
  console.log(
    `Running visible Playwright home preview for ${designContext.designSlug} (${launchOptions.headless ? "headless" : "headed"}).`
  );
  browser = await chromium.launch(launchOptions);
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

  await waitForHumanPause(desktopPage, 500);
  await clickInternalLinkIfPresent(desktopPage, desktopPage.locator(".jewelry-hero__link").first());
  await desktopPage.locator(".jewelry-trending__grid").scrollIntoViewIfNeeded();
  await waitForHumanPause(desktopPage, 400);
  await desktopPage.mouse.wheel(0, 420);
  await waitForHumanPause(desktopPage, 400);
  await desktopPage.locator(".jewelry-process__steps").scrollIntoViewIfNeeded();
  await waitForHumanPause(desktopPage, 400);
  await desktopPage.mouse.wheel(0, 420);
  await waitForHumanPause(desktopPage, 400);
  await desktopPage.locator(".jewelry-collections__grid").scrollIntoViewIfNeeded();
  await waitForHumanPause(desktopPage, 400);

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
  await waitForHumanPause(mobilePage, 500);
  await mobilePage.mouse.wheel(0, 320);
  await waitForHumanPause(mobilePage, 500);

  await mobilePage.screenshot({
    path: path.join(screenshotDir, "jewelry-home-mobile.png"),
    fullPage: true
  });

  await waitForClosingBeat(mobilePage);
  await browser.close();
  console.log(`Playwright smoke test passed: ${previewUrl}`);
} finally {
  await browser?.close().catch(() => undefined);
  server.kill("SIGTERM");
}
