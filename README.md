# Figma to Shopify Theme Starter

This repository is a route-aware starter for turning a Figma design into a Shopify theme that is:

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

## What This Repo Automates

This repo is designed to automate as much of the Figma-to-Shopify flow as possible:

- read or normalize Figma source into compact JSON inputs
- generate Shopify-compatible theme files
- generate local multi-route previews
- run Playwright route smoke tests locally
- validate the theme with Shopify CLI
- push the theme into a stable unpublished Shopify preview theme
- run Playwright against the live Shopify preview

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
- automatically run `scripts/test-home-preview.mjs` and `scripts/test-site-preview.mjs` in visible Playwright mode after a successful desktop build
- package the wrapper into a Windows `.exe` installer or macOS `.dmg`
- launch an embedded Claude terminal in the repo workspace

The desktop app does not replace the root pipeline scripts.
It prepares the environment so the existing route-aware flow is easier to run repeatedly.

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

Installer notes:

- the desktop app now ships with a generated starter workspace seed
- on first launch, the packaged app copies that starter workspace into its app data directory so scripts, normalized starter inputs, and local skill docs live in a writable location
- Windows installers are built as one-click NSIS `.exe` packages
- macOS installers are configured as `.dmg` builds and should be generated on macOS

## Design Folder Convention

Each Figma project should get its own design slug.

Use a stable slug based on:

- the Figma file or project name
- plus a short stable identifier such as part of the Figma file key

Current example:

- `jewelry-brand-website--xqblqd1l`

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

- [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md)
  Repo operating rules. This is the most important instruction file for agent-driven work.
- [skills/figma-to-shopify-theme/SKILL.md](C:/Users/subai/Documents/test/skills/figma-to-shopify-theme/SKILL.md)
  Repo-local workflow skill for the full design-to-theme pipeline.
- [package.json](C:/Users/subai/Documents/test/package.json)
  Entry point for the local scripts.
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/home.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/home.json)
  Homepage section input.
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/site-shell.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/site-shell.json)
  Shared shell input.
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/route-collection.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/route-collection.json)
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/route-membership.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/route-membership.json)
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/route-product.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/route-product.json)
- [input/designs/jewelry-brand-website--xqblqd1l/normalized/route-dusk-box.json](C:/Users/subai/Documents/test/input/designs/jewelry-brand-website--xqblqd1l/normalized/route-dusk-box.json)
- [scripts/generate-shopify-site.mjs](C:/Users/subai/Documents/test/scripts/generate-shopify-site.mjs)
  Whole-site Shopify generator.
- [scripts/build-site-preview.mjs](C:/Users/subai/Documents/test/scripts/build-site-preview.mjs)
  Multi-route local preview builder.
- [scripts/test-home-preview.mjs](C:/Users/subai/Documents/test/scripts/test-home-preview.mjs)
  Headed homepage preview smoke test.
- [scripts/test-site-preview.mjs](C:/Users/subai/Documents/test/scripts/test-site-preview.mjs)
  Local Playwright route test.
- [scripts/push-preview-theme.mjs](C:/Users/subai/Documents/test/scripts/push-preview-theme.mjs)
  Pushes the generated theme to a stable Shopify preview theme.
- [scripts/test-shopify-preview.mjs](C:/Users/subai/Documents/test/scripts/test-shopify-preview.mjs)
  Live Playwright route test against the Shopify preview.

## Recommended Agent Setup

This repo is built to work best with an agent that understands:

- `AGENTS.md`
- repo-local workflow instructions under `skills/`
- Playwright browser automation
- Shopify CLI
- Figma API or Figma MCP

### If You Are Using Claude

Use [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md) as the main repo instruction file.

The local skill at [skills/figma-to-shopify-theme/SKILL.md](C:/Users/subai/Documents/test/skills/figma-to-shopify-theme/SKILL.md) should stay in the repo as the generic workflow reference for repo-guided agents such as Codex. The desktop wrapper also installs the Claude-specific `figma-to-shopify-pipeline` skill into Claude so the embedded and non-interactive Claude runs use the packaged pipeline instructions.

If your Claude environment supports additional installable tools, install equivalents for:

- Figma access
- Shopify Liquid/theme generation
- Playwright browser automation

In practical terms, this repo expects the agent runtime to have the equivalent of:

- `figma`
- `shopify-liquid-themes`
- `playwright`
- the installed Claude `figma-to-shopify-pipeline` skill

If your agent runtime does not support installable skills, keep the repo-local skill and direct the agent to follow it alongside [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md).

## Prompt Template

If your agent reads [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md) reliably, this short prompt is enough:

```text
Use the repo’s AGENTS.md and local figma-to-shopify-theme skill. Run the full route-aware Figma-to-Shopify flow for DESIGN_SLUG=<design-slug>, push to the configured Shopify preview theme, test all routes locally and live with Playwright, and report any remaining missing Shopify resources with exact handles and template assignments.
```

Current repo example:

```text
Use the repo’s AGENTS.md and local figma-to-shopify-theme skill. Run the full route-aware Figma-to-Shopify flow for DESIGN_SLUG=jewelry-brand-website--xqblqd1l, push to the configured Shopify preview theme, test all routes locally and live with Playwright, and report any remaining missing Shopify resources with exact handles and template assignments.
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

If you are using raw Figma API fetches, set:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
$env:FIGMA_TOKEN="your-figma-token"
```

If you are using live Shopify validation, set:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
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

Run the full local route-aware flow:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
npm run flow
```

This does all of the following:

- generates `output/<design-slug>/theme/`
- builds local routed previews in `output/<design-slug>/preview/`
- runs the headed homepage and route Playwright checks
- writes screenshots into `output/<design-slug>/playwright/`

Use this before touching a real Shopify store.

## Real Figma Workflow

If you have a real Figma file and API access:

```powershell
npm run fetch:figma -- <figma-file-key>
```

Important rule:

- do not convert raw Figma JSON directly into Liquid
- normalize it first into the route-aware inputs under `input/designs/<design-slug>/normalized/`

If the source is a Figma Make file, prefer MCP source extraction over screenshots.

## Live Shopify Workflow

Validate and push the generated theme:

```powershell
$env:DESIGN_SLUG="jewelry-brand-website--xqblqd1l"
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
- Figma editorial or membership page -> Shopify `page` template
- custom campaign route -> mapped Shopify product or page route

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

The goal of this repo is to make that remaining gap as small as possible.

## Shopify Resource Handoff

At the end of a theme-generation run, if any live Shopify routes still depend on backend resources that do not exist yet, the handoff should list them explicitly.

That checklist should include:

- resource type: product, collection, or page
- exact handle
- template to assign
- whether it must be published or made available to Online Store

Example:

- page: `membership` -> assign `page.membership`
- product: `vue-chain-necklace` -> assign `product.vue-chain-necklace`
- product: `dusk-box` -> assign `product.dusk-box`

This should be stated plainly in the final handoff even if the user already knows Shopify, because it turns a generic 404 into an exact completion checklist.

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

## Maintenance Rule

When the workflow changes, update all of these together in the same pass:

- [AGENTS.md](C:/Users/subai/Documents/test/AGENTS.md)
- [README.md](C:/Users/subai/Documents/test/README.md)
- [skills/figma-to-shopify-theme/SKILL.md](C:/Users/subai/Documents/test/skills/figma-to-shopify-theme/SKILL.md)
- any affected files under [skills/figma-to-shopify-theme/references](C:/Users/subai/Documents/test/skills/figma-to-shopify-theme/references)

Do not let the docs lag behind the actual tested flow.
