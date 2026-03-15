#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load sql.js WASM from the local node_modules
const initSqlJs = require("sql.js");
const wasmPath = join(__dirname, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const SQL = await initSqlJs({ wasmBinary: readFileSync(wasmPath) });

// Store DB at ~/.claude/context-mode/context.db
const DB_DIR = join(homedir(), ".claude", "context-mode");
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = join(DB_DIR, "context.db");

// Load existing DB from disk or create new
const db = existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

// Persist DB to disk after writes
const persist = () => writeFileSync(DB_PATH, db.export());

db.run(`
  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    source TEXT,
    body TEXT NOT NULL,
    body_size INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    task TEXT NOT NULL,
    active_files TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    outcome TEXT NOT NULL,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);
persist();

// Use cwd as project ID so sessions are scoped per workspace
const PROJECT_ID = process.env.CONTEXT_MODE_PROJECT || process.cwd();

// Helper: run a SELECT and return rows as objects
const query = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

// Helper: run INSERT/UPDATE/DELETE
const run = (sql, params = []) => {
  db.run(sql, params);
  persist();
};

// ─── Server ─────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "context-mode", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "cm_index",
      description:
        "Store large content (file contents, CLI output, Playwright results, API responses) in a local SQLite database. Returns a compact ID token instead of dumping the raw data into context. Use this proactively before reading any large file or processing bulky output to keep context lean.",
      inputSchema: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description: "Short descriptive name, e.g. 'main-product.liquid', 'playwright stdout', 'shopify theme list output'",
          },
          content: { type: "string", description: "The full content to store locally" },
          source: { type: "string", description: "Optional file path or URL this came from" },
        },
        required: ["label", "content"],
      },
    },
    {
      name: "cm_search",
      description:
        "Search across all content indexed in this project session. Use instead of re-reading files — search for the specific part you need.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords to search for in indexed content" },
          limit: { type: "number", description: "Max results to return (default: 5)" },
        },
        required: ["query"],
      },
    },
    {
      name: "cm_retrieve",
      description:
        "Retrieve full stored content by ID. Only use when you need the complete raw data — prefer cm_search for targeted access.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Content ID from cm_index result" },
        },
        required: ["id"],
      },
    },
    {
      name: "cm_list",
      description: "List all content indexed in this project session with IDs and sizes.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "cm_checkpoint_save",
      description:
        "Save a session checkpoint — a compact snapshot of current progress, active files, and next steps. Call this after completing any major step and before /compact. The checkpoint is re-injected automatically on cm_checkpoint_load so sessions can run 3x longer.",
      inputSchema: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "Current task and progress — what has been done, what is next, what is blocked",
          },
          active_files: {
            type: "array",
            items: { type: "string" },
            description: "Files currently being worked on",
          },
          notes: {
            type: "string",
            description: "Key context: decisions made, blockers, env var values, important state",
          },
        },
        required: ["task"],
      },
    },
    {
      name: "cm_checkpoint_load",
      description:
        "Load the most recent checkpoint for this project. Call this at the start of a new session or immediately after /compact to restore full session context without re-reading the whole conversation.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "cm_track_decision",
      description:
        "Record a decision, approach tried, or failure so it is not repeated after context resets. Especially useful for: failed Liquid schema patterns, wrong CLI flags, approaches that caused errors, confirmed working solutions.",
      inputSchema: {
        type: "object",
        properties: {
          decision: { type: "string", description: "What was decided, tried, or discovered" },
          outcome: {
            type: "string",
            enum: ["succeeded", "failed", "partial", "abandoned", "noted"],
            description: "Result of this decision or attempt",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags for filtering, e.g. ['schema', 'playwright', 'shopify-push', 'collections']",
          },
        },
        required: ["decision", "outcome"],
      },
    },
    {
      name: "cm_decisions_get",
      description:
        "Get recorded decisions and outcomes for this session. Call at session start or after /compact to avoid repeating failed approaches.",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Optional: filter by tag" },
          outcome: {
            type: "string",
            description: "Optional: filter by outcome (failed, succeeded, etc.)",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "cm_index") {
      const id = randomUUID().slice(0, 8);
      const body = String(args.content);
      const bodySize = Buffer.byteLength(body, "utf8");
      run(
        "INSERT OR REPLACE INTO content (id, project_id, label, source, body, body_size) VALUES (?, ?, ?, ?, ?, ?)",
        [id, PROJECT_ID, String(args.label), args.source ? String(args.source) : null, body, bodySize]
      );

      const lines = body.split("\n").length;
      const tokenEstimate = Math.ceil(bodySize / 4);
      const savedTokens = tokenEstimate - 20;
      const reduction = Math.round((savedTokens / tokenEstimate) * 100);

      return {
        content: [{
          type: "text",
          text: `[INDEXED:${id}] "${args.label}" — ${(bodySize / 1024).toFixed(1)}KB / ${lines} lines stored locally.\nEstimated context saved: ~${savedTokens.toLocaleString()} tokens (${reduction}% reduction).\nUse cm_search or cm_retrieve("${id}") to access.`,
        }],
      };
    }

    if (name === "cm_search") {
      const limit = Number(args.limit ?? 5);
      const terms = String(args.query).toLowerCase().split(/\s+/).filter(Boolean);
      const rows = query(
        "SELECT id, label, source, body, body_size, created_at FROM content WHERE project_id = ? ORDER BY created_at DESC LIMIT 100",
        [PROJECT_ID]
      );

      const scored = rows
        .map((r) => {
          const haystack = (r.label + " " + r.body).toLowerCase();
          const hits = terms.filter((t) => haystack.includes(t)).length;
          return { ...r, hits };
        })
        .filter((r) => r.hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, limit);

      if (!scored.length) {
        return { content: [{ type: "text", text: "No indexed content matched that query." }] };
      }

      const text = scored
        .map((r) => {
          // Extract a snippet around the first matching term
          const body = r.body.toLowerCase();
          const firstTerm = terms.find((t) => body.includes(t));
          const idx = firstTerm ? body.indexOf(firstTerm) : 0;
          const start = Math.max(0, idx - 80);
          const snippet = r.body.slice(start, start + 200).replace(/\n/g, " ").trim();
          return `[${r.id}] ${r.label}${r.source ? ` (${r.source})` : ""} — ${(r.body_size / 1024).toFixed(1)}KB\n  ...${snippet}...`;
        })
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    }

    if (name === "cm_retrieve") {
      const rows = query("SELECT body FROM content WHERE id = ?", [String(args.id)]);
      if (!rows.length) {
        return { content: [{ type: "text", text: `No content found for ID: ${args.id}` }] };
      }
      return { content: [{ type: "text", text: rows[0].body }] };
    }

    if (name === "cm_list") {
      const rows = query(
        "SELECT id, label, source, body_size, created_at FROM content WHERE project_id = ? ORDER BY created_at DESC LIMIT 30",
        [PROJECT_ID]
      );
      if (!rows.length) {
        return { content: [{ type: "text", text: "No content indexed yet for this project." }] };
      }
      const text = rows
        .map((r) => `[${r.id}] ${r.label}${r.source ? ` (${r.source})` : ""} — ${(r.body_size / 1024).toFixed(1)}KB — ${r.created_at}`)
        .join("\n");
      return { content: [{ type: "text", text }] };
    }

    if (name === "cm_checkpoint_save") {
      run(
        "INSERT INTO checkpoints (project_id, task, active_files, notes) VALUES (?, ?, ?, ?)",
        [
          PROJECT_ID,
          String(args.task),
          args.active_files ? JSON.stringify(args.active_files) : null,
          args.notes ? String(args.notes) : null,
        ]
      );
      return {
        content: [{ type: "text", text: "✓ Checkpoint saved. After /compact, run cm_checkpoint_load to restore full session context." }],
      };
    }

    if (name === "cm_checkpoint_load") {
      const rows = query(
        "SELECT * FROM checkpoints WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
        [PROJECT_ID]
      );
      if (!rows.length) {
        return { content: [{ type: "text", text: "No checkpoint found for this project." }] };
      }
      const cp = rows[0];
      const files = cp.active_files ? JSON.parse(cp.active_files) : [];
      const lines = [
        `## Session Checkpoint — ${cp.created_at}`,
        `**Task:** ${cp.task}`,
        files.length ? `**Active files:** ${files.join(", ")}` : null,
        cp.notes ? `**Notes:** ${cp.notes}` : null,
        `\nRun cm_decisions_get to review past decisions. Run cm_list to see indexed content.`,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [{ type: "text", text: lines }] };
    }

    if (name === "cm_track_decision") {
      run(
        "INSERT INTO decisions (project_id, decision, outcome, tags) VALUES (?, ?, ?, ?)",
        [
          PROJECT_ID,
          String(args.decision),
          String(args.outcome),
          args.tags ? JSON.stringify(args.tags) : null,
        ]
      );
      return { content: [{ type: "text", text: `Decision recorded [${args.outcome}].` }] };
    }

    if (name === "cm_decisions_get") {
      let rows = query(
        "SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC LIMIT 100",
        [PROJECT_ID]
      );

      if (args.tag) {
        rows = rows.filter((d) => {
          try { return JSON.parse(d.tags || "[]").includes(args.tag); } catch { return false; }
        });
      }
      if (args.outcome) {
        rows = rows.filter((d) => d.outcome === args.outcome);
      }

      if (!rows.length) {
        return { content: [{ type: "text", text: "No decisions recorded yet." }] };
      }

      const text = rows
        .map((d) => {
          const tags = d.tags ? JSON.parse(d.tags) : [];
          return `[${d.outcome.toUpperCase()}] ${d.decision}${tags.length ? ` (${tags.join(", ")})` : ""} — ${d.created_at}`;
        })
        .join("\n");
      return { content: [{ type: "text", text }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `context-mode error: ${err?.message ?? String(err)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
