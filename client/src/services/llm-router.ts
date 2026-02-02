export async function streamLLM(...) {
  const selected = ...;

  try {
    if (selected === "openai") return await streamOpenAI(...);
    return await streamGemini(...);
  } catch (e) {
    // ✅ fallback safety
    const fallback = selected === "openai" ? "gemini" : "openai";
    console.warn("[LLM] fallback to", fallback, "reason:", (e as Error).message);

    if (fallback === "openai") return await streamOpenAI(...);
    return await streamGemini(...);
  }
}
