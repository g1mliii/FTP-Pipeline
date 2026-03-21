---
name: fts-push-test
description: >
  Phase 5 of the Figma-to-Shopify pipeline. Pushes theme to a stable
  Shopify preview and runs live Playwright tests. Ends with a missing
  resource checklist. Use when the orchestrator invokes this phase, or
  to re-push after fixes.

  Triggers: push Shopify preview, test live preview, push theme, deploy
  to Shopify, final push and test.
---

# Phase 5: Push and Test the Preview Theme

## Entry Gate
- Shopify CLI validation passes (Phase 4 complete)
- SHOPIFY_STORE, SHOPIFY_PREVIEW_THEME_ID set
- DESIGN_SLUG set

## Instructions

    npm run push:preview         # pushes to the stable unpublished preview theme
    npm run test:shopify-preview # Playwright against the live Shopify preview URL

### Operational Rules
- **Avoid** `shopify theme push --unpublished` in automation — it may prompt for a theme name
- Use `shopify theme share` once to create a preview theme, then **reuse that same theme ID** every run
- Keep `SHOPIFY_STOREFRONT_PASSWORD` set if the storefront is password-protected
- A `favicon.ico` 404 is non-blocking noise
- Prefer the repo script `npm run test:shopify-preview` over ad hoc Playwright code

## Store Content Seeding (Separate Layer)

Theme generation creates route layouts. It does NOT create Shopify products, collections, or pages.

When live routes depend on missing backend resources, the final response **MUST** include a route-by-route **Missing Shopify Resource Checklist**. For each missing route, list:

- Figma route or intended storefront route
- Shopify resource type: `product`, `collection`, or `page`
- Required handle
- Suggested admin title/name
- Template to assign
- Whether it must be published / available to Online Store
- Current status: `required`, `blocked by missing resource`, or similar

### Checklist Format

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

### Closeout Formatting
- Put the missing-resource checklist at the **very end** of the final response
- If fixes are made later in the same run, **repeat the refreshed checklist** at the end
- Prefer a compact table when the client supports it
- Do not end with a generic success statement after the checklist — the checklist should be the last substantial section

## Exit Gate
- Theme pushed to preview theme successfully
- Playwright tests pass against live Shopify preview
- Missing resource checklist provided (if any routes need backend content)
- `cm_checkpoint_save` called with phase 5 status

<!-- Add new lessons above this line -->
