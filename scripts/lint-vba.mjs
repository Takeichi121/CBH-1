#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TARGETS = [
  { dir: "vba/modules", exts: [".bas", ".cls"], requireOptionExplicit: true, isModule: true },
  { dir: "vba/forms",   exts: [".txt", ".frm"], requireOptionExplicit: true, isModule: false },
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
        files.push({
          path: f,
          requireOptionExplicit: t.requireOptionExplicit,
          isModule: t.isModule && !f.toLowerCase().endsWith("thisworkbook.cls"),
        });
      }
    }
  }
  return files;
}

function splitTopLevelCommas(s) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
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

// ---------------------------------------------------------------------------
// Pass 2: cross-module symbol resolver.
//
// The structural pass above only checks block balance. It cannot tell that
// `modAuth.StatGet` is a typo of `modAuth.StateGet`, so a referenced symbol
// that does not exist anywhere still slips through to manual Windows testing.
//
// This pass:
//   1. For every .bas module under vba/modules/, builds a set of symbols
//      that module exports — every Sub / Function / Property / Const /
//      module-level variable / Type / Enum (and Enum members).
//   2. Scans every VBA file (modules, ThisWorkbook.cls, forms) for
//      `<knownModule>.<member>` references and verifies that <member> is
//      defined in <knownModule>'s symbol set.
//
// Limitations (documented in EXCEL_USER_MANUAL.md):
//   - Only catches typos in *qualified* references (`modX.Foo`). Unqualified
//     references would require a model of the entire VBA built-in namespace
//     to avoid false positives, which is out of scope.
//   - Treats every locally-defined Sub/Function/etc as visible to other
//     modules (we deliberately do not enforce Public vs Private here — the
//     goal is catching typos, not access-control violations).
// ---------------------------------------------------------------------------

function moduleNameOf(filePath) {
  try {
    const head = readFileSync(filePath, "utf8").split(/\r?\n/, 40);
    for (const l of head) {
      const m = /^\s*Attribute\s+VB_Name\s*=\s*"([^"]+)"/i.exec(l);
      if (m) return m[1];
    }
  } catch { /* fall through */ }
  return basename(filePath).replace(/\.[^.]+$/, "");
}

function collectModuleSymbols(filePath) {
  const text = readFileSync(filePath, "utf8");
  const rawLines = text.split(/\r?\n/);
  const logical = joinContinuations(rawLines);
  const symbols = new Set();
  const stack = [];
  let inEnum = false;

  // Always expose the module's own name as a "self" symbol so a module
  // qualifying its own helpers (e.g. `modAuth.StateGet` from inside modAuth)
  // resolves the same way it would from any other module.
  for (const { text: lt } of logical) {
    for (const stmt of splitStatements(lt)) {
      const s = stmt.trim();
      const opener = detectOpener(s);
      const closer = detectCloser(s);
      const atModuleLevel = stack.length === 0;

      if (atModuleLevel) {
        // Sub / Function
        let m = /^(?:public\s+|private\s+|friend\s+|static\s+)*(?:sub|function)\s+([A-Za-z_]\w*)/i.exec(s);
        if (m && !/^(?:public\s+|private\s+)?declare\b/i.test(s)) symbols.add(m[1].toLowerCase());

        // Property Get / Let / Set
        m = /^(?:public\s+|private\s+|friend\s+|static\s+)*property\s+(?:get|let|set)\s+([A-Za-z_]\w*)/i.exec(s);
        if (m) symbols.add(m[1].toLowerCase());

        // Const NAME [As Type] = ..., NAME2 = ...
        m = /^(?:public\s+|private\s+|global\s+)?const\s+(.+)$/i.exec(s);
        if (m) {
          for (const part of splitTopLevelCommas(m[1])) {
            const nm = /^([A-Za-z_]\w*)/.exec(part.trim());
            if (nm) symbols.add(nm[1].toLowerCase());
          }
        }

        // Module-level variables: Public / Private / Dim / Global Foo[, Bar]
        // (excluding the keywords that introduce something else entirely).
        m = /^(public|private|dim|global)\s+(.+)$/i.exec(s);
        if (m && !/^(?:const|sub|function|property|type|enum|declare)\b/i.test(m[2])) {
          let rest = m[2].replace(/^withevents\s+/i, "");
          for (const part of splitTopLevelCommas(rest)) {
            const nm = /^([A-Za-z_]\w*)/.exec(part.trim());
            if (nm) symbols.add(nm[1].toLowerCase());
          }
        }

        // Type / Enum names
        m = /^(?:public\s+|private\s+)?type\s+([A-Za-z_]\w*)/i.exec(s);
        if (m) symbols.add(m[1].toLowerCase());
        m = /^(?:public\s+|private\s+)?enum\s+([A-Za-z_]\w*)/i.exec(s);
        if (m) { symbols.add(m[1].toLowerCase()); inEnum = true; }
      } else if (inEnum) {
        // Inside an Enum block: each member identifier becomes a symbol.
        const nm = /^([A-Za-z_]\w*)\s*(?:=.*)?$/.exec(s);
        if (nm && !/^end\s+enum\b/i.test(s)) symbols.add(nm[1].toLowerCase());
      }

      if (opener) stack.push({ kind: opener });
      if (closer) {
        if (closer === "Enum") inEnum = false;
        if (stack.length > 0) stack.pop();
      }
    }
  }
  return symbols;
}

