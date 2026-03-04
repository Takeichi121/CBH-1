import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useAreaLock } from "@/hooks/use-area-lock";
import { AreaLockBanner } from "@/components/area-lock-banner";
import { todayBangkok } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Save,
  Trash2,
  Copy,
  Calculator,
  BarChart3,
  Loader2,
  Plus,
  X,
  Settings,
  ClipboardPaste,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";

const formatNumber = (value: string | number): string => {
  const num =
    typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
};

const parseNumber = (value: string): string => {
  return value.replace(/,/g, "");
};

interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, prefix, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(formatNumber(value));

    useEffect(() => {
      setDisplayValue(formatNumber(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9.,]/g, "");
      setDisplayValue(rawValue);
    };

    const handleBlur = () => {
      const parsed = parseNumber(displayValue);
      onChange(parsed || "0");
      setDisplayValue(formatNumber(parsed || "0"));
    };

    const handleFocus = () => {
      const parsed = parseNumber(displayValue);
      if (parsed === "0") {
        setDisplayValue("");
      }
    };

    return prefix ? (
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {prefix}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={`pl-6 ${className || ""}`}
          {...props}
        />
      </div>
    ) : (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={className}
        {...props}
      />
    );
  },
);

const formSchema = z.object({
  reportDate: z.string().min(1, "กรุณาเลือกวันที่"),
  reportBy: z.string().min(1, "กรุณากรอกชื่อผู้รายงาน"),
  workShift: z.string().optional().default("full"),
  dailyTarget: z.string().default("0"),
  actualSales: z.string().default("0"),
  transactionCount: z.string().default("0"),
  cashDeposit: z.string().default("0"),
  mtdTarget: z.string().default("0"),
  mtdActual: z.string().default("0"),
  mtdTc: z.string().default("0"),
  dineIn: z.string().default("0"),
  dineInTc: z.string().default("0"),
  takeAway: z.string().default("0"),
  takeAwayTc: z.string().default("0"),
  grabfood: z.string().default("0"),
  lineman: z.string().default("0"),
  shopee: z.string().default("0"),
  bkapp: z.string().default("0"),
  robin: z.string().default("0"),
  gokoo: z.string().default("0"),
  osat: z.string().default("0"),
  surveyCount: z.string().default("0"),
  voidAmount: z.string().default("0"),
  voidCount: z.string().default("0"),
  sosDaily: z.string().default("0"),
  sosMtd: z.string().default("0"),
  addCheeseCount: z.string().default("0"),
  addCheesePercent: z.string().default("0"),
  vMealCount: z.string().default("0"),
  vMealPercent: z.string().default("0"),
  upSizeCount: z.string().default("0"),
  upSizePercent: z.string().default("0"),
  wasteDailyTotal: z.string().default("0"),
  wasteMealDaily: z.string().default("0"),
  wasteMtdTotal: z.string().default("0"),
  wasteMealMtd: z.string().default("0"),

  // --- Labor section ---
  recommendHours: z.string().default("0"),
  rosterCommit: z.string().default("0"),
  actualHours: z.string().default("0"),
  otHours: z.string().default("0"),
  otMtd: z.string().default("0"),
  summaryHours: z.string().default("0"),
  varianceHours: z.string().default("0"),
  laborCost: z.string().default("0"),
  colPercent: z.string().default("0"),
  laborHour: z.string().default("0"),
  tcmh: z.string().default("0"),
  closeShiftCount: z.string().default("0"),

  managerRosterDate: z.string().default(""),
  managerRosterText: z.string().default(""),
  staffRosterText: z.string().default(""),
  managerPhongsathon: z.string().default(""),
  managerNuttarika: z.string().default(""),
  managerBoonyisa: z.string().default(""),
  managerChanon: z.string().default(""),
  managerWashiraphan: z.string().default(""),
});

const MANAGER_NAMES = [
  { key: "managerPhongsathon", name: "Phongsathon" },
  { key: "managerNuttarika", name: "Nuttarika" },
  { key: "managerBoonyisa", name: "Boonyisa" },
  { key: "managerChanon", name: "Chanon" },
  { key: "managerWashiraphan", name: "Washiraphan" },
] as const;

const SHIFT_OPTIONS = [
  { value: "07:00-16:00", label: "07:00-16:00" },
  { value: "09:00-18:00", label: "09:00-18:00" },
  { value: "10:00-19:00", label: "10:00-19:00" },
  { value: "11:00-20:00", label: "11:00-20:00" },
  { value: "12:00-21:00", label: "12:00-21:00" },
  { value: "13:00-22:00", label: "13:00-22:00" },
  { value: "14:00-23:00", label: "14:00-23:00" },
  { value: "15:00-00:00", label: "15:00-00:00" },
  { value: "16:00-01:00", label: "16:00-01:00" },
  { value: "19:00-04:00", label: "19:00-04:00" },
  { value: "22:00-07:00", label: "22:00-07:00" },
  { value: "OFF", label: "OFF" },
  { value: "COM", label: "COM" },
  { value: "Vacation", label: "Vacation" },
  { value: "QSNCC", label: "QSNCC" },
  { value: "Training", label: "Training" },
] as const;

const STAFF_SHIFT_GROUPS = [
  { value: "07:00-16:00", label: "07:00-16:00" },
  { value: "09:00-18:00", label: "09:00-18:00" },
  { value: "10:00-19:00", label: "10:00-19:00" },
  { value: "11:00-20:00", label: "11:00-20:00" },
  { value: "12:00-21:00", label: "12:00-21:00" },
  { value: "13:00-22:00", label: "13:00-22:00" },
  { value: "14:00-23:00", label: "14:00-23:00" },
  { value: "15:00-00:00", label: "15:00-00:00" },
  { value: "18:00-00:00", label: "18:00-00:00" },
  { value: "19:00-04:00", label: "19:00-04:00" },
  { value: "21:00-06:00", label: "21:00-06:00" },
  { value: "22:00-07:00", label: "22:00-07:00" },
  { value: "CUSTOM", label: "กำหนดเอง" },
] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

type FormData = z.infer<typeof formSchema>;

