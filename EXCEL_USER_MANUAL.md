# BK Work Schedule — Excel Workbook User Manual / คู่มือใช้งาน

## English

### 1. Install
1. Copy these onto a Windows PC (Excel 2016+):
   - `dist/BK_Work_Schedule.xlsx`
   - the `vba/` folder
   - `scripts/export-to-excel/Setup-Workbook.vbs`
2. In Excel, go to **File → Options → Trust Center → Trust Center Settings →
   Macro Settings**. Check **Trust access to the VBA project object model**.
3. Double-click `Setup-Workbook.vbs` (or run `cscript Setup-Workbook.vbs`).
   This produces **`dist/BK_Work_Schedule.xlsm`** with VBA embedded.

### 2. First Login
- Open `BK_Work_Schedule.xlsm`. The login form appears automatically.
- The build resets every user's password to a **single default** (printed at
  the end of the export, default `Change@123`). Sign in with your existing
  username and that default password, then change it under
  **Settings → Reset Password**.
- Closing the login dialog with the **X** closes the workbook.

### 2b. Restore offline edits to PostgreSQL (optional)
When you're back online, run:
```
DATABASE_URL=... node scripts/export-to-excel/import-from-csv.mjs <backup_folder>
```
This upserts every CSV exported via **Settings → Export CSV** back into the
live database. Sessions, OTPs and AI proposal tables are intentionally
skipped.

### 3. Main Menu
After login the **Menu** sheet appears with one button per feature:
| Button | What it does |
|--------|---|
| Book My Shift | Tue–Mon grid; click `+` to book. Disabled Tue 12:00 → Wed |
| Roster | Read-only weekly schedule |
| Manager Requests | Off / com / sick / late requests; managers approve |
| Swap Requests | Request a shift swap with another user |
| Daily Sales | Enter actual/target/TC/COL/TCMH/Variance/Labor cost |
| Weekly Sales | Auto-rolled summary of the seven days |
| Labor Cost | Hours × hourly_rate vs sales |
| Borrow Tracker | Borrow in / out with branch + due date |
| Announcements | Post (manager+) and read announcements |
| Notifications | Personal feed |
| Settings | Change own password, language, backup |
| Admin (admin only) | Add/disable/delete users, reset passwords, system log |
| ไทย/English | Toggle UI language |
| Logout | Close session |

### 4. Backup
**Settings → Export CSV** writes every `data_*` table to a `backup_…`
folder next to the workbook. Use these CSVs to re-import into PostgreSQL when
you return online.

### 5. Troubleshooting
- *"Macros disabled"* → enable macros in Trust Center.
- *"Sheet protected"* → expected. Use the menu, not direct cell edits.
- *Lost admin password* → restore from a backup workbook copy. There is no
  online password reset.

---

## ภาษาไทย

### 1. การติดตั้ง
1. คัดลอกไฟล์เหล่านี้ไปยังเครื่อง Windows (Excel 2016 ขึ้นไป):
   - `dist/BK_Work_Schedule.xlsx`
   - โฟลเดอร์ `vba/`
   - `scripts/export-to-excel/Setup-Workbook.vbs`
2. ใน Excel ไปที่ **ไฟล์ → ตัวเลือก → ศูนย์ความเชื่อถือ → การตั้งค่าศูนย์ความเชื่อถือ →
   การตั้งค่า Macro** ติ๊ก **เชื่อถือการเข้าถึง VBA project object model**
3. ดับเบิลคลิก `Setup-Workbook.vbs` จะได้ไฟล์
   **`dist/BK_Work_Schedule.xlsm`** ที่มี VBA ฝังอยู่

### 2. เข้าสู่ระบบครั้งแรก
- เปิด `BK_Work_Schedule.xlsm` ฟอร์มล็อกอินจะปรากฏ
- ระหว่างสร้างไฟล์ ระบบรีเซ็ตรหัสผ่านของผู้ใช้ทุกคนเป็นค่าเริ่มต้นเดียวกัน
  (โดยปริยาย `Change@123`) เข้าสู่ระบบด้วยชื่อผู้ใช้เดิม + รหัสนี้
  แล้วเปลี่ยนทันทีที่ **ตั้งค่า → รีเซ็ตรหัสผ่าน**
- หากกดปุ่ม **X** ระบบจะปิดไฟล์

### 2b. นำข้อมูลออฟไลน์กลับเข้า PostgreSQL (ถ้ามีอินเทอร์เน็ต)
```
DATABASE_URL=... node scripts/export-to-excel/import-from-csv.mjs <backup_folder>
```
สคริปต์นี้ upsert ทุก CSV ที่ส่งออกจาก **ตั้งค่า → ส่งออก CSV** กลับฐานข้อมูล

