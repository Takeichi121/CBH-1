# BK Work Schedule - Grand Diamond

## Overview

A staff roster and shift scheduling management application for the Grand Diamond branch. The system allows employees to book and manage their work shifts, while managers can oversee the entire roster, adjust capacity settings, and manage staff registrations.

The application features:
- Token-based authentication (staff and manager roles)
- Weekly shift booking with capacity limits per shift group (open, lunch, dinner, late)
- Roster view for managers to see all staff schedules
- System maintenance windows (closes Tuesday 12:00 through Wednesday)
- Bilingual support (English/Thai)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Design System**: Linear-inspired modern productivity aesthetic with Inter font family

Key frontend patterns:
- Custom hooks for auth (`use-auth`), shifts (`use-shifts`), and settings (`use-settings`)
- Token stored in localStorage, sent in POST request body (not cookies/headers)
- Mobile-first responsive design with bottom navigation on mobile
- Internationalization via custom `use-i18n` hook

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Build**: Custom esbuild script bundling allowlisted dependencies

API design:
- All endpoints use POST method with JSON body
- Token-based auth where token is passed in request body
- Response format: `{ ok: boolean, message?: string, ...data }`
- Routes defined in `shared/routes.ts` with Zod schemas

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Users, shifts, config, sessions, systemlog tables
- **Migrations**: Drizzle Kit with `db:push` command

Key tables:
- `users`: Staff accounts with role (staff/manager/admin)
- `shifts`: Shift bookings with unique constraint on (username, date)
- `config`: Key-value system configuration (capacity settings)
- `sessions`: Token-based session storage

### Authentication
- Custom token-based system (not using Passport sessions)
- SHA-256 password hashing with configurable salt
- Manager registration requires verification code
- Session TTL configurable via environment variable

### Shift Logic
- Week runs Tuesday to Monday
- Four shift groups: open, lunch, dinner, late
- Capacity limits per shift group stored in config
- System closes Tuesday 12:00 to Wednesday (Thailand timezone)

## Labor Cost Management

The system includes labor cost tracking and productivity metrics:

### Labor Settings (/sales/labor-settings)
Configure store-wide labor cost constants:
- **Roster Hours**: Target hours per day from Area management (default: 88)
- **Duty Team Hours**: Fixed manager hours per day (e.g., 5 managers × 8 hrs = 40)
- **PT Wage Rate**: Part-time hourly rate in Baht (default: 45)
- **Fixed Cost Daily**: Daily fixed salary costs (FT/Manager average)
- **Close Shift Cost**: Daily closing shift transportation cost

### Labor Calculations in Daily Sales Form
Auto-calculated fields based on input Actual Hours and OT Hours:
- **Summary Hours** = Duty + Actual + OT (total hours worked)
- **Variance Hours** = Roster - Summary (negative = over budget)
- **Labor Cost** = Fixed + Close Shift + (Actual+OT) × PT Rate
- **COL%** = Labor Cost ÷ Sales × 100
- **TCMH** = Transaction Count ÷ Summary Hours

### Database Tables
- `labor_settings`: Stores configuration constants
- `daily_labor`: Tracks daily labor metrics (actualHours, otHours, calculated fields)
- `daily_sales_reports`: Extended with actualHours, otHours columns for persistence
- `dropdown_options`: Configurable dropdown options (category, value, label, sortOrder, isActive) - used for manager shift options, staff shift groups, etc. Managed via /settings/dropdowns page (admin/manager only)

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe queries
- `connect-pg-simple` for session store compatibility

