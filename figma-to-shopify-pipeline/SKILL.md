---
name: figma-to-shopify-pipeline
description: >
  Run the full route-aware Figma-to-Shopify theme pipeline. Normalizes Figma
  design source into compact JSON, generates fully functional Shopify
  sections/snippets/templates/assets, builds local multi-route previews,
  runs Playwright smoke tests, validates with Shopify CLI, and pushes to a
  stable preview theme. Always ends with an explicit Shopify resource checklist
  for any remaining backend content.

  Use this skill whenever the user wants to convert a Figma design into a Shopify
  theme, run the figma-to-shopify pipeline, generate Shopify Liquid from Figma
  frames or components, normalize Figma JSON for theme generation, push a preview
  theme to Shopify, validate Shopify theme routes, or do any design-to-theme
  automation work -- even if they don't call it a "pipeline" or use those exact words.
---

# Figma to Shopify Theme Pipeline

## Overview

Convert the **full routed experience** from a Figma source into a Shopify theme that:
- is editable in the Shopify theme editor
- covers every routed page the Figma exposes, not just the homepage
- produces fully functional Shopify Liquid — not placeholders, mocks, or preview-only stand-ins
- is tested locally with Playwright before any Shopify store is touched
- preserves the Figma design language as faithfully as Shopify allows
- leaves only Shopify store-content creation as the remaining manual step

This pipeline is **design-agnostic**. It should work for any Figma file regardless of layout style, section count, or visual complexity. There are no fixed starter templates or hardcoded section types — every run generates fresh theme files from the normalized design source.

Preferred sub-skill order: `figma` then `shopify-liquid-themes` then design helper skills as needed then `playwright`

---

## Functional Liquid: The Non-Negotiable Quality Bar

Every generated Shopify Liquid component must be production-grade before it is considered done. This means:

- **Valid Liquid syntax** that Shopify can parse and render without errors
- **Valid schema** with correct setting types, proper `id` and `type` fields, and working defaults
- **Correct asset references** — CSS in `assets/`, images via `image_picker`, no broken paths
- **Working merchant-editable settings** — text, richtext, url, image_picker settings that actually render their values in the Liquid output
- **Working blocks** when repetition is required — with `block_order` in JSON templates, not just section presets
- **No preview-only shortcuts** — if it renders in the local preview but would break in a real Shopify theme, it is not done
- **Preserved visual intent** — layout, spacing, typography, color, imagery treatment, shape language, corner radius, borders, and motion style from the Figma source should survive the adaptation

A component that looks right in preview but has dead schema, fake settings, missing blocks, or hardcoded demo content is incomplete. Finish it before moving on.

---

## CRITICAL: Route Coverage Rule

**Never stop at the homepage.** If the Figma source includes additional pages or routes,
they are required output in the same pass.

Required steps every time:
1. Inspect the Figma route map first
2. Convert homepage sections
3. Convert every routed page/destination
4. Generate matching Shopify templates and sections
5. Test homepage navigation AND destination routes with Playwright
6. Keep going until the full theme-side route map is covered

Common route mappings:

| Figma route | Shopify route |
|---|---|
| /product/<handle> | /products/<handle> |
| /about | /pages/about |
| /collection/<handle> | /collections/<handle> |
| /campaign/<handle> | /pages/<handle> or the best-fitting alternate template family |

If a Figma route is not directly compatible with Shopify routing, map it to a
Shopify-supported route and record the mapping explicitly.

---

## Directory Conventions

Each design gets its own slug. Never share input/normalized/ or output/theme/ across unrelated projects.

    input/designs/<design-slug>/normalized/   <- tracked source (check into git)
      home.json                               <- homepage sections
      site-shell.json                         <- shared header/footer
      route-about.json
      route-featured-product.json
      route-summer-campaign.json
      route-<whatever-the-design-needs>.json

    input/figma/<design-slug>/                <- raw Figma API output (gitignored)

    output/<design-slug>/
      theme/                                  <- generated Shopify theme (gitignored)
      preview/                                <- local HTML previews (gitignored)
      playwright/                             <- screenshots and test artifacts (gitignored)

There is no required fixed schema beyond keeping normalized inputs explicit and per-design.
If a new design uses different page types, section patterns, or data shapes, create normalized files that fit that design.

---

## Workflow

### 1. Normalize the Design

From a real Figma file (with FIGMA_TOKEN):

    npm run fetch:figma -- <figma-file-key>

Raw output lands under input/figma/<design-slug>/.

Never convert raw Figma JSON directly into Liquid. Always normalize first:
- Extract homepage sections into input/designs/<design-slug>/normalized/home.json
- Extract shared shell into site-shell.json
- Extract each routed page into route-<name>.json
- Keep normalized files small and explicit; one file per major route or shell concern

