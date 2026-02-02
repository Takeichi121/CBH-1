import type { Mode, Provider } from "./llm-types";
import { streamOpenAI } from "./openai";
import { streamGemini } from "./gemini";

function chooseAutoProvider(input: { mode: Mode; message: string }): Provider {
  // ✅ ultra-fast routing policy
  if (input.mode === "code") return "openai";
  if (input.mode === "analysis") return "openai";
  return "gemini";
}

export async function streamLLM(params: {
  provider: Provider;
  mode: Mode;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  onToken: (delta: string) => void;
  signal?: AbortSignal;
}) {
  const selected =
    params.provider === "auto"
      ? chooseAutoProvider({ mode: params.mode, message: params.message })
      : params.provider;

  const call = async (prov: Provider) => {
    if (prov === "openai") {
      return streamOpenAI({
        mode: params.mode,
        messages: params.history,
        onToken: params.onToken,
        signal: params.signal
      });
    }
    return streamGemini({
      mode: params.mode,
      messages: params.history,
      onToken: params.onToken,
      signal: params.signal
    });
  };

  try {
    return await call(selected);
  } catch (e) {
    const fallback = selected === "openai" ? "gemini" : "openai";
    console.warn("[LLM] fallback to", fallback, "reason:", (e as Error).message);
    return await call(fallback);
  }
}
