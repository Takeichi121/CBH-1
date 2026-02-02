import OpenAI from "openai";
import type { Mode } from "./llm-types";
import { getSystemPrompt } from "./llm-types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function streamOpenAI(params: {
  mode: Mode;
  messages: { role: "user" | "assistant"; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const system = getSystemPrompt(params.mode);

  const stream = await client.chat.completions.create(
    {
      model,
      stream: true,
      temperature: 0.7,
      max_completion_tokens: Number(process.env.OPENAI_MAX_TOKENS || 1024),
      messages: [{ role: "system", content: system }, ...params.messages]
    },
    { signal: params.signal }
  );

  let full = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (!token) continue;
    full += token;
    params.onToken(token);
  }
  return full;
}
