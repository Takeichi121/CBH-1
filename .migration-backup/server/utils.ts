import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const SALT = process.env.SALT || "BK_SALT_v2_change_me";

// ✅ 1. Password Security (New & Secure)
// ---------------------------------------------------------

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// (Legacy function - เก็บไว้เผื่อมีส่วนอื่นเรียกใช้ แต่แนะนำให้ใช้ hashPassword ด้านบนแทน)
// export function hashPass(password: string): string {
//   return createHash("sha256").update(SALT + "::" + String(password || "")).digest("hex");
// }

// ✅ 2. Date & Time Helpers (Asia/Bangkok = UTC+7)
// ---------------------------------------------------------

const TZ = "Asia/Bangkok";

export function nowBangkok(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

export function nowIso() {
  return toBangkokIso(new Date());
}

export function toBangkokIso(d: Date): string {
  const bkk = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const yyyy = bkk.getFullYear();
  const MM = String(bkk.getMonth() + 1).padStart(2, "0");
  const dd = String(bkk.getDate()).padStart(2, "0");
  const hh = String(bkk.getHours()).padStart(2, "0");
  const mm = String(bkk.getMinutes()).padStart(2, "0");
  const ss = String(bkk.getSeconds()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+07:00`;
}

export function todayBangkok(): string {
  return toYMD(nowBangkok());
}

export function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

// ✅ 3. Username Generators
// ---------------------------------------------------------

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

// ✅ 4. Maintenance Window Logic
// ---------------------------------------------------------

export interface MaintenanceWindow {
  enabled: boolean;
  startDay: number;  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime: string; // HH:MM format
  endDay: number;    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  endTime: string;   // HH:MM format
}

export const DEFAULT_MAINTENANCE_WINDOW: MaintenanceWindow = {
  enabled: false,
  startDay: 2,      // Tuesday
  startTime: "12:00",
  endDay: 3,        // Wednesday
  endTime: "00:00"
};

export function isSystemClosed(config?: Record<string, string>): boolean {
  if (!config) return false;

  const enabled = config["maintenance_enabled"] === "true";
  if (!enabled) return false;

  const startDay = Number(config["maintenance_start_day"] ?? DEFAULT_MAINTENANCE_WINDOW.startDay);
  const startTime = config["maintenance_start_time"] ?? DEFAULT_MAINTENANCE_WINDOW.startTime;
  const endDay = Number(config["maintenance_end_day"] ?? DEFAULT_MAINTENANCE_WINDOW.endDay);
  const endTime = config["maintenance_end_time"] ?? DEFAULT_MAINTENANCE_WINDOW.endTime;

  return isInMaintenanceWindow(startDay, startTime, endDay, endTime);
}

function isInMaintenanceWindow(startDay: number, startTime: string, endDay: number, endTime: string): boolean {
  const bkk = nowBangkok();
  const thailandDay = bkk.getDay();
  const currentTimeMinutes = bkk.getHours() * 60 + bkk.getMinutes();

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Check if current time is within maintenance window
  if (startDay === endDay) {
    // Same day maintenance
    if (thailandDay === startDay && currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
      return true;
    }
  } else if (startDay < endDay) {
    // Multi-day within same week (e.g., Tue to Wed)
    if (thailandDay === startDay && currentTimeMinutes >= startMinutes) {
      return true;
    }
    if (thailandDay === endDay && currentTimeMinutes < endMinutes) {
      return true;
    }
    if (thailandDay > startDay && thailandDay < endDay) {
      return true;
    }
  } else {
    // Spans week boundary (e.g., Sat to Mon)
    if (thailandDay === startDay && currentTimeMinutes >= startMinutes) {
      return true;
    }
    if (thailandDay === endDay && currentTimeMinutes < endMinutes) {
      return true;
    }
    if (thailandDay > startDay || thailandDay < endDay) {
      return true;
    }
  }

  return false;
}

// ✅ 5. Configuration Constants (Shifts & Capacity)
// ---------------------------------------------------------

export const DEFAULT_CAPACITY = { open: 4, swing: 4, lunch: 4, dinner: 4, close: 4, late: 4, com: 99, off: 99, meeting_manager: 99, meeting_zone: 99, other: 99, sick: 99 };

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
  { 
    key: "com", 
    label: "COM (ชดเชย)", 
    windowStart: "00:00", 
    windowEnd: "23:59", 
    main: "00:00",
    defaultTime: "00:00 - 00:00",
    times: ["00:00 - 00:00"]
  },
  { 
    key: "off", 
    label: "OFF (หยุด)", 
    windowStart: "00:00", 
    windowEnd: "23:59", 
    main: "00:00",
    defaultTime: "00:00 - 00:00",
    times: ["00:00 - 00:00"]
  },
  { 
    key: "meeting_manager", 
    label: "Manager Meeting", 
    windowStart: "09:00", 
    windowEnd: "12:00", 
    main: "09:00",
    defaultTime: "09:00 - 12:00",
    times: ["09:00 - 12:00"]
  },
  { 
    key: "meeting_zone", 
    label: "Zone Meeting", 
    windowStart: "09:00", 
    windowEnd: "12:00", 
    main: "09:00",
    defaultTime: "09:00 - 12:00",
    times: ["09:00 - 12:00"]
  },
  { 
    key: "other", 
    label: "Other", 
    windowStart: "00:00", 
    windowEnd: "23:59", 
    main: "09:00",
    defaultTime: "09:00 - 18:00",
    times: ["09:00 - 18:00"]
  },
  { 
    key: "sick", 
    label: "Sick (ลาป่วย)", 
    windowStart: "00:00", 
    windowEnd: "23:59", 
    main: "00:00",
    defaultTime: "00:00 - 00:00",
    times: ["00:00 - 00:00"]
  },
];