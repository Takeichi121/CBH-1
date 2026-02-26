export const APP_VERSION = "1.8.2";

export const CHANGELOG = [
  {
    version: "1.8.2",
    date: "2026-02-26",
    changes: [
      "เพิ่ม Survey Count ในรายงาน LINE Daily Report ต่อจากบรรทัด OSAT",
      "แสดงชื่อจริง (fullName) แทน username ใน Staff Working Today บน Dashboard",
      "อัพเดทคู่มือการใช้งาน (Handbook) ครอบคลุมทุกโมดูล พร้อมประวัติเวอร์ชัน",
    ],
  },
  {
    version: "1.8.1",
    date: "2026-02-26",
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
    changes: [
      "Chann AI: Full Agent Access — role-based write permissions (Admin=all, Manager=roster+reports, Staff=read-only)",
      "tools ใหม่: createUser, updateUserProfile, resetUserPassword, addBorrowTransaction, executeSqlQuery",
      "Chann สามารถรัน SQL query โดยตรงได้ (Admin เท่านั้น)",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-02-21",
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
    changes: [
      "เพิ่มระบบ Reset Password ผ่าน OTP ทาง Email",
      "ใช้ Resend สำหรับส่ง OTP Email",
      "เพิ่มการยืนยัน Username + Email ก่อนส่ง OTP",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-01-16",
    changes: [
      "เพิ่มระบบ Staff Chat แบบ Real-time ด้วย Socket.IO",
      "เพิ่ม Floating Chat Widget ใช้งานได้ทุกหน้า",
      "รองรับ Group Chat และ Private Chat",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-01-16",
    changes: [
      "เพิ่มระบบ Borrow Tracker สำหรับยืม-คืนอุปกรณ์ระหว่างสาขา",
      "รองรับ Import Excel/CSV สำหรับ Branches และ Items",
      "เพิ่มกราฟแสดงแนวโน้มการยืม-คืน",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01-15",
    changes: [
      "เพิ่มระบบ Labor Cost Management",
      "เพิ่มหน้า Daily Sales Report",
      "คำนวณ COL% และ TCMH อัตโนมัติ",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    changes: [
      "ระบบจองกะเริ่มต้น",
      "ระบบ Login/Logout",
      "หน้า Roster สำหรับ Manager",
      "รองรับภาษาไทย/อังกฤษ",
    ],
  },
];
