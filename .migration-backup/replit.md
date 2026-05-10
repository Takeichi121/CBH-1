# BK Work Schedule - Grand Diamond

A staff roster and shift scheduling management application for the Grand Diamond branch, enabling employees to book shifts and managers to oversee schedules and settings.

## Run & Operate

```bash
# Install dependencies
npm install

# Build frontend
npm run build:client

# Build backend
npm run build:server

# Typecheck all code
npm run typecheck

# Generate Drizzle ORM migrations
npm run db:generate

# Apply Drizzle ORM migrations
npm run db:push

# Run development server
npm run dev
```

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SALT`: Password hashing salt
- `MANAGER_VERIFY_CODE`: Code for manager registration
- `BRANCH_NAME`: Display name for the branch
- `SESSION_TTL_SECONDS`: Token expiration time
- `VAPID_PUBLIC_KEY`: Web Push VAPID public key
- `VAPID_PRIVATE_KEY`: Web Push VAPID private key
- `VAPID_EMAIL`: Contact email for VAPID

## Stack

- **Frontend**: React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database**: PostgreSQL, Drizzle ORM
- **Build Tools**: Vite (frontend), esbuild (backend), TypeScript (type checking)
- **Validation**: Zod
- **Internationalization**: Custom `use-i18n` hook

## Where things live

- **Frontend Source**: `client/src/`
- **Backend Source**: `server/src/`
- **Shared Code (types, routes)**: `shared/`
- **DB Schema**: `db/schema.ts`
- **API Contracts**: `shared/routes.ts` (Zod schemas)
- **UI Components**: `client/src/components/ui/` (shadcn/ui)
- **Core Logic/Hooks**: `client/src/lib/` and `client/src/hooks/`
- **Version and Changelog**: `shared/version.ts` (single source of truth)
- **Excel Workbook VBA Modules**: `vba/`
- **Excel Workbook Design Docs**: `docs/EXCEL_WORKBOOK_DESIGN.md`
- **Excel User Manual**: `EXCEL_USER_MANUAL.md`

## Architecture decisions

- **Token-based Authentication**: Custom implementation, token stored in localStorage and passed in POST request body.
- **API Design**: All API endpoints use POST requests with JSON bodies for consistency and token passing.
- **Mobile-First UI**: Responsive design with distinct mobile (bottom nav) and desktop (sidebar nav) layouts.
- **Timezone Management**: All server-side dates and times are handled in `Asia/Bangkok` (UTC+7).
- **Chann AI Tools**: Extensive tool-use for Chann AI, including role-based permissions and direct SQL execution for Admin.
- **Offline Excel Workbook**: A macro-enabled Excel workbook (`BK_Work_Schedule.xlsm`) replicates core web app functionality for offline use, built from the PostgreSQL database.

## Product

- **Staff Shift Management**: Employees can view, book, and manage their weekly shifts within capacity limits.
- **Manager Roster & Configuration**: Managers can view full staff rosters, adjust shift capacities, and manage system settings.
- **Authentication & Roles**: Token-based authentication with distinct staff, manager, and admin roles.
- **Real-time Staff Chat**: Integrated Socket.IO-based chat for staff communication (group and 1-on-1).
- **Borrow Tracker System**: Comprehensive system for managing equipment borrowing between branches, including item catalog, transactions, and history.
- **Labor Cost Management**: Tools for configuring labor cost constants and calculating daily labor metrics (COL%, TCMH).
- **Chann AI Assistant**: AI-powered assistant for drafting daily sales, anomaly detection, long-term memory (RAG), and extensive tool interaction for various tasks.
- **Notifications**: System-wide notifications for various events (manager requests, borrow transactions, daily reports, version updates).
- **Multi-language Support**: Bilingual interface (English/Thai).

## User preferences

Preferred communication style: Simple, everyday language.

## Gotchas

- **Changelog Updates**: `shared/version.ts` MUST be updated with every code change to ensure auto-synced changelogs.
- **Database Migrations**: Always run `npm run db:push` after schema changes.
- **Timezone Consistency**: Be mindful of timezone handling, especially for shift booking and daily reports, as the system operates on `Asia/Bangkok` time.
- **Chann AI Permissions**: Chann AI's capabilities are strictly governed by user roles; not all tools are available to all users.
- **Excel Workbook Build**: Building the offline Excel workbook requires specific steps, including running a VBScript on Windows and enabling "Trust access to the VBA project object model" in Excel.

## Pointers

- **Drizzle ORM Docs**: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **Tailwind CSS Docs**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **React Query Docs**: [https://tanstack.com/query/latest/docs/react/overview](https://tanstack.com/query/latest/docs/react/overview)
- **Socket.IO Docs**: [https://socket.io/docs/v4/](https://socket.io/docs/v4/)
- **Zod Docs**: [https://zod.dev/](https://zod.dev/)
- **Shadcn/ui Docs**: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **Recharts Docs**: [https://recharts.org/en-US/api](https://recharts.org/en-US/api)