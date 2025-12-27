import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Globe, Moon, Sun, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
    if (settingsData?.capacity) {
      capacityForm.reset(settingsData.capacity);
    }
  }, [settingsData, capacityForm]);

  const onCapacitySubmit = (values: any) => {
    const payload: Record<string, number> = {};
    Object.keys(values).forEach(key => {
      payload[key] = Number(values[key]);
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
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">{t("settings")}</h2>
        <p className="text-muted-foreground">Manage your profile and application preferences</p>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="flex items-center justify-between border-t pt-6">
            <div className="space-y-0.5">
              <Label className="text-base">{t("theme")}</Label>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <div className="flex bg-muted p-1 rounded-xl">
              <Button 
                variant={theme === "light" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTheme("light")}
                className="rounded-lg h-8"
              >
                <Sun className="w-4 h-4 mr-2" />
                {t("light")}
              </Button>
              <Button 
                variant={theme === "dark" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTheme("dark")}
                className="rounded-lg h-8"
              >
                <Moon className="w-4 h-4 mr-2" />
                {t("dark")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Section (Managers only) */}
      {isManager && (
        <Card className="glass-card border-none shadow-xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Save className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Shift Capacity</CardTitle>
              <CardDescription>System-wide maximum staff per shift group</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
            ) : (
              <form onSubmit={capacityForm.handleSubmit(onCapacitySubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settingsData?.groups?.map((group: any) => (
                    <div key={group.key} className="space-y-2">
                      <Label className="text-sm font-semibold">{group.label}</Label>
                      <Input 
                        type="number" 
                        min="0"
                        {...capacityForm.register(group.key)} 
                        className="h-10 text-center rounded-xl"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={settingsUpdating} className="rounded-xl">
                    {settingsUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Capacities
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
