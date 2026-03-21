---
name: figma-to-shopify-pipeline
description: >
  Run the full route-aware Figma-to-Shopify theme pipeline. Orchestrates
  five phase skills in sequence: normalize, generate, preview/test, validate,
  and push/test. Always ends with an explicit Shopify resource checklist.

  Use this skill whenever the user wants to convert a Figma design into a Shopify
  theme, run the figma-to-shopify pipeline, generate Shopify Liquid from Figma
  frames or components, normalize Figma JSON for theme generation, push a preview
  theme to Shopify, validate Shopify theme routes, or do any design-to-theme
  automation work -- even if they don't call it a "pipeline" or use those exact words.
---

# Figma to Shopify Theme Pipeline — Orchestrator

This skill orchestrates five phase skills in sequence. Each phase is a separate skill with focused instructions. Invoke each phase skill when you reach it — do not try to hold all phase instructions at once.

## Session Initialization (MANDATORY)

Before writing any code:
1. Call `cm_checkpoint_load` and `cm_decisions_get` to restore prior state
2. Read `tasks/lessons.md` for known failure patterns
3. Read `references/shared-rules.md` for quality gates, route coverage, and directory conventions
4. Write a run-specific checklist to `tasks/todo.md` (see template below)

---

## Phase Sequence

Execute phases in order. Do not skip phases or run them in parallel.

| # | Phase | Skill to invoke | Entry Gate | Exit Gate |
|---|---|---|---|---|
| 1 | Normalize | `/fts-normalize` | Figma source accessible, DESIGN_SLUG set | All route files + route map in normalized/ |
| 2 | Generate | `/fts-generate` | Normalization complete, all route files present | All theme files generated, audit passes |
| 3 | Preview & Test | `/fts-preview-test` | Theme generation complete | Playwright screenshots for all routes |
| 4 | Validate | `/fts-validate` | Preview tests pass | `shopify theme check` passes |
| 5 | Push & Test | `/fts-push-test` | Validation passes | Live on preview, resource checklist at end |

### Between-Phase Protocol

After completing each phase:
1. `cm_checkpoint_save` — record phase number, status, and notes
2. `cm_track_decision` — record any failures or key decisions made
3. Update `tasks/todo.md` — check off completed items
4. Verify the exit gate before invoking the next phase skill

### After `/compact` Recovery

If context is compressed mid-run:
1. `cm_checkpoint_load` — determine which phase you were on
2. Read `references/shared-rules.md` — restore quality gates
3. Invoke only the current phase skill — don't re-read completed phases

---

## Overview

Convert the **full routed experience** from a Figma source into a Shopify theme that:
- is editable in the Shopify theme editor
- covers every routed page the Figma exposes, not just the homepage
- produces fully functional Shopify Liquid — not placeholders, mocks, or preview-only stand-ins
- is tested locally with Playwright before any Shopify store is touched
- preserves the Figma design language as faithfully as Shopify allows
- leaves only Shopify store-content creation as the remaining manual step

This pipeline is **design-agnostic**. No fixed starter templates or hardcoded section types.

Preferred sub-skill order: `figma` then `shopify-liquid-themes` then design helper skills as needed then `playwright`

---

## Figma MCP as a Reference Source

The Figma MCP tools (`get_design_context`, `get_screenshot`, etc.) are useful for upstream inspection and extraction. Use them for inspecting design structure, understanding responsive intent, and extracting content during normalization. The final implementation must be re-expressed in Shopify primitives.

---

## First-Time Setup

    npm install
    npx playwright install chromium

With live Shopify:
    $env:DESIGN_SLUG="your-design-slug"
    $env:SHOPIFY_STORE="your-store.myshopify.com"
    $env:SHOPIFY_PREVIEW_THEME_ID="1234567890"
    $env:SHOPIFY_STOREFRONT_PASSWORD="your-storefront-password"

---

## Run Checklist Template (for tasks/todo.md)

```
## Pipeline Run: <design-slug> - <date>

### Phase 1: Normalize (/fts-normalize)
- [ ] Route map inspected
- [ ] Homepage normalized
- [ ] All routes normalized
- [ ] Site shell normalized
- [ ] cm_checkpoint_save

### Phase 2: Generate Theme (/fts-generate)
- [ ] Sections generated for all routes
- [ ] Snippets + templates with blocks/block_order
- [ ] Assets generated
- [ ] Audit: no phantom refs, no invented content
- [ ] cm_checkpoint_save

### Phase 3: Preview & Test (/fts-preview-test)
- [ ] Preview HTML for all routes
- [ ] Playwright screenshots taken
- [ ] Visual drift addressed
- [ ] cm_checkpoint_save

### Phase 4: Shopify Validation (/fts-validate)
- [ ] shopify theme check passes
- [ ] cm_checkpoint_save

### Phase 5: Push & Test (/fts-push-test)
- [ ] Preview theme pushed
- [ ] Playwright against live preview
- [ ] Missing resource checklist at end
- [ ] cm_checkpoint_save

### Completion Gates
- [ ] All Figma routes covered
- [ ] All sections have working schema
- [ ] No hardcoded merchant content
- [ ] Resource checklist is final section
```

---

## Pipeline Improvement Log

Record general lessons from pipeline runs here. Review at the start of each run.

### Lessons

- When Shopify backend resources are still missing, repeat the refreshed checklist at the very end of the final response so it is not buried above later fixes or push output.
- Before declaring Shopify env vars missing, verify them from the live shell session. A desktop wrapper or prior setup step may have already populated them.
- When testing a password-protected Shopify preview, prefer `npm run test:shopify-preview` over improvised Playwright code so the stored storefront password path is actually used.
- Preview serving depends on the active design context. Set `DESIGN_SLUG` in the shell or pass the slug explicitly before running preview scripts.
- Do not wait on an open-ended background preview agent. Generate the preview deterministically, confirm the files exist, then start the preview server and Playwright.
- For Figma Make runs, read the app entry and route-bearing source files first, then normalize from those files instead of improvising from a broad file dump.
- Do not invent storefront copy, testimonials, FAQs, navigation targets, prices, or product claims during normalization or template generation. Unknown values should stay explicit and unresolved.
- Avoid parallel sub-agent theme generation before the normalized source is finalized and re-read. It increases schema drift, phantom asset references, and inconsistent section content.
- Re-check generated Liquid for stray debug/output lines and orphaned asset tags before moving on to preview or Playwright.
- Use the exact MCP server name exposed by the environment. Do not assume or synthesize a server alias for Figma resources.
- Block-based homepage sections need `blocks` and `block_order` in the JSON template. Section presets alone do not populate the live homepage.
- Reuse a stable preview theme ID for automation. Creating a new preview on each run is fragile.
- `shopify theme push --unpublished` may prompt for a theme name in automation contexts — avoid it.
- Local preview plus Playwright catches most visual drift faster than Shopify push plus manual inspection.
- A component is not done just because the preview looks right. Liquid output, schema behavior, and theme editor usability all have to work.
- The Figma Make route map should be inspected early so dedicated pages are not accidentally deferred behind the homepage.
- A strong closeout always names remaining Shopify resources explicitly, route by route, instead of only saying "backend content is missing."
- Keep local preview assertions aligned with actual section selectors, not brittle raw-text matching.
- UI/design helper skills are most useful after browser-based comparison exposes real drift from the Figma source.
- Do not hardcode merchant-editable copy into Liquid — it should live in section schema settings.
- Generated Playwright screenshots, preview HTML, and generated theme output should be gitignored.

<!-- Add new lessons above this line -->
