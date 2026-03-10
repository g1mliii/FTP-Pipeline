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
const homeSpec = JSON.parse(await readFile(designContext.files.home, "utf8"));
const collectionRoute = JSON.parse(await readFile(designContext.files.routeCollection, "utf8"));
const membershipRoute = JSON.parse(await readFile(designContext.files.routeMembership, "utf8"));
const productRoute = JSON.parse(await readFile(designContext.files.routeProduct, "utf8"));
const duskRoute = JSON.parse(await readFile(designContext.files.routeDuskBox, "utf8"));

await mkdir(screenshotDir, { recursive: true });

const server = spawn(process.execPath, ["scripts/serve-preview.mjs"], {
  cwd: rootDir,
  env: { ...process.env, PREVIEW_PORT: String(previewPort), PREVIEW_ROOT: designContext.previewDir, DESIGN_SLUG: designContext.designSlug },
  stdio: ["ignore", "pipe", "pipe"]
});

const waitForServer = async () =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for preview server.")), 10000);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Preview server running")) {
        clearTimeout(timer);
        resolve(true);
      }
    });
    server.stderr.on("data", (chunk) => {
      clearTimeout(timer);
      reject(new Error(chunk.toString()));
    });
  });

const expectHeading = async (page, selector, expected) => {
  const actual = (await page.locator(selector).first().innerText()).replace(/\s+/g, " ").trim();
  if (actual !== expected) {
    throw new Error(`Unexpected heading for ${selector}: "${actual}"`);
  }
};

const assertInternalLinks = async (page, baseUrl) => {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href^='/']"))
      .map((link) => link.getAttribute("href"))
      .filter(Boolean)
  );

  const unique = [...new Set(hrefs)].filter((href) => !href.startsWith("/pages/membership#"));
  for (const href of unique) {
    const response = await page.request.get(`${baseUrl}${href}`);
    if (!response.ok()) {
      throw new Error(`Broken internal link detected: ${href} -> ${response.status()}`);
    }
  }
};

const visitRoute = async (page, baseUrl, routePath) => {
  if (routePath === "/") {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForHumanPause(page, 500);
    return;
  }

  const routeLink = page.locator(`a[href="${routePath}"]`).first();
  if (await routeLink.count()) {
    await routeLink.scrollIntoViewIfNeeded();
    await waitForHumanPause(page, 400);
    await routeLink.hover();
    await waitForHumanPause(page, 500);
    await Promise.all([
      page.waitForURL((url) => url.pathname === routePath, { timeout: 10_000 }),
      routeLink.click()
    ]);
    await page.waitForLoadState("networkidle");
    await waitForHumanPause(page, 600);
    return;
  }

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle" });
  await waitForHumanPause(page, 500);
};

let browser;

try {
  await waitForServer();
  const launchOptions = getPlaywrightLaunchOptions();
  console.log(
    `Running route-aware Playwright preview for ${designContext.designSlug} (${launchOptions.headless ? "headless" : "headed"}).`
  );
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });

  await visitRoute(page, previewUrl, "/");
  await expectHeading(page, ".site-header-shell__brand", "MAISON VUE");
  await expectHeading(page, ".jewelry-hero__title", homeSpec.sections[0].blocks[0].title.replace(/\n/g, " "));
  await assertInternalLinks(page, previewUrl);
  await page.screenshot({ path: path.join(screenshotDir, "site-home.png"), fullPage: true });

  await page.mouse.wheel(0, 420);
  await waitForHumanPause(page, 400);
  await visitRoute(page, previewUrl, collectionRoute.path);
  await expectHeading(page, ".section-heading", collectionRoute.heading);
  await assertInternalLinks(page, previewUrl);
  await page.screenshot({ path: path.join(screenshotDir, "site-collection.png"), fullPage: true });

  await page.mouse.wheel(0, 420);
  await waitForHumanPause(page, 400);
  await visitRoute(page, previewUrl, productRoute.path);
  await expectHeading(page, ".commerce-heading", productRoute.fallbackTitle);
  await assertInternalLinks(page, previewUrl);
  await page.screenshot({ path: path.join(screenshotDir, "site-product.png"), fullPage: true });

  await page.mouse.wheel(0, 420);
  await waitForHumanPause(page, 400);
  await visitRoute(page, previewUrl, membershipRoute.path);
  await expectHeading(page, ".membership-landing .section-heading", membershipRoute.hero.heading);
  await assertInternalLinks(page, previewUrl);
  await page.screenshot({ path: path.join(screenshotDir, "site-membership.png"), fullPage: true });

  await page.mouse.wheel(0, 420);
  await waitForHumanPause(page, 400);
  await visitRoute(page, previewUrl, duskRoute.path);
  await expectHeading(page, ".commerce-heading", duskRoute.fallbackTitle);
  await assertInternalLinks(page, previewUrl);
  await page.screenshot({ path: path.join(screenshotDir, "site-dusk-box.png"), fullPage: true });

  await waitForClosingBeat(page);
  await browser.close();
  console.log(`Site preview test passed for ${designContext.designSlug}: ${previewUrl}`);
} finally {
  await browser?.close().catch(() => undefined);
  server.kill("SIGTERM");
}
