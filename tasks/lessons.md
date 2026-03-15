# Lessons Learned

This file captures mistakes, corrections, and insights from development work.

**Format**:

- **Date**: When the lesson was recorded
- **Failure Mode**: What went wrong
- **Detection Signal**: How it was caught
- **Prevention Rule**: How to avoid it next time

---

## Entries

### 2026-03-15 — Pipeline run: hardcoded collections, missing pages, missing auto-push, missing Playwright

- **Failure Mode (1)**: `fs-product-lineup.liquid` and several other sections hardcoded `collections['all']` with no `collection` picker in schema. Merchants had no way to assign a collection from the theme editor. Same issue occurred for product references and navigation links hardcoded in `theme.liquid`.
- **Detection Signal**: User reported they could not link the product lineup UI to any collection or product in the Shopify theme editor.
- **Prevention Rule**: Every section that renders products must use `type: collection` or `type: product` schema pickers. Run a grep for `collections['all']`, hardcoded product handles, and hardcoded `/pages/` paths before any push. See Gate 1 in the MANDATORY COMPLETION GATES section of the pipeline skill.

- **Failure Mode (2)**: Header and footer were hardcoded HTML inside `theme.liquid` instead of separate editable sections. Nav links were uneditable strings in source code.
- **Detection Signal**: User could not edit nav links or footer content from the theme editor.
- **Prevention Rule**: Header and footer must always be `sections/header.liquid` and `sections/footer.liquid` with full schemas. `theme.liquid` includes them via `{% section 'header' %}` / `{% section 'footer' %}` only.

- **Failure Mode (3)**: Shopify push was not done automatically — required an explicit user request.
- **Detection Signal**: User had to ask for it.
- **Prevention Rule**: `npm run push:preview` is a mandatory automatic step after Playwright passes. The pipeline is not done until the theme is live on the preview theme.

- **Failure Mode (4)**: Playwright was not run proactively — required an explicit user request. Animation verification was also skipped.
- **Detection Signal**: User had to ask to check Playwright and verify animations.
- **Prevention Rule**: Playwright runs automatically after local preview generation, and again after Shopify push. Explicitly verify animation/motion in Playwright output — do not assume animation code = working animation.

- **Failure Mode (5)**: Not all Figma pages were generated in the first pass. Some routes were deferred or omitted until prompted.
- **Detection Signal**: User noticed missing pages.
- **Prevention Rule**: All routes in the Figma must be built in one pass. Route count from Figma = required template + section count. Do not stop at homepage.

### 2026-03-15 — Stale artifacts uploaded to GitHub release

- **Failure Mode**: Windows publish script globbed all `.exe` files in `dist/`, picking up a stale artifact from a previous build with a different naming convention (spaces → GitHub converts to dots). Two Windows installers appeared in the release.
- **Detection Signal**: Noticed duplicate `Figma.Shopify.AutoBuild-*` and `Figma-Shopify-AutoBuild-*` assets in the release page.
- **Prevention Rule**: Publish scripts now match only the exact artifact filename derived from the `artifactName` pattern in `package.json`. Always verify release asset list after publishing.
