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
  // System is now open 24/7 for all users
  return false;
}

export function getWeekStartTuesday(date: Date | string) {
  const d = (date instanceof Date)
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
    : new Date(date + "T00:00:00"); // local midnight

  const day = d.getDay(); // 0=Sun,1=Mon,2=Tue,...6=Sat
  const diff = (day - 2 + 7) % 7;   // how many days to go back to Tuesday
  d.setDate(d.getDate() - diff);
  return d; // Tuesday
}

export function getWeekDaysTuesday(date: Date | string) {
  const start = getWeekStartTuesday(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  return days; // [Tue..Mon]
}

export function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekRangeTuesday(anyDate?: string) {
  const base = anyDate || toYMD(new Date());
  const weekDays = getWeekDaysTuesday(base);
  const days = weekDays.map(d => toYMD(d));
  
  return {
    start: days[0],
    end: days[6],
    days
  };
}

export const DEFAULT_CAPACITY = { open: 4, swing: 4, lunch: 4, dinner: 4, close: 4, late: 4 };
export const SHIFT_GROUPS = [
  { 
    key: "open", 
    label: "Open", 
    windowStart: "00:00", 
    windowEnd: "11:00", 
    main: "07:00",
    defaultTime: "07:00 - 16:00",
    times: ["07:00 - 16:00"]
  },
  { 
    key: "swing", 
    label: "Swing", 
    windowStart: "08:00", 
    windowEnd: "12:00", 
    main: "09:00",
    defaultTime: "09:00 - 18:00",
    times: ["09:00 - 18:00"]
  },
  { 
    key: "lunch", 
    label: "Lunch", 
    windowStart: "12:00", 
    windowEnd: "15:00", 
    main: "13:00",
    defaultTime: "13:00 - 22:00",
    times: ["13:00 - 22:00"]
  },
  { 
    key: "dinner", 
    label: "Dinner", 
    windowStart: "14:00", 
    windowEnd: "17:00", 
    main: "15:00",
    defaultTime: "15:00 - 00:00",
    times: ["15:00 - 00:00"]
  },
  { 
    key: "close", 
    label: "Close", 
    windowStart: "18:00", 
    windowEnd: "21:00", 
    main: "19:00",
    defaultTime: "19:00 - 04:00",
    times: ["19:00 - 04:00"]
  },
  { 
    key: "late", 
    label: "Late Night", 
    windowStart: "20:00", 
    windowEnd: "23:59", 
    main: "22:00",
    defaultTime: "22:00 - 07:00",
    times: ["22:00 - 07:00"]
  },
];
