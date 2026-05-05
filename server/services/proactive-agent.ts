import cron from "node-cron";
import { getAlohaSalesRaw } from "./aloha-service";
import { getNBOSalesAuto } from "./nbo-service";
import { pushToBoss } from "../socket";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";
import { storage } from "../storage";
import { getWeekStartTuesday, toYMD } from "../utils";
import { sendLineMessage } from "./line-service";
import { detectAnomalies, persistAnomalies, type DetectedAnomaly } from "./chann-anomaly-service";
import { addMemory } from "./chann-memory-service";

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
      const cfg0 = await storage.getConfig();
      if (cfg0["PROACTIVE_MORNING_REPORT"] === "0") {
        console.log("[Chann] ⏭️ Morning report ถูกปิด — ข้าม");
        return;
      }
      console.log("🌞 [Chann] ตื่นมาเตรียมรายงานให้คุณผู้จัดการแล้วครับ...");

      const [alohaData, nboData] = await Promise.all([
        getAlohaSalesRaw(),
        getNBOSalesAuto(),
      ]);

      if (!alohaData && !nboData) {
        console.warn("[Chann] ดึงข้อมูลไม่ได้ทั้ง Aloha และ NBO");
        return;
      }

      const yesterday = new Date(Date.now() + 7 * 60 * 60 * 1000);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yDate = yesterday.toISOString().slice(0, 10);
      const storeId = "BK1040";

      let anomalies: DetectedAnomaly[] = [];
      try {
        anomalies = await detectAnomalies(yDate, storeId);
        if (anomalies.length > 0) {
          await persistAnomalies(yDate, storeId, anomalies);
          console.log(`[Chann] 🚨 พบ anomaly ${anomalies.length} รายการสำหรับ ${yDate}`);

          // B3: ส่ง LINE ทันทีเมื่อพบ critical anomaly
          const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");
          if (criticalAnomalies.length > 0) {
            try {
              const cfg = await storage.getConfig();
              const channelToken = cfg["LINE_CHANNEL_TOKEN"];
              const targetId = cfg["LINE_TARGET_ID"];
              if (channelToken && targetId) {
                const critText =
                  `🚨 [Chann] พบความผิดปกติระดับ CRITICAL สำหรับ ${yDate}\n\n` +
                  criticalAnomalies
                    .map((a) => `• ${a.field}: คาด ${a.expected} → จริง ${a.actual}\n  ${a.reason}`)
                    .join("\n") +
                  "\n\nกรุณาตรวจสอบด่วนครับ";
                await sendLineMessage(channelToken, targetId, [{ type: "text", text: critText }]);
                console.log(`[Chann] ✅ ส่ง LINE critical alert สำเร็จ (${criticalAnomalies.length} รายการ)`);
              }
            } catch (lineErr) {
              console.error("[Chann] ส่ง LINE critical alert ไม่สำเร็จ:", lineErr);
            }
          }
        }
      } catch (e) {
        console.error("[Chann] anomaly detection error:", e);
      }

      const anomalyText = anomalies.length > 0
        ? `\n\n🚨 พบความผิดปกติในรายงานวันที่ ${yDate}:\n` +
          anomalies.map((a) => `- [${a.severity.toUpperCase()}] ${a.reason} (คาด ${a.expected} จริง ${a.actual})`).join("\n")
        : `\n\n✅ รายงานวันที่ ${yDate} อยู่ในเกณฑ์ปกติ ไม่พบความผิดปกติ`;

      const prompt = `
คุณผู้จัดการครับ นี่คือสรุปยอดล่าสุด:
- ยอดจาก Aloha (DBF): ${alohaData ? alohaData.totalFromDbf.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- ยอดจาก NBO (SQL): ${nboData ? nboData.TotalSales.toLocaleString("th-TH") : "ดึงข้อมูลไม่ได้"} บาท
- จำนวนลูกค้า (NBO): ${nboData ? nboData.GuestCount.toLocaleString("th-TH") : "-"} คน${anomalyText}

ช่วยวิเคราะห์ความสอดคล้องของตัวเลขทั้งสองระบบ ให้ความเห็นเรื่องความผิดปกติ (ถ้ามี) และเสนอแผนเชิงรุก 3 ข้อให้คุณผู้จัดการด้วยครับ`.trim();

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

      try {
        await addMemory({
          kind: "report_summary",
          storeId,
          sourceDate: yDate,
          content: `รายงานเช้า ${yDate}: Aloha=${alohaData?.totalFromDbf ?? "-"} NBO=${nboData?.TotalSales ?? "-"} TC=${nboData?.GuestCount ?? "-"}\nสรุปจาก Chann: ${report.slice(0, 1500)}`,
          metadata: { anomalyCount: anomalies.length, severity: anomalies.find((a) => a.severity === "critical") ? "critical" : (anomalies.length > 0 ? "warn" : "ok") },
        });
      } catch (e) {
        console.error("[Chann] memory save error:", e);
      }
    },
    { timezone: "Asia/Bangkok" }
  );

  cron.schedule(
    "0 19 * * 2",
    async () => {
      console.log("[WeeklyReminder] ⏰ ตรวจสอบ Weekly Report วันอังคาร 19:00...");
      try {
        const cfg = await storage.getConfig();
        if (cfg["PROACTIVE_WEEKLY_REMINDER"] === "0") {
          console.log("[WeeklyReminder] ⏭️ ถูกปิด — ข้าม");
          return;
        }
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

  // C2: Borrow Overdue Notification — ทุกวัน 09:00 ตรวจ borrow ที่เลยกำหนดคืน
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[Chann] 📦 ตรวจ borrow transactions ที่เลยกำหนดคืน...");
      try {
        const cfgCheck = await storage.getConfig();
        if (cfgCheck["PROACTIVE_BORROW_OVERDUE"] === "0") {
          console.log("[Chann] ⏭️ Borrow overdue notification ถูกปิด — ข้าม");
          return;
        }
        const overdueRows: any[] = await storage.getOverdueBorrowTransactions().catch(() => []);
        if (!overdueRows || overdueRows.length === 0) {
          console.log("[Chann] ✅ ไม่มี borrow ที่เลยกำหนดคืน");
          return;
        }
        const cfg = cfgCheck;
        const channelToken = cfg["LINE_CHANNEL_TOKEN"];
        const targetId = cfg["LINE_TARGET_ID"];
        if (!channelToken || !targetId) {
          console.warn("[Chann] ⚠️ LINE ไม่ได้ตั้งค่า — ข้ามการแจ้งเตือน borrow overdue");
          return;
        }
        const lines = overdueRows
          .slice(0, 10)
          .map((r: any) => `• ${r.txDate} | ${r.branch} | ${r.item} x${r.qty} (Due: ${r.dueDate})`)
          .join("\n");
        const more = overdueRows.length > 10 ? `\n...และอีก ${overdueRows.length - 10} รายการ` : "";
        const text =
          `📦 [แจ้งเตือน] บันทึกยืม-คืนเลยกำหนด ${overdueRows.length} รายการ\n\n` +
          lines + more +
          "\n\nกรุณาตรวจสอบและอัปเดตสถานะการคืนด้วยครับ 🙏";
        await sendLineMessage(channelToken, targetId, [{ type: "text", text }]);
        console.log(`[Chann] ✅ ส่งแจ้งเตือน borrow overdue ${overdueRows.length} รายการ`);

        // Push to boss dashboard
        pushToBoss("chann-alert", {
          title: `📦 Borrow Overdue: ${overdueRows.length} รายการ`,
          message: `มี borrow ที่เลยกำหนดคืน ${overdueRows.length} รายการ กรุณาตรวจสอบครับ`,
        });
      } catch (e) {
        console.error("[Chann] borrow overdue check error:", e);
      }
    },
    { timezone: "Asia/Bangkok" }
  );

  // H3: Manager Daily Digest — ทุกวัน 08:05 สรุป pending items
  cron.schedule(
    "5 8 * * *",
    async () => {
      console.log("[Digest] 📋 เตรียม manager digest...");
      try {
        const cfg = await storage.getConfig();
        if (cfg["PROACTIVE_MANAGER_DIGEST"] === "0") {
          console.log("[Digest] ⏭️ Manager digest ถูกปิด — ข้าม");
          return;
        }
        const channelToken = cfg["LINE_CHANNEL_TOKEN"];
        const targetId = cfg["LINE_TARGET_ID"];
        if (!channelToken || !targetId) return;

        const [pendingSwaps, pendingRequests, overdueItems] = await Promise.all([
          storage.getSwapRequests("pending"),
          storage.getAllManagerRequests("pending"),
          storage.getOverdueBorrowTransactions().catch(() => [] as any[]),
        ]);

        const swapCount = pendingSwaps?.length ?? 0;
        const reqCount = pendingRequests?.length ?? 0;
        const overdueCount = overdueItems?.length ?? 0;

        if (swapCount === 0 && reqCount === 0 && overdueCount === 0) {
          console.log("[Digest] ✅ ไม่มี pending items — ข้ามการส่ง digest");
          return;
        }

        const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const dateStr = bangkokNow.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });

        const lines = [
          `📋 สรุปรายการรอดำเนินการ — ${dateStr}`,
          "",
          swapCount > 0 ? `🔄 ขอสลับกะรอดำเนินการ: ${swapCount} รายการ` : null,
          reqCount > 0 ? `📝 คำขอพนักงานรอดำเนินการ: ${reqCount} รายการ` : null,
          overdueCount > 0 ? `📦 Borrow เกินกำหนดคืน: ${overdueCount} รายการ` : null,
          "",
          "กรุณาเข้าระบบเพื่อดำเนินการครับ 🙏",
        ].filter(Boolean).join("\n");

        await sendLineMessage(channelToken, targetId, [{ type: "text", text: lines }]);
        console.log(`[Digest] ✅ ส่ง manager digest สำเร็จ (swap:${swapCount} req:${reqCount} overdue:${overdueCount})`);
      } catch (err) {
        console.error("[Digest] ❌ error:", err);
      }
    },
    { timezone: "Asia/Bangkok" }
  );

  scheduleOneTimeAlert22h45();

  console.log("✅ [Chann] Proactive mode เริ่มทำงาน — ตื่น 08:00 ทุกวัน, Digest 08:05, แจ้งเตือน Weekly 19:00 ทุกวันอังคาร, Borrow Overdue 09:00");
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

  setTimeout(async () => {
    const cfgNow = await storage.getConfig();
    if (cfgNow["PROACTIVE_CLOSING_ALERT"] === "0") {
      console.log("[Chann] ⏭️ Closing alert ถูกปิด — ข้าม");
      return;
    }
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
