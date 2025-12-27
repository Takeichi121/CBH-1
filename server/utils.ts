import crypto from "crypto";

const SALT = process.env.SALT || "BK_SALT_v2_change_me";

export function nowIso() {
  return new Date().toISOString();
}

export function hashPass(password: string): string {
  return crypto.createHash("sha256").update(SALT + "::" + String(password || "")).digest("hex");
}

export function generateUsernameBase(fullName: string): string {
  const s = String(fullName || "").trim().replace(/\s+/g, " ");
  const parts = s.split(" ");
  if (parts.length < 2) return "";
  const first = parts[0].replace(/\s/g, "").slice(0, 3);
  const last = parts[parts.length - 1].replace(/\s/g, "").slice(0, 3);
  if (!first || !last) return "";
  return (first + last).toLowerCase();
}

export async function allocateUsername(base6: string, checkExists: (u: string) => Promise<boolean>): Promise<string> {
  base6 = String(base6 || "").trim().toLowerCase();
  if (!base6) return "";
  for (let i = 1; i <= 999; i++) {
    const u = base6 + String(i).padStart(3, "0");
    if (!(await checkExists(u))) return u;
  }
  return "";
}

export function isSystemClosed(): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(new Date());
  const hh = parts.find(p => p.type === "hour")?.value || "00";
  const mm = parts.find(p => p.type === "minute")?.value || "00";
  const wd = parts.find(p => p.type === "weekday")?.value || "Mon";
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const d = map[wd] || 1;
  const hhmm = `${hh}:${mm}`;
  if (d === 2) return hhmm >= "12:00";
  if (d === 3) return true;
  return false;
}

export function getWeekRangeTuesday(anyDate?: string) {
  const base = (anyDate && /^\d{4}-\d{2}-\d{2}$/.test(anyDate)) ? new Date(anyDate + "T00:00:00+07:00") : new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(base);
  const yyyy = parts.find(p => p.type === "year")?.value;
  const mm = parts.find(p => p.type === "month")?.value;
  const dd = parts.find(p => p.type === "day")?.value;
  const wd = parts.find(p => p.type === "weekday")?.value || "Mon";
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const u = map[wd] || 1;

  const d0 = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`);
  const delta = (u >= 2) ? (u - 2) : (7 - (2 - u));
  const start = new Date(d0.getTime());
  start.setDate(start.getDate() - delta);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start.getTime());
    x.setDate(x.getDate() + i);
    days.push(x.toISOString().slice(0, 10));
  }
  return { start: days[0], end: days[6], days };
}

export const DEFAULT_CAPACITY = { open: 4, lunch: 4, dinner: 4, late: 4 };
export const SHIFT_GROUPS = [
  { key: "open", label: "Open", windowStart: "00:00", windowEnd: "11:00", main: "07:00" },
  { key: "lunch", label: "Lunch", windowStart: "12:00", windowEnd: "14:00", main: "13:00" },
  { key: "dinner", label: "Dinner", windowStart: "15:00", windowEnd: "18:00", main: "15:00" },
  { key: "late", label: "Late Night", windowStart: "20:00", windowEnd: "23:00", main: "22:00" },
];
