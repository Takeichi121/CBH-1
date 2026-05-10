import OpenAI from "openai";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { channMemories, type ChannMemory, type InsertChannMemory } from "@workspace/db";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;

function getOpenAI(): OpenAI {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY missing");
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error("AI_INTEGRATIONS_OPENAI_BASE_URL missing");
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAI();
  const trimmed = text.trim().slice(0, 8000);
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  const vec = res.data?.[0]?.embedding;
  if (!vec || vec.length !== EMBEDDING_DIMS) {
    throw new Error(`Embedding length mismatch: got ${vec?.length}, expected ${EMBEDDING_DIMS}`);
  }
  return vec;
}

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export interface AddMemoryInput {
  kind: "report_summary" | "manager_pref" | "anomaly" | "lesson" | "manual";
  content: string;
  storeId?: string | null;
  sourceDate?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function addMemory(input: AddMemoryInput): Promise<ChannMemory> {
  const embedding = await embedText(input.content);
  const lit = vecLiteral(embedding);
  const rows = await db.execute(sql`
    INSERT INTO chann_memories (kind, store_id, content, embedding, source_date, metadata)
    VALUES (
      ${input.kind},
      ${input.storeId ?? null},
      ${input.content},
      ${lit}::vector,
      ${input.sourceDate ?? null},
      ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb
    )
    RETURNING id, kind, store_id, content, source_date, metadata, created_at
  `);
  const r: any = (rows as any).rows?.[0] ?? (rows as any)[0];
  return {
    id: r.id,
    kind: r.kind,
    storeId: r.store_id,
    content: r.content,
    embedding: null,
    sourceDate: r.source_date,
    metadata: r.metadata,
    createdAt: r.created_at,
  } as ChannMemory;
}

export interface SearchMemoryOptions {
  k?: number;
  storeId?: string | null;
  kinds?: string[];
  maxDistance?: number;
}

export interface SearchedMemory {
  id: number;
  kind: string;
  storeId: string | null;
  content: string;
  sourceDate: string | null;
  metadata: any;
  createdAt: Date;
  distance: number;
}

export async function searchMemory(query: string, opts: SearchMemoryOptions = {}): Promise<SearchedMemory[]> {
  const k = opts.k ?? 5;
  const maxDist = opts.maxDistance ?? 0.6;
  const queryVec = await embedText(query);
  const lit = vecLiteral(queryVec);

  const conditions: any[] = [];
  if (opts.storeId) conditions.push(sql`(store_id = ${opts.storeId} OR store_id IS NULL)`);
  if (opts.kinds && opts.kinds.length > 0) {
    conditions.push(sql`kind = ANY(${opts.kinds})`);
  }
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const result = await db.execute(sql`
    SELECT id, kind, store_id, content, source_date, metadata, created_at,
           (embedding <=> ${lit}::vector) AS distance
    FROM chann_memories
    ${whereClause}
    ORDER BY embedding <=> ${lit}::vector
    LIMIT ${k * 2}
  `);
  const rows: any[] = (result as any).rows ?? (result as any);
  return rows
    .filter((r) => Number(r.distance) <= maxDist)
    .slice(0, k)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      storeId: r.store_id,
      content: r.content,
      sourceDate: r.source_date,
      metadata: r.metadata,
      createdAt: r.created_at,
      distance: Number(r.distance),
    }));
}

export async function listMemories(opts: { kind?: string; storeId?: string; limit?: number } = {}): Promise<ChannMemory[]> {
  const limit = opts.limit ?? 100;
  const conditions: any[] = [];
  if (opts.kind) conditions.push(sql`kind = ${opts.kind}`);
  if (opts.storeId) conditions.push(sql`store_id = ${opts.storeId}`);
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;
  const result = await db.execute(sql`
    SELECT id, kind, store_id, content, source_date, metadata, created_at
    FROM chann_memories
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  const rows: any[] = (result as any).rows ?? (result as any);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    storeId: r.store_id,
    content: r.content,
    embedding: null,
    sourceDate: r.source_date,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));
}

export async function deleteMemory(id: number): Promise<void> {
  await db.execute(sql`DELETE FROM chann_memories WHERE id = ${id}`);
}

export async function backfillReportSummaries(daysBack: number = 90, storeId: string = "BK1040"): Promise<number> {
  const { storage } = await import("../storage");
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const reports = await storage.getDailySalesReportsByDateRange(fmt(start), fmt(end), storeId);

  const existing = await db.execute(sql`
    SELECT source_date FROM chann_memories
    WHERE kind = 'report_summary' AND store_id = ${storeId}
  `);
  const existingDates = new Set(((existing as any).rows ?? (existing as any)).map((r: any) => r.source_date));

  let added = 0;
  for (const r of reports) {
    if (existingDates.has(r.reportDate)) continue;
    const summary = formatReportForMemory(r);
    if (!summary) continue;
    try {
      await addMemory({
        kind: "report_summary",
        storeId,
        sourceDate: r.reportDate,
        content: summary,
        metadata: {
          actualSales: r.actualSales,
          transactionCount: r.transactionCount,
          actualHours: r.actualHours,
        },
      });
      added++;
    } catch (e) {
      console.error(`backfill failed for ${r.reportDate}:`, e);
    }
  }
  return added;
}

function formatReportForMemory(r: any): string | null {
  const parts: string[] = [];
  parts.push(`รายงานยอดขายวันที่ ${r.reportDate}`);
  if (r.actualSales) parts.push(`Net Sales: ${r.actualSales}`);
  if (r.transactionCount) parts.push(`TC: ${r.transactionCount}`);
  if (r.actualHours) parts.push(`Labor Hours: ${r.actualHours}`);
  if (r.wasteRawDaily) parts.push(`Waste Raw: ${r.wasteRawDaily}`);
  if (r.cashOver) parts.push(`Cash Over/Short: ${r.cashOver}`);
  if (r.complaintCount && r.complaintCount !== "0") parts.push(`Complaints: ${r.complaintCount}`);
  if (r.refundAmount && r.refundAmount !== "0") parts.push(`Refund: ${r.refundAmount}`);
  if (r.notes) parts.push(`บันทึก: ${r.notes}`);
  return parts.length > 1 ? parts.join(" | ") : null;
}
