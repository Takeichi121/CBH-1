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
- [ ] On the build machine (or in CI) run `node scripts/lint-vba.mjs` and confirm it exits 0. The same check runs automatically via `.github/workflows/vba-lint.yml` on every push that touches `vba/`. It runs three passes plus a non-fatal dead-code report:
  - **Structural pass** — flags missing `Option Explicit` and unbalanced `Sub` / `Function` / `If` / `For` / `Do` / `With` / `Select Case` / `Type` / `Enum` / `Property` blocks.
  - **Cross-module symbol resolver** — for every qualified reference of the form `modX.Member`, confirms that `Member` is actually defined in `modX` (as a `Sub`, `Function`, `Property`, `Const`, module-level variable, `Type`, `Enum`, or enum member). This catches typos like `modAuth.StatGet` (instead of `StateGet`) and stale call sites left behind after a rename.
  - **Type-aware field/property resolver** — learns each variable's declared type from `Dim/Public/Private/Static/Global var As TypeName`, `Set var = New ClassName`, and procedure parameter lists. For every `var.field` reference whose `var` resolves to a user-defined `Type` record (in any `.bas`) or a `.cls` class, confirms `field` is actually a member of that type. This catches typos like `mySession.Roel` instead of `mySession.Role`. Variables typed as built-ins (`Worksheet`, `Range`, `Variant`, `Object`, `Long`, etc.) or as anything the linter has never seen are skipped to avoid false positives. **What it does *not* catch:** typos in *unqualified* references (e.g. a bare `StatGet` with no `modAuth.` prefix), since distinguishing user code from VBA built-ins like `MsgBox`/`Format`/`xlUp` would require modelling the entire built-in namespace; mis-typed parameter names; mis-typed members on built-in / Office-host types (anything not declared under `vba/modules/`); and arity / type mismatches. Those are still covered by *Debug → Compile VBAProject* in the Windows pre-flight step below.

#### Dead code report

After the three passes above, the linter prints a non-fatal **Dead code report** listing every `Public Sub` / `Public Function` defined under `vba/modules/` that is not referenced from any other module *and* is not named in any string literal anywhere in the codebase (so macro-name strings like `OnAction = "modUI.DoLogout"` or `Application.Run "ShowMain"` correctly count as live references). The report does not affect the linter's exit code — it is an advisory pointing at code that can probably be deleted (e.g. an old `StateGet` left behind after a rename) or downgraded to `Private`.

Self-references inside the same module do **not** save a procedure from the list: if a `Public` Sub is only called by its own module, it should be `Private`.

To exempt entry-point macros that Excel invokes by name (button `OnAction` handlers wired in code that the linter already sees as a string are picked up automatically; this exemption is for the rare cases that aren't, such as a macro listed only in the Excel ribbon customisation XML or `Workbook_Open` dispatcher), add the magic comment `'lint-vba: keep` either on the same line as the `Public Sub`/`Function` header or on the line immediately preceding it. Example:

```vba
'lint-vba: keep
Public Sub ShowMainFromRibbon()
    modUI.ShowMain
End Sub
```

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

### Reference recordings ("this is what good looks like")

Once a clean checklist run is achieved on Windows, capture a screencast so future testers and reviewers have a visual baseline to compare against. The recording is the artifact that makes regressions obvious without re-reading the whole checklist.

**Capture guidance**
- Tool: Windows built-in **Xbox Game Bar** (`Win+G` → record) or **OBS Studio** if you need chapter markers / higher quality.
- Resolution: 1080p, 30 fps is plenty. Keep the Excel window maximized.
- Audio: optional voice-over in the language being demoed; otherwise mute.
- Format: MP4 (H.264). Aim for ≤ 200 MB per language pass — split per screen if needed.
- Show the language selector toggle on screen 1 so it's obvious which pass is which.

**What to record per screen** — perform the same actions listed in the checklist table above (rows 1–12). One continuous video per language pass with chapter timestamps is preferred over 24 separate files.

**Upload location & links** — fill in once recorded:

| Pass | Link | Recorded by | Date | Build (commit / `dist/BK_Work_Schedule.xlsm` SHA) |
|------|------|-------------|------|---------------------------------------------------|
| Thai (TH) full pass | _TBD — paste shared link here_ | | | |
| English (EN) full pass | _TBD — paste shared link here_ | | | |

**Chapter markers to include in each video** (copy into the video description / shared-drive notes):

```
00:00  1. Login (frmLogin)
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
  ??  12. System log
```

Replace `??` with the actual timestamp where each screen starts. If you split into 12 short clips instead, name them `BK_screencast_<TH|EN>_<NN>_<screen>.mp4` (e.g. `BK_screencast_TH_03_roster.mp4`) and list all 12 in the table above.

### How to compare a new run to the baseline

Scrubbing a 10-minute video to find the one screen that changed is slow. Instead, extract one still per chapter from the baseline video, then compare those 12 PNGs against fresh screenshots taken during a new test pass.

**One-time setup**
1. Make sure `ffmpeg` is on PATH (Windows: download from https://ffmpeg.org/download.html and add `bin\` to PATH; or `winget install Gyan.FFmpeg`).
2. Save the chapter timestamps you filled in above into `docs/baseline-frames/chapters.txt`, one per line, exactly in the format used in the manual:

```
00:00  1. Login (frmLogin)
00:42  2. Booking
01:35  3. Roster
...
```

Lines whose timestamp is still `??` are skipped with a warning, so it's fine to commit a partial file and fill in the rest later.

**Extract baseline frames** (run once per language, after each new recording)

```
node scripts/extract-baseline-frames.mjs --input path\to\BK_baseline_TH.mp4 --lang th
node scripts/extract-baseline-frames.mjs --input path\to\BK_baseline_EN.mp4 --lang en
```

Output:

```
docs/baseline-frames/
  th/
    01-login.png
    02-booking.png
    ...
    12-system-log.png
  en/
    01-login.png
    ...
```

**Compare a new build against the baseline**
1. Run through the checklist table above on the new build, taking one screenshot per screen as you go (Win+Shift+S → save to a temp folder named, e.g., `new-run-th\01-login.png`).
2. Open the matching baseline PNG (`docs/baseline-frames/th/01-login.png`) and the new screenshot side by side. Anything visually different is a candidate regression — file it as a bug and reference both filenames.
3. If a screen was intentionally redesigned in this build, replace the corresponding baseline PNG (and re-record the chapter in the next baseline video) so future runs don't keep flagging it.

By default the script writes into `docs/baseline-frames/<lang>/`; pass `--out <dir>` to redirect somewhere else (useful when comparing two builds without overwriting the committed baseline).
