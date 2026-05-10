import { Loader2 } from "lucide-react";
import { LogoDataHouse } from "@/components/logo";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-bounce">
          <LogoDataHouse size={48} />
        </div>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </div>
  );
}
