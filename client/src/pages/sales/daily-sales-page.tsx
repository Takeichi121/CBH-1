import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Save, Trash2, Copy, Calculator, BarChart3 } from "lucide-react";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";

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
  wasteRawDaily: z.string().default("0"),
  wasteRawDailyPercent: z.string().default("0"),
  wasteMealDaily: z.string().default("0"),
  wasteMealDailyPercent: z.string().default("0"),
  wasteRawMtd: z.string().default("0"),
  wasteRawMtdPercent: z.string().default("0"),
  wasteMealMtd: z.string().default("0"),
  wasteMealMtdPercent: z.string().default("0"),
  colPercent: z.string().default("0"),
  laborHour: z.string().default("0"),
  tcmh: z.string().default("0"),
  managerRosterDate: z.string().default(""),
  managerRosterText: z.string().default(""),
  staffRosterText: z.string().default(""),
});

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
  const [customWasteDivisor, setCustomWasteDivisor] = useState<string>("");
  const [customWasteMtdDivisor, setCustomWasteMtdDivisor] = useState<string>("");

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
      wasteRawDaily: "0",
      wasteRawDailyPercent: "0",
      wasteMealDaily: "0",
      wasteMealDailyPercent: "0",
      wasteRawMtd: "0",
      wasteRawMtdPercent: "0",
      wasteMealMtd: "0",
      wasteMealMtdPercent: "0",
      colPercent: "0",
      laborHour: "0",
      tcmh: "0",
      managerRosterDate: "",
      managerRosterText: "",
      staffRosterText: "",
    }
  });

  const { saveData, restoreData, clearData, hasDraft } = useFormPersistence<FormData>('daily-sales-form');
  const { hasUnsavedChanges, markAsChanged, markAsSaved } = useUnsavedChanges();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((values: FormData) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveData(values);
      setLastSaved(new Date());
      setShowAutoSave(true);
      markAsSaved();
      if (hideAutoSaveTimerRef.current) {
        clearTimeout(hideAutoSaveTimerRef.current);
      }
      hideAutoSaveTimerRef.current = setTimeout(() => setShowAutoSave(false), 3000);
    }, 1000);
  }, [saveData, markAsSaved]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (Object.values(values).some(value => value && value !== "0" && value !== "")) {
        markAsChanged();
        debouncedSave(values as FormData);
      }
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (hideAutoSaveTimerRef.current) clearTimeout(hideAutoSaveTimerRef.current);
    };
  }, [debouncedSave, markAsChanged]);

  useEffect(() => {
    const restored = restoreData();
    if (restored) {
      (Object.keys(restored) as Array<keyof FormData>).forEach((key) => {
        if (restored[key] !== undefined) {
          form.setValue(key, restored[key]);
        }
      });
    }
  }, [form.setValue, restoreData]);

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
    const taVal = tcVal > 0 ? (actualSalesVal / tcVal).toFixed(2) : "0";
    
    const mtdActualVal = parseFloat(v.mtdActual) || 0;
    const mtdTargetVal = parseFloat(v.mtdTarget) || 0;
    const mtdVariance = mtdActualVal - mtdTargetVal;
    const mtdTcVal = parseInt(v.mtdTc) || 0;
    const mtdTaVal = mtdTcVal > 0 ? (mtdActualVal / mtdTcVal).toFixed(2) : "0";
    
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
    
    const wasteRawDailyVal = parseFloat(v.wasteRawDaily) || 0;
    const wasteMealDailyVal = parseFloat(v.wasteMealDaily) || 0;
    const wasteTotalDailyVal = wasteRawDailyVal + wasteMealDailyVal;
    
    const wasteRawMtdVal = parseFloat(v.wasteRawMtd) || 0;
    const wasteMealMtdVal = parseFloat(v.wasteMealMtd) || 0;
    const wasteTotalMtdVal = wasteRawMtdVal + wasteMealMtdVal;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    const reportText = `Daily Sales Report - Grand Diamond
Date: ${formatDate(v.reportDate)}
================================

Daily
TG (Target): ฿${parseFloat(v.dailyTarget).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
AC (Actual Sales): ฿${actualSalesVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
TC (Transaction Count): ${tcVal.toLocaleString()}
TA (Average Transaction): ${taVal}

MTD (Month To Day) 
MTD TG: ฿${mtdTargetVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
MTD AC: ฿${mtdActualVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
Variance: ฿${mtdVariance >= 0 ? '+' : ''}${mtdVariance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
MTD TC: ${mtdTcVal.toLocaleString()}
MTD TA: ${mtdTaVal}

In Store
Dine In: ฿${dineInVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${dineInPercent}%
TC: ${parseInt(v.dineInTc) || 0}
Take Away: ฿${takeAwayVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${takeAwayPercent}%
TC: ${parseInt(v.takeAwayTc) || 0}
In Store Total: ฿${inStoreTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${inStoreTotalPercent}%

DELIVERY
Grab: ฿${grabVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${grabPercent}%
LINE MAN: ฿${linemanVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${linemanPercent}%
Shoppee Food: ฿${shopeeVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${shopeePercent}%
BK App/Web: ฿${bkappVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${bkappPercent}%
Delivery Total: ฿${deliveryTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${deliveryTotalPercent}%
================================

OSAT: ${v.osat}
Survey count: ${v.surveyCount}
Void: -฿${parseFloat(v.voidAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
count: ${v.voidCount || 0} Bill

Add Cheese: ${v.addCheeseCount}/${v.addCheesePercent}%
V-meal: ${v.vMealCount}/${v.vMealPercent}%
Up Size: ${v.upSizeCount}/${v.upSizePercent}%
================================

WASTE
Daily
Raw: ${wasteRawDailyVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${v.wasteRawDailyPercent}%
Meal: ${wasteMealDailyVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${v.wasteMealDailyPercent}%
Daily: ${wasteTotalDailyVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${((parseFloat(v.wasteRawDailyPercent) || 0) + (parseFloat(v.wasteMealDailyPercent) || 0)).toFixed(2)}%

MTD 
Raw: ${wasteRawMtdVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${v.wasteRawMtdPercent}%
Meal: ${wasteMealMtdVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${v.wasteMealMtdPercent}%
MTD: ${wasteTotalMtdVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/${((parseFloat(v.wasteRawMtdPercent) || 0) + (parseFloat(v.wasteMealMtdPercent) || 0)).toFixed(2)}%
================================

COL: ${v.colPercent}%
Hour: ${v.laborHour}
TCMH = ${v.tcmh}
================================

Manager Roster Date: ${formatDate(v.managerRosterDate)}

${v.managerRosterText || 'Name:Group Shift | Time/OFF,COM,Vacation'}

Roster Staff
${v.staffRosterText || 'Group Shift | Time: Name'}

Report by ${v.reportBy}`;

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
  const avgTransaction = transactionCount > 0 ? (actualSales / transactionCount).toFixed(2) : "0";
  
  const mtdActual = parseFloat(form.watch("mtdActual") || "0");
  const mtdTc = parseInt(form.watch("mtdTc") || "0");
  const mtdTa = mtdTc > 0 ? (mtdActual / mtdTc).toFixed(2) : "0";
  const mtdTarget = parseFloat(form.watch("mtdTarget") || "0");
  const mtdVariance = mtdActual - mtdTarget;

  const addCheeseCount = parseInt(form.watch("addCheeseCount") || "0");
  const vMealCount = parseInt(form.watch("vMealCount") || "0");
  const upSizeCount = parseInt(form.watch("upSizeCount") || "0");

  const wasteRawDailyVal = parseFloat(form.watch("wasteRawDaily") || "0");
  const wasteMealDailyVal = parseFloat(form.watch("wasteMealDaily") || "0");
  const wasteRawMtdVal = parseFloat(form.watch("wasteRawMtd") || "0");
  const wasteMealMtdVal = parseFloat(form.watch("wasteMealMtd") || "0");

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

  const handleAutoCalculateWaste = () => {
    const dailyDivisor = customWasteDivisor ? parseFloat(customWasteDivisor) : actualSales;
    const mtdDivisor = customWasteMtdDivisor ? parseFloat(customWasteMtdDivisor) : mtdActual;
    
    if (dailyDivisor > 0 || mtdDivisor > 0) {
      if (dailyDivisor > 0) {
        form.setValue("wasteRawDailyPercent", ((wasteRawDailyVal / dailyDivisor) * 100).toFixed(2));
        form.setValue("wasteMealDailyPercent", ((wasteMealDailyVal / dailyDivisor) * 100).toFixed(2));
      }
      if (mtdDivisor > 0) {
        form.setValue("wasteRawMtdPercent", ((wasteRawMtdVal / mtdDivisor) * 100).toFixed(2));
        form.setValue("wasteMealMtdPercent", ((wasteMealMtdVal / mtdDivisor) * 100).toFixed(2));
      }
      toast({
        title: language === 'th' ? "คำนวณสำเร็จ" : "Calculated",
        description: language === 'th' ? "คำนวณเปอร์เซ็นต์ Waste แล้ว" : "Waste percentages calculated",
      });
    } else {
      toast({
        title: language === 'th' ? "ไม่สามารถคำนวณได้" : "Cannot calculate",
        description: language === 'th' ? "กรุณากรอกตัวหารหรือยอดขาย (AC) ก่อน" : "Please enter divisor or Actual Sales (AC) first",
        variant: "destructive",
      });
    }
    setWasteDialogOpen(false);
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
              {showAutoSave && (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <FormField control={form.control} name="workShift" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm">{t.shift}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm" data-testid="select-shift">
                            <SelectValue placeholder={t.shift} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">{t.shiftFull}</SelectItem>
                          <SelectItem value="morning">{t.shiftMorning}</SelectItem>
                          <SelectItem value="evening">{t.shiftEvening}</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <Input type="number" step="0.01" className="pl-6 text-sm" {...field} data-testid="input-daily-target" />
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
                          <Input type="number" step="0.01" className="pl-6 text-sm" {...field} data-testid="input-actual-sales" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transactionCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.tc}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} data-testid="input-tc" /></FormControl>
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
                  <FormField control={form.control} name="mtdTarget" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.mtdTarget}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                          <Input type="number" step="0.01" className="pl-6 text-sm" {...field} data-testid="input-mtd-target" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mtdActual" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.mtdActual}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                          <Input type="number" step="0.01" className="pl-6 text-sm" {...field} data-testid="input-mtd-actual" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.variance}</FormLabel>
                    <Input value={`${mtdVariance >= 0 ? '+' : ''}${mtdVariance.toLocaleString()}`} readOnly className={`text-sm ${mtdVariance >= 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`} />
                  </div>
                  <FormField control={form.control} name="mtdTc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.mtdTc}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} data-testid="input-mtd-tc" /></FormControl>
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel className="text-xs">{t.mtdTa}</FormLabel>
                    <Input value={mtdTa} readOnly className="bg-muted text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.inStore}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="dineIn" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.dineIn} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-dine-in" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dineInTc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.dineInTc}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="takeAway" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.takeAway} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-take-away" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="takeAwayTc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.takeAwayTc}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.delivery}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="grabfood" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.grabfood} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-grab" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lineman" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.lineman} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-lineman" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="shopee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.shopee} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-shopee" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bkapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.bkapp} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-bkapp" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.performance}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField control={form.control} name="osat" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.osat}</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-osat" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="surveyCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.surveyCount}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="voidAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.void} (฿)</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} data-testid="input-void" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="voidCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.voidCount}</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
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
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="addCheesePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.addCheese} %</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vMealCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.vMeal} #</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vMealPercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.vMeal} %</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="upSizeCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.upSize} #</FormLabel>
                      <FormControl><Input type="number" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="upSizePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.upSize} %</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
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
                          <p className="font-medium">{language === 'th' ? 'สูตรการคำนวณ:' : 'Calculation Formula:'}</p>
                          <p className="text-muted-foreground">Raw % = (Raw / {t.divisor}) x 100</p>
                          <p className="text-muted-foreground">Meal % = (Meal / {t.divisor}) x 100</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg space-y-3 text-sm">
                          <p className="font-medium">{language === 'th' ? 'แก้ไขตัวหาร:' : 'Edit Divisor:'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">Daily =</span>
                            <Input 
                              type="number" 
                              value={customWasteDivisor || actualSales.toString()} 
                              onChange={(e) => setCustomWasteDivisor(e.target.value)}
                              className="w-28 text-sm"
                              placeholder={actualSales.toString()}
                            />
                            <span className="text-xs text-muted-foreground">({language === 'th' ? 'ค่าเริ่มต้น: AC' : 'Default: AC'})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">MTD =</span>
                            <Input 
                              type="number" 
                              value={customWasteMtdDivisor || actualSales.toString()} 
                              onChange={(e) => setCustomWasteMtdDivisor(e.target.value)}
                              className="w-28 text-sm"
                              placeholder={actualSales.toString()}
                            />
                            <span className="text-xs text-muted-foreground">({language === 'th' ? 'ค่าเริ่มต้น: AC' : 'Default: AC'})</span>
                          </div>
                        </div>
                        <Button type="button" onClick={handleAutoCalculateWaste} className="w-full">
                          <Calculator className="w-4 h-4 mr-2" />
                          {t.autoCalculate}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{t.wasteDaily}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="wasteRawDaily" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.raw} (฿)</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteRawDailyPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.raw} %</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteMealDaily" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} (฿)</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteMealDailyPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} %</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{t.wasteMtd}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="wasteRawMtd" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.raw} (฿)</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteRawMtdPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.raw} %</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteMealMtd" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} (฿)</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="wasteMealMtdPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t.meal} %</FormLabel>
                          <FormControl><Input type="number" step="0.01" className="text-sm bg-muted" readOnly {...field} /></FormControl>
                        </FormItem>
                      )} />
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
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="laborHour" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.hour}</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tcmh" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.tcmh}</FormLabel>
                      <FormControl><Input type="number" step="0.01" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/30 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-base font-medium mb-3">{t.roster}</h3>
                <div className="space-y-3">
                  <FormField control={form.control} name="managerRosterDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.managerRosterDate}</FormLabel>
                      <FormControl><Input type="date" className="text-sm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="managerRosterText" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.managerRoster} (Name:Group Shift | Time/OFF,COM,Vacation)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Name:Group Shift | Time/OFF,COM,Vacation" 
                          className="text-sm min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="staffRosterText" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t.staffRoster} (Group Shift | Time: Name)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Group Shift | Time: Name" 
                          className="text-sm min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClearForm} className="gap-2" data-testid="button-clear-form">
                  <Trash2 className="w-4 h-4" />
                  {t.clearForm}
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
