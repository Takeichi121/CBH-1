import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  ChevronLeft, Users, BarChart3, ClipboardList, Settings, Package,
  Lock, Unlock, Calendar, LayoutDashboard, ArrowRight, CheckCircle,
  XCircle, AlertTriangle, Lightbulb, Send, Upload, Shield, BookOpen,
  UserCheck, Clock, TrendingUp, FileSpreadsheet, MessageSquare, Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@shared/version";

// ──────────────────────────────────────────────
// Base Components
// ──────────────────────────────────────────────

function MockScreen({ title, children, accent = "gray" }: {
  title: string;
  children: React.ReactNode;
  accent?: "gray" | "red" | "blue" | "green" | "amber";
}) {
  const accentMap: Record<string, string> = {
    gray:  "bg-gray-200 dark:bg-gray-700",
    red:   "bg-red-500",
    blue:  "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="rounded-xl border border-border shadow-md overflow-hidden my-3">
      <div className={`flex items-center gap-2 px-3 py-2 ${accentMap[accent]} bg-opacity-90`}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white/40" />
          <span className="w-3 h-3 rounded-full bg-white/40" />
          <span className="w-3 h-3 rounded-full bg-white/40" />
        </div>
        <span className="text-xs font-medium text-white ml-1 truncate">{title}</span>
      </div>
      <div className="bg-muted/30 dark:bg-muted/10 p-3 text-sm">
        {children}
      </div>
    </div>
  );
}

