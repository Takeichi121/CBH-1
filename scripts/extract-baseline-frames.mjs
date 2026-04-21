#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

const DEFAULT_CHAPTERS = `00:00  1. Login (frmLogin)
  ??   2. Booking
  ??   3. Roster
  ??   4. Sales
  ??   5. Labor
  ??   6. Borrow
  ??   7. Announcements
  ??   8. Notifications
  ??   9. Admin
  ??  10. Requests
  ??  11. Settings
  ??  12. System log`;

function printUsage() {
  console.log(`
Extract one PNG per chapter from a baseline screencast.

Usage:
  node scripts/extract-baseline-frames.mjs \\
    --input <video.mp4> --lang <th|en> [--chapters <file>] [--out <dir>]

Required:
  --input    Path to the baseline MP4 (TH or EN pass).
  --lang     "th" or "en" — used as the output sub-folder.

Optional:
  --chapters Path to a chapters file. One chapter per line:
               MM:SS  N. Screen name
               HH:MM:SS  N. Screen name
             Lines whose timestamp is "??" are skipped with a warning.
             Default: docs/baseline-frames/chapters.txt if it exists,
             otherwise the inline template (only screen 1 has 00:00).
  --out      Output root. Default: docs/baseline-frames

Output:
  <out>/<lang>/NN-<slug>.png  (one PNG per chapter with a real timestamp)

Requires:
  ffmpeg on PATH. Install: https://ffmpeg.org/download.html
`);
}

function parseChapters(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Match "TS  N. Name" where TS is HH:MM:SS, MM:SS, or "??"
    const m = line.match(/^(\?\?|\d{1,2}(?::\d{2}){1,2})\s+(\d{1,2})\.\s*(.+)$/);
    if (!m) continue;
    out.push({ ts: m[1], num: parseInt(m[2], 10), name: m[3].trim() });
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "screen";
}

function ffmpegAvailable() {
  const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return r.status === 0;
}

function extractFrame(input, ts, outFile) {
  // -ss before -i = fast seek; -frames:v 1 = single frame; -q:v 2 = high quality
  const r = spawnSync("ffmpeg", [
    "-y", "-ss", ts, "-i", input,
    "-frames:v", "1", "-q:v", "2", outFile,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) {
    const err = r.stderr ? r.stderr.toString().split("\n").slice(-3).join("\n") : "";
    throw new Error(`ffmpeg failed for ts=${ts}\n${err}`);
  }
}

function main() {
  let args;
  try {
    args = parseArgs({
      options: {
        input:    { type: "string" },
        lang:     { type: "string" },
        chapters: { type: "string" },
        out:      { type: "string", default: "docs/baseline-frames" },
        help:     { type: "boolean", short: "h", default: false },
      },
    }).values;
  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    printUsage();
    process.exit(2);
  }

  if (args.help || !args.input || !args.lang) { printUsage(); process.exit(args.help ? 0 : 2); }
  const lang = args.lang.toLowerCase();
  if (lang !== "th" && lang !== "en") {
    console.error(`[ERROR] --lang must be "th" or "en" (got "${args.lang}")`);
    process.exit(2);
  }
  if (!existsSync(args.input)) {
    console.error(`[ERROR] Input video not found: ${args.input}`);
    process.exit(1);
  }
  if (!ffmpegAvailable()) {
    console.error(`[ERROR] ffmpeg not found on PATH. Install from https://ffmpeg.org/download.html`);
    process.exit(1);
  }

  let chaptersText;
  if (args.chapters) {
    if (!existsSync(args.chapters)) {
      console.error(`[ERROR] Chapters file not found: ${args.chapters}`);
      process.exit(1);
    }
    chaptersText = readFileSync(args.chapters, "utf8");
  } else {
    const fallback = "docs/baseline-frames/chapters.txt";
    chaptersText = existsSync(fallback) ? readFileSync(fallback, "utf8") : DEFAULT_CHAPTERS;
  }

  const chapters = parseChapters(chaptersText);
  if (chapters.length === 0) {
    console.error(`[ERROR] No chapters parsed. Expected lines like "00:42  3. Roster"`);
    process.exit(1);
  }

  const outDir = resolve(args.out, lang);
  mkdirSync(outDir, { recursive: true });

  let written = 0, skipped = 0, failed = 0;
  for (const ch of chapters) {
    const nn = String(ch.num).padStart(2, "0");
    const outFile = resolve(outDir, `${nn}-${slugify(ch.name)}.png`);
    if (ch.ts === "??") {
      console.warn(`  [skip] ${nn} ${ch.name} — timestamp not filled in`);
      skipped++; continue;
    }
    try {
      extractFrame(args.input, ch.ts, outFile);
      console.log(`  [ok]   ${nn} ${ch.name} @ ${ch.ts} -> ${outFile}`);
      written++;
    } catch (e) {
      console.error(`  [fail] ${nn} ${ch.name} @ ${ch.ts}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${written} written, ${skipped} skipped (??), ${failed} failed -> ${outDir}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
