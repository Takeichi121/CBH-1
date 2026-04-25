import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useSettings } from "@/hooks/use-settings";
import { SalesLayout } from "./sales-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Copy, Save, ChevronLeft, ChevronRight, FileText, Loader2, Check, ChevronsUpDown, X, RefreshCw, History, Send, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const BK_WASTE_CATEGORIES = [
  "BK-CR-Alcohol",
  "BK-CR-Bacon",
  "BK-CR-Bag",
  "BK-CR-BEEF",
  "BK-CR-Box(carton)",
  "BK-CR-BUN",
  "BK-CR-BUN EXPORT",
  "BK-CR-Carbonate",
  "BK-CR-CARBONATE-CAN",
  "BK-CR-CHEESY PATTIES",
  "BK-CR-CHEMICAL",
  "BK-CR-Chicken",
  "BK-CR-Cleaning",
  "BK-CR-Condiment",
  "BK-CR-Cup&Lid",
  "BK-CR-Dessert",
  "BK-CR-Fish",
  "BK-CR-Fried",
  "BK-CR-ICE CREAM",
  "BK-CR-INGREDIENT",
  "BK-CR-Napkin",
  "BK-CR-Non-Carbonate",
  "BK-CR-NON-CARBONATE - BOTTLE",
  "BK-CR-Paper",
  "BK-CR-PIE",
  "BK-CR-Plastic Utensil",
  "BK-CR-PORK",
  "BK-CR-Premium",
  "BK-CR-Shortening",
  "BK-CR-VEGETABLE",
  "BK-CR-VEGETABLE PATTY",
  "BK-CR-Wrap",
];

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 2 });
  const end = endOfWeek(date, { weekStartsOn: 2 });
  return { start, end };
}

interface WeeklyFormData {
  sale: string;
  tc: string;
  ta: string;
  cog: string;
  waste: string;
  unac: string;
  sos: string;
  gsi: string;
  osat: string;
  delivery: string;
  googleReview: string;
  colMtd: string;
  wasteTop3: string;
  unaccountedTop3: string;
}

const emptyForm: WeeklyFormData = {
  sale: "",
  tc: "",
  ta: "",
  cog: "",
  waste: "",
  unac: "",
  sos: "",
  gsi: "",
  osat: "",
  delivery: "",
  googleReview: "",
  colMtd: "",
  wasteTop3: "",
  unaccountedTop3: "",
};

interface ItemSelection {
  itemName: string;
  detail: string;
}

const emptySelections: ItemSelection[] = [
  { itemName: "", detail: "" },
  { itemName: "", detail: "" },
  { itemName: "", detail: "" },
];

function parseSelectionsFromText(text: string): ItemSelection[] {
  if (!text) return [...emptySelections.map(s => ({ ...s }))];
  const lines = text.split("\n").filter(l => l.trim());
  const result: ItemSelection[] = [];
  for (let i = 0; i < 3; i++) {
    if (i < lines.length) {
      const line = lines[i].replace(/^\d+\.\s*/, "");
      const dashIdx = line.indexOf(" - ");
      if (dashIdx >= 0) {
        result.push({ itemName: line.substring(0, dashIdx).trim(), detail: line.substring(dashIdx + 3).trim() });
      } else {
        result.push({ itemName: line.trim(), detail: "" });
      }
    } else {
      result.push({ itemName: "", detail: "" });
    }
  }
  return result;
}

function selectionsToText(selections: ItemSelection[]): string {
  const active = selections.filter(r => r.itemName);
  if (active.length === 0) return "";
  return active
    .map((row, i) => `${i + 1}. ${row.itemName}${row.detail ? ` - ${row.detail}` : ""}`)
    .join("\n");
}

