import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Globe, Moon, Sun, Lock, Settings, Unlock, Info, Camera, Wrench, Clock, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, useRef } from "react";
import { useI18n, languageLabels } from "@/hooks/use-i18n";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

export default function SettingsPage() {
  const { user, setUserProfilePicture } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
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
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const capacityForm = useForm();
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
    }
  }, [settingsData, capacityForm, maintenanceForm]);

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
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
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
      };
      reader.readAsDataURL(file);
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
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={user?.profilePicture || ""} alt={user?.fullName || ""} />
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
                <SelectTrigger className="w-[160px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageLabels).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
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
      <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border/50 space-y-2">
        <p>&copy; 2025 BK Grand Diamond. Developed by Chanon</p>
        <p>Version 1.0.0 | Last updated: 12/29/2025</p>
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
