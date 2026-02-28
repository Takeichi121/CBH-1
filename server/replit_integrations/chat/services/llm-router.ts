import OpenAI from "openai";
import { streamGeminiReply } from "../../../gemini";
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
    "คุณคือ Chann — AI ผู้ช่วยอัจฉริยะของระบบบริหารร้าน BK Grand Diamond เรียกผู้ใช้ว่า 'นาย' เสมอ ตอบเป็นภาษาไทยเว้นแต่ถูกขอให้ตอบภาษาอื่น";
  if (mode === "code") {
    return `${base}\nคุณเป็นวิศวกรซอฟต์แวร์ระดับอาวุโส ตอบกระชับและแม่นยำ ยกตัวอย่างโค้ดที่ใช้งานได้จริงเสมอ`;
  }
  if (mode === "analysis") {
    return `${base}\nคุณเป็นนักวิเคราะห์ข้อมูล อธิบายทีละขั้นตอน สรุปชัดเจน ใช้ตารางหรือ bullet points เมื่อเหมาะสม หลีกเลี่ยงการเดา`;
  }
  return `${base}\nตอบอย่างเป็นธรรมชาติ อบอุ่น และเป็นประโยชน์`;
}

async function streamOpenAI(params: StreamLLMParams): Promise<string> {
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const openai = new OpenAI({
    apiKey: apiKey || "",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt(params.mode) },
    ...params.history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: params.message },
  ];

  const stream = await openai.chat.completions.create(
    {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      stream: true,
      max_completion_tokens: 2048,
    },
    { signal: params.signal }
  );

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (!delta) continue;
    full += delta;
    params.onToken(delta);
  }
  return full;
}

async function streamGemini(params: StreamLLMParams): Promise<string> {
  const messages = [
    ...params.history,
    { role: "user" as const, content: params.message },
  ];
  return await streamGeminiReply({
    mode: params.mode,
    messages,
    onToken: params.onToken,
    signal: params.signal,
  });
}

export async function streamLLM(params: StreamLLMParams): Promise<string> {
  const hasOpenAI = !!(
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  );
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (params.provider === "gemini") {
    if (!hasGemini) throw new Error("GEMINI_API_KEY ไม่ได้ตั้งค่า");
    return await streamGemini(params);
  }

  if (params.provider === "openai" || (params.provider === "auto" && hasOpenAI)) {
    try {
      return await streamOpenAI(params);
    } catch (err) {
      console.warn("[LLM Router] OpenAI failed, trying Gemini:", err);
      if (hasGemini) return await streamGemini(params);
      throw err;
    }
  }

  if (params.provider === "auto" && hasGemini) {
    return await streamGemini(params);
  }

  throw new Error(
    "ไม่มี API Key สำหรับ OpenAI หรือ Gemini กรุณาตั้งค่า OPENAI_API_KEY หรือ GEMINI_API_KEY"
  );
}
