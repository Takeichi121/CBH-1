import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const TIPS = [
  "แนะนำลูกค้าเพิ่มชีสในเมนูพิเศษเพื่อเพิ่มยอดขาย",
  "อย่าลืมถามลูกค้าเรื่องบัตรสมาชิกทุกครั้ง",
  "เช็คอุณหภูมิตู้แช่ทุก 4 ชั่วโมงเพื่อความสดใหม่",
  "ยิ้มและทักทายลูกค้าด้วยเสียงที่สดใสเสมอ",
  "โปรโมชั่น 99 บาท ควรอัพเซลล์เป็น Go Large",
  "ทำความสะอาดบริเวณ Station ทันทีที่ว่าง",
  "ตรวจสอบ Stock กระดาษทิชชู่และซอสมะเขือเทศ",
  "ตอบคำถามลูกค้าอย่างสุภาพและรวดเร็ว",
  "ช่วยเหลือเพื่อนร่วมงานเมื่อเห็นว่างานหนัก",
  "ล้างมือบ่อยๆ เพื่อความสะอาดปลอดภัย",
];

export function DailyTip() {
  const todayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const tipOfTheDay = TIPS[todayIndex % TIPS.length];

  return (
    <Card className="border-primary/20 bg-card text-card-foreground shadow-sm" data-testid="card-daily-tip">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-primary">
          Tip of the Day
        </CardTitle>
        <Lightbulb className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold mt-2">"{tipOfTheDay}"</div>
        <p className="text-xs text-muted-foreground mt-2">
          เทคนิคประจำวันสำหรับทีม
        </p>
      </CardContent>
    </Card>
  );
}
