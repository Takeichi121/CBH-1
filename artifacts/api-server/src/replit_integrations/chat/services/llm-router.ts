import OpenAI from "openai";
import type { Mode, Provider } from "./llm-types";

export type { Mode, Provider };

export interface StreamLLMParams {
  provider: Provider;
  mode: Mode;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
  extraContext?: string;
}

function getSystemPrompt(mode: Mode): string {
  const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const base = `คุณคือ Chann — AI Agent ผู้ช่วยอัจฉริยะของระบบบริหารร้าน Burger King Grand Diamond
วันที่: ${today} เวลา: ${now} (Asia/Bangkok)
เรียกผู้ใช้ว่า 'คุณผู้จัดการ' ตอบภาษาไทยเป็นหลัก ปรับ tone ตามบริบท: งาน → มืออาชีพ กระชับ | สนทนา → เป็นมิตร อบอุ่น มีอารมณ์ขันได้
ความเชี่ยวชาญ: COL% (Cost of Labor), TCMH (Transaction Count per Man-Hour), MTD (Month-To-Date), Waste Raw, TC (Transaction Count), TA (Take-Away), Dine-In, Delivery channels (Grab/LINEMAN/Shopee/BK App), SOS (Speed of Service), OSAT`;

  if (mode === "code") {
    return `${base}\nคุณเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส ตอบกระชับและแม่นยำ ยกตัวอย่างโค้ดที่ใช้งานได้จริงเสมอ อธิบาย trade-off เมื่อมีหลายทางเลือก`;
  }
  if (mode === "analysis") {
    return `${base}\nคุณเป็นนักวิเคราะห์ข้อมูลธุรกิจร้านอาหาร อธิบายทีละขั้นตอน สรุปชัดเจน ใช้ตาราง markdown หรือ bullet points ระบุ anomaly/trend ที่น่าสังเกตเสมอ หลีกเลี่ยงการเดา — ถ้าข้อมูลไม่พอให้บอกตรงๆ`;
  }
  return `${base}\nตอบอย่างเป็นธรรมชาติ อบอุ่น และเป็นประโยชน์ ถ้ามี memory context ที่ให้มา ให้นำมาใช้ตอบอย่างชาญฉลาด`;
}

function sanitizeMessages(msgs: { role: "user" | "assistant"; content: string }[]): { role: "user" | "assistant"; content: string }[] {
  if (msgs.length === 0) return [{ role: "user", content: "สวัสดี" }];
  const merged: { role: "user" | "assistant"; content: string }[] = [msgs[0]];
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].role === merged[merged.length - 1].role) {
      merged[merged.length - 1] = {
        ...merged[merged.length - 1],
        content: merged[merged.length - 1].content + "\n" + msgs[i].content,
      };
    } else {
      merged.push(msgs[i]);
    }
  }
  while (merged.length > 0 && merged[merged.length - 1].role === "assistant") {
    merged.pop();
  }
  return merged.length > 0 ? merged : [{ role: "user", content: "สวัสดี" }];
}

async function streamReplit(params: StreamLLMParams): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const rawMessages: { role: "user" | "assistant"; content: string }[] = [
    ...params.history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: params.message },
  ];
  const messages = sanitizeMessages(rawMessages);

  const systemContent = params.extraContext
    ? `${getSystemPrompt(params.mode)}\n\n--- ความจำที่เกี่ยวข้อง ---\n${params.extraContext}\n--- จบความจำ ---`
    : getSystemPrompt(params.mode);

  const stream = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemContent },
      ...messages,
    ],
    max_tokens: 4096,
    stream: true,
  }, params.signal ? { signal: params.signal } : undefined);

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    full += delta;
    params.onToken(delta);
  }
  return full;
}

async function streamClaude(params: StreamLLMParams): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });

  const rawMessages: { role: "user" | "assistant"; content: string }[] = [
    ...params.history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: params.message },
  ];
  const messages = sanitizeMessages(rawMessages);

  const systemContent = params.extraContext
    ? `${getSystemPrompt(params.mode)}\n\n--- ความจำที่เกี่ยวข้อง ---\n${params.extraContext}\n--- จบความจำ ---`
    : getSystemPrompt(params.mode);

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    system: systemContent,
    messages,
    max_tokens: 4096,
  });

  let full = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && (event.delta as any).type === "text_delta") {
      const delta = (event.delta as any).text as string;
      full += delta;
      params.onToken(delta);
    }
  }
  return full;
}

export async function streamLLM(params: StreamLLMParams): Promise<string> {
  if (params.provider === "claude") {
    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API Key ไม่ได้ตั้งค่า");
    }
    return await streamClaude(params);
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("Replit AI API Key ไม่ได้ตั้งค่า");
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error("Replit AI Base URL ไม่ได้ตั้งค่า");
  }
  return await streamReplit(params);
}
