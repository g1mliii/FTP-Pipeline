# Workflow

Use the repo as a reproducible workspace for a Figma-to-Shopify pipeline.

Primary goal:
- take a Figma design file that is assumed to be visually correct
- convert it into fully functional Shopify theme code as accurately as possible
- every generated Liquid component must be production-grade, not a placeholder, mock, or preview-only stand-in
- preserve the design language unless Shopify creates a real implementation constraint
- avoid unnecessary visual drift, generic restyling, or homepage-only shortcuts
- this pipeline is design-agnostic with no fixed starter templates or hardcoded section types

Each design must live in its own folder under `input/designs/<design-slug>/normalized/`.
Each build must write to `output/<design-slug>/...`.
Do not reuse one shared `input/normalized/` or one shared `output/theme/` across unrelated Figma projects.

Preferred skill order after restarting Codex:
- `figma`: use when pulling or inspecting a real Figma file through the Figma API. It can also help inspect a Figma design as a regular website-oriented reference, but do not let it bypass the repo normalization step or the Shopify mapping rules.
- `shopify-liquid-themes`: use when generating or editing Shopify Liquid theme files, schema, snippets, templates, and theme structure.
- `frontend-design`, `normalize`, `polish`, `clarify`, `harden`, `adapt`, `animate`, `audit`, `critique`, `bolder`, `quieter`, `colorize`, `delight`, `distill`, `extract`, and `optimize`: use as needed when the generated UI needs design interpretation, cleanup, responsiveness, motion, accessibility, resilience, or a stronger visual pass during conversion and follow-up fixes.
- `playwright`: use by default when a local preview or Shopify preview exists so the implemented output can be checked in a real browser against the Figma source.
- `figma-to-shopify-pipeline`: use for the repo-specific orchestration flow documented in `skills/figma-to-shopify-pipeline/`.

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
- packaging the wrapper into Windows and macOS installers
- launching the embedded Claude terminal from the repo workspace

The desktop wrapper prepares the environment.
It does not replace the route-aware generation, preview, validation, and Shopify push scripts in the repo root.
When the packaged app is used, it seeds a writable workspace into app data on first launch and runs the repo pipeline from there.

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
- Figma `/product/featured-item` -> Shopify `/products/featured-item`
- Figma `/about` -> Shopify `/pages/about`
- Figma `/collection/summer` -> Shopify `/collections/summer`
- Figma `/campaign/holiday` -> Shopify `/pages/holiday` or an alternate product/collection template when that is the better match

## Local Pipeline Flow

Use split normalized inputs as needed for the current design source:
- `input/designs/<design-slug>/normalized/home.json` for homepage sections when a homepage exists
- `input/designs/<design-slug>/normalized/site-shell.json` for shared shell data such as header/footer navigation, footer groups, and social links
- `input/designs/<design-slug>/normalized/route-*.json` for routed destinations
- `input/designs/<design-slug>/normalized/site-route-map.json` for explicit Figma-to-Shopify route mapping

There is no required fixed schema beyond keeping normalized inputs explicit and per-design.
If a new design uses different page types, section patterns, route families, or data shapes, create the normalized files and Shopify implementation that fit that design instead of trying to match an older implementation pattern.

The repo scripts are generic helpers, not a universal theme generator. Use them when they fit the current design. If they do not, generate the needed theme files, preview output, or verification steps directly.

Base setup:

```powershell
$env:DESIGN_SLUG="your-design-slug"
npm install
npx playwright install chromium
```

If a local preview is created for the current design, keep it under `output/<design-slug>/preview/` so `npm run preview` can serve it.
Prefer creating a local preview when practical because it gives the fastest loop for visual QA before pushing to Shopify.
Before using repo preview scripts, ensure the shell has the active design context, typically with `$env:DESIGN_SLUG="<design-slug>"` in PowerShell.
Do not wait on an open-ended background preview task. Generate preview output deterministically, confirm `output/<design-slug>/preview/index.html` exists, then serve it and run Playwright.

The repo should evolve toward a site map, not just a homepage spec. When the Figma source exposes multiple pages, normalize route/page data alongside section data and generate previewable destinations for them. Prefer split normalized files when the route data gets large instead of forcing everything into one JSON file.

## Real Figma Flow

If `FIGMA_TOKEN` and a Figma file key are available:

```powershell
npm run fetch:figma -- <figma-file-key>
```

Save raw Figma API output under `input/figma/<design-slug>/`, then normalize only the relevant frame or component into the compact site shape used by the files under `input/designs/<design-slug>/normalized/` before generating Shopify files.

Do not try to convert arbitrary raw Figma JSON directly into final Shopify Liquid without a normalization step.

If the source is a Figma Make file, prefer Figma MCP `get_design_context` plus `read_mcp_resource` for source files. Do not depend on `get_metadata` or `get_screenshot` for Make files; use screenshots only for optional visual QA.
For Make files with code resources, start with the app entry and route-bearing files first, then read only the specific component and style files needed for normalization.
Use the MCP server name exactly as exposed by the environment instead of inventing aliases.
Do not invent storefront copy, testimonials, FAQ answers, prices, navigation targets, policy links, or backend resources that are not present in the source or explicitly provided by the user. Keep missing values explicit in normalization instead of fabricating them.

When the Make source includes routed pages such as `Home.tsx`, `Collection.tsx`, `Membership.tsx`, `Product.tsx`, or box-specific pages, inspect the route map first and treat those destinations as part of the required output.

## Shopify Theme Rules

