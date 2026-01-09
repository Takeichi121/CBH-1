import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react";

// กำหนด Type ของข้อมูล
type DailyTarget = {
  id?: number;
  targetDate: string;
  targetSales: string;
};

type DailySalesData = {
  date: string;
  actualSales: number;
  actualTc: number;
  laborHour: number; // เก็บชั่วโมงงานรายวัน (Summary Hours Total)
  wasteRawDaily: number;
  wasteMealDaily: number;
  wasteRawMtd: number;
  wasteMealMtd: number;
};

type WasteTarget = {
  mtdAmount: string;
  mtdPercent: string;
  mealAmount: string;
  mealPercent: string;
  rawAmount: string;
  rawPercent: string;
};

// ฟังก์ชันช่วยคำนวณวันที่
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplayDate(day: number, month: number, lang: string) {
  const monthNames = lang === "th" 
    ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${monthNames[month - 1]}`;
}

export default function SalesSettingsPage() {
  const { language } = useI18n();
  const { toast } = useToast();

  const [storeName, setStoreName] = useState("BK Grand Diamond");
  const [storeCode, setStoreCode] = useState("BK001GDP");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [dailyTargets, setDailyTargets] = useState<Record<string, string>>({});
  const [dailySalesData, setDailySalesData] = useState<Record<string, DailySalesData>>({});
  const [defaultTarget, setDefaultTarget] = useState("130000");
  const [wasteTargets, setWasteTargets] = useState<WasteTarget>({
    mtdAmount: "0",
    mtdPercent: "0",
    mealAmount: "0",
    mealPercent: "0",
    rawAmount: "0",
    rawPercent: "0",
  });
  const [isSavingWaste, setIsSavingWaste] = useState(false);

  // คำแปลภาษาไทย/อังกฤษ
  const t = {
    title: language === "th" ? "ตั้งค่าร้านค้า & รายงาน" : "Store Settings & Report",
    subtitle: language === "th" ? "จัดการข้อมูลเป้าหมายและดูรายงานภาพรวม" : "Manage targets and view overview report",
    storeInfo: language === "th" ? "ข้อมูลร้านค้า" : "Store Information",
    storeName: language === "th" ? "ชื่อร้าน" : "Store Name",
    storeCode: language === "th" ? "รหัสร้าน" : "Store Code",
    dailyTargets: language === "th" ? "เป้าหมายและยอดขายรายวัน" : "Daily Targets & Sales",
    date: language === "th" ? "วันที่" : "Date",
    targetSales: language === "th" ? "เป้าหมาย (Daily)" : "Target Sales (Daily)",
    actualSales: language === "th" ? "ยอดจริง (Daily)" : "Actual Sales (Daily)",
    actualSalesMtd: language === "th" ? "ยอดจริง MTD" : "Actual Sales MTD",
    actualTc: language === "th" ? "TC (Daily)" : "Actual TC (Daily)",
    actualTcMtd: language === "th" ? "TC MTD" : "Actual TC MTD",

    // --- เพิ่มคำแปลส่วน Labor ---
    laborHour: language === "th" ? "ชั่วโมง (Daily)" : "Labor Hr",
    laborHourMtd: language === "th" ? "ชั่วโมงสะสม (MTD)" : "Labor MTD",

    save: language === "th" ? "บันทึก" : "Save",
    saving: language === "th" ? "กำลังบันทึก..." : "Saving...",
    saved: language === "th" ? "บันทึกแล้ว" : "Saved",
    savedDesc: language === "th" ? "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว" : "Settings have been saved successfully",
    savedTargets: language === "th" ? "บันทึกเป้าหมายรายวันเรียบร้อย" : "Daily targets saved successfully",
    errorSave: language === "th" ? "บันทึกไม่สำเร็จ" : "Failed to save",
    defaultTarget: language === "th" ? "เป้าเริ่มต้น" : "Default Target",
    applyAll: language === "th" ? "ใช้กับทุกวัน" : "Apply to All",
    total: "Total",
    months: language === "th" 
      ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wasteRawDaily: language === "th" ? "Waste Daily (Raw)" : "Waste Daily (Raw)",
    wasteMealDaily: language === "th" ? "Meal Waste (Daily)" : "Meal Waste (Daily)",
    wasteRawMtd: language === "th" ? "Waste MTD (Raw)" : "Waste MTD (Raw)",
    wasteMealMtd: language === "th" ? "Meal Waste MTD" : "Meal Waste MTD",
    wasteMtd: "MTD",
  };

  // คำนวณวันในเดือน
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const monthDates = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = formatDate(selectedYear, selectedMonth, day);
      return {
        date: dateStr,
        day,
        displayDate: formatDisplayDate(day, selectedMonth, language),
      };
    });
  }, [selectedYear, selectedMonth, daysInMonth, language]);

  // คำนวณข้อมูลในตารางและยอดสะสม (MTD)
  const tableData = useMemo(() => {
    let runningActualSales = 0;
    let runningActualTc = 0;
    let runningLaborHour = 0; // ตัวแปรสะสมชั่วโมง MTD
    let runningWasteRaw = 0;
    let runningWasteMeal = 0;

    return monthDates.map(({ date, day, displayDate }) => {
      const targetSales = parseFloat(dailyTargets[date]) || 0;
      const salesData = dailySalesData[date];
      const actualSales = salesData?.actualSales || 0;
      const actualTc = salesData?.actualTc || 0;

      // ดึงชั่วโมงงานรายวัน (Summary Hours Total)
      const laborHour = salesData?.laborHour || 0; 

      const wasteRawDaily = salesData?.wasteRawDaily || 0;
      const wasteMealDaily = salesData?.wasteMealDaily || 0;

      // คำนวณยอดสะสม (MTD)
      runningActualSales += actualSales;
      runningActualTc += actualTc;
      runningLaborHour += laborHour; // สะสมชั่วโมงงาน 
      runningWasteRaw += wasteRawDaily;
      runningWasteMeal += wasteMealDaily;

      return {
        date,
        day,
        displayDate,
        targetSales,
        actualSales,
        actualSalesMtd: runningActualSales,
        actualTc,
        actualTcMtd: runningActualTc,
        laborHour, // ชั่วโมงรายวัน
        laborHourMtd: runningLaborHour, // ชั่วโมงสะสม MTD
        wasteRawDaily,
        wasteMealDaily,
        wasteRawMtd: runningWasteRaw,
        wasteMealMtd: runningWasteMeal,
      };
    });
  }, [monthDates, dailyTargets, dailySalesData]);

  // คำนวณยอดรวมท้ายตาราง (Total)
  const totals = useMemo(() => {
    const lastRow = tableData[tableData.length - 1];
    return {
      targetSales: tableData.reduce((sum, row) => sum + row.targetSales, 0),
      actualSales: tableData.reduce((sum, row) => sum + row.actualSales, 0),
      actualSalesMtd: lastRow?.actualSalesMtd || 0,
      actualTc: tableData.reduce((sum, row) => sum + row.actualTc, 0),
      actualTcMtd: lastRow?.actualTcMtd || 0,

      // รวมชั่วโมงงานทั้งเดือน
      laborHour: tableData.reduce((sum, row) => sum + row.laborHour, 0),
    };
  }, [tableData]);

  // โหลดข้อมูลจาก API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getSettings", { token });
        const data = await res.json();
        if (data.ok && data.settings) {
          setStoreName(data.settings.storeName || "BK Grand Diamond");
          setStoreCode(data.settings.storeCode || "BK001GDP");
          setDefaultTarget(data.settings.dailyTarget?.toString() || "130000");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("bk_token");

        // 1. โหลดเป้าหมาย
        const targetRes = await apiRequest("POST", "/api/sales/getDailyTargets", { 
          token, year: selectedYear, month: selectedMonth 
        });
        const targetData = await targetRes.json();
        if (targetData.ok && targetData.targets) {
          const targetMap: Record<string, string> = {};
          targetData.targets.forEach((t: DailyTarget) => {
            targetMap[t.targetDate] = t.targetSales;
          });
          setDailyTargets(prev => {
            const newTargets = { ...prev };
            monthDates.forEach(({ date }) => {
              newTargets[date] = targetMap[date] || defaultTarget;
            });
            return newTargets;
          });
        }

        // 2. โหลดรายงานยอดขาย (รวมชั่วโมงงานและ Waste)
        const reportRes = await apiRequest("POST", "/api/sales/getMonthlyReports", { 
          token, year: selectedYear, month: selectedMonth 
        });
        const reportData = await reportRes.json();
        if (reportData.ok && reportData.reports) {
          const salesMap: Record<string, DailySalesData> = {};
          reportData.reports.forEach((report: any) => {
            salesMap[report.reportDate] = {
              date: report.reportDate,
              actualSales: parseFloat(report.actualSales) || 0,
              actualTc: parseInt(report.transactionCount) || 0,
              laborHour: parseFloat(report.laborHour) || 0, // รับค่า Labor Hour มาแสดง
              wasteRawDaily: parseFloat(report.wasteRawDaily) || 0,
              wasteMealDaily: parseFloat(report.wasteMealDaily) || 0,
              wasteRawMtd: parseFloat(report.wasteRawMtd) || 0,
              wasteMealMtd: parseFloat(report.wasteMealMtd) || 0,
            };
          });
          setDailySalesData(salesMap);
        }

        // 3. โหลดเป้าหมาย Waste
        const wasteRes = await apiRequest("POST", "/api/sales/getWasteTargets", { 
          token, year: selectedYear, month: selectedMonth 
        });
        const wasteData = await wasteRes.json();
        if (wasteData.ok && wasteData.wasteTarget) {
          setWasteTargets({
            mtdAmount: wasteData.wasteTarget.mtdAmount || "0",
            mtdPercent: wasteData.wasteTarget.mtdPercent || "0",
            mealAmount: wasteData.wasteTarget.mealAmount || "0",
            mealPercent: wasteData.wasteTarget.mealPercent || "0",
            rawAmount: wasteData.wasteTarget.rawAmount || "0",
            rawPercent: wasteData.wasteTarget.rawPercent || "0",
          });
        }

      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    if (!isLoading) {
      loadData();
    }
  }, [selectedYear, selectedMonth, isLoading, monthDates, defaultTarget]);

  // ฟังก์ชันบันทึกต่างๆ (Store, Targets, Waste) คงเดิม ...
  const handleSaveStore = async () => { /* ...code บันทึกร้านค้า... */ };
  const handleSaveTargets = async () => { /* ...code บันทึกเป้าหมาย... */ };
  const handleSaveWasteTargets = async () => { /* ...code บันทึกเป้า waste... */ };
  const handleTargetChange = (date: string, value: string) => {
    setDailyTargets(prev => ({ ...prev, [date]: value }));
  };
  const handlePrevMonth = () => { /* ...code เลื่อนเดือน... */ 
    if (selectedMonth === 1) { setSelectedYear(selectedYear - 1); setSelectedMonth(12); } else { setSelectedMonth(selectedMonth - 1); }
  };
  const handleNextMonth = () => { /* ...code เลื่อนเดือน... */
    if (selectedMonth === 12) { setSelectedYear(selectedYear + 1); setSelectedMonth(1); } else { setSelectedMonth(selectedMonth + 1); }
  };
  const formatNumber = (num: number) => num.toLocaleString('en-US');

  if (isLoading) {
    return <SalesLayout><div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div></SalesLayout>;
  }

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        {/* ส่วน Card ข้อมูลร้านค้า (Store Info) ... (เหมือนเดิม) */}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">{t.dailyTargets}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm font-medium min-w-[100px] text-center">{t.months[selectedMonth - 1]} {selectedYear}</span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-200 dark:bg-slate-700">
                        <th className="px-2 py-2 border border-slate-300 min-w-[70px]">{t.date}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.targetSales}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.actualSales}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.actualSalesMtd}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.actualTc}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.actualTcMtd}</th>

                        {/* --- คอลัมน์ Labor Hour (เพิ่มใหม่) --- */}
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px] bg-indigo-100 text-indigo-700">
                          {t.laborHour}
                        </th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px] bg-indigo-200 text-indigo-800">
                          {t.laborHourMtd}
                        </th>
                        {/* ----------------------------------- */}

                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteRawDaily}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteRawMtd}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteMealDaily}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteMealMtd}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30">
                          <td className="px-2 py-1 border border-slate-300 bg-slate-100">{row.displayDate}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">
                            <Input 
                              type="number" value={dailyTargets[row.date] || ""} 
                              onChange={(e) => handleTargetChange(row.date, e.target.value)}
                              className="h-7 text-right text-sm border-0 bg-transparent" 
                            />
                          </td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualSales > 0 ? formatNumber(row.actualSales) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualSalesMtd > 0 ? formatNumber(row.actualSalesMtd) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualTc > 0 ? formatNumber(row.actualTc) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualTcMtd > 0 ? formatNumber(row.actualTcMtd) : ''}</td>

                          {/* --- ข้อมูล Labor Hour --- */}
                          <td className="px-2 py-1 border border-slate-300 text-right bg-indigo-50 text-indigo-700">
                            {row.laborHour > 0 ? formatNumber(row.laborHour) : '-'}
                          </td>
                          <td className="px-2 py-1 border border-slate-300 text-right bg-indigo-100 text-indigo-800 font-medium">
                            {row.laborHourMtd > 0 ? formatNumber(row.laborHourMtd) : '-'}
                          </td>
                          {/* ------------------------- */}

                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteRawDaily > 0 ? formatNumber(row.wasteRawDaily) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteRawMtd > 0 ? formatNumber(row.wasteRawMtd) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteMealDaily > 0 ? formatNumber(row.wasteMealDaily) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteMealMtd > 0 ? formatNumber(row.wasteMealMtd) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 font-bold bg-slate-200">
                      <tr>
                        <td className="px-2 py-2 border border-slate-300">{t.total}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.targetSales)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualSales)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualSalesMtd)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualTc)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualTcMtd)}</td>

                        {/* --- ผลรวม Labor Hour รายเดือน --- */}
                        <td className="px-2 py-2 border border-slate-300 text-right bg-indigo-200 text-indigo-900">
                          {formatNumber(totals.laborHour)}
                        </td>
                        <td className="px-2 py-2 border border-slate-300 text-right bg-indigo-300 text-indigo-900">-</td>
                        {/* --------------------------------- */}

                        <td className="px-2 py-2 border border-slate-300 text-right">-</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{tableData.length > 0 ? formatNumber(tableData[tableData.length - 1].wasteRawMtd) : '-'}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">-</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{tableData.length > 0 ? formatNumber(tableData[tableData.length - 1].wasteMealMtd) : '-'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            {/* ปุ่มบันทึกต่างๆ */}
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}