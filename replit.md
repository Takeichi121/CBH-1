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

Version history is maintained in `shared/version.ts`:
- `APP_VERSION`: Current version number
- `CHANGELOG`: Array of version entries with date and changes

Version is displayed in Settings page footer automatically.

## Recent Changes

### Version 1.7.0 (February 25, 2026)
- Chann AI: Full Agent Access - ทุก user (staff/manager/admin) มีสิทธิ์ write เหมือนกันหมด
- เพิ่ม tools ใหม่: createUser, updateUserProfile, resetUserPassword, addBorrowTransaction, addBorrowBranch, addBorrowItem, executeSqlQuery
- executeSqlQuery: Chann สามารถรัน SQL query โดยตรงได้ (SELECT/INSERT/UPDATE/DELETE)
- ลบ admin-only gating ออก: ผู้ใช้ทุกคนสามารถสั่ง Chann ทำงานได้เหมือน System Agent
- System prompt อัปเดต: Chann มีสิทธิ์เทียบเท่า Agent

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