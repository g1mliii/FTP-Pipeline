# Workflow

Use the repo as a reproducible starter for a Figma-to-Shopify-theme pipeline.

Each design must live in its own folder under `input/designs/<design-slug>/normalized/`.
Each build must write to `output/<design-slug>/...`.
Do not reuse one shared `input/normalized/` or one shared `output/theme/` across unrelated Figma projects.

Preferred skill order after restarting Codex:
- `figma`: use when pulling or inspecting a real Figma file through the Figma API.
- `shopify-liquid-themes`: use when generating or editing Shopify Liquid theme files, schema, snippets, templates, and theme structure.
- `playwright`: use when running browser smoke tests or visual checks against the local preview or a Shopify preview URL.
- `figma-to-shopify-theme`: use for the repo-specific orchestration flow documented in `skills/figma-to-shopify-theme/`.

## Desktop Wrapper

This repo also contains a guided desktop setup wrapper under `apps/desktop/`.

Use it when the task is about:
- machine readiness for the pipeline
- Shopify CLI installation or auth
- Playwright installation
- Claude plugin or skill setup
- Codex MCP setup
- saving store domain, Figma URL, or design slug context for repeated runs
- saving `FIGMA_TOKEN` or storefront password in the OS credential vault
- launching the non-interactive Claude build wrapper from the repo workspace
- automatically opening a real Chromium window for the local Playwright preview checks after a successful desktop build
- packaging the wrapper into Windows and macOS installers
- launching the embedded Claude terminal from the repo workspace

The desktop wrapper prepares the environment.
It does not replace the route-aware generation, preview, validation, and Shopify push scripts in the repo root.
When the packaged app is used, it seeds a writable starter workspace into app data on first launch and runs the repo pipeline from there.

## Route Coverage Rule

Do not stop at the homepage when the Figma file includes additional routed pages.

The default expectation for this repo is:
- convert homepage sections
- convert every routed page or routed destination represented in the Figma source
- generate the corresponding Shopify templates and sections in the same pass
- test homepage navigation and destination routes with Playwright
- keep pushing until the full theme-side route map is covered, not just the first visible page

If the Figma route is not directly compatible with Shopify theme routing, map it to a Shopify-supported route and record that mapping explicitly.

Examples:
- Figma `/product/vue-chain-necklace` -> Shopify `/products/vue-chain-necklace`
- Figma `/membership` -> Shopify `/pages/membership`
- Figma `/collection` -> Shopify `/collections/all` or `/collections/<handle>`
- Figma `/box/dusk` -> Shopify `/products/dusk-box` or `/pages/dusk-box`

## Local Starter Flow

Use the split normalized site inputs as the default design source:
- `input/designs/<design-slug>/normalized/home.json` for homepage sections
- `input/designs/<design-slug>/normalized/site-shell.json` for shared header/footer shell
- `input/designs/<design-slug>/normalized/route-collection.json`
- `input/designs/<design-slug>/normalized/route-membership.json`
- `input/designs/<design-slug>/normalized/route-product.json`
- `input/designs/<design-slug>/normalized/route-dusk-box.json`

Together these drive the tested whole-site jewelry flow.

Default tested design slug in this repo:
- `jewelry-brand-website--xqblqd1l`

