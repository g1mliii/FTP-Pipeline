# Project Map

Use this reference when you need to understand how the pipeline workspace is wired.

## Input

- `input/designs/<design-slug>/normalized/home.json`
  - Optional normalized homepage content for the current design.
  - May hold theme tokens and homepage section content when the design includes a homepage.
  - Those theme tokens should carry the Figma visual language forward into the generated Shopify theme, especially colors, fonts, spacing, borders, radii, and overall tone.
- `input/designs/<design-slug>/normalized/site-shell.json`
  - Optional shared shell data for header/footer navigation and other layout-level content.
- `input/designs/<design-slug>/normalized/route-*.json`
  - Optional route-specific normalized files for routed destinations.
  - Name them to match the current design instead of preserving any old demo naming pattern.
- `input/designs/<design-slug>/normalized/site-route-map.json`
  - Explicit route mapping from Figma paths into Shopify-supported paths and template names.
  - `scripts/lib/route-specs.mjs` discovers `route-*.json` files in this folder and joins them to the route map.
- `scripts/fetch-figma-file.mjs`
  - Pulls raw Figma file JSON from the Figma API when `FIGMA_TOKEN` and a file key are available.
  - Saves raw input under `input/figma/<design-slug>/`.
  - For Figma Make files, route/page components should be inspected early so route coverage is planned before generation begins.

## Shared Helpers

- `scripts/lib/design-context.mjs`
  - Resolves per-design input and output paths.
  - Requires an explicit `DESIGN_SLUG`.
- `scripts/lib/route-specs.mjs`
  - Loads `route-*.json` files and joins them to `site-route-map.json`.
  - Useful when a design implementation wants route-aware verification or preview logic.

## Preview

- `scripts/serve-preview.mjs`
  - Serves the local preview at `http://127.0.0.1:4173`.
  - Serves whatever preview files were generated for the active design slug under `output/<design-slug>/preview/`.

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
- The generic `figma` skill can help inspect the source design or derive a regular website-oriented mental model, but the repo-local Shopify workflow remains the source of truth for final implementation.
- UI/design helper skills (from the Impeccable suite: `frontend-design`, `polish`, `adapt`, `harden`, `audit`, `critique`, `normalize`, `colorize`, `bolder`, `quieter`, `animate`, `delight`, `clarify`, `distill`, `extract`, `optimize`) can be used during conversion or cleanup when they improve fidelity, clarity, resilience, accessibility, responsiveness, or polish without breaking Shopify theme constraints. They are most useful after browser-based comparison exposes real drift from the Figma source.
- Playwright is the primary verification loop, not optional QA. Use it twice:
  - first against the local preview when a local preview exists — this is the fastest iteration cycle
  - then against the live Shopify preview to confirm the routed experience and identify any backend-resource gaps
- The repo scripts are generic helpers, not a universal theme generator. If a helper does not match the current design, generate the needed theme files, preview output, or verification steps directly.
