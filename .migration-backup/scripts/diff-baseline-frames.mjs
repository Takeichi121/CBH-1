#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, basename } from "node:path";
import { parseArgs } from "node:util";

function printUsage() {
  console.log(`
Auto-flag visual regressions by diffing new screenshots against baseline PNGs.

For each *.png in --new that has a matching filename in --baseline, writes a
black/white diff mask PNG into --out (white = pixels that differ by more than
--threshold luma units) and prints a one-line summary:

  01-login.png: changed pixels: 1234 / 2073600 (0.06%)

Files past --flag-pct are tagged [FLAG] in the summary so the reviewer only
opens screens that actually changed.

Usage:
  node scripts/diff-baseline-frames.mjs \\
    --baseline docs/baseline-frames/th --new path\\to\\new-run-th [--out <dir>]

Required:
  --baseline   Folder of committed baseline PNGs (e.g. docs/baseline-frames/th).
  --new        Folder of fresh screenshots from this run (same filenames).

Optional:
  --out        Where to write diff PNGs. Default: <new>/diffs
  --threshold  0-255 luma delta below which a pixel is considered unchanged.
               Default: 30. Lower = stricter, higher = more AA tolerance.
  --flag-pct   Percent of changed pixels above which a screen is [FLAG]ged.
               Default: 0.5 (i.e. 0.5%).

Requires:
  ffmpeg + ffprobe on PATH. Install: https://ffmpeg.org/download.html
`);
}

function toolAvailable(name) {
  const r = spawnSync(name, ["-version"], { stdio: "ignore" });
  return r.status === 0;
}