Run:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
npm install
npx playwright install chromium
npm run flow
```

That flow must:
- generate Shopify-compatible starter files under `output/<design-slug>/theme/`
- build a local preview under `output/<design-slug>/preview/`
- run headed Playwright homepage and route smoke tests and write screenshots under `output/<design-slug>/playwright/`

By default, the local Playwright preview scripts open a visible Chromium window so the preview checks can be watched live.
If you need a headless run for CI or background automation, set:

```powershell
$env:PLAYWRIGHT_HEADLESS="true"
```

The repo should evolve toward a site map, not just a homepage spec. When the Figma source exposes multiple pages, normalize route/page data alongside section data and generate previewable destinations for them. Prefer split normalized files when the route data gets large instead of forcing everything into one JSON file.

## Real Figma Flow

If `FIGMA_TOKEN` and a Figma file key are available:

```powershell
npm run fetch:figma -- <figma-file-key>
```

Save raw Figma API output under `input/figma/<design-slug>/`, then normalize only the relevant frame or component into the compact site shape used by the files under `input/designs/<design-slug>/normalized/` before generating Shopify files.

Do not try to convert arbitrary raw Figma JSON directly into final Shopify Liquid without a normalization step.

If the source is a Figma Make file, prefer Figma MCP `get_design_context` plus `read_mcp_resource` for source files. Do not depend on `get_metadata` or `get_screenshot` for Make files; use screenshots only for optional visual QA.

When the Make source includes routed pages such as `Home.tsx`, `Collection.tsx`, `Membership.tsx`, `Product.tsx`, or box-specific pages, inspect the route map first and treat those destinations as part of the required output.

## Shopify Theme Rules

- Major editable UI modules belong in `sections/`.
- Small reusable partials belong in `snippets/`.
- Page composition belongs in `templates/`.
- Shared CSS/JS files belong in `assets/`.
- Inline CSS/JS inside a `.liquid` file is still part of that section or snippet, not a separate asset.
- Prefer schema settings for merchant-editable text, links, images, and options.
- Use blocks when a merchant needs repeatable items inside a section.
- If a JSON template includes a block-based section, the template must include `blocks` and `block_order`. Section presets alone do not populate the live homepage.
- Standard Shopify routes should use the correct template families:
  - `templates/product*.json`
  - `templates/collection*.json`
  - `templates/page*.json`
- Use alternate templates when a Figma page represents a special product, collection, or page destination.
- A Shopify theme file does not create the underlying product, collection, or page resource. Theme generation and store-content creation are separate tasks.

## Real Shopify Validation

When Shopify CLI is available, run:

```powershell
npm run validate:shopify
```

Recommended environment for repeat runs:

```powershell
$env:DESIGN_SLUG="your-design-slug"
$env:SHOPIFY_STORE="your-store.myshopify.com"
$env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
```

Then validate against a real theme with:
- `shopify theme list --store $env:SHOPIFY_STORE --json` to trigger auth when needed
- `shopify theme check --path output/$env:DESIGN_SLUG/theme`
- `npm run push:preview` to update the same unpublished preview theme each run
- `npm run test:shopify-preview` to crawl the live preview and capture route screenshots
- `shopify theme dev --store $env:SHOPIFY_STORE --path output/$env:DESIGN_SLUG/theme` when hot reload is more useful than pushing
- Playwright against the preview URL, including destination routes

Operational lessons from the tested store flow:
- Avoid `shopify theme push --unpublished` in automation because it may prompt for a theme name.
- Use `shopify theme share` once if a preview theme does not exist yet, then reuse that preview theme ID with `npm run push:preview`.
- If the storefront is password-protected, keep the storefront password available for both Playwright and `shopify theme dev`.
- A storefront `favicon.ico` 404 is non-blocking during preview verification.
- If homepage links are part of the design, consider the work incomplete until those routes either render correctly or are explicitly blocked only by missing Shopify backend content.
- Keep `SHOPIFY_STOREFRONT_PASSWORD` available if the storefront preview requires the password page during automated checks.

## Store Content Seeding

Theme generation is one automation layer. Shopify resource creation is another.

Separate tasks:
- theme generation: sections, templates, snippets, assets
- store content seeding: products, collections, pages, publishing, template assignment

If Admin API access is available, prefer automating store content creation with environment variables rather than hardcoding secrets in repo files.

The target state for this repo is:
- the theme side should be as complete as possible from Figma
- homepage, destination pages, route mappings, templates, and sections should all be generated and tested
- the only remaining gap should be Shopify store resources that must exist in the backend

When the theme side is complete but live routes still depend on missing Shopify backend resources, the final response must explicitly tell the user:
- the exact resource type still needed
- the exact handle that must be created
- the template that should be assigned
- that the resource must be published or available to Online Store if applicable

Do not assume the user will infer this from a 404 result, even if they already know Shopify well.

## Editing Rules

- Keep the normalized Figma spec small and explicit.
- Track normalized design inputs under `input/designs/<design-slug>/normalized/`.
- Prefer one file per major route or shell concern when the normalized input becomes large.
- Generate files first under `output/<design-slug>/theme/` before moving them into a production theme.
- Keep Playwright artifacts under `output/<design-slug>/playwright/`.
- Generated artifacts under `output/` and raw Figma pulls under `input/figma/` must stay ignored by Git.
- Do not add Playwright screenshots, mobile screenshots, preview HTML, or generated theme output to version control.
- Do not hardcode merchant-editable copy if it should live in section schema settings.
- Do not declare the flow complete after only the homepage renders if the Figma includes additional routes.
- When the tested workflow changes, update `README.md`, `AGENTS.md`, and the local skill docs in the same implementation pass.
- When handing off a theme build, include the missing Shopify resource checklist in the closeout whenever any live routes still depend on products, collections, or pages that are not in the store yet.
