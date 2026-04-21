# BK_Work_Schedule.xlsm — Design

## Goal
A standalone Excel Macro-Enabled Workbook that replicates the Grand Diamond
work-schedule web app for Excel 2016+ on Windows. No server, no internet.

## Build pipeline
```
PostgreSQL ──► export-csv.mjs ──► exports/csv/*.csv
                                       │
                                       ▼
                          build-workbook.mjs (Node + ExcelJS)
                                       │
                                       ▼
                       dist/BK_Work_Schedule.xlsx (data only)
                                       │
                          ┌────────────┴───────────────┐
                          ▼                            │
              Setup-Workbook.vbs (Windows)             │
              imports vba/**/*.bas/*.cls/*.frm         │
                          │                            │
                          ▼                            │
              dist/BK_Work_Schedule.xlsm  ◄────────────┘
```

The Linux build host produces only the data workbook (`.xlsx`) because Excel
binary VBA blobs cannot be authored portably on Linux. The included VBScript
runs on the user's Windows machine to embed the VBA project and save as
`.xlsm`.

## Sheet inventory
| Sheet                | Visibility   | Purpose |
|----------------------|--------------|---------|
| `Welcome`            | visible      | Splash + bilingual instructions |
| `Menu`               | visible after login | Main navigation, rendered by `modUI.RenderMenu` |
| `Work`, `Roster`, `ManagerRequests`, `SwapRequests`, `DailySales`, `WeeklySales`, `LaborCost`, `BorrowTracker`, `Announcements`, `Notifications`, `Settings`, `Admin` | hidden until selected | Each is rendered on demand by its own VBA module |
| `i18n`               | hidden       | `key, en, th` translation table |
| `ShiftGroups`        | hidden       | Shift definitions + per-group capacity |
| `AppState`           | very hidden  | `current_user`, `current_role`, `language`, `password_salt`, `maintenance_enabled`, `app_version` |
| `data_*` (29 sheets) | very hidden + protected | One sheet per PostgreSQL table |

All `data_*` sheets are protected with a workbook-wide password
(`BK1040#protect`) and `UserInterfaceOnly:=True`. VBA writes via
`Worksheet.Protect ..., UserInterfaceOnly:=True` so macros can mutate while
end users cannot edit cells directly.

## VBA module layout
| File | Role |
|------|------|
| `ThisWorkbook.cls` | `Workbook_Open` hides everything, shows `frmLogin`; `Workbook_BeforeClose` logs out and saves |
| `frmLogin.frm` | Login dialog (built dynamically, no `.frx` required) |
| `modAuth.bas` | SHA-256 (`System.Security.Cryptography.SHA256Managed`), salted login, role/permission helpers, AppState getters/setters |
| `modI18n.bas` | `T(key)` lookup, language toggle |
| `modSysLog.bas` | Append-only `data_systemlog` writer |
| `modData.bas` | Generic CRUD: `NextId`, `AppendRow`, `UpdateCell`, `DeleteRow`, `BackupToCsv` |
| `modUI.bas` | Main menu rendering + navigation entry points (`Show*`) |
| `modWork.bas` | Booking grid, capacity check, Tue→Mon week math, maintenance window |
| `modRoster.bas` | Read-only roster grid |
| `modRequests.bas` | Manager requests + swap requests + approve/deny |
| `modSales.bas` | Daily and weekly sales report |
| `modLabor.bas` | Labor cost calculator (hours × rate ÷ sales) |
| `modBorrow.bas` | Borrow in/out transactions |
| `modAnnouncements.bas` | Announcement feed |
| `modNotifications.bas` | Per-user notification feed + push helper |
| `modAdmin.bas` | Settings (self) + Admin (users, password reset, system log) |

## Authentication
- The web app stores passwords as Node `scrypt(password, salt, 64)` →
  `<hex>.<salt>`. VBA can't run scrypt, so during export every user's
  `passhash` is REPLACED with `SHA-256(<excel_salt> + <EXCEL_DEFAULT_PASSWORD>)`
  and `must_change_password` is forced to 1. The default (default
  `Change@123`) and the salt are written into `AppState` and printed at the
  end of the export run.
- VBA computes `SHA-256` via `System.Security.Cryptography.SHA256Managed`.
  The salt also accepts the un-salted form for forward compatibility.
- The Login form is the only entry point — closing it via the X closes the
  workbook. Successful login renders the menu.
- Roles: `admin`, `manager`, `area`, `staff`. `IsAdmin` and `IsManagerLike`
  helpers gate UI affordances. `HasFeature(key)` consults the
  `allowed_features` JSON column on `data_users` for fine-grained toggles.

## Maintenance window
`modWork.IsMaintenance` blocks bookings on Tuesday ≥ 12:00 and all of
Wednesday (Asia/Bangkok local time on the user's PC) and also when
`AppState.maintenance_enabled = "true"`.

## Capacity rules
`ShiftGroups` columns: `key, label_en, label_th, default_start, default_end,
capacity`. The Work grid colours each cell green/red based on
`CountBooked < capacity`.

## Data-flow round-trip
1. CSV → `data_*` sheet on build.
2. VBA reads/writes the same sheets via `modData` (column lookups by header
   name so any future PG schema change only needs the export script bumped).
3. **Settings → Backup CSV** writes every `data_*` back out as CSV in a
   timestamped folder next to the `.xlsm`.
4. `scripts/export-to-excel/import-from-csv.mjs <folder>` upserts every
   exported CSV back into PostgreSQL (`ON CONFLICT (id|username) DO UPDATE`).
   Sessions / OTPs / agent proposals are deliberately skipped.

## Known limitations (out of scope, per task)
- No real-time chat
- No AI features
- No email OTP (admin must reset passwords manually)
- Single-user (Excel is not built for concurrent multi-user write)
- Windows only (Mac/LibreOffice VBA differences are unsupported)
