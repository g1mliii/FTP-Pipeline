# Ready-to-Use Prompts

Copy one of the prompts below into Claude, swap the placeholders, and the pipeline runs itself.

---
## Full pipeline (local preview + Shopify push + live route testing)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

Fetch the Figma file with key <YOUR_FIGMA_FILE_KEY>, normalize all routes into
input/designs/<YOUR_DESIGN_SLUG>/normalized/, generate the Shopify theme files
needed for this design, build local previews when useful, run Playwright where
it helps validation, validate with Shopify CLI, push to
the preview theme, and run Playwright against the live Shopify preview URL.

Make every generated Shopify Liquid section, snippet, template, schema, and
asset fully functional in a real Shopify theme, not just visually similar in
the local preview. Use the repo's UI/design helper skills when needed for
layout interpretation, cleanup, responsiveness, accessibility, or polish, but
keep the final output inside Shopify theme constraints.
Finish normalization before theme generation, then re-read the normalized files
and generate the theme from that locked source of truth.
Do not invent copy, testimonials, FAQ answers, prices, nav targets, policy
links, or backend resources that are not present in the source or explicitly
provided. Mark missing values clearly instead of fabricating them.
Use the repo scripts as helpers only when they actually help the current
design. If a helper does not fit, create the needed theme files, preview
output, or verification steps directly.
Prefer a local preview plus Playwright as the main verification loop before
Shopify push, and use the UI/design helper skills to refine any browser-visible
differences from the Figma source.
Prefer one coordinated implementation pass over parallel sub-agents for theme
authoring so schema, assets, and content stay consistent.
Set `DESIGN_SLUG=<YOUR_DESIGN_SLUG>` in the shell before running repo preview
scripts, and do not wait on a background preview agent. Generate the preview
deterministically, confirm `output/<YOUR_DESIGN_SLUG>/preview/index.html`
exists, then serve it and run Playwright.
Before claiming any Shopify env var is missing, verify it from the live shell.
For live preview checks, prefer `npm run test:shopify-preview` over ad hoc
Playwright code.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
FIGMA_FILE_KEY=<YOUR_FIGMA_FILE_KEY>
SHOPIFY_STORE=<YOUR_STORE>.myshopify.com
SHOPIFY_PREVIEW_THEME_ID=<YOUR_PREVIEW_THEME_ID>

If the storefront is password-protected also set:
SHOPIFY_STOREFRONT_PASSWORD=<YOUR_STOREFRONT_PASSWORD>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
Repeat that missing-resource checklist at the very end of your final response,
after any fix summary, preview URL, or Shopify push result, so it does not get
buried higher in the chat.
```

**Replace:**
- `<YOUR_FIGMA_FILE_KEY>` — Figma file key from the URL
- `<YOUR_DESIGN_SLUG>` — short stable project name
- `<YOUR_STORE>` — your Shopify store subdomain (e.g. `my-brand-store`)
- `<YOUR_PREVIEW_THEME_ID>` — ID of an existing unpublished preview theme (run `shopify theme list` to find it, or `shopify theme share` to create one)
- `<YOUR_STOREFRONT_PASSWORD>` — only needed if your storefront is password-protected

---

## Re-run after changes (skip Figma fetch, regenerate from existing normalized files)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

The normalized input files already exist under
input/designs/<YOUR_DESIGN_SLUG>/normalized/. Regenerate the Shopify theme,
rebuild local previews when useful, run Playwright where it helps validation,
then push to the Shopify preview
theme and run Playwright against the live preview URL.

Make every generated Shopify Liquid section, snippet, template, schema, and
asset fully functional in a real Shopify theme, not just visually similar in
the local preview. Use the repo's UI/design helper skills when needed for
layout interpretation, cleanup, responsiveness, accessibility, or polish, but
keep the final output inside Shopify theme constraints.
Re-read the normalized files before generation and do not invent content or
resource targets that are not grounded in those files.
Use the repo scripts as helpers only when they actually help the current
design. If a helper does not fit, create the needed theme files, preview
output, or verification steps directly.
Prefer a local preview plus Playwright as the main verification loop before
Shopify push, and use the UI/design helper skills to refine any browser-visible
differences from the Figma source.
Set `DESIGN_SLUG=<YOUR_DESIGN_SLUG>` in the shell before running repo preview
scripts, and confirm preview files exist before serving them or running Playwright.
Before claiming any Shopify env var is missing, verify it from the live shell.
For live preview checks, prefer `npm run test:shopify-preview` over ad hoc
Playwright code.
Repeat the missing-resource checklist at the very end of your final response,
after any fix summary, preview URL, or Shopify push result.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
SHOPIFY_STORE=<YOUR_STORE>.myshopify.com
SHOPIFY_PREVIEW_THEME_ID=<YOUR_PREVIEW_THEME_ID>
```

