import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TZ = "Asia/Bangkok";

export function todayBangkok(): string {
  const d = new Date();
  const parts = d.toLocaleDateString("en-CA", { timeZone: TZ });
  return parts;
}

export function nowBangkok(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

export function yesterdayBangkok(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}