function DeltaBadge({ current, prev, lowerIsBetter = false }: {
  current: string; prev: string; lowerIsBetter?: boolean;
}) {
  const parseVal = (v: string) => {
    const n = parseFloat(v.replace(/[,%]/g, "").trim());
    return isNaN(n) ? null : n;
  };
  const curr = parseVal(current);
  const prevVal = parseVal(prev);
  if (curr === null || prevVal === null || prevVal === 0) return null;
  const pct = ((curr - prevVal) / prevVal) * 100;
  if (Math.abs(pct) < 0.05) return null;
  const isPositive = pct > 0;
  const isGood = lowerIsBetter ? !isPositive : isPositive;
  const absPct = Math.abs(pct);
  const displayPct = absPct < 10 ? absPct.toFixed(1) : Math.round(absPct).toString();
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1 rounded-sm whitespace-nowrap",
        isGood
          ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
          : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
      )}
      data-testid="badge-delta"
    >
      {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{displayPct}%
    </span>
  );
}

export default function WeeklySalesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const token = localStorage.getItem("bk_token") || "";
  const { data: settings } = useSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState<WeeklyFormData>({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [wasteSelections, setWasteSelections] = useState<ItemSelection[]>([...emptySelections.map(s => ({ ...s }))]);
  const [unacSelections, setUnacSelections] = useState<ItemSelection[]>([...emptySelections.map(s => ({ ...s }))]);
  const [openCombobox, setOpenCombobox] = useState<{ type: 'waste' | 'unac'; index: number } | null>(null);
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  const [borrowItemNames, setBorrowItemNames] = useState<string[]>([]);
  const [sendingLine, setSendingLine] = useState(false);
  const [prevForm, setPrevForm] = useState<WeeklyFormData | null>(null);

  const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "dd/MM/yyyy")} - ${format(weekEnd, "dd/MM/yyyy")}`;
  const prevWeekStartStr = format(subWeeks(weekStart, 1), "yyyy-MM-dd");

  useEffect(() => {
    loadWeeklyReport();
  }, [weekStartStr]);

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await apiRequest("POST", "/api/sales/getWeeklyReports", { token, limit: 12 });
        const data = await res.json();
        if (data.ok && data.reports) setHistoryReports(data.reports);
      } catch {}
      setHistoryLoading(false);
    };
    loadHistory();

    const loadBorrowItems = async () => {
      try {
        const res = await apiRequest("POST", "/api/borrow/items", { token });
        const data = await res.json();
        if (data.ok && data.items) {
          const names: string[] = data.items
            .filter((it: any) => it.isActive !== 0)
            .map((it: any) => it.name as string)
            .sort((a: string, b: string) => a.localeCompare(b, "th"));
          setBorrowItemNames(names);
        }
      } catch {}
    };
    loadBorrowItems();
  }, []);

  const autoPopulateFromDaily = async (silent = false) => {
    setAutoPopulating(true);
    try {
      const res = await apiRequest("POST", "/api/sales/getDailySummaryForWeek", {
        token, weekStartDate: weekStartStr, weekEndDate: weekEndStr,
      });
      const data = await res.json();
      if (data.ok) {
        const fmt = (n: number) => {
          const s = String(n);
          return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };
        const saleNum = data.totalSale || 0;
        const tcNum = data.totalTc || 0;
        const ta = tcNum > 0 ? Math.round(saleNum / tcNum) : 0;
        setForm(prev => ({
          ...prev,
          sale: fmt(saleNum),
          tc: fmt(tcNum),
          ta: fmt(ta),
          waste: data.wastePercent || prev.waste,
          ...(data.deliveryPercent ? { delivery: data.deliveryPercent } : {}),
          ...(data.avgSos > 0 ? { sos: String(data.avgSos) } : {}),
        }));
        if (silent) {
          setIsAutoPopulated(true);
        } else {
          toast({ title: "ดึงข้อมูลจาก Daily สำเร็จ ✅" });
        }
      } else if (!silent) {
        toast({ variant: "destructive", title: data.message || "ไม่พบข้อมูล Daily" });
      }
    } catch {
      if (!silent) toast({ variant: "destructive", title: "ไม่สามารถดึงข้อมูลได้" });
    }
    setAutoPopulating(false);
  };

  useEffect(() => {
    const text = selectionsToText(wasteSelections);
    setForm(prev => ({ ...prev, wasteTop3: text }));
  }, [wasteSelections]);

  useEffect(() => {
    const text = selectionsToText(unacSelections);
    setForm(prev => ({ ...prev, unaccountedTop3: text }));
  }, [unacSelections]);

  const loadWeeklyReport = async () => {
    setLoading(true);
    setIsAutoPopulated(false);
    setPrevForm(null);
    try {
      const [res, prevRes] = await Promise.allSettled([
        apiRequest("POST", "/api/sales/getWeeklyReport", { token, weekStartDate: weekStartStr }),
        apiRequest("POST", "/api/sales/getWeeklyReport", { token, weekStartDate: prevWeekStartStr }),
      ]);
      if (res.status === "rejected") throw new Error("Failed to fetch current week report");
      const data = await res.value.json();
      const prevData = prevRes.status === "fulfilled" ? await prevRes.value.json() : null;

      const fmt = (v: string) => {
        if (!v) return "";
        const stripped = v.replace(/,/g, "");
        const num = stripped.replace(/[^0-9.]/g, "");
        if (!num || isNaN(Number(num))) return v;
        const parts = num.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
      };
      const normPct = (v: string) => {
        if (!v) return "";
        const hasPct = v.endsWith("%");
        const stripped = v.replace(/%$/, "").replace(/,/g, "");
        if (!stripped || isNaN(Number(stripped))) return v;
        return stripped + (hasPct ? "%" : "");
      };
      const mapReport = (r: any): WeeklyFormData => ({
        sale: fmt(r.sale || ""),
        tc: fmt(r.tc || ""),
        ta: fmt(r.ta || ""),
        cog: normPct(r.cog || ""),
        waste: normPct(r.waste || ""),
        unac: normPct(r.unac || ""),
        sos: fmt(r.sos || ""),
        gsi: normPct(r.gsi || ""),
        osat: normPct(r.osat || ""),
        delivery: normPct(r.delivery || ""),
        googleReview: r.googleReview || "",
        colMtd: normPct(r.colMtd || ""),
        wasteTop3: r.wasteTop3 || "",
        unaccountedTop3: r.unaccountedTop3 || "",
      });

      if (prevData.ok && prevData.report) {
        setPrevForm(mapReport(prevData.report));
      }

      if (data.ok && data.report) {
        setForm(mapReport(data.report));
        setWasteSelections(parseSelectionsFromText(data.report.wasteTop3 || ""));
        setUnacSelections(parseSelectionsFromText(data.report.unaccountedTop3 || ""));
        setHasData(true);
      } else {
        setForm({ ...emptyForm });
        setWasteSelections([...emptySelections.map(s => ({ ...s }))]);
        setUnacSelections([...emptySelections.map(s => ({ ...s }))]);
        setHasData(false);
        setLoading(false);
        await autoPopulateFromDaily(true);
        return;
      }
    } catch {
      setForm({ ...emptyForm });
      setWasteSelections([...emptySelections.map(s => ({ ...s }))]);
      setUnacSelections([...emptySelections.map(s => ({ ...s }))]);
      setHasData(false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/sales/upsertWeeklyReport", {
        token,
        report: {
          weekStartDate: weekStartStr,
          weekEndDate: weekEndStr,
          reportBy: user.nickName || user.fullName || user.username,
          ...form,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setHasData(true);
        setIsAutoPopulated(false);
        toast({
          title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully",
        });
      } else {
        toast({ variant: "destructive", title: data.message || "Error" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error saving report" });
    }
    setSaving(false);
  };

  const generateReportText = () => {
    const storeName = settings?.storeName || "Grand Diamond";
    const startDay = format(weekStart, "d", { locale: enUS });
    const endDayMonthYear = format(weekEnd, "d MMMM yyyy", { locale: enUS });
    const dateRange = `[${startDay} - ${endDayMonthYear}]`;
    const lines = [
      `💎${storeName}♦️`,
      `Confirm Weekly ${dateRange}`,
      `Sale = ${form.sale}`,
      `TC = ${form.tc}`,
      `TA = ${form.ta}`,
      `COG = ${form.cog}`,
      `Waste\u200b = ${form.waste}`,
      `Unac = ${form.unac}`,
      `SOS\u200b = ${form.sos}`,
      `GSI = ${form.gsi}`,
      `OSAT = ${form.osat}`,
      `Delivery = ${form.delivery}`,
      `Google review = ${form.googleReview}`,
      `COL MTD = ${form.colMtd}`,
      ``,
      `Waste Top 3t`,
      form.wasteTop3 || "-",
      `Unaccounted Top 3t`,
      form.unaccountedTop3 || "-",
    ];
    return lines.join("\n");
  };

  const handleSendLine = async () => {
    setSendingLine(true);
    try {
      const res = await apiRequest("POST", "/api/line/send-weekly-report", {
        token,
        weekStartDate: weekStartStr,
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "ส่ง LINE สำเร็จ ✅" });
      } else {
        toast({ variant: "destructive", title: data.message || "ส่ง LINE ไม่สำเร็จ" });
      }
    } catch {
      toast({ variant: "destructive", title: "ไม่สามารถส่ง LINE ได้" });
    }
    setSendingLine(false);
  };

  const handleCopy = async () => {
    const text = generateReportText();
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: language === "th" ? "คัดลอกแล้ว" : "Copied to clipboard",
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  const handleExportExcel = async () => {
    if (historyReports.length === 0) {
      toast({ variant: "destructive", title: language === "th" ? "ไม่มีข้อมูลให้ Export" : "No history data to export" });
      return;
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Chann Back House";
    const ws = workbook.addWorksheet("Weekly Reports");

    ws.columns = [
      { header: "Week", key: "week", width: 22 },
      { header: "Sale", key: "sale", width: 12 },
      { header: "TC", key: "tc", width: 10 },
      { header: "TA", key: "ta", width: 10 },
      { header: "COG", key: "cog", width: 10 },
      { header: "Waste", key: "waste", width: 10 },
      { header: "Unac", key: "unac", width: 10 },
      { header: "SOS", key: "sos", width: 10 },
      { header: "GSI", key: "gsi", width: 10 },
      { header: "OSAT", key: "osat", width: 10 },
      { header: "Delivery", key: "delivery", width: 12 },
      { header: "Google Review", key: "googleReview", width: 14 },
      { header: "COL MTD", key: "colMtd", width: 12 },
      { header: "Reported By", key: "reportedBy", width: 18 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD35400" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 20;

    historyReports.forEach((r: any) => {
      const startD = new Date(r.weekStartDate + "T00:00:00");
      const endD = new Date(r.weekEndDate + "T00:00:00");
      const fmtD = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      ws.addRow({
        week: `${fmtD(startD)} - ${fmtD(endD)}`,
        sale: r.sale || "",
        tc: r.tc || "",
        ta: r.ta || "",
        cog: r.cog || "",
        waste: r.waste || "",
        unac: r.unac || "",
        sos: r.sos || "",
        gsi: r.gsi || "",
        osat: r.osat || "",
        delivery: r.delivery || "",
        googleReview: r.googleReview || "",
        colMtd: r.colMtd || "",
        reportedBy: r.reportBy || "",
      });
    });

    ws.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        row.fill = rowNum % 2 === 0
          ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8F0" } }
          : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-reports-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: language === "th" ? "Export สำเร็จ ✅" : "Exported successfully ✅" });
  };

  useEffect(() => {
    const saleNum = parseFloat(form.sale.replace(/,/g, "")) || 0;
    const tcNum = parseFloat(form.tc.replace(/,/g, "")) || 0;
    if (saleNum > 0 && tcNum > 0) {
      const ta = Math.round(saleNum / tcNum);
      const taStr = String(ta).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setForm(prev => ({ ...prev, ta: taStr }));
    }
  }, [form.sale, form.tc]);

  const weeklyDueBanner = (() => {
    const now = new Date();
    const bangkokStr = now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const bangkokDate = new Date(bangkokStr);
    const hour = bangkokDate.getHours();
    const dayOfWeek = bangkokDate.getDay();
    if (dayOfWeek !== 2 || hour >= 20) return null;
    const prevWeekStart = startOfWeek(subWeeks(bangkokDate, 1), { weekStartsOn: 2 });
    const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 2 });
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    return `${fmt(prevWeekStart)} - ${fmt(prevWeekEnd)}`;
  })();

  const numericFields = new Set<keyof WeeklyFormData>(["sale", "tc", "ta", "sos"]);
  const percentFields = new Set<keyof WeeklyFormData>(["cog", "waste", "unac", "gsi", "osat", "delivery", "colMtd"]);

  const formatWithCommas = (val: string) => {
    const stripped = val.replace(/,/g, "");
    const num = stripped.replace(/[^0-9.]/g, "");
    if (!num) return "";
    const parts = num.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
  };

  const update = (field: keyof WeeklyFormData, value: string) => {
    if (percentFields.has(field)) {
      const stripped = value.replace(/%$/, "");
      setForm((prev) => ({ ...prev, [field]: stripped }));
      return;
    }
    const formatted = numericFields.has(field) ? formatWithCommas(value) : value;
    setForm((prev) => ({ ...prev, [field]: formatted }));
  };

  const handlePercentBlur = (field: keyof WeeklyFormData) => {
    if (!percentFields.has(field)) return;
    setForm((prev) => {
      const val = prev[field] as string;
      if (!val || val === "" || val.endsWith("%")) return prev;
      return { ...prev, [field]: val + "%" };
    });
  };

  const updateSelection = (
    type: 'waste' | 'unac',
    index: number,
    field: 'itemName' | 'detail',
    value: string
  ) => {
    if (type === 'waste') {
      const newRows = [...wasteSelections];
      newRows[index] = { ...newRows[index], [field]: value };
      setWasteSelections(newRows);
    } else {
      const newRows = [...unacSelections];
      newRows[index] = { ...newRows[index], [field]: value };
      setUnacSelections(newRows);
    }
  };

  const clearSelection = (type: 'waste' | 'unac', index: number) => {
    if (type === 'waste') {
      const newRows = [...wasteSelections];
      newRows[index] = { itemName: "", detail: "" };
      setWasteSelections(newRows);
    } else {
      const newRows = [...unacSelections];
      newRows[index] = { itemName: "", detail: "" };
      setUnacSelections(newRows);
    }
  };

  const isManager = user?.role === "manager" || user?.role === "admin";

  const t = {
    title: language === "th" ? "สรุปยอดรายสัปดาห์" : "Weekly Sales Report",
    subtitle: language === "th" ? "สรุปผลประจำสัปดาห์" : "Weekly performance summary",
    save: language === "th" ? "บันทึก" : "Save",
    copy: language === "th" ? "คัดลอก" : "Copy",
    preview: language === "th" ? "ตัวอย่างข้อความ" : "Preview Text",
    wasteTop3: language === "th" ? "Waste Top 3 รายการ" : "Waste Top 3 Items",
    unaccountedTop3: language === "th" ? "Unaccounted Top 3 รายการ" : "Unaccounted Top 3 Items",
    noPermission: language === "th" ? "เฉพาะผู้จัดการ" : "Manager only",
    selectItem: language === "th" ? "เลือก Item..." : "Select Item...",
    searchItem: language === "th" ? "ค้นหา item..." : "Search item...",
    noItems: language === "th" ? "ไม่พบข้อมูล" : "No items found",
    detailPlaceholder: language === "th" ? "รายละเอียด (เช่น 500 บาท)" : "Detail (e.g. 500 Baht)",
  };

  const fields: Array<{ key: keyof WeeklyFormData; label: string; placeholder?: string; readOnly?: boolean; autoLabel?: string; lowerIsBetter?: boolean }> = [
    { key: "sale", label: "Sale", placeholder: "e.g. 750,000", autoLabel: "Daily" },
    { key: "tc", label: "TC", placeholder: "e.g. 2,500", autoLabel: "Daily" },
    { key: "ta", label: "TA", placeholder: "คำนวณอัตโนมัติ", readOnly: true },
    { key: "cog", label: "COG", placeholder: "e.g. 35%", lowerIsBetter: true },
    { key: "waste", label: "Waste", placeholder: "e.g. 1.2%", autoLabel: "Daily", lowerIsBetter: true },
    { key: "unac", label: "Unac", placeholder: "e.g. 0.5%", lowerIsBetter: true },
    { key: "sos", label: "SOS", placeholder: "e.g. 180", lowerIsBetter: true },
    { key: "gsi", label: "GSI", placeholder: "e.g. 95%" },
    { key: "osat", label: "OSAT", placeholder: "e.g. 4.5%" },
    { key: "delivery", label: "Delivery", placeholder: "e.g. 25%" },
    { key: "googleReview", label: "Google Review", placeholder: "e.g. 4.3" },
    { key: "colMtd", label: "COL MTD", placeholder: "e.g. 18%", lowerIsBetter: true },
  ];

  const renderTop3Selectors = (
    type: 'waste' | 'unac',
    selections: ItemSelection[],
    categories: string[]
  ) => {
    return (
      <div className="space-y-2 border rounded-md p-3 bg-muted/20">
        {selections.map((row, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium w-4">{index + 1}.</span>

            <Popover
              open={openCombobox?.type === type && openCombobox?.index === index}
              onOpenChange={(isOpen) =>
                setOpenCombobox(isOpen ? { type, index } : null)
              }
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!isManager}
                  className={cn(
                    "w-[180px] sm:w-[200px] justify-between text-sm",
                    !row.itemName && "text-muted-foreground"
                  )}
                  data-testid={`button-${type}-item-${index}`}
                >
                  <span className="truncate">{row.itemName || t.selectItem}</span>
                  <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t.searchItem} />
                  <CommandList>
                    <CommandEmpty>{t.noItems}</CommandEmpty>
                    <CommandGroup>
                      {categories.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={(currentValue) => {
                            updateSelection(type, index, 'itemName', currentValue === row.itemName ? "" : currentValue);
                            setOpenCombobox(null);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              row.itemName === name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Input
              placeholder={t.detailPlaceholder}
              value={row.detail}
              onChange={(e) => updateSelection(type, index, 'detail', e.target.value)}
              className="flex-1 min-w-[120px] text-sm"
              disabled={!isManager}
              data-testid={`input-${type}-detail-${index}`}
            />

            <div className={cn("w-9", !(row.itemName || row.detail) && "invisible")}>
              {(row.itemName || row.detail) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearSelection(type, index)}
                  disabled={!isManager}
                  data-testid={`button-${type}-clear-${index}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SalesLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-20">
        {weeklyDueBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            <span className="text-lg">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">📋 ต้องส่งรายงานสัปดาห์ที่แล้ว</p>
              <p className="text-xs opacity-75 mt-0.5">{weeklyDueBanner} — กรุณาส่งภายใน 20:00 น.</p>
            </div>
            <span className="text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-full whitespace-nowrap">ก่อน 20:00</span>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold" data-testid="text-weekly-title">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="font-semibold text-sm" data-testid="text-week-range">{weekLabel}</div>
            <div className="text-xs text-muted-foreground">
              {language === "th" ? "สัปดาห์ อ.-จ." : "Week Tue-Mon"}
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {language === "th" ? "กรอกข้อมูล" : "Enter Data"}
                  </CardTitle>
                  {isManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => autoPopulateFromDaily(false)}
                      disabled={autoPopulating}
                      className="gap-1.5 text-xs h-8"
                      data-testid="button-auto-populate"
                    >
                      {autoPopulating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      ดึงยอดจาก Daily
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <Label className="text-xs font-medium text-muted-foreground">
                          {f.label}
                        </Label>
                        {f.autoLabel && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1 rounded">
                            {f.autoLabel}
                          </span>
                        )}
                        {f.readOnly && (
                          <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-1 rounded">
                            Auto
                          </span>
                        )}
                        {prevForm && (
                          <DeltaBadge
                            current={form[f.key] as string}
                            prev={prevForm[f.key] as string}
                            lowerIsBetter={f.lowerIsBetter}
                          />
                        )}
                      </div>
                      <Input
                        value={form[f.key]}
                        onChange={(e) => !f.readOnly && update(f.key, e.target.value)}
                        onBlur={() => !f.readOnly && handlePercentBlur(f.key)}
                        placeholder={f.placeholder}
                        className={cn("text-sm", f.readOnly && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
                        disabled={!isManager || f.readOnly}
                        readOnly={f.readOnly}
                        data-testid={`input-weekly-${f.key}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t.wasteTop3}
                  </Label>
                  {renderTop3Selectors('waste', wasteSelections, BK_WASTE_CATEGORIES)}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t.unaccountedTop3}
                    </Label>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1 rounded">
                      ยืมคืน
                    </span>
                  </div>
                  {renderTop3Selectors('unac', unacSelections, borrowItemNames.length > 0 ? borrowItemNames : BK_WASTE_CATEGORIES)}
                </div>

                {isManager && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="button-save-weekly">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t.save}
                    </Button>
                    <Button variant="outline" onClick={handleCopy} className="gap-2" data-testid="button-copy-weekly">
                      <Copy className="w-4 h-4" />
                      {t.copy}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendLine}
                      disabled={sendingLine || !hasData}
                      className="gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                      data-testid="button-send-line-weekly"
                    >
                      {sendingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      ส่ง LINE
                    </Button>
                  </div>
                )}

                {!isManager && (
                  <p className="text-xs text-muted-foreground italic">{t.noPermission}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{t.preview}</CardTitle>
                  {isAutoPopulated && !hasData && (
                    <span className="text-[11px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                      ดึงจาก Daily อัตโนมัติ — ยังไม่ได้บันทึก
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <pre
                  className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 font-mono leading-relaxed"
                  data-testid="text-weekly-preview"
                >
                  {generateReportText()}
                </pre>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                {language === "th" ? "ประวัติรายงานสัปดาห์" : "Weekly Report History"}
              </CardTitle>
              {historyReports.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-1.5 text-xs h-7 px-2"
                  data-testid="button-export-excel-history"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {language === "th" ? "Export Excel" : "Export Excel"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : historyReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีรายงาน</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-2 pb-1 border-b">
                  <span className="col-span-2">สัปดาห์</span>
                  <span className="text-right">Sale</span>
                  <span className="text-right">TC</span>
                  <span className="text-right">Waste</span>
                </div>
                {historyReports.map((r) => {
                  const startD = new Date(r.weekStartDate + "T00:00:00");
                  const endD = new Date(r.weekEndDate + "T00:00:00");
                  const fmtD = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
                  const rangeLabel = `${fmtD(startD)}-${fmtD(endD)}`;
                  const isCurrentWeek = r.weekStartDate === weekStartStr;
                  return (
                    <button
                      key={r.id}
                      className={cn(
                        "w-full grid grid-cols-5 gap-2 text-xs px-2 py-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                        isCurrentWeek && "bg-primary/10 font-semibold"
                      )}
                      onClick={() => setCurrentDate(new Date(r.weekStartDate + "T12:00:00"))}
                      data-testid={`row-history-${r.id}`}
                    >
                      <span className="col-span-2 text-foreground truncate">{rangeLabel}</span>
                      <span className="text-right text-foreground">{r.sale ? Number(r.sale.replace(/,/g,"")).toLocaleString() : "-"}</span>
                      <span className="text-right text-foreground">{r.tc || "-"}</span>
                      <span className="text-right text-muted-foreground">{r.waste || "-"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}
