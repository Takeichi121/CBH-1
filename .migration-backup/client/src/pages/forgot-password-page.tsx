import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, Sun, Moon, ChevronLeft, Mail, Key, Lock, CheckCircle, User } from "lucide-react";
import { LogoDataHouse } from "@/components/logo";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordPage() {
  const { t, language, setLanguage } = useI18n();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestOtp = async () => {
    if (!username || !email) {
      toast({
        title: language === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/requestPasswordReset", { username, email });
      const result = await response.json();
      if (result.ok) {
        setStep("otp");
        setCountdown(600);
        toast({
          title: t("otpSent"),
          description: email,
        });
      } else {
        toast({
          title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        description: language === "th" ? "ไม่สามารถส่ง OTP ได้" : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: language === "th" ? "กรุณากรอก OTP ให้ครบ" : "Please enter complete OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/verifyOtp", { email, otp });
      const result = await response.json();
      if (result.ok && result.resetToken) {
        setResetToken(result.resetToken);
        setStep("password");
      } else {
        toast({
          title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "OTP ไม่ถูกต้อง" : "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 4) {
      toast({
        title: language === "th" ? "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" : "Password must be at least 4 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/resetPassword", { resetToken, newPassword });
      const result = await response.json();
      if (result.ok) {
        setStep("success");
        toast({
          title: t("passwordResetSuccess"),
        });
      } else {
        toast({
          title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "เกิดข้อผิดพลาด" : "Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative bg-background overflow-x-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full border-primary/20 bg-background/50 backdrop-blur-sm"
          data-testid="button-theme-toggle-forgot"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-[#F5EB16]" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-[#0033A0]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === "en" ? "th" : "en")}
          className="gap-2 rounded-full bg-background/50 backdrop-blur-sm"
          data-testid="button-language-toggle-forgot"
        >
          <Globe className="w-4 h-4" />
          <span>{language === "en" ? "TH" : "EN"}</span>
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/auth")}
            data-testid="button-back-to-auth"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <LogoDataHouse size={40} />
          <div className="w-9" />
        </div>

        <Card className="border-none shadow-2xl">
          {step === "email" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>{t("resetPassword")}</CardTitle>
                <CardDescription>{t("enterEmailForReset")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">
                    <User className="w-4 h-4 inline mr-1" />
                    {t("username")}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={language === "th" ? "ชื่อผู้ใช้ของคุณ" : "Your username"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border-primary/20"
                    data-testid="input-username-forgot"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-1" />
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    className="border-primary/20"
                    data-testid="input-email-forgot"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleRequestOtp}
                  disabled={isLoading}
                  data-testid="button-send-otp"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t("sendOtp")}
                </Button>
              </CardContent>
            </>
          )}

          {step === "otp" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>{t("enterOtp")}</CardTitle>
                <CardDescription>{t("otpDescription")}</CardDescription>
                {countdown > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("otpExpiredIn")}: {formatCountdown(countdown)} {t("minutes")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t("verifyOtp")}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleRequestOtp}
                  disabled={isLoading || countdown > 540}
                  data-testid="button-resend-otp"
                >
                  {t("resendOtp")}
                </Button>
              </CardContent>
            </>
          )}

          {step === "password" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>{t("setNewPassword")}</CardTitle>
                <CardDescription>{t("newPasswordDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("newPassword")}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-primary/20"
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    className="border-primary/20"
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleResetPassword}
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t("resetPassword")}
                </Button>
              </CardContent>
            </>
          )}

          {step === "success" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>{t("passwordResetSuccess")}</CardTitle>
                <CardDescription>
                  {language === "th" 
                    ? "คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว" 
                    : "You can now login with your new password"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-back-to-login"
                >
                  {t("backToLogin")}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
