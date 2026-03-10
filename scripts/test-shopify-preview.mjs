import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { getDesignContext } from "./lib/design-context.mjs";

const designContext = getDesignContext(process.argv[2]);
const screenshotDir = designContext.playwrightDir;
const collectionRoute = JSON.parse(await readFile(designContext.files.routeCollection, "utf8"));
const membershipRoute = JSON.parse(await readFile(designContext.files.routeMembership, "utf8"));
const productRoute = JSON.parse(await readFile(designContext.files.routeProduct, "utf8"));
const duskRoute = JSON.parse(await readFile(designContext.files.routeDuskBox, "utf8"));

const store = process.env.SHOPIFY_STORE;
const previewThemeId = process.env.SHOPIFY_PREVIEW_THEME_ID;
const storefrontPassword = process.env.SHOPIFY_STOREFRONT_PASSWORD;

if (!store) {
  throw new Error("SHOPIFY_STORE is required.");
}

if (!previewThemeId) {
  throw new Error("SHOPIFY_PREVIEW_THEME_ID is required.");
}

await mkdir(screenshotDir, { recursive: true });

const baseOrigin = `https://${store}`;
const routes = [
  { path: "/", screenshot: "shopify-live-home.png" },
  { path: collectionRoute.path, screenshot: "shopify-live-collection.png" },
  { path: membershipRoute.path, screenshot: "shopify-live-membership.png" },
  { path: productRoute.path, screenshot: "shopify-live-product-primary.png" },
  { path: duskRoute.path, screenshot: "shopify-live-product-secondary.png" }
];

const withPreviewId = (routePath) =>
  routePath === "/"
    ? `${baseOrigin}?preview_theme_id=${previewThemeId}`
    : `${baseOrigin}${routePath}?preview_theme_id=${previewThemeId}`;

const maybeUnlockStorefront = async (page) => {
  const passwordField = page.locator("input[name='password']");
  if (!(await passwordField.count())) {
    return;
  }

  if (!storefrontPassword) {
    throw new Error("Storefront is password-protected. Set SHOPIFY_STOREFRONT_PASSWORD to continue.");
  }

  await passwordField.fill(storefrontPassword);
  const submitButton = page.locator("button[type='submit'], input[type='submit']").first();
  await Promise.all([
    page.waitForLoadState("networkidle"),
    submitButton.click()
  ]);
};

const firstText = async (page, selector) => {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) {
    return null;
  }

  return (await locator.innerText()).replace(/\s+/g, " ").trim();
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
const results = [];

try {
  for (const route of routes) {
    const response = await page.goto(withPreviewId(route.path), { waitUntil: "domcontentloaded" });
    await maybeUnlockStorefront(page);
    await page.waitForLoadState("networkidle");

    const status = response?.status() ?? null;
    const title = await page.title();
    const h1 = await firstText(page, "h1");
    const h2 = await firstText(page, "h2");
    const notFound =
      status === 404 ||
      (await page.locator("text=404 Not Found").count()) > 0 ||
      (await page.locator("text=Page not found").count()) > 0;

    await page.screenshot({ path: path.join(screenshotDir, route.screenshot), fullPage: true });

    results.push({
      route: route.path,
      status,
      title,
      h1,
      h2,
      notFound
    });
  }
} finally {
  await browser.close();
}

const brokenRoutes = results.filter((result) => result.notFound);
console.log(JSON.stringify({ store, previewThemeId, results, brokenRoutes }, null, 2));
