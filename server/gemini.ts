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

export function buildGeminiPrompt(params: {
  mode: Mode;
  messages: { role: Role; content: string }[];
}) {
  const system = getSystemPrompt(params.mode);

  // Gemini prompt style: system + transcript
  const transcript = params.messages
    .map((m) => {
      const tag =
        m.role === "user" ? "User" : m.role === "assistant" ? "Chann" : "System";
      return `${tag}: ${m.content}`;
    })
    .join("\n");

  return `${system}\n\n${transcript}\n\nChann:`;
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
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = buildGeminiPrompt({
    mode: params.mode,
    messages: params.messages
  });

  const result = await model.generateContentStream(prompt, {
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
}
