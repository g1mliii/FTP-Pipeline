# Shopify Mapping

Use this reference when deciding how a design element should be represented in Shopify.

## Design To Shopify Primitive

- Single heading or label: `text`
- Multi-paragraph content edited by merchants: `richtext`
- CTA destination: `url`
- Merchant-swappable image: `image_picker`
- Repeated design items: section `blocks`
- Shared UI element used by multiple sections: `snippets`
- Whole-page section composition: JSON template with explicit `blocks` and `block_order` when the section itself is block-based

## Constraints

- Keep generated Liquid inside normal Shopify theme architecture.
- Prefer theme editor settings over hardcoded copy or image URLs.
- Keep section CSS in theme assets, not inline style attributes, unless there is a clear reason not to.
- Use Shopify filters and tags only where Shopify supports them.
- For local preview, mirror the same content with plain HTML. Do not pretend the local preview is a full Shopify renderer.
- For Figma Make files, treat source files pulled via MCP as the primary input. Screenshots are optional QA, not the conversion source.
- Shopify route files are not arbitrary custom server routes. Map the design into Shopify-supported resource routes and alternate templates.
- Track canonical normalized inputs under `input/designs/<design-slug>/normalized/`.
- Keep generated output under `output/<design-slug>/` so multiple design projects do not overwrite one another.

## Recommended Build Order

1. Inspect the Figma route map before writing theme code.
2. Normalize the homepage and routed pages into a compact site spec. Prefer split route files once the route map gets larger than a small single-page starter.
3. Identify which fields the merchant must be able to edit.
4. Decide whether repeated elements should be blocks.
5. Map each routed page into a Shopify template family and optional template suffix.
6. Generate Liquid plus schema.
7. Build a local preview from the same source data.
8. Run Playwright against homepage navigation and routed destinations before moving into a real Shopify theme.
9. Reuse a stable unpublished preview theme ID when pushing to Shopify.
10. Re-run Playwright against the Shopify preview and distinguish theme gaps from missing Shopify resources.

## Route Mapping Rule

Use Shopify-supported route families wherever possible:

- product detail design -> `templates/product*.json`
- collection listing design -> `templates/collection*.json`
- editorial or membership landing design -> `templates/page*.json`

If the design uses non-Shopify paths such as `/box/dusk`, choose a Shopify-supported destination and record the mapping explicitly, for example:

- `/box/dusk` -> `/products/dusk-box`
- `/membership` -> `/pages/membership`
