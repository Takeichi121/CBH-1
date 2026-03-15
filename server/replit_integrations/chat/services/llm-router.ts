import Anthropic from "@anthropic-ai/sdk";
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
    "คุณคือ Chann — AI ผู้ช่วยอัจฉริยะของระบบบริหารร้าน BK Grand Diamond เรียกผู้ใช้ว่า 'นาย' เสมอ ตอบเป็นภาษาไทยเว้นแต่ถูกขอให้ตอบภาษาอื่น ตอบให้กระชับและรวดเร็วที่สุด";
  if (mode === "code") {
    return `${base}\nคุณเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส ตอบกระชับและแม่นยำ ยกตัวอย่างโค้ดที่ใช้งานได้จริงเสมอ`;
  }
  if (mode === "analysis") {
    return `${base}\nคุณเป็นนักวิเคราะห์ข้อมูล อธิบายทีละขั้นตอน สรุปชัดเจน ใช้ตารางหรือ bullet points เมื่อเหมาะสม หลีกเลี่ยงการเดา`;
  }
  return `${base}\nตอบอย่างเป็นธรรมชาติ อบอุ่น และเป็นประโยชน์`;
}

function sanitizeClaudeMessages(msgs: { role: "user" | "assistant"; content: string }[]): { role: "user" | "assistant"; content: string }[] {
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

async function streamClaude(params: StreamLLMParams): Promise<string> {
  const anthropic = new Anthropic({
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
  const messages = sanitizeClaudeMessages(rawMessages);

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    system: getSystemPrompt(params.mode),
    messages,
    max_tokens: 4096,
  });

  let full = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const delta = event.delta.text;
      if (!delta) continue;
      full += delta;
      params.onToken(delta);
    }
  }
  return full;
}

export async function streamLLM(params: StreamLLMParams): Promise<string> {
  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
    throw new Error("Claude API Key ไม่ได้ตั้งค่า");
  }
  return await streamClaude(params);
}
