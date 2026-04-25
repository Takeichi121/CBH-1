import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useAreaLock } from "@/hooks/use-area-lock";
import { AreaLockBanner } from "@/components/area-lock-banner";
import { todayBangkok, yesterdayBangkok, cn } from "@/lib/utils";
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
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Pencil,
  RefreshCw,
} from "lucide-react";
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
import { Link } from "wouter";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  managerSuppawit: z.string().default(""),
  managerBoonyisa: z.string().default(""),
  managerChanon: z.string().default(""),
  managerWashiraphan: z.string().default(""),

  // Section guide notes (admin-editable)
  noteDaily: z.string().optional().default(""),
  noteMtd: z.string().optional().default(""),
  noteInStore: z.string().optional().default(""),
  noteDelivery: z.string().optional().default(""),
  notePerformance: z.string().optional().default(""),
  noteAddons: z.string().optional().default(""),
});

const MANAGER_NAMES = [
  { key: "managerPhongsathon", name: "Phongsathon" },
  { key: "managerNuttarika", name: "Nuttarika" },
  { key: "managerSuppawit", name: "Suppawit" },
  { key: "managerBoonyisa", name: "Boonyisa" },
  { key: "managerChanon", name: "Chanon" },
  { key: "managerWashiraphan", name: "Washiraphan" },
] as const;

const DEFAULT_SHIFT_OPTIONS = [
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
  { value: "SICK", label: "SICK" },
  { value: "COM", label: "COM" },
  { value: "Vacation", label: "Vacation" },
  { value: "QSNCC", label: "QSNCC" },
  { value: "Training", label: "Training" },
];

const getShiftDisplayName = (shiftGroup: string): string => {
  switch (shiftGroup?.toLowerCase()) {
    case "open": return "Open";
    case "lunch": return "Lunch";
    case "swing": return "Swing";
    case "dinner": return "Dinner";
    case "close": return "Close";
    case "late": return "Late Night";
    case "com": return "COM";
    case "off": return "OFF";
    case "meeting_manager": return "MM";
    case "meeting_zone": return "ZM";
    case "other": return "OTHER";
    case "sick": return "SICK";
    default: return shiftGroup || "–";
  }
};

const getShiftBadgeClass = (shiftGroup: string): string => {
  switch (shiftGroup?.toLowerCase()) {
    case "open": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "lunch": return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
    case "swing": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "dinner": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "close": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
    case "late": return "bg-slate-700 text-slate-100 dark:bg-slate-600 dark:text-slate-100";
    case "com": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "off": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    case "meeting_manager": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "meeting_zone": return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300";
    case "sick": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
};

interface ShiftLogRow {
  username: string;
  nickName: string | null;
  fullName: string | null;
  shiftGroup: string;
  startTime: string | null;
  endTime: string | null;
}

interface ShiftLogResponse {
  ok: boolean;
  date: string;
  total: number;
  byGroup: Record<string, number>;
  shifts: ShiftLogRow[];
  message?: string;
}

const DEFAULT_STAFF_SHIFT_GROUPS = [
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
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

type FormData = z.infer<typeof formSchema>;

interface SectionNoteProps {
  value: string;
  onChange: (v: string) => void;
  isAdmin: boolean;
  testId: string;
}

function SectionNote({ value, onChange, isAdmin, testId }: SectionNoteProps) {
  if (isAdmin) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="เพิ่มคำแนะนำ..."
        className="ml-2 flex-1 min-w-0 text-xs bg-transparent border-0 border-b border-dashed border-muted-foreground/40 focus:border-muted-foreground/80 focus:outline-none text-muted-foreground placeholder:text-muted-foreground/50 py-0 px-0"
        data-testid={testId}
      />
    );
  }
  if (!value) return null;
  return (
    <span
      className="ml-2 text-xs text-muted-foreground italic truncate"
      data-testid={testId}
    >
      {value}
    </span>
  );
}

interface FieldDescProps {
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  isAdmin: boolean;
}

