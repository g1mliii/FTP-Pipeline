# Figma to Shopify Theme Pipeline

This repository is a route-aware pipeline workspace for turning a Figma design into a Shopify theme that is:

- editable in the Shopify theme editor
- organized as valid Shopify `sections`, `snippets`, `templates`, and `assets`
- tested locally with Playwright
- pushed to a reusable Shopify preview theme for live verification
- optionally fronted by a guided Electron desktop setup wrapper under `apps/desktop/`

The target outcome is not "make the homepage look right." The target outcome is:

- convert the homepage
- convert every routed page represented in Figma
- map those routes into Shopify-supported route families
- generate matching templates and sections
- test navigation and destination pages
- leave only Shopify store-content creation as the separate remaining task

The mission is straightforward: take a Figma design that is assumed to be correct and turn it into Shopify theme output as accurately as possible. The pipeline should preserve the source design language instead of reinterpreting it into a generic theme unless Shopify imposes a real implementation constraint.
When source values are missing or ambiguous, the pipeline should keep those gaps explicit rather than inventing plausible storefront copy, reviews, FAQs, policy links, route targets, or backend resources.

## What This Repo Automates

This repo is designed to automate as much of the Figma-to-Shopify flow as possible:

- read or normalize Figma source into compact JSON inputs
- generate Shopify-compatible theme files
- generate local multi-route previews
- run Playwright route smoke tests locally
- validate the theme with Shopify CLI
- push the theme into a stable unpublished Shopify preview theme
- run Playwright against the live Shopify preview

The quality bar is fully functional theme output, not visual similarity in preview alone. Every generated Shopify Liquid section, snippet, template, schema, and asset must work as production theme code — valid Liquid syntax, valid schema with correct setting types, working merchant-editable settings, working blocks with `block_order` in JSON templates, and correct asset references. A component that looks right in preview but has dead schema, fake settings, missing blocks, or hardcoded demo content is incomplete.
The fidelity bar is also strict: assume the Figma file is visually correct and preserve its design language as closely as Shopify allows, including color palette, typography, layout, spacing, imagery treatment, borders, radii, and overall theme tone.
The repo is intentionally not a fixed starter theme. It is design-agnostic — there are no hardcoded section types, starter templates, or generation scripts tied to a specific layout. Use the generic helpers here to fetch source data, serve previews, validate Shopify CLI availability, push preview themes, and test live previews. Author the actual theme-generation implementation per design as needed.
When a local preview is available, prefer using it with Playwright as the **primary verification loop** before pushing to Shopify. Playwright is the main feedback mechanism for iterating on output quality. After browser-based comparison reveals visual drift from the Figma source, use the UI/design helper skills to refine the output while keeping it inside Shopify theme constraints.

What it does not fully automate yet:

- creating Shopify products, collections, and pages in the store
- publishing those resources to Online Store
- assigning alternate templates to specific store resources

Those are a separate store-content seeding layer and can be done:

- manually in Shopify admin
- through the Shopify Admin API

## Desktop Wrapper

The repository now includes a desktop setup wrapper in `apps/desktop/`.

Its current role is:

- validate the local machine from the project root
- install or verify Shopify CLI, Playwright, and Codex CLI
- configure Claude plugins and user skill placement
- configure Codex MCP entries for Figma and Playwright
- persist store domain, Figma URL, and design slug context across restarts
- store `FIGMA_TOKEN` and optional storefront password in the OS credential vault
- guide Shopify, Claude, and Figma auth before the build phase starts
- launch a non-interactive `claude -p` build from the repo root with the saved context
- package the wrapper into a Windows `.exe` installer or macOS `.dmg`
- launch an embedded Claude terminal in the repo workspace

The desktop app does not replace the root pipeline scripts.
It prepares the environment so the existing route-aware flow is easier to run repeatedly.
The current Build step launches the embedded Claude terminal and sends the generated build prompt into that live session, so you can keep editing, interrupting, and continuing from the same terminal.

Run it with:

```powershell
npm install
npm run desktop:dev
```

Useful desktop workspace commands:

