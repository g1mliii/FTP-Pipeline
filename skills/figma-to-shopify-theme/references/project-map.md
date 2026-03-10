# Project Map

Use this reference when you need to understand how the starter flow is wired.

## Input

- `input/designs/<design-slug>/normalized/home.json`
  - Normalized homepage content derived from the tested design flow.
  - Holds theme tokens plus section content for hero, trending, press, process, and collections.
- `input/designs/<design-slug>/normalized/site-shell.json`
  - Shared shell data for header and footer navigation.
- `input/designs/<design-slug>/normalized/route-collection.json`
  - Route-specific collection page content and mapped collection destination.
- `input/designs/<design-slug>/normalized/route-membership.json`
  - Route-specific membership page content mapped into a Shopify page route.
- `input/designs/<design-slug>/normalized/route-product.json`
  - Route-specific editorial product page content mapped into a Shopify product route.
- `input/designs/<design-slug>/normalized/route-dusk-box.json`
  - Route-specific box product page content mapped into a Shopify product route.
- `input/designs/<design-slug>/normalized/site-route-map.json`
  - Explicit route mapping from Figma paths into Shopify-supported paths and template names.
- `scripts/fetch-figma-file.mjs`
  - Pulls raw Figma file JSON from the Figma API when `FIGMA_TOKEN` and a file key are available.
  - Saves raw input under `input/figma/<design-slug>/`.
  - For Figma Make files, route/page components should be inspected early so route coverage is planned before generation begins.

## Generation

- `scripts/generate-shopify-home.mjs`
  - Generates the homepage section set used by the whole-site flow.
- `scripts/generate-shopify-site.mjs`
  - Reads the normalized homepage, shell, and route JSON files.
  - Writes Shopify theme files to `output/<design-slug>/theme/`.
  - Builds homepage sections plus route-specific templates, sections, snippets, assets, and image downloads.
  - Current supported section types: `hero_stack`, `trending_grid`, `press_strip`, `process_steps`, and `collection_grid`.
  - Also writes dedicated route templates for product, collection, and page destinations.

## Preview

- `scripts/build-site-preview.mjs`
  - Builds a local HTML preview for the homepage plus routed destinations from the same normalized inputs.
- `scripts/serve-preview.mjs`
  - Serves the local preview at `http://127.0.0.1:4173`.
  - Serves the route paths defined by the normalized route files for the active design slug.

## Browser Validation

- `scripts/test-site-preview.mjs`
  - Starts the preview server.
  - Opens Chromium with Playwright.
  - Clicks through homepage navigation and validates the destination routes.
  - Saves screenshots for the homepage plus each routed destination under `output/<design-slug>/playwright/`.

## Output

- `output/<design-slug>/theme/sections/*.liquid`
- `output/<design-slug>/theme/snippets/*.liquid`
- `output/<design-slug>/theme/templates/*.json`
- `output/<design-slug>/theme/assets/*.css`
- `output/<design-slug>/preview/...`
- `output/<design-slug>/playwright/*.png`

## Shopify Validation

- `scripts/validate-shopify.mjs`
  - Checks whether Shopify CLI is available locally.
  - Prints the recommended auth and validation sequence.
- `scripts/push-preview-theme.mjs`
  - Pushes `output/<design-slug>/theme/` into the configured unpublished preview theme.
  - Reads `DESIGN_SLUG`, `SHOPIFY_STORE`, and `SHOPIFY_PREVIEW_THEME_ID`.
- `scripts/test-shopify-preview.mjs`
  - Opens the live Shopify preview theme with Playwright.
  - Captures screenshots for the homepage plus each routed destination.
  - Reports which routes render and which ones still fail because the underlying Shopify resource does not exist.

## Route Strategy

- Homepage generation is not the finish line if the Figma source includes routed pages.
- Route designs from Figma should map into Shopify-supported route families:
  - product routes
  - collection routes
  - page routes
- Theme generation creates templates and sections.
- Shopify content seeding creates the underlying products, collections, pages, and template assignments.
- Playwright should be used twice:
  - first against the local preview to validate route wiring before Shopify upload
  - then against the live Shopify preview to confirm the routed experience and identify any backend-resource gaps
