import { BookOpen, LogIn, CalendarDays, Users, LayoutDashboard, ClipboardList, BarChart2, CalendarRange, Database, ArrowLeftRight, MessageSquare, Bot, Settings, History, ChevronDown, ShieldCheck, Star, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { APP_VERSION } from "@shared/version";

const STAFF_BADGE = <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 text-xs">พนักงาน</Badge>;
const MANAGER_BADGE = <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 text-xs">ผู้จัดการ</Badge>;
const ADMIN_BADGE = <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950 text-xs">Admin</Badge>;

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n}</span>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
      <span className="font-semibold">หมายเหตุ: </span>{children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badges }: { icon: React.ElementType; title: string; badges?: React.ReactNode[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="p-1.5 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="font-semibold text-base">{title}</span>
      {badges && <div className="flex gap-1.5">{badges}</div>}
    </div>
  );
}

function VersionBadge({ version }: { version: string }) {
  return (
    <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
      v{version}
    </Badge>
  );
}

const changelog = [
  {
    version: "1.8.2",
    date: "26 กุมภาพันธ์ 2569",
    label: "feature",
    changes: [
      "เพิ่ม Survey Count ในรายงาน LINE Daily Report ต่อจากบรรทัด OSAT",
    ],
  },
  {
    version: "1.8.1",
    date: "26 กุมภาพันธ์ 2569",
    label: "bugfix",
    changes: [
      "แก้ไข Waste double-counting — settings-page save รีเซ็ต wasteMealDaily เป็น 0 ถูกต้อง",
      "แก้ไข OData endpoint ใช้ field ชื่อผิด (targetAmount → targetSales, wasteAmount → wasteRawDaily) ทำให้ค่าออกมา 0",
      "แก้ไข code-proposals API ใช้ verifyAdminAccess ที่ไม่ได้นิยาม → เปลี่ยนเป็น verifyDevAccess",
      "แก้ไข Chann tool dispatch null safety สำหรับ user.role",
      "ลบไฟล์ stub ที่ไม่ได้ใช้งาน ทำให้ TypeScript 0 errors",
    ],
  },
  {
    version: "1.8.0",
    date: "25 กุมภาพันธ์ 2569",
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
    date: "26 กุมภาพันธ์ 2569",
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
    date: "25 กุมภาพันธ์ 2569",
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
    date: "25 กุมภาพันธ์ 2569",
    label: "feature",
    changes: [
      "Chann AI: Full Agent Access — role-based write permissions",
      "tools ใหม่: createUser, updateUserProfile, resetUserPassword, addBorrowTransaction, executeSqlQuery",
      "Chann สามารถรัน SQL query โดยตรงได้ (Admin เท่านั้น)",
    ],
  },
  {
    version: "1.6.0",
    date: "21 กุมภาพันธ์ 2569",
    label: "feature",
    changes: [
      "Chann AI: เพิ่ม write tools สำหรับ Admin",
      "Sales Settings: เพิ่ม 5 คอลัมน์ (LY Sales, Forecast, LY TC, Target TC, Target TA) + 10 คอลัมน์คำนวณอัตโนมัติ",
      "LINE OA integration: ส่งรายงาน Daily Report ข้อความ emoji ไป LINE",
      "Export Excel button พร้อม auto filename",
      "Audit logging สำหรับ write operations ทุกอัน",
    ],
  },
  {
    version: "1.5.0",
    date: "16 มกราคม 2569",
    label: "feature",
    changes: [
      "ระบบสมัครสมาชิกใหม่: ผู้ใช้กำหนด Username เองได้",
      "เพิ่มช่อง Email, เบอร์โทร, ยืนยันรหัสผ่านในฟอร์มสมัคร",
      "Validation Username (ตัวอักษร/ตัวเลข/_ เท่านั้น)",
      "ตรวจสอบ Username ซ้ำอัตโนมัติ",
    ],
  },
  {
    version: "1.4.0",
    date: "16 มกราคม 2569",
    label: "feature",
    changes: [
      "ระบบ Reset Password ผ่าน OTP ทาง Email",
      "ใช้ Resend Email API สำหรับส่ง OTP",
      "OTP หมดอายุใน 10 นาที",
    ],
  },
  {
    version: "1.3.0",
    date: "16 มกราคม 2569",
    label: "feature",
    changes: [
      "ระบบ Staff Chat แบบ Real-time ด้วย Socket.IO",
      "Floating Chat Widget (ล่างขวา) เข้าถึงได้จากทุกหน้า",
      "Group chat และ Private chat (1-on-1)",
      "แสดงสถานะ Online/Offline ของผู้ใช้",
    ],
  },
  {
    version: "1.2.0",
    date: "ธันวาคม 2568",
    label: "feature",
    changes: [
      "ระบบยืม-คืนวัตถุดิบระหว่างสาขา (Borrow Tracker)",
      "Dashboard ภาพรวม Borrow, ประวัติ Transaction, จัดการสาขา/รายการสินค้า",
      "Import สาขาและรายการสินค้าจาก Excel/CSV",
    ],
  },
  {
    version: "1.1.0",
    date: "พฤศจิกายน 2568",
    label: "feature",
    changes: [
      "ระบบรายงานยอดขายประจำวัน (Daily Sales Report)",
      "คำนวณ Labor Cost, COL%, TCMH อัตโนมัติ",
      "ระบบติดตาม Waste (Raw + Meal)",
      "OSAT และ Survey Count tracking",
      "Chann AI Assistant (ผู้ช่วย AI ของร้าน)",
    ],
  },
  {
    version: "1.0.0",
    date: "ตุลาคม 2568",
    label: "release",
    changes: [
      "Launch ระบบจัดการตารางงาน (Roster & Shift Booking)",
      "สมัครสมาชิก, เข้าสู่ระบบ, สิทธิ์ Staff/Manager",
      "จองกะงาน 4 ประเภท: Open, Lunch, Dinner, Late",
      "ผู้จัดการ: ดูตาราง Roster ทีมทั้งหมด, Import ตาราง",
      "รองรับ 2 ภาษา (ไทย/อังกฤษ)",
    ],
  },
];