### 3. เมนูหลัก
หลังเข้าสู่ระบบ ชีท **Menu** แสดงปุ่มฟีเจอร์ทั้งหมด
| ปุ่ม | การทำงาน |
|------|---|
| จองกะ | ตารางอังคาร–จันทร์ คลิก `+` เพื่อจอง (ปิด อ. 12:00 – พ.) |
| ตารางพนักงาน | ตารางพนักงานรายสัปดาห์ |
| คำขอผู้จัดการ | คำขอ off / com / sick / late ผู้จัดการอนุมัติ |
| คำขอสลับกะ | ขอสลับกะกับเพื่อน |
| รายงานยอดขายประจำวัน | กรอก actual/target/TC/COL/TCMH/Variance/Labor |
| รายงานยอดขายประจำสัปดาห์ | สรุปอัตโนมัติของ 7 วัน |
| ต้นทุนแรงงาน | ชั่วโมง × อัตรา หารด้วยยอดขาย |
| ยืม-คืน | ยืมเข้า/ออก พร้อมกำหนดคืน |
| ประกาศ | ผู้จัดการโพสต์ พนักงานอ่าน |
| การแจ้งเตือน | ฟีดส่วนตัว |
| ตั้งค่า | เปลี่ยนรหัสผ่าน เปลี่ยนภาษา สำรองข้อมูล |
| ผู้ดูแล (admin เท่านั้น) | เพิ่ม/ปิด/ลบผู้ใช้ รีเซ็ตรหัสผ่าน บันทึกระบบ |
| ไทย/English | สลับภาษา |
| ออกจากระบบ | ปิดเซสชัน |

### 4. สำรองข้อมูล
**ตั้งค่า → ส่งออก CSV** จะเขียนทุกตาราง `data_*` ไปยังโฟลเดอร์ `backup_…`
ข้างไฟล์ ใช้นำเข้ากลับสู่ PostgreSQL ภายหลังได้

### 5. แก้ปัญหา
- *"Macro ถูกปิด"* → เปิดใน Trust Center
- *"ชีทถูกป้องกัน"* → ตั้งใจ ใช้เมนู ไม่แก้ไขเซลล์โดยตรง
- *ลืมรหัส admin* → คืนค่าจากไฟล์สำรอง ไม่มีระบบรีเซ็ตออนไลน์


## Security note

Workbook protection (sheet password `BK1040#protect`, very-hidden data sheets, programmatic re-protect on Workbook_Open / Workbook_SheetDeactivate) is **deterrence-level**, not strong cryptographic security. Excel's sheet/structure passwords and VBA project locks are widely known to be bypassable by a determined local user. The model assumes a trusted operator distributing the file inside the organization. For stronger security, lock the VBA project before distribution (Office VBA editor → Tools → VBAProject Properties → Protection → Lock project for viewing) and consider distributing as a signed read-only template.

## Backup / Import permissions

The CSV backup and re-import buttons in **Settings** are **admin-only** by design — only the admin role can call `modData.BackupToCsv` and `modData.ImportFromCsvPrompt`. Other users will see the buttons in Settings but receive an "Access denied" message if they try.

## Trusted-input note for import-from-csv.mjs

`scripts/export-to-excel/import-from-csv.mjs` reads table and column names directly from the CSV files and constructs SQL from them. It is intended only for re-importing backups produced by this workbook on a trusted machine; never run it against untrusted input.


## Windows end-to-end test checklist

This workbook can only be exercised on Windows with Excel 2016 or newer (VBA does not run on Excel for Mac or LibreOffice). Use this checklist when validating a fresh build of `dist/BK_Work_Schedule.xlsm` on a Windows test machine. File one bug per failure and note the screen, language, and steps to reproduce.

### Pre-flight
- [ ] On the build machine (or in CI) run `node scripts/lint-vba.mjs` and confirm it exits 0 — this catches missing `Option Explicit` and unbalanced `Sub` / `Function` / `If` / `For` / `Do` / `With` / `Select Case` / `Type` / `Enum` blocks before you ever open Excel. The same check runs automatically via `.github/workflows/vba-lint.yml` on every push that touches `vba/`.
- [ ] Excel 2016+ installed on Windows 10/11
- [ ] File → Options → Trust Center → Macro Settings: "Disable all macros with notification" (then click *Enable Content* on the yellow bar)
- [ ] Run `scripts/export-to-excel/Setup-Workbook.vbs` once on the workbook to install modules and set the project name
- [ ] Confirm the workbook opens without VBA compile errors (Alt+F11 → Debug → Compile VBAProject)

### Run each screen in **both** Thai (TH) and English (EN)

For every screen below, toggle the language via the language selector and re-verify labels render correctly (no missing keys, no truncated cells, no overlapping controls).

| # | Screen | What to verify |
|---|--------|----------------|
| 1 | Login (`frmLogin`) | Valid login, wrong password, lockout, language toggle |
| 2 | Booking | Create / edit / cancel a booking, date picker, conflict detection |
| 3 | Roster | Drag-drop shifts, weekly view, persistence after close/reopen |
| 4 | Sales | Enter daily sales, totals re-calc, edit-mode lock |
| 5 | Labor | Hours entry, overtime calc, weekly totals |
| 6 | Borrow | Request, approve, return flow; balance updates |
| 7 | Announcements | Post, edit, delete; visibility per role |
| 8 | Notifications | Bell shows new items; mark-as-read clears badge |
| 9 | Admin | User CRUD, role assignment, permission toggles |
| 10 | Requests | Submit, approve, reject; audit trail in `modSysLog` |
| 11 | Settings | CSV backup (admin), re-import (admin), non-admin "Access denied" |
| 12 | System log | New events appended, no PII leakage in messages |

### Persistence checks
- [ ] After each screen's actions, save (Ctrl+S), close Excel, reopen, and confirm data survived
- [ ] Sheets remain protected on reopen (try editing a data cell directly — should be blocked)
- [ ] Very-hidden data sheets are still hidden in the Sheet tab right-click menu

### Sign-off
- [ ] All 12 screens pass in TH
- [ ] All 12 screens pass in EN
- [ ] Bugs filed for any failures, linked back to this checklist run
