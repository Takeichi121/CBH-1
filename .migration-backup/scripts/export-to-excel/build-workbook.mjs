#!/usr/bin/env node
/**
 * Builds dist/BK_Work_Schedule.xlsx by:
 *   1. Creating data sheets for each CSV in exports/csv/ (hidden + protected)
 *   2. Creating UI shell sheets (Welcome, Menu, Work, Roster, ManagerRequests,
 *      SwapRequests, DailySales, WeeklySales, LaborCost, Settings, Admin,
 *      BorrowTracker, Announcements, Notifications)
 *   3. Creating config sheets (i18n, capacity, shift_groups, app_state)
 *   4. Embedding instructions for the Setup-Workbook.vbs that imports the VBA
 *      modules and saves the file as .xlsm.
 *
 * Output: dist/BK_Work_Schedule.xlsx (data only). The Windows installer turns
 * it into BK_Work_Schedule.xlsm.
 *
 * Usage: node scripts/export-to-excel/build-workbook.mjs
 */
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const CSV_DIR = path.join(ROOT, "exports", "csv");
const OUT = path.join(ROOT, "dist", "BK_Work_Schedule.xlsx");

// --- CSV parsing --------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let cur = [];
  let val = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else inQuotes = false;
      } else val += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
      else if (c === "\r") { /* skip */ }
      else val += c;
    }
  }
  if (val.length > 0 || cur.length > 0) { cur.push(val); rows.push(cur); }
  return rows.filter(r => r.length > 0 && !(r.length === 1 && r[0] === ""));
}