function StepFlow({ steps, vertical = false }: {
  steps: { icon?: React.ElementType; label: string; sub?: string }[];
  vertical?: boolean;
}) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-0 my-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center flex-shrink-0">
                  {Icon ? <Icon className="w-4 h-4 text-primary" /> : <span className="text-xs font-bold text-primary">{i + 1}</span>}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 h-6 bg-primary/20 my-0.5" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium leading-tight mt-1">{step.label}</p>
                {step.sub && <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 my-3">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className="flex flex-col items-center bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 min-w-[80px] text-center">
              {Icon && <Icon className="w-4 h-4 text-primary mx-auto mb-0.5" />}
              <span className="text-xs font-semibold text-foreground leading-tight">{step.label}</span>
              {step.sub && <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{step.sub}</span>}
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 my-2">
      <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 my-2">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{children}</p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, color = "primary", children }: {
  icon: React.ElementType;
  title: string;
  color?: "primary" | "blue" | "green" | "amber" | "purple" | "red";
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue:    "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    green:   "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    amber:   "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
    purple:  "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    red:     "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="font-bold text-lg leading-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MockRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center px-2 py-1 rounded text-xs ${highlight ? "bg-primary/10 font-semibold" : "odd:bg-muted/40"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MockCard({ label, value, sub, color = "blue" }: { label: string; value: string; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue:   "border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800",
    green:  "border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800",
    amber:  "border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800",
    red:    "border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PermTable() {
  const rows = [
    { feat: "ดูตารางงานตัวเอง",    staff: true,  mgr: true,  admin: true  },
    { feat: "จองกะงาน",             staff: true,  mgr: true,  admin: true  },
    { feat: "จัดการ Roster ทีม",    staff: false, mgr: true,  admin: true  },
    { feat: "ดู Daily Sales",       staff: false, mgr: true,  admin: true  },
    { feat: "บันทึก Daily Sales",   staff: false, mgr: true,  admin: true  },
    { feat: "Sales Settings",       staff: false, mgr: true,  admin: true  },
    { feat: "Borrow Tracker",       staff: false, mgr: true,  admin: true  },
    { feat: "จัดการพนักงาน",        staff: false, mgr: false, admin: true  },
    { feat: "ตั้งค่าระบบ Admin",    staff: false, mgr: false, admin: true  },
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-border my-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-semibold">ฟีเจอร์</th>
            <th className="text-center px-3 py-2 font-semibold text-blue-600">Staff</th>
            <th className="text-center px-3 py-2 font-semibold text-orange-600">Manager</th>
            <th className="text-center px-3 py-2 font-semibold text-red-600">Admin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/50">
              <td className="px-3 py-1.5 text-muted-foreground">{r.feat}</td>
              <td className="text-center px-3 py-1.5">{r.staff ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />}</td>
              <td className="text-center px-3 py-1.5">{r.mgr   ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />}</td>
              <td className="text-center px-3 py-1.5">{r.admin ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function ManagerManualPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user && user.role === "staff") {
      setLocation("/handbook");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;

  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="container mx-auto p-4 max-w-3xl pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/handbook">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> กลับ
          </button>
        </Link>
        <Badge variant="outline" className="font-mono text-xs">v{APP_VERSION}</Badge>
      </div>

      {/* Title Card */}
      <div className="rounded-2xl bg-gradient-to-br from-red-600 to-red-800 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">คู่มือผู้จัดการ</h1>
            <p className="text-red-200 text-sm">Grand Diamond</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-red-200">
          <span>📅 {today}</span>
          <span>•</span>
          <span>🔖 v{APP_VERSION}</span>
          <span>•</span>
          <span>สำหรับ Manager / Area Manager</span>
        </div>
      </div>

      {/* ===== 1. สิทธิ์การใช้งาน ===== */}
      <SectionCard icon={Shield} title="1. สิทธิ์การใช้งาน" color="red">
        <p className="text-sm text-muted-foreground">ระบบแบ่งสิทธิ์ผู้ใช้เป็น 3 ระดับ ผู้จัดการสามารถเข้าถึงทุกโมดูลยกเว้นส่วน Admin</p>
        <PermTable />
        <TipBox>Area Manager มีสิทธิ์เท่ากับ Manager แต่ต้องปลดล็อกก่อนแก้ไขข้อมูล — ดูหัวข้อ 8</TipBox>
      </SectionCard>

      {/* ===== 2. Roster ===== */}
      <SectionCard icon={Calendar} title="2. จัดการตาราง Roster" color="blue">
        <p className="text-sm text-muted-foreground">จัดตารางงานของทีม กำหนดกะเช้า/เย็น/ดึก และ Publish ให้พนักงานเห็น</p>

        <StepFlow steps={[
          { icon: Calendar, label: "เปิด Roster", sub: "เมนู Roster" },
          { icon: Users, label: "เลือกพนักงาน", sub: "คลิกชื่อ" },
          { icon: Clock, label: "กำหนดกะ", sub: "Open/Lunch/Dinner/Late" },
          { icon: CheckCircle, label: "Publish", sub: "ยืนยันตาราง" },
        ]} />

        <MockScreen title="Roster — ตารางทีม" accent="blue">
          <div className="space-y-1">
            <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold text-muted-foreground mb-1">
              <span>พนักงาน</span>
              <span className="text-center">จ</span>
              <span className="text-center">อ</span>
              <span className="text-center">พ</span>
              <span className="text-center">พฤ</span>
              <span className="text-center">ศ</span>
            </div>
            {[
              { name: "สมชาย", shifts: ["M","M","—","E","M"] },
              { name: "สมหญิง", shifts: ["E","—","M","M","E"] },
              { name: "ประสาน", shifts: ["—","E","E","—","M"] },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-6 gap-1 items-center">
                <span className="text-[10px] font-medium truncate">{row.name}</span>
                {row.shifts.map((s, j) => (
                  <span key={j} className={`text-center text-[10px] rounded px-0.5 py-0.5 font-bold ${s === "M" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : s === "E" ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300" : "text-muted-foreground"}`}>{s}</span>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[10px]">
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 rounded font-bold">M</span><span className="text-muted-foreground">Morning</span>
            <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-1.5 rounded font-bold ml-2">E</span><span className="text-muted-foreground">Evening</span>
          </div>
        </MockScreen>

        <TipBox>Import ตาราง Roster จาก Excel ได้ที่เมนู Roster → Import — ประหยัดเวลาเมื่อมีพนักงานหลายคน</TipBox>
      </SectionCard>

      {/* ===== 3. Dashboard ===== */}
      <SectionCard icon={LayoutDashboard} title="3. Dashboard ภาพรวม" color="purple">
        <p className="text-sm text-muted-foreground">แสดงสถิติยอดขายวันนี้ พนักงานที่กำลังทำงาน และตัวชี้วัดสำคัญแบบ Real-time</p>

        <MockScreen title="Dashboard — ภาพรวมวันนี้" accent="gray">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <MockCard label="ยอดขายวันนี้" value="฿ 48,250" sub="เป้า ฿ 52,000" color="blue" />
            <MockCard label="TC (จำนวนลูกค้า)" value="312" sub="เป้า 340 คน" color="green" />
            <MockCard label="COL%" value="24.5%" sub="เป้า < 28%" color="amber" />
            <MockCard label="OSAT" value="85%" sub="คะแนนความพึงพอใจ" color="blue" />
          </div>
          <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-1">
            <span className="font-semibold">Staff on duty:</span> สมชาย, สมหญิง, ประสาน (+2 คน)
          </div>
        </MockScreen>

        <WarnBox>COL% ที่สูงกว่า 28% ควรตรวจสอบชั่วโมงทำงานและ OT ในหน้า Daily Sales</WarnBox>
      </SectionCard>

      {/* ===== 4. Daily Sales Report ===== */}
      <SectionCard icon={ClipboardList} title="4. รายงานยอดขายประจำวัน" color="green">
        <p className="text-sm text-muted-foreground">กรอกยอดขาย, TC, ชั่วโมงทำงาน, Waste และส่ง LINE Report ประจำวัน</p>

        <StepFlow steps={[
          { icon: Calendar,     label: "เลือกวันที่",  sub: "Daily Sales" },
          { icon: ClipboardList, label: "กรอกข้อมูล", sub: "Sales/TC/Hours" },
          { icon: CheckCircle,  label: "Auto Save",   sub: "ทุก 1.5 วิ" },
          { icon: Send,         label: "ส่ง LINE",     sub: "กด Send Report" },
        ]} />

        <MockScreen title="Daily Sales Report" accent="green">
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold">ยอดขาย & TC</p>
                <MockRow label="Target Sales" value="฿ 52,000" />
                <MockRow label="Actual Sales" value="฿ 48,250" highlight />
                <MockRow label="TC" value="312 คน" highlight />
                <MockRow label="TA (Avg Ticket)" value="฿ 154.65" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold">Labor & Waste</p>
                <MockRow label="Recommend Hrs" value="42 ชม." />
                <MockRow label="Actual Hrs" value="38 ชม." highlight />
                <MockRow label="OT Hrs" value="2 ชม." />
                <MockRow label="COL%" value="24.5%" highlight />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="bg-green-600 text-white text-[10px] rounded px-2 py-1 font-semibold">💾 บันทึก DB</span>
              <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px] rounded px-2 py-1">📤 ส่ง LINE</span>
            </div>
          </div>
        </MockScreen>

        <TipBox>LINE Report จะส่งสรุปยอดขาย, TC, COL%, OSAT และ Survey Count ไปยังกลุ่ม LINE OA ที่ตั้งค่าไว้</TipBox>
        <WarnBox>Area Manager ต้องปลดล็อกก่อนจึงจะกด "บันทึก DB" ได้ — ดูหัวข้อ 8</WarnBox>
      </SectionCard>

      {/* ===== 5. Sales Settings ===== */}
      <SectionCard icon={Settings} title="5. ตั้งค่ายอดขาย (Sales Settings)" color="amber">
        <p className="text-sm text-muted-foreground">กำหนดเป้าหมายยอดขายรายวัน ตั้งค่าพารามิเตอร์ร้าน และแก้ไขข้อมูลย้อนหลัง</p>

        <StepFlow steps={[
          { icon: Calendar,     label: "เลือกเดือน", sub: "< >" },
          { icon: ClipboardList, label: "กรอกเป้า", sub: "ต่อวัน" },
          { icon: CheckCircle,  label: "Save",       sub: "บันทึก" },
        ]} />

        <MockScreen title="Sales Settings — เป้าหมายรายวัน" accent="amber">
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-muted-foreground pb-1 border-b border-border">
              <span>วันที่</span>
              <span className="text-center">เป้า (฿)</span>
              <span className="text-center">จริง (฿)</span>
              <span className="text-center">% สำเร็จ</span>
            </div>
            {[
              { d: "1 ก.พ.", t: "50,000", a: "51,200", pct: "102%", ok: true },
              { d: "2 ก.พ.", t: "48,000", a: "46,800", pct: "97%",  ok: false },
              { d: "3 ก.พ.", t: "55,000", a: "54,100", pct: "98%",  ok: false },
            ].map((r, i) => (
              <div key={i} className="grid grid-cols-4 gap-1 text-[10px] py-0.5">
                <span className="text-muted-foreground">{r.d}</span>
                <span className="text-center">{r.t}</span>
                <span className="text-center">{r.a}</span>
                <span className={`text-center font-bold ${r.ok ? "text-green-600" : "text-red-500"}`}>{r.pct}</span>
              </div>
            ))}
          </div>
        </MockScreen>

        <TipBox>Export ข้อมูลทั้งเดือนเป็น Excel ได้ด้วยปุ่ม "Export Excel" มุมบนขวาของหน้า</TipBox>
      </SectionCard>

      {/* ===== 6. Weekly Report ===== */}
      <SectionCard icon={TrendingUp} title="6. รายงานรายสัปดาห์ (Weekly)" color="blue">
        <p className="text-sm text-muted-foreground">ดูสรุปยอดขายและ MTD (Month-to-Date) รายสัปดาห์ เปรียบเทียบ LY (Last Year)</p>

        <MockScreen title="Weekly Sales Summary" accent="blue">
          <div className="space-y-1">
            {[
              { week: "Week 1", sales: "฿ 312,500", ly: "฿ 298,000", vs: "+4.9%" },
              { week: "Week 2", sales: "฿ 287,000", ly: "฿ 301,200", vs: "-4.7%" },
              { week: "Week 3", sales: "฿ 335,800", ly: "฿ 310,000", vs: "+8.3%" },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/50 last:border-0">
                <span className="font-medium">{r.week}</span>
                <span>{r.sales}</span>
                <span className="text-muted-foreground text-[10px]">LY: {r.ly}</span>
                <span className={`font-bold text-[11px] ${r.vs.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{r.vs}</span>
              </div>
            ))}
          </div>
        </MockScreen>
      </SectionCard>

      {/* ===== 7. Borrow Tracker ===== */}
      <SectionCard icon={Package} title="7. Borrow Tracker (ยืม-คืน)" color="green">
        <p className="text-sm text-muted-foreground">บันทึกการยืมวัตถุดิบหรืออุปกรณ์ระหว่างสาขา ติดตามสถานะ และบันทึกการรับคืน</p>

        <StepFlow vertical steps={[
          { icon: Package,      label: "เพิ่มรายการยืม", sub: "เลือกสาขา, สินค้า, จำนวน" },
          { icon: Clock,        label: "ติดตามสถานะ",    sub: "Pending → Active" },
          { icon: CheckCircle,  label: "บันทึกรับคืน",  sub: "เปลี่ยนสถานะ → Returned" },
        ]} />

        <MockScreen title="Borrow Tracker" accent="gray">
          <div className="space-y-1">
            {[
              { item: "French Fries 2kg",   from: "GDP",  to: "CEN", status: "Active",   color: "amber" },
              { item: "Cheese Slice ×20",   from: "GDP",  to: "SHN", status: "Returned", color: "green" },
              { item: "Lettuce 1kg",         from: "CEN",  to: "GDP", status: "Pending",  color: "blue"  },
            ].map((r, i) => {
              const statusColor: Record<string, string> = {
                Active:   "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                Returned: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                Pending:  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
              };
              return (
                <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-border/50 last:border-0">
                  <span className="font-medium">{r.item}</span>
                  <span className="text-muted-foreground">{r.from} → {r.to}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-semibold ${statusColor[r.status]}`}>{r.status}</span>
                </div>
              );
            })}
          </div>
        </MockScreen>
      </SectionCard>

      {/* ===== 8. Area Manager ===== */}
      <SectionCard icon={Shield} title="9. Area Manager — ระบบปลดล็อก" color="red">
        <p className="text-sm text-muted-foreground">Area Manager อ่านข้อมูลได้ทั้งหมด แต่ต้องปลดล็อกก่อนแก้ไข เพื่อความปลอดภัยของข้อมูล</p>

        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3 text-center">
            <Lock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">โหมดล็อก</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">ดูข้อมูลได้<br/>แต่แก้ไขไม่ได้</p>
          </div>
          <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950 p-3 text-center">
            <Unlock className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-green-800 dark:text-green-300">โหมดปลดล็อก</p>
            <p className="text-[10px] text-green-700 dark:text-green-400 mt-1">แก้ไขได้<br/>นาน 30 นาที</p>
          </div>
        </div>

        <StepFlow vertical steps={[
          { icon: Lock,     label: "เห็น Banner สีเหลือง 🔒",  sub: "บนหน้า Daily Sales หรือ Settings" },
          { icon: UserCheck, label: "กด 'ปลดล็อก'",            sub: "กรอกรหัสผ่านของตัวเอง" },
          { icon: Unlock,   label: "โหมดแก้ไขเปิด 30 นาที",   sub: "Banner เปลี่ยนเป็นสีเขียว 🔓" },
          { icon: Clock,    label: "หมดเวลา → ล็อกอัตโนมัติ", sub: "ต้องปลดล็อกใหม่ถ้าจะแก้ไขต่อ" },
        ]} />

        <TipBox>กดปุ่ม "ล็อก" บน Banner เขียวได้ตลอดเวลาถ้าต้องการล็อกก่อนครบ 30 นาที</TipBox>
      </SectionCard>

      {/* ===== 10. Chann AI ===== */}
      <SectionCard icon={Bot} title="10. Chann AI Assistant" color="purple">
        <p className="text-sm text-muted-foreground">Chann คือ AI ประจำสาขาที่เชื่อมต่อกับระบบทุกส่วน — ถามข้อมูล สั่งบันทึก หรือดำเนินการต่างๆ ผ่านภาษาธรรมชาติได้เลย</p>

        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="rounded-xl border bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">📖 อ่านข้อมูล (ทุก Role)</p>
            <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-3">
              <li>ยอดขาย, MTD, รายสัปดาห์</li>
              <li>ตารางงาน, คำขอพนักงาน</li>
              <li>Waste, Labor, Borrow</li>
              <li>Staff Chat (ล่าสุด)</li>
              <li>ประกาศ, คำขอสลับกะ</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-green-50 dark:bg-green-950 p-3">
            <p className="text-xs font-bold text-green-700 dark:text-green-300 mb-2">✏️ บันทึกข้อมูล (Manager+)</p>
            <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-3">
              <li>บันทึกยอดขาย, กะ, Labor</li>
              <li>ส่งข้อความใน Staff Chat</li>
              <li>สร้าง / ลบประกาศ</li>
              <li>อนุมัติ / ปฏิเสธสลับกะ</li>
              <li>ส่ง LINE Report</li>
            </ul>
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-950 text-sm my-2">
          <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1 text-xs">ตัวอย่างคำสั่งที่ Manager ใช้ได้</p>
          <ul className="text-muted-foreground text-[10px] space-y-1 list-disc pl-4">
            <li>"ส่งข้อความใน Staff Chat ว่า 'วันนี้ประชุม 14:00'"</li>
            <li>"สร้างประกาศ: ปิดสาขาวันที่ 5 เม.ย."</li>
            <li>"อนุมัติคำขอสลับกะของ พนักงาน A"</li>
            <li>"สรุปยอดขายรายสัปดาห์ให้หน่อย"</li>
            <li>"อ่านข้อความ Staff Chat 10 ข้อความล่าสุด"</li>
          </ul>
        </div>

        <TipBox>Chann มีมากกว่า 63 tools — เชื่อมต่อกับทุกระบบในแอป ถามได้ทุกเรื่อง</TipBox>
      </SectionCard>

      {/* ===== 11. ปัญหาที่พบบ่อย ===== */}
      <SectionCard icon={MessageSquare} title="11. ปัญหาที่พบบ่อย (FAQ)" color="blue">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-semibold">ปัญหา</th>
                <th className="text-left px-3 py-2 font-semibold">วิธีแก้</th>
              </tr>
            </thead>
            <tbody>
              {[
                { q: "Login ไม่ได้",              a: "ตรวจ Caps Lock / ใช้ Forgot Password รีเซ็ตรหัส" },
                { q: "ปุ่ม Save ถูก Disable",      a: "Area Manager: กด 'ปลดล็อก' ก่อน" },
                { q: "ข้อมูลเก่าไม่แสดง",          a: "กดรีเฟรชหน้า หรือเปลี่ยน Month/Week" },
                { q: "ส่ง LINE ไม่ได้",             a: "ตรวจ LINE Token ในหน้า Settings → LINE OA" },
                { q: "Export Excel ว่างเปล่า",      a: "กรอกข้อมูลเป้าหมายใน Sales Settings ก่อน" },
                { q: "พนักงานมองไม่เห็น Roster",   a: "กด Publish Roster ในหน้า Roster" },
                { q: "ต้องการรีเซ็ตรหัสพนักงาน",  a: "ไป Admin → Users → Reset Password" },
              ].map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-3 py-2 text-muted-foreground align-top">{r.q}</td>
                  <td className="px-3 py-2 font-medium align-top">{r.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-2 pb-4 border-t border-border">
        <p>คู่มือผู้จัดการ — CBH (Chann Back House) · v{APP_VERSION}</p>
        <p className="mt-1">ติดต่อ Admin เพื่อแก้ไขหรือเพิ่มเติมข้อมูล</p>
      </div>
    </div>
  );
}
