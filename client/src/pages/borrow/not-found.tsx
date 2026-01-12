import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n"; // ✅ เพิ่มการรองรับภาษา

export default function NotFound() {
  const { language } = useI18n();

  const text = {
    title: language === "th" ? "ไม่พบหน้านี้" : "Page Not Found",
    desc: language === "th" 
      ? "หน้าที่คุณกำลังค้นหาไม่มีอยู่จริง หรืออาจถูกย้ายไปแล้ว" 
      : "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
    home: language === "th" ? "กลับหน้าหลัก" : "Back to Home",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="pt-8 pb-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">404</h1>
            <h2 className="text-xl font-semibold text-foreground">{text.title}</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {text.desc}
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link href="/">
              <Button className="w-full sm:w-auto min-w-[140px]">
                <Home className="mr-2 h-4 w-4" />
                {text.home}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}