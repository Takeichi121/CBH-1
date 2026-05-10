import { storage } from "../storage";
import { searchMemory } from "./chann-memory-service";
import { getAlohaSalesRaw } from "./aloha-service";
import { getNBOSalesAuto } from "./nbo-service";
import { streamLLM } from "../replit_integrations/chat/services/llm-router";
import type { DailySalesReport } from "@shared/schema";

export interface DraftField {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface DailySalesDraft {
  reportDate: string;
  storeId: string;
  fields: Record<string, DraftField>;
  notes: string;
  hints: string[];
  rawData: {
    aloha: any;
    nbo: any;
    history7d: { date: string; actualSales: string; transactionCount: string; actualHours: string }[];
  };
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export async function generateDailySalesDraft(
  reportDate: string,
  storeId: string = "BK1040",
): Promise<DailySalesDraft> {
  const end = new Date(reportDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [history, alohaResult, nboResult, memoryHints] = await Promise.all([
    storage.getDailySalesReportsByDateRange(fmt(start), fmt(end), storeId),
    safeCall(getAlohaSalesRaw),
    safeCall(getNBOSalesAuto),
    safeCall(() => searchMemory(`รายงานยอดขายวันที่ ${reportDate} แนวโน้ม`, { k: 3, storeId })),
  ]);

  const past = history.filter((r) => r.reportDate !== reportDate);
  const sameDow = past.filter((r) => new Date(r.reportDate).getDay() === end.getDay());
  const baseline = sameDow.length >= 2 ? sameDow : past;

  const fields: Record<string, DraftField> = {};

  const alohaSales = num(alohaResult?.totalFromDbf);
  const nboSales = num(nboResult?.TotalSales);
  const nboTc = num(nboResult?.GuestCount);

  if (nboSales !== null) {
    fields.actualSales = { value: String(Math.round(nboSales)), confidence: "high", source: "NBO" };
  } else if (alohaSales !== null) {
    fields.actualSales = { value: String(Math.round(alohaSales)), confidence: "medium", source: "Aloha DBF" };
  }
  if (nboTc !== null) {
    fields.transactionCount = { value: String(nboTc), confidence: "high", source: "NBO Guest Count" };
  }

  const avgFromBaseline = (key: keyof DailySalesReport): number | null => {
    const xs = baseline.map((r) => num((r as any)[key])).filter((n): n is number => n !== null);
    return xs.length >= 2 ? Math.round(avg(xs) * 100) / 100 : null;
  };

  const fillFromAvg = (formKey: string, dbKey: keyof DailySalesReport, source: string) => {
    if (fields[formKey]) return;
    const v = avgFromBaseline(dbKey);
    if (v !== null) {
      fields[formKey] = { value: String(v), confidence: "low", source };
    }
  };

  const baselineLabel = sameDow.length >= 2 ? `เฉลี่ย ${baseline.length} วันเดียวกัน` : `เฉลี่ย ${baseline.length} วันล่าสุด`;
  fillFromAvg("dailyTarget", "dailyTarget", baselineLabel);
  fillFromAvg("actualHours", "actualHours", baselineLabel);
  fillFromAvg("recommendHours", "recommendHours", baselineLabel);
  fillFromAvg("dineIn", "dineIn", baselineLabel);
  fillFromAvg("dineInTc", "dineInTc", baselineLabel);
  fillFromAvg("takeAway", "takeAway", baselineLabel);
  fillFromAvg("takeAwayTc", "takeAwayTc", baselineLabel);
  fillFromAvg("grabfood", "grabfood", baselineLabel);
  fillFromAvg("lineman", "lineman", baselineLabel);
  fillFromAvg("shopee", "shopee", baselineLabel);
  fillFromAvg("bkapp", "bkapp", baselineLabel);
  fillFromAvg("wasteRawDaily", "wasteRawDaily", baselineLabel);
  fillFromAvg("otHours", "otHours", baselineLabel);

  const lastReport = past.sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  if (lastReport) {
    if (!fields.mtdActual && lastReport.mtdActual && fields.actualSales) {
      const newMtd = (num(lastReport.mtdActual) ?? 0) + (num(fields.actualSales.value) ?? 0);
      fields.mtdActual = { value: String(Math.round(newMtd)), confidence: "medium", source: "MTD วานนี้ + วันนี้" };
    }
    if (!fields.mtdTarget && lastReport.mtdTarget) {
      fields.mtdTarget = { value: lastReport.mtdTarget, confidence: "medium", source: "MTD Target วานนี้" };
    }
    if (!fields.mtdTc && lastReport.mtdTc && fields.transactionCount) {
      const newMtdTc = (num(lastReport.mtdTc) ?? 0) + (num(fields.transactionCount.value) ?? 0);
      fields.mtdTc = { value: String(Math.round(newMtdTc)), confidence: "medium", source: "MTD TC วานนี้ + วันนี้" };
    }
  }

  const hints: string[] = [];
  if (memoryHints && memoryHints.length > 0) {
    hints.push(...memoryHints.map((m: any) => `[${m.kind}] ${m.content.slice(0, 200)}`));
  }
  if (alohaResult?.totalFromDbf && nboResult?.TotalSales) {
    const diff = Math.abs(num(alohaResult.totalFromDbf)! - num(nboResult.TotalSales)!);
    const diffPct = (diff / num(nboResult.TotalSales)!) * 100;
    if (diffPct > 5) {
      hints.push(`Aloha (${alohaResult.totalFromDbf}) กับ NBO (${nboResult.TotalSales}) ต่างกัน ${diffPct.toFixed(1)}% — ตรวจสอบก่อนเซฟ`);
    }
  }

  let notes = "";
  if (Object.keys(fields).length > 0) {
    try {
      const summary = await composeNoteWithLLM(reportDate, fields, baseline, baselineLabel);
      if (summary) notes = summary;
    } catch (e) {
      console.error("Note compose failed:", e);
    }
  }

  return {
    reportDate,
    storeId,
    fields,
    notes,
    hints,
    rawData: {
      aloha: alohaResult,
      nbo: nboResult,
      history7d: past.slice(0, 7).map((r) => ({
        date: r.reportDate,
        actualSales: r.actualSales,
        transactionCount: r.transactionCount,
        actualHours: r.actualHours ?? "0",
      })),
    },
  };
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn("draft safeCall failed:", e);
    return null as any;
  }
}

async function composeNoteWithLLM(
  reportDate: string,
  fields: Record<string, DraftField>,
  baseline: DailySalesReport[],
  baselineLabel: string,
): Promise<string> {
  const summary = Object.entries(fields)
    .map(([k, v]) => `- ${k}: ${v.value} (${v.source}, confidence=${v.confidence})`)
    .join("\n");
  const baselineSummary = baseline.slice(0, 3).map((r) => `${r.reportDate}: Sales=${r.actualSales}, TC=${r.transactionCount}`).join("; ");

  const prompt = `กรุณาสรุป Daily Sales Report ของวันที่ ${reportDate} เป็นข้อความสั้น ๆ 1-2 ประโยคภาษาไทย เพื่อใส่เป็น notes ของผู้จัดการ
ค่าที่ Chann แนะนำ:
${summary}

Baseline (${baselineLabel}):
${baselineSummary}

ระบุจุดเด่น/จุดต้องระวังในข้อความเดียว ไม่ต้องใช้ bullet`;

  let full = "";
  await streamLLM({
    provider: "replit",
    mode: "analysis",
    message: prompt,
    history: [],
    onToken: (t) => { full += t; },
  });
  return full.trim();
}
