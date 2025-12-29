import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Globe, Moon, Sun, Lock, Settings, Unlock, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { mutate: updateSettings, isPending: settingsUpdating } = useUpdateSettings();

  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const profileForm = useForm({
    defaultValues: {
      fullName: user?.fullName || "",
      nickName: user?.nickName || "",
      phone: user?.phone || "",
      email: user?.email || "",
    }
  });

  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const capacityForm = useForm();

  useEffect(() => {
    if (settingsData) {
      const resetValues: any = { ...settingsData.capacity };
      if (settingsData.lockTimePeriod !== undefined) {
        resetValues.lockTimePeriod = settingsData.lockTimePeriod;
      }
      capacityForm.reset(resetValues);
    }
  }, [settingsData, capacityForm]);

  const onCapacitySubmit = (values: any) => {
    const payload: any = { capacity: {} };
    Object.keys(values).forEach(key => {
      if (key === "lockTimePeriod") {
        payload.lockTimePeriod = values[key];
      } else {
        payload.capacity[key] = Number(values[key]);
      }
    });
    updateSettings(payload);
  };

  const onProfileSubmit = async (values: any) => {
    setIsProfileUpdating(true);
    try {
      const res = await apiRequest("POST", "/api/updateProfile", {
        token: localStorage.getItem("bk_token"),
        ...values
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: t("profileUpdated") });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message || "Failed to update profile" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const onPasswordSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: t("passwordsDoNotMatch") });
      return;
    }

    setIsPasswordUpdating(true);
    try {
      const res = await apiRequest("POST", "/api/changePassword", {
        token: localStorage.getItem("bk_token"),
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: t("passwordChanged") });
        passwordForm.reset();
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message || "Failed to change password" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const isManager = user?.role === "manager" || user?.role === "admin";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">{t("settings")}</h2>
        <p className="text-muted-foreground">Manage your profile and application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Profile Section */}
        <Card className="glass-card border-none shadow-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("profileInformation")}</CardTitle>
              <CardDescription>{t("updateDetails")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("fullName")}</Label>
                  <Input {...profileForm.register("fullName")} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t("nickname")}</Label>
                  <Input {...profileForm.register("nickName")} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input {...profileForm.register("phone")} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input {...profileForm.register("email")} type="email" className="rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isProfileUpdating} className="rounded-xl">
                  {isProfileUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("updateProfile")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="glass-card border-none shadow-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("security")}</CardTitle>
              <CardDescription>{t("passwordManagement")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("currentPassword")}</Label>
                <Input {...passwordForm.register("currentPassword")} type="password" title="current-password" name="currentPassword" id="currentPassword" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("newPassword")}</Label>
                  <Input {...passwordForm.register("newPassword")} type="password" title="new-password" name="newPassword" id="newPassword" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>{t("confirmNewPassword")}</Label>
                  <Input {...passwordForm.register("confirmPassword")} type="password" title="confirm-password" name="confirmPassword" id="confirmPassword" className="rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isPasswordUpdating} className="rounded-xl" variant="outline">
                  {isPasswordUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("changePassword")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Appearance & Language Section */}
        <Card className="glass-card border-none shadow-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("preferences")}</CardTitle>
              <CardDescription>{t("appearance")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">{t("language")}</Label>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>
              <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                <SelectTrigger className="w-[140px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">{t("theme")}</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl">
                <Button
                  variant={theme === "light" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="rounded-lg px-3"
                >
                  <Sun className="w-4 h-4 mr-2" />
                  {t("light")}
                </Button>
                <Button
                  variant={theme === "dark" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="rounded-lg px-3"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  {t("dark")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manager Settings (Conditional) */}
        {isManager && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Manager Settings</CardTitle>
                <CardDescription>Configure shift capacity limits</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <form onSubmit={capacityForm.handleSubmit(onCapacitySubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["open", "lunch", "dinner", "late"].map((key) => (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize">{t(key as any) || key}</Label>
                        <Input
                          type="number"
                          {...capacityForm.register(key)}
                          className="rounded-xl"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        {capacityForm.watch("lockTimePeriod") ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
                        Lock Time Period
                      </Label>
                      <p className="text-[10px] text-muted-foreground">When enabled, staff cannot change their start time</p>
                    </div>
                    <Switch
                      checked={capacityForm.watch("lockTimePeriod")}
                      onCheckedChange={(checked) => capacityForm.setValue("lockTimePeriod", checked)}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={settingsUpdating} className="rounded-xl">
                      {settingsUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save Capacity
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card className="glass-card border-none shadow-xl md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("systemInformation")}</CardTitle>
              <CardDescription>{t("aboutSystem")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("version")}</Label>
                <p className="font-medium text-foreground" data-testid="text-version">1.0.0</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("lastUpdated")}</Label>
                <p className="font-medium text-foreground" data-testid="text-last-updated">12/29/2025</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("developer")}</Label>
                <p className="font-medium text-foreground" data-testid="text-developer">Chanon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border/50 space-y-1">
        <p>&copy; 2025 BK Grand Diamond. Developed by Chanon</p>
        <p>Version 1.0.0 | Last updated: 12/29/2025</p>
      </div>
    </div>
  );
}
