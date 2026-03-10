---
name: figma-to-shopify-theme
description: Generate Shopify theme sections, snippets, templates, and local previews from a Figma-derived section spec while keeping merchant-editable content in Shopify schema settings. Use when converting a Figma layout into Shopify Liquid, scaffolding a normalized design before the full Figma mapping is finalized, validating section output against Shopify theme structure, or smoke-testing the rendered result with Playwright.
---

# Figma To Shopify Theme

## Overview

Turn a normalized design spec into Shopify-compatible theme files first, then validate the result with a local preview and Playwright. Prefer this skill when the design source is Figma or a normalized Figma JSON stand-in and the output must remain editable in the Shopify theme editor.

Default expectation: convert the whole routed experience exposed by the design, not just the homepage.

## Workflow

1. Inspect the route map in the Figma source first.
2. Normalize the design into a compact site spec that includes homepage sections and routed destinations.
3. Map design content to Shopify editor settings, blocks, and template families.
4. Generate supported theme files under `sections/`, `snippets/`, `templates/`, and `assets/`.
5. Build local previews for the homepage and routed destinations so layouts can be tested before a real Shopify store is connected.
6. Run Playwright smoke tests against homepage navigation and destination routes.
7. If Shopify CLI and a store are available, move from the local preview to `shopify theme dev` or a preview theme and test the Shopify-rendered routes.
8. Keep the docs and repo rules in sync with the tested workflow so future runs do not regress into homepage-only automation.

## Local Starter In This Repo

Use the starter project in this repository as the baseline implementation:

- Default design slug: `jewelry-brand-website--xqblqd1l`
- Normalized homepage input: `input/designs/<design-slug>/normalized/home.json`
- Normalized shell input: `input/designs/<design-slug>/normalized/site-shell.json`
- Normalized route inputs:
  - `input/designs/<design-slug>/normalized/route-collection.json`
  - `input/designs/<design-slug>/normalized/route-membership.json`
  - `input/designs/<design-slug>/normalized/route-product.json`
  - `input/designs/<design-slug>/normalized/route-dusk-box.json`
- Real Figma fetch: `scripts/fetch-figma-file.mjs`
- Whole-site generator: `scripts/generate-shopify-site.mjs`
- Base homepage generator: `scripts/generate-shopify-home.mjs`
- Whole-site preview builder: `scripts/build-site-preview.mjs`
- Preview server: `scripts/serve-preview.mjs`
- Shopify CLI check: `scripts/validate-shopify.mjs`
- Preview theme push: `scripts/push-preview-theme.mjs`
- Live Shopify preview crawl: `scripts/test-shopify-preview.mjs`
- Browser route smoke test: `scripts/test-site-preview.mjs`
- Generated theme output: `output/<design-slug>/theme/`
- Preview artifacts: `output/<design-slug>/preview/` and `output/<design-slug>/playwright/`

Generated artifacts are outputs, not source. Keep `output/` and raw Figma pulls under `input/figma/` out of version control.

