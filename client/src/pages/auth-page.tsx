import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {Loader2, Globe, Sun, Moon, ChevronLeft, HelpCircle} from "lucide-react";
import { Link } from "wouter";
import logoImg from "@assets/Burger_King_2020.svg_1766870334760.png";
import {useTheme} from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { managerPositions, type ManagerPosition } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [developerRole, setDeveloperRole] = useState<"staff" | "manager" | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const { theme, setTheme } = useTheme();
  const loginAttemptedRef = useRef(false);
  const { toast } = useToast();
  
  const handleVerifyCode = () => {
    if (verifyCode === "bk1040") {
      setIsCodeVerified(true);
    } else {
      toast({
        title: language === "th" ? "รหัสไม่ถูกต้อง" : "Invalid Code",
        description: language === "th" ? "กรุณาใส่รหัสที่ถูกต้อง" : "Please enter the correct verification code",
        variant: "destructive",
      });
      setVerifyCode("");
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      const targetPath = user.role === "manager" ? "/roster" : "/work";
      setLocation(targetPath);
    }
  }, [user, isLoading, setLocation]);

  // Auto-login for developer mode (bypasses system closed check)
  useEffect(() => {
    if (developerRole && isCodeVerified && !loginAttemptedRef.current && !loginMutation.isPending) {
      loginAttemptedRef.current = true;
      const username = developerRole === "staff" ? "staff" : "manager";
      loginMutation.mutate({ username, password: "1234", developerMode: true });
    }
  }, [developerRole, isCodeVerified, loginMutation]);

  if (isLoading) return null;
  if (user) return null;

  const creatorName = "Chanon Jaimool";
  const creatorShort = "Chan. J.";
  const creatorDisplay = `${creatorShort} (${creatorName})`;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center p-4 md:p-8 relative bg-background overflow-x-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full w-10 h-10 border-primary/20 hover:bg-primary/5 transition-all duration-300 relative overflow-hidden bg-background/50 backdrop-blur-sm"
          data-testid="button-theme-toggle-auth"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-[#F5EB16]" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-[#0033A0]" />
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLanguage(language === "en" ? "th" : "en")}
          className="gap-2 h-10 px-4 rounded-full bg-background/50 backdrop-blur-sm"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{language === "en" ? "ไทย" : "EN"}</span>
          <span className="sm:hidden">{language === "en" ? "TH" : "EN"}</span>
        </Button>
      </div>
      
      <div className="w-full max-w-md space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {isDeveloperMode ? (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground select-none">Developer Mode</h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsDeveloperMode(false);
                  setDeveloperRole(null);
                  setVerifyCode("");
                  setIsCodeVerified(false);
                  loginAttemptedRef.current = false;
                }}
                data-testid="button-exit-dev-mode"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            <Card className="glass-card border-none shadow-2xl">
              {!isCodeVerified ? (
                <>
                  <CardHeader>
                    <CardTitle className="select-none">Verify Access</CardTitle>
                    <CardDescription className="select-none">Enter code to access Developer Mode</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dev-verify-code" className="select-none">Verify Code</Label>
                      <Input
                        id="dev-verify-code"
                        type="password"
                        placeholder="Enter code..."
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleVerifyCode();
                          }
                        }}
                        className="h-11 border-primary/20 focus-visible:ring-primary/20"
                        autoFocus
                      />
                    </div>
                    <Button
                      className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
                      onClick={handleVerifyCode}
                      data-testid="button-verify-code"
                    >
                      Verify
                    </Button>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>{t("welcomeBack")}</CardTitle>
                    <CardDescription>Select developer mode</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      type="button"
                      variant="default"
                      className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
                      onClick={() => setDeveloperRole("staff")}
                      disabled={loginMutation.isPending}
                      data-testid="button-dev-mode-staff"
                    >
                      {loginMutation.isPending && developerRole === "staff" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Staff Developer Mode
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-base font-semibold"
                      onClick={() => setDeveloperRole("manager")}
                      disabled={loginMutation.isPending}
                      data-testid="button-dev-mode-manager"
                    >
                      {loginMutation.isPending && developerRole === "manager" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Manager Developer Mode
                    </Button>
                  </CardContent>
                </>
              )}
            </Card>
          </>
        ) : (
          <>
            <div className="text-center space-y-2 md:space-y-4 select-none">
              <div className="mx-auto h-20 w-20 md:h-32 md:w-32 mb-4 md:mb-6 flex items-center justify-center relative">
                <div className="w-full h-full rounded-2xl bg-primary flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-2xl md:text-4xl tracking-tight select-none">CBH</span>
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground leading-tight">
                  {t("appName")}
                </h1>
                <p className="text-sm md:text-base font-medium text-primary">{t("branchName")}</p>
              </div>
              <div className="hidden md:block space-y-1 pt-2">
                <p className="text-xs text-muted-foreground">
                  Created by{" "}
                  <button
                    type="button"
                    onClick={() => setIsDeveloperMode(true)}
                    className="text-primary hover:underline cursor-pointer transition-colors font-medium"
                    data-testid="button-open-dev-mode"
                  >
                    {creatorDisplay}
                  </button>
                </p>
                <p className="text-muted-foreground text-sm">{t("appSubtitle")}</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/30 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">{t("login")}</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">{t("register")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="animate-in fade-in slide-in-from-right-4 duration-300">
                <LoginForm />
              </TabsContent>
              
              <TabsContent value="register" className="animate-in fade-in slide-in-from-left-4 duration-300">
                <RegisterForm onSuccess={() => setActiveTab("login")} />
              </TabsContent>
            </Tabs>

            <div className="md:hidden text-center pt-4 space-y-1 select-none">
              <p className="text-[10px] text-muted-foreground">
                Created by{" "}
                <button
                  type="button"
                  onClick={() => setIsDeveloperMode(true)}
                  className="text-primary hover:underline cursor-pointer transition-colors font-medium"
                  data-testid="button-open-dev-mode-mobile"
                >
                  {creatorDisplay}
                </button>
              </p>
              <p className="text-muted-foreground text-[11px]">{t("appSubtitle")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const { t } = useI18n();
  
  const form = useForm({
    resolver: zodResolver(api.auth.login.input),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(data: z.infer<typeof api.auth.login.input>) {
    loginMutation.mutate(data);
  }

  return (
    <Card className="glass-card border-none shadow-2xl">
      <CardHeader>
        <CardTitle className="select-none">{t("welcomeBack")}</CardTitle>
        <CardDescription className="select-none">{t("enterCredentials")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="select-none">{t("username")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username..." {...field} className="h-11" data-testid="input-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="select-none">{t("password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="h-11" data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
            >
              {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("signIn")}
            </Button>
            <div className="text-center pt-2">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                {t("forgotPassword")}
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { registerStaffMutation, registerManagerMutation } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [role, setRole] = useState<"staff" | "manager" | "area">("staff");

  const registerAreaMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/registerArea", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({ title: language === "th" ? "สมัครสำเร็จ" : "Registered", description: data.username });
        onSuccess?.();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const form = useForm({
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      verifyCode: "",
    },
  });

  function onSubmit(data: any) {
    if (role === "staff") {
      registerStaffMutation.mutate(data, { onSuccess: () => onSuccess?.() });
    } else if (role === "area") {
      registerAreaMutation.mutate(data);
    } else {
      registerManagerMutation.mutate(data, { onSuccess: () => onSuccess?.() });
    }
  }

  const isPending = registerStaffMutation.isPending || registerManagerMutation.isPending || registerAreaMutation.isPending;

  return (
    <Card className="glass-card border-none shadow-2xl">
      <CardHeader>
        <CardTitle className="select-none">{t("createAccount")}</CardTitle>
        <CardDescription className="select-none">{t("joinTeam")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button type="button" variant={role === "staff" ? "default" : "outline"} onClick={() => setRole("staff")} className="flex-1">{t("staff")}</Button>
          <Button type="button" variant={role === "manager" ? "default" : "outline"} onClick={() => setRole("manager")} className="flex-1">{t("manager")}</Button>
          <Button type="button" variant={role === "area" ? "default" : "outline"} onClick={() => setRole("area")} className="flex-1">{language === "th" ? "Area" : "Area"}</Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">{language === "th" ? "Username (กำหนดเอง)" : "Username"}</FormLabel>
                <FormControl><Input placeholder={language === "th" ? "ตัวอักษร ตัวเลข _ เท่านั้น" : "Letters, numbers, _ only"} {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">{language === "th" ? "ชื่อ - สกุล" : "Full Name"}</FormLabel>
                <FormControl><Input {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">E-Mail</FormLabel>
                <FormControl><Input type="email" {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">{language === "th" ? "เบอร์โทร" : "Phone"}</FormLabel>
                <FormControl><Input {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">{language === "th" ? "รหัสผ่าน" : "Password"}</FormLabel>
                <FormControl><Input type="password" {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel className="select-none">{language === "th" ? "ยืนยันรหัสผ่าน" : "Confirm Password"}</FormLabel>
                <FormControl><Input type="password" {...field} className="h-10" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {(role === "manager" || role === "area") && (
              <FormField control={form.control} name="verifyCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="select-none">{language === "th" ? "โค้ดยืนยัน" : "Verification Code"}</FormLabel>
                  <FormControl><Input type="password" placeholder={t("askAdmin")} {...field} className="h-10 border-primary/30" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <Button type="submit" className="w-full mt-3 h-11 shadow-lg shadow-primary/20" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("registerButton")} {role === "manager" ? t("manager") : role === "area" ? "Area Manager" : t("staff")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
