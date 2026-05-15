import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, ChevronLeft, ChevronRight, Settings, Undo2, FileSpreadsheet, Database, Copy, RefreshCw, MessageSquare, Send, CheckCircle2, XCircle, Upload, Pencil, CheckCircle, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useAreaLock } from "@/hooks/use-area-lock";
import { AreaLockBanner } from "@/components/area-lock-banner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type DailyTarget = {
  id?: number;
  targetDate: string;
  targetSales: string;
  targetTc?: string;
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
  const { isAreaUser, isUnlocked } = useAreaLock();
  const areaLocked = isAreaUser && !isUnlocked;

  const [storeName, setStoreName] = useState("Grand Diamond");
  const [storeCode, setStoreCode] = useState("GD1040");
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
  const [detectedGroupId, setDetectedGroupId] = useState("");
  const [detectedGroupTs, setDetectedGroupTs] = useState("");
  const [isRefreshingGroup, setIsRefreshingGroup] = useState(false);
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  const [lineReportDate, setLineReportDate] = useState(todayStr);

  const [proactiveMorningReport, setProactiveMorningReport] = useState(true);
  const [proactiveWeeklyReminder, setProactiveWeeklyReminder] = useState(true);
  const [proactiveBorrowOverdue, setProactiveBorrowOverdue] = useState(true);
  const [proactiveManagerDigest, setProactiveManagerDigest] = useState(true);
  const [proactiveClosingAlert, setProactiveClosingAlert] = useState(true);
  const [isSavingProactive, setIsSavingProactive] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [dailyTargets, setDailyTargets] = useState<Record<string, string>>({});
  const [dailyTcTargets, setDailyTcTargets] = useState<Record<string, string>>({});
  
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
    closeShiftCount: string;
    salesDelivery: string;
    vMealCount: string;
    upSizeCount: string;
    addCheeseCount: string;
    promotionOther1Qty: string;
    promotionOther2Qty: string;
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

  const [isTableEditMode, setIsTableEditMode] = useState(false);
  const [hasDbData, setHasDbData] = useState(false);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // Excel Import State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "result">("upload");
  const [importParsed, setImportParsed] = useState<{
    mapping: Array<{ colIdx: number; header: string; table: string; field: string }>;
    preview: any[];
    totalRows: number;
    skipped: number;
    rows: any[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; errorDetails: string[] } | null>(null);
  const [isImportParsing, setIsImportParsing] = useState(false);
  const [isImportConfirming, setIsImportConfirming] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

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
    let runningSalesDelivery = 0;
    let runningVMeal = 0;
    let runningUpSize = 0;
    let runningAddCheese = 0;
    let runningPromoOther1 = 0;
    let runningPromoOther2 = 0;
    
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
      const targetTc = parseFloat(dailyTcTargets[date] || editable.targetTc) || 0;
      const targetTa = parseFloat(editable.targetTa) || 0;
      const salesDelivery = parseFloat(editable.salesDelivery) || 0;
      const vMealCount = parseFloat(editable.vMealCount) || 0;
      const upSizeCount = parseFloat(editable.upSizeCount) || 0;
      const addCheeseCount = parseFloat(editable.addCheeseCount) || 0;
      const promotionOther1Qty = parseFloat(editable.promotionOther1Qty) || 0;
      const promotionOther2Qty = parseFloat(editable.promotionOther2Qty) || 0;
      
      runningActualSales += actualSales;
      runningActualTc += actualTc;
      runningRoster += rosterCommit;
      runningWaste += wasteDaily;
      runningTargetSales += targetSales;
      const targetSalesMtd = runningTargetSales;
      runningLastYearSales += lastYearSales;
      runningForecast += forecastSales;
      runningLastYearTc += lastYearTc;
      runningTargetTc += targetTc;
      runningSalesDelivery += salesDelivery;
      runningVMeal += vMealCount;
      runningUpSize += upSizeCount;
      runningAddCheese += addCheeseCount;
      runningPromoOther1 += promotionOther1Qty;
      runningPromoOther2 += promotionOther2Qty;

      const summaryHours = DUTY_TEAM_HOURS + actualHours + otHours;
      runningWorkHours += summaryHours;
      const varianceHours = summaryHours - rosterCommit;

      const closeShiftCount = parseFloat(editable.closeShiftCount) || 0;
      const dutyCost = DUTY_TEAM_HOURS * HOURLY_RATE;
      const ptCost = (actualHours + otHours) * HOURLY_RATE;
      const closeShiftCost = closeShiftDailyCost * closeShiftCount;
      const colDaily = dutyCost + ptCost + fixedCostDaily + closeShiftCost;
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
      const varianceFromTargetDaily = actualSales - targetSales;
      const varianceFromTargetMtd = runningActualSales - runningTargetSales;
      const varianceFromForecast = actualSales - forecastSales;
      const varianceTcFromTarget = actualTc - targetTc;
      const varianceTcFromLy = actualTc - lastYearTc;

      const vMealPct = actualTc > 0 ? (vMealCount / actualTc) * 100 : 0;
      const upSizePct = actualTc > 0 ? (upSizeCount / actualTc) * 100 : 0;
      const addCheesePct = actualTc > 0 ? (addCheeseCount / actualTc) * 100 : 0;
      const promoOther1Pct = actualTc > 0 ? (promotionOther1Qty / actualTc) * 100 : 0;
      const promoOther2Pct = actualTc > 0 ? (promotionOther2Qty / actualTc) * 100 : 0;
      
      return {
        date,
        day,
        displayDate,
        targetSales,
        targetSalesMtd,
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
        closeShiftCount,
        dutyCost,
        ptCost,
        closeShiftCost,
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
        varianceFromTargetDaily,
        varianceFromTargetMtd,
        varianceFromForecast,
        varianceTcFromTarget,
        varianceTcFromLy,
        salesDelivery,
        salesDeliveryMtd: runningSalesDelivery,
        vMealCount,
        vMealMtd: runningVMeal,
        vMealPct,
        upSizeCount,
        upSizeMtd: runningUpSize,
        upSizePct,
        addCheeseCount,
        addCheeseMtd: runningAddCheese,
        addCheesePct,
        promotionOther1Qty,
        promoOther1Mtd: runningPromoOther1,
        promoOther1Pct,
        promotionOther2Qty,
        promoOther2Mtd: runningPromoOther2,
        promoOther2Pct,
      };
    });
  }, [monthDates, dailyTargets, dailyTcTargets, editableSalesData, DUTY_TEAM_HOURS, HOURLY_RATE, fixedCostDaily, closeShiftDailyCost]);

  const totals = useMemo(() => {
    const lastRow = tableData[tableData.length - 1];
    if (!lastRow) return null;
    return {
      targetSales: tableData.reduce((sum, row) => sum + row.targetSales, 0),
      targetSalesMtd: lastRow.targetSalesMtd,
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
      dutyCost: tableData.reduce((sum, row) => sum + row.dutyCost, 0),
      ptCost: tableData.reduce((sum, row) => sum + row.ptCost, 0),
      closeShiftCount: tableData.reduce((sum, row) => sum + row.closeShiftCount, 0),
      closeShiftCost: tableData.reduce((sum, row) => sum + row.closeShiftCost, 0),
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
      salesDelivery: tableData.reduce((sum, row) => sum + row.salesDelivery, 0),
      salesDeliveryMtd: lastRow.salesDeliveryMtd,
      vMealCount: tableData.reduce((sum, row) => sum + row.vMealCount, 0),
      vMealMtd: lastRow.vMealMtd,
      upSizeCount: tableData.reduce((sum, row) => sum + row.upSizeCount, 0),
      upSizeMtd: lastRow.upSizeMtd,
      addCheeseCount: tableData.reduce((sum, row) => sum + row.addCheeseCount, 0),
      addCheeseMtd: lastRow.addCheeseMtd,
      promotionOther1Qty: tableData.reduce((sum, row) => sum + row.promotionOther1Qty, 0),
      promoOther1Mtd: lastRow.promoOther1Mtd,
      promotionOther2Qty: tableData.reduce((sum, row) => sum + row.promotionOther2Qty, 0),
      promoOther2Mtd: lastRow.promoOther2Mtd,
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
          setStoreName(storeData.settings.storeName || "Grand Diamond");
          setStoreCode(storeData.settings.storeCode || "GD1040");
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
    if (user?.role !== "admin" && user?.role !== "manager") return;
    const bkToken = localStorage.getItem("bk_token");
    fetch("/api/settings/get-proactive-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: bkToken })
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setProactiveMorningReport(d.morningReport);
          setProactiveWeeklyReminder(d.weeklyReminder);
          setProactiveBorrowOverdue(d.borrowOverdue);
          setProactiveManagerDigest(d.managerDigest);
          setProactiveClosingAlert(d.closingAlert);
        }
      })
      .catch(() => {});
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
          setDetectedGroupId(d.lastGroupId || "");
          setDetectedGroupTs(d.lastGroupTs || "");
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
        if (data.ok && data.targets && data.targets.length > 0) {
          const targetMap: Record<string, string> = {};
          const tcTargetMap: Record<string, string> = {};
          data.targets.forEach((t: DailyTarget) => {
            targetMap[t.targetDate] = t.targetSales;
            if (t.targetTc !== undefined && t.targetTc !== null) tcTargetMap[t.targetDate] = t.targetTc;
          });
          const newTargets: Record<string, string> = {};
          const newTcTargets: Record<string, string> = {};
          monthDates.forEach(({ date }) => {
            newTargets[date] = targetMap[date] !== undefined ? targetMap[date] : defaultTarget;
            newTcTargets[date] = tcTargetMap[date] !== undefined ? tcTargetMap[date] : "300";
          });
          setDailyTargets(newTargets);
          setOriginalDailyTargets(JSON.parse(JSON.stringify(newTargets)));
          setDailyTcTargets(newTcTargets);
          return true;
        } else {
          const newTargets: Record<string, string> = {};
          const newTcTargets: Record<string, string> = {};
          monthDates.forEach(({ date }) => {
            newTargets[date] = defaultTarget;
            newTcTargets[date] = "300";
          });
          setDailyTargets(newTargets);
          setOriginalDailyTargets(JSON.parse(JSON.stringify(newTargets)));
          setDailyTcTargets(newTcTargets);
          return false;
        }
      } catch (error) {
        console.error("Failed to load daily targets:", error);
        // Clear stale target data so prior-month values don't persist on failure.
        const emptyTargets: Record<string, string> = {};
        const emptyTcTargets: Record<string, string> = {};
        monthDates.forEach(({ date }) => {
          emptyTargets[date] = defaultTarget;
          emptyTcTargets[date] = "300";
        });
        setDailyTargets(emptyTargets);
        setOriginalDailyTargets(JSON.parse(JSON.stringify(emptyTargets)));
        setDailyTcTargets(emptyTcTargets);
        return false;
      }
    };
    
    const loadDailySales = async (): Promise<boolean> => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getMonthlyReports", { 
          token, 
          year: selectedYear, 
          month: selectedMonth 
        });
        const data = await res.json();
        const emptyRow = { actualSales: "", actualTc: "", recommendHours: "", rosterCommit: "", actualHours: "", otHours: "", wasteDaily: "", lastYearSales: "", forecastSales: "", lastYearTc: "", targetTc: "", targetTa: "", closeShiftCount: "0", salesDelivery: "", vMealCount: "", upSizeCount: "", addCheeseCount: "", promotionOther1Qty: "", promotionOther2Qty: "" };
        if (data.ok && data.reports && data.reports.length > 0) {
          const editableMap: Record<string, any> = {};
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
              closeShiftCount: (parseInt(report.closeShiftCount) || 0).toString(),
              salesDelivery: (() => {
                const channelSum =
                  (parseFloat(report.grabfood) || 0) +
                  (parseFloat(report.lineman) || 0) +
                  (parseFloat(report.shopee) || 0) +
                  (parseFloat(report.bkapp) || 0) +
                  (parseFloat(report.robin) || 0) +
                  (parseFloat(report.gokoo) || 0);
                return (channelSum > 0 ? channelSum : (parseFloat(report.salesDelivery) || 0)).toString();
              })(),
              vMealCount: (parseFloat(report.vMealCount) || 0).toString(),
              upSizeCount: (parseFloat(report.upSizeCount) || 0).toString(),
              addCheeseCount: (parseFloat(report.addCheeseCount) || 0).toString(),
              promotionOther1Qty: (parseFloat(report.promotionOther1Qty) || 0).toString(),
              promotionOther2Qty: (parseFloat(report.promotionOther2Qty) || 0).toString(),
            };
          });
          const newMap: Record<string, any> = {};
          monthDates.forEach(({ date }) => {
            newMap[date] = editableMap[date] ? editableMap[date] : { ...emptyRow };
          });
          setEditableSalesData(newMap);
          setOriginalSalesData(JSON.parse(JSON.stringify(newMap)));
          return true;
        } else {
          const newMap: Record<string, any> = {};
          monthDates.forEach(({ date }) => {
            newMap[date] = { ...emptyRow };
          });
          setEditableSalesData(newMap);
          setOriginalSalesData(JSON.parse(JSON.stringify(newMap)));
          return false;
        }
      } catch (error) {
        console.error("Failed to load daily sales:", error);
        // Clear stale sales data so prior-month values don't persist on failure.
        const safeEmptyRow = { actualSales: "", actualTc: "", recommendHours: "", rosterCommit: "", actualHours: "", otHours: "", wasteDaily: "", lastYearSales: "", forecastSales: "", lastYearTc: "", targetTc: "", targetTa: "", closeShiftCount: "0", salesDelivery: "", vMealCount: "", upSizeCount: "", addCheeseCount: "", promotionOther1Qty: "", promotionOther2Qty: "" };
        const fallbackMap: Record<string, any> = {};
        monthDates.forEach(({ date }) => { fallbackMap[date] = { ...safeEmptyRow }; });
        setEditableSalesData(fallbackMap);
        setOriginalSalesData(JSON.parse(JSON.stringify(fallbackMap)));
        return false;
      }
    };
    
    if (!isLoading) {
      setIsTableEditMode(false);
      setHasDbData(false);
      setIsLoadingTable(true);
      // Run both loads in parallel; decide lock state once both have resolved.
      // A month is considered "has DB data" if either targets OR sales reports exist.
      // Only open edit mode when NEITHER source has saved data.
      Promise.all([loadDailyTargets(), loadDailySales()]).then(([hasTargets, hasSales]) => {
        const anyData = hasTargets || hasSales;
        setHasDbData(anyData);
        if (!anyData) setIsTableEditMode(true);
      }).finally(() => {
        setIsLoadingTable(false);
      });
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
        const msg = typeof data?.message === "string" ? data.message : JSON.stringify(data?.message ?? data ?? "Unknown error");
        toast({ variant: "destructive", title: t.errorSave, description: msg });
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
        const msg = typeof data?.message === "string" ? data.message : JSON.stringify(data?.message ?? data ?? "Unknown error");
        toast({ variant: "destructive", title: t.errorSave, description: msg });
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
        setHasDbData(true);
        setIsTableEditMode(false);
      } else {
        const msg = typeof data?.message === "string" ? data.message : JSON.stringify(data?.message ?? data ?? "Unknown error");
        toast({ variant: "destructive", title: t.errorSave, description: msg });
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
          salesDelivery: parseFloat(editable.salesDelivery) || 0,
          vMealCount: parseFloat(editable.vMealCount) || 0,
          upSizeCount: parseFloat(editable.upSizeCount) || 0,
          addCheeseCount: parseFloat(editable.addCheeseCount) || 0,
          promotionOther1Qty: parseFloat(editable.promotionOther1Qty) || 0,
          promotionOther2Qty: parseFloat(editable.promotionOther2Qty) || 0,
        };
      }).filter(d => d.actualSales > 0 || d.transactionCount > 0 || d.actualHours > 0 || d.wasteDaily > 0 || d.lastYearSales > 0 || d.forecastSales > 0 || d.lastYearTc > 0 || d.targetTc > 0 || d.targetTa > 0 || d.rosterCommit > 0 || d.recommendHours > 0 || d.salesDelivery > 0 || d.vMealCount > 0 || d.upSizeCount > 0 || d.addCheeseCount > 0 || d.promotionOther1Qty > 0 || d.promotionOther2Qty > 0);
      
      const res = await apiRequest("POST", "/api/sales/saveDailySalesData", {
        token,
        year: selectedYear,
        month: selectedMonth,
        salesData,
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved, description: language === "th" ? "บันทึกข้อมูลยอดขายรายวันเรียบร้อย" : "Daily sales data saved" });
        setHasDbData(true);
        setIsTableEditMode(false);
      } else {
        const msg = typeof data?.message === "string" ? data.message : JSON.stringify(data?.message ?? data ?? "Unknown error");
        toast({ variant: "destructive", title: t.errorSave, description: msg });
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

  const handleSaveProactiveConfig = async () => {
    setIsSavingProactive(true);
    const bkToken = localStorage.getItem("bk_token");
    try {
      const res = await fetch("/api/settings/save-proactive-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: bkToken,
          morningReport: proactiveMorningReport,
          weeklyReminder: proactiveWeeklyReminder,
          borrowOverdue: proactiveBorrowOverdue,
          managerDigest: proactiveManagerDigest,
          closingAlert: proactiveClosingAlert,
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "บันทึกสำเร็จ", description: "ตั้งค่าการแจ้งเตือนอัตโนมัติเรียบร้อยแล้ว" });
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกได้", variant: "destructive" });
    } finally {
      setIsSavingProactive(false);
    }
  };

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
    try {
      const res = await fetch("/api/line/send-daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bkToken, date: lineReportDate })
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

  const handleRefreshGroupId = async () => {
    setIsRefreshingGroup(true);
    const bkToken = localStorage.getItem("bk_token");
    try {
      const res = await fetch("/api/settings/get-line-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: bkToken })
      });
      const data = await res.json();
      if (data.ok) {
        setDetectedGroupId(data.lastGroupId || "");
        setDetectedGroupTs(data.lastGroupTs || "");
      }
    } finally {
      setIsRefreshingGroup(false);
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


  const FIELD_LABEL: Record<string, string> = {
    actualSales: "Actual Sales",
    lastYearSales: "LY Sales",
    forecastSales: "Forecast",
    transactionCount: "TC",
    lastYearTc: "LY TC",
    targetTc: "Target TC",
    targetTa: "Target TA",
    actualHours: "Actual Hr",
    otHours: "OT Hr",
    rosterCommit: "Roster",
    recommendHours: "Rec Hr",
    wasteRawDaily: "Waste",
    targetSales: "Target Sales",
  };

  const handleOpenImportDialog = () => {
    setImportStep("upload");
    setImportParsed(null);
    setImportResult(null);
    setImportDialogOpen(true);
  };

  const handleImportFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      toast({ variant: "destructive", title: "ไฟล์ไม่ถูกต้อง", description: "กรุณาเลือกไฟล์ .xlsx เท่านั้น" });
      return;
    }
    setIsImportParsing(true);
    try {
      const token = localStorage.getItem("bk_token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token || "");
      const res = await fetch("/api/sales/importFromExcel", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) {
        toast({ variant: "destructive", title: "ไม่สามารถอ่านไฟล์ได้", description: data.message });
        return;
      }
      setImportParsed(data);
      setImportStep("preview");
    } catch (e: any) {
      toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: e?.message || "ไม่สามารถอัปโหลดไฟล์ได้" });
    } finally {
      setIsImportParsing(false);
    }
  }, [toast]);

  const handleImportConfirm = async () => {
    if (!importParsed) return;
    setIsImportConfirming(true);
    try {
      const token = localStorage.getItem("bk_token");
      const res = await fetch("/api/sales/confirmImportFromExcel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rows: importParsed.rows }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ variant: "destructive", title: "นำเข้าไม่สำเร็จ", description: data.message });
        return;
      }
      setImportResult(data);
      setImportStep("result");
    } catch (e: any) {
      toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: e?.message || "นำเข้าไม่สำเร็จ" });
    } finally {
      setIsImportConfirming(false);
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
        <AreaLockBanner />
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
              <Button onClick={handleSaveStore} disabled={isSaving || areaLocked} data-testid="button-save-store">
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
              <Button onClick={handleSaveParams} disabled={isSavingParams || areaLocked} data-testid="button-save-params">
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
            <fieldset disabled={!isTableEditMode || isLoadingTable} className="border-0 p-0 m-0 disabled:opacity-60">
            <div className="border rounded-md overflow-hidden relative">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <span className="animate-pulse">←</span>
                {language === "th" ? "เลื่อนซ้าย-ขวาเพื่อดูข้อมูลทั้งหมด" : "Scroll left-right to see all data"}
                <span className="animate-pulse">→</span>
              </div>
              <div className="overflow-x-auto scrollbar-visible pb-3" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
                <div>
                  <table className="w-full text-xs border-collapse min-w-[4400px]">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="text-center font-bold">
                        <th className="p-2 border border-slate-300 min-w-[80px] sticky left-0 z-30 bg-slate-200 dark:bg-slate-700" rowSpan={2}>{t.date}</th>
                        <th className="p-2 border border-slate-300 bg-green-200 dark:bg-green-800" colSpan={16}>Sales</th>
                        <th className="p-2 border border-slate-300 bg-sky-200 dark:bg-sky-800" colSpan={9}>TC</th>
                        <th className="p-2 border border-slate-300 bg-purple-200 dark:bg-purple-800" colSpan={4}>TA</th>
                        <th className="p-2 border border-slate-300 bg-orange-200 dark:bg-orange-800" colSpan={18}>Labor</th>
                        <th className="p-2 border border-slate-300 bg-pink-200 dark:bg-pink-800" colSpan={15}>Promotion</th>
                      </tr>
                      <tr className="bg-slate-100 dark:bg-slate-700 text-center">
                        {/* Sales columns (15) */}
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-orange-50 dark:bg-orange-950">LY Sales Daily</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-orange-50 dark:bg-orange-950">LY Sales MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-yellow-50 dark:bg-yellow-950">Target (Incentive)</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-yellow-50 dark:bg-yellow-950">Target MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-orange-50 dark:bg-orange-950">Forecast</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-green-50 dark:bg-green-950">Actual Daily</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-green-50 dark:bg-green-950">Actual MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Variance Target</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Variance MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-blue-50 dark:bg-blue-950">Delivery Daily</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Delivery MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Achieve %</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Var Forecast</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Comp Sales %</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-red-50 dark:bg-red-950">Waste (฿)</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">Waste %</th>
                        {/* TC columns (9) */}
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-orange-50 dark:bg-orange-950">LY TC Daily</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-orange-50 dark:bg-orange-950">LY TC MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-yellow-50 dark:bg-yellow-950">Target TC</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-yellow-50 dark:bg-yellow-950">Target TC MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-green-50 dark:bg-green-950">Actual TC</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-green-50 dark:bg-green-950">Actual TC MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Var Target</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Var LY</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Comp TC %</th>
                        {/* TA columns (4) */}
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-orange-50 dark:bg-orange-950">LY TA</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-yellow-50 dark:bg-yellow-950">Target TA</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-green-50 dark:bg-green-950">Actual TA</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">Var Target vs Actual</th>
                        {/* Labor columns (18) */}
                        <th className="p-1 border border-slate-300 min-w-[70px] bg-blue-50 dark:bg-blue-950">Rec Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[70px] bg-blue-50 dark:bg-blue-950">Roster</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">MTD Roster</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-gray-200 dark:bg-gray-600 text-gray-500">Duty</th>
                        <th className="p-1 border border-slate-300 min-w-[70px] bg-blue-50 dark:bg-blue-950">Actual Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-blue-50 dark:bg-blue-950">OT Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[70px] font-bold">Sum Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[70px]">MTD Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">Var Hr</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-indigo-50 dark:bg-indigo-950">Duty Cost</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-indigo-50 dark:bg-indigo-950">PT+OT Cost</th>
                        <th className="p-1 border border-slate-300 min-w-[70px] bg-indigo-50 dark:bg-indigo-950">Fixed</th>
                        <th className="p-1 border border-slate-300 min-w-[60px] bg-indigo-50 dark:bg-indigo-950">คนปิด</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-indigo-50 dark:bg-indigo-950">ค่าปิดร้าน</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">COL (฿)</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">MTD COL</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">COL %</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">TCMH</th>
                        {/* Promotion columns (15) */}
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-pink-50 dark:bg-pink-950">VM Set</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">VM MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">VM %TC</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-pink-50 dark:bg-pink-950">UP Size</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">UP MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">UP %TC</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-pink-50 dark:bg-pink-950">Add Cheese</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Ch MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">Ch %TC</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-pink-50 dark:bg-pink-950">Other 1</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Oth1 MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">Oth1 %TC</th>
                        <th className="p-1 border border-slate-300 min-w-[65px] bg-pink-50 dark:bg-pink-950">Other 2</th>
                        <th className="p-1 border border-slate-300 min-w-[65px]">Oth2 MTD</th>
                        <th className="p-1 border border-slate-300 min-w-[60px]">Oth2 %TC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30 text-center">
                          <td className="p-1 border border-slate-300 font-medium bg-slate-50 dark:bg-slate-800 sticky left-0 z-10">{row.displayDate}</td>
                          {/* Sales section */}
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.lastYearSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'lastYearSales', e.target.value)} data-testid={`input-ly-sales-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.lastYearSalesMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={dailyTargets[row.date] || ""} onChange={(e) => handleTargetChange(row.date, e.target.value)} data-testid={`input-target-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.targetSalesMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.forecastSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'forecastSales', e.target.value)} data-testid={`input-forecast-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={editableSalesData[row.date]?.actualSales || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualSales', e.target.value)} data-testid={`input-sales-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.actualSalesMtd)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceFromTargetDaily >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtNum(row.varianceFromTargetDaily)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceFromTargetMtd >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtNum(row.varianceFromTargetMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.salesDelivery || ""} onChange={(e) => handleSalesDataChange(row.date, 'salesDelivery', e.target.value)} data-testid={`input-delivery-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.salesDeliveryMtd)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.achievePercent >= 100 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.achievePercent)}%</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceFromForecast >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtNum(row.varianceFromForecast)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.compSalesPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.compSalesPercent)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-red-700 dark:text-red-300" value={editableSalesData[row.date]?.wasteDaily || ""} onChange={(e) => handleSalesDataChange(row.date, 'wasteDaily', e.target.value)} data-testid={`input-waste-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.wastePercent)}%</td>
                          {/* TC section */}
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.lastYearTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'lastYearTc', e.target.value)} data-testid={`input-ly-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.lastYearTcMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.targetTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'targetTc', e.target.value)} data-testid={`input-target-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.targetTcMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent" value={editableSalesData[row.date]?.actualTc || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualTc', e.target.value)} data-testid={`input-tc-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.actualTcMtd)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceTcFromTarget >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtNum(row.varianceTcFromTarget)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceTcFromLy >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtNum(row.varianceTcFromLy)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.compTcPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.compTcPercent)}%</td>
                          {/* TA section */}
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.lastYearTa)}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-orange-700 dark:text-orange-300" value={editableSalesData[row.date]?.targetTa || ""} onChange={(e) => handleSalesDataChange(row.date, 'targetTa', e.target.value)} data-testid={`input-target-ta-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.actualTa)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceTa >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtDec(row.varianceTa)}</td>
                          {/* Labor section */}
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.recommendHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'recommendHours', e.target.value)} data-testid={`input-rec-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.rosterCommit || ""} onChange={(e) => handleSalesDataChange(row.date, 'rosterCommit', e.target.value)} data-testid={`input-roster-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.mtdRoster)}</td>
                          <td className="p-1 border border-slate-300 bg-gray-100 dark:bg-gray-700 text-center text-gray-500">{row.dutyTeam}</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.actualHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'actualHours', e.target.value)} data-testid={`input-actual-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-blue-700 dark:text-blue-300" value={editableSalesData[row.date]?.otHours || ""} onChange={(e) => handleSalesDataChange(row.date, 'otHours', e.target.value)} data-testid={`input-ot-hours-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-100 dark:bg-slate-700 font-bold text-right pr-2 text-indigo-700 dark:text-indigo-300">{fmtDec(row.summaryHours)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.mtdWorkingHours)}</td>
                          <td className={`p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2 ${row.varianceHours < 0 ? 'text-red-500' : 'text-green-600'}`}>{fmtDec(row.varianceHours)}</td>
                          <td className="p-1 border border-slate-300 bg-indigo-50 dark:bg-indigo-950/30 text-right pr-2">{fmtNum(row.dutyCost)}</td>
                          <td className="p-1 border border-slate-300 bg-indigo-50 dark:bg-indigo-950/30 text-right pr-2">{fmtNum(row.ptCost)}</td>
                          <td className="p-1 border border-slate-300 bg-indigo-50 dark:bg-indigo-950/30 text-right pr-2">{fmtNum(fixedCostDaily)}</td>
                          <td className="p-1 border border-slate-300 bg-indigo-50 dark:bg-indigo-950/30 text-center">{row.closeShiftCount > 0 ? row.closeShiftCount : ""}</td>
                          <td className="p-1 border border-slate-300 bg-indigo-50 dark:bg-indigo-950/30 text-right pr-2">{row.closeShiftCost > 0 ? fmtNum(row.closeShiftCost) : ""}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.colDaily)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.mtdCol)}</td>
                          <td className={`p-1 border border-slate-300 text-right pr-2 font-medium ${row.colPercent <= 12 ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" : row.colPercent <= 14 ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300" : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"}`}>{fmtDec(row.colPercent)}%</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.tcmh)}</td>
                          {/* Promotion section */}
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-pink-700 dark:text-pink-300" value={editableSalesData[row.date]?.vMealCount || ""} onChange={(e) => handleSalesDataChange(row.date, 'vMealCount', e.target.value)} data-testid={`input-vmeal-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.vMealMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.vMealPct)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-pink-700 dark:text-pink-300" value={editableSalesData[row.date]?.upSizeCount || ""} onChange={(e) => handleSalesDataChange(row.date, 'upSizeCount', e.target.value)} data-testid={`input-upsize-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.upSizeMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.upSizePct)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-pink-700 dark:text-pink-300" value={editableSalesData[row.date]?.addCheeseCount || ""} onChange={(e) => handleSalesDataChange(row.date, 'addCheeseCount', e.target.value)} data-testid={`input-addcheese-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.addCheeseMtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.addCheesePct)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-pink-700 dark:text-pink-300" value={editableSalesData[row.date]?.promotionOther1Qty || ""} onChange={(e) => handleSalesDataChange(row.date, 'promotionOther1Qty', e.target.value)} data-testid={`input-promo-other1-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.promoOther1Mtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.promoOther1Pct)}%</td>
                          <td className="p-1 border border-slate-300 bg-white dark:bg-slate-900">
                            <Input className="w-full h-6 text-right px-1 text-xs border-0 focus:ring-1 bg-transparent text-pink-700 dark:text-pink-300" value={editableSalesData[row.date]?.promotionOther2Qty || ""} onChange={(e) => handleSalesDataChange(row.date, 'promotionOther2Qty', e.target.value)} data-testid={`input-promo-other2-${row.date}`} />
                          </td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtNum(row.promoOther2Mtd)}</td>
                          <td className="p-1 border border-slate-300 bg-slate-50 dark:bg-slate-800 text-right pr-2">{fmtDec(row.promoOther2Pct)}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-20 font-bold bg-slate-200 dark:bg-slate-700">
                      <tr>
                        <td className="p-2 border border-slate-300 sticky left-0 bg-slate-200 dark:bg-slate-700">Total</td>
                        {/* Sales totals */}
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearSalesMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetSalesMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.forecastSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualSales)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualSalesMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.salesDelivery)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.salesDeliveryMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.wasteDaily)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        {/* TC totals */}
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.lastYearTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.targetTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualTc)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.actualTcMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        {/* TA totals */}
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        {/* Labor totals */}
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.recommendHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.rosterCommit)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.mtdRoster)}</td>
                        <td className="p-2 border border-slate-300 bg-gray-300 dark:bg-gray-600 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.actualHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.otHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.summaryHours)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtDec(totals.mtdWorkingHours)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 bg-indigo-100 dark:bg-indigo-900 text-right">{totals && fmtNum(totals.dutyCost)}</td>
                        <td className="p-2 border border-slate-300 bg-indigo-100 dark:bg-indigo-900 text-right">{totals && fmtNum(totals.ptCost)}</td>
                        <td className="p-2 border border-slate-300 bg-indigo-100 dark:bg-indigo-900 text-right">{fmtNum(fixedCostDaily * tableData.length)}</td>
                        <td className="p-2 border border-slate-300 bg-indigo-100 dark:bg-indigo-900 text-center">{totals && totals.closeShiftCount > 0 ? totals.closeShiftCount : "-"}</td>
                        <td className="p-2 border border-slate-300 bg-indigo-100 dark:bg-indigo-900 text-right">{totals && totals.closeShiftCost > 0 ? fmtNum(totals.closeShiftCost) : "-"}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.colDaily)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        {/* Promotion totals */}
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.vMealCount)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.vMealMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.upSizeCount)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.upSizeMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.addCheeseCount)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.addCheeseMtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.promotionOther1Qty)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.promoOther1Mtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.promotionOther2Qty)}</td>
                        <td className="p-2 border border-slate-300 text-right">{totals && fmtNum(totals.promoOther2Mtd)}</td>
                        <td className="p-2 border border-slate-300 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            </fieldset>
            
            <div className="pt-4 flex flex-wrap items-center justify-end gap-2">
              {!isLoadingTable && hasDbData && !isTableEditMode && (
                <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-700">
                  <CheckCircle className="w-3 h-3" />
                  {language === "th" ? "บันทึกแล้ว" : "Saved"}
                </Badge>
              )}
              {!isLoadingTable && hasDbData && !isTableEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setIsTableEditMode(true)}
                  data-testid="button-edit-table"
                >
                  <Pencil className="w-3 h-3" />
                  {language === "th" ? "แก้ไข" : "Edit"}
                </Button>
              )}
              <Button variant="outline" onClick={handleExportExcel} className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-700 dark:text-green-300" data-testid="button-export-excel">
                <FileSpreadsheet className="mr-2 w-4 h-4"/>
                {t.exportExcel}
              </Button>
              <Button variant="outline" onClick={handleOpenImportDialog} disabled={areaLocked} className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300" data-testid="button-import-excel">
                <Upload className="mr-2 w-4 h-4"/>
                {language === "th" ? "นำเข้าจาก Excel" : "Import from Excel"}
              </Button>
              <Button variant="outline" onClick={handleApplyDefaultToAll} data-testid="button-apply-all">
                {t.applyAll}
              </Button>
              {!isLoadingTable && isTableEditMode && (
                <Button variant="outline" onClick={handleSaveTargets} disabled={isSavingTargets || areaLocked} data-testid="button-save-targets">
                  {isSavingTargets ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                  {language === "th" ? "บันทึกเป้า" : "Save Targets"}
                </Button>
              )}
              {!isLoadingTable && isTableEditMode && (
                <Button onClick={handleSaveSalesData} disabled={isSavingSales || areaLocked} data-testid="button-save-data">
                  {isSavingSales ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                  {language === "th" ? "บันทึกข้อมูล" : "Save Data"}
                </Button>
              )}
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
                      toast({ title: "คัดลอก URL สำเร็จ", description: "นำไปวางในช่อง OData Feed URL ของ Excel ได้เลย" });
                    }}
                    data-testid="button-copy-odata-url"
                  >
                    <Copy className="w-4 h-4 mr-2 text-slate-500" />
                    คัดลอก
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  * เปลี่ยนเลข <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">month=</code> และ <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">year=</code> ใน URL เพื่อดึงข้อมูลเดือนอื่นๆ
                </p>
              </div>

              <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    ดาวน์โหลด Excel ไฟล์สำเร็จรูป
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    ได้รับไฟล์ .xlsx พร้อม header, สีสัน และคำนวณครบ — เปิดใช้งานได้ทันที
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (!exportKey) return;
                    const url = `${window.location.origin}/api/export/excel/monthly?key=${exportKey}&month=${selectedMonth}&year=${selectedYear}`;
                    window.open(url, "_blank");
                  }}
                  disabled={!exportKey}
                  data-testid="button-download-excel"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  ดาวน์โหลด Excel
                </Button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">วิธีเชื่อมต่อ Live Feed ใน Excel (Power Query)</p>
                <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-none">
                  <li className="flex gap-2"><span className="font-bold shrink-0">1.</span><span>เปิด Excel → แท็บ <b>Data</b> → <b>Get Data</b> → <b>From Other Sources</b> → <b>From OData Feed</b></span></li>
                  <li className="flex gap-2"><span className="font-bold shrink-0">2.</span><span>วาง URL ด้านบนในช่อง URL แล้วกด OK</span></li>
                  <li className="flex gap-2"><span className="font-bold shrink-0">3.</span><span>เมื่อ Excel ถามการยืนยันตัวตน ให้เลือก <b>Anonymous</b> (ไม่ต้องใส่รหัส) แล้วกด Connect</span></li>
                  <li className="flex gap-2"><span className="font-bold shrink-0">4.</span><span>เลือกตาราง <b>DailySales</b> แล้วกด <b>Load</b> หรือ <b>Transform Data</b></span></li>
                </ol>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 border-t border-amber-200 dark:border-amber-700 pt-2">
                  หมายเหตุ: ถ้า Excel ถามซ้ำว่า "Privacy Level" ให้เลือก <b>Public</b> แล้วกด Save
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

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Group ID ที่ตรวจพบจาก Webhook</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshGroupId}
                        disabled={isRefreshingGroup}
                        className="h-7 px-2 text-xs"
                        data-testid="button-refresh-group-id"
                      >
                        {isRefreshingGroup ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span className="ml-1">รีเฟรช</span>
                      </Button>
                    </div>
                    {detectedGroupId ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono" data-testid="text-detected-group-id">{detectedGroupId}</code>
                        {detectedGroupTs && (
                          <span className="text-[11px] text-slate-400">จับได้เมื่อ {new Date(detectedGroupTs).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-green-400 text-green-700 hover:bg-green-50"
                          onClick={() => { setLineTargetId(detectedGroupId); }}
                          data-testid="button-use-group-id"
                        >
                          ใช้ ID นี้
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[12px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2">
                        <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">วิธีรับ Group ID อัตโนมัติ:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>ตั้ง Webhook URL ใน LINE Developers Console → <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-[11px]">{window.location.origin}/api/line/webhook</code></li>
                          <li>เพิ่ม Bot Chann เข้ากลุ่ม LINE</li>
                          <li>ส่งข้อความใดก็ได้ในกลุ่ม</li>
                          <li>กด "รีเฟรช" ด้านบน — Group ID จะปรากฏที่นี่</li>
                        </ol>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">Webhook URL: <span className="font-mono">{window.location.origin}/api/line/webhook</span></p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <p className="text-sm font-medium">ส่งรายงานประจำวัน</p>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-500 shrink-0">เลือกวันที่</Label>
                  <Input
                    type="date"
                    value={lineReportDate}
                    max={todayStr}
                    onChange={e => setLineReportDate(e.target.value)}
                    className="w-40 h-8 text-sm"
                    data-testid="input-line-report-date"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendDailyReport}
                    disabled={isSendingReport || !lineReportDate}
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
                <p className="text-[11px] text-slate-500">ส่งข้อมูลของวันที่เลือกเป็น text message ไปยัง LINE group ที่ตั้งค่าไว้</p>
              </div>

              {/* Proactive Notification Toggles */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium">การแจ้งเตือนอัตโนมัติจาก Chann</p>
                </div>
                <p className="text-[11px] text-slate-500">
                  เปิด/ปิดการแจ้งเตือนที่ Chann ส่งให้อัตโนมัติ — LINE group และ Dashboard
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">รายงานเช้า (08:00)</p>
                      <p className="text-[11px] text-slate-500">วิเคราะห์ยอดขาย + แจ้ง critical anomaly ไป LINE</p>
                    </div>
                    <Switch
                      checked={proactiveMorningReport}
                      onCheckedChange={setProactiveMorningReport}
                      data-testid="switch-proactive-morning-report"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">สรุปรายการรอดำเนินการ (08:05)</p>
                      <p className="text-[11px] text-slate-500">ส่งสรุป Swap / คำขอ / Borrow เกินกำหนด ไป LINE</p>
                    </div>
                    <Switch
                      checked={proactiveManagerDigest}
                      onCheckedChange={setProactiveManagerDigest}
                      data-testid="switch-proactive-manager-digest"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">แจ้งเตือน Borrow เกินกำหนด (09:00)</p>
                      <p className="text-[11px] text-slate-500">ส่งรายการยืมที่เลยกำหนดคืนไป LINE ทุกวัน</p>
                    </div>
                    <Switch
                      checked={proactiveBorrowOverdue}
                      onCheckedChange={setProactiveBorrowOverdue}
                      data-testid="switch-proactive-borrow-overdue"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">แจ้งเตือน Weekly Report (ทุกอังคาร 19:00)</p>
                      <p className="text-[11px] text-slate-500">เตือนถ้ายังไม่ได้ส่ง Weekly Report สัปดาห์ที่ผ่านมา</p>
                    </div>
                    <Switch
                      checked={proactiveWeeklyReminder}
                      onCheckedChange={setProactiveWeeklyReminder}
                      data-testid="switch-proactive-weekly-reminder"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">แจ้งเตือนก่อนปิดร้าน (22:45)</p>
                      <p className="text-[11px] text-slate-500">เตือนผ่าน Dashboard ให้ตรวจสอบงานก่อนปิด</p>
                    </div>
                    <Switch
                      checked={proactiveClosingAlert}
                      onCheckedChange={setProactiveClosingAlert}
                      data-testid="switch-proactive-closing-alert"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleSaveProactiveConfig}
                    disabled={isSavingProactive}
                    data-testid="button-save-proactive-config"
                  >
                    {isSavingProactive ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    บันทึกการตั้งค่า
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Excel Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) setImportDialogOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" data-testid="dialog-import-excel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              {language === "th" ? "นำเข้าข้อมูลจาก Excel" : "Import Data from Excel"}
            </DialogTitle>
          </DialogHeader>

          {/* Step: Upload */}
          {importStep === "upload" && (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <div
                className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${importDragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"}`}
                data-testid="dropzone-import"
                onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                onDragLeave={() => setImportDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleImportFile(file);
                }}
                onClick={() => importFileRef.current?.click()}
              >
                {isImportParsing ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-12 h-12 text-slate-400" />
                )}
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {isImportParsing
                    ? (language === "th" ? "กำลังอ่านไฟล์..." : "Reading file...")
                    : (language === "th" ? "วางไฟล์ .xlsx ที่นี่ หรือคลิกเพื่อเลือก" : "Drop .xlsx file here or click to browse")}
                </p>
                <p className="text-xs text-slate-400">{language === "th" ? "รองรับเฉพาะไฟล์ .xlsx" : "Only .xlsx files supported"}</p>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                data-testid="input-import-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
              <div className="text-xs text-slate-400 text-center space-y-0.5">
                <p>{language === "th" ? "หัวคอลัมน์ที่รองรับ:" : "Supported column headers:"}</p>
                <p className="font-mono text-slate-500">Date, Target, Actual Sales, LY Sales, Forecast, TC, LY TC, Target TC, Target TA, Actual Hr, OT Hr, Roster, Waste, Delivery, VM Set, Up Size, Add Cheese, Other 1, Other 2</p>
                <p className="text-slate-400">{language === "th" ? "รองรับหัวคอลัมน์ในแถวที่ 1–5 (สำหรับไฟล์ที่มี Group Header)" : "Header row auto-detected in rows 1–5 (supports group headers)"}</p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {importStep === "preview" && importParsed && (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Mapping Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">{language === "th" ? "การ Map คอลัมน์:" : "Column Mapping:"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {importParsed.mapping.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300" data-testid={`badge-mapping-${i}`}>
                      {m.header} → {FIELD_LABEL[m.field] || m.field}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {language === "th"
                    ? `พบ ${importParsed.totalRows} แถว${importParsed.skipped > 0 ? ` / ข้าม ${importParsed.skipped} แถว (ไม่มีวันที่)` : ""}`
                    : `Found ${importParsed.totalRows} rows${importParsed.skipped > 0 ? ` / ${importParsed.skipped} skipped (no date)` : ""}`}
                </p>
              </div>

              {/* Preview Table */}
              <div className="overflow-auto max-h-60 border rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 z-10">
                    <tr>
                      <th className="p-2 border border-slate-300 text-left">{language === "th" ? "วันที่" : "Date"}</th>
                      {importParsed.mapping.map((m, i) => (
                        <th key={i} className="p-2 border border-slate-300 text-right whitespace-nowrap">{FIELD_LABEL[m.field] || m.field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importParsed.preview.map((row, ri) => (
                      <tr key={ri} className="hover:bg-muted/30" data-testid={`row-preview-${ri}`}>
                        <td className="p-1.5 border border-slate-300 font-mono">{row.reportDate}</td>
                        {importParsed.mapping.map((m, ci) => (
                          <td key={ci} className="p-1.5 border border-slate-300 text-right">
                            {row[m.field] != null && row[m.field] !== "" ? row[m.field] : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importParsed.totalRows > 10 && (
                <p className="text-xs text-slate-400 text-center">
                  {language === "th" ? `แสดง 10 จาก ${importParsed.totalRows} แถว` : `Showing 10 of ${importParsed.totalRows} rows`}
                </p>
              )}
            </div>
          )}

          {/* Step: Result */}
          {importStep === "result" && importResult && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="text-lg font-semibold text-center">
                {language === "th" ? "นำเข้าเสร็จสิ้น" : "Import Complete"}
              </p>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600" data-testid="text-import-success">{importResult.imported}</p>
                  <p className="text-xs text-slate-500">{language === "th" ? "แถวที่สำเร็จ" : "Imported"}</p>
                </div>
                {importResult.errors > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-red-500" data-testid="text-import-errors">{importResult.errors}</p>
                    <p className="text-xs text-slate-500">{language === "th" ? "มี error" : "Errors"}</p>
                  </div>
                )}
              </div>
              {importResult.errorDetails.length > 0 && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2 w-full max-h-24 overflow-auto">
                  {importResult.errorDetails.map((d, i) => <p key={i}>{d}</p>)}
                </div>
              )}
              <p className="text-xs text-slate-400">
                {language === "th" ? "ข้อมูลถูกบันทึกลง DB แล้ว กรุณา Refresh หน้าเพื่อดูข้อมูลที่นำเข้า" : "Data saved to DB. Refresh the page to see imported data."}
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            {importStep === "upload" && (
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} data-testid="button-import-cancel">
                {language === "th" ? "ยกเลิก" : "Cancel"}
              </Button>
            )}
            {importStep === "preview" && (
              <>
                <Button variant="outline" onClick={() => setImportStep("upload")} data-testid="button-import-back">
                  {language === "th" ? "ย้อนกลับ" : "Back"}
                </Button>
                <Button onClick={handleImportConfirm} disabled={isImportConfirming} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-import-confirm">
                  {isImportConfirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {language === "th" ? "ยืนยันนำเข้า" : "Confirm Import"}
                </Button>
              </>
            )}
            {importStep === "result" && (
              <Button onClick={() => setImportDialogOpen(false)} data-testid="button-import-done">
                {language === "th" ? "เสร็จสิ้น" : "Done"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SalesLayout>
  );
}
