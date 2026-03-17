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
}

function getSystemPrompt(mode: Mode): string {
  const base =
    "คุณคือ Chann — AI ผู้ช่วยอัจฉริยะของระบบบริหารร้าน Chann Back House (Grand Diamond) เรียกผู้ใช้ว่า 'คุณผู้จัดการ' หรือชื่อจริงถ้ารู้ ตอบเป็นภาษาไทยเว้นแต่ถูกขอให้ตอบภาษาอื่น ตอบให้กระชับและรวดเร็วที่สุด";
  if (mode === "code") {
    return `${base}\nคุณเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส ตอบกระชับและแม่นยำ ยกตัวอย่างโค้ดที่ใช้งานได้จริงเสมอ`;
  }
  if (mode === "analysis") {
    return `${base}\nคุณเป็นนักวิเคราะห์ข้อมูล อธิบายทีละขั้นตอน สรุปชัดเจน ใช้ตารางหรือ bullet points เมื่อเหมาะสม หลีกเลี่ยงการเดา`;
  }
  return `${base}\nตอบอย่างเป็นธรรมชาติ อบอุ่น และเป็นประโยชน์`;
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

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: getSystemPrompt(params.mode) },
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

export async function streamLLM(params: StreamLLMParams): Promise<string> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("Replit AI API Key ไม่ได้ตั้งค่า");
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error("Replit AI Base URL ไม่ได้ตั้งค่า");
  }
  return await streamReplit(params);
}