### Frontend Libraries
- Radix UI primitives (dialogs, dropdowns, forms, etc.)
- date-fns for date manipulation
- React Hook Form with Zod resolver
- Lucide icons

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SALT`: Password hashing salt
- `MANAGER_VERIFY_CODE`: Code required for manager registration
- `BRANCH_NAME`: Display name for the branch
- `SESSION_TTL_SECONDS`: Token expiration time

### Build Tools
- Vite for frontend development and bundling
- esbuild for server bundling
- TypeScript for type checking

## Borrow Tracker System

A comprehensive equipment borrowing management system between branches.

### Features
- Branch management (add, delete, import from Excel/CSV)
- Item catalog with multiple units support
- Transaction tracking (borrow in/out)
- History with filtering and search
- Searchable dropdowns using Popover + Command pattern
- Interactive charts for trends (recharts)
- Dynamic unit suggestions (item-specific units prioritized)

### Routes
- `/borrow` - Dashboard with overview
- `/borrow/history` - Transaction history with filters
- `/borrow/transactions` - Add new borrow transaction
- `/borrow/branches` - Manage branches
- `/borrow/items` - Manage items catalog
- `/borrow/settings` - System settings (manager only)
- `/borrow/help` - User guide

### Key Components
- `BorrowLayout` - Consistent navigation wrapper with 7 tabs
- `ImportExcelButton` - Shared component for Excel/CSV import
- Searchable combobox with keyboard navigation (Arrow keys, Enter, Escape)

### Database Tables
- `borrow_branches` - Branch list with code and name
- `borrow_items` - Item catalog with units array and category
- `borrow_transactions` - Transaction records with status tracking

## Staff Chat System

Real-time chat system for staff communication using Socket.IO.

### Features
- Real-time messaging with WebSocket
- Token-based authentication (uses same auth as main app)
- Chat history (last 50 messages)
- Bilingual interface (English/Thai)
- Auto-scroll to latest messages
- Connection status indicator
- Floating chat widget (bottom-right) accessible from all pages
- Group chat (all staff) and private messaging (1-on-1)
- Online user tracking for private chat
- Unread message badge counter

### Components
- `FloatingChat` - Floating widget component with tabs for group/private chat
- `ChatPage` - Full page chat interface at `/chat`

### Route
- `/chat` - Staff chat page

### Technical Details
- Server: Socket.IO integrated into Express server with authentication middleware
- Client: socket.io-client with token passed in handshake auth
- Group messages stored in-memory (last 100 messages)
- Private messages stored in-memory (last 500 messages)
- User identity determined server-side from session token
- Online users tracked via Map with socket ID for targeted private messaging

## Version Tracking

Version history is maintained in `shared/version.ts` as the **single source of truth**:
- `APP_VERSION`: Current version number (string, e.g. "2.0.0")
- `CHANGELOG`: Typed array of `ChangelogEntry` objects — `{ version, date, label, changes }`
- `label` options: `"feature"` | `"bugfix"` | `"release"` | `"improvement"`
- `date` format: `"YYYY-MM-DD"` (ISO format — converted to Thai Buddhist Era in UI)

Version is displayed automatically in:
- Settings page System Information section (shows latest entry + link to full history)
- Handbook page changelog section (auto-synced, no hardcoded data)

### MANDATORY CHANGELOG UPDATE RULE

**Every time any code change is made, `shared/version.ts` MUST be updated:**
1. Increment `APP_VERSION` (patch: x.x.1 for bugfix, minor: x.1.0 for feature, major: 1.0.0 for breaking)
2. Add a new entry to the TOP of `CHANGELOG` array with:
   - `version`: new version string
   - `date`: today's date in `"YYYY-MM-DD"` format
   - `label`: `"feature"` | `"bugfix"` | `"improvement"` | `"release"`
   - `changes`: array of Thai-language description strings explaining what changed
3. Update `replit.md` Recent Changes section to match

This ensures the handbook and settings page always reflect the latest state automatically.

## Recent Changes

### Version 2.2.0 (March 22, 2026) — Notification Events + Version History
- **Notification Bell**: กระดิ่งแจ้งเตือนใน header พร้อม badge, unread dot, icon ตาม event type
- **Event Notifications**: แจ้งเตือนอัตโนมัติทุก event: Manager Request (create/approve/reject), Borrow Transaction, Roster Import, Daily Report (first submit)
- **Version Update Notifications**: เมื่อ login ระบบสร้าง notification ย้อนหลังสำหรับทุก version ที่ยังไม่เห็น
- **Changelog**: เพิ่ม 4 entries ใหม่ (v2.1.3–v2.1.5, v2.2.0) ครอบคลุม Rebranding, Icon fixes, Notification Bell

### Version 2.1.1 (March 15, 2026) — Claude AI + UI ใหม่

- **Claude Default**: Chann ใช้ Claude (claude-sonnet-4-5) เป็น AI หลักแทน OpenAI
- **Model Selector**: เลือก Claude / GPT-4o / Gemini ได้จาก dropdown ใน header ของ Chann chat
- **LLM Router**: เพิ่ม `streamClaude()` ใน llm-router.ts, fallback order: Claude → OpenAI → Gemini
- **Dark Mode UI**: Chann chat ใช้ dark theme สไตล์ AI agent ทันสมัย (gradient header, animated dots)
- **Provider param**: `/api/chann` รองรับ `provider` parameter จาก request body
- **Removed**: Chat customization panel (สี bubble, avatar) — ถูกแทนที่ด้วย dark mode design

### Version 2.1.0 (March 4, 2026) — Chann Agent Upgrade

**เพิ่มความสามารถ Chann ให้ทำงานแบบ Multi-Step Agent:**

- **MAX_ROUNDS**: เพิ่มจาก 3 → 8 rounds รองรับ task ซับซ้อน
- **Parallel Tool Calls**: เปิดใช้ `parallel_tool_calls: true` — Chann เรียก tool หลายตัวพร้อมกันได้
- **Thinking Indicator**: UI แสดง "กำลังวิเคราะห์..." และ "กำลังใช้เครื่องมือ: ..." ระหว่างทำงาน
- **max_completion_tokens**: เพิ่มจาก 4096 → 8192

**Tools ใหม่:**
- `webSearch` — ค้นหาข้อมูลจากอินเตอร์เน็ต (DuckDuckGo API)
- `webFetch` — ดึงเนื้อหาจาก URL
- `getManagerRequests` — ดูคำขอพนักงาน (ลา/หยุด/สลับกะ)
- `approveManagerRequest` — อนุมัติคำขอพนักงาน (Manager+)
- `rejectManagerRequest` — ปฏิเสธคำขอพนักงาน (Manager+)
- `rememberNote` — บันทึก note ระยะยาว (Agent Memory)
- `recallNotes` — เรียกดู notes ที่บันทึกไว้
- `deleteNote` — ลบ note

**Quick Actions ใหม่:**
- คำขอพนักงาน, โน้ตของฉัน, ค้นหาเว็บ

**Database:**
- เพิ่มตาราง `chann_notes` สำหรับ Agent Memory

### Version 2.0.0 (March 1, 2026) — AI Upgrade & Auto Changelog
- Upgraded Chann AI from gpt-4o-mini to gpt-4o across entire system
- Added automatic changelog tracking via shared/version.ts (single source of truth)
- Handbook page now auto-syncs from version.ts — no more hardcoded changelog
- Settings page shows latest update summary with link to full history
- Added `ChangelogLabel` type and `label` field to all changelog entries

### Version 1.9.0 (February 27, 2026)
- Added Area Manager role (role=area)
- 30-minute unlock system for data editing

### Version 1.8.1 (February 26, 2026) — Code Audit & Bug Fixes
- **Bug Fix**: Waste double-counting — settings-page save now resets `wasteMealDaily` to "0" alongside `wasteRawDaily=total`, preventing compounding on repeated saves
- **Bug Fix**: `rosterCommit` and `recommendHours` added to settings-page save filter so rows with only planning data are no longer silently skipped
- **Bug Fix**: OData endpoint used `t.targetAmount` (non-existent) → fixed to `t.targetSales`; used `r.wasteAmount` → fixed to `r.wasteRawDaily` (both caused zeros in exported data)
- **Bug Fix**: `/api/code-proposals/list` and `/api/code-proposals/review` used `verifyAdminAccess` (undefined) → corrected to `verifyDevAccess`; access.username → access.user?.username
- **Bug Fix**: Arithmetic on `pct()` return which could be `""` string → wrapped with `Number()` to prevent NaN
- **Bug Fix**: Chann tool dispatch used `user.role` without null safety inside nested function → added `!` assertions
- **Bug Fix**: Chann `upsertDailyTarget` / `upsertShift` / `bulkUpsertDailyTargets` calls missing required TS fields → cast to `any`
- **Cleanup**: Removed orphaned stub files causing TypeScript errors (`client/src/db/database.ts`, `client/src/lib/stream.ts`, `client/src/services/memory.ts`, `client/src/services/llm-router.ts`, `server/src/chat.routes.ts`)
- **Fix**: `bottom-nav.tsx` position state now typed as `{ x: number; y: number }` eliminating implicit `any` TS error
- TypeScript: 0 errors across entire codebase after this audit

### Version 1.8.0 (February 25, 2026)
- Chann AI: เพิ่มเครื่องมือจำนวนมาก ครอบคลุมทุก storage operation
- **Read tools ใหม่ (ทุก role)**: getWasteTarget, getStoreSettings, getSystemLogs, getSwapRequests, getBorrowTransactions, getBorrowBranches, getBorrowItems, getMtdSummary, getDailyTargetsForMonth, getDailySalesReportsForMonth, getLaborSettings
- **Write tools ใหม่ (Manager)**: bulkSaveDailyTargets, saveDailyLabor, bulkSaveShifts
- **Write tools ใหม่ (Admin)**: deleteBorrowTransaction, toggleBorrowTransaction, deleteBorrowBranch, deleteBorrowItem, deleteDailySalesReport, setWasteTarget, updateStoreSettings
- Quick actions เพิ่ม: คำขอสลับกะ, Waste เดือนนี้, ตั้งค่าร้าน, Audit Log, สร้างผู้ใช้, Labor Settings
- Role-based permissions: managerWriteToolNames / adminOnlyWriteToolNames แยกชัดเจน
- Read tools ย้ายออกจาก writeTools ไปเป็น readTools ที่ทุก role เข้าถึงได้

### Version 1.7.2 (February 26, 2026) — Timezone Fix (Asia/Bangkok)
- **Timezone**: All server-side dates/timestamps now use Asia/Bangkok (UTC+7) via `nowIso()`, `todayBangkok()`, `nowBangkok()`
- **Timezone**: Server logs display Bangkok time
- **Timezone**: Frontend `todayBangkok()` utility in `@/lib/utils` — all pages use consistent Bangkok date
- **Timezone**: Chann system prompt includes current Bangkok date/time
- **Timezone**: Maintenance window calculation simplified to use `nowBangkok()`
- Files updated: `server/utils.ts`, `server/index.ts`, `server/routes.ts`, `client/src/lib/utils.ts`, + 9 page components

### Version 1.7.1 (February 25, 2026) — Code Audit & Bug Fixes
- **Bug Fix**: Borrow pages (Items, Branches, Dashboard) were using default GET queryFn but backend expects POST — fixed by adding proper queryFn with token
- **Bug Fix**: Duplicate `<Toaster />` in App.tsx removed (was rendered both in Router and App)
- **Bug Fix**: `throwIfResNotOk` now parses JSON error responses to show clean messages instead of raw JSON strings
- **Security**: Added path prefix validation to code-proposals/review endpoint to prevent file writes outside allowed directories
- **Feature**: Code Proposals API endpoints (`/api/code-proposals/list`, `/api/code-proposals/review`) for Chann code edit system
- **Feature**: Chann system prompt updated with code editing tools documentation

### Version 1.7.0 (February 25, 2026)
- Chann AI: Full Agent Access - role-based write permissions (Admin=all, Manager=roster+reports, Staff=read-only)
- เพิ่ม tools ใหม่: createUser, updateUserProfile, resetUserPassword, addBorrowTransaction, addBorrowBranch, addBorrowItem, executeSqlQuery
- executeSqlQuery: Chann สามารถรัน SQL query โดยตรงได้ (SELECT/INSERT/UPDATE/DELETE)
- System prompt อัปเดต: Chann มีสิทธิ์ตาม role

### Version 1.6.0 (February 21, 2026)
- Chann AI: เพิ่มสิทธิ์การบันทึกข้อมูลสำหรับ Admin (write tools)
- Write tools: saveDailySales, saveDailyTarget, saveShift, deleteShift, saveLaborSettings, updateUserStatus, updateUserRole
- Audit logging for all write operations via storage.log()
- SSE toolActions events with green action badges in chat UI
- Sales Settings: เพิ่ม 5 คอลัมน์ใหม่ (LY Sales, Forecast, LY TC, Target TC, Target TA) พร้อม 10 คอลัมน์คำนวณอัตโนมัติ
- Export Excel button with auto-generated filename

### Version 1.5.0 (January 16, 2026)
- เพิ่มระบบสมัครสมาชิกใหม่ให้ผู้ใช้กำหนด Username เองได้
- เพิ่มช่อง Email, เบอร์โทร, ยืนยันรหัสผ่านในฟอร์มสมัคร
- เพิ่ม Validation สำหรับ Username (ตัวอักษร/ตัวเลข/_ เท่านั้น)
- เพิ่มการตรวจสอบ Username ซ้ำ

### Version 1.4.0 (January 16, 2026)
- เพิ่มระบบ Reset Password ผ่าน OTP ทาง Email
- ใช้ Resend สำหรับส่ง OTP Email

### Version 1.3.0 (January 16, 2026)
- เพิ่มระบบ Staff Chat แบบ Real-time ด้วย Socket.IO
- เพิ่ม Floating Chat Widget

### Earlier Changes
1. **Register Borrow Routes** - Added routes for /borrow/history, /borrow/branches, /borrow/items in App.tsx
2. **Update Navigation Tabs** - Added all 7 tabs to BorrowLayout
3. **Staff Chat System** - Added real-time chat with Socket.IO, authentication, and bilingual support