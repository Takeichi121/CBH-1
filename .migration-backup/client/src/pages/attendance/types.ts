export interface ClockRecord {
  id: number;
  date: string;
  storeId: string;
  employeeFullName: string;
  employeeNickName: string | null;
  position: string | null;
  rosterTime: string | null;
  clockInTime: string | null;
  clockOutTime: string | null;
  notes: string | null;
  importSource: string | null;
}

export const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
export const MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const DOW_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const DOW_EN3 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export const EMP_COLORS = [
  { header: "#E2EFDA", accent: "#375623", colHead: "#A9D18E" },
  { header: "#FCE4D6", accent: "#833C00", colHead: "#F4B183" },
  { header: "#FFF2CC", accent: "#7F6000", colHead: "#FFD966" },
  { header: "#DDEBF7", accent: "#1F3864", colHead: "#9DC3E6" },
  { header: "#EDD6F8", accent: "#7030A0", colHead: "#C5A3E3" },
];

export const EMP_COLORS_CSV = [
  { header: "#E2EFDA", accent: "#375623", colHead: "#A9D18E" },
  { header: "#FCE4D6", accent: "#833C00", colHead: "#F4B183" },
  { header: "#FFF2CC", accent: "#7F6000", colHead: "#FFD966" },
  { header: "#DDEBF7", accent: "#1F3864", colHead: "#9DC3E6" },
  { header: "#EDD6F8", accent: "#7030A0", colHead: "#C5A3E3" },
];

export const SHIFT_DEFS = [
  { name: "Swing",  label: "05:00 / 06:00", bg: "#FF6600", fg: "#fff", h0: 5,  h1: 6  },
  { name: "Open",   label: "06:00 / 08:00", bg: "#92D050", fg: "#fff", h0: 7,  h1: 10 },
  { name: "Mid",    label: "11:00 / 13:00", bg: "#70AD47", fg: "#fff", h0: 11, h1: 19 },
  { name: "Late N", label: "20:00 / 22:00", bg: "#FFC000", fg: "#333", h0: 20, h1: 22 },
];

export const CSV_SHIFTS_FE = [
  { label: "Swing/5:00",   h0: 5,  h1: 5  },
  { label: "Open/6:00",    h0: 6,  h1: 6  },
  { label: "Swing/7:00",   h0: 7,  h1: 7  },
  { label: "8:00-11:00",   h0: 8,  h1: 11 },
  { label: "Mid/12:00",    h0: 12, h1: 12 },
  { label: "13:00",        h0: 13, h1: 13 },
  { label: "Swing/14:00",  h0: 14, h1: 14 },
  { label: "15:00-16:00",  h0: 15, h1: 16 },
  { label: "Late N/21:00", h0: 21, h1: 21 },
  { label: "Swing/22:00",  h0: 22, h1: 22 },
];
