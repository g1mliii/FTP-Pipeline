---
name: fts-normalize
description: >
  Phase 1 of the Figma-to-Shopify pipeline. Normalizes raw Figma design
  source into compact JSON files per route. Use when the orchestrator
  invokes this phase, or to re-run normalization independently.

  Triggers: normalize Figma design, extract Figma to JSON, prepare design
  for Shopify generation, re-normalize design source.
---

# Phase 1: Normalize the Design

## Entry Gate
- Figma source is accessible (FIGMA_TOKEN set, or Figma Make resources available)
- DESIGN_SLUG is set in the environment

## Instructions

From a real Figma file (with FIGMA_TOKEN):

    npm run fetch:figma -- <figma-file-key>

Raw output lands under `input/figma/<design-slug>/`.

**Never convert raw Figma JSON directly into Liquid.** Always normalize first:
- Extract homepage sections into `input/designs/<design-slug>/normalized/home.json`
- Extract shared shell (header/footer) into `site-shell.json`
- Extract each routed page into `route-<name>.json`
- Create `site-route-map.json` with explicit Figma-to-Shopify route mapping
- Keep normalized files small and explicit; one file per major route or shell concern

### For Figma Make Files

Prefer `get_design_context` + `read_mcp_resource` over screenshots.
Do not rely on `get_metadata` or `get_screenshot` as primary extraction sources.
Screenshots are optional QA artifacts only.

When source code resources are available:
- Treat Make source files as the authoritative content source for copy, route structure, component names, and imagery references
- Start with the app entry and route-bearing files first, then read only the specific component/style files needed
- Use the MCP server name exactly as exposed by the tool — do not invent aliases
- Do not rewrite marketing copy, prices, testimonials, FAQs, nav labels, or product details unless the source clearly contains different values
- If a value is missing or ambiguous, mark it explicitly instead of inventing plausible filler

## Exit Gate
- All route files exist in `input/designs/<design-slug>/normalized/`
- `site-route-map.json` exists with explicit Figma → Shopify route mapping
- Route count from Figma = number of normalized route files
- `cm_checkpoint_save` called with phase 1 status

<!-- Add new lessons above this line -->
