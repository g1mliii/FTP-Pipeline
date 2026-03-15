import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const targetRoot = path.join(desktopRoot, "build", "starter-workspace");

const rootPackage = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const runtimePackage = {
  name: "figma-shopify-pipeline-runtime",
  private: true,
  type: "module",
  scripts: {
    "fetch:figma": "node scripts/fetch-figma-file.mjs",
    preview: "node scripts/serve-preview.mjs",
    "validate:shopify": "node scripts/validate-shopify.mjs",
    "push:preview": "node scripts/push-preview-theme.mjs",
    "test:shopify-preview": "node scripts/test-shopify-preview.mjs"
  },
  dependencies: {
    playwright: rootPackage.dependencies.playwright
  }
};

const manifest = {
  version: rootPackage.version,
  generatedAt: new Date().toISOString()
};

const copyEntry = async (relativePath) => {
  await cp(path.join(repoRoot, relativePath), path.join(targetRoot, relativePath), {
    recursive: true,
    force: true
  });
};

const copyEntryIfExists = async (relativePath) => {
  try {
    await copyEntry(relativePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
};

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

for (const relativePath of ["AGENTS.md", "README.md", "scripts", "skills", "tools/context-mode"]) {
  await copyEntry(relativePath);
}
await copyEntryIfExists("input/designs");

// Install context-mode deps at build time so they are pre-bundled.
// sql.js is pure WASM/JS — no native binaries — safe to bundle for all platforms.
const contextModeTarget = path.join(targetRoot, "tools", "context-mode");
await rm(path.join(contextModeTarget, "node_modules"), { recursive: true, force: true });
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(npmCmd, ["install", "--prefix", contextModeTarget], { stdio: "inherit" });

// Patch AGENTS.md to prepend the Key Documents header if not already present
const agentsPath = path.join(targetRoot, "AGENTS.md");
const agentsContent = await readFile(agentsPath, "utf8");
if (!agentsContent.startsWith("# Workspace Guide")) {
  const header = [
    "# Workspace Guide",
    "",
    "## Key Documents",
    "",
    "- `AGENTS.md` — Pipeline workflow, Shopify rules, and Figma source handling (this file)",
    "- `AGENT.md` — Engineering standards, plan mode, task management, and error recovery",
    "- `tasks/todo.md` — Current work tracking",
    "- `tasks/lessons.md` — Mistakes and corrections log",
    "- `skills/figma-to-shopify-pipeline/SKILL.md` — Full pipeline orchestration skill",
    "- `tools/context-mode/` — Context Mode MCP server for session continuity, context virtualization, and decision tracking",
    "",
    "---",
    "",
  ].join("\n");
  await writeFile(agentsPath, header + agentsContent, "utf8");
}

// Write user-facing AGENT.md (references only files that exist in the user workspace)
await writeFile(path.join(targetRoot, "AGENT.md"), [
  "# Agent Instructions",
  "",
  "All development workflow, engineering standards, and operational patterns for this workspace are defined here.",
  "",
  "For pipeline workflow, Shopify rules, Figma source handling, and route coverage requirements, see [AGENTS.md](AGENTS.md).",
  "",
  "For the skill-specific orchestration flow, see [skills/figma-to-shopify-pipeline/SKILL.md](skills/figma-to-shopify-pipeline/SKILL.md).",
  "",
  "---",
  "",
  "## Operating Principles (Non-Negotiable)",
  "",
  "1. **Correctness over cleverness**: Prefer boring, readable solutions that are easy to maintain.",
  "2. **Smallest change that works**: Minimize blast radius; don't refactor adjacent code unless it meaningfully reduces risk.",
  "3. **Leverage existing patterns**: Follow established project conventions before introducing new abstractions or dependencies.",
  "4. **Prove it works**: \"Seems right\" is not done. Validate with tests/build/lint and/or a reliable manual repro.",
  "5. **Be explicit about uncertainty**: If you cannot verify something, say so and propose the safest next step.",
  "",
  "---",
  "",
  "## Workflow Orchestration",
  "",
  "### 1. Plan Mode Default",
  "",
  "Enter plan mode for any non-trivial task (3+ steps, multi-file change, architectural decision, performance-impacting behavior).",
  "",
  "- Include verification steps in the plan (not as an afterthought).",
  "- If new information invalidates the plan: stop, update the plan, then continue.",
  "- Write a crisp spec first when requirements are ambiguous (inputs/outputs, edge cases, success criteria).",
  "",
  "### 2. Subagent Strategy (Parallelize Intelligently)",
  "",
  "Use subagents to keep the main context clean and to parallelize:",
  "- Repo exploration and pattern discovery",
  "- Test failure triage",
  "- Dependency research",
  "",
  "Give each subagent one focused objective and a concrete deliverable.",
  "",
  "---",
  "",
  "## Task Management (File-Based, Auditable)",
  "",
  "### Plan First",
  "Write a checklist to `tasks/todo.md` for any non-trivial work. Include \"Verify\" tasks explicitly.",
  "",
  "### Define Success",
  "Add acceptance criteria (what must be true when done).",
  "",
  "### Track Progress",
  "Mark items complete as you go; keep one \"in progress\" item at a time.",
  "",
  "### Document Results",
  "Add a short \"Results\" section: what changed, where, how verified.",
  "",
  "### Capture Lessons",
  "Update `tasks/lessons.md` after corrections or postmortems.",
  "",
  "---",
  "",
  "## Error Handling and Recovery Patterns",
  "",
  "### 1. \"Stop-the-Line\" Rule",
  "If anything unexpected happens (test failures, build errors, regressions):",
  "- Stop adding features.",
  "- Preserve evidence (error output, repro steps).",
  "- Return to diagnosis and re-plan.",
  "",
  "### 2. Triage Checklist (Use in Order)",
  "1. Reproduce reliably.",
  "2. Localize the failure (which layer: Figma input, normalization, Liquid generation, Shopify validation).",
  "3. Reduce to a minimal failing case.",
  "4. Fix root cause (not symptoms).",
  "5. Verify end-to-end for the original report.",
  "",
  "### 3. Safe Fallbacks",
  "- Prefer \"safe default + warning\" over partial behavior.",
  "- Invalid Figma data should show a clear error, not a broken output state.",
  "",
  "---",
  "",
  "## Templates",
  "",
  "### Plan Template (Paste into tasks/todo.md)",
  "```",
  "## [Task Name]",
  "",
  "### Goal",
  "[One sentence description]",
  "",
  "### Acceptance Criteria",
  "- [ ] Criterion 1",
  "- [ ] Criterion 2",
  "",
  "### Steps",
  "1. [ ] Restate goal + acceptance criteria",
  "2. [ ] Locate existing implementation / patterns",
  "3. [ ] Design: minimal approach + key decisions",
  "4. [ ] Implement smallest safe slice",
  "5. [ ] Run verification",
  "6. [ ] Summarize changes + verification story",
  "7. [ ] Record lessons (if any)",
  "",
  "### Results",
  "[Fill in after completion]",
  "",
  "### Lessons",
  "[Fill in if applicable]",
  "```",
  "",
  "### Bugfix Template",
  "```",
  "## Bug: [Short Description]",
  "",
  "### Repro Steps",
  "1. Step 1",
  "2. Step 2",
  "",
  "### Expected vs Actual",
  "- Expected: [behavior]",
  "- Actual: [behavior]",
  "",
  "### Root Cause",
  "[Analysis]",
  "",
  "### Fix",
  "[Description of changes]",
  "",
  "### Verification Performed",
  "[What you ran and the outcome]",
  "```",
  "",
].join("\n"), "utf8");

// Seed tasks/ directory
await mkdir(path.join(targetRoot, "tasks"), { recursive: true });
await writeFile(path.join(targetRoot, "tasks", "README.md"), [
  "# Tasks",
  "",
  "This directory holds workflow tracking files for your Figma-to-Shopify pipeline work.",
  "",
  "- `todo.md` — Active task tracking with working notes",
  "- `lessons.md` — Mistakes, corrections, and prevention rules",
  "",
].join("\n"), "utf8");
await writeFile(path.join(targetRoot, "tasks", "todo.md"), [
  "# Current Tasks",
  "",
  "This file tracks active work using the template from `AGENT.md`.",
  "",
  "> **Context Mode MCP** is available at `tools/context-mode/`. Use `cm_index`, `cm_search`, and `cm_retrieve` to manage session context, and `cm_track_decision` / `cm_decisions_get` to record key decisions across pipeline runs.",
  "",
  "---",
  "",
  "## Working Notes",
  "",
  "**Current Context**:",
  "_Describe the design you are working on and any key constraints._",
  "",
  "**Key Decisions**:",
  "_Record any important decisions made so far._",
  "",
  "**Blockers**:",
  "_List anything that is preventing progress._",
  "",
  "---",
  "",
  "_No active tasks yet. Start a new task using the Plan Template in `AGENT.md`._",
  "",
].join("\n"), "utf8");
await writeFile(path.join(targetRoot, "tasks", "lessons.md"), [
  "# Lessons Learned",
  "",
  "This file captures mistakes, corrections, and insights from pipeline runs.",
  "",
  "**Format**:",
  "",
  "- **Date**: When the lesson was recorded",
  "- **Failure Mode**: What went wrong",
  "- **Detection Signal**: How it was caught",
  "- **Prevention Rule**: How to avoid it next time",
  "",
  "---",
  "",
  "_No lessons recorded yet._",
  "",
].join("\n"), "utf8");

// Write .claude/settings.json so Claude Code can run pipeline commands without
// prompting the user for every operation.
await mkdir(path.join(targetRoot, ".claude"), { recursive: true });
const claudeSettings = {
  permissions: {
    allow: [
      // npm / node
      "Bash(npm install:*)",
      "Bash(npm run:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      // shopify
      "Bash(shopify:*)",
      "Bash(shopify theme:*)",
      "Bash(shopify auth:*)",
      // homebrew (macOS install path)
      "Bash(brew:*)",
      // windows install path
      "Bash(winget install:*)",
      "Bash(cmd.exe /c \"where gh\" 2>&1)",
      "Bash(cmd.exe /c \"gh --version\" 2>&1)",
      "Bash(where gh:*)",
      // shell utilities
      "Bash(ls:*)",
      "Bash(chmod:*)",
      "Bash(sleep:*)",
      "Bash(curl:*)",
      "Bash(python3:*)",
      "Bash(which:*)",
      "Bash(which shopify:*)",
      "Bash(which wine:*)",
      "Bash(export:*)",
      "Bash(source:*)",
      "Bash(kill:*)",
      "Bash(timeout:*)",
      "Bash(gtimeout:*)",
      "Bash(wait:*)",
      "Bash(git log:*)",
      "Bash(git remote:*)",
      // web
      "WebSearch",
      // Figma MCP
      "mcp__claude_ai_Figma__get_design_context",
      "mcp__claude_ai_Figma__get_screenshot",
      // Playwright MCP
      "mcp__plugin_playwright_playwright__browser_navigate",
      "mcp__plugin_playwright_playwright__browser_take_screenshot",
      "mcp__plugin_playwright_playwright__browser_fill_form",
      "mcp__plugin_playwright_playwright__browser_click",
      "mcp__plugin_playwright_playwright__browser_snapshot",
      // Context Mode MCP
      "mcp__context-mode__cm_index",
      "mcp__context-mode__cm_search",
      "mcp__context-mode__cm_retrieve",
      "mcp__context-mode__cm_list",
      "mcp__context-mode__cm_checkpoint_save",
      "mcp__context-mode__cm_checkpoint_load",
      "mcp__context-mode__cm_track_decision",
      "mcp__context-mode__cm_decisions_get"
    ]
  }
};
await writeFile(
  path.join(targetRoot, ".claude", "settings.json"),
  `${JSON.stringify(claudeSettings, null, 2)}\n`,
  "utf8"
);

await writeFile(path.join(targetRoot, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`, "utf8");
await writeFile(path.join(targetRoot, "starter-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Prepared starter workspace at ${targetRoot}.`);
