#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TARGETS = [
  { dir: "vba/modules", exts: [".bas", ".cls"], requireOptionExplicit: true },
  { dir: "vba/forms",   exts: [".txt", ".frm"], requireOptionExplicit: true },
];

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function collectFiles() {
  const files = [];
  for (const t of TARGETS) {
    const abs = join(ROOT, t.dir);
    for (const f of walk(abs)) {
      if (t.exts.some(e => f.toLowerCase().endsWith(e))) {
        files.push({ path: f, requireOptionExplicit: t.requireOptionExplicit });
      }
    }
  }
  return files;
}

// Strip a single VBA logical line: remove string literals and trailing comments.
function stripStringsAndComments(line) {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < line.length) {
    const ch = line[i];
    if (inStr) {
      if (ch === '"') {
        if (line[i + 1] === '"') { i += 2; continue; } // escaped quote
        inStr = false;
      }
      i++;
      continue;
    }
    if (ch === '"') { inStr = true; i++; continue; }
    if (ch === "'") break; // start of comment
    out += ch;
    i++;
  }
  // Handle leading "Rem " comment form
  const trimmed = out.trimStart();
  if (/^rem(\s|$)/i.test(trimmed)) return "";
  return out;
}

// Join VBA line continuations ( " _" at end of line).
function joinContinuations(rawLines) {
  const joined = [];
  let buf = "";
  let startLine = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const stripped = stripStringsAndComments(raw);
    const continuation = /\s_\s*$/.test(stripped);
    if (buf === "") startLine = i + 1;
    if (continuation) {
      buf += stripped.replace(/\s_\s*$/, " ");
    } else {
      buf += stripped;
      joined.push({ lineNo: startLine, text: buf });
      buf = "";
    }
  }
  if (buf !== "") joined.push({ lineNo: startLine, text: buf });
  return joined;
}

// Split a logical line into statements separated by ":" (but not inside (..) groups).
function splitStatements(text) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ":" && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(s => s.trim()).filter(Boolean);
}

// Block opener detectors. Each returns the kind name or null.
function detectOpener(stmt) {
  const s = stmt.replace(/\s+/g, " ").trim();
  // labels like "MyLabel:" — ignored (already split above)
  // skip declarations
  if (/^(public|private|friend|static)\s+(declare\s+)?(sub|function|property)\b/i.test(s) ||
      /^(sub|function)\b/i.test(s) ||
      /^(public|private|friend|static)?\s*property\s+(get|let|set)\b/i.test(s) ||
      /^property\s+(get|let|set)\b/i.test(s)) {
    if (/^(public|private|friend|static)\s+declare\b/i.test(s)) return null; // Declare statement
    if (/^declare\b/i.test(s)) return null;
    if (/\bproperty\s+(get|let|set)\b/i.test(s)) return "Property";
    if (/\bfunction\b/i.test(s)) return "Function";
    if (/\bsub\b/i.test(s)) return "Sub";
  }
  if (/^(public|private)?\s*type\s+\w+/i.test(s) && !/=/.test(s)) return "Type";
  if (/^(public|private)?\s*enum\s+\w+/i.test(s)) return "Enum";
  if (/^with\b/i.test(s)) return "With";
  if (/^select\s+case\b/i.test(s)) return "Select";
  if (/^for\b/i.test(s) && !/^for\s+each\b.*\bnext\b/i.test(s)) return "For";
  if (/^do(\s|$)/i.test(s) || /^do\s+(while|until)\b/i.test(s)) return "Do";
  if (/^while\b/i.test(s) && !/\bwend\b/i.test(s)) return "While";
  // Multi-line If: "If <cond> Then" with nothing after Then
  const ifMatch = /^if\b(.+?)\bthen\b(.*)$/i.exec(s);
  if (ifMatch) {
    const tail = ifMatch[2].trim();
    if (tail === "") return "If";
    return null; // single-line if
  }
  return null;
}

function detectCloser(stmt) {
  const s = stmt.replace(/\s+/g, " ").trim();
  if (/^end\s+sub\b/i.test(s)) return "Sub";
  if (/^end\s+function\b/i.test(s)) return "Function";
  if (/^end\s+property\b/i.test(s)) return "Property";
  if (/^end\s+type\b/i.test(s)) return "Type";
  if (/^end\s+enum\b/i.test(s)) return "Enum";
  if (/^end\s+with\b/i.test(s)) return "With";
  if (/^end\s+select\b/i.test(s)) return "Select";
  if (/^end\s+if\b/i.test(s)) return "If";
  if (/^next\b/i.test(s)) return "For";
  if (/^loop\b/i.test(s)) return "Do";
  if (/^wend\b/i.test(s)) return "While";
  return null;
}

function lintFile(file) {
  const text = readFileSync(file.path, "utf8");
  const rawLines = text.split(/\r?\n/);
  const errors = [];

  // Option Explicit check: search uncommented lines.
  if (file.requireOptionExplicit) {
    const hasOE = rawLines.some(l => /^\s*option\s+explicit\b/i.test(stripStringsAndComments(l)));
    if (!hasOE) errors.push({ line: 1, msg: "Missing 'Option Explicit' at top of module" });
  }

  const logical = joinContinuations(rawLines);
  const stack = []; // { kind, line }

  for (const { lineNo, text: lt } of logical) {
    for (const stmt of splitStatements(lt)) {
      const opener = detectOpener(stmt);
      if (opener) { stack.push({ kind: opener, line: lineNo }); continue; }
      const closer = detectCloser(stmt);
      if (closer) {
        const top = stack[stack.length - 1];
        if (!top) {
          errors.push({ line: lineNo, msg: `Unexpected 'End ${closer}' / closer with no matching opener` });
        } else if (top.kind !== closer) {
          errors.push({ line: lineNo, msg: `Mismatched block: expected end of '${top.kind}' opened at line ${top.line}, got closer for '${closer}'` });
          stack.pop();
        } else {
          stack.pop();
        }
      }
    }
  }
  for (const open of stack) {
    errors.push({ line: open.line, msg: `Unclosed '${open.kind}' block — missing matching End/Next/Loop/Wend` });
  }
  return errors;
}

function main() {
  const files = collectFiles();
  if (files.length === 0) {
    console.error("lint-vba: no VBA files found under vba/modules or vba/forms");
    process.exit(2);
  }
  let totalErrors = 0;
  let filesWithErrors = 0;
  for (const f of files) {
    const errs = lintFile(f);
    const rel = relative(ROOT, f.path);
    if (errs.length === 0) {
      console.log(`ok   ${rel}`);
    } else {
      filesWithErrors++;
      totalErrors += errs.length;
      console.log(`FAIL ${rel}`);
      for (const e of errs) console.log(`     line ${e.line}: ${e.msg}`);
    }
  }
  console.log("");
  console.log(`Checked ${files.length} file(s); ${filesWithErrors} with errors, ${totalErrors} issue(s) total.`);
  process.exit(totalErrors === 0 ? 0 : 1);
}

main();