Run the full local loop with:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
npm install
npx playwright install chromium
npm run flow
```

If a real Figma file is available, fetch it first with:

```powershell
npm run fetch:figma -- <figma-file-key>
```

The raw file should land under `input/figma/<design-slug>/`.
The normalized tracked design source should live under `input/designs/<design-slug>/normalized/`.

For repeat Shopify pushes, set:

```powershell
$env:SHOPIFY_STORE="your-store.myshopify.com"
$env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
```

Then run:

```powershell
npm run push:preview
npm run test:shopify-preview
```

Do not treat the starter as homepage-only. If the Figma source includes route files or page components, extend the normalized spec and generator to cover them. Prefer split normalized files per route or shared shell concern once the site map grows beyond a small single-page starter.

## Mapping Rules

Treat Figma as visual intent, not as directly shippable Shopify code. Convert each design element into Shopify primitives:

- Headings, labels, short text: `text` settings
- Rich copy: `richtext`
- Links: `url`
- Images the merchant should replace: `image_picker`
- Repeated cards or testimonials: section `blocks`
- Shared controls: `snippets`
- Page assembly: JSON templates when the page needs a repeatable section order

For block-based homepage sections, write `blocks` and `block_order` into the JSON template. Do not rely on section presets to populate the live homepage.

Treat routes separately from store content:
- Theme routes: template families and page layouts we generate
- Store content: products, collections, pages, and template assignment created in Shopify

Map unsupported Figma routes into Shopify-supported route families. Common mappings:
- Figma product route -> Shopify `templates/product*.json`
- Figma collection route -> Shopify `templates/collection*.json`
- Figma editorial page -> Shopify `templates/page*.json`
- Custom box or campaign route -> alternate product or page template with a mapped handle

If the Figma file includes dedicated page components such as `Collection.tsx`, `Membership.tsx`, `Product.tsx`, or box-specific pages, generate those routes in the same implementation pass.

Do not attempt generic one-click Figma-to-Shopify conversion for arbitrary designs. Normalize the design first, then generate only the patterns that the current mapper supports.

If the source is a Figma Make file, prefer MCP source extraction over screenshot extraction. `get_design_context` plus `read_mcp_resource` is the reliable path; screenshots are optional QA artifacts, not the primary source.

## Extending The Starter

When adding another section type:

1. Extend the normalized Figma JSON with a new section entry, or add a route-specific normalized file when the change belongs to a destination page.
2. Add a generator branch that writes valid Liquid and schema for that type.
3. Add preview HTML for the same section.
4. Add Playwright assertions for the new section.
5. Keep Shopify-specific Liquid limited to supported theme constructs.

When adding another routed page:

1. Add the route to the normalized site spec or create a dedicated `input/designs/<design-slug>/normalized/route-*.json` file.
2. Decide the Shopify route family and template suffix.
3. Generate the required `templates/*.json` file plus supporting sections.
4. Update local route previews and Playwright route checks.
5. If store content is missing, note that the theme side is complete but backend resource creation is still required.

## Real Shopify Validation

The local preview proves the generator and the rendered layout. It does not replace a real Shopify preview. When a store is available:

1. Install Shopify CLI.
2. Authenticate with `shopify theme list --store <store> --json` if needed.
3. Run `npm run validate:shopify`.
4. Run `shopify theme check --path output/<design-slug>/theme`.
5. Reuse an unpublished preview theme with `npm run push:preview`, or use `shopify theme dev --store <store> --path output/<design-slug>/theme` for hot reload.
6. If the storefront is password-protected, keep the storefront password ready for Playwright and theme dev.
7. Run `npm run test:shopify-preview` or point Playwright at the theme preview URL and repeat the smoke tests for homepage and route destinations.

If the design includes product, collection, or page destinations, do not stop at the homepage. Verify the destination routes or explicitly report which ones are blocked by missing Shopify backend content.

When missing backend content is the only remaining blocker, the final response must include a clear Shopify resource checklist:
- resource type
- exact handle
- template to assign
- publish or Online Store availability requirement

Do not leave this implied.

## Lessons From The Tested Flow

- Reuse a stable preview theme ID for automation. Updating the same unpublished theme is more reliable than creating a new preview on each run.
- `shopify theme push --unpublished` is a poor automation target because it may prompt for a name.
- A missing storefront favicon is non-blocking noise during verification.
- Keep local preview assertions aligned with actual section selectors, not brittle raw-text matching across `<br>` breaks.
- Theme templates and Shopify resources are separate automation layers. Generate the route templates now; seed products, collections, pages, and publishing with Admin API access later.
- The Figma Make route map should be inspected early so dedicated pages are not accidentally deferred behind the homepage.
- Generated Playwright screenshots, preview HTML, and generated theme output should be gitignored so they do not pollute the repo.
- When the tested flow changes, update `AGENTS.md`, `README.md`, and the local skill references in the same pass.
- A strong closeout always names the remaining Shopify resources explicitly instead of only saying "backend content is missing."

## Resources (optional)

Open only what is needed:

### scripts/
- `scripts/run-local-flow.ps1`: wrapper for the repo starter flow

### references/
- `references/project-map.md`: file layout and execution flow
- `references/shopify-mapping.md`: Figma-to-Shopify conversion rules
