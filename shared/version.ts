export const APP_VERSION = "1.5.0";

export const CHANGELOG = [
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
