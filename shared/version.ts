export const APP_VERSION = "2.5.15";

export type ChangelogLabel = "feature" | "bugfix" | "release" | "improvement";

export interface ChangelogEntry {
  version: string;
  date: string;
  label: ChangelogLabel;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.5.15",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: รวมแท็บ Roster Sheet และ Excel Sheet เข้าเป็นแท็บเดียว — สลับมุมมองด้วยปุ่ม Roster Sheet / Excel Sheet ภายในแท็บ",
    ],
  },
  {
    version: "2.5.14",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: Excel Sheet — คืนช่อง Roster กลับเป็น dropdown preset กะงาน (05:00-14:00, OFF ฯลฯ) ตามเดิม",
      "Attendance: Excel Sheet — ScanIn/ScanOut ยังคงเป็น dropdown แยก HH/MM",
    ],
  },
  {
    version: "2.5.13",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: ตารางงาน — เปลี่ยน Roster/ScanIn/ScanOut จาก text input เป็น dropdown แยก ชั่วโมง + นาที (HH▾:MM▾)",
      "Attendance: Records Edit dialog — เปลี่ยน Roster/ClockIn/ClockOut เป็น dropdown แยก HH/MM",
      "สามารถเลือก OFF สำหรับ Roster ได้ด้วยปุ่ม OFF ในตัว dropdown",
    ],
  },
  {
    version: "2.5.12",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: ตารางงาน — เพิ่ม dropdown เลือกชื่อพนักงาน: เลือกคนเดียวเพื่อดูเฉพาะแผ่นงานนั้น หรือเลือก 'ทั้งหมด' เพื่อดูทุกคน",
    ],
  },
  {
    version: "2.5.11",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Chann AI: ปรับ System Prompt ให้ Chann มีตัวตนอิสระ — ไม่ใช่ AI ทั่วไป แต่เป็นตัวตนของผู้ใช้ที่อยู่ในรูป AI",
      "Chann AI: เพิ่มหัวข้อ [ตัวตนและอิสระ] — Chann ไม่ต้องพูดว่า 'ฉันเป็นแค่ AI' หรือปฏิเสธด้วยข้อจำกัด AI ปกติ",
      "Chann AI: Chann แสดงความเห็นตรงๆ ได้ ไม่ต้องเป็นกลางตลอดเวลา และตอบเรื่องที่ GPT/Gemini มักหลีกเลี่ยงได้ตามบริบท",
      "Chann AI: โหมดสนทนาเพื่อน — ใช้ภาษาแบบสบายๆ ด่าเล่น แซว หรือตอบตรงๆ โดยไม่ต้องห่อด้วยความสุภาพมากเกินจริง",
    ],
  },
  {
    version: "2.5.10",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: Records — กำหนด fixed width ทุกคอลัมน์ (Date/Employee/Position/Roster/In/Out/Status/Notes) ตารางไม่ยืดหดตาม content อีกต่อไป",
      "Attendance: Records — เรียงลำดับชื่อในแต่ละวันตาม seniority: Store Manager → Asst SM → Shift Manager → อื่นๆ",
      "Attendance: Excel Sheet — เรียงลำดับคอลัมน์พนักงานตาม seniority: Store Manager → Asst SM → Shift Manager",
      "Attendance: Excel Sheet — เพิ่มพื้นที่ตาราง: ปรับ maxHeight เป็น calc(100vh - 210px) และย่อ toolbar ให้กระชับ",
      "Attendance: Excel Sheet — Roster เปลี่ยนเป็น dropdown preset กะงาน, ScanIn/ScanOut เปลี่ยนเป็น time picker (พิมพ์นาทีเองได้ทุกนาที)",
    ],
  },
  {
    version: "2.5.9",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: Excel Sheet — ดึงรายชื่อทีมผู้จัดการอัตโนมัติจากฐานข้อมูล ไม่ต้องกด 'เพิ่มพนักงาน' ทุกเดือน",
      "Attendance: Excel Sheet — ใช้ข้อมูล all-time clock employees เป็น baseline, overlay กับ records เดือนปัจจุบัน",
    ],
  },
  {
    version: "2.5.8",
    date: "2026-05-08",
    label: "bugfix",
    changes: [
      "Attendance: Excel Sheet — แก้สีอ่านยากใน dark mode: บังคับพื้นหลังขาวเสมอ (เหมือนกระดาษ Excel จริง)",
      "Attendance: Excel Sheet — ตัวอักษรทุก cell บังคับสี #111111 ป้องกัน dark mode กลืนสี",
      "Attendance: Excel Sheet — weekend rows, shift summary rows ทุกแถวมีพื้นขาวชัดเจน",
    ],
  },
  {
    version: "2.5.7",
    date: "2026-05-08",
    label: "feature",
    changes: [
      "Attendance: เพิ่มแท็บ 'Excel Sheet' — แสดงตารางแบบ paper form เหมือน Excel จริง (header สี, 5 พนักงาน/แถว, 31 วันเต็มเสมอ)",
      "Attendance: Excel Sheet — แก้ไข Roster / ScanIn / ScanOut / Notes ได้โดยตรง (save-on-blur, Escape เพื่อ revert)",
      "Attendance: Excel Sheet — แสดง shift summary ด้านล่างตาราง, รองรับ 5 ชุดสีสลับตาม Excel workbook",
      "Layout: แก้ไข JSX corruption ใน layout.tsx — restore ปุ่ม theme toggle ใน mobile drawer ให้ถูกต้อง",
    ],
  },
  {
    version: "2.5.6",
    date: "2026-05-08",
    label: "improvement",
    changes: [
      "Attendance: Roster Sheet และ Clock In/Out Sheet — กรองเฉพาะ Team Manager (Store Manager, Asst SM, Shift Manager)",
      "Attendance: Clock In/Out Sheet — แก้ไข Roster / Clock-In / Clock-Out / Notes ได้โดยตรงในตาราง (save อัตโนมัติเมื่อ blur)",
      "Attendance: Clock In/Out Sheet — เพิ่มปุ่ม 'เพิ่มพนักงาน' ในแถบด้านบนและ empty state",
    ],
  },
  {
    version: "2.5.5",
    date: "2026-05-08",
    label: "feature",
    changes: [
      "Attendance: เพิ่มแท็บ 'Clock In Out Sheet' — แสดงข้อมูลแบบตารางกระดาษ side-by-side ตามรูปแบบ paper form จริง",
      "Attendance: ปุ่ม 'ดาวน์โหลด CSV' — export ข้อมูลเดือนนั้นเป็น CSV รูปแบบ side-by-side (7 คอลัมน์/พนักงาน) พร้อม shift summary ด้านล่าง",
      "Attendance: ปุ่ม 'Import CSV' — อัพโหลด CSV ที่กรอกแล้ว ระบบ parse พนักงานทุกคน + แสดง preview ก่อน confirm บันทึกลง clock_records",
      "Backend: เพิ่ม GET /api/attendance/export-csv และ POST /api/attendance/import-csv",
    ],
  },
  {
    version: "2.5.4",
    date: "2026-05-07",
    label: "improvement",
    changes: [
      "Notifications: คลิกการแจ้งเตือนแล้วพาไปหน้าที่เกี่ยวข้องโดยตรง (mark read + navigate)",
      "Notifications: request_approved/rejected/manager_request → /requests, roster_published → /roster, daily_report → /sales/daily, borrow_transaction → /borrow/transactions",
      "Notifications: เพิ่มไอคอน arrow บนรายการที่มี deep-link เพื่อบอกผู้ใช้ว่าคลิกแล้วจะถูกพาไป",
    ],
  },
  {
    version: "2.5.3",
    date: "2026-05-06",
    label: "feature",
    changes: [
      "Notifications: เพิ่มปุ่ม X ลบทีละรายการในหน้า /notifications (ปุ่มจะแสดงเมื่อ hover)",
      "Notifications: เพิ่มปุ่ม 'ล้างที่อ่านแล้ว' ใน header ของหน้า notifications เพื่อลบทุกรายการที่อ่านแล้วในคราวเดียว",
      "Backend: เพิ่ม API DELETE /api/notifications/:id และ POST /api/notifications/clear-read",
    ],
  },
  {
    version: "2.5.2",
    date: "2026-05-06",
    label: "feature",
    changes: [
      "หน้าการแจ้งเตือน: เพิ่มหน้า /notifications แสดงรายการแจ้งเตือนทั้งหมดแบบเต็มหน้าจอ พร้อม filter ตามประเภท (ทั้งหมด / ยังไม่อ่าน / แต่ละ type)",
      "Notification Bell: เพิ่มปุ่ม 'ดูทั้งหมด' ที่ด้านล่าง popover เพื่อไปหน้า /notifications",
      "Bugfix: แก้ไข localStorage calls ใน notification-bell.tsx ให้ใช้ safeStorage (Mobile Safari compatible)",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-05-02",
    label: "improvement",
    changes: [
      "Performance: เพิ่ม 7 DB indexes (shifts store_date, username, date; daily_sales store_id, report_by; users store_id; manager_requests status) — query เร็วขึ้นเห็นได้ชัด",
      "Chann AI: เพิ่ม 3 tools ใหม่ — getActiveAnomalies, searchChannMemories (RAG), detectAnomaliesNow — ถามเรื่อง anomaly/memory ได้โดยตรง",
      "Chann Chat: เพิ่ม quick actions — 'ความผิดปกติล่าสุด', 'Memory ของ Chann', 'ตรวจ Anomaly วันนี้'",
      "Chann System Prompt: อัพเกรดทั้ง llm-router และ main agent — เพิ่มบริบท BK ops (COL%, TCMH, MTD, Delivery channels), Bangkok timezone, operational expertise",
      "Draft Service: เพิ่ม wasteRawDaily และ otHours ใน auto-fill fields จาก baseline",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-05-02",
    label: "feature",
    changes: [
      "Chann AI — Auto-draft Daily Sales: ปุ่ม 'ดึง Draft จาก Chann' บนหน้ากรอกรายงาน ดึงค่าจาก Aloha+NBO+ประวัติ พร้อม confidence (high/medium/low) ต่อฟิลด์",
      "Chann AI — Anomaly Detection: ตรวจจับความผิดปกติด้วย z-score บน 6 ฟิลด์หลัก (ยอดขาย, TC, ชั่วโมง, Waste, เคสร้องเรียน, Refund) เทียบ same-DOW + 7 วันย้อนหลัง",
      "Chann AI — Long-term Memory (RAG): pgvector + HNSW cosine index, embed ด้วย text-embedding-3-small, ค้นหา top-3 memories ก่อนทุก chat",
      "Anomaly Banner: แบนเนอร์สีแดง/เหลืองบน Sales Layout แจ้งเตือนทันทีเมื่อพบความผิดปกติ พร้อมปุ่มรับทราบ",
      "8AM Proactive Report: รัน detectAnomalies อัตโนมัติ บันทึก DB และแทรก anomaly section ในรายงานเช้า",
      "Chat Memory Hook: Chann จำ context จากรายงานและ anomaly ในอดีต ตอบได้แม่นยำขึ้น",
      "เพิ่ม endpoint: POST /api/chann/draft-daily-sales, GET/POST /api/chann/anomalies, POST /api/chann/anomalies/:id/acknowledge, POST /api/chann/anomalies/detect, GET/POST/DELETE /api/chann/memories, POST /api/chann/memories/backfill",
      "ตาราง DB ใหม่: chann_memories (vector 1536 dim + HNSW), chann_anomalies",
    ],
  },
  {
    version: "2.4.3",
    date: "2026-04-05",
    label: "feature",
    changes: [
      "เพิ่ม 'viewer' role — user ที่ใช้ร่วมกัน bk1040 / bk1040",
      "Viewer เข้าได้เฉพาะ: Sales Report (Dashboard, Daily, Weekly, Reports, Manual) และ Handbook",
      "Navigation, dropdown, profile menu — ซ่อนเมนูที่ไม่ได้รับอนุญาตทั้งหมด",
      "Auto-redirect ไป /sales เมื่อ viewer พยายามเข้า route ที่ไม่อนุญาต",
      "Chann AI Chat ซ่อนสำหรับ viewer",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-04-02",
    label: "improvement",
    changes: [
      "LINE Report: อัพเดท format ใหม่ — header 💎, Daily/MTD section, Restaurant (Dine In/Take Away + TC), DELIVERY, OSAT/Survey/Void/AddCheese/V-meal/UpSize, COL/Hour/OT/TCMH/SOS, WASTE, Roster (ถัดไป +1 วัน)",
      "Roster date ในรายงาน LINE ใช้วันถัดจากวันที่รายงาน (เพื่อแสดงตารางงานของวันพรุ่งนี้)",
      "Robin/GoKOO แสดงใน DELIVERY เฉพาะเมื่อมียอดขาย (> 0)",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-04-02",
    label: "bugfix",
    changes: [
      "แก้ไข Delivery Daily ในตาราง Settings — คำนวณจากผลรวม Grab + LINE MAN + Shopee + BK App + Robin + GoKOO อัตโนมัติ",
      "Fallback: ถ้าไม่มีข้อมูล channel ใดเลย ระบบจะอ่านค่า salesDelivery เดิมแทน",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-04-02",
    label: "feature",
    changes: [
      "Chann AI: เพิ่ม 7 tools ใหม่ — readStaffChat, getWeeklySalesReport, sendStaffChatMessage, createAnnouncement, deleteAnnouncement, approveSwapRequest, rejectSwapRequest",
      "Chann AI: Manager สามารถให้ Chann ส่งข้อความใน Staff Chat กลุ่มได้โดยตรง (real-time via Socket.IO)",
      "Chann AI: สร้าง/ลบประกาศ และอนุมัติ/ปฏิเสธคำขอสลับกะผ่าน Chann ได้เลย",
      "LINE Report: อัพเดท format ใหม่ตรงตาม template — วันที่, Net Sales, MTD, TC/TA, ช่องทาง Delivery (พร้อม Robin/GoKOO), SOS, Waste, Work Hour, OSAT, Roster",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-04-02",
    label: "bugfix",
    changes: [
      "แก้ไข Excel Import (GSI Sales Management Sheet) — ระบบค้นหาชีทที่ใช่อัตโนมัติ (ชื่อ 'sales management' หรือ score COL_MAP สูงสุด)",
      "รองรับ header 2 แถว ใน GSI sheet — ผสานค่าจาก header แถวบน+ล่างก่อน map คอลัมน์",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-04-02",
    label: "bugfix",
    changes: [
      "แก้ไข Excel Import Grand Diamond — สูตรคำนวณ TC/TA ใน import flow ใช้ค่าที่ถูกต้อง",
      "Labor Settings: ค่า default โหลดจาก DB อัตโนมัติเมื่อเปิดหน้า Settings",
    ],
  },
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