- `npm run desktop:dev`
- `npm run desktop:test`
- `npm run desktop:build`
- `npm run desktop:pack`
- `npm run desktop:dist:win`
- `npm run desktop:dist:mac`
- `npm run desktop:release:mac`

Installer notes:

- the desktop app now ships with a generated workspace seed
- on first launch, the packaged app copies that workspace into its app data directory so scripts and local skill docs live in a writable location
- Windows installers are built as one-click NSIS `.exe` packages
- macOS installers are configured as `.dmg` builds and should be generated on macOS
- macOS release builds also generate `.zip` artifacts plus `latest-mac.yml` so `electron-updater` can download updates from GitHub Releases
- Electron Builder signs with the local Developer ID identity, enables hardened runtime, and notarizes automatically when Apple notarization credentials are available in the shell environment

## Design Folder Convention

Each Figma project should get its own design slug.

Use a stable slug based on:

- the Figma file or project name
- plus a short stable identifier such as part of the Figma file key

Example:

- `brand-site-abcd1234`

Tracked source should live under:

- `input/designs/<design-slug>/normalized/`

Ignored generated output should live under:

- `output/<design-slug>/theme/`
- `output/<design-slug>/preview/`
- `output/<design-slug>/playwright/`

Ignored raw Figma pulls should live under:

- `input/figma/<design-slug>/`

## Required Tools

Install these before using the full workflow:

1. Node.js and npm
2. Playwright Chromium browser
3. Shopify CLI
4. Figma access

For Figma access, one of these must be true:

- you have `FIGMA_TOKEN` for Figma API fetches
- or you are using an agent environment with Figma MCP access

For live Shopify validation, you need:

- a Shopify store
- Shopify CLI authenticated to that store
- a preview theme ID to reuse
- the storefront password if the storefront is password-protected

## Repo Files That Matter

- **AGENTS.md** — Repo operating rules. The most important instruction file for agent-driven work.
- **skills/figma-to-shopify-pipeline/SKILL.md** — Repo-local workflow skill for the full design-to-theme pipeline.
- **package.json** — Entry point for the local helper scripts.
- `input/designs/<design-slug>/normalized/` — Per-design normalized source files.
- **scripts/fetch-figma-file.mjs** — Raw Figma file fetch helper.
- **scripts/serve-preview.mjs** — Simple static preview server for `output/<design-slug>/preview/`.
- **scripts/validate-shopify.mjs** — Shopify CLI availability check and validation guidance.
- **scripts/push-preview-theme.mjs** — Pushes the generated theme to a stable Shopify preview theme.
- **scripts/test-shopify-preview.mjs** — Live Playwright route test against the Shopify preview.
- **scripts/lib/design-context.mjs** — Shared path resolver for per-design inputs and outputs.
- **scripts/lib/route-specs.mjs** — Loads `route-*.json` inputs and joins them to `site-route-map.json`.

These are generic helpers, not a theme generator. The actual Shopify theme implementation is authored per-design from the normalized source.

## Recommended Agent Setup

This repo is built to work best with an agent that understands:

- `AGENTS.md`
- repo-local workflow instructions under `skills/`
- Playwright browser automation
- Shopify CLI
- Figma API or Figma MCP

### If You Are Using Claude

Use [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md) as the main repo instruction file.

The local skill at [skills/figma-to-shopify-pipeline/SKILL.md](C:/Users/subai/Documents/test/skills/figma-to-shopify-pipeline/SKILL.md) should stay in the repo as the generic workflow reference for repo-guided agents such as Codex. The desktop wrapper installs Claude's `figma-to-shopify-pipeline` skill from that tracked repo skill directory into `~/.claude/skills/figma-to-shopify-pipeline` so the embedded and non-interactive Claude runs use the current repo instructions and references.

If your Claude environment supports additional installable tools, install equivalents for:

- Figma access
- Shopify Liquid/theme generation
- Playwright browser automation

In practical terms, this repo expects the agent runtime to have the equivalent of:

- `figma`
- `shopify-liquid-themes`
- UI/design helper skills such as `frontend-design`, `normalize`, `polish`, `clarify`, `harden`, `adapt`, `animate`, `audit`, `critique`, `bolder`, `quieter`, `colorize`, `delight`, `distill`, `extract`, and `optimize` when the conversion needs design interpretation or cleanup
- `playwright`
- the installed Claude `figma-to-shopify-pipeline` skill

