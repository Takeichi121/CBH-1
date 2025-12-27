import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/work");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLanguage(language === "en" ? "th" : "en")}
          className="gap-2"
        >
          <Globe className="w-4 h-4" />
          {language === "en" ? "ไทย" : "EN"}
        </Button>
      </div>
      
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto h-24 w-24 mb-6 transition-all duration-300 hover:scale-105 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30">
            <span className="text-white font-display font-bold text-4xl">BK</span>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            {t("appName")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("branchName")}</p>
          <p className="text-xs text-muted-foreground">{t("creator")}</p>
          <p className="text-muted-foreground text-sm mt-2">{t("appSubtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">{t("login")}</TabsTrigger>
            <TabsTrigger value="register">{t("register")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm onSuccess={() => setActiveTab("login")} />
          </TabsContent>
        </Tabs>
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
        <CardTitle>{t("welcomeBack")}</CardTitle>
        <CardDescription>{t("enterCredentials")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("username")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username..." {...field} className="h-11" />
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
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("signIn")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { registerStaffMutation, registerManagerMutation } = useAuth();
  const { t } = useI18n();
  const [role, setRole] = useState<"staff" | "manager">("staff");

  // Schema depends on role
  const schema = role === "staff" ? api.auth.registerStaff.input : api.auth.registerManager.input;
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      nickName: "",
      phone: "",
      email: "",
      password: "",
      verifyCode: "", // Only for manager
    },
  });

  function onSubmit(data: any) {
    if (role === "staff") {
      registerStaffMutation.mutate(data, { onSuccess: () => onSuccess?.() });
    } else {
      registerManagerMutation.mutate(data, { onSuccess: () => onSuccess?.() });
    }
  }

  const isPending = registerStaffMutation.isPending || registerManagerMutation.isPending;

  return (
    <Card className="glass-card border-none shadow-2xl">
      <CardHeader>
        <CardTitle>{t("createAccount")}</CardTitle>
        <CardDescription>{t("joinTeam")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Button 
            type="button" 
            variant={role === "staff" ? "default" : "outline"} 
            onClick={() => setRole("staff")}
            className="flex-1"
          >
            {t("staff")}
          </Button>
          <Button 
            type="button" 
            variant={role === "manager" ? "default" : "outline"} 
            onClick={() => setRole("manager")}
            className="flex-1"
          >
            {t("manager")}
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullName")}</FormLabel>
                  <FormControl><Input {...field} className="h-10" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nickName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nickname")}</FormLabel>
                    <FormControl><Input {...field} className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl><Input {...field} className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl><Input type="email" {...field} className="h-10" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl><Input type="password" {...field} className="h-10" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {role === "manager" && (
              <FormField
                control={form.control}
                name="verifyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("verificationCode")}</FormLabel>
                    <FormControl><Input type="password" placeholder={t("askAdmin")} {...field} className="h-10 border-primary/30" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full mt-4 h-11 shadow-lg shadow-primary/20"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("registerButton")} {role === "manager" ? t("manager") : t("staff")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
