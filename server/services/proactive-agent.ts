import cron from "node-cron";
import { getAlohaSalesRaw } from "./aloha-service";
import { getNBOSalesAuto } from "./nbo-service";
import { pushToBoss } from "../socket";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";

export function initProactiveChann() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("🌞 [Chann] ตื่นมาเตรียมรายงานให้เจ้านายแล้วครับ...");

      const [alohaData, nboData] = await Promise.all([
        getAlohaSalesRaw(),
        getNBOSalesAuto(),
      ]);

      if (!alohaData && !nboData) {
        console.warn("[Chann] ดึงข้อมูลไม่ได้ทั้ง Aloha และ NBO");
        return;
      }

      const prompt = `
เจ้านายครับ นี่คือสรุปยอดล่าสุด:
- ยอดจาก Aloha (DBF): ${alohaData ? alohaData.totalFromDbf.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- ยอดจาก NBO (SQL): ${nboData ? nboData.TotalSales.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- จำนวนลูกค้า (NBO): ${nboData ? nboData.GuestCount.toLocaleString("th-TH") : "-"} คน

ช่วยวิเคราะห์ความสอดคล้องของตัวเลขทั้งสองระบบ และเสนอแผนเชิงรุก 3 ข้อให้เจ้านายด้วยครับ`.trim();

      let report = "";
      try {
        await streamLLM({
          provider: "auto",
          mode: "analysis",
          message: prompt,
          history: [],
          onToken: (token) => {
            report += token;
          },
        });
      } catch (err) {
        console.error("[Chann] streamLLM error:", err);
        report = "ขออภัยครับ วิเคราะห์ข้อมูลไม่สำเร็จในขณะนี้";
      }

      pushToBoss("chann-alert", {
        title: "รายงานเช้านี้จาก Chann 📊",
        message: report,
      });
    },
    { timezone: "Asia/Bangkok" }
  );

  scheduleOneTimeAlert22h45();

  console.log("✅ [Chann] Proactive mode เริ่มทำงาน — ตื่น 08:00 ทุกวัน");
}

function scheduleOneTimeAlert22h45() {
  const nowUtcMs = Date.now();
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;

  const nowBangkokMs = nowUtcMs + bangkokOffsetMs;
  const nowBangkokDate = new Date(nowBangkokMs);

  const year = nowBangkokDate.getUTCFullYear();
  const month = nowBangkokDate.getUTCMonth();
  const day = nowBangkokDate.getUTCDate();

  const target22h45UtcMs = Date.UTC(year, month, day, 22, 45, 0) - bangkokOffsetMs;

  const delayMs = target22h45UtcMs - nowUtcMs;

  if (delayMs <= 0) {
    console.log("[Chann] ⏰ 22:45 alert — เลยเวลาแล้ว ไม่ schedule");
    return;
  }

  const minutesLeft = Math.round(delayMs / 60000);
  console.log(`[Chann] ⏰ ตั้ง 22:45 alert ไว้แล้ว (อีก ${minutesLeft} นาที)`);

  setTimeout(() => {
    pushToBoss("chann-alert", {
      title: "📋 Chann แจ้งเตือน — งานค้างรอดำเนินการ",
      message:
        "1️⃣ Session Plan ยังค้างอยู่\n" +
        "• banner แจ้งกำหนดส่งรายงาน (Daily & Weekly)\n" +
        "• auto-populate ยอด Sale/TC/Waste จาก Daily\n" +
        "• ประวัติรายงาน Weekly (History)\n\n" +
        "2️⃣ Aloha DBF Integration\n" +
        "• รอตัวอย่างไฟล์ .DBF จากเครื่อง Back Office\n" +
        "• ส่งมาเพื่อวิเคราะห์โครงสร้างก่อน build",
    });
    console.log("[Chann] ✅ ส่ง 22:45 alert เรียบร้อย");
  }, delayMs);
}
