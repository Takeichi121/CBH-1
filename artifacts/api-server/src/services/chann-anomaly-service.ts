import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import type { DailySalesReport, ChannAnomaly } from "@workspace/db";

const TRACKED_FIELDS: Array<{
  key: keyof DailySalesReport;
  label: string;
  zWarn: number;
  zCritical: number;
  direction: "both" | "low" | "high";
}> = [
  { key: "actualSales", label: "ยอดขาย", zWarn: 2, zCritical: 3, direction: "both" },
  { key: "transactionCount", label: "TC", zWarn: 2, zCritical: 3, direction: "both" },
  { key: "actualHours", label: "ชั่วโมงแรงงาน", zWarn: 2, zCritical: 3, direction: "high" },
  { key: "wasteRawDaily", label: "Waste Raw", zWarn: 2, zCritical: 3, direction: "high" },
  { key: "complaintCount", label: "เคสร้องเรียน", zWarn: 2, zCritical: 3, direction: "high" },
  { key: "refundAmount", label: "ยอด Refund", zWarn: 2, zCritical: 3, direction: "high" },
];

export interface DetectedAnomaly {
  field: string;
  label: string;
  expected: number;
  actual: number;
  deviation: number;
  zScore: number;
  severity: "warn" | "critical";
  reason: string;
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export async function detectAnomalies(
  reportDate: string,
  storeId: string = "BK1040",
): Promise<DetectedAnomaly[]> {
  const today = await storage.getDailySalesReportByDate(reportDate, storeId);
  if (!today) return [];

  const end = new Date(reportDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const history = await storage.getDailySalesReportsByDateRange(fmt(start), fmt(end), storeId);
  const past = history.filter((r) => r.reportDate !== reportDate);

  if (past.length < 5) return [];

  const todayDow = end.getDay();
  const sameDow = past.filter((r) => new Date(r.reportDate).getDay() === todayDow);

  const out: DetectedAnomaly[] = [];

  for (const tf of TRACKED_FIELDS) {
    const actual = num((today as any)[tf.key]);
    if (actual === null) continue;

    const samples = (sameDow.length >= 3 ? sameDow : past)
      .map((r) => num((r as any)[tf.key]))
      .filter((n): n is number => n !== null);
    if (samples.length < 3) continue;

    const mu = mean(samples);
    const sd = stdev(samples);
    if (sd === 0 || mu === 0) continue;

    const z = (actual - mu) / sd;
    const absZ = Math.abs(z);
    if (absZ < tf.zWarn) continue;
    if (tf.direction === "high" && z < 0) continue;
    if (tf.direction === "low" && z > 0) continue;

    const deviation = ((actual - mu) / mu) * 100;
    const severity: "warn" | "critical" = absZ >= tf.zCritical ? "critical" : "warn";
    const dirText = z > 0 ? "สูงกว่า" : "ต่ำกว่า";
    const baseLabel = sameDow.length >= 3 ? "วันเดียวกันย้อนหลัง" : "30 วันล่าสุด";
    const reason = `${tf.label} ${dirText}ค่าเฉลี่ย ${baseLabel} ${Math.abs(deviation).toFixed(1)}% (z=${z.toFixed(2)})`;

    out.push({
      field: String(tf.key),
      label: tf.label,
      expected: Math.round(mu * 100) / 100,
      actual,
      deviation: Math.round(deviation * 100) / 100,
      zScore: Math.round(z * 100) / 100,
      severity,
      reason,
    });
  }

  return out;
}

export async function persistAnomalies(
  reportDate: string,
  storeId: string,
  anomalies: DetectedAnomaly[],
): Promise<number> {
  if (anomalies.length === 0) return 0;
  await db.execute(sql`
    DELETE FROM chann_anomalies
    WHERE store_id = ${storeId} AND report_date = ${reportDate} AND acknowledged = FALSE
  `);
  let inserted = 0;
  for (const a of anomalies) {
    await db.execute(sql`
      INSERT INTO chann_anomalies (store_id, report_date, field, expected, actual, deviation, severity, reason)
      VALUES (${storeId}, ${reportDate}, ${a.field}, ${String(a.expected)}, ${String(a.actual)}, ${String(a.deviation)}, ${a.severity}, ${a.reason})
    `);
    inserted++;
  }
  return inserted;
}

export async function listActiveAnomalies(storeId: string = "BK1040", limit: number = 50): Promise<ChannAnomaly[]> {
  const result = await db.execute(sql`
    SELECT * FROM chann_anomalies
    WHERE store_id = ${storeId} AND acknowledged = FALSE
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  const rows: any[] = (result as any).rows ?? (result as any);
  return rows.map((r) => ({
    id: r.id,
    storeId: r.store_id,
    reportDate: r.report_date,
    field: r.field,
    expected: r.expected,
    actual: r.actual,
    deviation: r.deviation,
    severity: r.severity,
    reason: r.reason,
    acknowledged: r.acknowledged,
    acknowledgedBy: r.acknowledged_by,
    acknowledgedAt: r.acknowledged_at,
    createdAt: r.created_at,
  }));
}

export async function acknowledgeAnomaly(id: number, username: string): Promise<void> {
  await db.execute(sql`
    UPDATE chann_anomalies
    SET acknowledged = TRUE, acknowledged_by = ${username}, acknowledged_at = NOW()
    WHERE id = ${id}
  `);
}