For Figma Make files: prefer get_design_context + read_mcp_resource over screenshots.
Do not rely on get_metadata or get_screenshot as primary extraction sources.
Screenshots are optional QA artifacts only.

For Figma Make files with source code resources:
- Treat the Make source files as the authoritative content source for copy, route structure, component names, and imagery references
- Start with the app entry and route-bearing files first, then read only the specific component/style files needed to normalize the design
- Use the MCP server name exactly as exposed by the tool instead of inventing aliases
- Do not rewrite marketing copy, prices, testimonials, FAQs, nav labels, or product details unless the source itself clearly contains different values
- If a value is missing or ambiguous, mark it explicitly in normalization instead of inventing plausible filler

### 2. Generate the Shopify Theme

Generate the full Shopify theme directly from the normalized input. There is no single fixed generation command — the implementation is authored per-design based on the normalized source.

Expected output structure under `output/<design-slug>/theme/`:
- `sections/*.liquid` — major editable UI modules
- `snippets/*.liquid` — small reusable partials
- `templates/*.json` — page composition (JSON templates with blocks and block_order)
- `assets/*.css` — shared CSS

The repo provides generic helpers, not a universal theme generator:
- `scripts/fetch-figma-file.mjs` — Figma API fetch
- `scripts/serve-preview.mjs` — serve local preview files
- `scripts/validate-shopify.mjs` — Shopify CLI availability check
- `scripts/push-preview-theme.mjs` — push to stable preview theme
- `scripts/test-shopify-preview.mjs` — Playwright against live Shopify preview
- `scripts/lib/design-context.mjs` — per-design path resolver
- `scripts/lib/route-specs.mjs` — route-aware input loader

Use these helpers when they fit. If they do not match the current design, generate the needed theme files, preview output, or verification steps directly. Do not force a design into an older implementation pattern.

Generation discipline:
- Finish normalization first, then generate theme files from that normalized source
- Re-read the normalized files before theme generation so section data and route mappings stay aligned
- Prefer one coordinated implementation pass over many parallel sub-agents when authoring theme files; fragmented generation tends to invent mismatched schema, content, and asset references
- Do not create phantom asset tags, placeholder snippet includes, or CSS file references that are not also created in the theme output
- After generation, audit the produced theme for orphaned asset references, meaningless Liquid output, invalid template block wiring, and invented content that is not grounded in the normalized source

### 3. Build Local Previews and Test with Playwright

Local preview plus Playwright is the **primary verification loop** and should be used before any Shopify push. This matters because it is the fastest way to catch drift from the Figma source and iterate on corrections.

- Generate preview HTML for homepage and all routed destinations under `output/<design-slug>/preview/`
- Serve with `npm run preview` only after confirming the preview files exist
- Ensure the shell has the active design context before running repo preview scripts:
  - PowerShell: `$env:DESIGN_SLUG="<design-slug>"`
  - or pass the slug explicitly to the script entrypoint if you are not relying on environment context
- Use Playwright to screenshot each route and compare against the Figma source
- Use the UI/design helper skills (see below) to refine any visual drift found during browser-based comparison

Preview execution discipline:
- Do not background a vague "preview build agent" and then wait indefinitely for it to maybe write files
- Build the preview deterministically in the current workspace, then verify that `output/<design-slug>/preview/index.html` exists before serving it
- If the preview file does not exist, stop and fix preview generation instead of waiting in a loop
- If Playwright is ready but preview output is missing, that is a generation failure, not a reason to stall

Playwright is not optional QA — it is the primary feedback mechanism for iterating on output quality. Use it to verify layout, spacing, typography, color, and interaction fidelity before moving to Shopify.

### 4. Validate with Shopify CLI

    $env:SHOPIFY_STORE="your-store.myshopify.com"
    $env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
    npm run validate:shopify
    shopify theme check --path output/$env:DESIGN_SLUG/theme

Trigger auth if needed: shopify theme list --store $env:SHOPIFY_STORE --json

Environment verification discipline:
- Before claiming that `DESIGN_SLUG`, `SHOPIFY_STORE`, `SHOPIFY_PREVIEW_THEME_ID`, or `SHOPIFY_STOREFRONT_PASSWORD` is missing, verify it from the live shell session that will run the command
- In PowerShell, check with commands such as:
  - `echo $env:DESIGN_SLUG`
  - `echo $env:SHOPIFY_STORE`
  - `echo $env:SHOPIFY_PREVIEW_THEME_ID`
  - `echo $env:SHOPIFY_STOREFRONT_PASSWORD`
- If a value exists in the shell, do not ask the user for it again
- If a value is missing from the shell but expected from the desktop wrapper, report that as an environment handoff problem instead of assuming the user never provided it

