# Chann Back House — BK Work Schedule

Thai-language back-of-house management PWA for Burger King Grand Diamond store, built by Chan J. (Chanon Jaimool).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/bk-work-schedule run dev` — run the frontend (port 23101, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v3 + Wouter (routing) + TanStack Query
- API: Express 5 + Socket.io
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Auth: Passport.js (local strategy + session)
- Build: esbuild (ESM bundle)
- PWA: Vite PWA plugin + service worker

## Where things live

- `artifacts/bk-work-schedule/` — React/Vite frontend (Thai-language PWA)
- `artifacts/api-server/` — Express backend with all routes
- `artifacts/api-server/src/routes/routes.ts` — all API route handlers (~11k lines)
- `artifacts/api-server/src/services/` — AI agents, push notifications, LINE integration
- `lib/db/src/schema/` — Drizzle ORM schema (source of truth)
- `artifacts/bk-work-schedule/src/lib/shared-routes.ts` — API contract (client-side)
- `artifacts/bk-work-schedule/src/lib/shared-schema.ts` — shared type stubs (frontend)

## Architecture decisions

- Routes moved from legacy `server/routes.ts` → `artifacts/api-server/src/routes/routes.ts`; all dynamic imports within routes.ts use `../` relative paths to reach sibling server files.
- Frontend uses Vite `@shared/*` aliases pointing to `src/lib/shared-{schema,routes,version}.ts` stubs — no Drizzle in the browser.
- `WouterRouter` wraps the app with `base={import.meta.env.BASE_URL}` so routing works under both `/` (dev) and any subpath (production proxy).
- `pg` is externalized from the esbuild bundle (native bindings); `socket.io` and other large packages are bundled.
- Sessions are stored server-side; VAPID push keys are read from env vars at runtime.

## Product

- Employee shift scheduling and roster management (Thai locale)
- Sales tracking (weekly/daily), borrow tracking, KPI dashboards
- "Chann" AI assistant (GPT-backed) for back-of-house queries
- LINE / push notification alerts for schedule anomalies
- PWA installable on mobile devices

## User preferences

- Thai language throughout the UI
- Dark theme by default
- Font: Architects Daughter (handwritten-style headings)

## Gotchas

- Dynamic imports in `routes.ts` must use `../` (not `./`) since the file lives in `src/routes/` subdirectory.
- `pnpm run build` at workspace root requires `PORT` and `BASE_PATH` env vars — use `typecheck` for CI-safe checks.
- `zod/v4` is used in some legacy files; the api-server has `zod` in its own dependencies.
- Run `pnpm --filter @workspace/db run push` after schema changes before restarting the API server.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
