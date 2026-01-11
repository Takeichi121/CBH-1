import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, Calculator, DollarSign, Clock } from "lucide-react";

export default function LaborSettingsPage() {
  const { language } = useI18n();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState({
    rosterHours: 88,
    dutyDailyHours: 40,
    ptWageRate: 45,
    fixedCostDaily: 0,
    closeShiftDailyCost: 0,
  });

  const t = {
    title: language === "th" ? "ตั้งค่าต้นทุนแรงงาน" : "Labor Cost Settings",
    subtitle: language === "th" ? "จัดการค่าคงที่สำหรับคำนวณ COL และ Productivity" : "Manage constants for COL and Productivity calculations",
    hoursSettings: language === "th" ? "การตั้งค่าชั่วโมงงาน (Hours)" : "Hours Settings",
    costSettings: language === "th" ? "การตั้งค่าต้นทุน (Cost)" : "Cost Settings",
    rosterHours: language === "th" ? "Roster Commit (ชม./วัน)" : "Roster Commit (Hrs/Day)",
    rosterDesc: language === "th" ? "เป้าชั่วโมงจาก Area (เช่น 88, 96)" : "Target hours from Area",
    dutyHours: language === "th" ? "Duty Team (ชม./วัน)" : "Duty Team Hours (Daily)",
    dutyDesc: language === "th" ? "ชั่วโมงคงที่ของผู้จัดการ (เช่น 5 คน x 8 ชม. = 40)" : "Fixed management hours",
    ptWage: language === "th" ? "ค่าแรง PT (บาท/ชม.)" : "PT Wage Rate (Baht/Hr)",
    fixCost: language === "th" ? "Fixed Cost (บาท/วัน)" : "Fixed Cost (Baht/Day)",
    fixCostDesc: language === "th" ? "เงินเดือน FT/Manager เฉลี่ยรายวัน" : "Daily average salary of FT/Manager",
    closeCost: language === "th" ? "ค่ารถปิดร้าน (บาท/วัน)" : "Closing Shift Cost (Daily)",
    save: language === "th" ? "บันทึกการตั้งค่า" : "Save Settings",
    saving: language === "th" ? "กำลังบันทึก..." : "Saving...",
    saved: language === "th" ? "บันทึกสำเร็จ" : "Saved",
    error: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
    hoursNote: language === "th" ? "ใช้คำนวณ Variance และ Productivity" : "Used for Variance and Productivity",
    costNote: language === "th" ? "ใช้คำนวณ % COL และ Labor Cost" : "Used for COL% and Labor Cost",
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        const res = await apiRequest("POST", "/api/settings/get-labor", { token });
        const data = await res.json();
        
        if (data.ok && data.settings) {
          setConfig({
            rosterHours: Number(data.settings.rosterHours) || 88,
            dutyDailyHours: Number(data.settings.dutyDailyHours) || 40,
            ptWageRate: Number(data.settings.ptWageRate) || 45,
            fixedCostDaily: Number(data.settings.fixedCostDaily) || 0,
            closeShiftDailyCost: Number(data.settings.closeShiftDailyCost) || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load labor settings:", error);
        toast({
          variant: "destructive",
          title: t.error,
          description: "Failed to load settings",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [toast, t.error]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("bk_token");
      const payload = {
        token,
        rosterHours: Number(config.rosterHours),
        dutyDailyHours: Number(config.dutyDailyHours),
        ptWageRate: Number(config.ptWageRate),
        fixedCostDaily: Number(config.fixedCostDaily),
        closeShiftDailyCost: Number(config.closeShiftDailyCost),
      };

      const res = await apiRequest("POST", "/api/settings/save-labor", payload);
      const data = await res.json();

      if (data.ok) {
        toast({
          title: t.saved,
          description: language === "th" ? "อัปเดตข้อมูลเรียบร้อยแล้ว" : "Settings updated successfully",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.error,
        description: error.message || "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center min-h-[300px]" data-testid="loading-spinner">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </SalesLayout>
    );
  }

  return (
    <SalesLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-labor-settings-title">
            <Calculator className="w-6 h-6 text-blue-600" />
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="text-labor-settings-subtitle">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-blue-500" />
                {t.hoursSettings}
              </CardTitle>
              <CardDescription>{t.hoursNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.rosterHours}</Label>
                <Input
                  type="number"
                  value={config.rosterHours}
                  onChange={(e) => setConfig({ ...config, rosterHours: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                  data-testid="input-roster-hours"
                />
                <p className="text-xs text-muted-foreground">{t.rosterDesc}</p>
              </div>
              
              <div className="space-y-2">
                <Label>{t.dutyHours}</Label>
                <Input
                  type="number"
                  value={config.dutyDailyHours}
                  onChange={(e) => setConfig({ ...config, dutyDailyHours: parseFloat(e.target.value) || 0 })}
                  className="font-mono bg-slate-50 dark:bg-slate-800"
                  data-testid="input-duty-hours"
                />
                <p className="text-xs text-muted-foreground">{t.dutyDesc}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-green-500" />
                {t.costSettings}
              </CardTitle>
              <CardDescription>{t.costNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.ptWage}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={config.ptWageRate}
                    onChange={(e) => setConfig({ ...config, ptWageRate: parseFloat(e.target.value) || 0 })}
                    className="font-mono pl-8"
                    data-testid="input-pt-wage"
                  />
                  <span className="absolute left-3 top-2 text-muted-foreground">฿</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.fixCost}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={config.fixedCostDaily}
                    onChange={(e) => setConfig({ ...config, fixedCostDaily: parseFloat(e.target.value) || 0 })}
                    className="font-mono pl-8"
                    data-testid="input-fixed-cost"
                  />
                  <span className="absolute left-3 top-2 text-muted-foreground">฿</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.fixCostDesc}</p>
              </div>

              <div className="space-y-2">
                <Label>{t.closeCost}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={config.closeShiftDailyCost}
                    onChange={(e) => setConfig({ ...config, closeShiftDailyCost: parseFloat(e.target.value) || 0 })}
                    className="font-mono pl-8"
                    data-testid="input-close-shift-cost"
                  />
                  <span className="absolute left-3 top-2 text-muted-foreground">฿</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full md:w-auto min-w-[200px]"
            data-testid="button-save-labor-settings"
          >
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
      </div>
    </SalesLayout>
  );
}