---

## Figma Make file (use MCP source instead of API fetch)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

The Figma source is a Make file at <YOUR_FIGMA_MAKE_URL>. Use get_design_context
and read_mcp_resource to extract the route map and all page components. Start
with the app entry and route-bearing source files first, then read only the
specific component and style files needed. Use the MCP server name exactly as
exposed by the environment. Normalize the output into
input/designs/<YOUR_DESIGN_SLUG>/normalized/ with one file per route, then
re-read that normalized source before generating the Shopify theme files needed
for this design, building local previews when useful, and running Playwright
across the routes that need validation.

Use generic Figma extraction only as source interpretation. Make every generated
Shopify Liquid section, snippet, template, schema, and asset fully functional in
a real Shopify theme, not just visually similar in the local preview. Use the
repo's UI/design helper skills when needed for layout interpretation, cleanup,
responsiveness, accessibility, or polish, but keep the final output inside
Shopify theme constraints.
Do not invent copy, testimonials, FAQ answers, prices, nav targets, policy
links, or backend resources that are not present in the source or explicitly
provided. Mark missing values clearly instead of fabricating them.
Use the repo scripts as helpers only when they actually help the current
design. If a helper does not fit, create the needed theme files, preview
output, or verification steps directly.
Prefer a local preview plus Playwright as the main verification loop before
Shopify push, and use the UI/design helper skills to refine any browser-visible
differences from the Figma source.
Prefer one coordinated implementation pass over parallel sub-agents for theme
authoring so schema, assets, and content stay consistent.
Set `DESIGN_SLUG=<YOUR_DESIGN_SLUG>` in the shell before running repo preview
scripts, and do not wait on a background preview agent. Generate the preview
deterministically, confirm `output/<YOUR_DESIGN_SLUG>/preview/index.html`
exists, then serve it and run Playwright.
Before claiming any Shopify env var is missing, verify it from the live shell.
For live preview checks, prefer `npm run test:shopify-preview` over ad hoc
Playwright code.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
Repeat that missing-resource checklist at the very end of your final response,
after any fix summary, preview URL, or Shopify push result, so it does not get
buried higher in the chat.
```

**Replace:**
- `<YOUR_FIGMA_MAKE_URL>` — the full Figma Make URL (e.g. `figma.com/make/abc123/...`)
- `<YOUR_DESIGN_SLUG>` — short stable project name

---

## Tips

- **Design slug convention:** use the project name plus a short ID from the Figma file key,
  e.g. `brand-site-abcd1234`. This keeps each project's files isolated.
- **Preview theme ID:** create one once with `shopify theme share`, then reuse that same ID
  on every run. Do not use `shopify theme push --unpublished` in automation.
- **Homepage is not enough:** the pipeline is expected to cover every routed page in the
  Figma file. If Claude stops at the homepage, tell it to continue with the remaining routes.
- **Functional theme output matters:** tell the agent to finish Liquid, schema, settings,
  blocks, and template wiring, not just the visual preview.
- **Do not let Claude fill gaps with plausible content:** if copy, testimonials, policy
  links, or routes are not in the source, it should mark them as missing instead of making them up.
- **For Figma Make:** start from the app entry and route-bearing files, not a broad dump of every file.
- **Use browser QA early:** local preview plus Playwright is usually the best way to catch
  drift from the Figma design before pushing to Shopify.
- **Preview scripts need active design context:** set `DESIGN_SLUG` in the shell first or pass the slug explicitly.
- **Do not wait on preview generation loops:** if preview files are missing, fix generation directly instead of waiting on a background agent.
- **Verify env from the real shell:** if Claude says `SHOPIFY_STOREFRONT_PASSWORD` or `SHOPIFY_PREVIEW_THEME_ID` is missing, it should check the live shell first before asking again.
- **Use the repo Shopify preview test script:** for password-protected preview verification, `npm run test:shopify-preview` is the preferred path.
- **Repo helpers are optional:** if a helper does not match the Figma structure,
  Claude should build the needed Shopify files directly.
- **Missing Shopify resources:** the pipeline generates theme layouts but cannot create
  products, collections, or pages in your store. Claude will always give you a checklist
  at the end telling you exactly what to create and what template to assign.
- **Put the checklist last:** if Claude makes more fixes after first mentioning missing resources,
  it should repeat the refreshed checklist at the very end of the final response.
