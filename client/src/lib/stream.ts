import type { Mode } from "./api";

type Provider = "openai" | "gemini" | "auto";

export async function streamConversationMessage(params: {
  conversationId: number;
  content: string;
  mode: Mode;
  provider?: Provider;
  onToken: (delta: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  try {
    const res = await fetch(`/api/conversations/${params.conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: params.content,
        mode: params.mode,
        provider: params.provider ?? "auto"
      })
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE chunks separated by \n\n
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const p of parts) {
        if (!p.startsWith("data:")) continue;
        const json = p.replace(/^data:\s*/, "").trim();

        if (!json) continue;
        const parsed = JSON.parse(json);

        if (parsed.error) {
          params.onError(parsed.error);
          return;
        }
        if (parsed.done) {
          params.onDone();
          return;
        }
        if (parsed.content) {
          params.onToken(parsed.content);
        }
      }
    }

    params.onDone();
  } catch (e) {
    params.onError((e as Error).message);
  }
}
