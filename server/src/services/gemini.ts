import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Mode } from "./llm-types";
import { getSystemPrompt } from "./llm-types";

export async function streamGemini(params: {
  mode: Mode;
  messages: { role: "user" | "assistant"; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const system = getSystemPrompt(params.mode);

  // Gemini prompt transcript (fast + stable)
  const transcript = params.messages
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Chann: ${m.content}`))
    .join("\n");

  const prompt = `${system}\n\n${transcript}\n\nChann:`;

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
