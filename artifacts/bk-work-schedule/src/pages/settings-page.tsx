import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Globe, Moon, Sun, Lock, Settings, Unlock, Info, Camera, Wrench, Clock, AlertTriangle, Store, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useTheme } from "next-themes";
import { useAppTheme, BASE_THEMES, ACCENT_COLORS } from "@/hooks/use-app-theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { APP_VERSION, CHANGELOG } from "@shared/version";
import { requestNotificationPermission } from "@/lib/notifications";
import { RestartTourButton } from "@/components/onboarding-tour";
import { Bell, HelpCircle } from "lucide-react";
import { displayName as getDisplayName } from "@/lib/privacy";

export default function SettingsPage() {
  const { user, setUserProfilePicture } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const { baseTheme, accentColor, setBaseTheme, setAccentColor } = useAppTheme();
  const { toast } = useToast();
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { mutate: updateSettings, isPending: settingsUpdating } = useUpdateSettings();

  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isPictureUploading, setIsPictureUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileForm = useForm({
    defaultValues: {
      fullName: user?.fullName || "",
      nickName: user?.nickName || "",
      phone: user?.phone || "",
      email: user?.email || "",
    }
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        nickName: user.nickName || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user, profileForm]);

  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [multiStoreEnabled, setMultiStoreEnabled] = useState(false);
  const [multiStoreSaving, setMultiStoreSaving] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const capacityForm = useForm({ defaultValues: {} as Record<string, any> });
  const maintenanceForm = useForm({
    defaultValues: {
      enabled: false,
      startDay: 2,
      startTime: "12:00",
      endDay: 3,
      endTime: "00:00"
    }
  });

  useEffect(() => {
    if (settingsData) {
      const resetValues: any = { ...settingsData.capacity };
      if (settingsData.lockTimePeriod !== undefined) {
        resetValues.lockTimePeriod = settingsData.lockTimePeriod;
      }
      capacityForm.reset(resetValues);
      
      if (settingsData.maintenance) {
        maintenanceForm.reset(settingsData.maintenance);
      }

      if ((settingsData as any).multiStoreEnabled !== undefined) {
        setMultiStoreEnabled((settingsData as any).multiStoreEnabled);
      }
    }
  }, [settingsData, capacityForm, maintenanceForm]);

  const handleSaveMultiStore = async (enabled: boolean) => {
    setMultiStoreSaving(true);
    try {
      const res = await apiRequest("POST", "/api/settings/update", {
        token: localStorage.getItem("bk_token"),
        multiStoreEnabled: enabled,
      });
      const data = await res.json();
      if (data.ok) {
        setMultiStoreEnabled(enabled);
        toast({
          title: language === "th" ? "บันทึกแล้ว" : "Saved",
          description: language === "th"
            ? enabled ? "เปิดโหมด Multi-Store แล้ว" : "ปิดโหมด Multi-Store แล้ว"
            : enabled ? "Multi-Store mode enabled" : "Multi-Store mode disabled",
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message || "Failed" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setMultiStoreSaving(false);
    }
  };

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

  const onMaintenanceSubmit = (values: any) => {
    updateSettings({ 
      maintenance: {
        enabled: values.enabled,
        startDay: Number(values.startDay),
        startTime: values.startTime,
        endDay: Number(values.endDay),
        endTime: values.endTime
      }
    });
  };

  const dayOptions = [
    { value: 0, label: language === "th" ? "วันอาทิตย์" : "Sunday" },
    { value: 1, label: language === "th" ? "วันจันทร์" : "Monday" },
    { value: 2, label: language === "th" ? "วันอังคาร" : "Tuesday" },
    { value: 3, label: language === "th" ? "วันพุธ" : "Wednesday" },
    { value: 4, label: language === "th" ? "วันพฤหัสบดี" : "Thursday" },
    { value: 5, label: language === "th" ? "วันศุกร์" : "Friday" },
    { value: 6, label: language === "th" ? "วันเสาร์" : "Saturday" },
  ];

  const handleRefreshConfig = () => {
    window.location.reload();
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

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Error", description: t("fileTooLarge") || "File size must be less than 2MB" });
      return;
    }

    setIsPictureUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = `data:${file.type};base64,${btoa(binary)}`;
      const res = await apiRequest("POST", "/api/updateProfilePicture", {
        token: localStorage.getItem("bk_token"),
        profilePicture: base64
      });
      const data = await res.json();
      if (data.ok) {
        setUserProfilePicture(base64);
        toast({ title: "Success", description: t("profilePictureUpdated") || "Profile picture updated" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message || "Failed to update" });
      }
      setIsPictureUploading(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setIsPictureUploading(false);
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
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/30 shadow-lg ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
                  <AvatarImage src={user?.profilePicture || ""} alt={user?.fullName || ""} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user?.nickName?.charAt(0)?.toUpperCase() || user?.fullName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                  data-testid="input-profile-picture"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPictureUploading}
                  data-testid="button-change-profile-picture"
                >
                  {isPictureUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("clickToChangePhoto") || "Click to change photo"}</p>
            </div>
            <p className="text-center font-semibold text-base mb-4">{user ? getDisplayName(user) : ""}</p>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("fullName")}</Label>
                  <Input {...profileForm.register("fullName")} className="rounded-xl" data-testid="input-fullname" />
                </div>
                <div className="space-y-2">
                  <Label>{t("nickname")}</Label>
                  <Input {...profileForm.register("nickName")} className="rounded-xl" data-testid="input-nickname" />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input {...profileForm.register("phone")} className="rounded-xl" data-testid="input-phone" />
                </div>
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input {...profileForm.register("email")} type="email" className="rounded-xl" data-testid="input-email" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isProfileUpdating} className="rounded-xl" data-testid="button-update-profile">
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

            {/* ── Base Theme ── */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  {language === "th" ? "ธีมพื้นหลัง" : "Background Theme"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === "th" ? "เลือกโทนสีพื้นหลังของ app" : "Choose the overall color tone"}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BASE_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBaseTheme(t.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                      baseTheme === t.id
                        ? "border-primary ring-2 ring-primary/40 scale-[1.04]"
                        : "border-border hover:border-primary/50 hover:scale-[1.02]"
                    }`}
                    title={t.labelTh}
                  >
                    <div className="h-14 w-full" style={{ background: t.bg }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 h-6 mx-1.5 mb-1.5 rounded-lg"
                        style={{ background: t.card }}
                      />
                    </div>
                    <div className="py-1 text-center text-[11px] font-medium bg-muted/60 text-foreground">
                      {t.labelTh}
                    </div>
                    {baseTheme === t.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Accent Color ── */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {language === "th" ? "สี Accent" : "Accent Color"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === "th" ? "สีหลักของปุ่มและองค์ประกอบ" : "Main color for buttons and highlights"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {ACCENT_COLORS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccentColor(a.id)}
                    className={`relative flex flex-col items-center gap-1 group focus:outline-none`}
                    title={a.labelTh}
                  >
                    <div
                      className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                        accentColor === a.id
                          ? "border-foreground scale-110 shadow-lg"
                          : "border-transparent group-hover:scale-105 group-hover:border-foreground/40"
                      }`}
                      style={{ background: a.hex }}
                    >
                      {accentColor === a.id && (
                        <div className="w-full h-full rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${accentColor === a.id ? "text-foreground" : "text-muted-foreground"}`}>
                      {a.labelTh}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {language === "th" ? "การแจ้งเตือน" : "Notifications"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === "th" ? "รับการแจ้งเตือนเมื่อมีข้อความใหม่" : "Get notified when new messages arrive"}
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    const granted = await requestNotificationPermission();
                    setNotificationsEnabled(granted);
                    if (!granted) {
                      toast({
                        title: language === "th" ? "ไม่สามารถเปิดการแจ้งเตือน" : "Cannot enable notifications",
                        description: language === "th" ? "กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์" : "Please allow notifications in browser settings",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                data-testid="switch-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  {language === "th" ? "คู่มือใช้งาน" : "App Tutorial"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === "th" ? "ดูทัวร์แนะนำการใช้งานแอปอีกครั้ง" : "View the app introduction tour again"}
                </p>
              </div>
              <RestartTourButton />
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
              <div className="flex-1">
                <CardTitle>Manager Settings</CardTitle>
                <CardDescription>Configure shift capacity limits</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshConfig}
                data-testid="button-load-config"
              >
                <Loader2 className={`h-4 w-4 ${settingsLoading ? "animate-spin" : ""}`} />
                {language === "th" ? "โหลดการตั้งค่า" : "Load Config"}
              </Button>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <form onSubmit={capacityForm.handleSubmit(onCapacitySubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["open", "swing", "lunch", "dinner", "close", "late"].map((key) => (
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

        {isManager && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle>{language === "th" ? "จัดการ Dropdown" : "Dropdown Settings"}</CardTitle>
                <CardDescription>{language === "th" ? "จัดการตัวเลือก dropdown เช่น กะ, กลุ่มกะ" : "Manage dropdown options like shifts, shift groups"}</CardDescription>
              </div>
              <Link href="/settings/dropdowns">
                <Button variant="outline" size="sm" data-testid="button-dropdown-settings">
                  {language === "th" ? "จัดการ" : "Manage"}
                </Button>
              </Link>
            </CardHeader>
          </Card>
        )}

        {/* Multi-Store Mode Toggle (Manager only) */}
        {isManager && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <CardTitle>{language === "th" ? "โหมด Multi-Store" : "Multi-Store Mode"}</CardTitle>
                <CardDescription>
                  {language === "th"
                    ? "เมื่อปิด หน้าล็อคอินจะไม่แสดงช่องรหัสร้าน"
                    : "When off, login page will not require Store Code"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Store className={`w-3 h-3 ${multiStoreEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                      {language === "th"
                        ? multiStoreEnabled ? "เปิดโหมด Multi-Store" : "ปิดโหมด Multi-Store"
                        : multiStoreEnabled ? "Multi-Store Enabled" : "Single-Store Mode"}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {language === "th"
                        ? multiStoreEnabled
                          ? "พนักงานต้องกรอกรหัสร้านเพื่อเข้าสู่ระบบ"
                          : "พนักงานไม่ต้องกรอกรหัสร้าน — ใช้สำหรับร้านเดียว"
                        : multiStoreEnabled
                          ? "Staff must enter store code to log in"
                          : "No store code required — use for single-store setup"}
                    </p>
                  </div>
                  <Switch
                    checked={multiStoreEnabled}
                    disabled={multiStoreSaving}
                    onCheckedChange={handleSaveMultiStore}
                    data-testid="switch-multi-store"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Maintenance Window Settings (Manager only) */}
        {isManager && (
          <Card className="glass-card border-none shadow-xl">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <CardTitle>{language === "th" ? "ช่วงเวลาปิดระบบ" : "Maintenance Window"}</CardTitle>
                <CardDescription>{language === "th" ? "ตั้งเวลาปิดการลงทะเบียนกะงานอัตโนมัติ" : "Schedule automatic shift registration closure"}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              ) : (
                <form onSubmit={maintenanceForm.handleSubmit(onMaintenanceSubmit)} className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        {maintenanceForm.watch("enabled") ? (
                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        )}
                        {language === "th" ? "เปิดใช้งานช่วงเวลาปิดระบบ" : "Enable Maintenance Window"}
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        {language === "th" 
                          ? "เมื่อเปิดใช้งาน พนักงานจะไม่สามารถลงทะเบียนกะงานในช่วงเวลาที่กำหนด" 
                          : "When enabled, staff cannot register shifts during the specified time"}
                      </p>
                    </div>
                    <Switch
                      checked={maintenanceForm.watch("enabled")}
                      onCheckedChange={(checked) => maintenanceForm.setValue("enabled", checked)}
                      data-testid="switch-maintenance-enabled"
                    />
                  </div>

                  {maintenanceForm.watch("enabled") && (
                    <>
                      {settingsData?.systemClosed && (
                        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            {language === "th" ? "ระบบปิดอยู่ในขณะนี้" : "System is currently closed"}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{language === "th" ? "วันเริ่มต้น" : "Start Day"}</Label>
                          <Select 
                            value={String(maintenanceForm.watch("startDay"))} 
                            onValueChange={(v) => maintenanceForm.setValue("startDay", Number(v))}
                          >
                            <SelectTrigger className="rounded-xl" data-testid="select-start-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dayOptions.map(opt => (
                                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{language === "th" ? "เวลาเริ่มต้น" : "Start Time"}</Label>
                          <Input
                            type="time"
                            {...maintenanceForm.register("startTime")}
                            className="rounded-xl"
                            data-testid="input-start-time"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{language === "th" ? "วันสิ้นสุด" : "End Day"}</Label>
                          <Select 
                            value={String(maintenanceForm.watch("endDay"))} 
                            onValueChange={(v) => maintenanceForm.setValue("endDay", Number(v))}
                          >
                            <SelectTrigger className="rounded-xl" data-testid="select-end-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dayOptions.map(opt => (
                                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{language === "th" ? "เวลาสิ้นสุด" : "End Time"}</Label>
                          <Input
                            type="time"
                            {...maintenanceForm.register("endTime")}
                            className="rounded-xl"
                            data-testid="input-end-time"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={settingsUpdating} className="rounded-xl" data-testid="button-save-maintenance">
                      {settingsUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      {language === "th" ? "บันทึก" : "Save"}
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("version")}</Label>
                <p className="font-medium text-foreground" data-testid="text-version">{APP_VERSION}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("lastUpdated")}</Label>
                <p className="font-medium text-foreground" data-testid="text-last-updated">{CHANGELOG[0]?.date || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">{t("developer")}</Label>
                <p className="font-medium text-foreground" data-testid="text-developer">Chanon</p>
              </div>
            </div>

            {CHANGELOG[0] && (
              <div className="border border-border/50 rounded-xl p-4 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">อัพเดทล่าสุด — v{CHANGELOG[0].version}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      CHANGELOG[0].label === "improvement" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                      CHANGELOG[0].label === "bugfix" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                      CHANGELOG[0].label === "release" ? "bg-primary/10 text-primary" :
                      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    }`}>
                      {CHANGELOG[0].label === "improvement" ? "ปรับปรุง" :
                       CHANGELOG[0].label === "bugfix" ? "แก้ไข Bug" :
                       CHANGELOG[0].label === "release" ? "เปิดตัว" : "ฟีเจอร์ใหม่"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{CHANGELOG[0].date}</span>
                </div>
                <ul className="space-y-1">
                  {CHANGELOG[0].changes.slice(0, 4).map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/handbook">
                  <button className="text-xs text-primary hover:underline mt-1" data-testid="link-full-changelog">
                    ดูประวัติการอัพเดททั้งหมด →
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border/50 space-y-2">
        <p>&copy; 2025 Chann Back House. Developed by Chanon</p>
        <p>Version {APP_VERSION} | Last updated: {CHANGELOG[0]?.date || "N/A"}</p>
        <Link href="/dev-toolbox">
          <Button variant="ghost" size="sm" className="text-muted-foreground/50 hover:text-muted-foreground gap-1" data-testid="button-dev-toolbox">
            <Wrench className="h-3 w-3" />
            <span className="text-xs">Developer Tools</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
