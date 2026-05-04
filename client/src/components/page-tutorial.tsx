import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TutorialStep {
  titleTh: string;
  descriptionTh: string;
  icon?: React.ReactNode;
}

interface PageTutorialProps {
  pageKey: string;
  steps: TutorialStep[];
  autoShow?: boolean;
}

export function PageTutorial({ pageKey, steps, autoShow = true }: PageTutorialProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = user ? `bk_tutorial_${pageKey}_${user.username}` : null;

  useEffect(() => {
    if (!user || !autoShow || !storageKey) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, autoShow, storageKey]);

  const close = () => {
    if (storageKey) localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const open = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!user || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      <button
        onClick={open}
        className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        data-testid="button-tutorial-help"
        title="คู่มือการใช้งาน"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={close}
          data-testid="container-tutorial"
        >
          <Card
            className="w-full sm:w-[400px] max-w-[500px] shadow-2xl border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <CardContent className="p-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={close}
                  data-testid="button-close-tutorial"
                >
                  <X className="w-4 h-4" />
                </Button>

                <div className="p-6 pt-8 text-center">
                  {step.icon && (
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                        {step.icon}
                      </div>
                    </div>
                  )}
                  <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">
                    คู่มือการใช้งาน · ขั้นตอน {currentStep + 1} / {steps.length}
                  </div>
                  <h3 className="text-xl font-bold mb-3" data-testid="text-tutorial-title">
                    {step.titleTh}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-tutorial-desc">
                    {step.descriptionTh}
                  </p>
                </div>

                <div className="flex justify-center gap-1.5 pb-4">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
                      )}
                    />
                  ))}
                </div>

                <div className="flex justify-between p-4 border-t bg-muted/30 rounded-b-xl">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(s => s - 1)}
                    disabled={isFirst}
                    data-testid="button-tutorial-prev"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    ย้อนกลับ
                  </Button>
                  <Button
                    onClick={isLast ? close : () => setCurrentStep(s => s + 1)}
                    data-testid="button-tutorial-next"
                  >
                    {isLast ? (
                      <><CheckCircle className="w-4 h-4 mr-1" />เข้าใจแล้ว</>
                    ) : (
                      <>ถัดไป<ChevronRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
