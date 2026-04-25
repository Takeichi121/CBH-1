import cron from "node-cron";
import { getAlohaSalesRaw } from "./aloha-service";
import { getNBOSalesAuto } from "./nbo-service";
import { pushToBoss } from "../socket";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";
import { storage } from "../storage";
import { getWeekStartTuesday, toYMD } from "../utils";
import { sendLineMessage } from "./line-service";

function getPreviousWeekTuesdayStr(bangkokNow: Date): string {
  const bangkokDateStr = `${bangkokNow.getUTCFullYear()}-${String(bangkokNow.getUTCMonth() + 1).padStart(2, "0")}-${String(bangkokNow.getUTCDate()).padStart(2, "0")}`;
  const thisWeekTuesday = getWeekStartTuesday(bangkokDateStr);
  const prevWeekTuesday = new Date(thisWeekTuesday);
  prevWeekTuesday.setDate(prevWeekTuesday.getDate() - 7);
  return toYMD(prevWeekTuesday);
}

export function initProactiveChann() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("🌞 [Chann] ตื่นมาเตรียมรายงานให้คุณผู้จัดการแล้วครับ...");

      const [alohaData, nboData] = await Promise.all([
        getAlohaSalesRaw(),
        getNBOSalesAuto(),
      ]);

      if (!alohaData && !nboData) {
        console.warn("[Chann] ดึงข้อมูลไม่ได้ทั้ง Aloha และ NBO");
        return;
      }

      const prompt = `
คุณผู้จัดการครับ นี่คือสรุปยอดล่าสุด:
- ยอดจาก Aloha (DBF): ${alohaData ? alohaData.totalFromDbf.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- ยอดจาก NBO (SQL): ${nboData ? nboData.TotalSales.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- จำนวนลูกค้า (NBO): ${nboData ? nboData.GuestCount.toLocaleString("th-TH") : "-"} คน

ช่วยวิเคราะห์ความสอดคล้องของตัวเลขทั้งสองระบบ และเสนอแผนเชิงรุก 3 ข้อให้คุณผู้จัดการด้วยครับ`.trim();

      let report = "";
      try {
        await streamLLM({
          provider: "replit",
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

  cron.schedule(
    "0 19 * * 2",
    async () => {
      console.log("[WeeklyReminder] ⏰ ตรวจสอบ Weekly Report วันอังคาร 19:00...");
      try {
        const cfg = await storage.getConfig();
        const channelToken = cfg["LINE_CHANNEL_TOKEN"];
        const targetId = cfg["LINE_TARGET_ID"];
        if (!channelToken || !targetId) {
          console.warn("[WeeklyReminder] ยังไม่ได้ตั้งค่า LINE — ข้ามการแจ้งเตือน");
          return;
        }

        const bangkokOffsetMs = 7 * 60 * 60 * 1000;
        const bangkokNow = new Date(Date.now() + bangkokOffsetMs);
        const prevWeekStartStr = getPreviousWeekTuesdayStr(bangkokNow);

        const existingReport = await storage.getWeeklySalesReport(prevWeekStartStr);
        if (existingReport) {
          console.log(`[WeeklyReminder] ✅ พบ Weekly Report สำหรับสัปดาห์ ${prevWeekStartStr} แล้ว — ไม่ต้องแจ้งเตือน`);
          return;
        }

        const storeCfg = await storage.getStoreSettings();
        const storeName = storeCfg?.storeName || "Grand Diamond";

        const text =
          `⚠️ ${storeName} — แจ้งเตือนอัตโนมัติ\n` +
          `ยังไม่พบ Weekly Report สำหรับสัปดาห์ที่เริ่ม ${prevWeekStartStr}\n\n` +
          `กรุณากรอกและส่ง Weekly Report ก่อน 20:00 คืนนี้ครับ 🙏`;

        await sendLineMessage(channelToken, targetId, [{ type: "text", text }]);
        console.log(`[WeeklyReminder] ✅ ส่งแจ้งเตือน LINE สำหรับสัปดาห์ ${prevWeekStartStr} เรียบร้อย`);
      } catch (err) {
        console.error("[WeeklyReminder] ❌ เกิดข้อผิดพลาด:", err);
      }
    },
    { timezone: "Asia/Bangkok" }
  );

  scheduleOneTimeAlert22h45();

  console.log("✅ [Chann] Proactive mode เริ่มทำงาน — ตื่น 08:00 ทุกวัน, แจ้งเตือน Weekly 19:00 ทุกวันอังคาร");
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
    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
    pushToBoss("chann-alert", {
      title: "📋 Chann แจ้งเตือน — ใกล้ปิดร้านแล้วครับ",
      message:
        `🕙 ${dateStr}\n\n` +
        "กรุณาตรวจสอบก่อนปิดร้านคืนนี้:\n" +
        "• ✅ บันทึกยอดขายวันนี้แล้วหรือยัง?\n" +
        "• ✅ บันทึกชั่วโมงแรงงาน (COL) แล้วหรือยัง?\n" +
        "• ✅ อนุมัติคำขอพนักงานที่รอดำเนินการ?\n\n" +
        "พิมพ์ผ่าน Chann ได้เลยครับ 😊",
    });
    console.log("[Chann] ✅ ส่ง 22:45 alert เรียบร้อย");
  }, delayMs);
}