### 5. Push and Test the Preview Theme

    npm run push:preview         # pushes to the stable unpublished preview theme
    npm run test:shopify-preview # Playwright against the live Shopify preview URL

Operational rules:
- Avoid shopify theme push --unpublished in automation — it may prompt for a theme name
- Use shopify theme share once to create a preview theme, then reuse that same theme ID every run
- Keep SHOPIFY_STOREFRONT_PASSWORD set if the storefront is password-protected
- A favicon.ico 404 is non-blocking noise
- Prefer the repo script for live preview verification. Do not replace `npm run test:shopify-preview` with ad hoc Playwright code unless the script itself is broken and you state that explicitly.

---

## UI/Design Helper Skills

The Impeccable skill suite provides specialized design refinement tools. Use them during conversion and especially after browser-based comparison with the Figma source reveals visual drift. These skills help produce output that looks like it was crafted by a designer, not generated by a template.

**When to reach for them:**
- After generating Liquid and building the local preview, compare the rendered output to the Figma source in a browser
- When the comparison reveals layout, spacing, typography, color, or interaction drift
- When responsiveness, accessibility, or edge-case resilience needs strengthening
- When the output passes technically but feels generic or visually flat compared to the Figma source

**Available skills and when they help:**

| Skill | Use when... |
|---|---|
| `frontend-design` | The generated UI needs stronger aesthetic direction or feels like generic AI output |
| `polish` | Final quality pass — alignment, spacing, typography, interaction states, consistency |
| `adapt` | Responsive adaptation across screen sizes, devices, or contexts |
| `harden` | Edge cases, error states, i18n resilience, extreme inputs |
| `audit` | Systematic quality check across accessibility, performance, theming, responsiveness |
| `critique` | Critical design review and targeted feedback |
| `normalize` | Standardize inconsistent patterns across generated sections |
| `colorize` | Color system refinement when the palette drifts from the Figma source |
| `bolder` | Strengthen visual impact when output feels too tame |
| `quieter` | Tone down visual noise when output feels too busy |
| `animate` | Motion and interaction polish |
| `delight` | Add personality and craft touches |
| `clarify` | Clarify confusing layout or information hierarchy |
| `distill` | Simplify overly complex sections |
| `extract` | Consolidate repeated patterns into reusable components |
| `optimize` | Performance and usability optimization |
| `onboard` | Improve first-use or onboarding flows in the design |

**Important constraint:** These skills improve the UI, but the output must still land as valid Shopify theme code. Do not let design refinement drift into generic website-only output that breaks Shopify theme constraints.

---

## Figma MCP as a Reference Source

The Figma MCP tools (`get_design_context`, `get_screenshot`, etc.) are useful for upstream inspection, source extraction, and understanding how a design would behave as a regular website. This web-oriented interpretation can inform layout decisions, responsive behavior, interaction patterns, and content structure.

Use the Figma MCP tools when:
- Inspecting design structure, tokens, variables, and component hierarchies
- Understanding responsive intent or interaction patterns from the source
- Extracting content, images, and style values during normalization
- Getting a web-oriented mental model of the design before translating to Shopify

The Figma MCP interpretation is reference material. The final implementation must be re-expressed in Shopify primitives, schema, route families, and theme files.

---

## Shopify Theme Structure Rules

| Where | What goes there |
|---|---|
| sections/ | Major editable UI modules |
| snippets/ | Small reusable partials |
| templates/ | Page composition (JSON templates) |
| assets/ | Shared CSS/JS files |

- Use schema settings for merchant-editable text, links, images, and options
- Use blocks when a merchant needs repeatable items inside a section
- Block-based JSON templates must include blocks and block_order
  (section presets alone do not populate the live homepage)
- Standard route template families: templates/product*.json, templates/collection*.json, templates/page*.json
- Use alternate templates for special product/collection/page destinations
- Theme files do not create Shopify store resources — that is a separate task

## Figma to Shopify Element Mapping

| Figma element | Shopify primitive |
|---|---|
| Heading / label / short text | text setting |
| Rich body copy | richtext setting |
| Link / CTA | url setting |
| Merchant-replaceable image | image_picker setting |
| Repeated cards / testimonials | section blocks |
| Shared controls / partials | snippets |
| Page assembly | JSON template |

---

## Store Content Seeding (Separate Layer)

Theme generation creates route layouts. It does NOT create Shopify products, collections, or pages.

When live routes still depend on missing backend resources, the final response MUST include a
route-by-route **Missing Shopify Resource Checklist**. For each missing route, list:

- Figma route or intended storefront route
- Shopify resource type: `product`, `collection`, or `page`
- Required handle
- Suggested admin title/name
- Template to assign
- Whether it must be published / available to Online Store
- Current status: `required`, `blocked by missing resource`, or similar explicit wording

