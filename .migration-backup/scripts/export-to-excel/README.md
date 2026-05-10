# Excel workbook build scripts

This folder contains the Node and VBScript helpers that turn the source files
under `vba/modules/` and `vba/forms/` into the distributable `.xlsm` workbook.

## Files
- `build-workbook.mjs` — main builder; assembles the workbook on a Windows host.
- `build-all.mjs` — convenience wrapper that runs the full build pipeline.
- `export-csv.mjs` / `import-from-csv.mjs` — data round-trip helpers.
- `Setup-Workbook.vbs` / `Build-Workbook.bat` — Windows entry points.

## One-click install on a stock Windows PC

`Build-Workbook.bat` no longer requires Node.js to be pre-installed. On first
run it will:

1. Use `node.exe` from `PATH` if one is already installed.
2. Otherwise reuse a portable copy in `scripts\export-to-excel\.node-portable\`.
3. Otherwise download the official Node.js LTS Windows zip from
   `https://nodejs.org/dist/` (matching the PC's CPU architecture), verify it
   against the published SHA-256 checksum (see below), and extract it into
   `.node-portable\`. That folder is gitignored.

This means a front-of-house PC with only Excel + internet access can
double-click the `.bat` file and end up with `BK_Work_Schedule.xlsm` on the
Desktop, with no separate Node.js install step.

### Tamper check on the downloaded Node.js zip

After fetching the portable Node.js zip, the installer also fetches the
matching `SHASUMS256.txt` from the same `https://nodejs.org/dist/<NODE_VER>/`
folder and confirms the zip's SHA-256 hash matches the entry published there
for that exact filename. If the hashes don't match — or the checksum file
doesn't list that filename — the install aborts with a clear error and the
half-downloaded zip and any partial extract folder are removed, so the next
run starts clean and never executes an unverified `node.exe`.

The pinned Node.js version lives in a single `set "NODE_VER=v20.18.0"` line
near the top of `Build-Workbook.bat`. To bump Node, change that one value;
the matching SHASUMS file is fetched automatically, so no checksum needs to
be hand-edited.

## Pre-flight: lint the VBA before building

Before doing a Windows test pass (or shipping a new build) run the VBA syntax
lint so that obvious typos are caught on Linux/CI instead of inside Excel:

```
node scripts/lint-vba.mjs
```

The linter scans every `*.bas` / `*.cls` under `vba/modules/` and every
`*.code.txt` / `*.frm` under `vba/forms/` and reports:

- Modules missing `Option Explicit`.
- Unbalanced `Sub` / `Function` / `Property` / `If` / `For` / `Do` / `While` /
  `With` / `Select Case` / `Type` / `Enum` blocks (missing `End ...`, `Next`,
  `Loop`, or `Wend`).
- Mismatched closers (e.g. an `End With` where an `End If` was expected).

Exit status is non-zero when any issue is found, which is what the CI workflow
at `.github/workflows/vba-lint.yml` keys off.

The linter is a static check — it will not catch every runtime problem (e.g.
typos in identifiers or wrong argument types). Those are still caught by the
Windows test pass described in `EXCEL_USER_MANUAL.md`.
