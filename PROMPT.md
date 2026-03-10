# Ready-to-Use Prompts

Copy one of the prompts below into Claude, swap the placeholders, and the pipeline runs itself.

---

## Quickstart (local preview only, no Shopify store needed)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

Fetch the Figma file with key <YOUR_FIGMA_FILE_KEY>, normalize all routes into
input/designs/<YOUR_DESIGN_SLUG>/normalized/, generate the full Shopify theme
under output/<YOUR_DESIGN_SLUG>/theme/, build local previews, and run Playwright
smoke tests across every route.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
FIGMA_FILE_KEY=<YOUR_FIGMA_FILE_KEY>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
```

**Replace:**
- `<YOUR_FIGMA_FILE_KEY>` — the key from your Figma URL (e.g. `xqblqd1l` from `figma.com/design/xqblqd1l/...`)
- `<YOUR_DESIGN_SLUG>` — a short stable name for your project (e.g. `my-brand--xqblqd1l`)

---

## Full pipeline (local preview + Shopify push + live route testing)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

Fetch the Figma file with key <YOUR_FIGMA_FILE_KEY>, normalize all routes into
input/designs/<YOUR_DESIGN_SLUG>/normalized/, generate the full Shopify theme,
build local previews, run Playwright locally, validate with Shopify CLI, push to
the preview theme, and run Playwright against the live Shopify preview URL.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
FIGMA_FILE_KEY=<YOUR_FIGMA_FILE_KEY>
SHOPIFY_STORE=<YOUR_STORE>.myshopify.com
SHOPIFY_PREVIEW_THEME_ID=<YOUR_PREVIEW_THEME_ID>

If the storefront is password-protected also set:
SHOPIFY_STOREFRONT_PASSWORD=<YOUR_STOREFRONT_PASSWORD>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
```

**Replace:**
- `<YOUR_FIGMA_FILE_KEY>` — Figma file key from the URL
- `<YOUR_DESIGN_SLUG>` — short stable project name
- `<YOUR_STORE>` — your Shopify store subdomain (e.g. `my-jewelry-brand`)
- `<YOUR_PREVIEW_THEME_ID>` — ID of an existing unpublished preview theme (run `shopify theme list` to find it, or `shopify theme share` to create one)
- `<YOUR_STOREFRONT_PASSWORD>` — only needed if your storefront is password-protected

---

## Re-run after changes (skip Figma fetch, regenerate from existing normalized files)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

The normalized input files already exist under
input/designs/<YOUR_DESIGN_SLUG>/normalized/. Regenerate the Shopify theme,
rebuild local previews, run Playwright locally, then push to the Shopify preview
theme and run Playwright against the live preview URL.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
SHOPIFY_STORE=<YOUR_STORE>.myshopify.com
SHOPIFY_PREVIEW_THEME_ID=<YOUR_PREVIEW_THEME_ID>
```

---

## Figma Make file (use MCP source instead of API fetch)

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

The Figma source is a Make file at <YOUR_FIGMA_MAKE_URL>. Use get_design_context
and read_mcp_resource to extract the route map and all page components. Normalize
the output into input/designs/<YOUR_DESIGN_SLUG>/normalized/ with one file per
route, generate the full Shopify theme, build local previews, and run Playwright
across all routes.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
```

**Replace:**
- `<YOUR_FIGMA_MAKE_URL>` — the full Figma Make URL (e.g. `figma.com/make/abc123/...`)
- `<YOUR_DESIGN_SLUG>` — short stable project name

---

## Tips

- **Design slug convention:** use the project name plus a short ID from the Figma file key,
  e.g. `jewelry-brand--xqblqd1l`. This keeps each project's files isolated.
- **Preview theme ID:** create one once with `shopify theme share`, then reuse that same ID
  on every run. Do not use `shopify theme push --unpublished` in automation.
- **Homepage is not enough:** the pipeline is expected to cover every routed page in the
  Figma file. If Claude stops at the homepage, tell it to continue with the remaining routes.
- **Missing Shopify resources:** the pipeline generates theme layouts but cannot create
  products, collections, or pages in your store. Claude will always give you a checklist
  at the end telling you exactly what to create and what template to assign.
