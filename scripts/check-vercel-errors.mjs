#!/usr/bin/env node
/**
 * check-vercel-errors.mjs
 *
 * Snapshots recent Vercel function logs, extracts new errors,
 * deduplicates against a seen-state file, and prints JSON findings.
 *
 * Usage:
 *   node scripts/check-vercel-errors.mjs [--window-seconds 30]
 *
 * Exits 0 with JSON on stdout:
 *   { newErrors: [...], totalSeen: N }
 *
 * Exits 1 if Vercel CLI fails.
 */

import { execSync, spawn } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, "..");
const STATE_FILE = join(PROJECT_DIR, "../memory/vercel-errors-seen.json");
const WINDOW_SECONDS = parseInt(process.argv[process.argv.indexOf("--window-seconds") + 1] ?? "30", 10);
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error("VERCEL_TOKEN env var is required");
  process.exit(1);
}

// ── State management ──

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { seen: {}, lastCheck: 0 };
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function errorKey(err) {
  return createHash("md5")
    .update(`${err.path}|${err.message.slice(0, 80)}`)
    .digest("hex")
    .slice(0, 12);
}

// ── Log parsing ──

// Example line format from `vercel logs`:
// 01:50:34.85  sorcery-companion.vercel.app  error  ε POST /collection  500  Error [Pri…
const LOG_RE = /^(\S+)\s+(\S+)\s+(error|warn)\s+[εελΛλ]\s+(GET|POST|PUT|DELETE|PATCH)\s+(\S+)\s+(\d+)\s+(.*)/;

function parseLogs(raw) {
  const errors = [];
  for (const line of raw.split("\n")) {
    const m = line.match(LOG_RE);
    if (!m) continue;
    const [, time, host, level, method, path, status, message] = m;
    if (level !== "error" || parseInt(status) < 500) continue;
    errors.push({
      time,
      host,
      method,
      path,
      status: parseInt(status),
      message: message.trim(),
    });
  }
  return errors;
}

// ── Main ──

async function main() {
  const state = loadState();
  const now = Date.now();

  // Capture a snapshot of recent logs (run vercel logs for WINDOW_SECONDS then kill)
  let raw = "";
  await new Promise((resolve) => {
    const proc = spawn(
      "vercel",
      ["logs", "--token", VERCEL_TOKEN, "--no-color"],
      { cwd: PROJECT_DIR, env: { ...process.env } }
    );

    proc.stdout.on("data", (d) => (raw += d.toString()));
    proc.stderr.on("data", () => {}); // suppress CLI noise

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
    }, WINDOW_SECONDS * 1000);

    proc.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  const parsed = parseLogs(raw);
  const newErrors = [];

  for (const err of parsed) {
    const key = errorKey(err);
    if (!state.seen[key]) {
      state.seen[key] = { firstSeen: new Date().toISOString(), count: 1, ...err };
      newErrors.push({ key, ...err });
    } else {
      state.seen[key].count++;
      state.seen[key].lastSeen = new Date().toISOString();
    }
  }

  state.lastCheck = now;

  // Evict old entries (> 7 days)
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  for (const [key, entry] of Object.entries(state.seen)) {
    if (new Date(entry.firstSeen).getTime() < cutoff) delete state.seen[key];
  }

  saveState(state);

  process.stdout.write(
    JSON.stringify({ newErrors, totalSeen: Object.keys(state.seen).length }, null, 2)
  );
}

main().catch((e) => {
  console.error("check-vercel-errors failed:", e.message);
  process.exit(1);
});
