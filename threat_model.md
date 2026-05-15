# Threat Model — BK Work Schedule (Grand Diamond)

## Project Overview

Thai-language back-of-house PWA for Burger King Grand Diamond store.
Employees log in on mobile (iOS/Android) to view shift schedules, record sales, request swaps, and interact with "Chann" (AI assistant backed by OpenAI GPT).
Managers and admins manage rosters, approve requests, configure targets, and receive LINE/push notifications.

**Tech stack:** Node.js 24 + Express 5, React 18 + Vite, PostgreSQL + Drizzle ORM, Passport.js local auth + custom token sessions, Multer file uploads, Socket.io, LINE Messaging API, Resend (email), Web Push (VAPID).

**Deployment:** Replit (single-region), reverse-proxied. Frontend served under `/`, API under `/api`.

---

## Assets

| Asset | Sensitivity | Risk if compromised |
|-------|-------------|-------------------|
| Employee PII (name, phone, email, birthday, position) | High | Privacy breach, regulatory exposure |
| Sales & KPI data (daily/weekly targets, actuals) | Medium | Business intelligence leak, trust damage |
| Session tokens (6-hour TTL, stored in `sessions` table) | High | Full account takeover |
| Password hashes (bcrypt) | High | Offline cracking leads to account takeover |
| OpenAI API key | High | Arbitrary charges, service abuse |
| LINE channel secret & access token | High | Spoofed LINE messages sent to staff |
| RESEND_API_KEY | Medium | Spam/phishing sent from app domain |
| VAPID private key | Medium | Spoofed push notifications |
| DATABASE_URL | Critical | Full database read/write |
| Uploaded files (chat context: PDFs, spreadsheets) | Medium | Data exfiltration via chat upload endpoint |

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| **Browser → API** | All client requests cross via HTTPS proxy. API must authenticate and authorize every state-changing call. Client is untrusted. |
| **API → PostgreSQL** | The Express process has direct DB access. SQL injection at the API layer yields full DB access. Drizzle ORM with parameterized queries mitigates this. |
| **API → OpenAI** | GPT is given a large system prompt and can call "tools" that write to the DB. Prompt injection via user-supplied chat messages could instruct the AI to call admin-only tools. |
| **API → LINE** | LINE signature validation required on incoming webhooks; outbound uses the channel access token. |
| **API → Web Push / Resend** | One-way outbound. Keys must not leak to frontend bundle. |
| **Authenticated Staff → Manager** | Staff may only read their own data. Managers/admins can read and write cross-user data. Boundary enforced server-side via role checks on each route. |
| **Admin → Exec-Shell** | Admin users can run a controlled set of shell commands (`/api/chann/exec-shell`). This boundary is highest-privilege within the app. |
| **Public → Authenticated** | Login, ping, multi-store config, and registration endpoints are public. All other `/api/*` routes require a valid session token. |

---

## Scan Anchors

**Production entry points:**
- `artifacts/api-server/src/app.ts` — Express app bootstrap, global middleware, rate limiters
- `artifacts/api-server/src/routes/routes.ts` — all ~10 000 lines of route handlers (primary attack surface)

**Highest-risk code areas:**
- `routes.ts:3591-3646` — `/api/chann/exec-shell` (admin shell execution)
- `routes.ts:3691-3730` — `/api/system/setup` (bootstrap endpoint, now auth-gated)
- `routes.ts:460-496` — `/api/chat/upload-file` (file upload, limited to 50 MB + MIME filter)
- `routes.ts:609-2100` — `/api/chann` (AI assistant with DB write tools)

**Auth surfaces:**
- Public: `/api/system/ping`, `/api/config/multi-store`, `/api/login`, `/api/registerStaff`, `/api/registerManager`, `/api/registerArea`, `/api/forgotPassword`, `/api/resetPassword`
- Authenticated (any role): everything else under `/api/*`
- Manager/Admin only: shifts write, sales write, user management, announcements
- Admin only: `/api/admin/updateUserRole`, `/api/admin/save-permissions`, `/api/admin/updateUserProfile`, `/api/chann/exec-shell`, `/api/system/setup` (when users exist)

**Dev-only / ignore in prod scan:**
- `.migration-backup/` — archived mockup sandbox, not served in production
- `artifacts/mockup-sandbox/` — design preview server, not served in production

---

## Threat Categories

### Spoofing

Staff authenticate via username + password (bcrypt, cost ≥ 10). A random token (crypto) is stored server-side in the `sessions` table with a 6-hour TTL. Each authenticated request must supply this token.

**Guarantees required:**
- All state-changing routes MUST call `storage.getSession(token)` and verify the result before operating on data.
- Password reset OTPs MUST be single-use and expire within a short window (already implemented).
- LINE webhook signatures MUST be verified with the channel secret on every inbound webhook.
- The `MANAGER_VERIFY_CODE` and `AREA_VERIFY_CODE` for self-registration are read from env vars (`process.env.MANAGER_VERIFY_CODE`, `process.env.AREA_VERIFY_CODE`). These MUST be changed from defaults in production.

### Tampering

Sales targets and totals are calculated server-side. Shift assignments are manager-controlled. The AI assistant's tool calls are filtered by role before dispatch.

**Guarantees required:**
- `/api/admin/updateUserProfile` now validates input via Zod (field lengths, email format, date format) before writing to DB.
- AI tool calls that write data (`saveDailySales`, `createUser`, `updateUserStatus`, etc.) MUST check the calling user's role server-side before execution — enforced via `adminOnlyWriteToolNames` set in the `/api/chann` route.
- The exec-shell allowlist uses exact binary name matching (`allowedBins.includes(cmdBase)`) and shell metacharacter blocking, not regex substring matching.