const labelColor: Record<string, string> = {
  feature: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  bugfix:  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  release: "bg-primary/10 text-primary",
};
const labelText: Record<string, string> = {
  feature: "ฟีเจอร์ใหม่",
  bugfix:  "แก้ไข Bug",
  release: "เปิดตัว",
};

export default function HandbookPage() {
  const { user } = useAuth();
  const isManagerLike = user?.role === "manager" || user?.role === "admin" || user?.role === "area";

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl pb-24">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">คู่มือการใช้งานระบบ</h1>
            <p className="text-sm text-muted-foreground">Burger King Grand Diamond — ฉบับล่าสุด v{APP_VERSION}</p>
          </div>
        </div>
        {isManagerLike && (
          <Link href="/manager-manual">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:opacity-90 transition-opacity" data-testid="link-manager-manual">
              <BookMarked className="w-4 h-4" />
              คู่มือผู้จัดการ
            </button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {STAFF_BADGE} <span className="text-muted-foreground self-center">= ทุกคนใช้ได้</span>
        {MANAGER_BADGE} <span className="text-muted-foreground self-center">= ผู้จัดการขึ้นไป</span>
        {ADMIN_BADGE} <span className="text-muted-foreground self-center">= Admin เท่านั้น</span>
      </div>

      <Accordion type="multiple" className="space-y-2">

        {/* ===== 1. ภาพรวม ===== */}
        <AccordionItem value="overview" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={Star} title="1. ภาพรวมระบบและสิทธิ์การใช้งาน" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">ระบบนี้ใช้สำหรับจัดการงานภายในสาขา Grand Diamond ครอบคลุม 5 โมดูลหลัก:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 pl-4 list-disc">
              <li><strong>ตารางงาน</strong> — จองกะ ดูตาราง สลับกะ</li>
              <li><strong>ยอดขาย</strong> — บันทึกรายงานประจำวัน ดู Dashboard และ Report</li>
              <li><strong>ยืม-คืน</strong> — ติดตามการยืมวัตถุดิบระหว่างสาขา</li>
              <li><strong>แชท</strong> — สื่อสารระหว่างพนักงาน + ถาม Chann AI</li>
              <li><strong>LINE OA</strong> — ส่งรายงานยอดขายประจำวันไปยัง LINE กลุ่ม</li>
            </ul>
            <Separator />
            <p className="text-sm font-medium">บทบาทในระบบ</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950">
                <p className="font-semibold text-blue-700 dark:text-blue-300">Staff (พนักงาน)</p>
                <p className="text-muted-foreground text-xs mt-1">จองกะ, ดูตาราง, แชท, ดูรายงาน (read-only)</p>
              </div>
              <div className="p-3 rounded-lg border bg-orange-50 dark:bg-orange-950">
                <p className="font-semibold text-orange-700 dark:text-orange-300">Manager (ผู้จัดการ)</p>
                <p className="text-muted-foreground text-xs mt-1">ทุกอย่างของ Staff + บันทึกยอดขาย, จัดการตาราง, ส่ง LINE</p>
              </div>
              <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950">
                <p className="font-semibold text-red-700 dark:text-red-300">Admin</p>
                <p className="text-muted-foreground text-xs mt-1">ทุกอย่างของ Manager + ตั้งค่าระบบ, จัดการผู้ใช้, Dev Toolbox</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 2. เข้าสู่ระบบ ===== */}
        <AccordionItem value="login" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={LogIn} title="2. การเข้าสู่ระบบ" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm font-medium">เข้าสู่ระบบ</p>
            <div className="space-y-2">
              <Step n={1}>เปิดแอป → หน้าแรกจะแสดงฟอร์ม Login</Step>
              <Step n={2}>กรอก <strong>Username</strong> และ <strong>Password</strong> ที่ได้รับจากผู้จัดการ</Step>
              <Step n={3}>กด <strong>"เข้าสู่ระบบ"</strong> — ระบบจะพาไปหน้าตารางงานอัตโนมัติ</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">ลืมรหัสผ่าน (OTP ทาง Email)</p>
            <div className="space-y-2">
              <Step n={1}>กด <strong>"ลืมรหัสผ่าน?"</strong> ใต้ฟอร์ม Login</Step>
              <Step n={2}>กรอก Username → กด "ส่ง OTP" — ระบบส่งรหัส 6 หลักไปยัง Email ที่ลงทะเบียน</Step>
              <Step n={3}>กรอก OTP (หมดอายุใน 10 นาที) + รหัสผ่านใหม่ → กด "ยืนยัน"</Step>
            </div>
            <Note>ถ้าไม่ได้รับ Email กรุณาตรวจสอบโฟลเดอร์ Spam หรือติดต่อผู้จัดการเพื่อ reset รหัสผ่านให้</Note>
            <Separator />
            <p className="text-sm font-medium">สมัครบัญชีใหม่</p>
            <div className="space-y-2">
              <Step n={1}>กด <strong>"สมัครสมาชิก"</strong> ในหน้า Login</Step>
              <Step n={2}>กรอก Username (ตัวอักษร/ตัวเลข/_ เท่านั้น), ชื่อ, Email, เบอร์โทร, รหัสผ่าน</Step>
              <Step n={3}>หากสมัครเป็น Manager ต้องกรอก <strong>รหัสยืนยัน Manager</strong> ด้วย</Step>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 3. Work Page ===== */}
        <AccordionItem value="work" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={CalendarDays} title="3. ตารางงานของฉัน (Work)" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm font-medium">การดูตารางงาน</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่เมนู <strong>ตารางงาน</strong> (Work) — ระบบแสดง "Mobile Pair View" แบ่งสัปดาห์ออกเป็น 3 คู่: อ-พ / พฤ-ศ / ส-อา-จ</Step>
              <Step n={2}>ดูกะที่ถูกจองไว้ (แสดงชื่อกะ + เวลา) และวันที่ว่างงาน</Step>
              <Step n={3}>กดลูกศร ← → เพื่อเลื่อนดูสัปดาห์ก่อน/หน้า</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">การจองกะ</p>
            <div className="space-y-2">
              <Step n={1}>กดที่ช่องวันที่ต้องการ → เลือกกะที่ต้องการจาก 4 ประเภท: <strong>Open / Lunch / Dinner / Late</strong></Step>
              <Step n={2}>กด "จอง" — ระบบตรวจสอบ capacity ของกะนั้น</Step>
              <Step n={3}>หาก capacity เต็ม จะแสดงข้อความแจ้งเตือน ไม่สามารถจองได้</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">การยกเลิกกะ</p>
            <div className="space-y-2">
              <Step n={1}>กดที่กะที่จองไว้ → กด "ยกเลิก"</Step>
            </div>
            <Note>ระบบปิดรับการจอง/ยกเลิกทุกวัน<strong>อังคารเวลา 12:00 น.</strong> และเปิดใหม่วันพุธ สำหรับสัปดาห์ถัดไป (อ-จ)</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 4. Roster ===== */}
        <AccordionItem value="roster" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={Users} title="4. จัดการตาราง Roster" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm font-medium">ดูตาราง Roster ทั้งทีม</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่เมนู <strong>Roster</strong> — เห็นตารางงานของพนักงานทุกคนในสัปดาห์ปัจจุบัน</Step>
              <Step n={2}>แต่ละแถว = พนักงาน 1 คน แต่ละคอลัมน์ = วัน กะแสดงสีตามประเภท</Step>
              <Step n={3}>กดลูกศรเพื่อเปลี่ยนสัปดาห์</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">Import ตาราง Excel</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Roster → Import</strong></Step>
              <Step n={2}>เลือกไฟล์ Excel (.xlsx) ที่มีข้อมูลกะ</Step>
              <Step n={3}>ตรวจสอบ Preview ก่อน → กด "Import"</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">อนุมัติคำขอแลกกะ</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่เมนู <strong>คำขอ (Requests)</strong></Step>
              <Step n={2}>ดูรายการคำขอ พร้อมชื่อพนักงาน วันที่ กะที่ขอแลก</Step>
              <Step n={3}>กด <strong>"อนุมัติ"</strong> หรือ <strong>"ปฏิเสธ"</strong></Step>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 5. Dashboard ===== */}
        <AccordionItem value="dashboard" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={LayoutDashboard} title="5. Dashboard ภาพรวม" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">Dashboard รวมข้อมูลสำคัญของวันนี้ไว้ในที่เดียว ไปที่เมนู <strong>Dashboard</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">ยอดขายวันนี้</p>
                <p className="text-muted-foreground text-xs">Actual vs Target พร้อม % ที่ทำได้</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">MTD (Month-to-Date)</p>
                <p className="text-muted-foreground text-xs">ยอดสะสมตั้งแต่ต้นเดือน vs เป้าหมาย</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">พนักงานวันนี้</p>
                <p className="text-muted-foreground text-xs">รายชื่อพนักงานที่ทำงานแต่ละกะ</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">แจ้งเตือน Borrow</p>
                <p className="text-muted-foreground text-xs">รายการที่ยังไม่คืน / เกินกำหนด</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 6. Daily Sales ===== */}
        <AccordionItem value="daily-sales" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={ClipboardList} title="6. รายงานยอดขายประจำวัน (Daily Sales)" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">หน้านี้ใช้บันทึกข้อมูลยอดขายรายวัน โดย Autosave อัตโนมัติทุกครั้งที่แก้ไข</p>
            <p className="text-sm font-medium">ขั้นตอนการกรอกรายงาน</p>
            <div className="space-y-2">
              <Step n={1}><strong>เลือกวันที่</strong> ที่มุมบนซ้าย (ค่าเริ่มต้น = วันนี้)</Step>
              <Step n={2}><strong>ยอดขาย & TC</strong>: กรอก Net Sales (บาท) และ Transaction Count รวมถึง Delivery แยกตามช่องทาง (Grab, LineMan, Shopee, BK App)</Step>
              <Step n={3}><strong>Waste</strong>: กรอก Waste Raw (บาท) และ Waste Meal (บาท) — ระบบรวมให้เป็น Total Waste และคำนวณ % จาก Sales อัตโนมัติ</Step>
              <Step n={4}><strong>OSAT & Survey Count</strong>: กรอกคะแนน OSAT และจำนวน Survey ที่ได้รับ</Step>
              <Step n={5}><strong>Work Hours</strong>: กรอก Actual Hours (ชั่วโมงจริง) และ OT Hours — ระบบคำนวณ COL%, TCMH, Labor Cost ให้อัตโนมัติ</Step>
              <Step n={6}><strong>Roster</strong>: กรอกชื่อ Manager และพนักงานที่ทำงานวันนั้น (แต่ละแถว = 1 คน ในรูปแบบ กะ | ชื่อ)</Step>
              <Step n={7}>ระบบ <strong>Autosave</strong> — ไม่ต้องกดบันทึก แต่สามารถกด Save ที่มุมล่างเพื่อยืนยันได้</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">ส่งรายงานไป LINE OA</p>
            <div className="space-y-2">
              <Step n={1}>กรอกข้อมูลครบแล้ว กด <strong>"ส่ง Daily Report ไป LINE"</strong> (ปุ่มสีเขียว)</Step>
              <Step n={2}>ระบบส่งรายงาน emoji text format ไปยัง LINE group ที่ตั้งค่าไว้</Step>
              <Step n={3}>รายงานประกอบด้วย: ยอดขาย, TC, TA, Delivery, Waste, Work Hour, OSAT, Survey Count, Roster</Step>
            </div>
            <Note>การเปลี่ยนวันที่จะโหลดข้อมูลของวันนั้นขึ้นมา ข้อมูลเก่าจะไม่หาย</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 7. Sales Dashboard ===== */}
        <AccordionItem value="sales-dashboard" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={BarChart2} title="7. แดชบอร์ดยอดขาย (Sales Dashboard)" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">ไปที่เมนู <strong>Sales</strong> เพื่อดูภาพรวมยอดขาย</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border">
                <p className="font-semibold">Today's Sales</p>
                <p className="text-muted-foreground text-xs">ยอดขายวันนี้ vs Target พร้อม % Achievement</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-semibold">MTD Sales</p>
                <p className="text-muted-foreground text-xs">ยอดสะสมเดือนนี้ vs เป้าหมาย MTD</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-semibold">TC & TA</p>
                <p className="text-muted-foreground text-xs">Transaction Count และ Average Ticket Size</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-semibold">Delivery Breakdown</p>
                <p className="text-muted-foreground text-xs">ยอดขาย Grab / LineMan / Shopee / BK App แยกช่องทาง</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 8. Weekly Sales ===== */}
        <AccordionItem value="weekly-sales" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={CalendarRange} title="8. รายงานรายสัปดาห์ (Weekly Sales)" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Sales → Weekly</strong></Step>
              <Step n={2}>ระบบแสดงตารางยอดขายรายวันประจำสัปดาห์ พร้อมยอดรวม</Step>
              <Step n={3}>กด <strong>"Export Excel"</strong> เพื่อดาวน์โหลดรายงานเป็นไฟล์ .xlsx ชื่อไฟล์สร้างอัตโนมัติตามสัปดาห์</Step>
              <Step n={4}>กดลูกศร ← → เพื่อดูสัปดาห์อื่น</Step>
            </div>
            <Note>ข้อมูลใน Weekly Sales มาจากรายงานที่บันทึกใน Daily Sales หากวันไหนยังไม่บันทึก ยอดจะแสดงเป็น 0</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 9. Import DBF ===== */}
        <AccordionItem value="import-dbf" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={Database} title="9. นำเข้าข้อมูล DBF (Import จาก Aloha POS)" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">ระบบรองรับการ Import ไฟล์ .DBF จาก Aloha POS เพื่อดึงยอดขายอัตโนมัติ ไม่ต้องกรอกมือ</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Sales → Import DBF</strong></Step>
              <Step n={2}>กด <strong>"เลือกไฟล์"</strong> และเลือกไฟล์ .DBF จาก Aloha</Step>
              <Step n={3}>ระบบแสดง Preview ข้อมูลที่อ่านได้ (ยอดขาย, TC, Delivery)</Step>
              <Step n={4}>กด <strong>"Import"</strong> เพื่อบันทึกข้อมูลลงใน Daily Sales ของวันนั้น</Step>
            </div>
            <Note>ระบบจะ overwrite ข้อมูลที่มีอยู่ในวันนั้น ตรวจสอบวันที่ให้ถูกต้องก่อน Import</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 10. Borrow Tracker ===== */}
        <AccordionItem value="borrow" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={ArrowLeftRight} title="10. ระบบยืม-คืนวัตถุดิบ (Borrow Tracker)" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm font-medium">สร้าง Transaction ยืม/คืน</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Borrow → Transactions</strong> → กด "เพิ่มรายการ"</Step>
              <Step n={2}>เลือก <strong>ประเภท</strong>: Borrow Out (เราให้ยืม) หรือ Borrow In (เรายืมจากสาขาอื่น)</Step>
              <Step n={3}>เลือก <strong>สาขา</strong>, <strong>รายการสินค้า</strong>, <strong>จำนวน</strong> และ <strong>หน่วย</strong></Step>
              <Step n={4}>กด <strong>"บันทึก"</strong></Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">ดูประวัติ</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Borrow → History</strong> เพื่อดู Transaction ทั้งหมด</Step>
              <Step n={2}>กรองด้วยสาขา, รายการสินค้า, หรือช่วงวันที่</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">จัดการสาขา/รายการสินค้า {MANAGER_BADGE}</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Borrow → Branches</strong> หรือ <strong>Items</strong> เพื่อเพิ่ม/ลบ สาขา หรือรายการสินค้า</Step>
              <Step n={2}>รองรับ Import จาก Excel/CSV</Step>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 11. Chat & Chann ===== */}
        <AccordionItem value="chat" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={Bot} title="11. แชทพนักงาน & Chann AI" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm font-medium">Staff Chat (แชทกลุ่ม + ส่วนตัว)</p>
            <div className="space-y-2">
              <Step n={1}>กดไอคอนแชท <strong>(ล่างขวาของหน้าจอ)</strong> ทุกหน้าสามารถเปิดได้เลย หรือไปที่เมนู Chat</Step>
              <Step n={2}>แท็บ <strong>"กลุ่ม"</strong>: ทุกคนในระบบเห็นข้อความ</Step>
              <Step n={3}>แท็บ <strong>"ส่วนตัว"</strong>: เลือกชื่อพนักงาน Online แล้วส่งข้อความ 1-on-1</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">Chann AI Assistant</p>
            <div className="space-y-2">
              <Step n={1}>กดปุ่ม <strong>Chann</strong> (ไอคอน AI ล่างขวา) เพื่อเปิด chat กับ AI</Step>
              <Step n={2}>ถามเกี่ยวกับ: ยอดขาย, ตารางงาน, คู่มือ, คำแนะนำต่างๆ</Step>
              <Step n={3}>Chann สามารถ <strong>ดึงข้อมูลจากระบบให้ได้จริง</strong> เช่น "ยอดขายวันนี้เท่าไหร่?", "ใครทำงานพรุ่งนี้?"</Step>
            </div>
            <div className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-950 text-sm">
              <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">ตัวอย่างคำถามที่ถาม Chann ได้</p>
              <ul className="text-muted-foreground text-xs space-y-1 list-disc pl-4">
                <li>"ยอดขาย MTD เดือนนี้เท่าไหร่?"</li>
                <li>"ใครอยู่กะดึกพรุ่งนี้?"</li>
                <li>"Waste สัปดาห์นี้สูงแค่ไหน?"</li>
                <li>"ช่วยสรุปรายงานยอดขายสัปดาห์นี้"</li>
              </ul>
            </div>
            <Note>Manager ขึ้นไปสามารถให้ Chann <strong>บันทึกข้อมูล</strong> ในระบบได้ด้วย เช่น "บันทึกยอดขายวันนี้ 50,000 บาท"</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 12. LINE OA ===== */}
        <AccordionItem value="line" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={MessageSquare} title="12. LINE OA Integration" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">ระบบสามารถส่งรายงานประจำวันไปยัง LINE กลุ่มของสาขาได้อัตโนมัติ</p>
            <p className="text-sm font-medium">ตั้งค่า LINE OA Token</p>
            <div className="space-y-2">
              <Step n={1}>ไปที่ <strong>Sales → Settings</strong></Step>
              <Step n={2}>หา Card <strong>"LINE OA"</strong> → กรอก Channel Access Token ที่ได้จาก LINE Developers Console</Step>
              <Step n={3}>กรอก User ID หรือ Group ID ของ LINE กลุ่มที่ต้องการส่ง</Step>
              <Step n={4}>กด "บันทึก"</Step>
            </div>
            <Separator />
            <p className="text-sm font-medium">ส่งรายงานประจำวัน</p>
            <div className="space-y-2">
              <Step n={1}>กรอกข้อมูลใน Daily Sales ให้ครบ</Step>
              <Step n={2}>กด <strong>"ส่ง Daily Report ไป LINE"</strong> (ปุ่มสีเขียวบนหน้า Daily Sales)</Step>
              <Step n={3}>รายงานที่ส่งประกอบด้วย: Date, Net Sales, TC, TA, Delivery แต่ละช่องทาง, Waste, Work Hour, OSAT, Survey Count, Roster Manager/Staff</Step>
            </div>
            <Note>หากปุ่มไม่ปรากฏ ตรวจสอบว่าได้ตั้งค่า LINE Token แล้วหรือยัง</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 13. Settings ===== */}
        <AccordionItem value="settings" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={Settings} title="13. การตั้งค่า (Settings)" badges={[MANAGER_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">ตั้งค่าทั่วไป (/settings)</p>
                <p className="text-muted-foreground text-xs">ชื่อสาขา, กลุ่มกะ, จำนวน Capacity ต่อกะ</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">Sales Settings (/sales/settings)</p>
                <p className="text-muted-foreground text-xs">Target ยอดขายรายวัน, LY Sales, Forecast, Target TC/TA, LINE OA Token</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">Labor Settings</p>
                <p className="text-muted-foreground text-xs">Roster Hours, Duty Hours, PT Rate (บาท/ชม.), Fixed Cost, Close Shift Cost</p>
              </div>
              <div className="p-3 rounded-lg border space-y-1">
                <p className="font-semibold">Borrow Settings (/borrow/settings)</p>
                <p className="text-muted-foreground text-xs">ตั้งค่าระบบยืม-คืน (Manager)</p>
              </div>
            </div>
            <Note>การเปลี่ยน Labor Settings จะมีผลกับการคำนวณ COL%, TCMH และ Labor Cost ทันทีในหน้า Daily Sales</Note>
          </AccordionContent>
        </AccordionItem>

        {/* ===== 14. Version History ===== */}
        <AccordionItem value="changelog" className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <SectionHeader icon={History} title="14. ประวัติการอัพเดทเวอร์ชัน" badges={[STAFF_BADGE]} />
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            {changelog.map((entry) => (
              <div key={entry.version} className="flex gap-3">
                <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                  <VersionBadge version={entry.version} />
                  <div className="w-px flex-1 bg-border min-h-[20px]" />
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${labelColor[entry.label]}`}>
                      {labelText[entry.label]}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <div className="text-center text-xs text-muted-foreground pt-4 pb-2">
        <p className="font-semibold">Burger King Grand Diamond Branch</p>
        <p>เอกสารภายใน — อัพเดทล่าสุด กุมภาพันธ์ 2569 · v1.8.2</p>
      </div>
    </div>
  );
}
