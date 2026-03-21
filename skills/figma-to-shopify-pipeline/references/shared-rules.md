# Shared Pipeline Rules

These rules apply across all phases. Read this file at session start.

---

## Functional Liquid: The Non-Negotiable Quality Bar

Every generated Shopify Liquid component must be production-grade before it is considered done:

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
      route-<whatever-the-design-needs>.json

    input/figma/<design-slug>/                <- raw Figma API output (gitignored)

    output/<design-slug>/
      theme/                                  <- generated Shopify theme (gitignored)
      preview/                                <- local HTML previews (gitignored)
      playwright/                             <- screenshots and test artifacts (gitignored)

There is no required fixed schema beyond keeping normalized inputs explicit and per-design.

---

## Completion Gates

All four must pass before the pipeline is done:

1. **No hardcoded collections/products/navigation** — use schema pickers (`type: collection`, `type: product`) and editable section settings
2. **Header/footer are editable sections** — included via `{% section %}`, not hardcoded HTML in theme.liquid
3. **All routes tested with Playwright** — before Shopify push AND after push
4. **Missing resource checklist provided** — route-by-route, at the very end of the response

---

## Context Mode MCP — Use These Tools Every Session

| Tool | When to use |
|---|---|
| `cm_index` | Before reading any large file or processing bulky output — store it, get a compact token back |
| `cm_search` | Instead of re-reading indexed files — search for the specific part you need |
| `cm_checkpoint_save` | After each major step and before `/compact` — saves task state, active files, notes |
| `cm_checkpoint_load` | At session start or immediately after `/compact` — restores full context |
| `cm_track_decision` | Record any failed approach, confirmed fix, or key decision so it isn't repeated |
| `cm_decisions_get` | At session start — review past decisions before writing any code |

---

## Editing and Maintenance Rules

- Generate files under output/<design-slug>/theme/ first — move to production only after validation
- Never declare the flow complete if Figma includes routes beyond the homepage
- Do not force arbitrary Figma files into older section types, CSS class names, or route handles — build the Shopify theme files the current design actually needs
- When the workflow changes, update README.md, AGENTS.md, and local skill docs in the same pass
- Always include the route-by-route Missing Shopify Resource Checklist at closeout when any live routes depend on content not yet in the store
