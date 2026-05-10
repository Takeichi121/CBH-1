async function sendLineMessageOnce(channelToken: string, targetId: string, messages: any[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelToken}`,
    },
    body: JSON.stringify({ to: targetId, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE API error ${res.status}: ${err}`);
  }
  return await res.json();
}

export async function sendLineMessage(
  channelToken: string,
  targetId: string,
  messages: any[],
  options: { maxRetries?: number; retryDelayMs?: number } = {}
) {
  const { maxRetries = 3, retryDelayMs = 2000 } = options;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendLineMessageOnce(channelToken, targetId, messages);
    } catch (err: any) {
      lastErr = err;
      const status = parseInt(err?.message?.match(/\d+/)?.[0] || "0");
      if (status === 400 || status === 401 || status === 403) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = retryDelayMs * attempt;
        console.warn(`[LINE] ส่งไม่สำเร็จ (attempt ${attempt}/${maxRetries}) — รอ ${delay}ms แล้วลองใหม่`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}
