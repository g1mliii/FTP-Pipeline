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
- Treat every generated section, snippet, and template as production-grade theme code — valid Liquid syntax, valid schema with correct setting types and working defaults, correct asset references, working merchant-editable settings, and working blocks with `block_order` in JSON templates. A visually similar placeholder or preview-only stand-in is not enough. A component is incomplete if the preview looks right but schema, settings, blocks, or asset references are broken or fake.
- Treat the Figma file as the visual source of truth. Preserve the design language as closely as possible during Shopify adaptation:
  - colors and tonal balance
  - typography and hierarchy
  - spacing rhythm and layout structure
  - imagery treatment, borders, radii, and shape language
  - interaction and motion style when Shopify can support it
- Prefer theme editor settings over hardcoded copy or image URLs.
- Keep section CSS in theme assets, not inline style attributes, unless there is a clear reason not to.
- Use Shopify filters and tags only where Shopify supports them.
- For local preview, mirror the same content with plain HTML. Do not pretend the local preview is a full Shopify renderer.
- For Figma Make files, treat source files pulled via MCP as the primary input. Screenshots are optional QA, not the conversion source.
- For Figma Make files with code resources, start from the app entry and route-bearing source files first, then read only the specific components/styles needed to lock normalization.
- Shopify route files are not arbitrary custom server routes. Map the design into Shopify-supported resource routes and alternate templates.
- Track canonical normalized inputs under `input/designs/<design-slug>/normalized/`.
- Keep generated output under `output/<design-slug>/` so multiple design projects do not overwrite one another.
- Use the generic `figma` skill for upstream inspection or regular web interpretation when helpful, but do not let it replace normalization or Shopify-specific mapping.
- Use the UI/design helper skills (from the Impeccable suite: `frontend-design`, `polish`, `adapt`, `harden`, `audit`, `critique`, `normalize`, `colorize`, `bolder`, `quieter`, `animate`, `delight`, `clarify`, `distill`, `extract`, `optimize`) when the design needs cleanup or interpretation, especially after browser-based comparison with the Figma source, but keep their output constrained to Shopify theme primitives and the actual implementation for the current design.
- Playwright is the primary verification loop. Use it to compare rendered output against the Figma source before Shopify push, and again after pushing to the live preview theme.
- Do not invent copy, reviews, FAQs, policy links, route targets, or missing backend resources. Keep missing values explicit and map only what the source actually supports.
- Preview verification should be deterministic: generate preview output first, confirm the files exist, then serve and test under the active `DESIGN_SLUG` context.

## Recommended Build Order

1. Inspect the Figma route map before writing theme code.
2. Normalize the homepage and routed pages into a compact site spec. Prefer split route files once the route map gets larger than a small single-page implementation.
3. Identify which fields the merchant must be able to edit.
4. Decide whether repeated elements should be blocks.
5. Map each routed page into a Shopify template family and optional template suffix.
6. Generate Liquid plus schema while preserving the normalized visual tokens and layout intent.
7. Re-read the normalized files and check for unresolved values before writing theme files.
8. Check that each generated Liquid component is functionally complete in Shopify, not only visually close.
9. Audit for phantom asset references, stray Liquid output, and invalid template block wiring.
10. Build a local preview from the same source data whenever practical.
11. Run Playwright against homepage navigation and routed destinations before moving into a real Shopify theme.
12. Use the browser output to compare against the Figma design and refine visual drift with the UI/design helper skills.
13. Reuse a stable unpublished preview theme ID when pushing to Shopify.
14. Re-run Playwright against the Shopify preview and distinguish theme gaps from missing Shopify resources.

## Route Mapping Rule

Use Shopify-supported route families wherever possible:

- product detail design -> `templates/product*.json`
- collection listing design -> `templates/collection*.json`
- editorial, marketing, or about-page design -> `templates/page*.json`

If the design uses non-Shopify paths such as `/campaign/holiday`, choose a Shopify-supported destination and record the mapping explicitly, for example:

- `/campaign/holiday` -> `/pages/holiday`
- `/feature/hero-product` -> `/products/hero-product`
