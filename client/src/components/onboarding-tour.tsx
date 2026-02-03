import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { 
  Briefcase, Calendar, Settings, BarChart3, Package, 
  MessageCircle, ChevronRight, ChevronLeft, X, Sparkles,
  CheckCircle, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  titleTh: string;
  description: string;
  descriptionTh: string;
  icon: React.ReactNode;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to BK Grand Diamond!",
    titleTh: "ยินดีต้อนรับสู่ BK Grand Diamond!",
    description: "Let us show you around the app. This quick tour will help you get started.",
    descriptionTh: "ให้เราพาคุณชมแอปกัน ทัวร์สั้นๆ นี้จะช่วยให้คุณเริ่มต้นได้ง่ายขึ้น",
    icon: <Sparkles className="w-12 h-12 text-primary" />,
  },
  {
    title: "My Work",
    titleTh: "งานของฉัน",
    description: "View and manage your shifts here. Book your work schedule for the week.",
    descriptionTh: "ดูและจัดการกะงานของคุณได้ที่นี่ จองตารางงานประจำสัปดาห์",
    icon: <Briefcase className="w-12 h-12 text-blue-500" />,
    highlight: "/work",
  },
  {
    title: "Roster View",
    titleTh: "ดูตารางงาน",
    description: "See the full team roster. Check who's working on each day.",
    descriptionTh: "ดูตารางงานของทีมทั้งหมด ตรวจสอบว่าใครทำงานวันไหน",
    icon: <Calendar className="w-12 h-12 text-green-500" />,
    highlight: "/roster",
  },
  {
    title: "Sales Reports",
    titleTh: "รายงานยอดขาย",
    description: "Track daily sales, targets, and performance metrics. (Manager only)",
    descriptionTh: "ติดตามยอดขายรายวัน เป้าหมาย และตัวชี้วัดผลงาน (สำหรับผู้จัดการ)",
    icon: <BarChart3 className="w-12 h-12 text-orange-500" />,
    highlight: "/sales",
  },
  {
    title: "Borrow Tracker",
    titleTh: "ระบบยืม-คืน",
    description: "Manage item borrowing between branches. Track what's borrowed.",
    descriptionTh: "จัดการการยืมคืนสินค้าระหว่างสาขา ติดตามของที่ถูกยืม",
    icon: <Package className="w-12 h-12 text-purple-500" />,
    highlight: "/borrow",
  },
  {
    title: "Meet Chann AI",
    titleTh: "พบกับ Chann AI",
    description: "Your intelligent assistant! Ask questions, get summaries, and analyze data.",
    descriptionTh: "ผู้ช่วยอัจฉริยะของคุณ! ถามคำถาม สรุปข้อมูล และวิเคราะห์ข้อมูล",
    icon: <Bot className="w-12 h-12 text-cyan-500" />,
  },
  {
    title: "Settings",
    titleTh: "ตั้งค่า",
    description: "Customize your profile, change password, and adjust preferences.",
    descriptionTh: "ปรับแต่งโปรไฟล์ เปลี่ยนรหัสผ่าน และตั้งค่าต่างๆ",
    icon: <Settings className="w-12 h-12 text-gray-500" />,
    highlight: "/settings",
  },
  {
    title: "You're All Set!",
    titleTh: "พร้อมแล้ว!",
    description: "Start exploring the app. If you need help, just ask Chann!",
    descriptionTh: "เริ่มใช้งานแอปได้เลย ถ้าต้องการความช่วยเหลือ ถาม Chann ได้เลย!",
    icon: <CheckCircle className="w-12 h-12 text-green-500" />,
  },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    if (user) {
      const tourKey = `bk_onboarding_${user.username}`;
      const seen = localStorage.getItem(tourKey);
      if (!seen) {
        setHasSeenTour(false);
        setIsOpen(true);
      }
    }
  }, [user]);

  const completeTour = () => {
    if (user) {
      const tourKey = `bk_onboarding_${user.username}`;
      localStorage.setItem(tourKey, "true");
    }
    setHasSeenTour(true);
    setIsOpen(false);
  };

  const skipTour = () => {
    completeTour();
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!user || hasSeenTour) return null;
  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="container-onboarding">
      <Card className="w-[400px] max-w-[90vw] shadow-2xl border-2 border-primary/20 animate-in fade-in zoom-in duration-300">
        <CardContent className="p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={skipTour}
              data-testid="button-skip-tour"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                  {step.icon}
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2" data-testid="text-tour-title">
                {step.titleTh}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">
                {step.title}
              </p>
              <p className="text-muted-foreground mt-4" data-testid="text-tour-description">
                {step.descriptionTh}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                {step.description}
              </p>
            </div>

            <div className="flex justify-center gap-1 pb-4">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentStep
                      ? "bg-primary w-6"
                      : idx < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="flex justify-between p-4 border-t bg-muted/30">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirst}
                data-testid="button-prev-step"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                ย้อนกลับ
              </Button>

              <Button
                onClick={nextStep}
                data-testid="button-next-step"
              >
                {isLast ? (
                  <>
                    เริ่มใช้งาน
                    <CheckCircle className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    ถัดไป
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RestartTourButton() {
  const { user } = useAuth();
  
  const restartTour = () => {
    if (user) {
      const tourKey = `bk_onboarding_${user.username}`;
      localStorage.removeItem(tourKey);
      window.location.reload();
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={restartTour}
      className="gap-2"
      data-testid="button-restart-tour"
    >
      <Sparkles className="w-4 h-4" />
      ดูคู่มือใช้งานอีกครั้ง
    </Button>
  );
}
