import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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
    "คุณคือ Chann — AI ผู้ช่วยอัจฉริยะของระบบบริหารร้าน BK Grand Diamond เรียกผู้ใช้ว่า 'นาย' เสมอ ตอบเป็นภาษาไทยเว้นแต่ถูกขอให้ตอบภาษาอื่น ตอบให้กระชับและรวดเร็วที่สุด";
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
      model: process.env.OPENAI_MODEL || "gpt-4o",
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
    model: "claude-3-5-sonnet-20241022",
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
  const hasClaude = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const hasOpenAI = !!(
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  );
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (params.provider === "claude") {
    if (!hasClaude) throw new Error("Claude API Key ไม่ได้ตั้งค่า");
    return await streamClaude(params);
  }

  if (params.provider === "gemini") {
    if (!hasGemini) throw new Error("GEMINI_API_KEY ไม่ได้ตั้งค่า");
    return await streamGemini(params);
  }

  if (params.provider === "openai") {
    if (!hasOpenAI) throw new Error("OpenAI API Key ไม่ได้ตั้งค่า");
    return await streamOpenAI(params);
  }

  if (params.provider === "auto") {
    if (hasClaude) {
      try {
        return await streamClaude(params);
      } catch (err) {
        console.warn("[LLM Router] Claude failed, trying OpenAI:", err);
      }
    }
    if (hasOpenAI) {
      try {
        return await streamOpenAI(params);
      } catch (err) {
        console.warn("[LLM Router] OpenAI failed, trying Gemini:", err);
        if (hasGemini) return await streamGemini(params);
        throw err;
      }
    }
    if (hasGemini) {
      return await streamGemini(params);
    }
  }

  throw new Error(
    "ไม่มี API Key สำหรับ Claude, OpenAI หรือ Gemini กรุณาตั้งค่า API Key"
  );
}
