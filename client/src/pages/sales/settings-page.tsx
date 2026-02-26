import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, ChevronLeft, ChevronRight, Settings, Undo2, FileSpreadsheet, Database, Copy, RefreshCw, MessageSquare, Send, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

type DailyTarget = {
  id?: number;
  targetDate: string;
  targetSales: string;
};

type DailySalesData = {
  date: string;
  actualSales: number;
  actualTc: number;
  recommendHours: number;
  rosterCommit: number;
  actualHours: number;
  otHours: number;
  wasteDaily: number;
};

type WasteTarget = {
  mtdAmount: string;
  mtdPercent: string;
  mealAmount: string;
  mealPercent: string;
  rawAmount: string;
  rawPercent: string;
};

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
  const { user } = useAuth();

  const [storeName, setStoreName] = useState("BK Grand Diamond");
  const [storeCode, setStoreCode] = useState("BK001GDP");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [isSavingSales, setIsSavingSales] = useState(false);
  const [isSavingWaste, setIsSavingWaste] = useState(false);
  const [isSavingParams, setIsSavingParams] = useState(false);
  const [exportKey, setExportKey] = useState("");

  const [lineToken, setLineToken] = useState("");
  const [lineTargetId, setLineTargetId] = useState("");
  const [lineMaskedToken, setLineMaskedToken] = useState("");
  const [lineSavedTargetId, setLineSavedTargetId] = useState("");
  const [lineStatus, setLineStatus] = useState<"idle" | "ok" | "error">("idle");
  const [lineStatusMsg, setLineStatusMsg] = useState("");
  const [lineReportStatus, setLineReportStatus] = useState<"idle" | "ok" | "error">("idle");
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [dailyTargets, setDailyTargets] = useState<Record<string, string>>({});
  
  const [editableSalesData, setEditableSalesData] = useState<Record<string, {
    actualSales: string;
    actualTc: string;
    recommendHours: string;
    rosterCommit: string;
    actualHours: string;
    otHours: string;
    wasteDaily: string;
    lastYearSales: string;
    forecastSales: string;
    lastYearTc: string;
    targetTc: string;
    targetTa: string;
  }>>({});

  const [defaultTarget, setDefaultTarget] = useState("130000");
  const [wasteTargets, setWasteTargets] = useState<WasteTarget>({
    mtdAmount: "0", mtdPercent: "0", mealAmount: "0", mealPercent: "0", rawAmount: "0", rawPercent: "0",
  });

  const [dutyTeamHours, setDutyTeamHours] = useState("40");
  const [hourlyRate, setHourlyRate] = useState("84");
  const [fixedCostDaily, setFixedCostDaily] = useState(0);
  const [closeShiftDailyCost, setCloseShiftDailyCost] = useState(0);

  const [originalDailyTargets, setOriginalDailyTargets] = useState<Record<string, string>>({});
  const [originalSalesData, setOriginalSalesData] = useState<Record<string, any>>({});

  const DUTY_TEAM_HOURS = parseFloat(dutyTeamHours) || 40;
  const HOURLY_RATE = parseFloat(hourlyRate) || 84;

  const t = {
    title: language === "th" ? "ตั้งค่าร้านค้า" : "Store Settings",
    subtitle: language === "th" ? "จัดการข้อมูลและเป้าหมายร้านค้า" : "Manage store information and targets",
    storeInfo: language === "th" ? "ข้อมูลร้านค้า" : "Store Information",
    storeName: language === "th" ? "ชื่อร้าน" : "Store Name",
    storeCode: language === "th" ? "รหัสร้าน" : "Store Code",
    dailyTargets: language === "th" ? "เป้าหมายและยอดขายรายวัน" : "Daily Targets & Sales",
    save: language === "th" ? "บันทึก" : "Save",
    saving: language === "th" ? "กำลังบันทึก..." : "Saving...",
    saved: language === "th" ? "บันทึกแล้ว" : "Saved",
    savedDesc: language === "th" ? "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว" : "Settings have been saved successfully",
    errorSave: language === "th" ? "บันทึกไม่สำเร็จ" : "Failed to save",
    defaultTarget: language === "th" ? "เป้าเริ่มต้น" : "Default Target",
    applyAll: language === "th" ? "ใช้กับทุกวัน" : "Apply to All",
    months: language === "th" 
      ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    date: language === "th" ? "วันที่" : "Date",
    targetSales: language === "th" ? "เป้าหมาย" : "Target",
    actSales: "Actual Sales",
    actSalesMtd: "Sales MTD",
    actTc: "Actual TC",
    actTcMtd: "TC MTD",
    recHours: "Recommend Hr",
    roster: "Roster Commit",
    mtdRoster: "MTD Roster",
    dutyTeam: "Duty Team",
    actHours: "Actual Hr",
    otHours: "OT Hr",
    sumHours: "Summary Hr",
    mtdHours: "MTD Hr",
    variance: "Variance Hr",
    colBath: "COL (฿)",
    mtdCol: "MTD COL",
    colPercent: "COL %",
    tcmh: "TCMH",
    wasteDaily: "Waste (฿)",
    wasteMtd: "Waste MTD",
    wastePercent: "Waste %",
    laborParams: language === "th" ? "พารามิเตอร์ Labor" : "Labor Parameters",
    dutyTeamLabel: language === "th" ? "Duty Team Hours (ชม./วัน)" : "Duty Team Hours (hr/day)",
    pphLabel: language === "th" ? "PPH - ค่าแรงต่อชั่วโมง (฿)" : "PPH - Hourly Rate (฿)",
    lyDailySales: "LY Sales",
    lyMtdSales: "LY Sales MTD",
    forecastSales: "Forecast",
    forecastMtd: "Forecast MTD",
    achievePercent: "Achieve %",
    compSalesPercent: "Comp Sales %",
    lyTc: "LY TC",
    lyTcMtd: "LY TC MTD",
    targetTcLabel: "Target TC",
    targetTcMtd: "Target TC MTD",
    compTcPercent: "Comp TC %",
    lyTa: "LY TA",
    targetTaLabel: "Target TA",
    actualTa: "Actual TA",
    varianceTa: "Variance TA",
    exportExcel: language === "th" ? "Export Excel" : "Export Excel",
  };

  const daysInMonth = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

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

  const tableData = useMemo(() => {
    let runningActualSales = 0;
    let runningActualTc = 0;
    let runningRoster = 0;
    let runningWorkHours = 0;
    let runningCol = 0;
    let runningWaste = 0;
    let runningTargetSales = 0;
    let runningLastYearSales = 0;
    let runningForecast = 0;
    let runningLastYearTc = 0;
    let runningTargetTc = 0;
    
    return monthDates.map(({ date, day, displayDate }) => {
      const targetSales = parseFloat(dailyTargets[date]) || 0;
      const editable = editableSalesData[date] || {};
      
      const actualSales = parseFloat(editable.actualSales) || 0;
      const actualTc = parseFloat(editable.actualTc) || 0;
      const recommendHours = parseFloat(editable.recommendHours) || 0;
      const rosterCommit = parseFloat(editable.rosterCommit) || 0;
      const actualHours = parseFloat(editable.actualHours) || 0;
      const otHours = parseFloat(editable.otHours) || 0;
      const wasteDaily = parseFloat(editable.wasteDaily) || 0;
      const lastYearSales = parseFloat(editable.lastYearSales) || 0;
      const forecastSales = parseFloat(editable.forecastSales) || 0;
      const lastYearTc = parseFloat(editable.lastYearTc) || 0;
      const targetTc = parseFloat(editable.targetTc) || 0;
      const targetTa = parseFloat(editable.targetTa) || 0;
      
      runningActualSales += actualSales;
      runningActualTc += actualTc;
      runningRoster += rosterCommit;
      runningWaste += wasteDaily;
      runningTargetSales += targetSales;
      runningLastYearSales += lastYearSales;
      runningForecast += forecastSales;
      runningLastYearTc += lastYearTc;
      runningTargetTc += targetTc;

      const summaryHours = DUTY_TEAM_HOURS + actualHours + otHours;
      runningWorkHours += summaryHours;
      const varianceHours = summaryHours - rosterCommit;

      const colDaily = summaryHours * HOURLY_RATE + fixedCostDaily + closeShiftDailyCost;
      runningCol += colDaily;
      const colPercent = actualSales > 0 ? (colDaily / actualSales) * 100 : 0;
      
      const tcmh = summaryHours > 0 ? actualTc / summaryHours : 0;
      const wastePercent = actualSales > 0 ? (wasteDaily / actualSales) * 100 : 0;

      const achievePercent = runningTargetSales > 0 ? (runningActualSales / runningTargetSales) * 100 : 0;
      const compSalesPercent = lastYearSales > 0 ? ((actualSales / lastYearSales) - 1) * 100 : 0;
      const compTcPercent = lastYearTc > 0 ? ((actualTc / lastYearTc) - 1) * 100 : 0;
      const lastYearTa = lastYearTc > 0 ? lastYearSales / lastYearTc : 0;
      const actualTa = actualTc > 0 ? actualSales / actualTc : 0;
      const varianceTa = actualTa - targetTa;
      
      return {
        date,
        day,
        displayDate,
        targetSales,
        actualSales,
        actualSalesMtd: runningActualSales,
        actualTc,
        actualTcMtd: runningActualTc,
        recommendHours,
        rosterCommit,
        mtdRoster: runningRoster,
        dutyTeam: DUTY_TEAM_HOURS,
        actualHours,
        otHours,
        summaryHours,
        mtdWorkingHours: runningWorkHours,
        varianceHours,
        colDaily,
        mtdCol: runningCol,
        colPercent,
        tcmh,
        wasteDaily,
        wasteMtd: runningWaste,
        wastePercent,
        lastYearSales,
        lastYearSalesMtd: runningLastYearSales,
        forecastSales,
        forecastMtd: runningForecast,
        achievePercent,
        compSalesPercent,
        lastYearTc,
        lastYearTcMtd: runningLastYearTc,
        targetTc,
        targetTcMtd: runningTargetTc,
        compTcPercent,
        lastYearTa,
        targetTa,
        actualTa,
        varianceTa,
      };
    });
  }, [monthDates, dailyTargets, editableSalesData, DUTY_TEAM_HOURS, HOURLY_RATE, fixedCostDaily, closeShiftDailyCost]);

  const totals = useMemo(() => {
    const lastRow = tableData[tableData.length - 1];
    if (!lastRow) return null;
    return {
      targetSales: tableData.reduce((sum, row) => sum + row.targetSales, 0),
      actualSales: tableData.reduce((sum, row) => sum + row.actualSales, 0),
      actualSalesMtd: lastRow.actualSalesMtd,
      actualTc: tableData.reduce((sum, row) => sum + row.actualTc, 0),
      actualTcMtd: lastRow.actualTcMtd,
      recommendHours: tableData.reduce((sum, row) => sum + row.recommendHours, 0),
      rosterCommit: tableData.reduce((sum, row) => sum + row.rosterCommit, 0),
      mtdRoster: lastRow.mtdRoster,
      actualHours: tableData.reduce((sum, row) => sum + row.actualHours, 0),
      otHours: tableData.reduce((sum, row) => sum + row.otHours, 0),
      summaryHours: tableData.reduce((sum, row) => sum + row.summaryHours, 0),
      mtdWorkingHours: lastRow.mtdWorkingHours,
      colDaily: tableData.reduce((sum, row) => sum + row.colDaily, 0),
      wasteDaily: tableData.reduce((sum, row) => sum + row.wasteDaily, 0),
      wasteMtd: lastRow.wasteMtd,
      lastYearSales: tableData.reduce((sum, row) => sum + row.lastYearSales, 0),
      lastYearSalesMtd: lastRow.lastYearSalesMtd,
      forecastSales: tableData.reduce((sum, row) => sum + row.forecastSales, 0),
      forecastMtd: lastRow.forecastMtd,
      lastYearTc: tableData.reduce((sum, row) => sum + row.lastYearTc, 0),
      lastYearTcMtd: lastRow.lastYearTcMtd,
      targetTc: tableData.reduce((sum, row) => sum + row.targetTc, 0),
      targetTcMtd: lastRow.targetTcMtd,
      targetTa: tableData.reduce((sum, row) => sum + row.targetTa, 0),
    };
  }, [tableData]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const [storeRes, laborRes] = await Promise.all([
          apiRequest("POST", "/api/sales/getSettings", { token }),
          apiRequest("POST", "/api/settings/get-labor", {}),
        ]);
        const storeData = await storeRes.json();
        const laborData = await laborRes.json();
        if (storeData.ok && storeData.settings) {
          setStoreName(storeData.settings.storeName || "BK Grand Diamond");
          setStoreCode(storeData.settings.storeCode || "BK001GDP");
          setDefaultTarget(storeData.settings.dailyTarget?.toString() || "130000");
          if (storeData.settings.dutyTeamHours) {
            setDutyTeamHours(storeData.settings.dutyTeamHours.toString());
          }
          if (storeData.settings.hourlyRate) {
            setHourlyRate(storeData.settings.hourlyRate.toString());
          }
        }
        if (laborData.ok && laborData.settings) {
          setDutyTeamHours(laborData.settings.dutyDailyHours?.toString() || "40");
          setHourlyRate(laborData.settings.ptWageRate?.toString() || "45");
          setFixedCostDaily(Number(laborData.settings.fixedCostDaily) || 0);
          setCloseShiftDailyCost(Number(laborData.settings.closeShiftDailyCost) || 0);
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
    const fetchExportKey = async () => {
      const token = localStorage.getItem("bk_token");
      if (!token) return;
      try {
        const res = await fetch("/api/settings/get-export-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (data.ok) setExportKey(data.key);
      } catch (err) {
        console.error("Failed to fetch API key", err);
      }
    };
    if (user?.role === "manager" || user?.role === "admin") fetchExportKey();
  }, [user]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const bkToken = localStorage.getItem("bk_token");
    fetch("/api/settings/get-line-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: bkToken })
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setLineMaskedToken(d.maskedToken);
          setLineSavedTargetId(d.targetId);
          setLineTargetId(d.targetId);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const loadDailyTargets = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getDailyTargets", { 
          token, 
          year: selectedYear, 
          month: selectedMonth 
        });
        const data = await res.json();
        if (data.ok && data.targets) {
          const targetMap: Record<string, string> = {};
          data.targets.forEach((t: DailyTarget) => {
            targetMap[t.targetDate] = t.targetSales;
          });
          const newTargets: Record<string, string> = {};
          monthDates.forEach(({ date }) => {
            if (targetMap[date] !== undefined) {
              newTargets[date] = targetMap[date];
            } else {
              newTargets[date] = defaultTarget;
            }
          });
          setDailyTargets(newTargets);
          setOriginalDailyTargets(JSON.parse(JSON.stringify(newTargets)));
        } else {
          const newTargets: Record<string, string> = {};
          monthDates.forEach(({ date }) => {
            newTargets[date] = defaultTarget;
          });
          setDailyTargets(newTargets);
          setOriginalDailyTargets(JSON.parse(JSON.stringify(newTargets)));
        }
      } catch (error) {
        console.error("Failed to load daily targets:", error);
      }
    };
    
    const loadDailySales = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getMonthlyReports", { 
          token, 
          year: selectedYear, 
          month: selectedMonth 
        });
        const data = await res.json();
        if (data.ok && data.reports) {
          const editableMap: Record<string, any> = {};
          const emptyRow = { actualSales: "", actualTc: "", recommendHours: "", rosterCommit: "", actualHours: "", otHours: "", wasteDaily: "", lastYearSales: "", forecastSales: "", lastYearTc: "", targetTc: "", targetTa: "" };
          data.reports.forEach((report: any) => {
            editableMap[report.reportDate] = {
              actualSales: (parseFloat(report.actualSales) || 0).toString(),
              actualTc: (parseInt(report.transactionCount) || 0).toString(),
              recommendHours: (parseFloat(report.recommendHours) || 0).toString(),
              rosterCommit: (parseFloat(report.rosterCommit) || 0).toString(),
              actualHours: (parseFloat(report.actualHours) || parseFloat(report.laborHour) || 0).toString(),
              otHours: (parseFloat(report.otHours) || 0).toString(),
              wasteDaily: (parseFloat(report.wasteDaily) || (parseFloat(report.wasteRawDaily) || 0) + (parseFloat(report.wasteMealDaily) || 0)).toString(),
              lastYearSales: (parseFloat(report.lastYearSales) || 0).toString(),
              forecastSales: (parseFloat(report.forecastSales) || 0).toString(),
              lastYearTc: (parseFloat(report.lastYearTc) || 0).toString(),
              targetTc: (parseFloat(report.targetTc) || 0).toString(),
              targetTa: (parseFloat(report.targetTa) || 0).toString(),
            };
          });
          const newMap: Record<string, any> = {};
          monthDates.forEach(({ date }) => {
            if (editableMap[date]) {
              newMap[date] = editableMap[date];
            } else {
              newMap[date] = { ...emptyRow };
            }
          });
          setEditableSalesData(newMap);
          setOriginalSalesData(JSON.parse(JSON.stringify(newMap)));
        } else {
          const emptyRow = { actualSales: "", actualTc: "", recommendHours: "", rosterCommit: "", actualHours: "", otHours: "", wasteDaily: "", lastYearSales: "", forecastSales: "", lastYearTc: "", targetTc: "", targetTa: "" };
          const newMap: Record<string, any> = {};
          monthDates.forEach(({ date }) => {
            newMap[date] = { ...emptyRow };
          });
          setEditableSalesData(newMap);
          setOriginalSalesData(JSON.parse(JSON.stringify(newMap)));
        }
      } catch (error) {
        console.error("Failed to load daily sales:", error);
      }
    };
    
    if (!isLoading) {
      loadDailyTargets();
      loadDailySales();
    }
  }, [selectedYear, selectedMonth, isLoading, monthDates, defaultTarget]);

  const handleSaveStore = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/updateSettings", {
        token,
        settings: {
          storeName,
          storeCode,
          dailyTarget: parseFloat(defaultTarget) || 130000,
        }
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved, description: t.savedDesc });
      } else {
        toast({ variant: "destructive", title: t.errorSave, description: data.message || "Unknown error" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: t.errorSave, description: error.message || "Unknown error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveParams = async () => {
    setIsSavingParams(true);
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/updateSettings", {
        token,
        settings: {
          dutyTeamHours: parseFloat(dutyTeamHours) || 40,
          hourlyRate: parseFloat(hourlyRate) || 84,
        }
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved, description: language === "th" ? "บันทึกพารามิเตอร์ Labor เรียบร้อย" : "Labor parameters saved" });
      } else {
        toast({ variant: "destructive", title: t.errorSave, description: data.message || "Unknown error" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: t.errorSave, description: error.message || "Unknown error" });
    } finally {
      setIsSavingParams(false);
    }
  };

  const handleSaveTargets = async () => {
    setIsSavingTargets(true);
    try {
      const token = localStorage.getItem("bk_token");
      const targets = monthDates.map(({ date }) => ({
        targetDate: date,
        targetSales: dailyTargets[date] || defaultTarget,
      }));
      const res = await apiRequest("POST", "/api/sales/saveDailyTargets", { token, targets });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved, description: language === "th" ? "บันทึกเป้าหมายรายวันเรียบร้อย" : "Daily targets saved" });
      } else {
        toast({ variant: "destructive", title: t.errorSave, description: data.message || "Unknown error" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: t.errorSave, description: error.message || "Unknown error" });
    } finally {
      setIsSavingTargets(false);
    }
  };

  const handleTargetChange = (date: string, value: string) => {
    setDailyTargets(prev => ({ ...prev, [date]: value }));
  };

  const handleSalesDataChange = (date: string, field: string, value: string) => {
    setEditableSalesData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  const handleSaveSalesData = async () => {
    setIsSavingSales(true);
    try {
      const token = localStorage.getItem("bk_token");
      const salesData = monthDates.map(({ date }) => {
        const editable = editableSalesData[date] || {};
        return {
          reportDate: date,
          actualSales: parseFloat(editable.actualSales) || 0,
          transactionCount: parseInt(editable.actualTc) || 0,
          recommendHours: parseFloat(editable.recommendHours) || 0,
          rosterCommit: parseFloat(editable.rosterCommit) || 0,
          actualHours: parseFloat(editable.actualHours) || 0,
          otHours: parseFloat(editable.otHours) || 0,
          wasteDaily: parseFloat(editable.wasteDaily) || 0,
          lastYearSales: parseFloat(editable.lastYearSales) || 0,
          forecastSales: parseFloat(editable.forecastSales) || 0,
          lastYearTc: parseFloat(editable.lastYearTc) || 0,
          targetTc: parseFloat(editable.targetTc) || 0,
          targetTa: parseFloat(editable.targetTa) || 0,
        };
      }).filter(d => d.actualSales > 0 || d.transactionCount > 0 || d.actualHours > 0 || d.wasteDaily > 0 || d.lastYearSales > 0 || d.forecastSales > 0 || d.lastYearTc > 0 || d.targetTc > 0 || d.targetTa > 0 || d.rosterCommit > 0 || d.recommendHours > 0);
      
      const res = await apiRequest("POST", "/api/sales/saveDailySalesData", {
        token,
        year: selectedYear,
        month: selectedMonth,
        salesData,
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved, description: language === "th" ? "บันทึกข้อมูลยอดขายรายวันเรียบร้อย" : "Daily sales data saved" });
      } else {
        toast({ variant: "destructive", title: t.errorSave, description: data.message || "Unknown error" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: t.errorSave, description: error.message || "Unknown error" });
    } finally {
      setIsSavingSales(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleApplyDefaultToAll = () => {
    const newTargets = { ...dailyTargets };
    monthDates.forEach(({ date }) => {
      newTargets[date] = defaultTarget;
    });
    setDailyTargets(newTargets);
  };

  const handleUndo = () => {
    setDailyTargets(JSON.parse(JSON.stringify(originalDailyTargets)));
    setEditableSalesData(JSON.parse(JSON.stringify(originalSalesData)));
    toast({
      title: language === "th" ? "ยกเลิกการแก้ไข" : "Changes Undone",
      description: language === "th" ? "คืนค่าข้อมูลเดิมเรียบร้อยแล้ว" : "Data has been restored to original values",
    });
  };

  const fmtNum = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSaveLineConfig = async () => {
    const bkToken = localStorage.getItem("bk_token");
    const res = await fetch("/api/settings/save-line-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: bkToken, channelToken: lineToken, targetId: lineTargetId })
    });
    const data = await res.json();
    if (data.ok) {
      toast({ title: "บันทึกสำเร็จ", description: "ตั้งค่า LINE OA เรียบร้อยแล้ว" });
      if (lineToken) { setLineMaskedToken(`...${lineToken.slice(-4)}`); setLineToken(""); }
      if (lineTargetId) setLineSavedTargetId(lineTargetId);
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: data.message, variant: "destructive" });
    }
  };

  const handleTestLine = async () => {
    setIsTestingLine(true);
    setLineStatus("idle");
    const bkToken = localStorage.getItem("bk_token");
    try {
      const res = await fetch("/api/settings/test-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bkToken })
      });
      const data = await res.json();
      if (data.ok) {
        setLineStatus("ok");
        toast({ title: "ทดสอบสำเร็จ", description: "ส่งข้อความเข้า LINE เรียบร้อยแล้ว ✅" });
      } else {
        setLineStatus("error");
        setLineStatusMsg(data.message);
        toast({ title: "ส่งไม่สำเร็จ", description: data.message, variant: "destructive" });
      }
    } finally {
      setIsTestingLine(false);
    }
  };

  const handleSendDailyReport = async () => {
    setIsSendingReport(true);
    setLineReportStatus("idle");
    const bkToken = localStorage.getItem("bk_token");
    const targetDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
    try {
      const res = await fetch("/api/line/send-daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bkToken, date: targetDate })
      });
      const data = await res.json();
      if (data.ok) {
        setLineReportStatus("ok");
        toast({ title: "ส่ง Report สำเร็จ ✅", description: "ตรวจสอบได้ใน LINE Group" });
      } else {
        setLineReportStatus("error");
        toast({ title: "ไม่สามารถส่ง Report ได้", description: data.message, variant: "destructive" });
      }
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm("การสร้าง Key ใหม่จะทำให้ Excel เดิมที่เชื่อมต่อไว้ใช้งานไม่ได้ ต้องการดำเนินการต่อหรือไม่?")) return;
    const token = localStorage.getItem("bk_token");
    const res = await fetch("/api/settings/regenerate-export-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (data.ok) {
      setExportKey(data.key);
      toast({ title: "สำเร็จ", description: "สร้าง API Key ใหม่เรียบร้อยแล้ว" });
    } else {
      toast({ title: "ล้มเหลว", description: data.message, variant: "destructive" });
    }
  };

  const handleExportExcel = async () => {
    const token = localStorage.getItem("bk_token");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    toast({ title: "กำลังสร้างไฟล์ Excel...", description: "กรุณารอสักครู่ ระบบกำลังนำข้อมูลใส่ Template" });

    try {
      const res = await fetch("/api/export/sales-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          month: selectedMonth,
          year: selectedYear,
          storeName,
          dutyDailyHours: DUTY_TEAM_HOURS,
          ptWageRate: HOURLY_RATE,
          fixedCostDaily,
          closeShiftDailyCost,
          wasteTargetPct: wasteTargets.rawPercent || 0.75,
          tableData: tableData.map(row => ({
            day: row.day,
            actualSales: row.actualSales,
            actualSalesMtd: row.actualSalesMtd,
            lastYearSales: row.lastYearSales,
            lastYearSalesMtd: row.lastYearSalesMtd,
            targetSales: row.targetSales,
            forecastSales: row.forecastSales,
            actualTc: row.actualTc,
            actualTcMtd: row.actualTcMtd,
            lastYearTc: row.lastYearTc,
            lastYearTcMtd: row.lastYearTcMtd,
            targetTc: row.targetTc,
            targetTcMtd: row.targetTcMtd,
            recommendHours: row.recommendHours,
            rosterCommit: row.rosterCommit,
            mtdRoster: row.mtdRoster,
            actualHours: row.actualHours,
            otHours: row.otHours,
            wasteDaily: row.wasteDaily,
          }))
        })
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sales_${storeName.replace(/[^a-zA-Z0-9]/g, "_")}_${monthNames[selectedMonth - 1]}${selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: language === "th" ? "สำเร็จ" : "Success", description: language === "th" ? "ดาวน์โหลดไฟล์ Excel เรียบร้อย" : "Excel file downloaded successfully" });
    } catch (err) {
      toast({ title: "Error", description: "ไม่สามารถสร้างไฟล์ Excel ได้", variant: "destructive" });
      console.error(err);
    }
  };


  if (isLoading) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </SalesLayout>
    );
  }

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">{t.title}</h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t.storeInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">{t.storeName}</Label>
                <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} data-testid="input-store-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeCode">{t.storeCode}</Label>
                <Input id="storeCode" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} data-testid="input-store-code" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveStore} disabled={isSaving} data-testid="button-save-store">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.saving}</> : <><Save className="w-4 h-4 mr-2" />{t.save}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t.laborParams}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dutyTeamHours">{t.dutyTeamLabel}</Label>
                <Input id="dutyTeamHours" type="number" value={dutyTeamHours} onChange={(e) => setDutyTeamHours(e.target.value)} data-testid="input-duty-team-hours" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">{t.pphLabel}</Label>
                <Input id="hourlyRate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} data-testid="input-hourly-rate" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveParams} disabled={isSavingParams} data-testid="button-save-params">
                {isSavingParams ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.saving}</> : <><Save className="w-4 h-4 mr-2" />{t.save}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">{t.dailyTargets}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {t.months[selectedMonth - 1]} {selectedYear}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden relative">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <span className="animate-pulse">←</span>
                {language === "th" ? "เลื่อนซ้าย-ขวาเพื่อดูข้อมูลทั้งหมด" : "Scroll left-right to see all data"}
                <span className="animate-pulse">→</span>
              </div>
              <div className="overflow-x-auto scrollbar-visible pb-3" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs border-collapse min-w-[3800px]">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-slate-200 dark:bg-slate-700 text-center">
                        <th className="p-2 border border-slate-300 min-w-[80px] sticky left-0 z-30 bg-slate-200 dark:bg-slate-700">{t.date}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px] bg-yellow-100 dark:bg-yellow-900">{t.targetSales}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px] bg-green-100 dark:bg-green-900">{t.actSales}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.actSalesMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px] bg-orange-100 dark:bg-orange-900">{t.lyDailySales}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.lyMtdSales}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px] bg-orange-100 dark:bg-orange-900">{t.forecastSales}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.forecastMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.achievePercent}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.compSalesPercent}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-green-100 dark:bg-green-900">{t.actTc}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.actTcMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-orange-100 dark:bg-orange-900">{t.lyTc}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.lyTcMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-orange-100 dark:bg-orange-900">{t.targetTcLabel}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.targetTcMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.compTcPercent}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.lyTa}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-orange-100 dark:bg-orange-900">{t.targetTaLabel}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.actualTa}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.varianceTa}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px] bg-blue-100 dark:bg-blue-900">{t.recHours}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px] bg-blue-100 dark:bg-blue-900">{t.roster}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.mtdRoster}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-gray-200 dark:bg-gray-600 text-gray-500">{t.dutyTeam}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px] bg-blue-100 dark:bg-blue-900">{t.actHours}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px] bg-blue-100 dark:bg-blue-900">{t.otHours}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px] font-bold">{t.sumHours}</th>
                        <th className="p-2 border border-slate-300 min-w-[70px]">{t.mtdHours}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.variance}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.colBath}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.mtdCol}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.colPercent}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.tcmh}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px] bg-red-100 dark:bg-red-900">{t.wasteDaily}</th>
                        <th className="p-2 border border-slate-300 min-w-[80px]">{t.wasteMtd}</th>
                        <th className="p-2 border border-slate-300 min-w-[60px]">{t.wastePercent}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30 text-center">
                          <td className="p-1 border border-slate-300 font-medium bg-slate-50 dark:bg-slate-800 sticky left-0 z-10">{row.displayDate}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={dailyTargets[row.date] || ""} onChange={(e) => handleTargetChange(row.date, e.target.value)} data-testid={`input-target-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={editableSalesData[row.date]?.actualSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualSales', e.target.value)} data-testid={`input-sales-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.actualSalesMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.lastYearSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'lastYearSales', e.target.value)} data-testid={`input-ly-sales-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.lastYearSalesMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.forecastSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'forecastSales', e.target.value)} data-testid={`input-forecast-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.forecastMtd)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.achievePercent >= 100 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.achievePercent)}%</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.compSalesPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.compSalesPercent)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={editableSalesData[row.date]?.actualTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualTc', e.target.value)} data-testid={`input-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.actualTcMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.lastYearTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'lastYearTc', e.target.value)} data-testid={`input-ly-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.lastYearTcMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.targetTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'targetTc', e.target.value)} data-testid={`input-target-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.targetTcMtd)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.compTcPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.compTcPercent)}%</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.lastYearTa)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.targetTa || ""} onChange={(e) => handleSalesDataChange(row.date, 'targetTa', e.target.value)} data-testid={`input-target-ta-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.actualTa)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceTa >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.varianceTa)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.recommendHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'recommendHours', e.target.value)} data-testid={`input-rec-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.rosterCommit || ""} onChange={(e) => handleSalesDataChange(row.date, 'rosterCommit', e.target.value)} data-testid={`input-roster-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.mtdRoster)}</td>
                          <td className="p-1 border border-slate-300 bg-gray-100 dark:bg-gray-700 text-center text-gray-500">{row.dutyTeam}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.actualHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualHours', e.target.value)} data-testid={`input-actual-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.otHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'otHours', e.target.value)} data-testid={`input-ot-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-100 dark:bg-slate-700 font-bold text-right pr-2 text-indigo-700 dark:text-indigo-300">{fmtDec(row.summaryHours)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.mtdWorkingHours)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceHours < 0 ? 'text-red-500' : 'text-green-600'}`}>{fmtDec(row.varianceHours)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.colDaily)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.mtdCol)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.colPercent)}%</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.tcmh)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-red-700 dark:text-red-300" value={editableSalesData[row.date]?.wasteDaily || ""} onChange={(e) => handleSalesDataChange(row.date, 'wasteDaily', e.target.value)} data-testid={`input-waste-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.wasteMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.wastePercent)}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-20 font-bold bg-slate-200 dark:bg-slate-700">
                      <tr>
                        <td className="p-2 border border-slate-300 sticky left-0 bg-slate-200 dark:bg-slate-700">Total</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualSalesMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearSalesMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.forecastSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.forecastMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.recommendHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.rosterCommit)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.mtdRoster)}</td>
                        <td className="p-2 border border-slate-300 bg-gray-300 dark:bg-gray-600 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.actualHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.otHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.summaryHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.mtdWorkingHours)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.colDaily)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.wasteDaily)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.wasteMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleExportExcel} className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-700 dark:text-green-300" data-testid="button-export-excel">
                <FileSpreadsheet className="mr-2 w-4 h-4"/>
                {t.exportExcel}
              </Button>
              <Button variant="outline" onClick={handleApplyDefaultToAll} data-testid="button-apply-all">
                {t.applyAll}
              </Button>
              <Button variant="outline" onClick={handleSaveTargets} disabled={isSavingTargets} data-testid="button-save-targets">
                {isSavingTargets ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                {language === "th" ? "บันทึกเป้า" : "Save Targets"}
              </Button>
              <Button onClick={handleSaveSalesData} disabled={isSavingSales} data-testid="button-save-data">
                {isSavingSales ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                {language === "th" ? "บันทึกข้อมูล" : "Save Data"}
              </Button>
              <Button variant="outline" onClick={handleUndo} data-testid="button-undo">
                <Undo2 className="mr-2 w-4 h-4"/>
                {language === "th" ? "Undo" : "Undo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {(user?.role === "manager" || user?.role === "admin") && (
          <Card className="mt-8 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                <Database className="w-5 h-5 text-blue-600" />
                เชื่อมต่อข้อมูลสดเข้า Excel (OData Live Feed)
              </CardTitle>
              <CardDescription>
                ดึงข้อมูลไปวิเคราะห์ใน Excel แบบ Real-time ผ่าน Power Query
                <br/><span className="text-xs font-semibold text-amber-600">วิธีใช้: เปิด Excel → Data → Get Data → From Other Sources → From OData Feed</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">URL สำหรับดึงข้อมูลเดือนนี้ ({selectedMonth}/{selectedYear})</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={exportKey ? `${window.location.origin}/api/odata/sales?key=${exportKey}&month=${selectedMonth}&year=${selectedYear}` : "กำลังโหลด Key..."}
                    className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                    data-testid="input-odata-url"
                  />
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/api/odata/sales?key=${exportKey}&month=${selectedMonth}&year=${selectedYear}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "คัดลอก URL สำเร็จ", description: "นำไปวางในช่อง OData Feed ของ Excel ได้เลย" });
                    }}
                    data-testid="button-copy-odata-url"
                  >
                    <Copy className="w-4 h-4 mr-2 text-slate-500" />
                    คัดลอก
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  * คุณสามารถเปลี่ยนเลข <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">month=</code> และ <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">year=</code> ใน URL เพื่อดึงข้อมูลของเดือนอื่นๆ ได้โดยไม่ต้องกลับมาหน้าเว็บ
                </p>
              </div>

              {user?.role === "admin" && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleRegenerateKey} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" data-testid="button-regenerate-key">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    รีเซ็ต API Key (เพื่อความปลอดภัย)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(user?.role === "admin" || user?.role === "manager") && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                LINE Official Account
              </CardTitle>
              <CardDescription>
                เชื่อมต่อ LINE OA เพื่อส่ง report และ alert อัตโนมัติ —{" "}
                <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">
                  รับ Channel Access Token ที่ LINE Developers Console
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.role === "admin" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Channel Access Token</Label>
                    {lineMaskedToken && (
                      <p className="text-xs text-slate-500">Token ที่บันทึกไว้: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{lineMaskedToken}</span></p>
                    )}
                    <Input
                      type="password"
                      placeholder="วาง Channel Access Token ที่นี่..."
                      value={lineToken}
                      onChange={e => setLineToken(e.target.value)}
                      className="font-mono text-sm"
                      data-testid="input-line-channel-token"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Target ID (Group ID หรือ User ID)</Label>
                    {lineSavedTargetId && (
                      <p className="text-xs text-slate-500">บันทึกไว้: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{lineSavedTargetId}</span></p>
                    )}
                    <Input
                      placeholder="C... (Group ID) หรือ U... (User ID)"
                      value={lineTargetId}
                      onChange={e => setLineTargetId(e.target.value)}
                      className="font-mono text-sm"
                      data-testid="input-line-target-id"
                    />
                    <p className="text-[11px] text-slate-500">วิธีหา Group ID: เพิ่ม Bot เข้า group แล้วดู webhook event หรือใช้ <a href="https://notify-bot.line.me/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">LINE Notify</a> เพื่อเริ่มต้น</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={handleSaveLineConfig}
                      disabled={!lineToken && !lineTargetId}
                      size="sm"
                      data-testid="button-save-line-config"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      บันทึก Config
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestLine}
                      disabled={isTestingLine}
                      data-testid="button-test-line"
                    >
                      {isTestingLine ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                      ทดสอบการส่ง
                    </Button>
                    {lineStatus === "ok" && (
                      <Badge variant="outline" className="text-green-600 border-green-400 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ส่งสำเร็จ
                      </Badge>
                    )}
                    {lineStatus === "error" && (
                      <Badge variant="outline" className="text-red-600 border-red-400 gap-1 max-w-xs truncate">
                        <XCircle className="w-3 h-3" /> {lineStatusMsg}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium mb-2">ส่งรายงานประจำวัน</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendDailyReport}
                    disabled={isSendingReport}
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                    data-testid="button-send-line-daily-report"
                  >
                    {isSendingReport ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1.5" />}
                    📊 ส่ง Daily Report ไป LINE
                  </Button>
                  {lineReportStatus === "ok" && (
                    <Badge variant="outline" className="text-green-600 border-green-400 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ส่งแล้ว
                    </Badge>
                  )}
                  {lineReportStatus === "error" && (
                    <Badge variant="outline" className="text-red-600 border-red-400 gap-1">
                      <XCircle className="w-3 h-3" /> ล้มเหลว
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">จะส่งข้อมูลของวันนี้เป็น Flex Message ไปยัง LINE group ที่ตั้งค่าไว้</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SalesLayout>
  );
}
