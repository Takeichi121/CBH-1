#!/usr/bin/env node
/**
 * Export every PostgreSQL table to CSV files (one file per table) plus a
 * manifest.json with row counts. Output is written to exports/csv/.
 *
 * Special handling for the `users` table: the live web app stores passwords
 * with Node's `scrypt(password, salt, 64)` returning `<hex>.<salt>`. VBA
 * cannot easily run scrypt, so during export every user's `passhash` is
 * REPLACED with `SHA256(<excel_salt> + <EXCEL_DEFAULT_PASSWORD>)` and
 * `must_change_password` is forced to `1`. The default password is recorded
 * in `manifest.json.excel_default_password` and printed at the end. The user
 * sees this in EXCEL_USER_MANUAL.md.
 *
 * Usage: DATABASE_URL=... node scripts/export-to-excel/export-csv.mjs
 *        EXCEL_DEFAULT_PASSWORD=... (optional, default "Change@123")
 *        EXCEL_PASSWORD_SALT=... (optional, default "bk1040-salt-v1")
 */
import pg from "pg";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "exports", "csv");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }

const EXCEL_DEFAULT_PASSWORD = process.env.EXCEL_DEFAULT_PASSWORD || "Change@123";
const EXCEL_PASSWORD_SALT = process.env.EXCEL_PASSWORD_SALT || "bk1040-salt-v1";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
const EXCEL_DEFAULT_HASH = sha256Hex(EXCEL_PASSWORD_SALT + EXCEL_DEFAULT_PASSWORD);

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return csvEscape(JSON.stringify(v));
  if (v instanceof Date) return csvEscape(v.toISOString());
  if (typeof v === "object") return csvEscape(JSON.stringify(v));
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    );
    const manifest = {
      exportedAt: new Date().toISOString(),
      excel_password_salt: EXCEL_PASSWORD_SALT,
      // NOTE: the cleartext default password is intentionally NOT written to
      // disk. It is printed once at the end of this run, baked into the
      // workbook's hashed user rows, and must be communicated out-of-band.
      tables: [],
    };
    for (const row of tablesRes.rows) {
      const table = row.table_name;
      const colRes = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
        [table]
      );
      const cols = colRes.rows.map(r => r.column_name);
      const data = await pool.query(`SELECT * FROM "${table}"`);
      const lines = [cols.join(",")];
      for (const r of data.rows) {
        // Per-row rewrites for Excel compatibility
        if (table === "users") {
          r.passhash = EXCEL_DEFAULT_HASH;
          if ("must_change_password" in r) r.must_change_password = 1;
        }
        lines.push(cols.map(c => csvEscape(r[c])).join(","));
      }
      const file = path.join(OUT_DIR, `${table}.csv`);
      fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
      manifest.tables.push({ name: table, rows: data.rows.length, columns: cols });
      console.log(`  exported ${table}: ${data.rows.length} rows`);
    }
    fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    console.log(`\nDone. ${manifest.tables.length} tables -> ${OUT_DIR}`);
    console.log(`\n>>> Excel default password for ALL users: ${EXCEL_DEFAULT_PASSWORD}`);
    console.log(`>>> Salt baked into AppState: ${EXCEL_PASSWORD_SALT}`);
    console.log(`>>> Every user is flagged must_change_password=1.`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
