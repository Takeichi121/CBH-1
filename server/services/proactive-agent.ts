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

  console.log("✅ [Chann] Proactive mode เริ่มทำงาน — ตื่น 08:00 ทุกวัน");
}
