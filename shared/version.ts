export const APP_VERSION = "2.3.0";

export type ChangelogLabel = "feature" | "bugfix" | "release" | "improvement";

export interface ChangelogEntry {
  version: string;
  date: string;
  label: ChangelogLabel;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.3.0",
    date: "2026-03-24",
    label: "improvement",
    changes: [
      "Chann AI: Quick Actions ใหม่ — แบ่งเป็น 4 หมวด (ภาพรวม, ยอดขาย, พนักงาน, ระบบ) พร้อม header label",
      "Chann AI: ปุ่ม Copy บน message ของ Chann — hover เพื่อคัดลอกข้อความ",
      "Chann AI: Tool Progress Badge — แสดงชื่อ tool ที่กำลังรันอยู่ขณะ AI คิด",
      "Chann AI: เพิ่ม tool exportSalesReport — สร้างไฟล์ Excel รายงานยอดขายรายเดือนพร้อมดาวน์โหลด",
      "Chann AI: ปรับปรุง System Prompt ด้วย Chain-of-Thought instructions ที่ชัดเจนขึ้น",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-03-22",
    label: "feature",
    changes: [
      "Notification Bell — กระดิ่งแจ้งเตือนใน header พร้อม badge จำนวนที่ยังไม่อ่าน",
      "Event Notifications — แจ้งเตือนอัตโนมัติทุก event สำคัญ: คำขอผู้จัดการ, ยืมคืน, ตารางงาน, รายงาน",
      "Version Update Notifications — ดูประวัติการอัพเดทผ่านกระดิ่งแจ้งเตือนได้เลย",
    ],
  },
  {
    version: "2.1.5",
    date: "2026-03-22",
    label: "bugfix",
    changes: [
      "แก้ไขไอคอน PWA/iOS แสดงไม่ถูกต้อง — เปลี่ยนจาก SVG เป็น PNG (192×192, 512×512)",
      "ใช้ ImageMagick render PNG ก่อน deploy เพื่อหลีกเลี่ยงปัญหา font rendering ใน SVG context",
    ],
  },
  {
    version: "2.1.4",
    date: "2026-03-22",
    label: "bugfix",
    changes: [
      "แก้ไขไอคอน Browser Tab แสดงแค่ตัว 'C' — เปลี่ยน favicon จาก SVG เป็น PNG",
      "SVG favicon ไม่รองรับ Google Fonts — ใช้ favicon.png แทนเพื่อแสดงโลโก้ CBH ถูกต้อง",
    ],
  },
  {
    version: "2.1.3",
    date: "2026-03-22",
    label: "improvement",
    changes: [
      "Rebranding: เปลี่ยน app identity เป็น CBH (Chann Back House) เต็มรูปแบบ",
      "โลโก้ใหม่: Data House icon (หลังคา + 3 bars + CBH text) gradient เขียวเข้ม #021008→#10b981",
      "ลบทุก reference ของ 'Burger King'/'BK Grand Diamond' ออกจาก frontend และ server",
    ],
  },
  {
    version: "2.1.2",
    date: "2026-03-15",
    label: "feature",
    changes: [
      "Chann AI: อัพเกรดใช้ Claude (claude-sonnet-4-5) เป็น AI หลัก — ทั้ง tool calling และ streaming",
      "Chann AI: เพิ่ม Model Selector — เลือก Claude / GPT-4o / Gemini ได้จาก UI",
      "Chann AI: LLM Router รองรับ Claude streaming ผ่าน Anthropic SDK",
      "Chann AI: UI ใหม่สไตล์ Dark Mode — gradient header, animated typing indicator",
      "Chann AI: Claude เป็น default provider, fallback ไป OpenAI แล้ว Gemini",
      "Chann AI: Agentic tool-calling loop รองรับ Claude tool use — ไม่ต้องพึ่ง OpenAI",
    ],
  },
  {
    version: "2.0.9",
    date: "2026-03-07",
    label: "feature",
    changes: [
      "Agent Requests: เปลี่ยนเป็น Chat Interface — ส่ง request ผ่านช่องแชทได้เลย",
      "AI ตอบกลับอัตโนมัติด้วย OpenAI — Replit Agent ตอบรับทุก request ใน 2-3 วินาที",
      "เพิ่มปุ่มเปลี่ยนภาษา (ไทย/EN) ใน Header หลัก",
    ],
  },
  {
    version: "2.0.8",
    date: "2026-03-04",
    label: "improvement",
    changes: [
      "Desktop nav: Staff เห็นแค่ Dashboard + My Work, Manager เห็นทุก feature menu",
      "Roster ออกจาก desktop nav bar (Roster data อยู่ใน My Work อยู่แล้ว)",
      "Settings + Handbook ออกจาก desktop nav — เข้าผ่าน Profile Dropdown แทน",
      "Mobile sidebar: ยังคงแสดงครบทุกเมนู รวม Roster + Settings + Handbook",
    ],
  },
  {
    version: "2.0.7",
    date: "2026-03-04",
    label: "improvement",
    changes: [
      "Profile Dropdown & Mobile Sidebar: redesign ให้เหมือน BK Corporate Portal — avatar + ชื่อ + email + เมนู",
      "Desktop Dropdown: header สีน้ำตาล (primary) พร้อม avatar ใหญ่, ชื่อ, email, ปุ่มแก้ไข, ออกจากระบบ",
      "Desktop Dropdown: เมนู Home (My Work), โปรไฟล์ของฉัน, กิจกรรมของฉัน → /admin",
      "Mobile Sidebar: profile zone สีน้ำตาล (primary) แทนที่ grid buttons เดิม",
      "Mobile Sidebar: Theme toggle ย้ายไปอยู่ใน SheetHeader มุมขวา",
    ],
  },
  {
    version: "2.0.6",
    date: "2026-03-03",
    label: "improvement",
    changes: [
      "Dashboard: การ์ดบนซ้ายแสดงทีมผู้จัดการ, การ์ดขวาล่างแสดงพนักงาน — แสดงชื่อจริง (ชื่อเล่น) + กะงาน",
    ],
  },
  {
    version: "2.0.5",
    date: "2026-03-03",
    label: "feature",
    changes: [
      "Chann: ตั้งเวลาแจ้งเตือนอัตโนมัติ 22:45 น. — แจ้งงานค้างที่รอดำเนินการ (in-app notification)",
    ],
  },
  {
    version: "2.0.4",
    date: "2026-03-02",
    label: "bugfix",
    changes: [
      "Daily Sales: แก้ไขบั๊ก ส่งผ่านไลน์ไม่แสดงข้อมูลตารางงาน — ระบบจะบันทึกฟอร์มอัตโนมัติก่อนส่งไปไลน์ทุกครั้ง",
    ],
  },
  {
    version: "2.0.3",
    date: "2026-03-02",
    label: "improvement",
    changes: [
      "Weekly Sales: Unaccounted Top 3 ดึงรายการจากระบบยืมคืน (Borrow Items) แทนการใช้ BK-CR categories",
    ],
  },
  {
    version: "2.0.2",
    date: "2026-03-02",
    label: "feature",
    changes: [
      "Daily Sales: แสดง banner แจ้งเตือนส่งรายงานเมื่อวาน (ก่อน 20:00 น.)",
      "Weekly Sales: แสดง banner แจ้งเตือนสัปดาห์ที่ต้องส่ง (วันอังคารก่อน 20:00 น.)",
      "Weekly Sales: ปุ่ม 'ดึงยอดจาก Daily' — auto-populate Sale/TC/Waste จากรายงานประจำวัน",
      "Weekly Sales: ช่อง TA คำนวณอัตโนมัติจาก Sale ÷ TC (ตลอดเวลา)",
      "Weekly Sales: เพิ่ม Report History แสดงรายงาน 12 สัปดาห์ล่าสุด — คลิกเพื่อดูข้อมูล",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-03-02",
    label: "improvement",
    changes: [
      "เปลี่ยน dropdown Waste Top 3 / Unaccounted Top 3 ในรายงานสัปดาห์ให้ใช้ BK-CR categories (32 รายการ)",
      "ลบการดึงข้อมูลจาก Borrow Tracker ออก — ใช้รายการ BK-CR มาตรฐานแทน",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-03-01",
    label: "improvement",
    changes: [
      "อัพเกรด Chann AI เป็น gpt-4o ทั้งระบบ (จาก gpt-4o-mini) — ฉลาดและแม่นยำขึ้น",
      "ปรับ system prompt ให้ Chann ตอบกระชับและรวดเร็วขึ้น",
      "เพิ่มระบบประวัติอัพเดทอัตโนมัติ — ทุกการแก้ไขบันทึกใน shared/version.ts",
      "Handbook page ซิงค์กับ version.ts โดยอัตโนมัติ ไม่มี hardcoded changelog แยก",
      "Settings page แสดงการอัพเดทล่าสุดพร้อมลิงก์ไปประวัติทั้งหมด",
    ],
  },
  {
    version: "1.9.0",
    date: "2026-02-27",
    label: "feature",
    changes: [
      "เพิ่ม Role 'Area Manager' (role=area) — อ่านข้อมูลได้เหมือน Manager",
      "ระบบปลดล็อก 30 นาที: กรอกรหัสผ่านก่อนแก้ไขข้อมูล",
      "AreaLockBanner แสดงสถานะล็อก/ปลดล็อกบนหน้า Daily Sales และ Settings",
      "สร้างบัญชี kitti01 (Area Manager) — ต้องเปลี่ยนรหัสผ่านครั้งแรก",
      "เพิ่มตัวเลือก 'Area' ในหน้าสมัครสมาชิก (ใช้ verify code แยก)",
    ],
  },
  {
    version: "1.8.2",
    date: "2026-02-26",
    label: "feature",
    changes: [
      "เพิ่ม Survey Count ในรายงาน LINE Daily Report ต่อจากบรรทัด OSAT",
      "แสดงชื่อจริง (fullName) แทน username ใน Staff Working Today บน Dashboard",
      "อัพเดทคู่มือการใช้งาน (Handbook) ครอบคลุมทุกโมดูล พร้อมประวัติเวอร์ชัน",
    ],
  },
  {
    version: "1.8.1",
    date: "2026-02-26",
    label: "bugfix",
    changes: [
      "แก้ไข Waste double-counting — settings-page save รีเซ็ต wasteMealDaily เป็น 0 ถูกต้อง",
      "แก้ไข OData endpoint ใช้ field ชื่อผิด (targetAmount → targetSales, wasteAmount → wasteRawDaily)",
      "แก้ไข code-proposals API ใช้ verifyAdminAccess ที่ไม่ได้นิยาม → เปลี่ยนเป็น verifyDevAccess",
      "แก้ไข Chann tool dispatch null safety สำหรับ user.role",
      "ลบไฟล์ stub ที่ไม่ได้ใช้งาน ทำให้ TypeScript 0 errors",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-02-25",
    label: "feature",
    changes: [
      "Chann AI: เพิ่ม tools ครอบคลุมทุก storage operation (read + write)",
      "Read tools ใหม่: getWasteTarget, getStoreSettings, getSystemLogs, getBorrowTransactions, getMtdSummary, getLaborSettings ฯลฯ",
      "Write tools ใหม่ (Manager): bulkSaveDailyTargets, saveDailyLabor, bulkSaveShifts",
      "Write tools ใหม่ (Admin): deleteBorrowTransaction, setWasteTarget, updateStoreSettings ฯลฯ",
      "Quick actions เพิ่ม: คำขอสลับกะ, Waste เดือนนี้, ตั้งค่าร้าน, Audit Log",
    ],
  },
  {
    version: "1.7.2",
    date: "2026-02-26",
    label: "bugfix",
    changes: [
      "Timezone: ระบบทั้งหมดใช้ Asia/Bangkok (UTC+7) อย่างสอดคล้องกัน",
      "เพิ่ม nowIso(), todayBangkok(), nowBangkok() ใน server/utils.ts",
      "Frontend ใช้ todayBangkok() แทน new Date() ทุกหน้า",
      "Chann system prompt แสดงเวลาปัจจุบันของกรุงเทพ",
    ],
  },
  {
    version: "1.7.1",
    date: "2026-02-25",
    label: "bugfix",
    changes: [
      "แก้ไข Borrow pages (Items, Branches, Dashboard) ใช้ GET queryFn แต่ backend ต้องการ POST",
      "ลบ Toaster ซ้ำใน App.tsx",
      "throwIfResNotOk แสดง error message สะอาดขึ้น",
      "เพิ่ม path prefix validation สำหรับ code-proposals/review",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-02-25",
    label: "feature",
    changes: [
      "Chann AI: Full Agent Access — role-based write permissions (Admin=all, Manager=roster+reports, Staff=read-only)",
      "tools ใหม่: createUser, updateUserProfile, resetUserPassword, addBorrowTransaction, executeSqlQuery",
      "Chann สามารถรัน SQL query โดยตรงได้ (Admin เท่านั้น)",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-02-21",
    label: "feature",
    changes: [
      "Chann AI: เพิ่ม write tools สำหรับ Admin (saveDailySales, saveDailyTarget, saveShift ฯลฯ)",
      "Sales Settings: เพิ่ม 5 คอลัมน์ใหม่ (LY Sales, Forecast, LY TC, Target TC, Target TA) + 10 คอลัมน์คำนวณ",
      "LINE OA integration: ส่งรายงาน Daily Report ไป LINE กลุ่มได้",
      "Export Excel button พร้อม auto filename",
      "Audit logging สำหรับ write operations ทุกอัน",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-01-16",
    label: "feature",
    changes: [
      "เพิ่มระบบสมัครสมาชิกใหม่ให้ผู้ใช้กำหนด Username เองได้",
      "เพิ่มช่อง Email, เบอร์โทร, ยืนยันรหัสผ่านในฟอร์มสมัคร",
      "เพิ่ม Validation สำหรับ Username (ตัวอักษร/ตัวเลข/_ เท่านั้น)",
      "เพิ่มการตรวจสอบ Username ซ้ำ",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-01-16",
    label: "feature",
    changes: [
      "เพิ่มระบบ Reset Password ผ่าน OTP ทาง Email",
      "ใช้ Resend สำหรับส่ง OTP Email",
      "เพิ่มการยืนยัน Username + Email ก่อนส่ง OTP",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-01-16",
    label: "feature",
    changes: [
      "เพิ่มระบบ Staff Chat แบบ Real-time ด้วย Socket.IO",
      "เพิ่ม Floating Chat Widget ใช้งานได้ทุกหน้า",
      "รองรับ Group Chat และ Private Chat",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-01-16",
    label: "feature",
    changes: [
      "เพิ่มระบบ Borrow Tracker สำหรับยืม-คืนอุปกรณ์ระหว่างสาขา",
      "รองรับ Import Excel/CSV สำหรับ Branches และ Items",
      "เพิ่มกราฟแสดงแนวโน้มการยืม-คืน",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01-15",
    label: "feature",
    changes: [
      "เพิ่มระบบ Labor Cost Management",
      "เพิ่มหน้า Daily Sales Report",
      "คำนวณ COL% และ TCMH อัตโนมัติ",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    label: "release",
    changes: [
      "ระบบจองกะเริ่มต้น",
      "ระบบ Login/Logout",
      "หน้า Roster สำหรับ Manager",
      "รองรับภาษาไทย/อังกฤษ",
    ],
  },
];
