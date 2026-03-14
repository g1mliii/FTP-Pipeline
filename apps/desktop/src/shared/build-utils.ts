import type { BuildInput } from "./setup-types";

const FIGMA_HOSTS = new Set(["www.figma.com", "figma.com"]);
const FIGMA_ROUTE_PREFIXES = ["design", "file", "make"];

const decodeSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const sanitizeDesignSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

export const isValidDesignSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export const normalizeStoreDomain = (value: string) => value.trim().toLowerCase();

export const isValidStoreDomain = (value: string) => {
  const normalized = normalizeStoreDomain(value);
  if (!normalized) {
    return false;
  }

  if (!/^[a-z0-9.-]+$/.test(normalized) || normalized.startsWith(".") || normalized.endsWith(".")) {
    return false;
  }

  if (normalized.includes("..")) {
    return false;
  }

  return normalized.endsWith(".myshopify.com");
};

export const extractFigmaFileKey = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl.trim());
    if (!FIGMA_HOSTS.has(parsed.hostname)) {
      return null;
    }

    const segments = parsed.pathname.split("/").filter(Boolean).map(decodeSegment);
    const targetIndex = segments.findIndex((segment) => FIGMA_ROUTE_PREFIXES.includes(segment));
    if (targetIndex === -1 || !segments[targetIndex + 1]) {
      return null;
    }

    return segments[targetIndex + 1];
  } catch {
    return null;
  }
};

const extractFigmaFileName = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl.trim());
    if (!FIGMA_HOSTS.has(parsed.hostname)) {
      return null;
    }

    const segments = parsed.pathname.split("/").filter(Boolean).map(decodeSegment);
    const targetIndex = segments.findIndex((segment) => FIGMA_ROUTE_PREFIXES.includes(segment));
    if (targetIndex === -1 || !segments[targetIndex + 2]) {
      return null;
    }

    return segments[targetIndex + 2];
  } catch {
    return null;
  }
};

export const isValidFigmaUrl = (rawUrl: string) => Boolean(extractFigmaFileKey(rawUrl));

export const suggestDesignSlug = (rawUrl: string, fallbackStoreDomain = "") => {
  const fileKey = extractFigmaFileKey(rawUrl);
  const fileName = extractFigmaFileName(rawUrl);
  const nameSegment = sanitizeDesignSlug(fileName ?? "");
  const storeSegment = sanitizeDesignSlug(fallbackStoreDomain.replace(/\.myshopify\.com$/i, ""));

  if (nameSegment && fileKey) {
    return sanitizeDesignSlug(`${nameSegment}--${fileKey}`);
  }

  if (fileKey) {
    return sanitizeDesignSlug(`figma-${fileKey}`);
  }

  if (storeSegment) {
    return storeSegment;
  }

  return "";
};

export const buildClaudePrompt = ({ figmaUrl, storeDomain, designSlug }: BuildInput) => `Use the repo's AGENTS.md and the installed figma-to-shopify-pipeline Claude skill as the workflow source of truth.

Execute the full Figma-to-Shopify pipeline for this Figma file: ${figmaUrl}

Context:
- DESIGN_SLUG=${designSlug}
- SHOPIFY_STORE=${storeDomain}

Requirements:
- Normalize the design into input/designs/${designSlug}/normalized/
- Generate the Shopify theme under output/${designSlug}/theme/
- Build a local preview under output/${designSlug}/preview/ when it helps verify the implementation
- For Figma Make sources, inspect the app entry and route-bearing source files first, then normalize from those files instead of inventing structure from a broad resource list
- Use the MCP server name exactly as it is exposed by the environment; do not invent Figma server aliases
- Make every generated Shopify Liquid section, snippet, template, schema, and asset fully functional in a real Shopify theme, not just visually similar in the local preview
- Assume the Figma file is visually correct and adapt it to Shopify as faithfully as possible while preserving color palette, typography, layout, spacing, imagery treatment, borders, radii, and overall theme feel unless Shopify constraints force a real tradeoff
- Do not invent copy, testimonials, FAQ answers, nav targets, prices, product claims, policy links, or backend resources that are not present in the source or explicitly provided by the user. Mark missing values explicitly instead of fabricating them
- Treat the repo scripts as generic helpers. If a helper does not fit the design, build the required theme files, preview output, and verification steps directly instead of forcing the design into an older implementation pattern
- Finish normalization before theme generation, then re-read the normalized files and generate the theme from that locked source of truth
- Prefer one coordinated implementation pass over parallel sub-agents for theme authoring so schema, assets, and content stay consistent
- After generation, audit for phantom asset references, stray Liquid output, invalid block wiring, and invented content before moving on
- Prefer a local preview plus Playwright as the main verification loop before Shopify push so the rendered output can be checked against the Figma source in a real browser
- Cover the homepage and every routed destination represented in the Figma source
- Use Shopify-compatible route mappings when the Figma route is not directly compatible
- Use the repo's UI/design helper skills when needed for layout interpretation, cleanup, responsiveness, accessibility, polish, or visual refinement after browser-based comparison with the Figma source, but keep the final output inside Shopify theme constraints
- Use generic Figma extraction only as source interpretation. Do not let it replace normalization or Shopify-specific mapping
- Keep pushing until the theme-side route map is covered, not just the homepage
- Report any remaining missing Shopify backend resources with the exact resource type, handle, template assignment, and publishability requirement
- If the run encounters errors, visual drift, or unexpected behavior, record the general lesson in the Pipeline Improvement Log section of the skill files so future runs improve

Use the local repo workflow and do not invent a parallel folder structure.`;