function checkQualifiedReferences(allFiles, moduleSymbolsByName) {
  const errors = []; // { file, line, msg }
  const modNames = Object.keys(moduleSymbolsByName);
  if (modNames.length === 0) return errors;
  // Sort longest-first so e.g. modRequests beats a hypothetical modReq.
  modNames.sort((a, b) => b.length - a.length);
  const re = new RegExp("\\b(" + modNames.join("|") + ")\\s*\\.\\s*([A-Za-z_]\\w*)", "gi");

  for (const f of allFiles) {
    const text = readFileSync(f.path, "utf8");
    const rawLines = text.split(/\r?\n/);
    // joinContinuations() already feeds every line through
    // stripStringsAndComments(), so `lt` below contains no string literals
    // and no `'`/`Rem` comment text. That means a fake reference inside a
    // comment (e.g. `' modAuth.NotReal`) or a string (e.g. macro-name args
    // like "modAuth.NotReal") will NOT trigger a false positive here.
    const logical = joinContinuations(rawLines);
    for (const { lineNo, text: lt } of logical) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(lt)) !== null) {
        const mod = m[1].toLowerCase();
        const member = m[2];
        const set = moduleSymbolsByName[mod];
        if (!set) continue;
        if (!set.has(member.toLowerCase())) {
          errors.push({
            file: f.path,
            line: lineNo,
            msg: `Unknown symbol '${m[1]}.${member}' — '${member}' is not defined in module '${m[1]}' (typo? rename? deleted?)`,
          });
        }
      }
    }
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
  const errsByFile = new Map();
  const pushErr = (filePath, e) => {
    if (!errsByFile.has(filePath)) errsByFile.set(filePath, []);
    errsByFile.get(filePath).push(e);
  };

  // Pass 1: structural lint
  for (const f of files) {
    for (const e of lintFile(f)) pushErr(f.path, e);
  }

  // Pass 2: build the symbol table from .bas modules, then resolve every
  // qualified reference across all files.
  const moduleSymbolsByName = {};
  for (const f of files) {
    if (!f.isModule) continue;
    const modName = moduleNameOf(f.path);
    moduleSymbolsByName[modName.toLowerCase()] = collectModuleSymbols(f.path);
  }
  for (const e of checkQualifiedReferences(files, moduleSymbolsByName)) {
    pushErr(e.file, { line: e.line, msg: e.msg });
  }

  for (const f of files) {
    const errs = errsByFile.get(f.path) || [];
    const rel = relative(ROOT, f.path);
    if (errs.length === 0) {
      console.log(`ok   ${rel}`);
    } else {
      filesWithErrors++;
      totalErrors += errs.length;
      // Stable order: by line, then by message, deduplicated.
      const seen = new Set();
      const sorted = errs
        .filter(e => { const k = `${e.line}|${e.msg}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => a.line - b.line || a.msg.localeCompare(b.msg));
      console.log(`FAIL ${rel}`);
      for (const e of sorted) console.log(`     line ${e.line}: ${e.msg}`);
    }
  }
  console.log("");
  console.log(`Checked ${files.length} file(s); ${filesWithErrors} with errors, ${totalErrors} issue(s) total.`);
  process.exit(totalErrors === 0 ? 0 : 1);
}

main();