Use the generic `figma` skill as upstream help for inspection, extraction, or regular website-oriented interpretation. Do not let it replace normalization or the Shopify-specific mapping rules in this repo.

If your agent runtime does not support installable skills, keep the repo-local skill and direct the agent to follow it alongside [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md).

## Prompt Template

If your agent reads [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md) reliably, this short prompt is enough:

```text
Use the repo’s AGENTS.md and local figma-to-shopify-pipeline skill. Run the full Figma-to-Shopify pipeline for DESIGN_SLUG=<design-slug>, generate the needed Shopify theme files, verify routed destinations, push to the configured Shopify preview theme, and report any remaining missing Shopify resources with exact handles and template assignments.
```

For Figma Make sources, add these constraints explicitly when you want a tighter run:

```text
Start with the app entry and route-bearing source files, use the MCP server name exactly as exposed by the environment, finish normalization before theme generation, do not invent missing content, and avoid parallel sub-agent theme generation.
```

Use the longer version only when you need to override defaults such as:

- a different Figma URL
- a different Shopify store
- a different preview theme ID
- a request to focus on one section or one route only

## First-Time Setup

From [C:/Users/subai/Documents/test](C:/Users/subai/Documents/test):

```powershell
npm install
npx playwright install chromium
```

Local preview smoke tests now launch Chromium visibly by default so route checks can be watched live.
If you need a quiet CI-style run, set:

```powershell
$env:PLAYWRIGHT_HEADLESS="true"
```

To package the desktop wrapper itself:

```powershell
npm run desktop:dist:win
```

On macOS, build the DMG with:

```powershell
npm run desktop:dist:mac
```

To build and publish the macOS release assets to GitHub Releases with `gh`:

```powershell
npm run desktop:release:mac
```

If you only want the build artifacts locally, use `npm run desktop:dist:mac`.
If you want notarization, make sure one supported Apple credential set is available in the shell before building:

- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`
- `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`
- `APPLE_KEYCHAIN_PROFILE` with optional `APPLE_KEYCHAIN`

If you are using raw Figma API fetches, set:

```powershell
$env:DESIGN_SLUG="your-design-slug"
$env:FIGMA_TOKEN="your-figma-token"
```

If you are using live Shopify validation, set:

```powershell
$env:DESIGN_SLUG="your-design-slug"
$env:SHOPIFY_STORE="your-store.myshopify.com"
$env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
```

If the storefront is password-protected, also set:

```powershell
$env:SHOPIFY_STOREFRONT_PASSWORD="your-storefront-password"
```

## Shopify CLI Authentication

Shopify CLI must be authenticated to the target store before live theme work.

Trigger auth with:

```powershell
shopify theme list --store $env:SHOPIFY_STORE --json
```

Then confirm Shopify CLI works:

```powershell
shopify theme check --path output/$env:DESIGN_SLUG/theme
```

## Local Workflow

There is no longer one fixed local generation command in this repo.

Expected local pattern:

- normalize the current Figma design into `input/designs/<design-slug>/normalized/`
- generate Shopify theme files into `output/<design-slug>/theme/`
- if useful, generate a local preview into `output/<design-slug>/preview/`
- use `npm run preview` to serve that preview
- prefer Playwright for local verification when a preview exists
- use the UI/design helper skills to refine the rendered result after checking it in the browser against the Figma source

The implementation details are per design. Do not force a new design into an old implementation pattern.
When using the repo preview server, set the active design context first. In PowerShell:

```powershell
$env:DESIGN_SLUG="your-design-slug"
npm run preview
```

Do not start `npm run preview` until the preview files actually exist under `output/<design-slug>/preview/`. If `index.html` is missing, treat that as a preview-generation failure to fix directly rather than something to wait on in the background.

## Real Figma Workflow

If you have a real Figma file and API access:

```powershell
npm run fetch:figma -- <figma-file-key>
```

Important rule:

- do not convert raw Figma JSON directly into Liquid
- normalize it first into the route-aware inputs under `input/designs/<design-slug>/normalized/`
- do not treat a section as complete just because a local preview looks correct; the Shopify Liquid, schema, settings, and placement also need to function in a real theme
- do preserve the Figma visual system as closely as possible during adaptation; Shopify compatibility should guide implementation details, not cause unnecessary visual drift
- do keep routed pages explicit with `route-*.json` files plus `site-route-map.json` instead of hardcoding one permanent route list into the pipeline
- do prefer a local preview plus Playwright before Shopify push, then use the UI/design helper skills to correct any visual drift seen during browser-based comparison with the Figma source

If the source is a Figma Make file, prefer MCP source extraction over screenshots.
For Make files with code resources, start from the app entry and route-bearing files first, then read only the component and style files needed for normalization. Do not invent copy or route targets that are not grounded in those source files.
For preview and Playwright, keep the run deterministic: generate preview output, confirm the files exist, then serve and test. Do not wait on an open-ended preview background task.

## Live Shopify Workflow

Validate and push the generated theme:

```powershell
$env:DESIGN_SLUG="your-design-slug"
npm run validate:shopify
npm run push:preview
npm run test:shopify-preview
```

This workflow is intended to verify:

- the homepage renders
- collection routes render
- product routes render if products exist
- page routes render if pages exist
- links are mapped correctly

## Route and Template Coverage Rule

This repository should always aim to cover the full routed experience from the Figma source.

That means:

- homepage sections are not enough
- every routed page in Figma should be mapped in the same implementation pass
- Shopify route families should be chosen explicitly
- destination routes should be tested with Playwright

Typical mappings:

- Figma product page -> Shopify `product` template
- Figma collection page -> Shopify `collection` template
- Figma editorial, about, or campaign page -> Shopify `page` template
- custom marketing route -> mapped Shopify product, collection, or page route

## What Still Requires Shopify Store Content

Theme generation creates the route layouts.
It does not create the underlying Shopify content automatically.

These still need to exist in Shopify for live routes to resolve:

- products
- collections
- pages

So the correct separation is:

- theme automation: handled here
- store-content creation: manual or Admin API

The goal of this repo is to make that remaining gap as small as possible while keeping the generated Shopify theme visually faithful to the source Figma design.

## Shopify Resource Handoff

At the end of a theme-generation run, if any live Shopify routes still depend on backend resources that do not exist yet, the handoff should list them explicitly.

That checklist should include:

- resource type: product, collection, or page
- exact handle
- template to assign
- whether it must be published or made available to Online Store

Example:

- page: `about` -> assign `page.about`
- collection: `summer-drop` -> assign `collection.summer-drop`
- product: `featured-item` -> assign `product.featured-item`

This should be stated plainly in the final handoff even if the user already knows Shopify, because it turns a generic 404 into an exact completion checklist.
When resources are still missing, that checklist should be repeated as the final closeout section after any fix summary, preview URL, or Shopify push result so it is easy to find.

## Git Hygiene

Generated artifacts must not clutter the repository.

This repo ignores:

- `node_modules/`
- `output/`
- `input/figma/`

That includes:

- Playwright screenshots
- mobile screenshots
- preview HTML
- generated theme output

If Git was already tracking those files before `.gitignore` existed, untrack them with:

```powershell
git rm -r --cached output node_modules input/figma
```

Then commit the cleanup.

Normalized design inputs under `input/designs/` should stay tracked, because they are the canonical source for each design implementation.

## Pipeline Improvement Log

When a pipeline run encounters errors, visual drift, or unexpected behavior, record the general lesson in the Pipeline Improvement Log section of the skill files. Focus on design-agnostic patterns, not site-specific fixes. Review the log at the start of each pipeline run to avoid repeating known mistakes.

## Maintenance Rule

When the workflow changes, update all of these together in the same pass:

- **AGENTS.md**
- **README.md**
- **PROMPT.md**
- **skills/figma-to-shopify-pipeline/SKILL.md**
- any affected files under **skills/figma-to-shopify-pipeline/references/**

Do not let the docs lag behind the actual tested flow.