// --- i18n strings -------------------------------------------------------------
const I18N = [
  ["key", "en", "th"],
  ["app.title", "BK Work Schedule", "ตารางงาน BK"],
  ["app.subtitle", "Grand Diamond - Offline Workbook", "Grand Diamond - ระบบออฟไลน์"],
  ["login.title", "Sign In", "เข้าสู่ระบบ"],
  ["login.username", "Username", "ชื่อผู้ใช้"],
  ["login.password", "Password", "รหัสผ่าน"],
  ["login.submit", "Sign In", "เข้าสู่ระบบ"],
  ["login.error", "Invalid username or password", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"],
  ["login.disabled", "This account is disabled", "บัญชีนี้ถูกระงับ"],
  ["menu.title", "Main Menu", "เมนูหลัก"],
  ["menu.work", "Book My Shift", "จองกะของฉัน"],
  ["menu.roster", "Roster", "ตารางพนักงาน"],
  ["menu.requests", "Manager Requests", "คำขอผู้จัดการ"],
  ["menu.swap", "Swap Requests", "คำขอสลับกะ"],
  ["menu.sales", "Daily Sales Report", "รายงานยอดขายประจำวัน"],
  ["menu.weekly", "Weekly Sales", "รายงานยอดขายประจำสัปดาห์"],
  ["menu.labor", "Labor Cost", "ต้นทุนแรงงาน"],
  ["menu.settings", "Settings", "ตั้งค่า"],
  ["menu.admin", "Admin", "ผู้ดูแล"],
  ["menu.borrow", "Borrow Tracker", "ยืม-คืน"],
  ["menu.announce", "Announcements", "ประกาศ"],
  ["menu.notify", "Notifications", "การแจ้งเตือน"],
  ["menu.logout", "Logout", "ออกจากระบบ"],
  ["menu.lang", "ไทย / English", "English / ไทย"],
  ["common.save", "Save", "บันทึก"],
  ["common.cancel", "Cancel", "ยกเลิก"],
  ["common.delete", "Delete", "ลบ"],
  ["common.edit", "Edit", "แก้ไข"],
  ["common.close", "Close", "ปิด"],
  ["common.back", "Back", "ย้อนกลับ"],
  ["common.confirm", "Confirm", "ยืนยัน"],
  ["common.yes", "Yes", "ใช่"],
  ["common.no", "No", "ไม่"],
  ["common.date", "Date", "วันที่"],
  ["common.time", "Time", "เวลา"],
  ["common.note", "Note", "หมายเหตุ"],
  ["common.status", "Status", "สถานะ"],
  ["common.user", "User", "ผู้ใช้"],
  ["common.role", "Role", "บทบาท"],
  ["common.actions", "Actions", "การกระทำ"],
  ["common.success", "Success", "สำเร็จ"],
  ["common.error", "Error", "ผิดพลาด"],
  ["common.search", "Search", "ค้นหา"],
  ["common.export", "Export CSV", "ส่งออก CSV"],
  ["common.import", "Import CSV", "นำเข้า CSV"],
  ["common.refresh", "Refresh", "รีเฟรช"],
  ["work.title", "Book My Shift (Tue–Mon)", "จองกะ (อังคาร–จันทร์)"],
  ["work.shift_group", "Shift Group", "กลุ่มกะ"],
  ["work.capacity_full", "This shift is full", "กะนี้เต็มแล้ว"],
  ["work.maintenance", "System closed (Tue 12:00 – Wed)", "ปิดระบบ (อ. 12:00 – พ.)"],
  ["roster.title", "Weekly Roster", "ตารางพนักงานรายสัปดาห์"],
  ["sales.title", "Daily Sales Report", "รายงานยอดขายประจำวัน"],
  ["sales.actual", "Actual Sales", "ยอดขายจริง"],
  ["sales.target", "Target", "เป้าหมาย"],
  ["sales.tc", "Transactions", "จำนวนบิล"],
  ["sales.col", "COL %", "COL %"],
  ["sales.tcmh", "TCMH", "TCMH"],
  ["sales.summary_hours", "Summary Hours", "ชั่วโมงรวม"],
  ["sales.variance", "Variance Hours", "ชั่วโมง Variance"],
  ["sales.labor_cost", "Labor Cost", "ค่าแรง"],
  ["admin.users", "Users", "ผู้ใช้"],
  ["admin.reset_pwd", "Reset Password", "รีเซ็ตรหัสผ่าน"],
  ["admin.permissions", "Permissions", "สิทธิ์การใช้งาน"],
  ["admin.system_log", "System Log", "บันทึกระบบ"],
  ["borrow.title", "Borrow Tracker", "ยืม-คืน"],
  ["borrow.in", "Borrow In", "ยืมเข้า"],
  ["borrow.out", "Borrow Out", "ยืมออก"],
  ["borrow.due", "Due Date", "กำหนดคืน"],
  ["borrow.branches", "Branches", "สาขา"],
  ["borrow.items", "Items", "รายการ"],
  ["borrow.back", "Back", "ย้อนกลับ"],
  ["settings.config", "Configuration", "การตั้งค่าระบบ"],
  ["settings.labor", "Labor Settings", "การตั้งค่าค่าแรง"],
  ["settings.targets", "Daily Targets", "เป้าหมายรายวัน"],
  ["settings.store", "Store Settings", "การตั้งค่าสาขา"],
  ["settings.dropdowns", "Dropdown Options", "ตัวเลือกเมนู"],
  ["settings.capacity", "Shift Capacity", "ความจุของกะ"],
  ["settings.borrow_master", "Borrow Master Data", "ข้อมูลหลัก ยืม-คืน"],
  ["settings.capacity_hint", "Edit the capacity column then return to the menu.", "แก้ไขคอลัมน์ capacity แล้วกลับเมนู"],
  ["settings.edit_hint", "Edit the data directly. Return to the menu to re-protect.", "แก้ไขข้อมูลโดยตรง กลับเมนูเพื่อล็อคใหม่"],
  ["welcome.message", "Use the menu to navigate. Sign in to begin.", "ใช้เมนูเพื่อเริ่มใช้งาน เข้าสู่ระบบเพื่อเริ่มต้น"],
];

// --- Config / capacity defaults ----------------------------------------------
const SHIFT_GROUPS = [
  ["key", "label_en", "label_th", "default_start", "default_end", "capacity"],
  ["open",   "Open",       "เปิดร้าน",   "07:00", "16:00", 2],
  ["swing",  "Swing",      "Swing",      "09:00", "18:00", 2],
  ["lunch",  "Lunch",      "เที่ยง",      "11:00", "20:00", 2],
  ["dinner", "Dinner",     "เย็น",        "15:00", "00:00", 3],
  ["close",  "Close",      "ปิดร้าน",     "18:00", "03:00", 2],
  ["late",   "Late Night", "ดึก",         "22:00", "07:00", 2],
];

// --- Sheet styling ------------------------------------------------------------
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
const HEADER_FONT = { color: { argb: "FFFFFFFF" }, bold: true, size: 11, name: "Calibri" };
const PROTECT_PWD = "BK1040#protect";

function addHeaderRow(ws, headers) {
  const row = ws.addRow(headers);
  row.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: "middle" }; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function autoWidth(ws) {
  ws.columns.forEach(col => {
    let max = 10;
    col.eachCell({ includeEmpty: false }, c => {
      const len = String(c.value ?? "").length;
      if (len > max) max = Math.min(60, len);
    });
    col.width = max + 2;
  });
}

// --- Build --------------------------------------------------------------------
async function build() {
  if (!fs.existsSync(CSV_DIR)) {
    console.error(`Missing ${CSV_DIR}. Run export-csv.mjs first.`);
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = "BK Work Schedule";
  wb.lastModifiedBy = "build-workbook.mjs";
  wb.created = new Date();
  wb.modified = new Date();

  // ---- Welcome sheet --------------------------------------------------------
  const welcome = wb.addWorksheet("Welcome", { properties: { tabColor: { argb: "FFFFD700" } } });
  welcome.mergeCells("B2:H2");
  welcome.getCell("B2").value = "💎 BK Work Schedule — Grand Diamond";
  welcome.getCell("B2").font = { size: 22, bold: true, color: { argb: "FF1F2937" } };
  welcome.getCell("B2").alignment = { vertical: "middle", horizontal: "center" };
  welcome.getRow(2).height = 36;
  welcome.mergeCells("B4:H4");
  welcome.getCell("B4").value = "Offline Macro-Enabled Workbook (.xlsm)";
  welcome.getCell("B4").alignment = { horizontal: "center" };
  welcome.getCell("B4").font = { italic: true, color: { argb: "FF6B7280" } };

  const lines = [
    "",
    "STEP 1 — Enable macros: File → Options → Trust Center → Trust Center Settings → Macro Settings → Enable VBA macros.",
    "STEP 2 — On first open, the Login form appears automatically. Every user's password has been reset to the build-time default printed at export (default Change@123). You will be required to change it on first login.",
    "STEP 3 — Use the Main Menu to navigate (Work, Roster, Sales, Settings, Admin, etc.).",
    "STEP 4 — All data lives inside this workbook. Use Settings → Backup to export CSV snapshots.",
    "",
    "ขั้นตอน 1 — เปิดใช้งาน Macro: ไฟล์ → ตัวเลือก → ศูนย์ความเชื่อถือ → เปิดใช้งาน VBA macros",
    "ขั้นตอน 2 — เมื่อเปิดครั้งแรก ฟอร์มล็อกอินจะปรากฏ รหัสผ่านของผู้ใช้ทุกคนถูกรีเซ็ตเป็นค่าเริ่มต้น (โดยปริยาย Change@123) และต้องเปลี่ยนทันทีหลังเข้าสู่ระบบครั้งแรก",
    "ขั้นตอน 3 — ใช้เมนูหลักเพื่อเข้าถึงฟีเจอร์ต่าง ๆ",
    "ขั้นตอน 4 — ข้อมูลทั้งหมดอยู่ในไฟล์นี้ ใช้ Settings → Backup เพื่อส่งออก CSV",
  ];
  let r = 6;
  for (const t of lines) {
    welcome.mergeCells(`B${r}:H${r}`);
    welcome.getCell(`B${r}`).value = t;
    welcome.getCell(`B${r}`).alignment = { wrapText: true, vertical: "middle" };
    r++;
  }
  welcome.getColumn(1).width = 2;

  // ---- UI shell sheets (rendered + driven by VBA) ---------------------------
  const uiSheets = [
    { name: "Menu",             color: "FF2563EB" },
    { name: "Work",             color: "FF059669" },
    { name: "Roster",           color: "FF0EA5E9" },
    { name: "ManagerRequests",  color: "FFD97706" },
    { name: "SwapRequests",     color: "FFDB2777" },
    { name: "DailySales",       color: "FF7C3AED" },
    { name: "WeeklySales",      color: "FF6D28D9" },
    { name: "LaborCost",        color: "FFB45309" },
    { name: "Settings",         color: "FF475569" },
    { name: "Admin",            color: "FF991B1B" },
    { name: "BorrowTracker",    color: "FF0891B2" },
    { name: "Announcements",    color: "FFC026D3" },
    { name: "Notifications",    color: "FF65A30D" },
  ];
  for (const s of uiSheets) {
    const ws = wb.addWorksheet(s.name, { properties: { tabColor: { argb: s.color } } });
    ws.mergeCells("B2:J2");
    ws.getCell("B2").value = `${s.name} — open via Main Menu (VBA renders content here)`;
    ws.getCell("B2").font = { size: 14, bold: true };
    ws.getCell("B4").value = "If you see this message, the macro is not running. Press the Main Menu button or run macro 'ShowMain'.";
    ws.getColumn(1).width = 2;
  }

  // ---- i18n sheet -----------------------------------------------------------
  const i18n = wb.addWorksheet("i18n", { state: "hidden" });
  addHeaderRow(i18n, I18N[0]);
  for (let i = 1; i < I18N.length; i++) i18n.addRow(I18N[i]);
  autoWidth(i18n);
  // Named range for VBA lookup
  wb.definedNames.add(`i18n!$A$1:$C$${I18N.length}`, "tbl_i18n");

  // ---- Shift groups / capacity ---------------------------------------------
  const groups = wb.addWorksheet("ShiftGroups", { state: "hidden" });
  addHeaderRow(groups, SHIFT_GROUPS[0]);
  for (let i = 1; i < SHIFT_GROUPS.length; i++) groups.addRow(SHIFT_GROUPS[i]);
  autoWidth(groups);
  wb.definedNames.add(`ShiftGroups!$A$1:$F$${SHIFT_GROUPS.length}`, "tbl_shift_groups");

  // ---- App state (used by VBA for current user, language, etc.) -------------
  const manifestForSalt = JSON.parse(fs.readFileSync(path.join(CSV_DIR, "manifest.json"), "utf8"));
  const state = wb.addWorksheet("AppState", { state: "veryHidden" });
  addHeaderRow(state, ["key", "value"]);
  for (const [k, v] of [
    ["current_user", ""],
    ["current_role", ""],
    ["current_store", "BK1040"],
    ["language", "th"],
    ["session_started", ""],
    ["password_salt", manifestForSalt.excel_password_salt || "bk1040-salt-v1"],
    ["maintenance_enabled", "false"],
    ["app_version", "1.0.0"],
  ]) state.addRow([k, v]);
  autoWidth(state);

  // ---- Data sheets from CSVs ------------------------------------------------
  const manifest = JSON.parse(fs.readFileSync(path.join(CSV_DIR, "manifest.json"), "utf8"));
  for (const t of manifest.tables) {
    const csvPath = path.join(CSV_DIR, `${t.name}.csv`);
    const text = fs.readFileSync(csvPath, "utf8");
    const rows = parseCsv(text);
    if (rows.length === 0) continue;
    const sheetName = `data_${t.name}`.slice(0, 31);
    const ws = wb.addWorksheet(sheetName, { state: "hidden", properties: { tabColor: { argb: "FF374151" } } });
    addHeaderRow(ws, rows[0]);
    for (let i = 1; i < rows.length; i++) ws.addRow(rows[i]);
    autoWidth(ws);
    // Worksheet protection (still password-needed to unlock; VBA uses
    // Worksheet.Unprotect with the same password before writing).
    await ws.protect(PROTECT_PWD, {
      selectLockedCells: true, selectUnlockedCells: true,
      formatCells: false, formatColumns: false, formatRows: false,
      insertRows: false, insertColumns: false,
      deleteRows: false, deleteColumns: false, sort: false, autoFilter: false,
    });
  }

  // ---- Workbook protection (structure) -------------------------------------
  // ExcelJS doesn't support workbook-level structure protection directly; the
  // VBA WorkbookOpen handler re-applies it on every load.

  // Make sure Welcome is the active sheet
  wb.views = [{ activeTab: 0 }];

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  console.log(`Wrote ${OUT}`);
  console.log(`Next: copy the file to a Windows machine and run scripts/export-to-excel/Setup-Workbook.vbs`);
}

build().catch(e => { console.error(e); process.exit(1); });