- Every generated Shopify Liquid component must be production-grade, not a placeholder, mock, or preview-only stand-in:
  - valid Liquid syntax that Shopify can parse and render without errors
  - valid schema with correct setting types, proper `id` and `type` fields, and working defaults
  - correct asset references — CSS in `assets/`, images via `image_picker`, no broken paths
  - working merchant-editable settings that actually render their values in the Liquid output
  - working blocks when repetition is required, with `block_order` in JSON templates
  - behavior that actually renders in Shopify rather than only in the local preview
  - a component that looks right in preview but has dead schema, fake settings, missing blocks, or hardcoded demo content is incomplete
- Treat the Figma file as the visual source of truth. Adapt it to Shopify as faithfully as possible:
  - preserve color palette and theme tone
  - preserve layout structure and spacing rhythm
  - preserve typography, hierarchy, and imagery treatment
  - preserve borders, radii, and shape language
  - preserve meaningful motion and interaction patterns when Shopify allows it
  - only simplify when Shopify theme constraints require a real tradeoff
- Major editable UI modules belong in `sections/`.
- Small reusable partials belong in `snippets/`.
- Page composition belongs in `templates/`.
- Shared CSS/JS files belong in `assets/`.
- Inline CSS/JS inside a `.liquid` file is still part of that section or snippet, not a separate asset.
- Prefer schema settings for merchant-editable text, links, images, and options.
- Use blocks when a merchant needs repeatable items inside a section.
- Shared shell sections such as the header and footer should read their navigation and footer content from normalized shell data and section blocks, not from hardcoded demo URLs or brand copy.
- If a JSON template includes a block-based section, the template must include `blocks` and `block_order`. Section presets alone do not populate the live homepage.
- Standard Shopify routes should use the correct template families:
  - `templates/product*.json`
  - `templates/collection*.json`
  - `templates/page*.json`
- Use alternate templates when a Figma page represents a special product, collection, or page destination.
- A Shopify theme file does not create the underlying product, collection, or page resource. Theme generation and store-content creation are separate tasks.
- The current repo scripts are helpers, not a universal schema. If the incoming Figma structure differs, adapt the implementation or author new theme files directly instead of distorting the design to fit an older implementation pattern.
- Prefer a local preview plus Playwright as the **primary verification loop** before Shopify push. Playwright is the main feedback mechanism for iterating on output quality, not optional QA. Use it to compare the implementation against the Figma design and catch layout, spacing, typography, color, and interaction drift early.
- After browser-based comparison reveals visual drift, use the UI/design helper skills (`frontend-design`, `polish`, `adapt`, `harden`, `audit`, `critique`, `normalize`, `colorize`, `bolder`, `quieter`, `animate`, `delight`, `clarify`, `distill`, `extract`, `optimize`) to refine the output while keeping it inside Shopify theme constraints.
- Finish normalization before theme generation, then re-read the normalized files and generate the theme from that locked source of truth.
- Prefer one coordinated implementation pass over parallel sub-agent theme generation, which tends to create schema drift, phantom asset references, and inconsistent content.
- Audit generated Liquid for orphaned asset tags, stray debug output, invalid template block wiring, and invented content before moving on to preview or Playwright.

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

Before declaring `DESIGN_SLUG`, `SHOPIFY_STORE`, `SHOPIFY_PREVIEW_THEME_ID`, or `SHOPIFY_STOREFRONT_PASSWORD` missing, verify them from the live shell session that will run the command.
When testing a password-protected preview, prefer `npm run test:shopify-preview` over improvised Playwright code so the repo's storefront-password handling is actually used.

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
If additional fixes, pushes, or verification steps happen later in the same run, repeat the refreshed missing-resource checklist at the very end of the final response so it is not buried earlier in the chat.

## Editing Rules

- Keep the normalized Figma spec small and explicit.
- Track normalized design inputs under `input/designs/<design-slug>/normalized/`.
- Prefer one file per major route or shell concern when the normalized input becomes large.
- When converting a design element into Shopify Liquid, finish the component to a functional Shopify standard before treating it as done. Avoid placeholder markup, fake settings, dead schema entries, or preview-only implementations.
- Generate files first under `output/<design-slug>/theme/` before moving them into a production theme.
- Keep Playwright artifacts under `output/<design-slug>/playwright/`.
- Generated artifacts under `output/` and raw Figma pulls under `input/figma/` must stay ignored by Git.
- Do not add Playwright screenshots, mobile screenshots, preview HTML, or generated theme output to version control.
- Do not hardcode merchant-editable copy if it should live in section schema settings.
- Do not fill source gaps with plausible but ungrounded content. Unknown copy, links, or backend resources should stay explicit and unresolved until sourced.
- Do not declare the flow complete after only the homepage renders if the Figma includes additional routes.
- Do not force arbitrary Figma files into older section types, CSS class names, or route handles when the structure does not match. Build the needed Shopify theme files directly.
- Use the general `figma` skill as an extraction or interpretation helper when useful, but keep the repo-local Shopify skill as the authority for normalization, route mapping, theme structure, and closeout requirements.
- Bring in the UI/design helper skills when the implementation needs visual comparison, cleanup, refinement, responsiveness, accessibility hardening, or polish relative to the Figma source, and keep their output constrained by Shopify theme architecture instead of drifting into generic website-only code.
- When the tested workflow changes, update `README.md`, `AGENTS.md`, and the local skill docs in the same implementation pass.
- When handing off a theme build, include the missing Shopify resource checklist in the closeout whenever any live routes still depend on products, collections, or pages that are not in the store yet.
- Put that checklist at the very end of the closeout after any summaries, URLs, or push results.

## Pipeline Improvement Log

When a pipeline run encounters errors, visual drift, or unexpected behavior, record the general lesson in the Pipeline Improvement Log section of the skill files (`SKILL.md` in both the installed skill and `skills/figma-to-shopify-pipeline/SKILL.md`). Focus on design-agnostic patterns, not site-specific fixes. Review the log at the start of each pipeline run to avoid repeating known mistakes.
