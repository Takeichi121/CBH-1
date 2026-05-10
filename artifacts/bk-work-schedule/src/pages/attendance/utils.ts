export const TIME_RE       = /^(\d{2}):(\d{2})$/;
export const TIME_RANGE_RE = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/;
export const TIME_ERR_MSG  = "รูปแบบไม่ถูกต้อง เช่น 05:00 หรือ 05:00 - 14:00 (ชั่วโมง 00-23, นาที 00-59)";

export const HH_OPTS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
export const MM_OPTS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  if (t.includes("T")) {
    const d = new Date(t);
    return `${d.getUTCHours().toString().padStart(2,"0")}:${d.getUTCMinutes().toString().padStart(2,"0")}`;
  }
  return t;
}

export function getLateStatus(rosterTime: string | null, clockInTime: string | null): "on-time" | "late" | "early" | "absent" | "unknown" {
  if (!clockInTime) return rosterTime ? "absent" : "unknown";
  if (!rosterTime) return "unknown";
  const rosterStart = rosterTime.split(" - ")[0]?.trim();
  if (!rosterStart) return "unknown";
  const [rh, rm] = rosterStart.split(":").map(Number);
  const [ch, cm] = clockInTime.split(":").map(Number);
  if (isNaN(rh) || isNaN(ch)) return "unknown";
  const rosterMins = rh * 60 + rm;
  const clockMins  = ch * 60 + cm;
  if (clockMins <= rosterMins) return "early";
  if (clockMins <= rosterMins + 5) return "on-time";
  return "late";
}

export function rosterStartH(rosterTime: string | null): number | null {
  if (!rosterTime) return null;
  const raw = rosterTime.split(" - ")[0]?.trim() || "";
  const h = parseInt(raw.split(":")[0] || "");
  return isNaN(h) ? null : h;
}

export function isValidTimePart(h: number, m: number): boolean {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function isValidTimeInput(val: string): boolean {
  const v = val.trim();
  if (!v) return true;
  if (v.toUpperCase() === "OFF") return true;
  const single = TIME_RE.exec(v);
  if (single) return isValidTimePart(parseInt(single[1]), parseInt(single[2]));
  const range = TIME_RANGE_RE.exec(v);
  if (range) {
    return isValidTimePart(parseInt(range[1]), parseInt(range[2]))
        && isValidTimePart(parseInt(range[3]), parseInt(range[4]));
  }
  return false;
}

export function isManagerPos(pos: string | null): boolean {
  if (!pos) return false;
  const p = pos.toLowerCase();
  return p.includes("manager") || p.includes("shift");
}

export function getPosPriority(pos: string | null): number {
  if (!pos) return 3;
  const p = pos.toLowerCase();
  if (p.includes("store manager") && !p.includes("asst") && !p.includes("assistant")) return 0;
  if (p.includes("assistant") || p.includes("asst")) return 1;
  if (p.includes("shift")) return 2;
  return 3;
}

export function moveRowFocus(e: React.KeyboardEvent, direction: 1 | -1) {
  const input = e.target as HTMLInputElement;
  const tr = input.closest("tr");
  const tbody = tr?.closest("tbody");
  if (!tr || !tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const rowIdx = rows.indexOf(tr);
  const rowInputs = Array.from(tr.querySelectorAll("input"));
  const colIdx = rowInputs.indexOf(input);
  let nextRowIdx = rowIdx + direction;
  while (nextRowIdx >= 0 && nextRowIdx < rows.length) {
    const nextInputs = Array.from(rows[nextRowIdx].querySelectorAll("input"));
    if (nextInputs[colIdx]) {
      (nextInputs[colIdx] as HTMLInputElement).focus();
      return;
    }
    nextRowIdx += direction;
  }
}
