import type { BuildInput } from "./setup-types";

const FIGMA_HOSTS = new Set(["www.figma.com", "figma.com"]);

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
    const targetIndex = segments.findIndex((segment) => ["design", "file"].includes(segment));
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
    const targetIndex = segments.findIndex((segment) => ["design", "file"].includes(segment));
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

Execute the full route-aware Figma-to-Shopify flow for this Figma file: ${figmaUrl}

Context:
- DESIGN_SLUG=${designSlug}
- SHOPIFY_STORE=${storeDomain}

Requirements:
- Normalize the design into input/designs/${designSlug}/normalized/
- Generate the Shopify theme under output/${designSlug}/theme/
- Build the local preview and leave it ready for scripts/test-home-preview.mjs and scripts/test-site-preview.mjs to run in visible Playwright mode
- Cover the homepage and every routed destination represented in the Figma source
- Use Shopify-compatible route mappings when the Figma route is not directly compatible
- Keep pushing until the theme-side route map is covered, not just the homepage
- Report any remaining missing Shopify backend resources with the exact resource type, handle, template assignment, and publishability requirement

Use the local repo workflow and do not invent a parallel folder structure.`;
