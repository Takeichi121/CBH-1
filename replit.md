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