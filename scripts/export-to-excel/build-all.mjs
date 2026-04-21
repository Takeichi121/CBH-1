#!/usr/bin/env node
/**
 * Convenience wrapper: export CSVs then build the .xlsx.
 * (The .xlsm step must be run on Windows via Setup-Workbook.vbs.)
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status || 1);
}
run("node", [path.join(here, "export-csv.mjs")]);
run("node", [path.join(here, "build-workbook.mjs")]);
console.log("\n✅ dist/BK_Work_Schedule.xlsx ready.");
console.log("Next, on a Windows PC: cscript scripts\\export-to-excel\\Setup-Workbook.vbs");
