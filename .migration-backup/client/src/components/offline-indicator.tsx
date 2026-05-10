import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export function OfflineIndicator() {
  const { language } = useI18n();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  const offlineText = language === "th" ? "ออฟไลน์ - ไม่มีอินเทอร์เน็ต" : "Offline - No internet";
  const onlineText = language === "th" ? "เชื่อมต่อแล้ว" : "Back online";

  return (
    <div
      className={`sticky top-16 z-[60] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300 ${
        isOnline
          ? "bg-green-500 dark:bg-green-600 text-white"
          : "bg-destructive text-destructive-foreground"
      }`}
      data-testid="indicator-offline"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>{onlineText}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>{offlineText}</span>
        </>
      )}
    </div>
  );
}
