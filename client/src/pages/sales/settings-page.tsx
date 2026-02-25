import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, ChevronLeft, ChevronRight, Settings, Undo2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

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

  const [storeName, setStoreName] = useState("BK Grand Diamond");
  const [storeCode, setStoreCode] = useState("BK001GDP");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [isSavingSales, setIsSavingSales] = useState(false);
  const [isSavingWaste, setIsSavingWaste] = useState(false);
  const [isSavingParams, setIsSavingParams] = useState(false);

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
      }).filter(d => d.actualSales > 0 || d.transactionCount > 0 || d.actualHours > 0 || d.wasteDaily > 0 || d.lastYearSales > 0 || d.forecastSales > 0 || d.lastYearTc > 0 || d.targetTc > 0 || d.targetTa > 0);
      
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

  const handleExportExcel = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const toExcelDate = (year: number, month: number, day: number): number => {
      const d = new Date(Date.UTC(year, month - 1, day));
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
    };

    const exl = (v: number | string, blank = true): number | string => {
      if (blank && (v === 0 || v === "")) return "";
      return v;
    };

    const dutyTeamCount = Math.round(DUTY_TEAM_HOURS / 8);
    const targetWastePct = wasteTargets.rawPercent || "0.75";
    const targetTcmh = 4.4;

    const row1 = Array(60).fill("");
    row1[2] = "Store name : ";
    row1[3] = storeName;
    row1[17] = `Target Waste ${targetWastePct}%`;
    row1[30] = "จำนวน Duty Team ที่มีอยู่ที่ร้าน ==>>";
    row1[34] = dutyTeamCount;
    row1[37] = "PPH ค่าชั่วโมงเฉลี่ยที่จ่ายต่อชั่วโมง ==>>";
    row1[42] = HOURLY_RATE;
    row1[44] = `Target TCMH ${targetTcmh}`;

    const row2 = Array(60).fill("");
    row2[0] = "Day"; row2[1] = "Month"; row2[2] = "Sales";
    row2[19] = "TC"; row2[28] = "TA"; row2[32] = dutyTeamCount;
    row2[45] = "Promotion ";

    const row3 = [
      "Day", "Month",
      "Last Year Sales\n(Daily)", "Last Year Sales\nMTD",
      "Target Sales\n(Incentive) \nDaily", "Target Sales MTD\n(Incentive)",
      "Forecast Sales\nFrom NBO", "Actual Sales\n(Daily)", "Actual Sales\nMTD",
      "Varaince From \nTarget", "Varaince \nMTD",
      "Sales Delivery (Daily)", "Sales Delivery MTD",
      "Achive Incentive Target%", "Varaince From \nForecast", "%", "Comp \nSales %",
      "Waste Daily (Bath)", "Waste Daily (%)",
      "Last year TC\n(Daily)", "Last year TC\nMTD",
      "Target TC\n(Daily)", "Target TC\nMTD",
      "Actual TC\n(Daily)", "Actual TC\nMTD",
      "Varaince From  Target", "Varaince From \nLast year", "Comp TC %",
      "Last year TA", "Target TA", "Actual TA", "Variance Target VS Actual",
      " Recommend Hours \n(ชั่วโมงจากระบบ NBO)",
      "Roster\nCommit \nFrom Area", "MTD Roster\nWorking Hours",
      "ชั่วโมงการทำงาน Duty Team \n(ห้ามแก้ไข)",
      "Actual \nHours\n(PT+FT)", "OT\nHours",
      "Summary Hours Total", "MTD \nWorking Hours", "Variance\n Hours",
      "COL(Bath)", "MTD COL", "COL(%)", "Actual\nTCMH",
      "Value Meal Set", "MTD\nValue\nMeal", "%Value Meal",
      "UP Size", "MTD\nUP Size", "%UP Size",
      "Add Cheese (จำนวนแผ่น)", "MTD\nAdd Cheese", "%Add Cheese",
      "Other \n (New promotion)", "MTD", "%",
      "Other \n(New promotion)", "MTD", "%",
    ];

    let runningMtdPtHours = 0;

    const dataRows = tableData.map((row, idx) => {
      const d = toExcelDate(selectedYear, selectedMonth, row.day);
      const ptSummary = row.actualHours + row.otHours;
      runningMtdPtHours += ptSummary;
      const fullSummary = DUTY_TEAM_HOURS + row.actualHours + row.otHours;
      const colBath = fullSummary * HOURLY_RATE;
      const colMtd = tableData.slice(0, idx + 1).reduce((s, r) => s + (DUTY_TEAM_HOURS + r.actualHours + r.otHours) * HOURLY_RATE, 0);
      const colPct = row.actualSales > 0 ? colBath / row.actualSales : "";
      const tcmhXl = ptSummary > 0 ? row.actualTc / ptSummary : "";
      const varFromTarget = row.actualSales > 0 ? row.actualSales - row.targetSales : "";
      const varMtd = row.actualSalesMtd > 0 ? row.actualSalesMtd - (tableData.slice(0, idx + 1).reduce((s, r) => s + r.targetSales, 0)) : "";
      const achievePct = row.targetSales > 0 && row.actualSales > 0 ? (row.actualSales - row.targetSales) / row.targetSales : "";
      const varFromForecast = row.forecastSales > 0 && row.actualSales > 0 ? row.actualSales - row.forecastSales : (row.actualSales > 0 ? row.actualSales : "");
      const compSalesPct = row.lastYearSales > 0 && row.actualSales > 0 ? (row.actualSales / row.lastYearSales) - 1 : "";
      const varTcFromTarget = row.actualTc > 0 ? row.actualTc - row.targetTc : "";
      const varTcFromLy = row.actualTc > 0 ? row.actualTc - row.lastYearTc : "";
      const compTcPct = row.lastYearTc > 0 && row.actualTc > 0 ? (row.actualTc / row.lastYearTc) - 1 : "";
      const varianceHrsXl = row.rosterCommit > 0 || ptSummary > 0 ? ptSummary - row.rosterCommit : "";
      const wastePct = row.actualSales > 0 && row.wasteDaily > 0 ? row.wasteDaily / row.actualSales : "";

      const r = Array(60).fill("");
      r[0] = d; r[1] = d;
      r[2] = exl(row.lastYearSales); r[3] = exl(row.lastYearSalesMtd);
      r[4] = exl(row.targetSales); r[5] = exl(tableData.slice(0, idx + 1).reduce((s, rr) => s + rr.targetSales, 0));
      r[6] = exl(row.forecastSales);
      r[7] = exl(row.actualSales); r[8] = exl(row.actualSalesMtd);
      r[9] = varFromTarget; r[10] = varMtd;
      r[11] = ""; r[12] = "";
      r[13] = achievePct; r[14] = varFromForecast; r[15] = 0; r[16] = compSalesPct;
      r[17] = exl(row.wasteDaily); r[18] = wastePct;
      r[19] = exl(row.lastYearTc); r[20] = exl(row.lastYearTcMtd);
      r[21] = exl(row.targetTc); r[22] = exl(row.targetTcMtd);
      r[23] = exl(row.actualTc); r[24] = exl(row.actualTcMtd);
      r[25] = varTcFromTarget; r[26] = varTcFromLy; r[27] = compTcPct;
      r[28] = exl(row.lastYearTa); r[29] = exl(row.targetTa); r[30] = exl(row.actualTa);
      r[31] = row.actualTa > 0 ? row.varianceTa : "";
      r[32] = exl(row.recommendHours); r[33] = exl(row.rosterCommit); r[34] = exl(row.mtdRoster);
      r[35] = DUTY_TEAM_HOURS;
      r[36] = exl(row.actualHours); r[37] = exl(row.otHours, false);
      r[38] = exl(ptSummary); r[39] = exl(runningMtdPtHours); r[40] = varianceHrsXl;
      r[41] = exl(colBath); r[42] = exl(colMtd); r[43] = colPct; r[44] = tcmhXl;
      return r;
    });

    const totRow = Array(60).fill("");
    totRow[0] = "Total";
    const tLySales = tableData.reduce((s, r) => s + r.lastYearSales, 0);
    const tTarget = tableData.reduce((s, r) => s + r.targetSales, 0);
    const tActual = tableData.reduce((s, r) => s + r.actualSales, 0);
    const tActualMtd = tableData[tableData.length - 1]?.actualSalesMtd || 0;
    const tLyTc = tableData.reduce((s, r) => s + r.lastYearTc, 0);
    const tTargetTc = tableData.reduce((s, r) => s + r.targetTc, 0);
    const tActualTc = tableData.reduce((s, r) => s + r.actualTc, 0);
    const tWaste = tableData.reduce((s, r) => s + r.wasteDaily, 0);
    const tRecommend = tableData.reduce((s, r) => s + r.recommendHours, 0);
    const tRoster = tableData.reduce((s, r) => s + r.rosterCommit, 0);
    const tActualHrs = tableData.reduce((s, r) => s + r.actualHours, 0);
    const tOtHrs = tableData.reduce((s, r) => s + r.otHours, 0);
    const tDutyHrs = DUTY_TEAM_HOURS * tableData.length;
    const tPtSummary = tActualHrs + tOtHrs;
    const tFullSummary = tDutyHrs + tPtSummary;
    const tColBath = tFullSummary * HOURLY_RATE;
    const tColPct = tActual > 0 ? tColBath / tActual : "";
    const tTcmh = tPtSummary > 0 ? tActualTc / tPtSummary : "";
    totRow[2] = tLySales; totRow[3] = tLySales;
    totRow[4] = tTarget; totRow[5] = tTarget;
    totRow[7] = tActual; totRow[8] = tActualMtd;
    totRow[9] = tActual - tTarget;
    totRow[17] = tWaste;
    totRow[18] = tActual > 0 ? tWaste / tActual : "";
    totRow[19] = tLyTc; totRow[20] = tLyTc;
    totRow[21] = tTargetTc; totRow[22] = tTargetTc;
    totRow[23] = tActualTc; totRow[24] = tActualTc;
    totRow[32] = tRecommend; totRow[33] = tRoster; totRow[34] = tRoster;
    totRow[35] = tDutyHrs;
    totRow[36] = tActualHrs; totRow[37] = tOtHrs;
    totRow[38] = tPtSummary; totRow[39] = tPtSummary; totRow[40] = tPtSummary - tRoster;
    totRow[41] = tColBath; totRow[43] = tColPct; totRow[44] = tTcmh;

    const aoa = [row1, row2, row3, ...dataRows, totRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = Array(60).fill(null).map((_, i) => ({ wch: i < 2 ? 8 : 15 }));

    const colDailyBudget = 0.14;
    const cdRow1 = Array(18).fill(""); cdRow1[0] = "Labour control sheet";
    const cdRow2 = Array(18).fill("");
    cdRow2[0] = "Month :  "; cdRow2[2] = toExcelDate(selectedYear, selectedMonth, 1);
    cdRow2[3] = "Budget"; cdRow2[4] = colDailyBudget;
    const cdRow3 = Array(18).fill("");
    const cdRow4 = Array(18).fill("");
    cdRow4[0] = "Avg. per hour"; cdRow4[4] = HOURLY_RATE;
    cdRow4[5] = "ค่ารถ Close shift"; cdRow4[6] = closeShiftDailyCost;
    const cdHeaders = ["Date","Day","Fix cost (Full time)","Total Hrs (Part Time)","Cost ",
      "จำนวนคนปิดร้าน","Close shift","COL(day)","Accum. COL","","Sales(day)","Sales MTD",
      "% Daily","MTD % total","VAR","","",""];
    const cdDataRows = tableData.map((row) => {
      const d = toExcelDate(selectedYear, selectedMonth, row.day);
      const ptCost = row.actualHours * HOURLY_RATE;
      const colDay = fixedCostDaily + ptCost + closeShiftDailyCost;
      const colMtdFull = row.mtdCol;
      const pctDaily = row.actualSales > 0 ? colDay / row.actualSales : "";
      const pctMtd = row.actualSalesMtd > 0 ? colMtdFull / row.actualSalesMtd : "";
      const varFromBudget = typeof pctMtd === "number" ? pctMtd - colDailyBudget : "";
      const r = Array(18).fill("");
      r[0] = d; r[1] = d;
      r[2] = fixedCostDaily; r[3] = row.actualHours; r[4] = ptCost;
      r[5] = 0; r[6] = closeShiftDailyCost;
      r[7] = exl(colDay); r[8] = exl(colMtdFull);
      r[9] = "";
      r[10] = exl(row.actualSales); r[11] = exl(row.actualSalesMtd);
      r[12] = pctDaily; r[13] = pctMtd; r[14] = varFromBudget;
      return r;
    });
    const cdAoa = [cdRow1, cdRow2, cdRow3, cdRow4, cdHeaders, ...cdDataRows];
    const cdWs = XLSX.utils.aoa_to_sheet(cdAoa);
    cdWs["!cols"] = Array(18).fill(null).map(() => ({ wch: 14 }));

    const gsiHeaders = ["Date","GSI","OSAT","","Google Review","","Delivery Rating","","Check By"];
    const gsiRow1 = Array(9).fill(""); gsiRow1[0] = " GSI Ratings ";
    const gsiRow2 = Array(9).fill(""); gsiRow2[0] = "Store Name:"; gsiRow2[1] = storeName;
    const gsiDataRows = tableData.map((row) => {
      const d = toExcelDate(selectedYear, selectedMonth, row.day);
      const r = Array(9).fill(""); r[0] = d;
      return r;
    });
    const gsiAoa = [gsiRow1, gsiRow2, gsiHeaders, ...gsiDataRows];
    const gsiWs = XLSX.utils.aoa_to_sheet(gsiAoa);
    gsiWs["!cols"] = Array(9).fill(null).map(() => ({ wch: 14 }));

    const bySegRow1 = Array(26).fill("");
    const bySegRow2 = ["Day","Date","Dine In","","Take Away","","BK Delivery","","Drive Thru ","",
      "1112Delivery","","lalamove","","foodpanda","","Line Man","","GrabFood","","GET","","honestbee","",
      "Grand Total TC","Grand Total Sales"];
    const bySegRow3 = Array(26).fill("");
    ["TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales","TC","Sales"].forEach((v,i) => { bySegRow3[i+2] = v; });
    const bySegData = tableData.map((row) => {
      const d = toExcelDate(selectedYear, selectedMonth, row.day);
      const r = Array(26).fill(""); r[0] = row.day; r[1] = d;
      r[24] = exl(row.actualTc, false); r[25] = exl(row.actualSales);
      return r;
    });
    const bySegAoa = [bySegRow1, bySegRow2, bySegRow3, ...bySegData];
    const bySegWs = XLSX.utils.aoa_to_sheet(bySegAoa);
    bySegWs["!cols"] = Array(26).fill(null).map(() => ({ wch: 12 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "Sales Management Sheet");
    XLSX.utils.book_append_sheet(workbook, cdWs, "COL Daily");
    XLSX.utils.book_append_sheet(workbook, gsiWs, " GSI สาขาที่มี Delivery");
    XLSX.utils.book_append_sheet(workbook, bySegWs, "BY SEG");

    const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Sales_Management_Sheet_${cleanStoreName}_${monthNames[selectedMonth - 1]}${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({
      title: language === "th" ? "สำเร็จ" : "Success",
      description: language === "th" ? `Export ไฟล์ ${fileName} เรียบร้อย` : `Exported ${fileName} successfully`,
    });
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
      </div>
    </SalesLayout>
  );
}
