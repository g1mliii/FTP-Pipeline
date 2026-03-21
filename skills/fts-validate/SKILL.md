---
name: fts-validate
description: >
  Phase 4 of the Figma-to-Shopify pipeline. Validates the generated theme
  with Shopify CLI. Use when the orchestrator invokes this phase, or to
  re-validate after theme edits.

  Triggers: validate Shopify theme, run theme check, Shopify CLI validation.
---

# Phase 4: Validate with Shopify CLI

## Entry Gate
- Local preview tests pass (Phase 3 complete)
- SHOPIFY_STORE and SHOPIFY_PREVIEW_THEME_ID are set
- DESIGN_SLUG is set

## Instructions

    npm run validate:shopify
    shopify theme check --path output/$env:DESIGN_SLUG/theme

Trigger auth if needed:

    shopify theme list --store $env:SHOPIFY_STORE --json

### Environment Verification Discipline

Before claiming any env var is missing, verify from the live shell:
- `echo $env:DESIGN_SLUG`
- `echo $env:SHOPIFY_STORE`
- `echo $env:SHOPIFY_PREVIEW_THEME_ID`
- `echo $env:SHOPIFY_STOREFRONT_PASSWORD`

If a value exists in the shell, do not ask the user for it again.
If a value is missing but expected from the desktop wrapper, report it as an environment handoff problem.

## Exit Gate
- `shopify theme check` passes without blocking errors
- `cm_checkpoint_save` called with phase 4 status

<!-- Add new lessons above this line -->
