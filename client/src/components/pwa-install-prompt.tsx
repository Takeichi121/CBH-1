import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Smartphone } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const { language } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const t = {
    title: language === "th" ? "ติดตั้งแอป" : "Install App",
    description: language === "th" 
      ? "เพิ่มแอปลงหน้าจอหลักเพื่อเข้าถึงได้เร็วขึ้น" 
      : "Add to home screen for quick access",
    iosInstructions: language === "th"
      ? "กดปุ่ม Share แล้วเลือก 'Add to Home Screen'"
      : "Tap Share then 'Add to Home Screen'",
    install: language === "th" ? "ติดตั้ง" : "Install",
    later: language === "th" ? "ภายหลัง" : "Later",
  };

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{t.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isIOS ? t.iosInstructions : t.description}
              </p>
              {!isIOS && deferredPrompt && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall} data-testid="button-pwa-install">
                    <Download className="h-3 w-3 mr-1" />
                    {t.install}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss} data-testid="button-pwa-later">
                    {t.later}
                  </Button>
                </div>
              )}
              {isIOS && (
                <Button size="sm" variant="ghost" className="mt-2" onClick={handleDismiss} data-testid="button-pwa-dismiss-ios">
                  {t.later}
                </Button>
              )}
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 -mr-1 -mt-1" 
              onClick={handleDismiss}
              data-testid="button-pwa-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