Checklist format example:

    Missing Shopify Resource Checklist
    - Route: /products/featured-item
      Type: product
      Handle: featured-item
      Suggested title: Featured Item
      Template: product.featured-item
      Publish to Online Store: yes
      Status: required for route to render correctly

    - Route: /pages/about
      Type: page
      Handle: about
      Suggested title: About
      Template: page.about
      Publish to Online Store: yes
      Status: required for route to render correctly

Do not leave this implied. Even if the user knows Shopify well,
a 404 is not a self-explanatory completion checklist.

Closeout formatting rule:
- Put the missing-resource checklist at the very end of the final response, after any fix summaries, verification notes, Shopify push results, or preview URLs
- If additional fixes are made later in the same run, repeat the refreshed checklist at the end instead of leaving the only checklist buried earlier in the conversation
- Prefer a compact table when the client supports it, otherwise use a flat route-by-route list
- Do not end with a generic success statement after the checklist; the checklist should be the last substantial section when resources are still missing

---

## First-Time Setup

    npm install
    npx playwright install chromium

With live Shopify:
    $env:DESIGN_SLUG="your-design-slug"
    $env:SHOPIFY_STORE="your-store.myshopify.com"
    $env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
    $env:SHOPIFY_STOREFRONT_PASSWORD="your-storefront-password"

---

## Editing and Maintenance Rules

- Generate files under output/<design-slug>/theme/ first — move to production only after validation
- Never declare the flow complete if Figma includes routes beyond the homepage
- Do not force arbitrary Figma files into older section types, CSS class names, or route handles — build the Shopify theme files the current design actually needs
- When the workflow changes, update README.md, AGENTS.md, and local skill docs in the same pass
- Always include the route-by-route Missing Shopify Resource Checklist at closeout when any live routes depend on content not yet in the store

---

## Pipeline Improvement Log

Use this section to record general lessons learned from pipeline runs. These should be design-agnostic patterns that improve future conversions, not site-specific fixes.

**How to use this log:**
- After a pipeline run encounters an error, visual drift, or unexpected behavior, record the pattern here
- Focus on the general lesson, not the specific design or section name
- Include what went wrong, why, and what the fix or prevention strategy is
- Review this log at the start of each pipeline run to avoid repeating known mistakes

### Lessons

- When Shopify backend resources are still missing, repeat the refreshed checklist at the very end of the final response so it is not buried above later fixes or push output.
- Before declaring Shopify env vars missing, verify them from the live shell session. A desktop wrapper or prior setup step may have already populated them.
- When testing a password-protected Shopify preview, prefer `npm run test:shopify-preview` over improvised Playwright code so the stored storefront password path is actually used.
- Preview serving depends on the active design context. Set `DESIGN_SLUG` in the shell or pass the slug explicitly before running preview scripts.
- Do not wait on an open-ended background preview agent. Generate the preview deterministically, confirm the files exist, then start the preview server and Playwright.
- For Figma Make runs, read the app entry and route-bearing source files first, then normalize from those files instead of improvising from a broad file dump.
- Do not invent storefront copy, testimonials, FAQs, navigation targets, prices, or product claims during normalization or template generation. Unknown values should stay explicit and unresolved.
- Avoid parallel sub-agent theme generation before the normalized source is finalized and re-read. It increases schema drift, phantom asset references, and inconsistent section content.
- Re-check generated Liquid for stray debug/output lines and orphaned asset tags before moving on to preview or Playwright.
- Use the exact MCP server name exposed by the environment. Do not assume or synthesize a server alias for Figma resources.
- Block-based homepage sections need `blocks` and `block_order` in the JSON template. Section presets alone do not populate the live homepage.
- Reuse a stable preview theme ID for automation. Creating a new preview on each run is fragile.
- `shopify theme push --unpublished` may prompt for a theme name in automation contexts — avoid it.
- Local preview plus Playwright catches most visual drift faster than Shopify push plus manual inspection.
- A component is not done just because the preview looks right. Liquid output, schema behavior, and theme editor usability all have to work.
- The Figma Make route map should be inspected early so dedicated pages are not accidentally deferred behind the homepage.
- A strong closeout always names remaining Shopify resources explicitly, route by route, instead of only saying "backend content is missing."
- Keep local preview assertions aligned with actual section selectors, not brittle raw-text matching.
- UI/design helper skills are most useful after browser-based comparison exposes real drift from the Figma source.
- Do not hardcode merchant-editable copy into Liquid — it should live in section schema settings.
- Generated Playwright screenshots, preview HTML, and generated theme output should be gitignored.

<!-- Add new lessons above this line -->