function FieldDesc({ fieldKey, value, onChange, isAdmin }: FieldDescProps) {
  if (isAdmin) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="คำอธิบาย..."
        className="block w-full text-xs text-muted-foreground bg-transparent border-0 border-b border-dashed border-muted-foreground/30 focus:border-muted-foreground/70 focus:outline-none placeholder:text-muted-foreground/30 mt-0.5 py-px"
        data-testid={`field-desc-${fieldKey}`}
      />
    );
  }
  if (!value) return null;
  return (
    <span
      className="block text-xs text-muted-foreground italic mt-0.5"
      data-testid={`field-desc-${fieldKey}`}
    >
      {value}
    </span>
  );
}

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
  const isAdmin = user?.role === "admin";
  const { isAreaUser, isUnlocked } = useAreaLock();
  const areaLocked = isAreaUser && !isUnlocked;

  // Field descriptions — admin-editable, stored in config table
  const [fieldDescs, setFieldDescs] = useState<Record<string, string>>({});
  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: fieldDescsData } = useQuery({
    queryKey: ["/api/settings/get-field-descriptions"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/get-field-descriptions", { token });
      return res.json();
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (fieldDescsData?.descriptions) {
      setFieldDescs(fieldDescsData.descriptions);
    }
  }, [fieldDescsData]);

  const saveDescMutation = useMutation({
    mutationFn: async (descriptions: Record<string, string>) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/save-field-descriptions", { token, descriptions });
      return res.json();
    },
  });

  // Report card customization (admin-editable section titles + visibility)
  const { data: reportCustomData } = useQuery({
    queryKey: ["/api/settings/get-report-customization"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/get-report-customization", { token });
      return res.json();
    },
    staleTime: 60000,
  });
  const sectionCustom: Record<string, { title?: string; hidden?: boolean }> = reportCustomData?.sections || {};
  const sectionTitle = (key: string, defaultTitle: string) => sectionCustom[key]?.title || defaultTitle;
  const sectionHiddenClass = (key: string) => (sectionCustom[key]?.hidden && !isAdmin ? "hidden" : "");
  const fieldCustom: Record<string, { label?: string; hidden?: boolean }> = reportCustomData?.fields || {};
  const fLabel = (key: string, defaultLabel: ReactNode): ReactNode =>
    fieldCustom[key]?.label ? fieldCustom[key]!.label : defaultLabel;
  const fItemCls = (key: string) => (fieldCustom[key]?.hidden && !isAdmin ? "hidden" : "");

  const handleDescChange = useCallback((fieldKey: string, value: string) => {
    setFieldDescs(prev => {
      const next = { ...prev, [fieldKey]: value };
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
      descDebounceRef.current = setTimeout(() => {
        saveDescMutation.mutate(next);
      }, 800);
      return next;
    });
  }, [saveDescMutation]);

  // Unlock today's report after 22:00 Bangkok time
  const bangkokHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }));
  const isAfter10PM = bangkokHour >= 22;
  const maxAllowedDate = isAfter10PM ? todayBangkok() : yesterdayBangkok();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportDate: yesterdayBangkok(),
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
      managerSuppawit: "",
      managerBoonyisa: "",
      managerChanon: "",
      managerWashiraphan: "",

      noteDaily: "",
      noteMtd: "",
      noteInStore: "",
      noteDelivery: "",
      notePerformance: "",
      noteAddons: "",
    },
  });

  const [staffList, setStaffList] = useState<
    Array<{ username: string; nickName?: string; fullName?: string }>
  >([]);
  const [staffRosterEntries, setStaffRosterEntries] = useState<
    Array<{ shiftGroup: string; staffName: string; customStart?: string; customEnd?: string }>
  >([{ shiftGroup: "", staffName: "", customStart: "08:00", customEnd: "16:00" }]);
  const [customManagerMode, setCustomManagerMode] = useState<Record<string, boolean>>({});
  const [shiftOptions, setShiftOptions] = useState(DEFAULT_SHIFT_OPTIONS);
  const [staffShiftGroups, setStaffShiftGroups] = useState(DEFAULT_STAFF_SHIFT_GROUPS);
  const [openNicknamePopover, setOpenNicknamePopover] = useState<number | null>(null);
  const [nicknameSearch, setNicknameSearch] = useState("");

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
  const [reportSavedInDb, setReportSavedInDb] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const saveToServer = useCallback(async (values: FormData) => {
    if (!values.reportDate || !values.reportBy) return;
    // Compute at call-time to avoid stale closure (e.g., page opened before 22:00)
    const _hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }));
    const _maxDate = _hour >= 22 ? todayBangkok() : yesterdayBangkok();
    if (values.reportDate > _maxDate) return;

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
      managerSuppawit: _ms2,
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
        // Don't save reportDate into draft — it causes cross-date data bleed
        const { reportDate: _rd, ...draftValues } = values as any;
        saveData(draftValues);
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
        if (!isLoadingRef.current && (!reportSavedInDb || isEditMode)) {
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
  }, [debouncedSave, debouncedServerSave, markAsChanged, reportSavedInDb, isEditMode]);

  useEffect(() => {
    const restored = restoreData();
    if (!restored) return;

    // If draft has a date that doesn't match yesterday, discard it to prevent cross-date data bleed
    if ((restored as any).reportDate && (restored as any).reportDate !== yesterdayBangkok()) {
      clearData();
      return;
    }

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
              "managerSuppawit",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State for default target from settings
  const [defaultDailyTarget, setDefaultDailyTarget] = useState("250000");
  const [isReloadingTarget, setIsReloadingTarget] = useState(false);

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
    const loadDropdownOptions = async () => {
      try {
        const [shiftRes, staffShiftRes] = await Promise.all([
          fetch("/api/dropdown-options/manager_shift"),
          fetch("/api/dropdown-options/staff_shift"),
        ]);
        const shiftData = await shiftRes.json();
        const staffShiftData = await staffShiftRes.json();
        if (shiftData.ok && shiftData.options.length > 0) {
          setShiftOptions(shiftData.options
            .filter((o: { isActive: boolean }) => o.isActive)
            .map((o: { value: string; label: string }) => ({ value: o.value, label: o.label })));
        }
        if (staffShiftData.ok && staffShiftData.options.length > 0) {
          setStaffShiftGroups(staffShiftData.options
            .filter((o: { isActive: boolean }) => o.isActive)
            .map((o: { value: string; label: string }) => ({ value: o.value, label: o.label })));
        }
      } catch (error) {
        console.error("Failed to load dropdown options:", error);
      }
    };
    loadStoreSettings();
    loadLaborSettings();
    loadStaffList();
    loadDropdownOptions();
  }, []);

  // Sync rosterCommit from laborSettings when it loads (handles race with date effect)
  useEffect(() => {
    if (!reportSavedInDb) {
      form.setValue("rosterCommit", String(laborSettings.rosterHours || 88));
    }
  }, [laborSettings.rosterHours]);

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
  const managerSuppawit = form.watch("managerSuppawit");
  const managerBoonyisa = form.watch("managerBoonyisa");
  const managerChanon = form.watch("managerChanon");
  const managerWashiraphan = form.watch("managerWashiraphan");

  useEffect(() => {
    const lines = [];
    if (managerPhongsathon) lines.push(`Phongsathon: ${managerPhongsathon}`);
    if (managerNuttarika) lines.push(`Nuttarika: ${managerNuttarika}`);
    if (managerSuppawit) lines.push(`Suppawit: ${managerSuppawit}`);
    if (managerBoonyisa) lines.push(`Boonyisa: ${managerBoonyisa}`);
    if (managerChanon) lines.push(`Chanon: ${managerChanon}`);
    if (managerWashiraphan) lines.push(`Washiraphan: ${managerWashiraphan}`);
    form.setValue("managerRosterText", lines.join("\n"));
  }, [
    managerPhongsathon,
    managerNuttarika,
    managerSuppawit,
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
  const watchedRosterDate = form.watch("managerRosterDate") || reportDate;

  const rosterLogQuery = useQuery<ShiftLogResponse | null>({
    queryKey: ["/api/shift-count-for-date", watchedRosterDate],
    queryFn: async () => {
      if (!watchedRosterDate) return null;
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/shift-count-for-date", { token, date: watchedRosterDate });
      return res.json() as Promise<ShiftLogResponse>;
    },
    enabled: !!watchedRosterDate,
  });

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

  // Shared helper — fetch daily target for a date, set form value, and reset rosterCommit for new reports.
  // Used by both the initial date-change effect and the manual "Load from Settings" button.
  // customFallback overrides the in-memory defaultDailyTarget (used when caller has freshly fetched settings).
  const fetchAndApplyDailyTarget = useCallback(async (date: string, hasSavedReport: boolean, customFallback?: string) => {
    const token = localStorage.getItem("bk_token");
    const targetRes = await apiRequest("POST", "/api/sales/getDailyTargetForDate", { token, date });
    const targetData = await targetRes.json();
    const fallback = customFallback ?? defaultDailyTarget;
    const target = (targetData.ok && targetData.target)
      ? (targetData.target.targetSales || fallback)
      : fallback;
    form.setValue("dailyTarget", target);
    if (!hasSavedReport) {
      form.setValue("rosterCommit", String(laborSettings.rosterHours || 88));
    }
  }, [defaultDailyTarget, laborSettings.rosterHours, form]);

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
        setReportSavedInDb(false);
        setIsEditMode(false);

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
          managerSuppawit: "",
          managerBoonyisa: "",
          managerChanon: "",
          managerWashiraphan: "",
          managerRosterText: "",
          staffRosterText: "",
          workShift: "full",
          noteDaily: "",
          noteMtd: "",
          noteInStore: "",
          noteDelivery: "",
          notePerformance: "",
          noteAddons: "",
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

          // Load section guide notes
          form.setValue("noteDaily", r.noteDaily || "");
          form.setValue("noteMtd", r.noteMtd || "");
          form.setValue("noteInStore", r.noteInStore || "");
          form.setValue("noteDelivery", r.noteDelivery || "");
          form.setValue("notePerformance", r.notePerformance || "");
          form.setValue("noteAddons", r.noteAddons || "");

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
                    "managerSuppawit",
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
          setReportSavedInDb(true);
          setIsEditMode(false);
        } else {
          setReportSavedInDb(false);
          setIsEditMode(true);
        }

        // Load daily target + conditionally reset rosterCommit via shared helper
        const hasSavedReport = !!(existingData.ok && existingData.report);
        await fetchAndApplyDailyTarget(reportDate, hasSavedReport);

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
  }, [reportDate, fetchAndApplyDailyTarget]);

  // Button handler — fetches fresh store settings first, then reloads target via shared helper
  const reloadTargetFromSettings = useCallback(async () => {
    if (!reportDate) return;
    setIsReloadingTarget(true);
    try {
      const token = localStorage.getItem("bk_token");
      // Fetch latest settings so fallback reflects any mid-month target changes
      const settingsRes = await apiRequest("POST", "/api/sales/getSettings", { token });
      const settingsData = await settingsRes.json();
      const freshDefault = (settingsData.ok && settingsData.settings?.dailyTarget)
        ? settingsData.settings.dailyTarget
        : defaultDailyTarget;
      // Update in-memory state so subsequent date navigations also use the fresh value
      if (settingsData.ok && settingsData.settings?.dailyTarget) {
        setDefaultDailyTarget(settingsData.settings.dailyTarget);
      }
      await fetchAndApplyDailyTarget(reportDate, reportSavedInDb, freshDefault);
    } catch (e) {
      console.error("Failed to reload target from settings:", e);
    } finally {
      setIsReloadingTarget(false);
    }
  }, [reportDate, reportSavedInDb, defaultDailyTarget, fetchAndApplyDailyTarget]);

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
        setReportSavedInDb(true);
        setIsEditMode(false);
        queryClient.invalidateQueries({ queryKey: ["/api/shift-count-for-date"] });
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

  const buildGrandDiamondText = useCallback((v: any): string => {
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

    return reportText;
  }, []);

  const watchedAllValues = form.watch();
  const dailyPreviewText = useMemo(
    () => buildGrandDiamondText(watchedAllValues),
    [watchedAllValues, buildGrandDiamondText],
  );

  const handleCopyNewReport = () => {
    const reportText = buildGrandDiamondText(form.getValues());
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
    const clean = (s: string) => s.replace(/,/g, "").replace(/฿/g, "").replace(/-/g, "").trim();
    const num = (s: string) => {
      const v = clean(s);
      const n = parseFloat(v);
      return isNaN(n) ? "0" : String(n);
    };
    const numAbs = (s: string) => {
      const v = s.replace(/,/g, "").replace(/฿/g, "").replace(/-/g, "").trim();
      const n = parseFloat(v);
      return isNaN(n) ? "0" : String(n);
    };

    const parsed: Record<string, string> = {};

    const normalizeShift = (raw: string) => {
      let s = raw.trim().replace(/\./g, ":");
      s = s.replace(/24:00/g, "00:00");
      s = s.replace(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/, (_, h1, m1, h2, m2) =>
        `${h1.padStart(2,"0")}:${m1}-${h2.padStart(2,"0")}:${m2}`
      );
      return s;
    };

    const toISO = (d: string, m: string, y: string) =>
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

    const lines = text.split("\n");
    const strippedLines = stripped.split("\n");

    let inManagerRoster = false;
    let foundFirstDate = false;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const s = strippedLines[i] || "";
      const dateInLine = raw.match(/Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
      if (dateInLine) {
        const iso = toISO(dateInLine[1], dateInLine[2], dateInLine[3]);
        if (!foundFirstDate) {
          parsed.reportDate = iso;
          foundFirstDate = true;
        } else if (inManagerRoster) {
          parsed.managerRosterDate = iso;
        }
      }
      const inlineDate = raw.match(/(?<!Date:.*?)(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (inlineDate && !dateInLine && !foundFirstDate) {
        parsed.reportDate = toISO(inlineDate[1], inlineDate[2], inlineDate[3]);
        foundFirstDate = true;
      }
      if (/Manager\s*Roster/i.test(s)) inManagerRoster = true;
    }

    if (!foundFirstDate) {
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        parsed.reportDate = toISO(dateMatch[1], dateMatch[2], dateMatch[3]);
      }
    }

    const salesMatch = stripped.match(/Daily\s*Sales\s*[=:]\s*([\d,.]+)\s*\/\s*([\d,.]+)/i);
    if (salesMatch) {
      parsed.actualSales = num(salesMatch[1]);
      parsed.dailyTarget = num(salesMatch[2]);
    }

    if (!parsed.actualSales) {
      const acMatch = stripped.match(/\bAC\s*[=:]\s*([\d,.]+)/i);
      if (acMatch) parsed.actualSales = num(acMatch[1]);
    }
    if (!parsed.dailyTarget) {
      const tgMatch = stripped.match(/\bTG\s*[=:]\s*([\d,.]+)/i);
      if (tgMatch) parsed.dailyTarget = num(tgMatch[1]);
    }

    const mtdSaleMatch = stripped.match(/MTD\s*Sale[s]?\s*[=:]\s*([\d,.]+)\s*\/\s*([\d,.]+)/i);
    if (mtdSaleMatch) {
      parsed.mtdActual = num(mtdSaleMatch[1]);
      parsed.mtdTarget = num(mtdSaleMatch[2]);
    }
    if (!parsed.mtdTarget) {
      const mtdTgMatch = stripped.match(/MTD\s*TG\s*[=:]\s*([\d,.]+)/i);
      if (mtdTgMatch) parsed.mtdTarget = num(mtdTgMatch[1]);
    }
    if (!parsed.mtdActual) {
      const mtdAcMatch = stripped.match(/MTD\s*AC\s*[=:]\s*([\d,.]+)/i);
      if (mtdAcMatch) parsed.mtdActual = num(mtdAcMatch[1]);
    }

    const dailyTcMatch = stripped.match(/Daily\s*TC\s*[=:]\s*([\d,.]+)/i);
    if (dailyTcMatch) parsed.transactionCount = num(dailyTcMatch[1]);

    if (!parsed.transactionCount) {
      const tcDailyBlock = stripped.match(/\bDaily\b[\s\S]{0,200}?\bTC\s*[=:]\s*([\d,.]+)/i);
      if (tcDailyBlock) parsed.transactionCount = num(tcDailyBlock[1]);
    }

    if (!parsed.transactionCount) {
      const tcLines = strippedLines;
      for (let i = 0; i < tcLines.length; i++) {
        if (/\bTA\s*[=:]\s*[\d,.]+/.test(tcLines[i])) {
          for (let j = i - 5; j <= i + 5; j++) {
            if (j >= 0 && j < tcLines.length && j !== i) {
              const m = tcLines[j].match(/\bTC\s*[=:]\s*([\d,.]+)/i);
              if (m && !parsed.transactionCount) {
                parsed.transactionCount = num(m[1]);
              }
            }
          }
          break;
        }
      }
    }

    const mtdTcMatch = stripped.match(/MTD\s*TC\s*[=:]\s*([\d,.]+)/i);
    if (mtdTcMatch) parsed.mtdTc = num(mtdTcMatch[1]);

    for (let i = 0; i < strippedLines.length; i++) {
      const ln = strippedLines[i];
      const dineInLine = ln.match(/Dine\s*[-]?\s*In\s*[=:]\s*([\d,.]+)/i);
      if (dineInLine) {
        parsed.dineIn = num(dineInLine[1]);
        for (let j = i + 1; j <= Math.min(i + 3, strippedLines.length - 1); j++) {
          const tcLine = strippedLines[j].match(/\bTC\s*[=:]\s*([\d,.]+)/i);
          if (tcLine) { parsed.dineInTc = num(tcLine[1]); break; }
        }
      }
      const takeawayLine = ln.match(/Take\s*[-]?\s*[Aa]way\s*[=:]\s*([\d,.]+)/i);
      if (takeawayLine) {
        parsed.takeAway = num(takeawayLine[1]);
        for (let j = i + 1; j <= Math.min(i + 3, strippedLines.length - 1); j++) {
          const tcLine = strippedLines[j].match(/\bTC\s*[=:]\s*([\d,.]+)/i);
          if (tcLine) { parsed.takeAwayTc = num(tcLine[1]); break; }
        }
      }
    }

    if (!parsed.dineIn) {
      const dineInMatch = stripped.match(/Dine\s*[-]?\s*[Ii]n\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d,.]+))?/i);
      if (dineInMatch) {
        parsed.dineIn = num(dineInMatch[1]);
        if (dineInMatch[2]) parsed.dineInTc = num(dineInMatch[2]);
      }
    }
    if (!parsed.takeAway) {
      const takeawayMatch = stripped.match(/Take\s*[-]?\s*[Aa]way\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d,.]+))?/i);
      if (takeawayMatch) {
        parsed.takeAway = num(takeawayMatch[1]);
        if (takeawayMatch[2]) parsed.takeAwayTc = num(takeawayMatch[2]);
      }
    }

    const grabMatch = stripped.match(/Grab\s*(?:Food)?\s*[=:]\s*([\d,.]+)/i);
    if (grabMatch) parsed.grabfood = num(grabMatch[1]);

    const linemanMatch = stripped.match(/Line\s*[-]?\s*Man\s*[=:]\s*([\d,.]+)/i);
    if (linemanMatch) parsed.lineman = num(linemanMatch[1]);

    const shopeeMatch = stripped.match(/Shop+ee\s*(?:[Ff]ood)?\s*[=:]\s*([\d,.]+)/i);
    if (shopeeMatch) parsed.shopee = num(shopeeMatch[1]);

    const bkappMatch = stripped.match(/(?:BK\s*App(?:\/Web)?\s*(?:\/[^=:]*)?|1112)\s*[=:]\s*([\d,.]+)/i);
    if (bkappMatch) parsed.bkapp = num(bkappMatch[1]);

    const robinMatch = stripped.match(/Robin\s*[=:]\s*([\d,.]+)/i);
    if (robinMatch) parsed.robin = num(robinMatch[1]);

    const gokooMatch = stripped.match(/Go\s*KOO\s*[=:]\s*([\d,.]+)/i);
    if (gokooMatch) parsed.gokoo = num(gokooMatch[1]);

    const sosDailyMatch = stripped.match(/SOS\s*Daily\s*[=:]\s*([\d,.]+)/i);
    if (sosDailyMatch) {
      parsed.sosDaily = num(sosDailyMatch[1]);
    } else {
      const sosDailyAlt = stripped.match(/(?:^|\n)[^M\n]*SOS\s*[=:]\s*([\d,.]+)/im);
      if (sosDailyAlt) parsed.sosDaily = num(sosDailyAlt[1]);
    }

    const sosMtdMatch = stripped.match(/(?:SOS\s*MTD|MTD\s*SOS)\s*[=:]\s*([\d,.]+)/i);
    if (sosMtdMatch) parsed.sosMtd = num(sosMtdMatch[1]);

    const osatMatch = stripped.match(/OSAT\s*[=:]\s*([\d,.]+)/i);
    if (osatMatch) parsed.osat = num(osatMatch[1]);

    const surveyMatch = stripped.match(/Survey\s*count\s*[=:]\s*([\d,.]+)/i);
    if (surveyMatch) parsed.surveyCount = num(surveyMatch[1]);

    const voidAmountMatch = stripped.match(/Void\s*[=:]\s*[-฿]*([\d,.]+)/i);
    if (voidAmountMatch) parsed.voidAmount = numAbs(voidAmountMatch[1]);

    for (let i = 0; i < strippedLines.length; i++) {
      if (/\bVoid\b/i.test(strippedLines[i]) && !/count/i.test(strippedLines[i])) {
        for (let j = i + 1; j <= Math.min(i + 2, strippedLines.length - 1); j++) {
          const countLine = strippedLines[j].match(/count\s*[=:]\s*([\d,.]+)/i);
          if (countLine) { parsed.voidCount = num(countLine[1]); break; }
        }
      }
    }
    if (!parsed.voidCount) {
      const voidCountMatch = stripped.match(/Void\s*(?:count|Count)\s*[=:]\s*([\d,.]+)/i);
      if (voidCountMatch) parsed.voidCount = num(voidCountMatch[1]);
    }

    const addCheeseMatch = stripped.match(/Add\s*Cheese\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d.]+)%?)?/i);
    if (addCheeseMatch) {
      parsed.addCheeseCount = num(addCheeseMatch[1]);
      if (addCheeseMatch[2]) parsed.addCheesePercent = addCheeseMatch[2].trim();
    }

    const vMealMatch = stripped.match(/V[-\s]*[Mm]eal\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d.]+)%?)?/i);
    if (vMealMatch) {
      parsed.vMealCount = num(vMealMatch[1]);
      if (vMealMatch[2]) parsed.vMealPercent = vMealMatch[2].trim();
    }

    const upSizeMatch = stripped.match(/Up\s*[-\s]*[Ss]ize\s*[=:]\s*([\d,.]+)(?:\s*\/\s*([\d.]+)%?)?/i);
    if (upSizeMatch) {
      parsed.upSizeCount = num(upSizeMatch[1]);
      if (upSizeMatch[2]) parsed.upSizePercent = upSizeMatch[2].trim();
    }

    const colMatch = stripped.match(/COL\s*[=:]\s*([\d,.]+)%?/i);
    if (colMatch) parsed.colPercent = num(colMatch[1]);

    const hourMatch = stripped.match(/(?:Work\s*Hour|Hour)\s*[=:]\s*([\d,.]+)/i);
    if (hourMatch) parsed.actualHours = num(hourMatch[1]);

    const otMatch = stripped.match(/\bOT\s*[=:]\s*([\d,.]+)/i);
    if (otMatch) parsed.otHours = num(otMatch[1]);

    const tcmhMatch = stripped.match(/TCMH\s*[=:]\s*([\d,.]+)/i);
    if (tcmhMatch) parsed.tcmh = num(tcmhMatch[1]);

    const wasteHeaderIdx = strippedLines.findIndex(l => /\bWASTE\b/i.test(l));
    if (wasteHeaderIdx >= 0) {
      for (let i = wasteHeaderIdx + 1; i <= Math.min(wasteHeaderIdx + 5, strippedLines.length - 1); i++) {
        const wDaily = strippedLines[i].match(/Daily\s*[=:]\s*([\d,.]+)/i);
        if (wDaily && !parsed.wasteRawDaily) parsed.wasteRawDaily = num(wDaily[1]);
        const wMtd = strippedLines[i].match(/MTD\s*[=:]\s*([\d,.]+)/i);
        if (wMtd && !parsed.wasteRawMtd) parsed.wasteRawMtd = num(wMtd[1]);
      }
    }
    if (!parsed.wasteRawDaily) {
      const wD = stripped.match(/Waste\s*Daily\s*[=:]\s*([\d,.]+)/i);
      if (wD) parsed.wasteRawDaily = num(wD[1]);
    }
    if (!parsed.wasteRawMtd) {
      const wM = stripped.match(/Waste\s*MTD\s*[=:]\s*([\d,.]+)/i);
      if (wM) parsed.wasteRawMtd = num(wM[1]);
    }

    const managerNames = ["Phongsathon", "Nuttarika", "Boonyisa", "Chanon", "Washiraphan"];
    for (const name of managerNames) {
      const mgrMatch = stripped.match(new RegExp(name + "\\s*[=:]\\s*([\\d.:]+\\s*-\\s*[\\d.:]+|OFF|COM|Vacation|QSNCC|SICK|Training)", "i"));
      if (mgrMatch) {
        const val = normalizeShift(mgrMatch[1]);
        parsed[`manager${name}`] = val;
      }
    }

    const rosterStaffHeaderIdx = strippedLines.findIndex(l => /Roster\s*Staff|Staff\s*Roster/i.test(l));
    let rosterBlock = "";
    if (rosterStaffHeaderIdx >= 0) {
      const blockLines: string[] = [];
      for (let i = rosterStaffHeaderIdx + 1; i < strippedLines.length; i++) {
        const l = strippedLines[i].trim();
        if (!l) break;
        if (/Report\s*by/i.test(l)) break;
        blockLines.push(l);
      }
      rosterBlock = blockLines.join("\n");
    }

    if (!rosterBlock) {
      const rosterTomorrowMatch = stripped.match(/(?:Roster\s*(?:Tomorrow|Staff|พนักงาน)|Staff\s*Roster)\s*([\s\S]*?)(?:\n\s*\n|$)/i);
      rosterBlock = rosterTomorrowMatch ? rosterTomorrowMatch[1].trim() : "";
    }

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
          if (!isManager) rosterLines.push(trimmed);
        }
      }
      if (rosterLines.length >= 2) rosterBlock = rosterLines.join("\n");
    }

    if (rosterBlock) {
      const blockLines = rosterBlock.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const staffEntries: Array<{ shiftGroup: string; staffName: string; customStart?: string; customEnd?: string }> = [];
      const knownShifts = ["07:00-16:00","09:00-18:00","10:00-19:00","11:00-20:00","12:00-21:00","13:00-22:00","14:00-23:00","15:00-00:00","15:00-22:00","16:00-01:00","18:00-00:00","19:00-04:00","21:00-06:00","22:00-07:00"];
      for (const line of blockLines) {
        const timeMatch = line.match(/([\d.:]+\s*-\s*[\d.:]+)\s*[=:|]\s*(.+)/);
        if (timeMatch) {
          const normalizedTime = normalizeShift(timeMatch[1]);
          const names = timeMatch[2].trim().split(/\s+/);
          for (const name of names) {
            if (!name.trim()) continue;
            if (knownShifts.includes(normalizedTime)) {
              staffEntries.push({ shiftGroup: normalizedTime, staffName: name.trim() });
            } else {
              const [cs, ce] = normalizedTime.split("-");
              staffEntries.push({ shiftGroup: "CUSTOM", staffName: name.trim(), customStart: cs, customEnd: ce });
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
        {reportDate > maxAllowedDate && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300" data-testid="banner-future-date">
            <span className="text-lg">🔒</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">ยังไม่สามารถกรอกข้อมูลวันที่ {reportDate} ได้</p>
              <p className="text-xs opacity-75 mt-0.5">กรุณารอจนถึงหลัง {reportDate === todayBangkok() ? "22:00 น." : `00:01 ของวันที่ ${reportDate && (() => { const d = new Date(reportDate + "T00:00:00"); d.setDate(d.getDate() + 1); return d.toLocaleDateString("th-TH", { day: "numeric", month: "long" }); })()}`}</p>
            </div>
          </div>
        )}
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
                {reportSavedInDb && !isEditMode && (
                  <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-700">
                    <CheckCircle className="w-3 h-3" />
                    {language === "th" ? "บันทึกแล้ว" : "Saved"}
                  </Badge>
                )}
                {reportSavedInDb && !isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    data-testid="button-edit-report"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    {language === "th" ? "แก้ไข" : "Edit"}
                  </Button>
                )}
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
                <div className={`bg-muted/50 p-3 md:p-4 rounded-lg ${sectionHiddenClass("basicInfo")}`}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-sm md:text-base font-medium">
                      {sectionTitle("basicInfo", t.basicInfo)}
                    </h3>
                    <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          data-testid="button-paste-line-report"
                          disabled={reportSavedInDb && !isEditMode}
                          onClick={() => {
                            const reportDate = form.getValues("reportDate" as keyof FormData) as string;
                            setPasteDate(reportDate || todayBangkok());
                          }}
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
                              onChange={(e) => {
                                const val = e.target.value;
                                setPasteText(val);
                                const dateMatch = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                                if (dateMatch) {
                                  const [, d, m, y] = dateMatch;
                                  setPasteDate(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
                                }
                              }}
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
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="p-1.5 rounded border border-input bg-background hover:bg-muted transition-colors flex-shrink-0"
                                data-testid="button-date-prev"
                                onClick={() => {
                                  if (!field.value) return;
                                  const [y, mo, d] = field.value.split('-').map(Number);
                                  const date = new Date(y, mo - 1, d);
                                  date.setDate(date.getDate() - 1);
                                  field.onChange(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
                                }}
                              >
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <Input
                                type="date"
                                className="text-sm flex-1 min-w-0"
                                max={maxAllowedDate}
                                {...field}
                                data-testid="input-report-date"
                              />
                              <button
                                type="button"
                                className="p-1.5 rounded border border-input bg-background hover:bg-muted transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                data-testid="button-date-next"
                                disabled={!field.value || field.value >= maxAllowedDate}
                                onClick={() => {
                                  if (!field.value) return;
                                  const [y, mo, d] = field.value.split('-').map(Number);
                                  const date = new Date(y, mo - 1, d);
                                  date.setDate(date.getDate() + 1);
                                  const next = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                                  if (next <= maxAllowedDate) field.onChange(next);
                                }}
                              >
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
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
                              disabled={reportSavedInDb && !isEditMode}
                              {...field}
                              data-testid="input-reporter"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <fieldset disabled={reportSavedInDb && !isEditMode} className="border-0 p-0 m-0 space-y-6">
                <div className={`bg-blue-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("daily")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("daily", t.daily)}
                      </h3>
                      <SectionNote
                        value={form.watch("noteDaily") || ""}
                        onChange={(v) => form.setValue("noteDaily", v)}
                        isAdmin={isAdmin}
                        testId="note-section-daily"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2 shrink-0 mr-1"
                      onClick={reloadTargetFromSettings}
                      disabled={isReloadingTarget}
                      data-testid="button-load-from-settings"
                    >
                      {isReloadingTarget
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RefreshCw className="w-3 h-3 mr-1" />
                      }
                      {!isReloadingTarget && (language === "th" ? "โหลดจาก Setting" : "Load from Settings")}
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-6 text-xs px-2 shrink-0"
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
                        <FormItem className={fItemCls("dailyTarget")}>
                          <FormLabel className="text-xs">{fLabel("dailyTarget", <>{t.target}</>)}</FormLabel>
                          <FieldDesc fieldKey="target" value={fieldDescs.target || ""} onChange={(v) => handleDescChange("target", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("actualSales")}>
                          <FormLabel className="text-xs">{fLabel("actualSales", <>{t.actual}</>)}</FormLabel>
                          <FieldDesc fieldKey="actual" value={fieldDescs.actual || ""} onChange={(v) => handleDescChange("actual", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("transactionCount")}>
                          <FormLabel className="text-xs">{fLabel("transactionCount", <>{t.tc}</>)}</FormLabel>
                          <FieldDesc fieldKey="tc" value={fieldDescs.tc || ""} onChange={(v) => handleDescChange("tc", v)} isAdmin={isAdmin} />
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
                      <FieldDesc fieldKey="ta" value={fieldDescs.ta || ""} onChange={(v) => handleDescChange("ta", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("cashDeposit")}>
                          <FormLabel className="text-xs">{fLabel("cashDeposit", <>Cash Deposit (฿)</>)}</FormLabel>
                          <FieldDesc fieldKey="cashDeposit" value={fieldDescs.cashDeposit || ""} onChange={(v) => handleDescChange("cashDeposit", v)} isAdmin={isAdmin} />
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

                <div className={`bg-green-50 dark:bg-green-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("mtd")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("mtd", t.mtd)}
                      </h3>
                      <SectionNote
                        value={form.watch("noteMtd") || ""}
                        onChange={(v) => form.setValue("noteMtd", v)}
                        isAdmin={isAdmin}
                        testId="note-section-mtd"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection("mtd")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                      data-testid="button-toggle-mtd"
                    >
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${collapsedSections["mtd"] ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${collapsedSections["mtd"] ? "hidden" : ""}`}>
                    <div className={fItemCls("mtdTarget")}>
                      <FormLabel className="text-xs">{fLabel("mtdTarget", t.mtdTarget)}</FormLabel>
                      <FieldDesc fieldKey="mtdTarget" value={fieldDescs.mtdTarget || ""} onChange={(v) => handleDescChange("mtdTarget", v)} isAdmin={isAdmin} />
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
                    <div className={fItemCls("mtdActual")}>
                      <FormLabel className="text-xs">{fLabel("mtdActual", t.mtdActual)}</FormLabel>
                      <FieldDesc fieldKey="mtdActual" value={fieldDescs.mtdActual || ""} onChange={(v) => handleDescChange("mtdActual", v)} isAdmin={isAdmin} />
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
                    <div className={fItemCls("mtdTc")}>
                      <FormLabel className="text-xs">{fLabel("mtdTc", t.mtdTc)}</FormLabel>
                      <FieldDesc fieldKey="mtdTc" value={fieldDescs.mtdTc || ""} onChange={(v) => handleDescChange("mtdTc", v)} isAdmin={isAdmin} />
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
                      <FieldDesc fieldKey="mtdTa" value={fieldDescs.mtdTa || ""} onChange={(v) => handleDescChange("mtdTa", v)} isAdmin={isAdmin} />
                      <Input
                        value={mtdTa}
                        readOnly
                        tabIndex={-1}
                        className="bg-muted text-sm pointer-events-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                <div className={`bg-orange-50 dark:bg-orange-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("inStore")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("inStore", t.inStore)}
                      </h3>
                      <SectionNote
                        value={form.watch("noteInStore") || ""}
                        onChange={(v) => form.setValue("noteInStore", v)}
                        isAdmin={isAdmin}
                        testId="note-section-instore"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection("inStore")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
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
                        <FormItem className={fItemCls("dineIn")}>
                          <FormLabel className="text-xs">{fLabel("dineIn", <>
                            {t.dineIn} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="dineIn" value={fieldDescs.dineIn || ""} onChange={(v) => handleDescChange("dineIn", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("dineInTc")}>
                          <FormLabel className="text-xs">{fLabel("dineInTc", <>
                            {t.dineInTc}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="dineInTc" value={fieldDescs.dineInTc || ""} onChange={(v) => handleDescChange("dineInTc", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("takeAway")}>
                          <FormLabel className="text-xs">{fLabel("takeAway", <>
                            {t.takeAway} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="takeAway" value={fieldDescs.takeAway || ""} onChange={(v) => handleDescChange("takeAway", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("takeAwayTc")}>
                          <FormLabel className="text-xs">{fLabel("takeAwayTc", <>
                            {t.takeAwayTc}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="takeAwayTc" value={fieldDescs.takeAwayTc || ""} onChange={(v) => handleDescChange("takeAwayTc", v)} isAdmin={isAdmin} />
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

                <div className={`bg-purple-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("delivery")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("delivery", t.delivery)}
                      </h3>
                      <SectionNote
                        value={form.watch("noteDelivery") || ""}
                        onChange={(v) => form.setValue("noteDelivery", v)}
                        isAdmin={isAdmin}
                        testId="note-section-delivery"
                      />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
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
                        <FormItem className={fItemCls("grabfood")}>
                          <FormLabel className="text-xs">{fLabel("grabfood", <>
                            {t.grabfood} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="grabfood" value={fieldDescs.grabfood || ""} onChange={(v) => handleDescChange("grabfood", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("lineman")}>
                          <FormLabel className="text-xs">{fLabel("lineman", <>
                            {t.lineman} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="lineman" value={fieldDescs.lineman || ""} onChange={(v) => handleDescChange("lineman", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("shopee")}>
                          <FormLabel className="text-xs">{fLabel("shopee", <>
                            {t.shopee} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="shopee" value={fieldDescs.shopee || ""} onChange={(v) => handleDescChange("shopee", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("bkapp")}>
                          <FormLabel className="text-xs">{fLabel("bkapp", <>
                            {t.bkapp} (฿)
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="bkapp" value={fieldDescs.bkapp || ""} onChange={(v) => handleDescChange("bkapp", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("robin")}>
                          <FormLabel className="text-xs">{fLabel("robin", <>Robin (฿)</>)}</FormLabel>
                          <FieldDesc fieldKey="robin" value={fieldDescs.robin || ""} onChange={(v) => handleDescChange("robin", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("gokoo")}>
                          <FormLabel className="text-xs">{fLabel("gokoo", <>GoKOO (฿)</>)}</FormLabel>
                          <FieldDesc fieldKey="gokoo" value={fieldDescs.gokoo || ""} onChange={(v) => handleDescChange("gokoo", v)} isAdmin={isAdmin} />
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

                <div className={`bg-yellow-50 dark:bg-yellow-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("performance")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("performance", t.performance)}
                      </h3>
                      <SectionNote
                        value={form.watch("notePerformance") || ""}
                        onChange={(v) => form.setValue("notePerformance", v)}
                        isAdmin={isAdmin}
                        testId="note-section-performance"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection("performance")}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
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
                        <FormItem className={fItemCls("osat")}>
                          <FormLabel className="text-xs">{fLabel("osat", <>{t.osat}</>)}</FormLabel>
                          <FieldDesc fieldKey="osat" value={fieldDescs.osat || ""} onChange={(v) => handleDescChange("osat", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("surveyCount")}>
                          <FormLabel className="text-xs">{fLabel("surveyCount", <>
                            {t.surveyCount}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="surveyCount" value={fieldDescs.surveyCount || ""} onChange={(v) => handleDescChange("surveyCount", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("voidAmount")}>
                          <FormLabel className="text-xs">{fLabel("voidAmount", <>
                            {t.void} (฿)
                          </>)}</FormLabel>
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
                        <FormItem className={fItemCls("voidCount")}>
                          <FormLabel className="text-xs">{fLabel("voidCount", <>
                            {t.voidCount}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="voidCount" value={fieldDescs.voidCount || ""} onChange={(v) => handleDescChange("voidCount", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("sosDaily")}>
                          <FormLabel className="text-xs">{fLabel("sosDaily", <>
                            {t.sosDaily}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="sosDaily" value={fieldDescs.sosDaily || ""} onChange={(v) => handleDescChange("sosDaily", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("sosMtd")}>
                          <FormLabel className="text-xs">{fLabel("sosMtd", <>
                            {t.sosMtd}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="sosMtd" value={fieldDescs.sosMtd || ""} onChange={(v) => handleDescChange("sosMtd", v)} isAdmin={isAdmin} />
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

                <div className={`bg-pink-50 dark:bg-pink-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("addons")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                      <h3 className="text-sm md:text-base font-medium shrink-0">
                        {sectionTitle("addons", t.addons)}
                      </h3>
                      <SectionNote
                        value={form.watch("noteAddons") || ""}
                        onChange={(v) => form.setValue("noteAddons", v)}
                        isAdmin={isAdmin}
                        testId="note-section-addons"
                      />
                    </div>
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
                        <FormItem className={fItemCls("addCheeseCount")}>
                          <FormLabel className="text-xs">{fLabel("addCheeseCount", <>
                            {t.addCheese} #
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="addCheese" value={fieldDescs.addCheese || ""} onChange={(v) => handleDescChange("addCheese", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("vMealCount")}>
                          <FormLabel className="text-xs">{fLabel("vMealCount", <>{t.vMeal} #</>)}</FormLabel>
                          <FieldDesc fieldKey="vMeal" value={fieldDescs.vMeal || ""} onChange={(v) => handleDescChange("vMeal", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("upSizeCount")}>
                          <FormLabel className="text-xs">{fLabel("upSizeCount", <>
                            {t.upSize} #
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="upSize" value={fieldDescs.upSize || ""} onChange={(v) => handleDescChange("upSize", v)} isAdmin={isAdmin} />
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

                <div className={`bg-red-50 dark:bg-red-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("waste")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {sectionTitle("waste", t.waste)}
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
                              <FieldDesc fieldKey="wasteRawDaily" value={fieldDescs.wasteRawDaily || ""} onChange={(v) => handleDescChange("wasteRawDaily", v)} isAdmin={isAdmin} />
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
                            <FormItem className={fItemCls("wasteMealDaily")}>
                              <FormLabel className="text-xs">{fLabel("wasteMealDaily", <>
                                {t.meal} (฿)
                              </>)}</FormLabel>
                              <FieldDesc fieldKey="wasteMealDaily" value={fieldDescs.wasteMealDaily || ""} onChange={(v) => handleDescChange("wasteMealDaily", v)} isAdmin={isAdmin} />
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
                              <FieldDesc fieldKey="wasteRawMtd" value={fieldDescs.wasteRawMtd || ""} onChange={(v) => handleDescChange("wasteRawMtd", v)} isAdmin={isAdmin} />
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
                            <FormItem className={fItemCls("wasteMealMtd")}>
                              <FormLabel className="text-xs">{fLabel("wasteMealMtd", <>
                                {t.meal} (฿)
                              </>)}</FormLabel>
                              <FieldDesc fieldKey="wasteMealMtd" value={fieldDescs.wasteMealMtd || ""} onChange={(v) => handleDescChange("wasteMealMtd", v)} isAdmin={isAdmin} />
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

                <div className={`bg-indigo-50 dark:bg-indigo-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("labor")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {sectionTitle("labor", t.labor)}
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
                        <FormItem className={fItemCls("recommendHours")}>
                          <FormLabel className="text-xs">{fLabel("recommendHours", <>
                            {language === "th" ? "ชม.แนะนำ" : "Recommend Hrs"}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="recommendHours" value={fieldDescs.recommendHours || ""} onChange={(v) => handleDescChange("recommendHours", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("rosterCommit")}>
                          <FormLabel className="text-xs">{fLabel("rosterCommit", <>
                            {language === "th" ? "Roster Commit" : "Roster Commit"}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="rosterCommit" value={fieldDescs.rosterCommit || ""} onChange={(v) => handleDescChange("rosterCommit", v)} isAdmin={isAdmin} />
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
                        <FormItem className={fItemCls("actualHours")}>
                          <FormLabel className="text-xs">{fLabel("actualHours", <>
                            {language === "th" ? "ชม.จริง" : "Actual Hrs"}
                          </>)}</FormLabel>
                          <FieldDesc fieldKey="actualHours" value={fieldDescs.actualHours || ""} onChange={(v) => handleDescChange("actualHours", v)} isAdmin={isAdmin} />
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
                      <FieldDesc fieldKey="laborCost" value={fieldDescs.laborCost || ""} onChange={(v) => handleDescChange("laborCost", v)} isAdmin={isAdmin} />
                      <Input
                        value={computedLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-labor-cost"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.col}</FormLabel>
                      <FieldDesc fieldKey="col" value={fieldDescs.col || ""} onChange={(v) => handleDescChange("col", v)} isAdmin={isAdmin} />
                      <Input
                        value={computedColPercent.toFixed(2) + "%"}
                        readOnly
                        className={`text-sm pointer-events-none focus-visible:ring-0 ${computedColPercent <= 25 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}
                        data-testid="display-col-percent"
                      />
                    </div>
                    <div>
                      <FormLabel className="text-xs">{t.tcmh}</FormLabel>
                      <FieldDesc fieldKey="tcmh" value={fieldDescs.tcmh || ""} onChange={(v) => handleDescChange("tcmh", v)} isAdmin={isAdmin} />
                      <Input
                        value={computedTcmh.toFixed(2)}
                        readOnly
                        className="text-sm bg-muted pointer-events-none focus-visible:ring-0"
                        data-testid="display-tcmh"
                      />
                    </div>
                  </div>
                </div>

                <div className={`bg-teal-50 dark:bg-teal-950/30 p-3 md:p-4 rounded-lg ${sectionHiddenClass("roster")}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-medium">
                      {sectionTitle("roster", t.roster)}
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
                              render={({ field }) => {
                                const isCustom =
                                  customManagerMode[manager.key] ||
                                  (!!field.value && !shiftOptions.some(o => o.value === field.value));
                                return isCustom ? (
                                  <div className="flex flex-1 gap-1">
                                    <Input
                                      value={field.value as string}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      placeholder="HH:MM-HH:MM"
                                      className="flex-1 h-9 text-sm"
                                      data-testid={`input-custom-${manager.key}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 px-2 text-xs"
                                      onClick={() => {
                                        setCustomManagerMode((prev) => ({ ...prev, [manager.key]: false }));
                                        field.onChange("");
                                      }}
                                      data-testid={`button-cancel-custom-${manager.key}`}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <Select
                                    value={field.value as string}
                                    onValueChange={(v) => {
                                      if (v === "__CUSTOM__") {
                                        setCustomManagerMode((prev) => ({ ...prev, [manager.key]: true }));
                                        field.onChange("");
                                      } else {
                                        field.onChange(v);
                                      }
                                    }}
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
                                      {shiftOptions.map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="__CUSTOM__" className="text-blue-600 font-medium">
                                        {language === "th" ? "✏️ กำหนดเอง..." : "✏️ Custom..."}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                );
                              }}
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
                                {staffShiftGroups.map((opt) => (
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
                            <Popover
                              open={openNicknamePopover === index}
                              onOpenChange={(open) => {
                                setOpenNicknamePopover(open ? index : null);
                                if (!open) setNicknameSearch("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openNicknamePopover === index}
                                  className="flex-1 min-w-[100px] justify-between text-sm font-normal h-9"
                                  data-testid={`input-staff-name-${index}`}
                                >
                                  <span className={cn("truncate", !entry.staffName && "text-muted-foreground")}>
                                    {entry.staffName || (language === "th" ? "ชื่อเล่น" : "Nickname")}
                                  </span>
                                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-0" align="start">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder={language === "th" ? "ค้นหา/พิมพ์ชื่อ..." : "Search/type name..."}
                                    value={nicknameSearch}
                                    onValueChange={setNicknameSearch}
                                    data-testid={`input-staff-name-search-${index}`}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      <span className="text-muted-foreground">{language === "th" ? "ไม่พบ" : "No results"}</span>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {nicknameSearch && (
                                        <CommandItem
                                          value={`__custom__${nicknameSearch}`}
                                          onSelect={() => {
                                            updateStaffEntry(index, "staffName", nicknameSearch);
                                            setOpenNicknamePopover(null);
                                            setNicknameSearch("");
                                          }}
                                          className="text-blue-600 font-medium"
                                          data-testid={`button-use-custom-name-${index}`}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          {language === "th" ? `ใช้ "${nicknameSearch}"` : `Use "${nicknameSearch}"`}
                                        </CommandItem>
                                      )}
                                      {staffList
                                        .filter((s) => {
                                          if (!nicknameSearch) return true;
                                          const search = nicknameSearch.toLowerCase();
                                          return (
                                            s.nickName?.toLowerCase().includes(search) ||
                                            s.fullName?.toLowerCase().includes(search) ||
                                            s.username.toLowerCase().includes(search)
                                          );
                                        })
                                        .map((staff) => (
                                          <CommandItem
                                            key={staff.username}
                                            value={staff.nickName || staff.username}
                                            onSelect={() => {
                                              updateStaffEntry(index, "staffName", staff.nickName || staff.username);
                                              setOpenNicknamePopover(null);
                                              setNicknameSearch("");
                                            }}
                                            data-testid={`option-staff-${staff.username}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                entry.staffName === (staff.nickName || staff.username) ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {staff.nickName || staff.username}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                    disabled={areaLocked || (reportSavedInDb && !isEditMode)}
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

                {/* Preview Text — live preview of the Grand Diamond report */}
                <div className="mt-5 pt-4 border-t border-border/40" data-testid="section-daily-preview">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {language === "th" ? "ตัวอย่างข้อความ" : "Preview Text"}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={handleCopyNewReport}
                      data-testid="button-copy-preview-text"
                    >
                      <Copy className="w-3 h-3" />
                      {language === "th" ? "คัดลอก" : "Copy"}
                    </Button>
                  </div>
                  <pre
                    className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 font-mono leading-relaxed max-h-[480px] overflow-auto border border-border/40"
                    data-testid="text-daily-preview"
                  >
                    {dailyPreviewText}
                  </pre>
                </div>

                {/* ตารางบันทึก — Saved Shift Log */}
                {watchedRosterDate && (
                  <div className="mt-5 pt-4 border-t border-border/40" data-testid="section-roster-log">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        ตารางบันทึก — {watchedRosterDate}
                      </h4>
                      {(rosterLogQuery.data?.total ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">{rosterLogQuery.data?.total} รายการ</span>
                      )}
                    </div>

                    {rosterLogQuery.isLoading ? (
                      <div className="space-y-1.5">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-8 rounded-md bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    ) : rosterLogQuery.data?.ok && rosterLogQuery.data.shifts?.length > 0 ? (
                      <div className="rounded-md border border-border/50 overflow-hidden">
                        <table className="w-full text-sm" data-testid="table-roster-log">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/50">
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8">#</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">ชื่อเล่น</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">กะ</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">เวลา</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rosterLogQuery.data.shifts.map((shift: ShiftLogRow, idx: number) => (
                              <tr
                                key={`${shift.username}-${shift.shiftGroup}-${shift.startTime ?? idx}`}
                                className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                                data-testid={`row-roster-log-${idx}`}
                              >
                                <td className="px-3 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                                <td className="px-3 py-1.5 text-sm font-medium">{shift.nickName || shift.username}</td>
                                <td className="px-3 py-1.5">
                                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${getShiftBadgeClass(shift.shiftGroup)}`}>
                                    {getShiftDisplayName(shift.shiftGroup)}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono">
                                  {shift.startTime && shift.endTime
                                    ? `${shift.startTime}–${shift.endTime}`
                                    : shift.startTime || "–"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        className="text-center py-5 text-xs text-muted-foreground border border-dashed border-border/50 rounded-md"
                        data-testid="empty-roster-log"
                      >
                        ไม่พบข้อมูลบันทึกกะสำหรับวันที่ {watchedRosterDate}
                      </div>
                    )}
                  </div>
                )}
                </fieldset>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}