#!/usr/bin/env node
/**
 * Fetch the CSV bundle from a running BK server using a manager's
 * username + password — no DATABASE_URL required.
 *
 * Used by Build-Workbook.bat as a fallback when no .env / DATABASE_URL
 * is available on the PC. Saves the validated server URL + username
 * (NOT the password) to %APPDATA%\bk-excel\config.json so subsequent
 * runs only have to re-enter the password.
 *
 * Usage (interactive):
 *   node scripts/export-to-excel/fetch-csv-bundle.mjs
 *
 * Usage (non-interactive, e.g. CI):
 *   BK_EXCEL_API_URL=https://...  BK_EXCEL_USERNAME=...  \
 *   BK_EXCEL_PASSWORD=...  node scripts/export-to-excel/fetch-csv-bundle.mjs
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "exports", "csv");

const CONFIG_DIR  = path.join(os.homedir(), "AppData", "Roaming", "bk-excel");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); }
  catch { return {}; }
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
    // On Windows, lock the file down to the current user only so the cached
    // server URL + username can't be read by other users on the same PC.
    if (process.platform === "win32") {
      try {
        const { spawnSync } = require("node:child_process");
        spawnSync("icacls", [CONFIG_FILE, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:F`],
          { stdio: "ignore" });
      } catch { /* best-effort */ }
    }
  } catch (e) {
    console.warn(`[warn] could not save config: ${e.message}`);
  }
}

function prompt(question, { silent = false } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (silent) {
      // Mute the echo of typed characters for password input.
      const stdin = process.stdin;
      const orig = stdin.listeners("data").slice();
      process.stdout.write(question);
      let buf = "";
      const onData = (chunk) => {
        const s = chunk.toString("utf8");
        for (const ch of s) {
          if (ch === "\n" || ch === "\r" || ch === "\u0004") {
            process.stdout.write("\n");
            stdin.removeListener("data", onData);
            for (const l of orig) stdin.on("data", l);
            try { stdin.setRawMode(false); } catch {}
            stdin.pause();
            rl.close();
            resolve(buf);
            return;
          } else if (ch === "\u0003") {
            process.exit(130);
          } else if (ch === "\u007f" || ch === "\b") {
            buf = buf.slice(0, -1);
          } else {
            buf += ch;
          }
        }
      };
      for (const l of orig) stdin.removeListener("data", l);
      try { stdin.setRawMode(true); } catch {}
      stdin.resume();
      stdin.on("data", onData);
    } else {
      rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); });
    }
  });
}

function normalizeUrl(u) {
  if (!u) return u;
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s.replace(/\/+$/, "");
}

async function main() {
  const cfg = loadConfig();

  let serverUrl = process.env.BK_EXCEL_API_URL || cfg.serverUrl;
  if (!serverUrl) {
    serverUrl = await prompt("BK server URL (e.g. https://bk1040.example.com): ");
  }
  serverUrl = normalizeUrl(serverUrl);

  let username = process.env.BK_EXCEL_USERNAME || cfg.username;
  if (!username) {
    username = await prompt("Username (manager): ");
  } else {
    console.log(`Using cached username: ${username}  (set BK_EXCEL_USERNAME or delete ${CONFIG_FILE} to change)`);
  }

  let password = process.env.BK_EXCEL_PASSWORD;
  if (!password) {
    password = await prompt(`Password for ${username}: `, { silent: true });
  }

  if (!serverUrl || !username || !password) {
    console.error("[ERROR] Server URL, username, and password are all required.");
    process.exit(2);
  }

  const endpoint = `${serverUrl}/api/excel/exportCsvBundle`;
  console.log(`\nDownloading CSV bundle from ${endpoint} ...`);

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (e) {
    console.error(`[ERROR] Could not reach ${endpoint}: ${e.message}`);
    console.error(`        Check the server URL and your internet connection.`);
    process.exit(1);
  }

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j.message) msg = j.message; } catch {}
    console.error(`[ERROR] Server rejected request: ${msg}`);
    if (res.status === 401) console.error(`        Check your username/password.`);
    if (res.status === 403) console.error(`        This account does not have manager permission.`);
    process.exit(1);
  }

  const body = await res.json();
  if (!body || !body.ok || !body.files) {
    console.error(`[ERROR] Unexpected response from server.`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  for (const [name, content] of Object.entries(body.files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), content, "utf8");
    written++;
  }

  // Cache server URL + username (NEVER the password).
  saveConfig({ serverUrl, username });

  console.log(`\nDone. ${written} files written -> ${OUT_DIR}`);
  if (body.defaultPassword) {
    console.log(`\n>>> Excel default password for ALL users: ${body.defaultPassword}`);
    console.log(`>>> Salt baked into AppState: ${body.passwordSalt}`);
    console.log(`>>> Every user is flagged must_change_password=1.`);
  }
}

main().catch(e => { console.error(`[ERROR] ${e.message || e}`); process.exit(1); });
