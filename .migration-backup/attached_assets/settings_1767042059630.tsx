import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/language-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StoreSettings } from "@shared/schema";

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  
  const [storeName, setStoreName] = useState("BK Grand Diamond");
  const [storeCode, setStoreCode] = useState("BK001GDP");
  const [dailyTarget, setDailyTarget] = useState("250000");

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
  });

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName);
      setStoreCode(settings.storeCode);
      setDailyTarget(settings.dailyTarget.toString());
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { storeName: string; storeCode: string; dailyTarget: number }) => {
      return apiRequest("PUT", "/api/store-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      toast({
        title: language === 'th' ? "บันทึกสำเร็จ" : "Saved Successfully",
        description: language === 'th' ? "การตั้งค่าร้านค้าถูกบันทึกแล้ว" : "Store settings have been saved",
      });
    },
    onError: () => {
      toast({
        title: language === 'th' ? "เกิดข้อผิดพลาด" : "Error",
        description: language === 'th' ? "ไม่สามารถบันทึกการตั้งค่าได้" : "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveStoreSettings = () => {
    updateSettingsMutation.mutate({
      storeName,
      storeCode,
      dailyTarget: parseInt(dailyTarget) || 250000,
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: language === 'th' ? "บันทึกสำเร็จ" : "Saved Successfully",
      description: language === 'th' ? "การตั้งค่าผู้ใช้ถูกบันทึกแล้ว" : "User preferences have been saved",
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t.pages.settings.storeSettings}
          </CardTitle>
          <p className="text-gray-600 text-sm">{t.pages.settings.storeSettingsDesc}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeName">{t.pages.settings.storeName}</Label>
              <Input 
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-2"
                data-testid="input-store-name"
              />
            </div>
            <div>
              <Label htmlFor="storeCode">{t.pages.settings.storeCode}</Label>
              <Input 
                id="storeCode"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                className="mt-2"
                data-testid="input-store-code"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="dailyTarget">{t.pages.settings.dailyTarget}</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₿</span>
                <Input 
                  id="dailyTarget"
                  type="number"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                  className="pl-8"
                  data-testid="input-daily-target"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button 
              className="bg-bk-red hover:bg-red-700" 
              data-testid="button-save-store"
              onClick={handleSaveStoreSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending 
                ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') 
                : t.pages.settings.saveChanges}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t.pages.settings.userPreferences}
          </CardTitle>
          <p className="text-gray-600 text-sm">{t.pages.settings.userPreferencesDesc}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t.pages.settings.language}</Label>
              <Select value={language} onValueChange={(val) => setLanguage(val as 'th' | 'en')}>
                <SelectTrigger className="mt-2" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="th">🇹🇭 ไทย</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'th' ? 'โซนเวลา' : 'Time Zone'}</Label>
              <Select defaultValue="asia-bangkok">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia-bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="notifications" defaultChecked data-testid="checkbox-notifications" />
              <Label htmlFor="notifications" className="text-sm text-gray-700">
                {t.pages.settings.enableNotifications}
              </Label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button 
              className="bg-bk-red hover:bg-red-700" 
              data-testid="button-save-preferences"
              onClick={handleSavePreferences}
            >
              {t.pages.settings.saveChanges}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {language === 'th' ? 'ข้อมูลระบบ' : 'System Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'th' ? 'เวอร์ชัน:' : 'Version:'}</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'th' ? 'ปรับปรุงล่าสุด:' : 'Last Updated:'}</span>
              <span className="text-sm font-medium">{new Date().toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{language === 'th' ? 'ผู้พัฒนา:' : 'Developer:'}</span>
              <span className="text-sm font-medium">Chanon Jaimool</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
