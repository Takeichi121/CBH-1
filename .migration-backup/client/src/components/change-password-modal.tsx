import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";

export function ChangePasswordModal() {
  const { user, forceChangePasswordMutation, setUserPasswordChanged } = useAuth();
  const { language } = useI18n();
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const showModal = !!(user && user.mustChangePassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword.trim() || formData.newPassword !== formData.confirmPassword) {
      return;
    }

    forceChangePasswordMutation.mutate({ newPassword: formData.newPassword }, {
      onSuccess: (data) => {
        if (data.ok) {
          setUserPasswordChanged();
        }
      },
    });
  };

  const isValid = formData.newPassword.trim().length >= 4 && formData.newPassword === formData.confirmPassword;
  const isPending = forceChangePasswordMutation.isPending;

  const labels = {
    title: language === "th" ? "กรุณาตั้งรหัสผ่านใหม่" : "Set New Password",
    description: language === "th" 
      ? "คุณต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งานระบบ" 
      : "You must change your password to continue",
    newPassword: language === "th" ? "รหัสผ่านใหม่" : "New Password",
    confirmPassword: language === "th" ? "ยืนยันรหัสผ่าน" : "Confirm Password",
    submit: language === "th" ? "เปลี่ยนรหัสผ่าน" : "Change Password",
    required: language === "th" ? "(อย่างน้อย 4 ตัวอักษร)" : "(at least 4 characters)",
    mismatch: language === "th" ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match",
  };

  return (
    <Dialog open={showModal}>
      <DialogContent 
        className="sm:max-w-md glass-card border-none shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {labels.newPassword} <span className="text-muted-foreground text-xs">{labels.required}</span>
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="********"
              className="h-11"
              data-testid="input-new-password"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {labels.confirmPassword}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="********"
              className="h-11"
              data-testid="input-confirm-password"
            />
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-destructive text-xs">{labels.mismatch}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 mt-6"
            disabled={!isValid || isPending}
            data-testid="button-change-password"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {labels.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
