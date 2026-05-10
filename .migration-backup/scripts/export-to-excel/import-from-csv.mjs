#!/usr/bin/env node
/**
 * Import a backup_<timestamp> folder produced by the workbook's
 * Settings → Export CSV button back into PostgreSQL.
 *
 * Strategy: per table, if a row with the same primary key (`id` or
 * `username` for users) already exists, UPDATE it; otherwise INSERT.
 * Tables without an obvious primary key are skipped with a warning.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/export-to-excel/import-from-csv.mjs <folder>
 */
import pg from "pg";
import fs from "fs";
import path from "path";

const folder = process.argv[2];
if (!folder || !fs.existsSync(folder)) {
  console.error("Usage: import-from-csv.mjs <backup_folder>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }

function parseCsv(text) {
  const rows = []; let cur = []; let v = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { v += '"'; i++; } else q = false; }
      else v += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { cur.push(v); v = ""; }
      else if (c === "\n") { cur.push(v); rows.push(cur); cur = []; v = ""; }
      else if (c === "\r") {}
      else v += c;
    }
  }
  if (v.length || cur.length) { cur.push(v); rows.push(cur); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ""));
}

// Per-table primary key. Tables not listed here fall back to "id" if the
// CSV exports an `id` column.
const PK = {
  users: "username",
  config: "key",
  stores: "id",
  borrow_branches: "id",
  borrow_items: "id",
  borrow_transactions: "id",
};
const SKIP = new Set(["sessions", "password_reset_otps", "code_proposals", "agent_requests"]);

function coerce(v) {
  if (v === "") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith(".csv"));
    for (const file of files) {
      const table = file.replace(/\.csv$/, "");
      if (SKIP.has(table)) { console.log(`skip ${table}`); continue; }
      const rows = parseCsv(fs.readFileSync(path.join(folder, file), "utf8"));
      if (rows.length < 2) { console.log(`empty ${table}`); continue; }
      const cols = rows[0];
      const pk = PK[table] || (cols.includes("id") ? "id" : null);
      if (!pk) { console.log(`! no PK for ${table}, skipping`); continue; }
      let n = 0;
      for (let i = 1; i < rows.length; i++) {
        const vals = cols.map((_, j) => coerce(rows[i][j]));
        const setClause = cols.map((c, j) => `"${c}"=EXCLUDED."${c}"`).join(",");
        const sql =
          `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(",")}) ` +
          `VALUES (${cols.map((_, j) => `$${j + 1}`).join(",")}) ` +
          `ON CONFLICT ("${pk}") DO UPDATE SET ${setClause}`;
        try { await pool.query(sql, vals); n++; }
        catch (e) { console.error(`  ${table} row ${i}: ${e.message}`); }
      }
      console.log(`imported ${table}: ${n}/${rows.length - 1}`);
    }
  } finally { await pool.end(); }
}
main().catch(e => { console.error(e); process.exit(1); });
