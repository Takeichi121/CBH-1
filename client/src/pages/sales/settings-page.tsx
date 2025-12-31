import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react";

type DailyTarget = {
  id?: number;
  targetDate: string;
  targetSales: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr: string, lang: string) {
  const date = new Date(dateStr);
  const days = lang === "th" 
    ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
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
  const [defaultTarget, setDefaultTarget] = useState("250000");

  const t = {
    title: language === "th" ? "ตั้งค่าร้านค้า" : "Store Settings",
    subtitle: language === "th" ? "จัดการข้อมูลและเป้าหมายร้านค้า" : "Manage store information and targets",
    storeInfo: language === "th" ? "ข้อมูลร้านค้า" : "Store Information",
    storeName: language === "th" ? "ชื่อร้าน" : "Store Name",
    storeCode: language === "th" ? "รหัสร้าน" : "Store Code",
    dailyTargets: language === "th" ? "เป้าหมายรายวัน" : "Daily Targets",
    date: language === "th" ? "วันที่" : "Date",
    day: language === "th" ? "วัน" : "Day",
    targetSales: language === "th" ? "เป้าหมาย (฿)" : "Target (฿)",
    save: language === "th" ? "บันทึก" : "Save",
    saving: language === "th" ? "กำลังบันทึก..." : "Saving...",
    saved: language === "th" ? "บันทึกแล้ว" : "Saved",
    savedDesc: language === "th" ? "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว" : "Settings have been saved successfully",
    savedTargets: language === "th" ? "บันทึกเป้าหมายรายวันเรียบร้อย" : "Daily targets saved successfully",
    errorSave: language === "th" ? "บันทึกไม่สำเร็จ" : "Failed to save",
    defaultTarget: language === "th" ? "เป้าเริ่มต้น" : "Default Target",
    applyAll: language === "th" ? "ใช้กับทุกวัน" : "Apply to All",
    monthTotal: language === "th" ? "รวมเดือน" : "Month Total",
    months: language === "th" 
      ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };

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
        dayOfWeek: getDayOfWeek(dateStr, language),
      };
    });
  }, [selectedYear, selectedMonth, daysInMonth, language]);

  const monthTotal = useMemo(() => {
    return monthDates.reduce((sum, { date }) => {
      return sum + (parseFloat(dailyTargets[date]) || 0);
    }, 0);
  }, [monthDates, dailyTargets]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/sales/getSettings", { token });
        const data = await res.json();
        if (data.ok && data.settings) {
          setStoreName(data.settings.storeName || "BK Grand Diamond");
          setStoreCode(data.settings.storeCode || "BK001GDP");
          setDefaultTarget(data.settings.dailyTarget?.toString() || "250000");
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
          setDailyTargets(prev => {
            const newTargets = { ...prev };
            monthDates.forEach(({ date }) => {
              if (targetMap[date] !== undefined) {
                newTargets[date] = targetMap[date];
              } else if (!newTargets[date]) {
                newTargets[date] = defaultTarget;
              }
            });
            return newTargets;
          });
        } else {
          setDailyTargets(prev => {
            const newTargets = { ...prev };
            monthDates.forEach(({ date }) => {
              if (!newTargets[date]) {
                newTargets[date] = defaultTarget;
              }
            });
            return newTargets;
          });
        }
      } catch (error) {
        console.error("Failed to load daily targets:", error);
      }
    };
    if (!isLoading) {
      loadDailyTargets();
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
          dailyTarget: parseFloat(defaultTarget) || 250000,
        }
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t.saved,
          description: t.savedDesc,
        });
      } else {
        toast({
          variant: "destructive",
          title: t.errorSave,
          description: data.message || "Unknown error",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.errorSave,
        description: error.message || "Unknown error",
      });
    } finally {
      setIsSaving(false);
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
      const res = await apiRequest("POST", "/api/sales/saveDailyTargets", {
        token,
        targets,
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t.saved,
          description: t.savedTargets,
        });
      } else {
        toast({
          variant: "destructive",
          title: t.errorSave,
          description: data.message || "Unknown error",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.errorSave,
        description: error.message || "Unknown error",
      });
    } finally {
      setIsSavingTargets(false);
    }
  };

  const handleApplyDefaultToAll = () => {
    const newTargets = { ...dailyTargets };
    monthDates.forEach(({ date }) => {
      newTargets[date] = defaultTarget;
    });
    setDailyTargets(newTargets);
  };

  const handleTargetChange = (date: string, value: string) => {
    setDailyTargets(prev => ({
      ...prev,
      [date]: value,
    }));
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
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">
            {t.title}
          </h1>
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
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  data-testid="input-store-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeCode">{t.storeCode}</Label>
                <Input
                  id="storeCode"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                  data-testid="input-store-code"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveStore} disabled={isSaving} data-testid="button-save-store">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTarget">{t.defaultTarget}</Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                    <Input
                      id="defaultTarget"
                      type="number"
                      value={defaultTarget}
                      onChange={(e) => setDefaultTarget(e.target.value)}
                      className="pl-7 w-[150px]"
                      data-testid="input-default-target"
                    />
                  </div>
                  <Button variant="outline" onClick={handleApplyDefaultToAll} data-testid="button-apply-all">
                    {t.applyAll}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-[80px]">{t.date}</th>
                      <th className="px-3 py-2 text-left font-medium w-[60px]">{t.day}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.targetSales}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDates.map(({ date, day, dayOfWeek }) => {
                      const isWeekend = dayOfWeek === "Sat" || dayOfWeek === "Sun" || dayOfWeek === "ส" || dayOfWeek === "อา";
                      return (
                        <tr 
                          key={date} 
                          className={isWeekend ? "bg-muted/30" : ""}
                          data-testid={`row-target-${day}`}
                        >
                          <td className="px-3 py-1.5 border-t">{day}</td>
                          <td className={`px-3 py-1.5 border-t ${isWeekend ? "text-muted-foreground" : ""}`}>
                            {dayOfWeek}
                          </td>
                          <td className="px-3 py-1.5 border-t">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">฿</span>
                              <Input
                                type="number"
                                value={dailyTargets[date] || ""}
                                onChange={(e) => handleTargetChange(date, e.target.value)}
                                className="h-8 pl-5 text-right text-sm"
                                data-testid={`input-target-${day}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/50 sticky bottom-0">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-medium border-t">
                        {t.monthTotal}
                      </td>
                      <td className="px-3 py-2 text-right font-bold border-t">
                        ฿{monthTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveTargets} disabled={isSavingTargets} data-testid="button-save-targets">
                {isSavingTargets ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}