export default function DailySalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useI18n();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [isSendingLineReport, setIsSendingLineReport] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [customAddonDivisor, setCustomAddonDivisor] = useState<string>("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("chann_collapsed_sections") || "{}"); }
    catch { return {}; }
  });
  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("chann_collapsed_sections", JSON.stringify(next));
      return next;
    });
  };

  const isManager = user?.role === "manager" || user?.role === "admin" || user?.role === "area";
  const { isAreaUser, isUnlocked } = useAreaLock();
  const areaLocked = isAreaUser && !isUnlocked;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportDate: todayBangkok(),
      reportBy: user?.nickName || user?.username || "",
      workShift: "full",
      dailyTarget: "0",
      actualSales: "0",
      transactionCount: "0",
      cashDeposit: "0",
      mtdTarget: "0",
      mtdActual: "0",
      mtdTc: "0",
      dineIn: "0",
      dineInTc: "0",
      takeAway: "0",
      takeAwayTc: "0",
      grabfood: "0",
      lineman: "0",
      shopee: "0",
      bkapp: "0",
      robin: "0",
      gokoo: "0",
      osat: "0",
      surveyCount: "0",
      voidAmount: "0",
      voidCount: "0",
      sosDaily: "0",
      sosMtd: "0",
      addCheeseCount: "0",
      addCheesePercent: "0",
      vMealCount: "0",
      vMealPercent: "0",
      upSizeCount: "0",
      upSizePercent: "0",
      wasteDailyTotal: "0",
      wasteMealDaily: "0",
      wasteMtdTotal: "0",
      wasteMealMtd: "0",

      // --- Labor section defaultValues ---
      actualHours: "0",
      otHours: "0",
      otMtd: "0",
      summaryHours: "0",
      varianceHours: "0",
      laborCost: "0",
      colPercent: "0",
      laborHour: "0",
      tcmh: "0",
      closeShiftCount: "0",

      managerRosterDate: "",
      managerRosterText: "",
      staffRosterText: "",
      managerPhongsathon: "",
      managerNuttarika: "",
      managerBoonyisa: "",
      managerChanon: "",
      managerWashiraphan: "",
    },
  });

  const [staffList, setStaffList] = useState<
    Array<{ username: string; nickName?: string; fullName?: string }>
  >([]);
  const [staffRosterEntries, setStaffRosterEntries] = useState<
    Array<{ shiftGroup: string; staffName: string; customStart?: string; customEnd?: string }>
  >([{ shiftGroup: "", staffName: "", customStart: "08:00", customEnd: "16:00" }]);

  const { saveData, restoreData, clearData, hasDraft } =
    useFormPersistence<FormData>("daily-sales-form");
  const { hasUnsavedChanges, markAsChanged, markAsSaved } = useUnsavedChanges();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);

  const saveToServer = useCallback(async (values: FormData) => {
    if (!values.reportDate || !values.reportBy) return;

    const wasteDailyTotalNum = parseFloat(
      values.wasteDailyTotal?.replace(/,/g, "") || "0",
    );
    const wasteMealDailyNum = parseFloat(
      values.wasteMealDaily?.replace(/,/g, "") || "0",
    );
    const wasteRawDailyNum = wasteDailyTotalNum - wasteMealDailyNum;

    const {
      wasteDailyTotal: _wdt2,
      wasteMtdTotal: _wmt2,
      managerPhongsathon: _mp2,
      managerNuttarika: _mn2,
      managerBoonyisa: _mb2,
      managerChanon: _mc2,
      managerWashiraphan: _mw2,
      ...autoDbFields
    } = values;

    const cleanedReport = {
      ...autoDbFields,
      actualSales: values.actualSales?.replace(/,/g, "") || "0",
      transactionCount: values.transactionCount?.replace(/,/g, "") || "0",
      dineIn: values.dineIn?.replace(/,/g, "") || "0",
      dineInTc: values.dineInTc?.replace(/,/g, "") || "0",
      takeAway: values.takeAway?.replace(/,/g, "") || "0",
      takeAwayTc: values.takeAwayTc?.replace(/,/g, "") || "0",
      grabfood: values.grabfood?.replace(/,/g, "") || "0",
      lineman: values.lineman?.replace(/,/g, "") || "0",
      shopee: values.shopee?.replace(/,/g, "") || "0",
      bkapp: values.bkapp?.replace(/,/g, "") || "0",
      robin: values.robin?.replace(/,/g, "") || "0",
      gokoo: values.gokoo?.replace(/,/g, "") || "0",
      dailyTarget: values.dailyTarget?.replace(/,/g, "") || "0",
      mtdTarget: values.mtdTarget?.replace(/,/g, "") || "0",
      mtdActual: values.mtdActual?.replace(/,/g, "") || "0",
      mtdTc: values.mtdTc?.replace(/,/g, "") || "0",
      cashDeposit: values.cashDeposit?.replace(/,/g, "") || "0",
      voidAmount: values.voidAmount?.replace(/,/g, "") || "0",
      sosDaily: values.sosDaily?.replace(/,/g, "") || "0",
      sosMtd: values.sosMtd?.replace(/,/g, "") || "0",
      wasteRawDaily: wasteRawDailyNum.toString(),
      wasteMealDaily: values.wasteMealDaily?.replace(/,/g, "") || "0",
      wasteRawMtd: (
        parseFloat(values.wasteMtdTotal?.replace(/,/g, "") || "0") -
        parseFloat(values.wasteMealMtd?.replace(/,/g, "") || "0")
      ).toString(),
      wasteMealMtd: values.wasteMealMtd?.replace(/,/g, "") || "0",

      actualHours: values.actualHours?.replace(/,/g, "") || "0",
      otHours: values.otHours?.replace(/,/g, "") || "0",
      otMtd: values.otMtd?.replace(/,/g, "") || "0",
      laborCost: values.laborCost?.replace(/,/g, "") || "0",
      laborHour: values.laborHour?.replace(/,/g, "") || "0",
      colPercent: values.colPercent?.replace(/,/g, "") || "0",
      tcmh: values.tcmh?.replace(/,/g, "") || "0",
      closeShiftCount: values.closeShiftCount || "0",
    };

    try {
      setIsSavingToServer(true);
      const token = localStorage.getItem("bk_token");
      await apiRequest("POST", "/api/sales/upsertReportByDate", {
        token,
        report: cleanedReport,
      });
      setLastSaved(new Date());
      setShowAutoSave(true);
      if (hideAutoSaveTimerRef.current) {
        clearTimeout(hideAutoSaveTimerRef.current);
      }
      hideAutoSaveTimerRef.current = setTimeout(
        () => setShowAutoSave(false),
        3000,
      );
    } catch (error) {
      console.error("Failed to auto-save to server:", error);
    } finally {
      setIsSavingToServer(false);
    }
  }, []);

  const debouncedSave = useCallback(
    (values: FormData) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveData(values);
        markAsSaved();
      }, 1000);
    },
    [saveData, markAsSaved],
  );

  const debouncedServerSave = useCallback(
    (values: FormData) => {
      if (isAreaUser && !isUnlocked) return;
      if (serverSaveTimerRef.current) {
        clearTimeout(serverSaveTimerRef.current);
      }
      serverSaveTimerRef.current = setTimeout(() => {
        saveToServer(values);
      }, 1500);
    },
    [saveToServer, isAreaUser, isUnlocked],
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.reportDate && values.reportBy) {
        markAsChanged();
        debouncedSave(values as FormData);
        if (!isLoadingRef.current) {
          debouncedServerSave(values as FormData);
        }
      }
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (hideAutoSaveTimerRef.current)
        clearTimeout(hideAutoSaveTimerRef.current);
      if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    };
  }, [debouncedSave, debouncedServerSave, markAsChanged]);

  useEffect(() => {
    const restored = restoreData();
    if (restored) {
      (Object.keys(restored) as Array<keyof FormData>).forEach((key) => {
        if (restored[key] !== undefined) {
          form.setValue(key, restored[key]);
        }
      });

      // Hydrate manager roster dropdowns from saved text
      if (restored.managerRosterText) {
        const lines = restored.managerRosterText.split("\n");
        lines.forEach((line) => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, name, shift] = match;
            const managerKey = `manager${name}` as keyof FormData;
            if (
              [
                "managerPhongsathon",
                "managerNuttarika",
                "managerBoonyisa",
                "managerChanon",
                "managerWashiraphan",
              ].includes(managerKey)
            ) {
              form.setValue(managerKey, shift.trim());
            }
          }
        });
      }

      // Hydrate staff roster entries from saved text
      if (restored.staffRosterText) {
        const lines = restored.staffRosterText
          .split("\n")
          .filter((l) => l.trim());
        const entries = lines.map((line) => {
          const parts = line.split("|").map((p) => p.trim());
          return { shiftGroup: parts[0] || "", staffName: parts[1] || "" };
        });
        if (entries.length > 0) {
          setStaffRosterEntries(entries);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State for default target from settings
  const [defaultDailyTarget, setDefaultDailyTarget] = useState("250000");

  const [shiftCountData, setShiftCountData] = useState<any>(null);
  
  // State for labor settings (constants)
  const [laborSettings, setLaborSettings] = useState({
    rosterHours: 88,
    dutyDailyHours: 40,
    ptWageRate: 45,
    fixedCostDaily: 0,
    closeShiftDailyCost: 0,
  });

  // Load store settings, labor settings, and staff list on mount
  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getSettings", {
          token,
        });
        const data = await res.json();
        if (data.ok && data.settings) {
          setDefaultDailyTarget(data.settings.dailyTarget || "250000");
        }
      } catch (error) {
        console.error("Failed to load store settings:", error);
      }
    };
    const loadLaborSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/settings/get-labor", { token });
        const data = await res.json();
        if (data.ok && data.settings) {
          setLaborSettings({
            rosterHours: Number(data.settings.rosterHours) || 88,
            dutyDailyHours: Number(data.settings.dutyDailyHours) || 40,
            ptWageRate: Number(data.settings.ptWageRate) || 45,
            fixedCostDaily: Number(data.settings.fixedCostDaily) || 0,
            closeShiftDailyCost: Number(data.settings.closeShiftDailyCost) || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load labor settings:", error);
      }
    };
    const loadStaffList = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/admin/getUsers", { token });
        const data = await res.json();
        if (data.ok && data.users) {
          const activeStaff = data.users.filter(
            (u: any) => u.active === 1 && u.role === "staff",
          );
          setStaffList(activeStaff);
        }
      } catch (error) {
        console.error("Failed to load staff list:", error);
      }
    };
    loadStoreSettings();
    loadLaborSettings();
    loadStaffList();
  }, []);

  // Update staffRosterText when entries change
  useEffect(() => {
    const text = staffRosterEntries
      .filter((e) => e.shiftGroup && e.staffName)
      .map((e) => {
        const shift = e.shiftGroup === "CUSTOM" && e.customStart && e.customEnd 
          ? `${e.customStart}-${e.customEnd}` 
          : e.shiftGroup;
        return `${shift} | ${e.staffName}`;
      })
      .join("\n");
    form.setValue("staffRosterText", text);
  }, [staffRosterEntries]);

  // Update managerRosterText when manager shifts change
  const managerPhongsathon = form.watch("managerPhongsathon");
  const managerNuttarika = form.watch("managerNuttarika");
  const managerBoonyisa = form.watch("managerBoonyisa");
  const managerChanon = form.watch("managerChanon");
  const managerWashiraphan = form.watch("managerWashiraphan");

  useEffect(() => {
    const lines = [];
    if (managerPhongsathon) lines.push(`Phongsathon: ${managerPhongsathon}`);
    if (managerNuttarika) lines.push(`Nuttarika: ${managerNuttarika}`);
    if (managerBoonyisa) lines.push(`Boonyisa: ${managerBoonyisa}`);
    if (managerChanon) lines.push(`Chanon: ${managerChanon}`);
    if (managerWashiraphan) lines.push(`Washiraphan: ${managerWashiraphan}`);
    form.setValue("managerRosterText", lines.join("\n"));
  }, [
    managerPhongsathon,
    managerNuttarika,
    managerBoonyisa,
    managerChanon,
    managerWashiraphan,
  ]);

  const addStaffEntry = () => {
    setStaffRosterEntries([
      ...staffRosterEntries,
      { shiftGroup: "", staffName: "", customStart: "08:00", customEnd: "16:00" },
    ]);
  };

  const removeStaffEntry = (index: number) => {
    setStaffRosterEntries(staffRosterEntries.filter((_, i) => i !== index));
  };

  const updateStaffEntry = (
    index: number,
    field: "shiftGroup" | "staffName" | "customStart" | "customEnd",
    value: string,
  ) => {
    const updated = [...staffRosterEntries];
    (updated[index] as any)[field] = value;
    setStaffRosterEntries(updated);
  };

  // Load daily target, MTD summary, and existing report when date changes
  const reportDate = form.watch("reportDate");

  useEffect(() => {
    if (reportDate) localStorage.setItem("chann_page_date", reportDate);
  }, [reportDate]);

  useEffect(() => {
    const loadShiftCount = async () => {
      if (!reportDate) return;
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/shift-count-for-date", { token, date: reportDate });
        const data = await res.json();
        if (data.ok) setShiftCountData(data);
      } catch (e) { console.error("Failed to load shift count:", e); }
    };
    loadShiftCount();
  }, [reportDate]);

  useEffect(() => {
    const loadDailyTargetAndMtd = async () => {
      if (!reportDate) return;
      try {
        const token = localStorage.getItem("bk_token");
        const date = new Date(reportDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        // Block autosave during DB load to prevent "0" values overwriting real data
        isLoadingRef.current = true;

        // Reset daily fields first to prevent data from other dates mixing in
        const dailyFieldsToReset = {
          actualSales: "0",
          transactionCount: "0",
          dineIn: "0",
          dineInTc: "0",
          takeAway: "0",
          takeAwayTc: "0",
          grabfood: "0",
          lineman: "0",
          shopee: "0",
          bkapp: "0",
          robin: "0",
          gokoo: "0",
          osat: "0",
          surveyCount: "0",
          voidAmount: "0",
          voidCount: "0",
          sosDaily: "0",
          addCheeseCount: "0",
          addCheesePercent: "0",
          vMealCount: "0",
          vMealPercent: "0",
          upSizeCount: "0",
          upSizePercent: "0",
          wasteDailyTotal: "0",
          wasteMealDaily: "0",
          actualHours: "0",
          otHours: "0",
          laborCost: "0",
          colPercent: "0",
          laborHour: "0",
          tcmh: "0",
          closeShiftCount: "0",
          cashDeposit: "0",
          managerPhongsathon: "",
          managerNuttarika: "",
          managerBoonyisa: "",
          managerChanon: "",
          managerWashiraphan: "",
          managerRosterText: "",
          staffRosterText: "",
          workShift: "full",
        };
        Object.entries(dailyFieldsToReset).forEach(([key, value]) => {
          form.setValue(key as keyof FormData, value);
        });
        setStaffRosterEntries([{ shiftGroup: "", staffName: "" }]);

        // Load existing report for this date
        const existingRes = await apiRequest(
          "POST",
          "/api/sales/getReportByDate",
          {
            token,
            date: reportDate,
          },
        );
        const existingData = await existingRes.json();
        if (existingData.ok && existingData.report) {
          const r = existingData.report;
          if (r.reportBy) form.setValue("reportBy", r.reportBy);
          form.setValue("actualSales", r.actualSales || "0");
          form.setValue("transactionCount", r.transactionCount || "0");
          form.setValue("dineIn", r.dineIn || "0");
          form.setValue("dineInTc", r.dineInTc || "0");
          form.setValue("takeAway", r.takeAway || "0");
          form.setValue("takeAwayTc", r.takeAwayTc || "0");
          form.setValue("grabfood", r.grabfood || "0");
          form.setValue("lineman", r.lineman || "0");
          form.setValue("shopee", r.shopee || "0");
          form.setValue("bkapp", r.bkapp || "0");
          form.setValue("robin", r.robin || "0");
          form.setValue("gokoo", r.gokoo || "0");
          form.setValue("osat", r.osat || "0");
          form.setValue("surveyCount", r.surveyCount || "0");
          form.setValue("voidAmount", r.voidAmount || "0");
          form.setValue("voidCount", r.voidCount || "0");
          form.setValue("sosDaily", r.sosDaily || "0");
          form.setValue("sosMtd", r.sosMtd || "0");
          form.setValue("addCheeseCount", r.addCheeseCount || "0");
          form.setValue("addCheesePercent", r.addCheesePercent || "0");
          form.setValue("vMealCount", r.vMealCount || "0");
          form.setValue("vMealPercent", r.vMealPercent || "0");
          form.setValue("upSizeCount", r.upSizeCount || "0");
          form.setValue("upSizePercent", r.upSizePercent || "0");

          const loadedWasteRawDaily = parseFloat(r.wasteRawDaily || "0");
          const loadedWasteMealDaily = parseFloat(r.wasteMealDaily || "0");
          const calculatedWasteDailyTotal =
            loadedWasteRawDaily + loadedWasteMealDaily;
          form.setValue(
            "wasteDailyTotal",
            calculatedWasteDailyTotal.toFixed(2),
          );
          form.setValue("wasteMealDaily", parseFloat(r.wasteMealDaily || "0").toFixed(2));

          const loadedWasteRawMtd = parseFloat(r.wasteRawMtd || "0");
          const loadedWasteMealMtd = parseFloat(r.wasteMealMtd || "0");
          const calculatedWasteMtdTotal =
            loadedWasteRawMtd + loadedWasteMealMtd;
          form.setValue("wasteMtdTotal", calculatedWasteMtdTotal.toFixed(2));
          form.setValue("wasteMealMtd", loadedWasteMealMtd.toFixed(2));

          // --- Load labor fields ---
          form.setValue("actualHours", r.actualHours || "0");
          form.setValue("otHours", r.otHours || "0");
          form.setValue("recommendHours", r.recommendHours || "0");
          form.setValue("rosterCommit", r.rosterCommit || "0");
          form.setValue("otMtd", r.otMtd || "0");
          form.setValue("laborCost", r.laborCost || "0");
          form.setValue("colPercent", r.colPercent || "0");
          form.setValue("laborHour", r.laborHour || "0");
          form.setValue("tcmh", r.tcmh || "0");
          form.setValue("closeShiftCount", r.closeShiftCount || "0");
          form.setValue("cashDeposit", r.cashDeposit || "0");

          if (r.managerRosterDate)
            form.setValue("managerRosterDate", r.managerRosterDate);
          if (r.workShift) form.setValue("workShift", r.workShift);

          // Hydrate manager roster dropdowns from saved text
          if (r.managerRosterText) {
            const lines = r.managerRosterText.split("\n");
            lines.forEach((line: string) => {
              const match = line.match(/^(\w+):\s*(.+)$/);
              if (match) {
                const [, name, shift] = match;
                const managerKey = `manager${name}` as keyof FormData;
                if (
                  [
                    "managerPhongsathon",
                    "managerNuttarika",
                    "managerBoonyisa",
                    "managerChanon",
                    "managerWashiraphan",
                  ].includes(managerKey)
                ) {
                  form.setValue(managerKey, shift.trim());
                }
              }
            });
          }

          // Hydrate staff roster entries from saved text
          if (r.staffRosterText) {
            const lines = r.staffRosterText
              .split("\n")
              .filter((l: string) => l.trim());
            const entries = lines.map((line: string) => {
              const parts = line.split("|").map((p: string) => p.trim());
              return { shiftGroup: parts[0] || "", staffName: parts[1] || "" };
            });
            if (entries.length > 0) {
              setStaffRosterEntries(entries);
            }
          }
        }

        // Load daily target for this specific date
        const targetRes = await apiRequest(
          "POST",
          "/api/sales/getDailyTargetForDate",
          {
            token,
            date: reportDate,
          },
        );
        const targetData = await targetRes.json();
        if (targetData.ok && targetData.target) {
          form.setValue(
            "dailyTarget",
            targetData.target.targetSales || defaultDailyTarget,
          );
        } else {
          form.setValue("dailyTarget", defaultDailyTarget);
        }

        // Get MTD Actual from daily sales reports
        const mtdRes = await apiRequest("POST", "/api/sales/getMtdSummary", {
          token,
          year,
          month,
          beforeDate: reportDate,
        });
        const mtdData = await mtdRes.json();
        if (mtdData.ok) {
          form.setValue("mtdActual", mtdData.mtdActual.toString());
          form.setValue("mtdTc", mtdData.mtdTc.toString());
          form.setValue(
            "wasteMtdTotal",
            parseFloat(mtdData.wasteMtdTotal || 0).toFixed(2),
          );
          form.setValue(
            "wasteMealMtd",
            parseFloat(mtdData.wasteMealMtd || 0).toFixed(2),
          );
          form.setValue(
            "otMtd",
            parseFloat(mtdData.otMtd || 0).toFixed(2),
          );
        }

        // Get MTD Target from daily_targets table
        const mtdTargetRes = await apiRequest(
          "POST",
          "/api/sales/getMtdTargetSum",
          {
            token,
            year,
            month,
            upToDate: reportDate,
          },
        );
        const mtdTargetData = await mtdTargetRes.json();
        if (mtdTargetData.ok) {
          form.setValue(
            "mtdTarget",
            (mtdTargetData.mtdTargetSum || 0).toString(),
          );
        }
      } catch (error) {
        console.error("Failed to load daily target and MTD:", error);
      } finally {
        // Wait for React re-render + staffRosterEntries useEffect to finish before re-enabling autosave
        setTimeout(() => { isLoadingRef.current = false; }, 300);
      }
    };
    loadDailyTargetAndMtd();
  }, [reportDate, defaultDailyTarget]);

  const handleSaveReport = async () => {
    try {
      const values = form.getValues();
      const token = localStorage.getItem("bk_token");

      const wasteDailyTotalNum = parseFloat(
        values.wasteDailyTotal?.replace(/,/g, "") || "0",
      );
      const wasteMealDailyNum = parseFloat(
        values.wasteMealDaily?.replace(/,/g, "") || "0",
      );
      const wasteRawDailyNum = wasteDailyTotalNum - wasteMealDailyNum;

      const wasteMtdTotalNum = parseFloat(
        values.wasteMtdTotal?.replace(/,/g, "") || "0",
      );
      const wasteMealMtdNum = parseFloat(
        values.wasteMealMtd?.replace(/,/g, "") || "0",
      );
      const wasteRawMtdNum = wasteMtdTotalNum - wasteMealMtdNum;

      const {
        wasteDailyTotal: _wdt,
        wasteMtdTotal: _wmt,
        managerPhongsathon: _mp,
        managerNuttarika: _mn,
        managerBoonyisa: _mb,
        managerChanon: _mc,
        managerWashiraphan: _mw,
        ...dbFields
      } = values;

      const reportToSave = {
        ...dbFields,
        actualSales: values.actualSales?.replace(/,/g, "") || "0",
        transactionCount: values.transactionCount?.replace(/,/g, "") || "0",
        dineIn: values.dineIn?.replace(/,/g, "") || "0",
        dineInTc: values.dineInTc?.replace(/,/g, "") || "0",
        takeAway: values.takeAway?.replace(/,/g, "") || "0",
        takeAwayTc: values.takeAwayTc?.replace(/,/g, "") || "0",
        grabfood: values.grabfood?.replace(/,/g, "") || "0",
        lineman: values.lineman?.replace(/,/g, "") || "0",
        shopee: values.shopee?.replace(/,/g, "") || "0",
        bkapp: values.bkapp?.replace(/,/g, "") || "0",
        robin: values.robin?.replace(/,/g, "") || "0",
        gokoo: values.gokoo?.replace(/,/g, "") || "0",
        dailyTarget: values.dailyTarget?.replace(/,/g, "") || "0",
        mtdTarget: values.mtdTarget?.replace(/,/g, "") || "0",
        mtdActual: values.mtdActual?.replace(/,/g, "") || "0",
        mtdTc: values.mtdTc?.replace(/,/g, "") || "0",
        voidAmount: values.voidAmount?.replace(/,/g, "") || "0",
        sosDaily: values.sosDaily?.replace(/,/g, "") || "0",
        sosMtd: values.sosMtd?.replace(/,/g, "") || "0",
        wasteRawDaily: wasteRawDailyNum.toString(),
        wasteMealDaily: values.wasteMealDaily?.replace(/,/g, "") || "0",
        wasteRawMtd: wasteRawMtdNum.toString(),
        wasteMealMtd: values.wasteMealMtd?.replace(/,/g, "") || "0",
        actualHours: values.actualHours?.replace(/,/g, "") || "0",
        otHours: values.otHours?.replace(/,/g, "") || "0",
        otMtd: values.otMtd?.replace(/,/g, "") || "0",
        laborCost: values.laborCost?.replace(/,/g, "") || "0",
        laborHour: values.laborHour?.replace(/,/g, "") || "0",
        colPercent: values.colPercent?.replace(/,/g, "") || "0",
        tcmh: values.tcmh?.replace(/,/g, "") || "0",
        closeShiftCount: values.closeShiftCount || "0",
        cashDeposit: values.cashDeposit?.replace(/,/g, "") || "0",
      };

      const res = await apiRequest("POST", "/api/sales/upsertReportByDate", {
        token,
        report: reportToSave,
      });
      const result = await res.json();
      if (result.ok) {
        toast({
          title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully",
        });
        clearData();
        markAsSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to save",
        });
      }
    } catch (error: any) {
      console.error("Save to DB error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (!isManager) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="p-8 text-center" data-testid="card-access-denied">
            <CardTitle
              className="text-destructive mb-2"
              data-testid="text-access-denied-title"
            >
              {language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "Access Denied"}
            </CardTitle>
            <CardDescription data-testid="text-access-denied-desc">
              {language === "th"
                ? "เฉพาะผู้จัดการเท่านั้น"
                : "Only managers can access this page"}
            </CardDescription>
          </Card>
        </div>
      </SalesLayout>
    );
  }

  const handleClearForm = () => {
    const confirmMessage =
      language === "th"
        ? "คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?"
        : "Are you sure you want to clear all data?";
    if (confirm(confirmMessage)) {
      clearData();
      form.reset();
      markAsSaved();
    }
  };

  const saveFormToDb = async (): Promise<boolean> => {
    try {
      const values = form.getValues();
      const token = localStorage.getItem("bk_token");
      const wasteDailyTotalNum = parseFloat(values.wasteDailyTotal?.replace(/,/g, "") || "0");
      const wasteMealDailyNum = parseFloat(values.wasteMealDaily?.replace(/,/g, "") || "0");
      const wasteRawDailyNum = wasteDailyTotalNum - wasteMealDailyNum;
      const wasteMtdTotalNum = parseFloat(values.wasteMtdTotal?.replace(/,/g, "") || "0");
      const wasteMealMtdNum = parseFloat(values.wasteMealMtd?.replace(/,/g, "") || "0");
      const wasteRawMtdNum = wasteMtdTotalNum - wasteMealMtdNum;
      const {
        wasteDailyTotal: _wdt, wasteMtdTotal: _wmt,
        managerPhongsathon: _mp, managerNuttarika: _mn,
        managerBoonyisa: _mb, managerChanon: _mc, managerWashiraphan: _mw,
        ...dbFields
      } = values;
      const reportToSave = {
        ...dbFields,
        actualSales: values.actualSales?.replace(/,/g, "") || "0",
        transactionCount: values.transactionCount?.replace(/,/g, "") || "0",
        dineIn: values.dineIn?.replace(/,/g, "") || "0",
        dineInTc: values.dineInTc?.replace(/,/g, "") || "0",
        takeAway: values.takeAway?.replace(/,/g, "") || "0",
        takeAwayTc: values.takeAwayTc?.replace(/,/g, "") || "0",
        grabfood: values.grabfood?.replace(/,/g, "") || "0",
        lineman: values.lineman?.replace(/,/g, "") || "0",
        shopee: values.shopee?.replace(/,/g, "") || "0",
        bkapp: values.bkapp?.replace(/,/g, "") || "0",
        robin: values.robin?.replace(/,/g, "") || "0",
        gokoo: values.gokoo?.replace(/,/g, "") || "0",
        dailyTarget: values.dailyTarget?.replace(/,/g, "") || "0",
        mtdTarget: values.mtdTarget?.replace(/,/g, "") || "0",
        mtdActual: values.mtdActual?.replace(/,/g, "") || "0",
        mtdTc: values.mtdTc?.replace(/,/g, "") || "0",
        voidAmount: values.voidAmount?.replace(/,/g, "") || "0",
        sosDaily: values.sosDaily?.replace(/,/g, "") || "0",
        sosMtd: values.sosMtd?.replace(/,/g, "") || "0",
        wasteRawDaily: wasteRawDailyNum.toString(),
        wasteMealDaily: values.wasteMealDaily?.replace(/,/g, "") || "0",
        wasteRawMtd: wasteRawMtdNum.toString(),
        wasteMealMtd: values.wasteMealMtd?.replace(/,/g, "") || "0",
        actualHours: values.actualHours?.replace(/,/g, "") || "0",
        otHours: values.otHours?.replace(/,/g, "") || "0",
        otMtd: values.otMtd?.replace(/,/g, "") || "0",
        laborCost: values.laborCost?.replace(/,/g, "") || "0",
        laborHour: values.laborHour?.replace(/,/g, "") || "0",
        colPercent: values.colPercent?.replace(/,/g, "") || "0",
        tcmh: values.tcmh?.replace(/,/g, "") || "0",
        closeShiftCount: values.closeShiftCount || "0",
        cashDeposit: values.cashDeposit?.replace(/,/g, "") || "0",
      };
      const res = await apiRequest("POST", "/api/sales/upsertReportByDate", { token, report: reportToSave });
      const result = await res.json();
      return result.ok === true;
    } catch {
      return false;
    }
  };

  const handleSendLineReport = async () => {
    const reportDate = form.getValues("reportDate");
    if (!reportDate) {
      toast({ title: "กรุณาเลือกวันที่ก่อน", variant: "destructive" });
      return;
    }
    setIsSendingLineReport(true);
    const token = localStorage.getItem("bk_token");
    try {
      const saved = await saveFormToDb();
      if (!saved) {
        toast({ title: "บันทึกข้อมูลไม่สำเร็จ", description: "ไม่สามารถบันทึกก่อนส่งได้", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/line/send-daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, date: reportDate })
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "ส่งรายงานไป LINE แล้ว ✅", description: `รายงานวันที่ ${reportDate}` });
      } else {
        toast({ title: "ส่งไม่สำเร็จ", description: data.message || "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อได้", variant: "destructive" });
    } finally {
      setIsSendingLineReport(false);
    }
  };

  const handleCopyReport = () => {
    const v = form.getValues();
    const actualSalesVal = parseFloat(v.actualSales) || 0;
    const tcVal = parseInt(v.transactionCount) || 0;
    const taVal =
      tcVal > 0 ? Math.round(actualSalesVal / tcVal).toString() : "0";

    const mtdActualVal = parseFloat(v.mtdActual) || 0;
    const mtdTargetVal = parseFloat(v.mtdTarget) || 0;
    const mtdVariance = mtdActualVal - mtdTargetVal;
    const mtdTcVal = parseInt(v.mtdTc) || 0;
    const mtdTaVal =
      mtdTcVal > 0 ? Math.round(mtdActualVal / mtdTcVal).toString() : "0";

    const dineInVal = parseFloat(v.dineIn) || 0;
    const takeAwayVal = parseFloat(v.takeAway) || 0;
    const inStoreTotal = dineInVal + takeAwayVal;
    const dineInPercent =
      actualSalesVal > 0
        ? ((dineInVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const takeAwayPercent =
      actualSalesVal > 0
        ? ((takeAwayVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const inStoreTotalPercent =
      actualSalesVal > 0
        ? ((inStoreTotal / actualSalesVal) * 100).toFixed(0)
        : "0";

    const grabVal = parseFloat(v.grabfood) || 0;
    const linemanVal = parseFloat(v.lineman) || 0;
    const shopeeVal = parseFloat(v.shopee) || 0;
    const bkappVal = parseFloat(v.bkapp) || 0;
    const robinVal = parseFloat(v.robin) || 0;
    const gokooVal = parseFloat(v.gokoo) || 0;
    const deliveryTotal = grabVal + linemanVal + shopeeVal + bkappVal + robinVal + gokooVal;
    const grabPercent =
      actualSalesVal > 0
        ? ((grabVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const linemanPercent =
      actualSalesVal > 0
        ? ((linemanVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const shopeePercent =
      actualSalesVal > 0
        ? ((shopeeVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const bkappPercent =
      actualSalesVal > 0
        ? ((bkappVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const robinPercent =
      actualSalesVal > 0
        ? ((robinVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const gokooPercent =
      actualSalesVal > 0
        ? ((gokooVal / actualSalesVal) * 100).toFixed(0)
        : "0";
    const deliveryTotalPercent =
      actualSalesVal > 0
        ? ((deliveryTotal / actualSalesVal) * 100).toFixed(0)
        : "0";

    const wasteDailyTotalVal = parseFloat(v.wasteDailyTotal) || 0;
    const wasteMealDailyVal = parseFloat(v.wasteMealDaily) || 0;
    const wasteRawDailyVal = wasteDailyTotalVal - wasteMealDailyVal;

    const wasteMtdTotalVal = parseFloat(v.wasteMtdTotal) || 0;
    const wasteMealMtdVal = parseFloat(v.wasteMealMtd) || 0;
    const wasteRawMtdVal = wasteMtdTotalVal - wasteMealMtdVal;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    };

    const dailyTargetVal = parseFloat(v.dailyTarget) || 0;
    const wasteDailyPercent = actualSalesVal > 0 ? ((wasteDailyTotalVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const wasteMtdPercent = mtdActualVal > 0 ? ((wasteMtdTotalVal / mtdActualVal) * 100).toFixed(2) : "0.00";
    
    const actualHoursVal = parseFloat(v.actualHours) || 0;
    const otHoursVal = parseFloat(v.otHours) || 0;
    const workHour = (actualHoursVal + otHoursVal).toFixed(1);

    const managerLines = MANAGER_NAMES.map(m => {
      const shift = v[m.key as keyof typeof v] || "";
      return shift ? `${m.name}: ${shift}` : null;
    }).filter(Boolean).join("\n");

    const reportText = `🗓️${formatDate(v.reportDate)}

💵Daily Sales=${actualSalesVal.toLocaleString()}/${dailyTargetVal.toLocaleString()}
MTD Sale=${mtdActualVal.toLocaleString()}/${mtdTargetVal.toLocaleString()}

👨‍👩‍👧‍👦Daily TC =${tcVal.toLocaleString()}
👨‍👩‍👧‍👦MTD TC =${mtdTcVal.toLocaleString()}
👑 Daily TA =${taVal}
👑 MTD TA =${mtdTaVal}

🍽 Dinein :${dineInVal.toLocaleString()}/${dineInPercent}%
🛍Takeaway :${takeAwayVal.toLocaleString()}/${takeAwayPercent}%
🛵Delivery :${deliveryTotal.toLocaleString()}/${deliveryTotalPercent}%

🛵Grab Food :${grabVal.toLocaleString()}/${grabPercent}%
🛵Line Man :${linemanVal.toLocaleString()}/${linemanPercent}%
🛵Shopeefood:${shopeeVal.toLocaleString()}/${shopeePercent}%
🛵BK App:${bkappVal.toLocaleString()}/${bkappPercent}%
🛵Robin:${robinVal.toLocaleString()}/${robinPercent}%
🛵GoKOO:${gokooVal.toLocaleString()}/${gokooPercent}%

🏃🏻‍♀️SOS =${v.sosDaily || "0"}
🏃🏻MTD SOS =${v.sosMtd || "0"}

🗑WasteDaily :${wasteDailyTotalVal.toLocaleString()}/${wasteDailyPercent}%
🗑WasteMTD:${wasteMtdTotalVal.toLocaleString()}/${wasteMtdPercent}%

🕰Work Hour :${workHour}

📝OSAT:${v.osat || "0"}

👨‍💼 Roster Manager
${managerLines || v.managerRosterText || ""}

👥 Roster Staff
${v.staffRosterText || ""}

📝 Report by ${v.reportBy}`;

    navigator.clipboard
      .writeText(reportText)
      .then(() => {
        toast({
          title: language === "th" ? "คัดลอกสำเร็จ" : "Copied",
          description:
            language === "th"
              ? "คัดลอกรายงานไปยังคลิปบอร์ดแล้ว"
              : "Report copied to clipboard",
        });
      })
      .catch(() => {
        toast({
          title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
          description:
            language === "th" ? "ไม่สามารถคัดลอกได้" : "Failed to copy",
          variant: "destructive",
        });
      });
  };

  const handleCopyNewReport = () => {
    const v = form.getValues();
    const actualSalesVal = parseFloat(v.actualSales?.replace(/,/g, "") || "0") || 0;
    const tcVal = parseInt(v.transactionCount) || 0;
    const taVal = tcVal > 0 ? Math.round(actualSalesVal / tcVal) : 0;
    const dailyTargetVal = parseFloat(v.dailyTarget?.replace(/,/g, "") || "0") || 0;
    const dailyVariance = actualSalesVal - dailyTargetVal;

    const mtdActualVal = parseFloat(v.mtdActual?.replace(/,/g, "") || "0") || 0;
    const mtdTargetVal = parseFloat(v.mtdTarget?.replace(/,/g, "") || "0") || 0;
    const mtdVariance = mtdActualVal - mtdTargetVal;
    const mtdTcVal = parseInt(v.mtdTc) || 0;
    const mtdTaVal = mtdTcVal > 0 ? Math.round(mtdActualVal / mtdTcVal) : 0;

    const dineInVal = parseFloat(v.dineIn?.replace(/,/g, "") || "0") || 0;
    const dineInTcVal = parseInt(v.dineInTc || "0") || 0;
    const takeAwayVal = parseFloat(v.takeAway?.replace(/,/g, "") || "0") || 0;
    const takeAwayTcVal = parseInt(v.takeAwayTc || "0") || 0;
    const inStoreTotal = dineInVal + takeAwayVal;

    const grabVal = parseFloat(v.grabfood?.replace(/,/g, "") || "0") || 0;
    const linemanVal = parseFloat(v.lineman?.replace(/,/g, "") || "0") || 0;
    const shopeeVal = parseFloat(v.shopee?.replace(/,/g, "") || "0") || 0;
    const bkappVal = parseFloat(v.bkapp?.replace(/,/g, "") || "0") || 0;
    const robinVal = parseFloat(v.robin?.replace(/,/g, "") || "0") || 0;
    const gokooVal = parseFloat(v.gokoo?.replace(/,/g, "") || "0") || 0;
    const deliveryTotal = grabVal + linemanVal + shopeeVal + bkappVal + robinVal + gokooVal;

    const pct2 = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(2) : "0.00";
    const fmtNum = (n: number) => n.toLocaleString("en-US");
    const fmtVariance = (n: number) => (n >= 0 ? "+" : "") + fmtNum(Math.round(n));
    const fmtMtdVariance = (n: number) => (n >= 0 ? "+฿" : "-฿") + fmtNum(Math.abs(Math.round(n)));

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    };

    const osatVal = v.osat || "0";
    const surveyCountVal = v.surveyCount || "0";
    const voidAmountVal = parseFloat(v.voidAmount?.replace(/,/g, "") || "0") || 0;
    const voidCountVal = v.voidCount || "0";
    const addCheeseCountVal = parseInt(v.addCheeseCount || "0") || 0;
    const vMealCountVal = parseInt(v.vMealCount || "0") || 0;
    const upSizeCountVal = parseInt(v.upSizeCount || "0") || 0;

    const colPct = parseFloat(v.colPercent || "0") || 0;
    const actualHoursVal = parseFloat(v.actualHours?.replace(/,/g, "") || "0") || 0;
    const otHoursVal = parseFloat(v.otHours?.replace(/,/g, "") || "0") || 0;
    const tcmhVal = parseFloat(v.tcmh || "0") || 0;
    const sosDailyVal = v.sosDaily || "0";
    const sosMtdVal = v.sosMtd || "0";

    const wasteDailyTotalVal = parseFloat(v.wasteDailyTotal?.replace(/,/g, "") || "0") || 0;
    const wasteMtdTotalVal = parseFloat(v.wasteMtdTotal?.replace(/,/g, "") || "0") || 0;

    const managerRosterDateStr = v.managerRosterDate ? formatDate(v.managerRosterDate) : formatDate(v.reportDate);
    const managerLines = MANAGER_NAMES.map(m => {
      const shift = v[m.key as keyof typeof v] || "";
      return shift ? `${m.name}: ${shift}` : null;
    }).filter(Boolean).join("\n");

    const deliveryLines: string[] = [
      `🛵 Grab: ${fmtNum(grabVal)}/${pct2(grabVal, actualSalesVal)}%`,
      `🛵 LINE MAN: ${fmtNum(linemanVal)}/${pct2(linemanVal, actualSalesVal)}%`,
      `🛵 Shoppee Food: ${fmtNum(shopeeVal)}/${pct2(shopeeVal, actualSalesVal)}%`,
      `🛵 BK App/Web: ${fmtNum(bkappVal)}/${pct2(bkappVal, actualSalesVal)}%`,
    ];
    if (robinVal > 0) deliveryLines.push(`🛵 Robin: ${fmtNum(robinVal)}/${pct2(robinVal, actualSalesVal)}%`);
    if (gokooVal > 0) deliveryLines.push(`🛵 GoKOO: ${fmtNum(gokooVal)}/${pct2(gokooVal, actualSalesVal)}%`);

    const reportText = [
      `💎 Daily Sales Report 💎`,
      `Grand Diamond`,
      `Date: ${formatDate(v.reportDate)}`,
      `========================`,
      ``,
      `📊 Daily`,
      `💰 TG: ${fmtNum(dailyTargetVal)}`,
      `💵 AC: ${fmtNum(actualSalesVal)}`,
      `📉 Variance: ${fmtVariance(dailyVariance)}`,
      `👥 TC: ${fmtNum(tcVal)}`,
      `🧾 TA: ${fmtNum(taVal)}`,
      ``,
      `📈 MTD`,
      `💰 MTD TG: ${fmtNum(mtdTargetVal)}`,
      `💵 MTD AC: ${fmtNum(mtdActualVal)}`,
      `📉 Variance: ${fmtMtdVariance(mtdVariance)}`,
      `👥 MTD TC: ${fmtNum(mtdTcVal)}`,
      `🧾 MTD TA: ${fmtNum(mtdTaVal)}`,
      ``,
      `🏪 Restaurant`,
      `🍽️ Dine In: ${fmtNum(dineInVal)}/${pct2(dineInVal, actualSalesVal)}%`,
      `TC: ${dineInTcVal}`,
      `🥡 Take Away: ${fmtNum(takeAwayVal)}/${pct2(takeAwayVal, actualSalesVal)}%`,
      `TC: ${takeAwayTcVal}`,
      `🏪 In Store Total: ${fmtNum(inStoreTotal)}/${pct2(inStoreTotal, actualSalesVal)}%`,
      ``,
      `🛵 DELIVERY`,
      ...deliveryLines,
      `📦 Delivery Total: ${fmtNum(deliveryTotal)}/${pct2(deliveryTotal, actualSalesVal)}%`,
      ``,
      `========================`,
      ``,
      `⭐ OSAT: ${osatVal}`,
      `📋 Survey count: ${surveyCountVal}`,
      `❌ Void: -฿${voidAmountVal.toFixed(2)}`,
      `📋 count: ${voidCountVal} Bill`,
      `🧀 Add Cheese: ${addCheeseCountVal}/${pct2(addCheeseCountVal, tcVal)}%`,
      `🍔 V-meal: ${vMealCountVal}/${pct2(vMealCountVal, tcVal)}%`,
      `🥤 Up Size: ${upSizeCountVal}/${pct2(upSizeCountVal, tcVal)}%`,
      ``,
      `========================`,
      `👷 COL: ${colPct.toFixed(2)}%`,
      `⏰ Hour: ${actualHoursVal.toFixed(2)}`,
      `🕒 OT: ${otHoursVal > 0 ? otHoursVal.toFixed(2) : ""}`,
      `📊 TCMH = ${tcmhVal.toFixed(2)}`,
      `🚀 SOS Daily: ${sosDailyVal}`,
      `📈 SOS MTD: ${sosMtdVal}`,
      `========================`,
      `🗑️ WASTE`,
      `Daily: ${wasteDailyTotalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${pct2(wasteDailyTotalVal, actualSalesVal)}%`,
      `MTD: ${wasteMtdTotalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${pct2(wasteMtdTotalVal, mtdActualVal)}%`,
      `========================`,
      ``,
      `📅 Manager Roster`,
      `Date: ${managerRosterDateStr}`,
      managerLines || v.managerRosterText || "",
      ``,
      `👥 Roster Staff`,
      v.staffRosterText || "",
      ``,
      `📝 Report by ${v.reportBy}`,
    ].join("\n");

    navigator.clipboard
      .writeText(reportText)
      .then(() => {
        toast({
          title: language === "th" ? "💎 คัดลอกรายงานรูปแบบใหม่แล้ว" : "💎 New format copied",
          description: language === "th" ? "คัดลอกรายงาน Grand Diamond ไปยังคลิปบอร์ดแล้ว" : "Grand Diamond report copied to clipboard",
        });
      })
      .catch(() => {
        toast({
          title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
          description: language === "th" ? "ไม่สามารถคัดลอกได้" : "Failed to copy",
          variant: "destructive",
        });
      });
  };

  const actualSales = parseFloat(form.watch("actualSales") || "0");
  const grabSales = parseFloat(form.watch("grabfood") || "0");
  const linemanSales = parseFloat(form.watch("lineman") || "0");
  const shopeeSales = parseFloat(form.watch("shopee") || "0");
  const bkappSales = parseFloat(form.watch("bkapp") || "0");

  const deliveryTotal = grabSales + linemanSales + shopeeSales + bkappSales;
  const deliveryPercent =
    actualSales > 0 ? (deliveryTotal / actualSales) * 100 : 0;

  const transactionCount = parseInt(form.watch("transactionCount") || "0");
  const avgTransaction =
    transactionCount > 0
      ? Math.round(actualSales / transactionCount).toString()
      : "0";

  const mtdActual = parseFloat(form.watch("mtdActual") || "0");
  const mtdTc = parseInt(form.watch("mtdTc") || "0");
  const mtdTa = mtdTc > 0 ? Math.round(mtdActual / mtdTc).toString() : "0";
  const mtdTarget = parseFloat(form.watch("mtdTarget") || "0");
  const mtdVariance = mtdActual - mtdTarget;

  const addCheeseCount = parseInt(form.watch("addCheeseCount") || "0");
  const vMealCount = parseInt(form.watch("vMealCount") || "0");
  const upSizeCount = parseInt(form.watch("upSizeCount") || "0");

  const wasteDailyTotal = parseFloat(form.watch("wasteDailyTotal") || "0");
  const wasteMealDaily = parseFloat(form.watch("wasteMealDaily") || "0");
  const wasteRawDaily = wasteDailyTotal - wasteMealDaily;
  const wasteMtdTotal = parseFloat(form.watch("wasteMtdTotal") || "0");
  const wasteMealMtd = parseFloat(form.watch("wasteMealMtd") || "0");
  const wasteRawMtd = wasteMtdTotal - wasteMealMtd;

  // --- Watch labor input fields ---
  const recommendHoursInput = parseFloat(form.watch("recommendHours") || "0");
  const rosterCommitInput = parseFloat(form.watch("rosterCommit") || "0");
  const actualHoursInput = parseFloat(form.watch("actualHours") || "0");
  const otHoursInput = parseFloat(form.watch("otHours") || "0");
  const closeShiftCountInput = parseInt(form.watch("closeShiftCount") || "0") || 0;

  // --- Compute labor metrics directly (for instant display) ---
  const { dutyDailyHours, ptWageRate, fixedCostDaily, closeShiftDailyCost } = laborSettings;
  
  // Summary Hours = Actual + OT only (ไม่รวมชั่วโมงทีมผู้จัดการตามที่ user ต้องการ)
  const computedSummaryHours = actualHoursInput + otHoursInput;
  
  // PT hours (Actual + OT) for cost calculation
  const ptHours = actualHoursInput + otHoursInput;
  
  // Total hours including duty for labor cost calculation only
  const totalHoursForCost = dutyDailyHours + actualHoursInput + otHoursInput;
  
  // Labor Cost Total = Total Hours (including duty) × PPH + fixed daily costs + (ค่าปิดร้าน/คน × จำนวนคน)
  const computedLaborCost = totalHoursForCost * ptWageRate + fixedCostDaily + (closeShiftDailyCost * closeShiftCountInput);
  
  // COL% = Labor Cost / Sales * 100
  const computedColPercent = actualSales > 0 ? (computedLaborCost / actualSales) * 100 : 0;
  
  // TCMH = TC / Summary Hours (ไม่รวมชั่วโมงทีมผู้จัดการ)
  const computedTcmh = computedSummaryHours > 0 ? transactionCount / computedSummaryHours : 0;
  
  // Variance Hours = Summary Hours - Roster Commit
  const computedVarianceHours = computedSummaryHours - rosterCommitInput;

  // --- Sync computed values to form for saving ---
  const prevComputedRef = useRef({ summaryHours: "", varianceHours: "", laborCost: "", colPercent: "", tcmh: "" });
  useEffect(() => {
    const newVals = {
      summaryHours: computedSummaryHours.toFixed(2),
      varianceHours: computedVarianceHours.toFixed(2),
      laborCost: computedLaborCost.toFixed(2),
      colPercent: computedColPercent.toFixed(2),
      tcmh: computedTcmh.toFixed(2),
    };
    const prev = prevComputedRef.current;
    if (
      prev.summaryHours === newVals.summaryHours &&
      prev.varianceHours === newVals.varianceHours &&
      prev.laborCost === newVals.laborCost &&
      prev.colPercent === newVals.colPercent &&
      prev.tcmh === newVals.tcmh
    ) return;
    prevComputedRef.current = newVals;
    form.setValue("summaryHours", newVals.summaryHours, { shouldDirty: false });
    form.setValue("varianceHours", newVals.varianceHours, { shouldDirty: false });
    form.setValue("laborCost", newVals.laborCost, { shouldDirty: false });
    form.setValue("laborHour", newVals.summaryHours, { shouldDirty: false });
    form.setValue("colPercent", newVals.colPercent, { shouldDirty: false });
    form.setValue("tcmh", newVals.tcmh, { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSummaryHours, computedLaborCost, computedColPercent, computedTcmh, computedVarianceHours]);

  // Auto-calculate Add-on percentages when count values change
  const prevAddonsRef = useRef({ addCheese: "", vMeal: "", upSize: "" });
  useEffect(() => {
    if (transactionCount > 0) {
      const newAddCheese = ((addCheeseCount / transactionCount) * 100).toFixed(2);
      const newVMeal = ((vMealCount / transactionCount) * 100).toFixed(2);
      const newUpSize = ((upSizeCount / transactionCount) * 100).toFixed(2);
      const prev = prevAddonsRef.current;
      if (prev.addCheese === newAddCheese && prev.vMeal === newVMeal && prev.upSize === newUpSize) return;
      prevAddonsRef.current = { addCheese: newAddCheese, vMeal: newVMeal, upSize: newUpSize };
      form.setValue("addCheesePercent", newAddCheese, { shouldDirty: true });
      form.setValue("vMealPercent", newVMeal, { shouldDirty: true });
      form.setValue("upSizePercent", newUpSize, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCheeseCount, vMealCount, upSizeCount, transactionCount]);

  const handleAutoCalculateAddons = () => {
    const divisor = customAddonDivisor
      ? parseFloat(customAddonDivisor)
      : transactionCount;
    if (divisor > 0) {
      form.setValue(
        "addCheesePercent",
        ((addCheeseCount / divisor) * 100).toFixed(2),
      );
      form.setValue("vMealPercent", ((vMealCount / divisor) * 100).toFixed(2));
      form.setValue(
        "upSizePercent",
        ((upSizeCount / divisor) * 100).toFixed(2),
      );
      toast({
        title: language === "th" ? "คำนวณสำเร็จ" : "Calculated",
        description:
          language === "th"
            ? `คำนวณเปอร์เซ็นต์ Add-on จากตัวหาร ${divisor} แล้ว`
            : `Add-on percentages calculated with divisor ${divisor}`,
      });
    } else {
      toast({
        title: language === "th" ? "ไม่สามารถคำนวณได้" : "Cannot calculate",
        description:
          language === "th"
            ? "กรุณากรอกตัวหารหรือ TC ก่อน"
            : "Please enter divisor or TC first",
        variant: "destructive",
      });
    }
    setAddonDialogOpen(false);
  };

  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteDate, setPasteDate] = useState(todayBangkok());

  const parseLineReport = (text: string) => {
    const stripped = text.replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{200D}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu, "").replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
    const clean = (s: string) => s.replace(/,/g, "").trim();
    const num = (s: string) => {
      const v = clean(s);
      const n = parseFloat(v);
      return isNaN(n) ? "0" : String(n);
    };

    const parsed: Record<string, string> = {};

    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [, d, m, y] = dateMatch;
      parsed.reportDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const salesMatch = stripped.match(/Daily\s*Sales\s*[=:]\s*([\d,.]+)\s*\/\s*([\d,.]+)/i);
    if (salesMatch) {
      parsed.actualSales = num(salesMatch[1]);
      parsed.dailyTarget = num(salesMatch[2]);
    }

    const mtdSaleMatch = stripped.match(/MTD\s*Sale[s]?\s*[=:]\s*([\d,.]+)\s*\/\s*([\d,.]+)/i);
    if (mtdSaleMatch) {
      parsed.mtdActual = num(mtdSaleMatch[1]);
      parsed.mtdTarget = num(mtdSaleMatch[2]);
    }

    const dailyTcMatch = stripped.match(/Daily\s*TC\s*[=:]\s*([\d,.]+)/i);
    if (dailyTcMatch) parsed.transactionCount = num(dailyTcMatch[1]);

    const mtdTcMatch = stripped.match(/MTD\s*TC\s*[=:]\s*([\d,.]+)/i);
    if (mtdTcMatch) parsed.mtdTc = num(mtdTcMatch[1]);

    const dineInMatch = stripped.match(/Dine\s*[-]?\s*in\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d,.]+))?/i);
    if (dineInMatch) {
      parsed.dineIn = num(dineInMatch[1]);
      if (dineInMatch[2]) parsed.dineInTc = num(dineInMatch[2]);
    }

    const takeawayMatch = stripped.match(/Take\s*[-]?\s*away\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d,.]+))?/i);
    if (takeawayMatch) {
      parsed.takeAway = num(takeawayMatch[1]);
      if (takeawayMatch[2]) parsed.takeAwayTc = num(takeawayMatch[2]);
    }

    const grabMatch = stripped.match(/Grab\s*(?:Food)?\s*[=:]\s*([\d,.]+)/i);
    if (grabMatch) parsed.grabfood = num(grabMatch[1]);

    const linemanMatch = stripped.match(/Line\s*[-]?\s*Man\s*[=:]\s*([\d,.]+)/i);
    if (linemanMatch) parsed.lineman = num(linemanMatch[1]);

    const shopeeMatch = stripped.match(/Shopee\s*(?:food)?\s*[=:]\s*([\d,.]+)/i);
    if (shopeeMatch) parsed.shopee = num(shopeeMatch[1]);

    const bkappMatch = stripped.match(/(?:BK\s*App|1112)\s*[=:]\s*([\d,.]+)/i);
    if (bkappMatch) parsed.bkapp = num(bkappMatch[1]);

    const robinMatch = stripped.match(/Robin\s*[=:]\s*([\d,.]+)/i);
    if (robinMatch) parsed.robin = num(robinMatch[1]);

    const gokooMatch = stripped.match(/Go\s*KOO\s*[=:]\s*([\d,.]+)/i);
    if (gokooMatch) parsed.gokoo = num(gokooMatch[1]);

    const sosDailyMatch = stripped.match(/(?:^|\n)[^M\n]*SOS\s*[=:]\s*([\d,.]+)/im);
    if (sosDailyMatch) parsed.sosDaily = num(sosDailyMatch[1]);

    const sosMtdMatch = stripped.match(/MTD\s*SOS\s*[=:]\s*([\d,.]+)/i);
    if (sosMtdMatch) parsed.sosMtd = num(sosMtdMatch[1]);

    const wasteDailyMatch = stripped.match(/Waste\s*Daily\s*[=:]\s*([\d,.]+)/i);
    if (wasteDailyMatch) parsed.wasteDailyTotal = num(wasteDailyMatch[1]);

    const wasteMtdMatch = stripped.match(/Waste\s*MTD\s*[=:]\s*([\d,.]+)/i);
    if (wasteMtdMatch) parsed.wasteMtdTotal = num(wasteMtdMatch[1]);

    const workHourMatch = stripped.match(/Work\s*Hour\s*[=:]\s*([\d,.]+)/i);
    if (workHourMatch) parsed.actualHours = num(workHourMatch[1]);

    const osatMatch = stripped.match(/OSAT\s*[=:]\s*([\d,.]+)/i);
    if (osatMatch) {
      parsed.osat = num(osatMatch[1]);
    }

    const managerNames = ["Phongsathon", "Nuttarika", "Boonyisa", "Chanon", "Washiraphan"];
    const normalizeShift = (raw: string) => {
      let s = raw.trim().replace(/\./g, ":");
      s = s.replace(/24:00/g, "00:00");
      s = s.replace(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/, (_, h1, m1, h2, m2) =>
        `${h1.padStart(2,"0")}:${m1}-${h2.padStart(2,"0")}:${m2}`
      );
      return s;
    };
    for (const name of managerNames) {
      const mgrMatch = stripped.match(new RegExp(name + "\\s*[=:]\\s*([\\d.:]+\\s*-\\s*[\\d.:]+|OFF|COM|Vacation|QSNCC)", "i"));
      if (mgrMatch) {
        const val = normalizeShift(mgrMatch[1]);
        const key = `manager${name}` as string;
        parsed[key] = val;
      }
    }

    const rosterTomorrowMatch = stripped.match(/(?:Roster\s*(?:Tomorrow|Staff|พนักงาน)|Staff\s*Roster)\s*([\s\S]*?)(?:\n\s*\n|$)/i);
    let rosterBlock = rosterTomorrowMatch ? rosterTomorrowMatch[1].trim() : "";
    if (!rosterBlock) {
      const allLines = stripped.split("\n");
      const managerNamesSet = new Set(managerNames.map(n => n.toLowerCase()));
      const rosterLines: string[] = [];
      for (const line of allLines) {
        const trimmed = line.trim();
        const tm = trimmed.match(/([\d.:]+\s*-\s*[\d.:]+)\s*[=:|]\s*(.+)/);
        if (tm) {
          const namesPart = tm[2].trim().split(/[\s,|]+/);
          const isManager = namesPart.every(n => managerNamesSet.has(n.toLowerCase()));
          if (!isManager) {
            rosterLines.push(trimmed);
          }
        }
      }
      if (rosterLines.length >= 2) {
        rosterBlock = rosterLines.join("\n");
      }
    }
    if (rosterBlock) {
      const lines = rosterBlock.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const staffEntries: Array<{ shiftGroup: string; staffName: string; customStart?: string; customEnd?: string }> = [];
      const knownShifts = ["07:00-16:00","09:00-18:00","10:00-19:00","11:00-20:00","12:00-21:00","13:00-22:00","14:00-23:00","15:00-00:00","18:00-00:00","19:00-04:00","21:00-06:00","22:00-07:00"];
      for (const line of lines) {
        const timeMatch = line.match(/([\d.:]+\s*-\s*[\d.:]+)\s*[=:|]\s*(.+)/);
        if (timeMatch) {
          const normalizedTime = normalizeShift(timeMatch[1]);
          const names = timeMatch[2].trim().split(/[\s,|]+/);
          for (const name of names) {
            if (!name.trim()) continue;
            if (knownShifts.includes(normalizedTime)) {
              staffEntries.push({ shiftGroup: normalizedTime, staffName: name.trim() });
            } else {
              const parts = normalizedTime.split("-");
              staffEntries.push({ shiftGroup: "CUSTOM", staffName: name.trim(), customStart: parts[0], customEnd: parts[1] });
            }
          }
        }
      }
      if (staffEntries.length > 0) {
        parsed._staffRosterEntries = JSON.stringify(staffEntries);
      }
    }

    const reportByMatch = stripped.match(/Report\s*by\s+(\S+)/i);
    if (reportByMatch) parsed.reportBy = reportByMatch[1];

    return parsed;
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      toast({ variant: "destructive", title: language === "th" ? "กรุณาวางข้อความ" : "Please paste text" });
      return;
    }

    const parsed = parseLineReport(pasteText);

    if (pasteDate) {
      parsed.reportDate = pasteDate;
    }

    let staffRosterParsed = false;
    if (parsed._staffRosterEntries) {
      try {
        const entries = JSON.parse(parsed._staffRosterEntries);
        if (entries.length > 0) {
          setStaffRosterEntries(entries);
          staffRosterParsed = true;
        }
      } catch {}
      delete parsed._staffRosterEntries;
    }

    Object.entries(parsed).forEach(([key, value]) => {
      form.setValue(key as any, value, { shouldDirty: true });
    });

    markAsChanged();

    const fieldCount = Object.keys(parsed).length + (staffRosterParsed ? 1 : 0);
    toast({
      title: language === "th" ? "นำเข้าข้อมูลสำเร็จ" : "Data imported successfully",
      description: language === "th"
        ? `กรอกข้อมูล ${fieldCount} ช่องอัตโนมัติ`
        : `Auto-filled ${fieldCount} fields`,
    });

    setPasteDialogOpen(false);
    setPasteText("");
  };

  const t = {
    formTitle: language === "th" ? "สรุปยอดรายวัน" : "Daily Sales Report",
    formSubtitle:
      language === "th" ? "กรอกข้อมูลยอดขายประจำวัน" : "Enter daily sales data",
    basicInfo: language === "th" ? "ข้อมูลพื้นฐาน" : "Basic Information",
    date: language === "th" ? "วันที่" : "Date",
    reporter: language === "th" ? "ผู้รายงาน" : "Reporter",
    shift: language === "th" ? "กะ" : "Shift",
    daily: language === "th" ? "รายวัน" : "Daily",
    target: language === "th" ? "เป้า (TG)" : "Target (TG)",
    actual: language === "th" ? "ยอดจริง (AC)" : "Actual (AC)",
    tc: "TC",
    ta: "TA",
    mtd: "MTD",
    mtdTarget: language === "th" ? "MTD เป้า" : "MTD Target",
    mtdActual: language === "th" ? "MTD ยอดจริง" : "MTD Actual",
    variance: language === "th" ? "ส่วนต่าง" : "Variance",
    mtdTc: "MTD TC",
    mtdTa: "MTD TA",
    inStore: "In Store",
    dineIn: "Dine In",
    dineInTc: "Dine In TC",
    takeAway: "Take Away",
    takeAwayTc: "Take Away TC",
    delivery: "Delivery",
    grabfood: "Grab",
    lineman: "LINE MAN",
    shopee: "Shopee Food",
    bkapp: "BK App/Web",
    performance: language === "th" ? "ประสิทธิภาพ" : "Performance",
    osat: "OSAT",
    surveyCount: language === "th" ? "จำนวน Survey" : "Survey Count",
    void: "Void",
    voidCount: language === "th" ? "Void (Bill)" : "Void Count",
    sos: "SOS",
    sosDaily: "Daily SOS",
    sosMtd: "MTD SOS",
    addons: "Add-ons",
    addCheese: "Add Cheese",
    vMeal: "V-meal",
    upSize: "Up Size",
    waste: "Waste",
    wasteDaily: language === "th" ? "รายวัน" : "Daily",
    wasteMtd: "MTD",
    raw: "Raw",
    meal: "Meal",
    labor: "Labor",
    col: "COL %",
    hour: language === "th" ? "ชั่วโมง" : "Hour",
    tcmh: "TCMH",
    roster: "Roster",
    managerRosterDate:
      language === "th" ? "วันที่ Roster ผู้จัดการ" : "Manager Roster Date",
    managerRoster: language === "th" ? "Roster ผู้จัดการ" : "Manager Roster",
    staffRoster: language === "th" ? "Roster พนักงาน" : "Staff Roster",
    unsavedDraft: language === "th" ? "มีข้อมูลค้างอยู่" : "Unsaved draft",
    autoSaved: language === "th" ? "บันทึกแล้ว" : "Auto saved",
    clearForm: language === "th" ? "ล้างข้อมูล" : "Clear",
    copyReport: language === "th" ? "คัดลอกรายงาน" : "Copy Report",
    saveReport: language === "th" ? "บันทึก" : "Save",
    formula: language === "th" ? "สูตรคำนวณ" : "Formula",
    autoCalculate: language === "th" ? "คำนวณอัตโนมัติ" : "Auto Calculate",
    divisor: language === "th" ? "ตัวหาร" : "Divisor",
    currentValues: language === "th" ? "ค่าปัจจุบัน" : "Current Values",
    shiftFull: language === "th" ? "ทั้งวัน" : "Full Day",
    shiftMorning: language === "th" ? "เช้า" : "Morning",
    shiftEvening: language === "th" ? "เย็น" : "Evening",
  };

  const dailyDueBanner = (() => {
    const now = new Date();
    const bangkokStr = now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const bangkokDate = new Date(bangkokStr);
    const hour = bangkokDate.getHours();
    if (hour >= 20) return null;
    const yesterday = new Date(bangkokDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const dd = String(yesterday.getDate()).padStart(2, "0");
    const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
    const yyyy = yesterday.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  })();

  return (
    <SalesLayout>
      <div className="space-y-6 pb-20">
        <AreaLockBanner />
        {dailyDueBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            <span className="text-lg">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                📋 ต้องส่งรายงานวันที่ {dailyDueBanner}
              </p>
              <p className="text-xs opacity-75 mt-0.5">กรุณาส่งรายงานประจำวันภายใน 20:00 น.</p>
            </div>
            <span className="text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-full whitespace-nowrap">ก่อน 20:00</span>
          </div>
        )}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl font-semibold">
                    {t.formTitle}
                  </CardTitle>
                  <p className="text-muted-foreground text-xs md:text-sm mt-1">
                    {t.formSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hasDraft && (
                  <Badge variant="secondary" className="text-xs">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse mr-1" />
                    {t.unsavedDraft}
                  </Badge>
                )}
                {isSavingToServer && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>
                      {language === "th" ? "กำลังบันทึก..." : "Saving..."}
                    </span>
                  </div>
                )}
                {showAutoSave && !isSavingToServer && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{t.autoSaved}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.basicInfo}
                    </h3>
                    <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          data-testid="button-paste-line-report"
                        >
                          <ClipboardPaste className="w-4 h-4" />
                          {language === "th" ? "วางข้อมูล LINE" : "Paste LINE Report"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>
                            {language === "th" ? "วางข้อมูลจาก LINE" : "Paste LINE Report"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              {language === "th" ? "เลือกวันที่" : "Select Date"}
                            </label>
                            <Input
                              type="date"
                              value={pasteDate}
                              onChange={(e) => setPasteDate(e.target.value)}
                              className="text-sm"
                              data-testid="input-paste-date"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              {language === "th" ? "วางข้อความรายงานจาก LINE" : "Paste report text from LINE"}
                            </label>
                            <Textarea
                              value={pasteText}
                              onChange={(e) => setPasteText(e.target.value)}
                              placeholder={language === "th"
                                ? "วางข้อความรายงาน LINE ที่นี่...\nเช่น:\n💵Daily Sales=150,000/110,000\n👨‍👩‍👧‍👦Daily TC =450"
                                : "Paste LINE report text here..."}
                              rows={12}
                              className="text-sm font-mono"
                              data-testid="textarea-paste-line"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setPasteDialogOpen(false)}
                              data-testid="button-paste-cancel"
                            >
                              {language === "th" ? "ยกเลิก" : "Cancel"}
                            </Button>
                            <Button
                              type="button"
                              onClick={handlePasteImport}
                              className="gap-1"
                              data-testid="button-paste-import"
                            >
                              <ClipboardPaste className="w-4 h-4" />
                              {language === "th" ? "นำเข้าข้อมูล" : "Import Data"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      type="button"
                      onClick={() => toggleSection("basicInfo")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-basicInfo"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["basicInfo"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${collapsedSections["basicInfo"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="reportDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs md:text-sm">
                            {t.date}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="text-sm"
                              {...field}
                              data-testid="input-report-date"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reportBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs md:text-sm">
                            {t.reporter}
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="text-sm"
                              placeholder={t.reporter}
                              {...field}
                              data-testid="input-reporter"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.daily}
                    </h3>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => {
                        const values = form.getValues();
                        if (!values.reportDate || !values.reportBy) {
                          toast({
                            variant: "destructive",
                            title:
                              language === "th"
                                ? "กรุณากรอกวันที่และผู้รายงาน"
                                : "Please fill date and reporter",
                          });
                          return;
                        }
                        saveToServer(values);
                        toast({
                          title:
                            language === "th"
                              ? "บันทึก AC/TC สำเร็จ"
                              : "AC/TC saved successfully",
                        });
                      }}
                      data-testid="button-save-daily"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      {language === "th" ? "บันทึก" : "Save"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => toggleSection("daily")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-daily"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["daily"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${collapsedSections["daily"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="dailyTarget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.target}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                ฿
                              </span>
                              <FormattedInput
                                className="pl-6 text-sm bg-muted cursor-not-allowed"
                                {...field}
                                readOnly
                                data-testid="input-daily-target"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualSales"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.actual}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                ฿
                              </span>
                              <FormattedInput
                                className="pl-6 text-sm"
                                {...field}
                                data-testid="input-actual-sales"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transactionCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.tc}</FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                              data-testid="input-tc"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.ta}</FormLabel>
                      <Input
                        value={avgTransaction}
                        readOnly
                        tabIndex={-1}
                        className="bg-muted text-sm pointer-events-none focus-visible:ring-0"
                        data-testid="input-ta"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="cashDeposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cash Deposit (฿)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">฿</span>
                              <FormattedInput
                                className="pl-6 text-sm"
                                {...field}
                                data-testid="input-cash-deposit"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.mtd}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSection("mtd")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-mtd"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["mtd"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${collapsedSections["mtd"] ? "hidden" : ""}`}>
                    <div>
                      <FormLabel className="text-xs">{t.mtdTarget}</FormLabel>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ฿
                        </span>
                        <Input
                          value={mtdTarget.toLocaleString()}
                          readOnly
                          tabIndex={-1}
                          className="pl-6 text-sm bg-muted pointer-events-none focus-visible:ring-0"
                          data-testid="display-mtd-target"
                        />
                      </div>
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.mtdActual}</FormLabel>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ฿
                        </span>
                        <Input
                          value={mtdActual.toLocaleString()}
                          readOnly
                          tabIndex={-1}
                          className="pl-6 text-sm bg-muted pointer-events-none focus-visible:ring-0"
                          data-testid="display-mtd-actual"
                        />
                      </div>
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.variance}</FormLabel>
                      <Input
                        value={`${mtdVariance >= 0 ? "+" : ""}${mtdVariance.toLocaleString()}`}
                        readOnly
                        tabIndex={-1}
                        className={`text-sm pointer-events-none focus-visible:ring-0 ${mtdVariance >= 0 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.mtdTc}</FormLabel>
                      <Input
                        value={mtdTc.toLocaleString()}
                        readOnly
                        tabIndex={-1}
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-mtd-tc"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.mtdTa}</FormLabel>
                      <Input
                        value={mtdTa}
                        readOnly
                        tabIndex={-1}
                        className="bg-muted text-sm pointer-events-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.inStore}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSection("inStore")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-inStore"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["inStore"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${collapsedSections["inStore"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="dineIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.dineIn} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-dine-in"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dineInTc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.dineInTc}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.dineIn} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("dineIn") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-dine-in-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="takeAway"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.takeAway} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-take-away"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="takeAwayTc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.takeAwayTc}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.takeAway} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("takeAway") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-take-away-percent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.delivery}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Total</p>
                        <p className="text-sm font-bold text-primary">฿{deliveryTotal.toLocaleString()}</p>
                      </div>
                      <div className="text-right border-l pl-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">%</p>
                        <p className="text-sm font-bold text-primary">{deliveryPercent.toFixed(2)}%</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection("delivery")}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        data-testid="button-toggle-delivery"
                      >
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["delivery"] ? "-rotate-90" : ""}`} />
                      </button>
                    </div>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${collapsedSections["delivery"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="grabfood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.grabfood} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-grab"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.grabfood} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("grabfood") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-grab-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="lineman"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.lineman} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-lineman"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.lineman} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("lineman") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-lineman-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="shopee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.shopee} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-shopee"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.shopee} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("shopee") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-shopee-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="bkapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.bkapp} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-bkapp"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">{t.bkapp} %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("bkapp") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-bkapp-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="robin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Robin (฿)</FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-robin"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">Robin %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("robin") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-robin-percent"
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="gokoo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">GoKOO (฿)</FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-gokoo"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">GoKOO %</FormLabel>
                      <Input
                        value={
                          actualSales > 0
                            ? (
                                (parseFloat(form.watch("gokoo") || "0") /
                                  actualSales) *
                                100
                              ).toFixed(2)
                            : "0.00"
                        }
                        readOnly
                        className="bg-muted text-sm"
                        data-testid="display-gokoo-percent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.performance}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSection("performance")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-performance"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["performance"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${collapsedSections["performance"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="osat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.osat}</FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-osat"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="surveyCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.surveyCount}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="voidAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.void} (฿)
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-void"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="voidCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.voidCount}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sosDaily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.sosDaily}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-sos-daily"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sosMtd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.sosMtd}
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              {...field}
                              data-testid="input-sos-mtd"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-pink-50 dark:bg-pink-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.addons}
                    </h3>
                    <Dialog
                      open={addonDialogOpen}
                      onOpenChange={setAddonDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <Calculator className="w-3 h-3 mr-1" />
                          {t.formula}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {language === "th"
                              ? "สูตรคำนวณ Add-on %"
                              : "Add-on % Formula"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">
                              {language === "th"
                                ? "สูตรการคำนวณ:"
                                : "Calculation Formula:"}
                            </p>
                            <p className="text-muted-foreground">
                              Add Cheese % = (Add Cheese # / {t.divisor}) x 100
                            </p>
                            <p className="text-muted-foreground">
                              V-meal % = (V-meal # / {t.divisor}) x 100
                            </p>
                            <p className="text-muted-foreground">
                              Up Size % = (Up Size # / {t.divisor}) x 100
                            </p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">
                              {language === "th"
                                ? "แก้ไขตัวหาร:"
                                : "Edit Divisor:"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {t.divisor} =
                              </span>
                              <Input
                                type="number"
                                value={
                                  customAddonDivisor ||
                                  transactionCount.toString()
                                }
                                onChange={(e) =>
                                  setCustomAddonDivisor(e.target.value)
                                }
                                className="w-24 text-sm"
                                placeholder={transactionCount.toString()}
                              />
                              <span className="text-xs text-muted-foreground">
                                (
                                {language === "th"
                                  ? "ค่าเริ่มต้น: TC"
                                  : "Default: TC"}
                                )
                              </span>
                            </div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">{t.currentValues}</p>
                            <p>TC = {transactionCount}</p>
                            {(() => {
                              const divisor = customAddonDivisor
                                ? parseFloat(customAddonDivisor)
                                : transactionCount;
                              return (
                                <>
                                  <p>
                                    Add Cheese # = {addCheeseCount} ={" "}
                                    {divisor > 0
                                      ? (
                                          (addCheeseCount / divisor) *
                                          100
                                        ).toFixed(2)
                                      : "0.00"}
                                    %
                                  </p>
                                  <p>
                                    V-meal # = {vMealCount} ={" "}
                                    {divisor > 0
                                      ? ((vMealCount / divisor) * 100).toFixed(
                                          2,
                                        )
                                      : "0.00"}
                                    %
                                  </p>
                                  <p>
                                    Up Size # = {upSizeCount} ={" "}
                                    {divisor > 0
                                      ? ((upSizeCount / divisor) * 100).toFixed(
                                          2,
                                        )
                                      : "0.00"}
                                    %
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                          <Button
                            type="button"
                            onClick={handleAutoCalculateAddons}
                            className="w-full"
                          >
                            <Calculator className="w-4 h-4 mr-2" />
                            {t.autoCalculate}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      type="button"
                      onClick={() => toggleSection("addons")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-addons"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["addons"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-6 gap-3 ${collapsedSections["addons"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="addCheeseCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.addCheese} #
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="addCheesePercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.addCheese} %
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="text-sm bg-muted"
                              readOnly
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vMealCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.vMeal} #</FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vMealPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.vMeal} %</FormLabel>
                          <FormControl>
                            <Input
                              className="text-sm bg-muted"
                              readOnly
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="upSizeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.upSize} #
                          </FormLabel>
                          <FormControl>
                            <FormattedInput
                              className="text-sm"
                              allowDecimals={false}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="upSizePercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.upSize} %
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="text-sm bg-muted"
                              readOnly
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.waste}
                    </h3>
                    <Dialog
                      open={wasteDialogOpen}
                      onOpenChange={setWasteDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <Calculator className="w-3 h-3 mr-1" />
                          {t.formula}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {language === "th"
                              ? "สูตรคำนวณ Waste %"
                              : "Waste % Formula"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">
                              {language === "th"
                                ? "สูตรการคำนวณ Daily:"
                                : "Daily Calculation Formula:"}
                            </p>
                            <p className="text-muted-foreground">
                              Daily % = (Daily / AC) x 100
                            </p>
                            <p className="text-muted-foreground">
                              Meal % = (Meal / AC) x 100
                            </p>
                            <p className="text-muted-foreground">
                              Raw % = (Raw / AC) x 100
                            </p>
                          </div>
                          <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                            <p className="font-medium">
                              {language === "th"
                                ? "สูตรการคำนวณ MTD:"
                                : "MTD Calculation Formula:"}
                            </p>
                            <p className="text-muted-foreground">
                              MTD % = (MTD / MTD AC) x 100
                            </p>
                            <p className="text-muted-foreground">
                              Meal % = (Meal / MTD AC) x 100
                            </p>
                            <p className="text-muted-foreground">
                              Raw % = (Raw / MTD AC) x 100
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300">
                              {language === "th" ? "หมายเหตุ:" : "Note:"}
                            </p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Daily - Meal = Raw
                            </p>
                            <p className="text-blue-600 dark:text-blue-400">
                              MTD - Meal = Raw
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {language === "th"
                                ? "% คำนวณอัตโนมัติ"
                                : "% is auto-calculated"}
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      type="button"
                      onClick={() => toggleSection("waste")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-waste"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["waste"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${collapsedSections["waste"] ? "hidden" : ""}`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          {t.wasteDaily}
                        </h4>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            const values = form.getValues();
                            if (!values.reportDate || !values.reportBy) {
                              toast({
                                variant: "destructive",
                                title:
                                  language === "th"
                                    ? "กรุณากรอกวันที่และผู้รายงาน"
                                    : "Please fill date and reporter",
                              });
                              return;
                            }
                            saveToServer(values);
                            toast({
                              title:
                                language === "th"
                                  ? "บันทึก Daily Waste สำเร็จ"
                                  : "Daily Waste saved successfully",
                            });
                          }}
                          data-testid="button-save-waste"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {language === "th" ? "บันทึก" : "Save"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="wasteDailyTotal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Daily (฿)
                              </FormLabel>
                              <FormControl>
                                <FormattedInput
                                  className="text-sm"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div>
                          <FormLabel className="text-xs">Daily %</FormLabel>
                          <Input
                            value={
                              actualSales > 0
                                ? (
                                    (wasteDailyTotal / actualSales) *
                                    100
                                  ).toFixed(2)
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="wasteMealDaily"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t.meal} (฿)
                              </FormLabel>
                              <FormControl>
                                <FormattedInput
                                  className="text-sm"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div>
                          <FormLabel className="text-xs">{t.meal} %</FormLabel>
                          <Input
                            value={
                              actualSales > 0
                                ? (
                                    (wasteMealDaily / actualSales) *
                                    100
                                  ).toFixed(2)
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <div>
                          <FormLabel className="text-xs">{t.raw} (฿)</FormLabel>
                          <Input
                            value={wasteRawDaily.toFixed(2)}
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <div>
                          <FormLabel className="text-xs">{t.raw} %</FormLabel>
                          <Input
                            value={
                              actualSales > 0
                                ? ((wasteRawDaily / actualSales) * 100).toFixed(
                                    2,
                                  )
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        {t.wasteMtd}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="wasteMtdTotal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">MTD (฿)</FormLabel>
                              <FormControl>
                                <FormattedInput
                                  className="text-sm"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div>
                          <FormLabel className="text-xs">MTD %</FormLabel>
                          <Input
                            value={
                              mtdActual > 0
                                ? ((wasteMtdTotal / mtdActual) * 100).toFixed(2)
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="wasteMealMtd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t.meal} (฿)
                              </FormLabel>
                              <FormControl>
                                <FormattedInput
                                  className="text-sm"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div>
                          <FormLabel className="text-xs">{t.meal} %</FormLabel>
                          <Input
                            value={
                              mtdActual > 0
                                ? ((wasteMealMtd / mtdActual) * 100).toFixed(2)
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <div>
                          <FormLabel className="text-xs">{t.raw} (฿)</FormLabel>
                          <Input
                            value={wasteRawMtd.toFixed(2)}
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                        <div>
                          <FormLabel className="text-xs">{t.raw} %</FormLabel>
                          <Input
                            value={
                              mtdActual > 0
                                ? ((wasteRawMtd / mtdActual) * 100).toFixed(2)
                                : "0.00"
                            }
                            readOnly
                            className="bg-muted text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.labor}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSection("labor")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-labor"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["labor"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${collapsedSections["labor"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="recommendHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {language === "th" ? "ชม.แนะนำ" : "Recommend Hrs"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="decimal"
                              className="text-sm"
                              data-testid="input-recommend-hours"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rosterCommit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {language === "th" ? "Roster Commit" : "Roster Commit"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="decimal"
                              className="text-sm"
                              data-testid="input-roster-commit"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {language === "th" ? "ชม.จริง" : "Actual Hrs"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="decimal"
                              className="text-sm"
                              data-testid="input-actual-hours"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {language === "th" ? "OT ชม." : "OT Hrs"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="decimal"
                              className="text-sm"
                              data-testid="input-ot-hours"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="closeShiftCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {language === "th" ? "คนปิดร้าน" : "Close Shift (ppl)"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              className="text-sm"
                              data-testid="input-close-shift-count"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-xs">OT MTD</FormLabel>
                      <Input
                        value={form.watch("otMtd") || "0"}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-ot-mtd"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">
                        {language === "th" ? "รวมชม." : "Summary Hrs"}
                      </FormLabel>
                      <Input
                        value={computedSummaryHours.toFixed(2)}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-summary-hours"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">
                        {language === "th" ? "ส่วนต่างชม." : "Variance Hrs"}
                      </FormLabel>
                      <Input
                        value={computedVarianceHours.toFixed(2)}
                        readOnly
                        className={`text-sm pointer-events-none focus-visible:ring-0 ${computedVarianceHours >= 0 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}
                        data-testid="display-variance-hours"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.labor} Cost</FormLabel>
                      <Input
                        value={computedLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-labor-cost"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.col}</FormLabel>
                      <Input
                        value={computedColPercent.toFixed(2) + "%"}
                        readOnly
                        className={`text-sm pointer-events-none focus-visible:ring-0 ${computedColPercent <= 25 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}
                        data-testid="display-col-percent"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.tcmh}</FormLabel>
                      <Input
                        value={computedTcmh.toFixed(2)}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-tcmh"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/30 p-3 md:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {t.roster}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSection("roster")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      data-testid="button-toggle-roster"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["roster"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`space-y-4 ${collapsedSections["roster"] ? "hidden" : ""}`}>
                    <FormField
                      control={form.control}
                      name="managerRosterDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.managerRosterDate}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" className="text-sm" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="text-xs mb-2 block">
                        {t.managerRoster}
                      </FormLabel>
                      <div className="space-y-2">
                        {MANAGER_NAMES.map((manager) => (
                          <div
                            key={manager.key}
                            className="flex items-center gap-2"
                          >
                            <span className="text-sm min-w-[100px]">
                              {manager.name}:
                            </span>
                            <FormField
                              control={form.control}
                              name={manager.key as keyof FormData}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger
                                    className="flex-1 text-sm"
                                    data-testid={`select-${manager.key}`}
                                  >
                                    <SelectValue
                                      placeholder={
                                        language === "th"
                                          ? "เลือกกะ"
                                          : "Select shift"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SHIFT_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-xs">
                          {t.staffRoster}
                        </FormLabel>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={addStaffEntry}
                          className="gap-1"
                          data-testid="button-add-staff-entry"
                        >
                          <Plus className="w-3 h-3" />
                          {language === "th" ? "เพิ่ม" : "Add"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {staffRosterEntries.map((entry, index) => (
                          <div key={index} className="flex flex-wrap items-center gap-2">
                            <Select
                              value={entry.shiftGroup}
                              onValueChange={(v) =>
                                updateStaffEntry(index, "shiftGroup", v)
                              }
                            >
                              <SelectTrigger
                                className="w-[100px] text-sm"
                                data-testid={`select-staff-shift-${index}`}
                              >
                                <SelectValue
                                  placeholder={
                                    language === "th" ? "กลุ่มกะ" : "Shift"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {STAFF_SHIFT_GROUPS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {entry.shiftGroup === "CUSTOM" && (
                              <>
                                <Select
                                  value={entry.customStart || "08:00"}
                                  onValueChange={(v) =>
                                    updateStaffEntry(index, "customStart", v)
                                  }
                                >
                                  <SelectTrigger className="w-[70px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HOUR_OPTIONS.map((h) => (
                                      <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-xs">-</span>
                                <Select
                                  value={entry.customEnd || "16:00"}
                                  onValueChange={(v) =>
                                    updateStaffEntry(index, "customEnd", v)
                                  }
                                >
                                  <SelectTrigger className="w-[70px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HOUR_OPTIONS.map((h) => (
                                      <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            <Input
                              value={entry.staffName}
                              onChange={(e) =>
                                updateStaffEntry(
                                  index,
                                  "staffName",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                language === "th" ? "ชื่อเล่น" : "Nickname"
                              }
                              className="flex-1 min-w-[100px] text-sm"
                              data-testid={`input-staff-name-${index}`}
                            />
                            {staffRosterEntries.length > 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeStaffEntry(index)}
                                data-testid={`button-remove-staff-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="managerRosterText"
                      render={({ field }) => <input type="hidden" {...field} />}
                    />
                    <FormField
                      control={form.control}
                      name="staffRosterText"
                      render={({ field }) => <input type="hidden" {...field} />}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearForm}
                    className="gap-2"
                    data-testid="button-clear-form"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.clearForm}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCopyReport}
                    className="gap-2"
                    data-testid="button-copy-report"
                  >
                    <Copy className="w-4 h-4" />
                    {language === "th"
                      ? "คัดลอก (ไม่บันทึก DB)"
                      : "Copy (No DB Save)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyNewReport}
                    className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-950"
                    data-testid="button-copy-new-report"
                  >
                    <Copy className="w-4 h-4" />
                    💎 {language === "th" ? "คัดลอก (Grand Diamond)" : "Copy (Grand Diamond)"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveReport}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-save-report"
                    disabled={areaLocked}
                  >
                    <Save className="w-4 h-4" />
                    {language === "th" ? "บันทึกลงฐานข้อมูล" : "Save to DB"}
                  </Button>
                  {isManager && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendLineReport}
                      disabled={isSendingLineReport}
                      className="gap-2 border-green-400 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400"
                      data-testid="button-send-line-report"
                    >
                      {isSendingLineReport
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <MessageSquare className="w-4 h-4" />}
                      ส่ง Daily Report ไป LINE
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}