function probeSize(pngPath) {
  const r = spawnSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0", pngPath,
  ], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe failed for ${pngPath}`);
  const [w, h] = r.stdout.trim().split(",").map(Number);
  if (!w || !h) throw new Error(`ffprobe could not read size of ${pngPath}`);
  return { w, h };
}

let _statsCounter = 0;

function diffPair(baselinePath, newPath, diffPath, threshold, workDir) {
  // The metadata filter's `file=...` option lives inside the filter graph,
  // where `:` separates options and `\` is an escape char — so an absolute
  // path like `C:\Users\...\stats.txt` (the Windows case from the manual)
  // breaks ffmpeg's filter parser. Use a plain basename and run ffmpeg with
  // cwd=workDir so the file resolves relative to that dir without ever
  // exposing filter-special characters to the parser.
  const statsBase = `_diff_stats_${process.pid}_${_statsCounter++}.txt`;
  const statsFile = join(workDir, statsBase);
  if (existsSync(statsFile)) unlinkSync(statsFile);
  // 1) scale the new shot to baseline's size so trivial window-size deltas
  //    don't blow up the diff
  // 2) absolute per-pixel difference, collapsed to grayscale
  // 3) threshold: pixels with luma delta > T become white (255), else black (0)
  // 4) signalstats + metadata=print writes YAVG to a sidecar file
  const filter =
    `[1:v][0:v]scale2ref=iw:ih[n][b];` +
    `[b][n]blend=all_mode=difference,format=gray,` +
    `geq=lum='if(gt(lum(X,Y),${threshold}),255,0)',` +
    `signalstats,metadata=mode=print:file=${statsBase}`;
  const r = spawnSync("ffmpeg", [
    "-y", "-i", baselinePath, "-i", newPath,
    "-filter_complex", filter,
    "-frames:v", "1", diffPath,
  ], { cwd: workDir, stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) {
    const err = r.stderr ? r.stderr.toString().split("\n").slice(-4).join("\n") : "";
    throw new Error(`ffmpeg failed:\n${err}`);
  }
  // YAVG is mean luma 0..255 of the thresholded mask, so:
  //   changed_pixels = round(YAVG / 255 * total_pixels)
  let yavg = 0;
  if (existsSync(statsFile)) {
    const m = readFileSync(statsFile, "utf8").match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    if (m) yavg = parseFloat(m[1]);
    try { unlinkSync(statsFile); } catch { /* ignore */ }
  }
  const { w, h } = probeSize(diffPath);
  const total = w * h;
  const changed = Math.round((yavg / 255) * total);
  return { changed, total };
}

function main() {
  let args;
  try {
    args = parseArgs({
      options: {
        baseline:    { type: "string" },
        new:         { type: "string" },
        out:         { type: "string" },
        threshold:   { type: "string", default: "30" },
        "flag-pct":  { type: "string", default: "0.5" },
        help:        { type: "boolean", short: "h", default: false },
      },
    }).values;
  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    printUsage();
    process.exit(2);
  }

  if (args.help || !args.baseline || !args.new) {
    printUsage();
    process.exit(args.help ? 0 : 2);
  }

  const threshold = parseInt(args.threshold, 10);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 255) {
    console.error(`[ERROR] --threshold must be 0..255 (got "${args.threshold}")`);
    process.exit(2);
  }
  const flagPct = parseFloat(args["flag-pct"]);
  if (!Number.isFinite(flagPct) || flagPct < 0) {
    console.error(`[ERROR] --flag-pct must be a non-negative number (got "${args["flag-pct"]}")`);
    process.exit(2);
  }

  const baselineDir = resolve(args.baseline);
  const newDir = resolve(args.new);
  const outDir = resolve(args.out || join(newDir, "diffs"));

  for (const [label, p] of [["--baseline", baselineDir], ["--new", newDir]]) {
    if (!existsSync(p) || !statSync(p).isDirectory()) {
      console.error(`[ERROR] ${label} folder not found: ${p}`);
      process.exit(1);
    }
  }
  if (!toolAvailable("ffmpeg") || !toolAvailable("ffprobe")) {
    console.error(`[ERROR] ffmpeg/ffprobe not found on PATH. Install from https://ffmpeg.org/download.html`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const isPng = (f) => f.toLowerCase().endsWith(".png");
  const baselineFiles = new Set(readdirSync(baselineDir).filter(isPng));
  const newFiles = new Set(readdirSync(newDir).filter(isPng));

  const shared = [...baselineFiles].filter((f) => newFiles.has(f)).sort();
  const onlyBaseline = [...baselineFiles].filter((f) => !newFiles.has(f)).sort();
  const onlyNew = [...newFiles].filter((f) => !baselineFiles.has(f)).sort();

  console.log(`Comparing ${shared.length} screen(s) (threshold=${threshold}, flag>=${flagPct}%)`);
  console.log(`  baseline: ${baselineDir}`);
  console.log(`  new:      ${newDir}`);
  console.log(`  diffs:    ${outDir}\n`);

  let flagged = 0, failed = 0;
  for (const file of shared) {
    const diffPath = join(outDir, file.replace(/\.png$/i, ".diff.png"));
    try {
      const { changed, total } = diffPair(
        join(baselineDir, file), join(newDir, file), diffPath, threshold, outDir,
      );
      const pct = total > 0 ? (changed / total) * 100 : 0;
      const tag = pct >= flagPct ? "[FLAG]" : "[ ok ]";
      if (pct >= flagPct) flagged++;
      console.log(`  ${tag} ${file}: changed pixels: ${changed} / ${total} (${pct.toFixed(2)}%)`);
    } catch (e) {
      failed++;
      console.error(`  [fail] ${file}: ${e.message}`);
    }
  }

  for (const f of onlyBaseline) console.warn(`  [skip] ${f}: missing in --new`);
  for (const f of onlyNew)      console.warn(`  [skip] ${f}: no baseline`);

  console.log(
    `\nDone. ${shared.length - failed} compared, ${flagged} flagged, ${failed} failed, ` +
    `${onlyBaseline.length} missing-in-new, ${onlyNew.length} new-only -> ${outDir}`,
  );
  // Exit non-zero if any pair failed OR any screen was flagged, so this is
  // CI-friendly: a green run means every screen matched within tolerance.
  process.exit(failed > 0 || flagged > 0 ? 1 : 0);
}

main();
