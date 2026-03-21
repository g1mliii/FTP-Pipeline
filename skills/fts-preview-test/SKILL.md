---
name: fts-preview-test
description: >
  Phase 3 of the Figma-to-Shopify pipeline. Builds local preview HTML
  for all routes and runs Playwright smoke tests. Use when the orchestrator
  invokes this phase, or to re-test an existing generated theme.

  Triggers: build preview, run Playwright tests, test local preview,
  verify theme output, screenshot routes.
---

# Phase 3: Build Local Previews and Test with Playwright

## Entry Gate
- Theme generation complete — sections, snippets, templates, assets exist under `output/<design-slug>/theme/`
- DESIGN_SLUG is set

## Instructions

Local preview plus Playwright is the **primary verification loop** and should be used before any Shopify push. This is the fastest way to catch drift from the Figma source.

### Build Previews
- Generate preview HTML for homepage and all routed destinations under `output/<design-slug>/preview/`
- Set DESIGN_SLUG in the shell before running preview scripts:
  - PowerShell: `$env:DESIGN_SLUG="<design-slug>"`
  - Or pass the slug explicitly to the script entrypoint
- Serve with `npm run preview` only after confirming preview files exist

### Run Playwright
- Screenshot each route and compare against the Figma source
- Use UI/design helper skills to refine any visual drift found during browser-based comparison

### Preview Execution Discipline
- Do NOT background a vague "preview build agent" and then wait indefinitely
- Build the preview **deterministically** in the current workspace
- Verify that `output/<design-slug>/preview/index.html` exists before serving
- If the preview file does not exist, stop and fix generation — don't wait in a loop
- If Playwright is ready but preview output is missing, that is a generation failure

### UI/Design Helper Skills

Use these after browser comparison reveals real drift:

| Skill | Use when... |
|---|---|
| `frontend-design` | Generated UI needs stronger aesthetic direction |
| `polish` | Final quality pass — alignment, spacing, typography, consistency |
| `adapt` | Responsive adaptation across screen sizes |
| `harden` | Edge cases, error states, i18n resilience |
| `audit` | Systematic quality check across accessibility, performance, theming |
| `normalize` | Standardize inconsistent patterns across sections |
| `colorize` | Color palette drifts from Figma source |

**Constraint:** Output must still be valid Shopify theme code. Don't let design refinement break Shopify theme constraints.

Playwright is not optional QA — it is the primary feedback mechanism for iterating on output quality.

## Exit Gate
- Playwright screenshots taken for all routes (homepage + every destination)
- Visual drift documented and addressed
- `cm_checkpoint_save` called with phase 3 status

<!-- Add new lessons above this line -->
