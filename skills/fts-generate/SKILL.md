---
name: fts-generate
description: >
  Phase 2 of the Figma-to-Shopify pipeline. Generates fully functional
  Shopify theme (sections, snippets, templates, assets) from normalized
  JSON. Use when the orchestrator invokes this phase, or to regenerate
  a theme from existing normalized files.

  Triggers: generate Shopify theme, create Liquid sections, build theme
  from normalized JSON, regenerate theme files.
---

# Phase 2: Generate the Shopify Theme

## Entry Gate
- Normalization complete — all route files present in `input/designs/<design-slug>/normalized/`
- `site-route-map.json` exists
- DESIGN_SLUG is set

## Instructions

Generate the full Shopify theme directly from the normalized input. There is no single fixed generation command — the implementation is authored per-design based on the normalized source.

### Expected Output Structure

Under `output/<design-slug>/theme/`:
- `sections/*.liquid` — major editable UI modules
- `snippets/*.liquid` — small reusable partials
- `templates/*.json` — page composition (JSON templates with blocks and block_order)
- `assets/*.css` — shared CSS

### Repo Helpers

- `scripts/fetch-figma-file.mjs` — Figma API fetch
- `scripts/serve-preview.mjs` — serve local preview files
- `scripts/lib/design-context.mjs` — per-design path resolver
- `scripts/lib/route-specs.mjs` — route-aware input loader

Use these when they fit. If they don't match the current design, generate the needed files directly.

### Generation Discipline

- **Re-read** the normalized files before generating so section data and route mappings stay aligned
- **One coordinated pass** — avoid parallel sub-agents; fragmented generation causes mismatched schema, content, and asset references
- **No phantom references** — don't create asset tags, snippet includes, or CSS references that aren't also created in the output
- **Audit after generation** — check for orphaned assets, meaningless Liquid output, invalid block wiring, and invented content

### Shopify Theme Structure Rules

| Where | What goes there |
|---|---|
| sections/ | Major editable UI modules |
| snippets/ | Small reusable partials |
| templates/ | Page composition (JSON templates) |
| assets/ | Shared CSS/JS files |

- Use schema settings for merchant-editable text, links, images, and options
- Use blocks when a merchant needs repeatable items inside a section
- **Block-based JSON templates must include `blocks` and `block_order`** (section presets alone do not populate the live homepage)
- Standard route template families: `templates/product*.json`, `templates/collection*.json`, `templates/page*.json`
- Use alternate templates for special product/collection/page destinations

### Figma to Shopify Element Mapping

| Figma element | Shopify primitive |
|---|---|
| Heading / label / short text | text setting |
| Rich body copy | richtext setting |
| Link / CTA | url setting |
| Merchant-replaceable image | image_picker setting |
| Repeated cards / testimonials | section blocks |
| Shared controls / partials | snippets |
| Page assembly | JSON template |

See `references/shopify-mapping.md` in the orchestrator skill for the detailed mapping reference.

### Key Lessons
- Do not hardcode `collections['all']` or navigation links — use `type: collection` / `type: product` schema pickers
- Header/footer must be editable sections included via `{% section %}`, not hardcoded HTML in theme.liquid
- Do not hardcode merchant-editable copy into Liquid — use section schema settings
- Theme files do not create Shopify store resources — that is a separate task

## Exit Gate
- All sections, snippets, templates, and assets generated for every route
- Audit passes: no phantom refs, no invented content, no broken block wiring
- `cm_checkpoint_save` called with phase 2 status

<!-- Add new lessons above this line -->
