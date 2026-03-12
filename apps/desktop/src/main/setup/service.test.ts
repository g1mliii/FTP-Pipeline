import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildClaudePrompt, extractFigmaFileKey, isValidFigmaUrl, isValidStoreDomain, sanitizeDesignSlug, suggestDesignSlug } from "../../shared/build-utils";
import { backupTargets, ensureDirectoryCopy } from "../../shared/config-utils";
import { parseClaudeAuthStatus, parseClaudeMcpStatus, parseClaudePluginList, parseCodexAuthStatus, parseCodexMcpGet, parseShopifyVersion } from "../../shared/parsers";

describe("setup helper parsers", () => {
  it("parses Claude auth JSON", () => {
    const parsed = parseClaudeAuthStatus('{"loggedIn":true,"email":"test@example.com"}', "");
    expect(parsed.loggedIn).toBe(true);
    expect(parsed.detail).toContain("test@example.com");
  });

  it("parses Claude plugin list blocks", () => {
    const parsed = parseClaudePluginList(
      `
Installed plugins:

  > figma@claude-plugins-official
    Version: 1.0.0
    Scope: user
    Status: √ enabled
`,
      "figma@claude-plugins-official"
    );

    expect(parsed.installed).toBe(true);
    expect(parsed.enabled).toBe(true);
  });

  it("parses Claude MCP health for figma", () => {
    const parsed = parseClaudeMcpStatus(
      `
Checking MCP server health...

claude.ai Figma: https://mcp.figma.com/mcp - ✓ Connected
plugin:figma:figma: https://mcp.figma.com/mcp (HTTP) - ! Needs authentication
`,
      "figma"
    );

    expect(parsed.exists).toBe(true);
    expect(parsed.connected).toBe(true);
    expect(parsed.needsAuth).toBe(false);
    expect(parsed.detail).toContain("active one");
  });

  it("parses Codex MCP status", () => {
    const parsed = parseCodexMcpGet(
      `figma
  enabled: true
  transport: streamable_http
  url: https://mcp.figma.com/mcp`,
      "figma"
    );

    expect(parsed.exists).toBe(true);
    expect(parsed.enabled).toBe(true);
  });

  it("parses Codex auth status", () => {
    const parsed = parseCodexAuthStatus("Logged in using ChatGPT", "");
    expect(parsed.loggedIn).toBe(true);
    expect(parsed.detail).toContain("ChatGPT");
  });

  it("parses Shopify version output", () => {
    const parsed = parseShopifyVersion("3.72.1\n", "");
    expect(parsed.installed).toBe(true);
    expect(parsed.detail).toContain("3.72.1");
  });
});

describe("config utilities", () => {
  it("backs up files and directories", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "desktop-setup-"));
    const sourceFile = path.join(tempRoot, "source.txt");
    const sourceDir = path.join(tempRoot, "folder");
    await writeFile(sourceFile, "alpha", "utf8");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, "nested.txt"), "beta", "utf8");

    const report = await backupTargets([sourceFile, sourceDir], path.join(tempRoot, "backups"));
    expect(report.entries.length).toBe(2);
  });

  it("copies directory contents idempotently", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "desktop-copy-"));
    const source = path.join(tempRoot, "source");
    const target = path.join(tempRoot, "target");
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, "SKILL.md"), "hello", "utf8");

    await ensureDirectoryCopy(source, target);
    await ensureDirectoryCopy(source, target);

    const copied = await readFile(path.join(target, "SKILL.md"), "utf8");
    expect(copied).toBe("hello");
  });
});

describe("build helpers", () => {
  it("extracts the figma file key from design urls", () => {
    expect(extractFigmaFileKey("https://www.figma.com/design/AbCd1234/My-File?node-id=1-2")).toBe("AbCd1234");
    expect(isValidFigmaUrl("https://www.figma.com/design/AbCd1234/My-File?node-id=1-2")).toBe(true);
    expect(isValidStoreDomain("store.myshopify.com")).toBe(true);
  });

  it("suggests a stable slug from figma urls", () => {
    expect(suggestDesignSlug("https://www.figma.com/design/AbCd1234/Jewelry-Brand-Website?node-id=1-2")).toBe("jewelry-brand-website-abcd1234");
    expect(sanitizeDesignSlug(" Jewelry Brand Website -- AbCd1234 ")).toBe("jewelry-brand-website-abcd1234");
  });

  it("builds a repo-aligned Claude prompt", () => {
    const prompt = buildClaudePrompt({
      figmaUrl: "https://www.figma.com/design/AbCd1234/Jewelry-Brand-Website?node-id=1-2",
      storeDomain: "store.myshopify.com",
      designSlug: "jewelry-brand-website-abcd1234"
    });

    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("figma-to-shopify-pipeline");
    expect(prompt).toContain("input/designs/jewelry-brand-website-abcd1234/normalized/");
    expect(prompt).toContain("output/jewelry-brand-website-abcd1234/theme/");
    expect(prompt).toContain("SHOPIFY_STORE=store.myshopify.com");
    expect(prompt).toContain("scripts/test-home-preview.mjs");
    expect(prompt).toContain("scripts/test-site-preview.mjs");
  });
});
