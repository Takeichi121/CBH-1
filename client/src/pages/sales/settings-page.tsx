import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SalesLayout } from "./sales-layout";

export default function SalesSettingsPage() {
  const { language } = useI18n();
  const { toast } = useToast();

  const [storeName, setStoreName] = useState("BK Grand Diamond");
  const [storeCode, setStoreCode] = useState("BK001GDP");
  const [dailyTarget, setDailyTarget] = useState("250000");
  const [mtdTarget, setMtdTarget] = useState("7500000");

  const t = {
    title: language === "th" ? "ตั้งค่าร้านค้า" : "Store Settings",
    subtitle: language === "th" ? "จัดการข้อมูลและเป้าหมายร้านค้า" : "Manage store information and targets",
    storeInfo: language === "th" ? "ข้อมูลร้านค้า" : "Store Information",
    storeName: language === "th" ? "ชื่อร้าน" : "Store Name",
    storeCode: language === "th" ? "รหัสร้าน" : "Store Code",
    targets: language === "th" ? "เป้าหมาย" : "Targets",
    dailyTarget: language === "th" ? "เป้ารายวัน" : "Daily Target",
    mtdTarget: language === "th" ? "เป้า MTD" : "MTD Target",
    save: language === "th" ? "บันทึก" : "Save",
    saved: language === "th" ? "บันทึกแล้ว" : "Saved",
    savedDesc: language === "th" ? "การตั้งค่าถูกบันทึกเรียบร้อยแล้ว" : "Settings have been saved successfully",
  };

  const handleSave = () => {
    toast({
      title: t.saved,
      description: t.savedDesc,
    });
  };

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t.targets}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyTarget">{t.dailyTarget}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                  <Input
                    id="dailyTarget"
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    className="pl-7"
                    data-testid="input-daily-target"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtdTarget">{t.mtdTarget}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                  <Input
                    id="mtdTarget"
                    type="number"
                    value={mtdTarget}
                    onChange={(e) => setMtdTarget(e.target.value)}
                    className="pl-7"
                    data-testid="input-mtd-target"
                  />
                </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} data-testid="button-save-settings">
                {t.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}
