import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, Upload, FileSpreadsheet, LayoutGrid, FileText, Download } from "lucide-react";
import { PageTutorial, TutorialStep } from "@/components/page-tutorial";

import { MONTH_TH, MONTH_EN } from "./attendance/types";
import { MonthlyView } from "./attendance/monthly-view";
import { MatrixView } from "./attendance/matrix-view";
import { ImportExcelTab } from "./attendance/import-excel-tab";
import { ExcelSheetCombined } from "./attendance/excel-sheet-tab";
import { ClockInOutCSVTab } from "./attendance/csv-sheet-tab";

const ATTENDANCE_TUTORIAL: TutorialStep[] = [
  {
    titleTh: "📋 หน้าบันทึกเวลาทำงาน",
    descriptionTh: "หน้านี้ใช้สำหรับดูและจัดการข้อมูลการ clock-in/out ของพนักงาน นำเข้าจาก Aloha POS",
    icon: <Clock className="w-10 h-10 text-primary" />,
  },
  {
    titleTh: "📅 เลือกเดือนและปี",
    descriptionTh: "ใช้ปุ่มลูกศร ‹ › หรือ dropdown เดือน/ปีด้านบน เพื่อดูข้อมูลของเดือนที่ต้องการ",
    icon: <Clock className="w-10 h-10 text-blue-500" />,
  },
  {
    titleTh: "📊 แท็บ 'บันทึก'",
    descriptionTh: "แสดงรายการ clock-in/out ทุกวันของเดือนนั้น สามารถแก้ไข เพิ่ม หรือลบข้อมูลได้",
    icon: <FileSpreadsheet className="w-10 h-10 text-green-500" />,
  },
  {
    titleTh: "🔲 แท็บ 'ตารางเปรียบ'",
    descriptionTh: "แสดงข้อมูลพนักงานทุกคนแบบตารางเปรียบเทียบ แก้ไขข้อมูลได้โดยตรงในเซลล์",
    icon: <LayoutGrid className="w-10 h-10 text-purple-500" />,
  },
  {
    titleTh: "📥 Import Excel",
    descriptionTh: "อัพโหลดไฟล์ Clock In/Out จาก Aloha (รูปแบบ .xlsx) ระบบจะอ่านข้อมูลพนักงาน 5 คนโดยอัตโนมัติ",
    icon: <Upload className="w-10 h-10 text-orange-500" />,
  },
  {
    titleTh: "⬇️ ดาวน์โหลด Excel",
    descriptionTh: "กดปุ่ม 'ดาวน์โหลด Excel' เพื่อ export ข้อมูลเป็นไฟล์ .xlsx รูปแบบเดียวกับต้นฉบับ",
    icon: <Download className="w-10 h-10 text-teal-500" />,
  },
];

export default function AttendancePage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const storeId = (user as any)?.storeId || "BK1040";

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleDownloadExcel = () => {
    const token = localStorage.getItem("bk_token") || "";
    const url = `/api/attendance/export-excel?token=${encodeURIComponent(token)}&year=${year}&month=${month}&storeId=${encodeURIComponent(storeId)}`;
    const a = document.createElement("a");
    a.href = url; a.download = `Clock_In_Out_${MONTH_EN[month - 1]}_${year}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-attendance-title">
                <Clock className="h-6 w-6 text-primary" />
                {t("Attendance / Clock In-Out","บันทึกเวลาทำงาน")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("Track and manage employee clock-in/out records from Aloha POS","บันทึกและจัดการเวลาเข้า-ออกงานจาก Aloha POS")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month" className="h-9 w-9">‹</Button>
            <div className="flex items-center gap-2">
              <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
                <SelectTrigger className="h-9 w-40" data-testid="select-month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_TH.map((m, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>
                      {language === "th" ? m : MONTH_EN[i]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger className="h-9 w-24" data-testid="select-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month" className="h-9 w-9">›</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel} data-testid="button-download-excel" className="gap-1.5 h-9 ml-2">
              <Download className="h-3.5 w-3.5" />
              {t("Export Excel","ดาวน์โหลด Excel")}
            </Button>
          </div>

          <Tabs defaultValue="records" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              <TabsTrigger value="records" data-testid="tab-records" className="gap-1 text-xs">
                <Clock className="h-3.5 w-3.5" />{t("Records","บันทึก")}
              </TabsTrigger>
              <TabsTrigger value="excel-sheet" data-testid="tab-excel-sheet" className="gap-1 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" />{t("Excel Sheet","Excel Sheet")}
              </TabsTrigger>
              <TabsTrigger value="matrix" data-testid="tab-matrix" className="gap-1 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" />{t("Matrix","ตารางเปรียบ")}
              </TabsTrigger>
              <TabsTrigger value="csv-sheet" data-testid="tab-csv-sheet" className="gap-1 text-xs">
                <FileText className="h-3.5 w-3.5" />{t("CSV Sheet","Clock In Out")}
              </TabsTrigger>
              <TabsTrigger value="import" data-testid="tab-import" className="gap-1 text-xs">
                <Upload className="h-3.5 w-3.5" />{t("Import","Import Excel")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="records">
              <MonthlyView year={year} month={month} storeId={storeId} />
            </TabsContent>
            <TabsContent value="excel-sheet">
              <ExcelSheetCombined year={year} month={month} storeId={storeId} />
            </TabsContent>
            <TabsContent value="matrix">
              <MatrixView year={year} month={month} storeId={storeId} />
            </TabsContent>
            <TabsContent value="csv-sheet">
              <ClockInOutCSVTab year={year} month={month} storeId={storeId} />
            </TabsContent>
            <TabsContent value="import">
              <ImportExcelTab year={year} month={month} storeId={storeId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <PageTutorial pageKey="attendance" steps={ATTENDANCE_TUTORIAL} />
    </>
  );
}