### Repudiation

The `systemlog` table records every significant action (`action`, `byUser`, `detail`, `ts`). Both success and error paths of exec-shell are logged.

**Guarantees required:**
- Every write operation MUST call `storage.log(action, username, detail)` with the acting user's username (not the target user's).
- Exec-shell invocations MUST always be logged, including failed attempts.

### Information Disclosure

Employee PII (including passhash) is excluded from API responses — the `getUsers` route maps users and sets `passhash: undefined`. Files uploaded via chat are stored on disk, not in the DB, and are accessible via `/uploads/chat-files/` path.

**Guarantees required:**
- `passhash` MUST never appear in any API response body.
- Error responses MUST NOT include stack traces or raw database error messages in production (the `safe()` wrapper returns generic 500 responses).
- Uploaded files under `/uploads/` MUST NOT be accessible to unauthenticated users. The Express static file serving for uploads should require a valid session or use signed URLs.
- Secrets (`DATABASE_URL`, `OPENAI_API_KEY`, `LINE_CHANNEL_SECRET`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`) MUST be stored as environment variables and MUST NOT be committed to git or appear in logs.
- The AI system prompt embeds the database schema and internal tool names. If the AI echoes this back to a user, it constitutes information disclosure. The prompt should be treated as sensitive.

### Denial of Service

Rate limiting is applied globally:
- `/api/login`: 10 requests / 15 min
- `/api/chann` and `/api/generate-image`: 30 requests / 60 s

The JSON body limit is 30 MB. File uploads for chat are now capped at **50 MB** (reduced from 2 GB). Image uploads for chat are capped at 5 MB.

**Guarantees required:**
- The exec-shell endpoint uses `execFileSync` with `timeout: 60000 ms` and `maxBuffer: 1 MB` — these limits MUST NOT be removed.
- All outbound `fetch()` calls to external services (LINE, OpenAI, DuckDuckGo) use `AbortSignal.timeout()` — this MUST be maintained on any new integrations.
- OpenAI calls that process large uploaded file text MUST trim the input (already capped at 100 000 chars per file).

### Elevation of Privilege

RBAC uses four roles: `staff`, `manager`, `area`, `admin`. Each route checks the calling user's role. Admin-only routes (`/api/admin/*`, exec-shell, system setup) verify `role === "admin"`.

**Guarantees required:**
- `/api/system/setup` is now auth-gated: when users already exist in the DB, it MUST require a valid admin session before creating or resetting default accounts.
- Role escalation (setting a user to `admin`) is restricted to existing admin users only — enforced in `/api/admin/updateUserRole`.
- The AI's tool execution path checks `adminOnlyWriteToolNames` against the calling user's role. New AI tools with write capabilities MUST be added to this set.
- DB queries MUST use Drizzle ORM's parameterized interface — no raw string interpolation into SQL. The single raw `sql` template in `updateUsername` uses tagged literals (parameterized), not concatenation.

---

## Security Scan Results (May 2026)

### Dependency Audit

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 20 |
| Moderate | 20 |
| Low | 1 |

**Top findings:**

| Package | CVEs | Fix |
|---------|------|-----|
| `@xmldom/xmldom@0.8.11` | CVE-2026-41673, CVE-2026-41674, CVE-2026-41672, CVE-2026-34601, CVE-2026-41675 | Upgrade to ≥ 0.8.13 |
| `axios@1.14.0` | Multiple (GHSA-3p68-rc4w, GHSA-3w6x-2g7m, and 13 others) | Upgrade axios |

`@xmldom/xmldom` is a transitive dependency (likely via `exceljs` or `pdf-parse`). Direct upgrade may require updating the parent package. These CVEs describe XML serialization injection and recursive traversal DoS — risk is moderate given the app only parses trusted office documents uploaded by authenticated users.

### SAST Scan (Semgrep)

59 findings, all INFO severity. Key categories:
- **path-traversal** (5 findings in routes.ts): file paths constructed from multer's assigned filename, not user input — false positives given the random filename generation.
- **detect-child-process** (1 finding): the intentional exec-shell endpoint. Already mitigated with allowlist and metachar blocking.
- **detect-non-literal-regexp**: non-literal regex compiled from config strings — acceptable.
- **insecure-document-method**: frontend `innerHTML` usage in generated HTML — should be audited for XSS if user input flows into these paths.
- **python findings**: from `node_modules` Python scripts — not application code.

No HIGH or ERROR severity SAST findings.

### HoundDog Scan (Privacy/Secret Dataflow)

0 findings. No hard-coded secrets or PII data flows detected in source code.

---

## Recommended Follow-up Actions

1. **Upgrade `@xmldom/xmldom`** — update `exceljs` or force-resolve to ≥ 0.8.13 via `pnpm-workspace.yaml` overrides.
2. **Uploaded file access control** — serve `/uploads/` only after session validation; currently static files may be accessible without auth if the path is known.
3. **Change default verify codes** — set `MANAGER_VERIFY_CODE` and `AREA_VERIFY_CODE` env vars to non-default values before production launch.
4. **CORS policy** — currently no explicit CORS config; Express defaults to no CORS. If the API is ever called from a different origin, an explicit allowlist should be configured.
5. **Audit AI tool injection** — test whether adversarial chat messages can trigger admin-only AI tools for non-admin users.
