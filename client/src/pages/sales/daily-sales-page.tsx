import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Save, Trash2, Copy, Calculator, BarChart3, Loader2, Plus, X } from "lucide-react";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
};

const parseNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
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
      const rawValue = e.target.value.replace(/[^0-9.,]/g, '');
      setDisplayValue(rawValue);
    };

    const handleBlur = () => {
      const parsed = parseNumber(displayValue);
      onChange(parsed || '0');
      setDisplayValue(formatNumber(parsed || '0'));
    };

    const handleFocus = () => {
      const parsed = parseNumber(displayValue);
      if (parsed === '0') {
        setDisplayValue('');
      }
    };

    return prefix ? (
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={`pl-6 ${className || ''}`}
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
  }
);

const formSchema = z.object({
  reportDate: z.string().min(1, "กรุณาเลือกวันที่"),
  reportBy: z.string().min(1, "กรุณากรอกชื่อผู้รายงาน"),
  workShift: z.string().optional().default("full"),
  dailyTarget: z.string().default("0"),
  actualSales: z.string().default("0"),
  transactionCount: z.string().default("0"),
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
  osat: z.string().default("0"),
  surveyCount: z.string().default("0"),
  voidAmount: z.string().default("0"),
  voidCount: z.string().default("0"),
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
  colPercent: z.string().default("0"),
  laborHour: z.string().default("0"),
  tcmh: z.string().default("0"),
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
  { value: "Open", label: "Open" },
  { value: "Swing", label: "Swing" },
  { value: "Lunch", label: "Lunch" },
  { value: "Dinner", label: "Dinner" },
  { value: "Close", label: "Close" },
  { value: "Late Night", label: "Late Night" },
  { value: "OFF", label: "OFF" },
  { value: "COM", label: "COM" },
  { value: "Vacation", label: "Vacation" },
] as const;

const STAFF_SHIFT_GROUPS = [
  { value: "Open", label: "Open" },
  { value: "Swing", label: "Swing" },
  { value: "Lunch", label: "Lunch" },
  { value: "Dinner", label: "Dinner" },
  { value: "Close", label: "Close" },
  { value: "Late Night", label: "Late Night" },
] as const;

type FormData = z.infer<typeof formSchema>;

export default function DailySalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useI18n();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [customAddonDivisor, setCustomAddonDivisor] = useState<string>("");

  const isManager = user?.role === "manager" || user?.role === "admin";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
      reportBy: user?.nickName || user?.username || "",
      workShift: "full",
      dailyTarget: "0",
      actualSales: "0",
      transactionCount: "0",
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
      osat: "0",
      surveyCount: "0",
      voidAmount: "0",
      voidCount: "0",
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
      colPercent: "0",
      laborHour: "0",
      tcmh: "0",
      managerRosterDate: "",
      managerRosterText: "",
      staffRosterText: "",
      managerPhongsathon: "",
      managerNuttarika: "",
      managerBoonyisa: "",
      managerChanon: "",
      managerWashiraphan: "",
    }
  });

  const [staffList, setStaffList] = useState<Array<{username: string, nickName?: string, fullName?: string}>>([]);
  const [staffRosterEntries, setStaffRosterEntries] = useState<Array<{shiftGroup: string, staffName: string}>>([
    { shiftGroup: "", staffName: "" }
  ]);

  const { saveData, restoreData, clearData, hasDraft } = useFormPersistence<FormData>('daily-sales-form');
  const { hasUnsavedChanges, markAsChanged, markAsSaved } = useUnsavedChanges();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSavingToServer, setIsSavingToServer] = useState(false);

  const saveToServer = useCallback(async (values: FormData) => {
    if (!values.reportDate || !values.reportBy) return;
    
    const cleanedReport = {
      ...values,
      actualSales: values.actualSales?.replace(/,/g, '') || "0",
      transactionCount: values.transactionCount?.replace(/,/g, '') || "0",
      dineIn: values.dineIn?.replace(/,/g, '') || "0",
      dineInTc: values.dineInTc?.replace(/,/g, '') || "0",
      takeAway: values.takeAway?.replace(/,/g, '') || "0",
      takeAwayTc: values.takeAwayTc?.replace(/,/g, '') || "0",
      grabfood: values.grabfood?.replace(/,/g, '') || "0",
      lineman: values.lineman?.replace(/,/g, '') || "0",
      shopee: values.shopee?.replace(/,/g, '') || "0",
      bkapp: values.bkapp?.replace(/,/g, '') || "0",
      dailyTarget: values.dailyTarget?.replace(/,/g, '') || "0",
      mtdTarget: values.mtdTarget?.replace(/,/g, '') || "0",
      mtdActual: values.mtdActual?.replace(/,/g, '') || "0",
      mtdTc: values.mtdTc?.replace(/,/g, '') || "0",
      voidAmount: values.voidAmount?.replace(/,/g, '') || "0",
      wasteDailyTotal: values.wasteDailyTotal?.replace(/,/g, '') || "0",
      wasteMealDaily: values.wasteMealDaily?.replace(/,/g, '') || "0",
      wasteMtdTotal: values.wasteMtdTotal?.replace(/,/g, '') || "0",
      wasteMealMtd: values.wasteMealMtd?.replace(/,/g, '') || "0",
    };
    
    try {
      setIsSavingToServer(true);
      const token = localStorage.getItem("bk_token");
      await apiRequest("POST", "/api/sales/upsertReportByDate", { token, report: cleanedReport });
      setLastSaved(new Date());
      setShowAutoSave(true);
      if (hideAutoSaveTimerRef.current) {
        clearTimeout(hideAutoSaveTimerRef.current);
      }
      hideAutoSaveTimerRef.current = setTimeout(() => setShowAutoSave(false), 3000);
    } catch (error) {
      console.error("Failed to auto-save to server:", error);
    } finally {
      setIsSavingToServer(false);
    }
  }, []);

  const debouncedSave = useCallback((values: FormData) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveData(values);
      markAsSaved();
    }, 1000);
  }, [saveData, markAsSaved]);

  const debouncedServerSave = useCallback((values: FormData) => {
    if (serverSaveTimerRef.current) {
      clearTimeout(serverSaveTimerRef.current);
    }
    serverSaveTimerRef.current = setTimeout(() => {
      saveToServer(values);
    }, 1500);
  }, [saveToServer]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.reportDate && values.reportBy) {
        markAsChanged();
        debouncedSave(values as FormData);
        debouncedServerSave(values as FormData);
      }
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (hideAutoSaveTimerRef.current) clearTimeout(hideAutoSaveTimerRef.current);
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
        const lines = restored.managerRosterText.split('\n');
        lines.forEach((line) => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, name, shift] = match;
            const managerKey = `manager${name}` as keyof FormData;
            if (["managerPhongsathon", "managerNuttarika", "managerBoonyisa", "managerChanon", "managerWashiraphan"].includes(managerKey)) {
              form.setValue(managerKey, shift.trim());
            }
          }
        });
      }
      
      // Hydrate staff roster entries from saved text
      if (restored.staffRosterText) {
        const lines = restored.staffRosterText.split('\n').filter((l) => l.trim());
        const entries = lines.map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          return { shiftGroup: parts[0] || "", staffName: parts[1] || "" };
        });
        if (entries.length > 0) {
          setStaffRosterEntries(entries);
        }
      }
    }
  }, [form.setValue, restoreData]);

  // State for default target from settings
  const [defaultDailyTarget, setDefaultDailyTarget] = useState("250000");

  // Load store settings and staff list on mount
  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getSettings", { token });
        const data = await res.json();
        if (data.ok && data.settings) {
          setDefaultDailyTarget(data.settings.dailyTarget || "250000");
        }
      } catch (error) {
        console.error("Failed to load store settings:", error);
      }
    };
    const loadStaffList = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/admin/getUsers", { token });
        const data = await res.json();
        if (data.ok && data.users) {
          const activeStaff = data.users.filter((u: any) => u.active === 1 && u.role === "staff");
          setStaffList(activeStaff);
        }
      } catch (error) {
        console.error("Failed to load staff list:", error);
      }
    };
    loadStoreSettings();
    loadStaffList();
  }, []);

  // Update staffRosterText when entries change
  useEffect(() => {
    const text = staffRosterEntries
      .filter(e => e.shiftGroup && e.staffName)
      .map(e => `${e.shiftGroup} | ${e.staffName}`)
      .join('\n');
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
    form.setValue("managerRosterText", lines.join('\n'));
  }, [managerPhongsathon, managerNuttarika, managerBoonyisa, managerChanon, managerWashiraphan]);

  const addStaffEntry = () => {
    setStaffRosterEntries([...staffRosterEntries, { shiftGroup: "", staffName: "" }]);
  };

  const removeStaffEntry = (index: number) => {
    setStaffRosterEntries(staffRosterEntries.filter((_, i) => i !== index));
  };

  const updateStaffEntry = (index: number, field: "shiftGroup" | "staffName", value: string) => {
    const updated = [...staffRosterEntries];
    updated[index][field] = value;
    setStaffRosterEntries(updated);
  };

  // Load daily target, MTD summary, and existing report when date changes
  const reportDate = form.watch("reportDate");
  useEffect(() => {
    const loadDailyTargetAndMtd = async () => {
      if (!reportDate) return;
      try {
        const token = localStorage.getItem("bk_token");
        const date = new Date(reportDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // Load existing report for this date
        const existingRes = await apiRequest("POST", "/api/sales/getReportByDate", {
          token,
          date: reportDate
        });
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
          form.setValue("osat", r.osat || "0");
          form.setValue("surveyCount", r.surveyCount || "0");
          form.setValue("voidAmount", r.voidAmount || "0");
          form.setValue("voidCount", r.voidCount || "0");
          form.setValue("addCheeseCount", r.addCheeseCount || "0");
          form.setValue("addCheesePercent", r.addCheesePercent || "0");
          form.setValue("vMealCount", r.vMealCount || "0");
          form.setValue("vMealPercent", r.vMealPercent || "0");
          form.setValue("upSizeCount", r.upSizeCount || "0");
          form.setValue("upSizePercent", r.upSizePercent || "0");
          form.setValue("wasteDailyTotal", r.wasteDailyTotal || "0");
          form.setValue("wasteMealDaily", r.wasteMealDaily || "0");
          form.setValue("wasteMtdTotal", r.wasteMtdTotal || "0");
          form.setValue("wasteMealMtd", r.wasteMealMtd || "0");
          form.setValue("colPercent", r.colPercent || "0");
          form.setValue("laborHour", r.laborHour || "0");
          form.setValue("tcmh", r.tcmh || "0");
          if (r.managerRosterDate) form.setValue("managerRosterDate", r.managerRosterDate);
          if (r.workShift) form.setValue("workShift", r.workShift);
          
          // Hydrate manager roster dropdowns from saved text
          if (r.managerRosterText) {
            const lines = r.managerRosterText.split('\n');
            lines.forEach((line: string) => {
              const match = line.match(/^(\w+):\s*(.+)$/);
              if (match) {
                const [, name, shift] = match;
                const managerKey = `manager${name}` as keyof FormData;
                if (["managerPhongsathon", "managerNuttarika", "managerBoonyisa", "managerChanon", "managerWashiraphan"].includes(managerKey)) {
                  form.setValue(managerKey, shift.trim());
                }
              }
            });
          }
          
          // Hydrate staff roster entries from saved text
          if (r.staffRosterText) {
            const lines = r.staffRosterText.split('\n').filter((l: string) => l.trim());
            const entries = lines.map((line: string) => {
              const parts = line.split('|').map((p: string) => p.trim());
              return { shiftGroup: parts[0] || "", staffName: parts[1] || "" };
            });
            if (entries.length > 0) {
              setStaffRosterEntries(entries);
            }
          }
        }
        
        // Load daily target for this specific date
        const targetRes = await apiRequest("POST", "/api/sales/getDailyTargetForDate", {
          token,
          date: reportDate
        });
        const targetData = await targetRes.json();
        if (targetData.ok && targetData.target) {
          form.setValue("dailyTarget", targetData.target.targetSales || defaultDailyTarget);
        } else {
          form.setValue("dailyTarget", defaultDailyTarget);
        }
        
        // Get MTD Actual from daily sales reports
        const mtdRes = await apiRequest("POST", "/api/sales/getMtdSummary", { 
          token, 
          year, 
          month,
          beforeDate: reportDate
        });
        const mtdData = await mtdRes.json();
        if (mtdData.ok) {
          form.setValue("mtdActual", mtdData.mtdActual.toString());
          form.setValue("mtdTc", mtdData.mtdTc.toString());
        }
        
        // Get MTD Target from daily_targets table
        const mtdTargetRes = await apiRequest("POST", "/api/sales/getMtdTargetSum", {
          token,
          year,
          month,
          upToDate: reportDate
        });
        const mtdTargetData = await mtdTargetRes.json();
        if (mtdTargetData.ok) {
          form.setValue("mtdTarget", (mtdTargetData.mtdTargetSum || 0).toString());
        }
      } catch (error) {
        console.error("Failed to load daily target and MTD:", error);
      }
    };
    loadDailyTargetAndMtd();
  }, [reportDate, defaultDailyTarget]);

  const handleSaveReport = async () => {
    try {
      const values = form.getValues();
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/createReport", { token, report: values });
      const result = await res.json();
      if (result.ok) {
        toast({ title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully" });
        clearData();
        markAsSaved();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message || "Failed to save" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (!isManager) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="p-8 text-center" data-testid="card-access-denied">
            <CardTitle className="text-destructive mb-2" data-testid="text-access-denied-title">
              {language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "Access Denied"}
            </CardTitle>
            <CardDescription data-testid="text-access-denied-desc">
              {language === "th" ? "เฉพาะผู้จัดการเท่านั้น" : "Only managers can access this page"}
            </CardDescription>
          </Card>
        </div>
      </SalesLayout>
    );
  }

  const handleClearForm = () => {
    const confirmMessage = language === 'th' 
      ? 'คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?' 
      : 'Are you sure you want to clear all data?';
    if (confirm(confirmMessage)) {
      clearData();
      form.reset();
      markAsSaved();
    }
  };

  const handleCopyReport = () => {
    const v = form.getValues();
    const actualSalesVal = parseFloat(v.actualSales) || 0;
    const tcVal = parseInt(v.transactionCount) || 0;
    const taVal = tcVal > 0 ? Math.round(actualSalesVal / tcVal).toString() : "0";
    
    const mtdActualVal = parseFloat(v.mtdActual) || 0;
    const mtdTargetVal = parseFloat(v.mtdTarget) || 0;
    const mtdVariance = mtdActualVal - mtdTargetVal;
    const mtdTcVal = parseInt(v.mtdTc) || 0;
    const mtdTaVal = mtdTcVal > 0 ? Math.round(mtdActualVal / mtdTcVal).toString() : "0";
    
    const dineInVal = parseFloat(v.dineIn) || 0;
    const takeAwayVal = parseFloat(v.takeAway) || 0;
    const inStoreTotal = dineInVal + takeAwayVal;
    const dineInPercent = actualSalesVal > 0 ? ((dineInVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const takeAwayPercent = actualSalesVal > 0 ? ((takeAwayVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const inStoreTotalPercent = actualSalesVal > 0 ? ((inStoreTotal / actualSalesVal) * 100).toFixed(2) : "0.00";
    
    const grabVal = parseFloat(v.grabfood) || 0;
    const linemanVal = parseFloat(v.lineman) || 0;
    const shopeeVal = parseFloat(v.shopee) || 0;
    const bkappVal = parseFloat(v.bkapp) || 0;
    const deliveryTotal = grabVal + linemanVal + shopeeVal + bkappVal;
    const grabPercent = actualSalesVal > 0 ? ((grabVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const linemanPercent = actualSalesVal > 0 ? ((linemanVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const shopeePercent = actualSalesVal > 0 ? ((shopeeVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const bkappPercent = actualSalesVal > 0 ? ((bkappVal / actualSalesVal) * 100).toFixed(2) : "0.00";
    const deliveryTotalPercent = actualSalesVal > 0 ? ((deliveryTotal / actualSalesVal) * 100).toFixed(2) : "0.00";
    
    const wasteDailyTotalVal = parseFloat(v.wasteDailyTotal) || 0;
    const wasteMealDailyVal = parseFloat(v.wasteMealDaily) || 0;
    const wasteRawDailyVal = wasteDailyTotalVal - wasteMealDailyVal;
    
    const wasteMtdTotalVal = parseFloat(v.wasteMtdTotal) || 0;
    const wasteMealMtdVal = parseFloat(v.wasteMealMtd) || 0;
    const wasteRawMtdVal = wasteMtdTotalVal - wasteMealMtdVal;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    const reportText = `💎 Daily Sales Report 💎
Grand Diamond
Date: ${formatDate(v.reportDate)}
========================

📊 Daily

💰 TG: ${parseFloat(v.dailyTarget).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
💵 AC: ${actualSalesVal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
👥 TC: ${tcVal.toLocaleString()}
🧾 TA: ${taVal}

📈 MTD 
💰 MTD TG: ${mtdTargetVal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
💵 MTD AC: ${mtdActualVal.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
📉 Variance: ${mtdVariance >= 0 ? '+' : '-'}฿${Math.abs(mtdVariance).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
👥 MTD TC: ${mtdTcVal.toLocaleString()}
🧾 MTD TA: ${mtdTaVal}

🏪 In Store
🍽️ Dine In: ${dineInVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${dineInPercent}%
TC: ${parseInt(v.dineInTc) || 0}
🥡 Take Away: ${takeAwayVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${takeAwayPercent}%
TC: ${parseInt(v.takeAwayTc) || 0}
🏪 In Store Total: ${inStoreTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${inStoreTotalPercent}%

🛵 DELIVERY
🛵 Grab: ${grabVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${grabPercent}%
🛵 LINE MAN: ${linemanVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${linemanPercent}%
🛵 Shoppee Food: ${shopeeVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${shopeePercent}%
🛵 BK App/Web: ${bkappVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${bkappPercent}%
📦 Delivery Total: ${deliveryTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${deliveryTotalPercent}%
========================

⭐ OSAT: ${v.osat}
📋 Survey count: ${v.surveyCount}
❌ Void: -฿${parseFloat(v.voidAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
count: ${v.voidCount || 0} Bill

🧀 Add Cheese: ${v.addCheeseCount}/${v.addCheesePercent}%
🍔 V-meal: ${v.vMealCount}/${v.vMealPercent}%
🥤 Up Size: ${v.upSizeCount}/${v.upSizePercent}%
========================

🗑️ WASTE

Daily
Daily: ${wasteDailyTotalVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${actualSalesVal > 0 ? ((wasteDailyTotalVal / actualSalesVal) * 100).toFixed(2) : "0.00"}%
Meal: ${wasteMealDailyVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${actualSalesVal > 0 ? ((wasteMealDailyVal / actualSalesVal) * 100).toFixed(2) : "0.00"}%
Raw: ${wasteRawDailyVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${actualSalesVal > 0 ? ((wasteRawDailyVal / actualSalesVal) * 100).toFixed(2) : "0.00"}%

MTD 
MTD: ${wasteMtdTotalVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${mtdActualVal > 0 ? ((wasteMtdTotalVal / mtdActualVal) * 100).toFixed(2) : "0.00"}%
Meal: ${wasteMealMtdVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${mtdActualVal > 0 ? ((wasteMealMtdVal / mtdActualVal) * 100).toFixed(2) : "0.00"}%
Raw: ${wasteRawMtdVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${mtdActualVal > 0 ? ((wasteRawMtdVal / mtdActualVal) * 100).toFixed(2) : "0.00"}%
========================

👷 COL: ${v.colPercent}%
⏰ Hour: ${v.laborHour}
📊 TCMH = ${v.tcmh}
========================

📅 Manager Roster 
Date: ${formatDate(v.managerRosterDate)}

${v.managerRosterText || 'Name:Group Shift | Time/OFF,COM,Vacation'}

👥 Roster Staff
${v.staffRosterText || 'Group Shift | Time: Name'}

📝 Report by ${v.reportBy}`;

    navigator.clipboard.writeText(reportText).then(() => {
      toast({
        title: language === 'th' ? "คัดลอกสำเร็จ" : "Copied",
        description: language === 'th' ? "คัดลอกรายงานไปยังคลิปบอร์ดแล้ว" : "Report copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: language === 'th' ? "เกิดข้อผิดพลาด" : "Error",
        description: language === 'th' ? "ไม่สามารถคัดลอกได้" : "Failed to copy",
        variant: "destructive",
      });
    });
  };

  const actualSales = parseFloat(form.watch("actualSales") || "0");
  const transactionCount = parseInt(form.watch("transactionCount") || "0");
  const avgTransaction = transactionCount > 0 ? Math.round(actualSales / transactionCount).toString() : "0";
  
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

  const handleAutoCalculateAddons = () => {
    const divisor = customAddonDivisor ? parseFloat(customAddonDivisor) : transactionCount;
    if (divisor > 0) {
      form.setValue("addCheesePercent", ((addCheeseCount / divisor) * 100).toFixed(2));
      form.setValue("vMealPercent", ((vMealCount / divisor) * 100).toFixed(2));
      form.setValue("upSizePercent", ((upSizeCount / divisor) * 100).toFixed(2));
      toast({
        title: language === 'th' ? "คำนวณสำเร็จ" : "Calculated",
        description: language === 'th' ? `คำนวณเปอร์เซ็นต์ Add-on จากตัวหาร ${divisor} แล้ว` : `Add-on percentages calculated with divisor ${divisor}`,
      });
    } else {
      toast({
        title: language === 'th' ? "ไม่สามารถคำนวณได้" : "Cannot calculate",
        description: language === 'th' ? "กรุณากรอกตัวหารหรือ TC ก่อน" : "Please enter divisor or TC first",
        variant: "destructive",
      });
    }
    setAddonDialogOpen(false);
  };


  const t = {
    formTitle: language === 'th' ? "สรุปยอดรายวัน" : "Daily Sales Report",
    formSubtitle: language === 'th' ? "กรอกข้อมูลยอดขายประจำวัน" : "Enter daily sales data",
    basicInfo: language === 'th' ? "ข้อมูลพื้นฐาน" : "Basic Information",
    date: language === 'th' ? "วันที่" : "Date",
    reporter: language === 'th' ? "ผู้รายงาน" : "Reporter",
    shift: language === 'th' ? "กะ" : "Shift",
    daily: language === 'th' ? "รายวัน" : "Daily",
    target: language === 'th' ? "เป้า (TG)" : "Target (TG)",
    actual: language === 'th' ? "ยอดจริง (AC)" : "Actual (AC)",
    tc: "TC",
    ta: "TA",
    mtd: "MTD",
    mtdTarget: language === 'th' ? "MTD เป้า" : "MTD Target",
    mtdActual: language === 'th' ? "MTD ยอดจริง" : "MTD Actual",
    variance: language === 'th' ? "ส่วนต่าง" : "Variance",
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
    performance: language === 'th' ? "ประสิทธิภาพ" : "Performance",
    osat: "OSAT",
    surveyCount: language === 'th' ? "จำนวน Survey" : "Survey Count",
    void: "Void",
    voidCount: language === 'th' ? "Void (Bill)" : "Void Count",
    addons: "Add-ons",
    addCheese: "Add Cheese",
    vMeal: "V-meal",
    upSize: "Up Size",
    waste: "Waste",
    wasteDaily: language === 'th' ? "รายวัน" : "Daily",
    wasteMtd: "MTD",
    raw: "Raw",
    meal: "Meal",
    labor: "Labor",
    col: "COL %",
    hour: language === 'th' ? "ชั่วโมง" : "Hour",
    tcmh: "TCMH",
    roster: "Roster",
    managerRosterDate: language === 'th' ? "วันที่ Roster ผู้จัดการ" : "Manager Roster Date",
    managerRoster: language === 'th' ? "Roster ผู้จัดการ" : "Manager Roster",
    staffRoster: language === 'th' ? "Roster พนักงาน" : "Staff Roster",
    unsavedDraft: language === 'th' ? "มีข้อมูลค้างอยู่" : "Unsaved draft",
    autoSaved: language === 'th' ? "บันทึกแล้ว" : "Auto saved",
    clearForm: language === 'th' ? "ล้างข้อมูล" : "Clear",
    copyReport: language === 'th' ? "คัดลอกรายงาน" : "Copy Report",
    saveReport: language === 'th' ? "บันทึก" : "Save",
    formula: language === 'th' ? "สูตรคำนวณ" : "Formula",
    autoCalculate: language === 'th' ? "คำนวณอัตโนมัติ" : "Auto Calculate",
    divisor: language === 'th' ? "ตัวหาร" : "Divisor",
    currentValues: language === 'th' ? "ค่าปัจจุบัน" : "Current Values",
    shiftFull: language === 'th' ? "ทั้งวัน" : "Full Day",
    shiftMorning: language === 'th' ? "เช้า" : "Morning",
    shiftEvening: language === 'th' ? "เย็น" : "Evening",
  };

  return (
    <SalesLayout>
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl font-semibold">{t.formTitle}</CardTitle>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">{t.formSubtitle}</p>
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
                  <span>{language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
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
                <h3 className="text-sm md:text-base font-medium mb-3">{t.basicInfo}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField control={form.control} name="reportDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm">{t.date}</FormLabel>
                      <FormControl><Input type="date" className="text-sm" {...field} data-testid="input-report-date" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reportBy" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm">{t.reporter}</FormLabel>
                      <FormControl><Input className="text-sm" placeholder={t.reporter} {...field} data-testid="input-reporter" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.daily}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="dailyTarget" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.target}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                          <FormattedInput className="pl-6 text-sm" {...field} data-testid="input-daily-target" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="actualSales" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.actual}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                          <FormattedInput className="pl-6 text-sm" {...field} data-testid="input-actual-sales" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transactionCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.tc}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} data-testid="input-tc" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.ta}</FormLabel>
                    <Input value={avgTransaction} readOnly className="bg-muted text-sm" data-testid="input-ta" />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.mtd}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <FormLabel className="text-xs">{t.mtdTarget}</FormLabel>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                      <Input 
                        value={mtdTarget.toLocaleString()} 
                        readOnly 
                        className="pl-6 text-sm bg-muted" 
                        data-testid="display-mtd-target" 
                      />
                    </div>
                  </div>
                  <div>
                    <FormLabel className="text-xs">{t.mtdActual}</FormLabel>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                      <Input 
                        value={mtdActual.toLocaleString()} 
                        readOnly 
                        className="pl-6 text-sm bg-muted" 
                        data-testid="display-mtd-actual" 
                      />
                    </div>
                  </div>
                  <div>
                    <FormLabel className="text-xs">{t.variance}</FormLabel>
                    <Input value={`${mtdVariance >= 0 ? '+' : ''}${mtdVariance.toLocaleString()}`} readOnly className={`text-sm ${mtdVariance >= 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`} />
                  </div>
                  <div>
                    <FormLabel className="text-xs">{t.mtdTc}</FormLabel>
                    <Input 
                      value={mtdTc.toLocaleString()} 
                      readOnly 
                      className="text-sm bg-muted" 
                      data-testid="display-mtd-tc" 
                    />
                  </div>
                  <div>
                    <FormLabel className="text-xs">{t.mtdTa}</FormLabel>
                    <Input value={mtdTa} readOnly className="bg-muted text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.inStore}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <FormField control={form.control} name="dineIn" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.dineIn} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-dine-in" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dineInTc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.dineInTc}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.dineIn} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("dineIn") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-dine-in-percent"
                    />
                  </div>
                  <FormField control={form.control} name="takeAway" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.takeAway} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-take-away" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="takeAwayTc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.takeAwayTc}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.takeAway} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("takeAway") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-take-away-percent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.delivery}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="grabfood" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.grabfood} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-grab" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.grabfood} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("grabfood") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-grab-percent"
                    />
                  </div>
                  <FormField control={form.control} name="lineman" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.lineman} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-lineman" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.lineman} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("lineman") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-lineman-percent"
                    />
                  </div>
                  <FormField control={form.control} name="shopee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.shopee} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-shopee" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.shopee} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("shopee") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-shopee-percent"
                    />
                  </div>
                  <FormField control={form.control} name="bkapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.bkapp} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-bkapp" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.bkapp} %</FormLabel>
                    <Input 
                      value={actualSales > 0 ? ((parseFloat(form.watch("bkapp") || "0") / actualSales) * 100).toFixed(2) : "0.00"} 
                      readOnly 
                      className="bg-muted text-sm" 
                      data-testid="display-bkapp-percent"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.performance}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="osat" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.osat}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-osat" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="surveyCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.surveyCount}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="voidAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.void} (฿)</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} data-testid="input-void" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="voidCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.voidCount}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-pink-50 dark:bg-pink-950/30 p-3 md:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm md:text-base font-medium">{t.addons}</h3>
                  <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                        <Calculator className="w-3 h-3 mr-1" />
                        {t.formula}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{language === 'th' ? 'สูตรคำนวณ Add-on %' : 'Add-on % Formula'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                          <p className="font-medium">{language === 'th' ? 'สูตรการคำนวณ:' : 'Calculation Formula:'}</p>
                          <p className="text-muted-foreground">Add Cheese % = (Add Cheese # / {t.divisor}) x 100</p>
                          <p className="text-muted-foreground">V-meal % = (V-meal # / {t.divisor}) x 100</p>
                          <p className="text-muted-foreground">Up Size % = (Up Size # / {t.divisor}) x 100</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg space-y-2 text-sm">
                          <p className="font-medium">{language === 'th' ? 'แก้ไขตัวหาร:' : 'Edit Divisor:'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{t.divisor} =</span>
                            <Input 
                              type="number" 
                              value={customAddonDivisor || transactionCount.toString()} 
                              onChange={(e) => setCustomAddonDivisor(e.target.value)}
                              className="w-24 text-sm"
                              placeholder={transactionCount.toString()}
                            />
                            <span className="text-xs text-muted-foreground">({language === 'th' ? 'ค่าเริ่มต้น: TC' : 'Default: TC'})</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg space-y-2 text-sm">
                          <p className="font-medium">{t.currentValues}</p>
                          <p>TC = {transactionCount}</p>
                          {(() => {
                            const divisor = customAddonDivisor ? parseFloat(customAddonDivisor) : transactionCount;
                            return (
                              <>
                                <p>Add Cheese # = {addCheeseCount} = {divisor > 0 ? ((addCheeseCount / divisor) * 100).toFixed(2) : '0.00'}%</p>
                                <p>V-meal # = {vMealCount} = {divisor > 0 ? ((vMealCount / divisor) * 100).toFixed(2) : '0.00'}%</p>
                                <p>Up Size # = {upSizeCount} = {divisor > 0 ? ((upSizeCount / divisor) * 100).toFixed(2) : '0.00'}%</p>
                              </>
                            );
                          })()}
                        </div>
                        <Button type="button" onClick={handleAutoCalculateAddons} className="w-full">
                          <Calculator className="w-4 h-4 mr-2" />
                          {t.autoCalculate}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <FormField control={form.control} name="addCheeseCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.addCheese} #</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="addCheesePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.addCheese} %</FormLabel>
                      <FormControl><Input className="text-sm bg-muted" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vMealCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.vMeal} #</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vMealPercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.vMeal} %</FormLabel>
                      <FormControl><Input className="text-sm bg-muted" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="upSizeCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.upSize} #</FormLabel>
                      <FormControl><FormattedInput className="text-sm" allowDecimals={false} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="upSizePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.upSize} %</FormLabel>
                      <FormControl><Input className="text-sm bg-muted" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 p-3 md:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm md:text-base font-medium">{t.waste}</h3>
                  <Dialog open={wasteDialogOpen} onOpenChange={setWasteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                        <Calculator className="w-3 h-3 mr-1" />
                        {t.formula}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{language === 'th' ? 'สูตรคำนวณ Waste %' : 'Waste % Formula'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                          <p className="font-medium">{language === 'th' ? 'สูตรการคำนวณ Daily:' : 'Daily Calculation Formula:'}</p>
                          <p className="text-muted-foreground">Daily % = (Daily / AC) x 100</p>
                          <p className="text-muted-foreground">Meal % = (Meal / AC) x 100</p>
                          <p className="text-muted-foreground">Raw % = (Raw / AC) x 100</p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                          <p className="font-medium">{language === 'th' ? 'สูตรการคำนวณ MTD:' : 'MTD Calculation Formula:'}</p>
                          <p className="text-muted-foreground">MTD % = (MTD / MTD AC) x 100</p>
                          <p className="text-muted-foreground">Meal % = (Meal / MTD AC) x 100</p>
                          <p className="text-muted-foreground">Raw % = (Raw / MTD AC) x 100</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-300">{language === 'th' ? 'หมายเหตุ:' : 'Note:'}</p>
                          <p className="text-blue-600 dark:text-blue-400">Daily - Meal = Raw</p>
                          <p className="text-blue-600 dark:text-blue-400">MTD - Meal = Raw</p>
                          <p className="text-xs text-muted-foreground mt-2">{language === 'th' ? '% คำนวณอัตโนมัติ' : '% is auto-calculated'}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{t.wasteDaily}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="wasteDailyTotal" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Daily (฿)</FormLabel>
                          <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div>
                        <FormLabel className="text-xs">Daily %</FormLabel>
                        <Input 
                          value={actualSales > 0 ? ((wasteDailyTotal / actualSales) * 100).toFixed(2) : "0.00"} 
                          readOnly 
                          className="bg-muted text-sm" 
                        />
                      </div>
                      <FormField control={form.control} name="wasteMealDaily" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} (฿)</FormLabel>
                          <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div>
                        <FormLabel className="text-xs">{t.meal} %</FormLabel>
                        <Input 
                          value={actualSales > 0 ? ((wasteMealDaily / actualSales) * 100).toFixed(2) : "0.00"} 
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
                          value={actualSales > 0 ? ((wasteRawDaily / actualSales) * 100).toFixed(2) : "0.00"} 
                          readOnly 
                          className="bg-muted text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{t.wasteMtd}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="wasteMtdTotal" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">MTD (฿)</FormLabel>
                          <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div>
                        <FormLabel className="text-xs">MTD %</FormLabel>
                        <Input 
                          value={mtdActual > 0 ? ((wasteMtdTotal / mtdActual) * 100).toFixed(2) : "0.00"} 
                          readOnly 
                          className="bg-muted text-sm" 
                        />
                      </div>
                      <FormField control={form.control} name="wasteMealMtd" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} (฿)</FormLabel>
                          <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div>
                        <FormLabel className="text-xs">{t.meal} %</FormLabel>
                        <Input 
                          value={mtdActual > 0 ? ((wasteMealMtd / mtdActual) * 100).toFixed(2) : "0.00"} 
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
                          value={mtdActual > 0 ? ((wasteRawMtd / mtdActual) * 100).toFixed(2) : "0.00"} 
                          readOnly 
                          className="bg-muted text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.labor}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="colPercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.col}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="laborHour" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.hour}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tcmh" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.tcmh}</FormLabel>
                      <FormControl><FormattedInput className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.roster}</h3>
                <div className="space-y-4">
                  <FormField control={form.control} name="managerRosterDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.managerRosterDate}</FormLabel>
                      <FormControl><Input type="date" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  
                  <div>
                    <FormLabel className="text-xs mb-2 block">{t.managerRoster}</FormLabel>
                    <div className="space-y-2">
                      {MANAGER_NAMES.map((manager) => (
                        <div key={manager.key} className="flex items-center gap-2">
                          <span className="text-sm min-w-[100px]">{manager.name}:</span>
                          <FormField control={form.control} name={manager.key as keyof FormData} render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="flex-1 text-sm" data-testid={`select-${manager.key}`}>
                                <SelectValue placeholder={language === 'th' ? "เลือกกะ" : "Select shift"} />
                              </SelectTrigger>
                              <SelectContent>
                                {SHIFT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel className="text-xs">{t.staffRoster}</FormLabel>
                      <Button type="button" size="sm" variant="outline" onClick={addStaffEntry} className="gap-1" data-testid="button-add-staff-entry">
                        <Plus className="w-3 h-3" />
                        {language === 'th' ? "เพิ่ม" : "Add"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {staffRosterEntries.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select value={entry.shiftGroup} onValueChange={(v) => updateStaffEntry(index, "shiftGroup", v)}>
                            <SelectTrigger className="w-[100px] text-sm" data-testid={`select-staff-shift-${index}`}>
                              <SelectValue placeholder={language === 'th' ? "กลุ่มกะ" : "Shift"} />
                            </SelectTrigger>
                            <SelectContent>
                              {STAFF_SHIFT_GROUPS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input 
                            value={entry.staffName} 
                            onChange={(e) => updateStaffEntry(index, "staffName", e.target.value)}
                            placeholder={language === 'th' ? "ชื่อเล่น" : "Nickname"}
                            className="flex-1 text-sm"
                            data-testid={`input-staff-name-${index}`}
                          />
                          {staffRosterEntries.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeStaffEntry(index)} data-testid={`button-remove-staff-${index}`}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormField control={form.control} name="managerRosterText" render={({ field }) => (
                    <input type="hidden" {...field} />
                  )} />
                  <FormField control={form.control} name="staffRosterText" render={({ field }) => (
                    <input type="hidden" {...field} />
                  )} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClearForm} className="gap-2" data-testid="button-clear-form">
                  <Trash2 className="w-4 h-4" />
                  {t.clearForm}
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveReport} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white" 
                  data-testid="button-save-report"
                >
                  <Save className="w-4 h-4" />
                  {language === 'th' ? "บันทึกลงฐานข้อมูล" : "Save to DB"}
                </Button>
                <Button type="button" onClick={handleCopyReport} className="gap-2 flex-1 sm:flex-none" data-testid="button-copy-report">
                  <Copy className="w-4 h-4" />
                  {t.copyReport}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </SalesLayout>
  );
}
