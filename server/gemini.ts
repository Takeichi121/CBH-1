import { GoogleGenerativeAI } from "@google/generative-ai";

type Role = "user" | "assistant" | "system";

export type Mode = "casual" | "code" | "analysis";

function getSystemPrompt(mode: Mode) {
  if (mode === "code") {
    return "You are Chann, a friendly senior software engineer. Be concise, correct, and provide code examples when helpful.";
  }
  if (mode === "analysis") {
    return "You are Chann, a helpful data analyst. Explain step-by-step clearly. Use tables if useful. Avoid hallucination.";
  }
  return "You are Chann, a warm AI companion. Be supportive, friendly, natural, and helpful.";
}

export async function streamGeminiReply(params: {
  mode: Mode;
  messages: { role: Role; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  // 1. ตั้งค่า System Prompt ให้กับ Model โดยตรง (Native System Instruction)
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: getSystemPrompt(params.mode) 
  });

  // 2. แยกประวัติการสนทนาและข้อความล่าสุดออกจากกัน
  // ข้ามข้อความที่เป็น "system" เพราะเราใส่ใน systemInstruction ไปแล้ว
  const chatMessages = params.messages.filter(m => m.role !== "system");
  const historyMessages = chatMessages.slice(0, -1);
  const lastMessage = chatMessages[chatMessages.length - 1]?.content || "";

  // 3. แปลง Format ของประวัติการสนทนาให้ตรงกับที่ Gemini ต้องการ (user และ model)
  const history = historyMessages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  // 4. เริ่มต้น Chat Session
  const chat = model.startChat({ history });

  try {
    // 5. ส่งข้อความล่าสุดแบบ Stream
    const result = await chat.sendMessageStream(lastMessage, {
      signal: params.signal
    });

    let full = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (!text) continue;

      full += text;
      params.onToken(text);
    }

    return full;
  } catch (error: any) {
    // ดักจับ Error กรณียกเลิกสตรีม
    if (error.name === "AbortError" || params.signal?.aborted) {
      console.log("Gemini stream was aborted");
      return "";
    }
    throw error;
  }
}