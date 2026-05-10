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
import { Loader2, User } from "lucide-react";

export function CompleteProfileModal() {
  const { user, completeProfileMutation, setUserProfileComplete } = useAuth();
  const { language } = useI18n();
  
  const [formData, setFormData] = useState({
    nickName: "",
    phone: "",
    email: "",
  });

  const showModal = !!(user && !user.profileComplete);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nickName.trim() || !formData.phone.trim() || !formData.email.trim()) {
      return;
    }

    completeProfileMutation.mutate(formData, {
      onSuccess: (data) => {
        if (data.ok) {
          setUserProfileComplete(formData);
        }
      },
    });
  };

  const isValid = formData.nickName.trim() && formData.phone.trim() && formData.email.trim();
  const isPending = completeProfileMutation.isPending;

  const labels = {
    title: language === "th" ? "กรุณากรอกข้อมูลส่วนตัว" : "Complete Your Profile",
    description: language === "th" 
      ? "กรุณากรอกข้อมูลให้ครบก่อนเข้าใช้งานระบบ" 
      : "Please fill in your information to continue",
    nickname: language === "th" ? "ชื่อเล่น" : "Nickname",
    phone: language === "th" ? "เบอร์โทรศัพท์" : "Phone Number",
    email: language === "th" ? "อีเมล" : "Email",
    submit: language === "th" ? "ยืนยัน" : "Confirm",
    required: language === "th" ? "(จำเป็น)" : "(required)",
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
            <User className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nickName">
              {labels.nickname} <span className="text-muted-foreground text-xs">{labels.required}</span>
            </Label>
            <Input
              id="nickName"
              value={formData.nickName}
              onChange={(e) => setFormData({ ...formData, nickName: e.target.value })}
              placeholder={language === "th" ? "ชื่อเล่นของคุณ" : "Your nickname"}
              className="h-11"
              data-testid="input-nickname"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              {labels.phone} <span className="text-muted-foreground text-xs">{labels.required}</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={language === "th" ? "08X-XXX-XXXX" : "Phone number"}
              className="h-11"
              data-testid="input-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {labels.email} <span className="text-muted-foreground text-xs">{labels.required}</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              className="h-11"
              data-testid="input-email"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 mt-6"
            disabled={!isValid || isPending}
            data-testid="button-complete-profile"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {labels.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
