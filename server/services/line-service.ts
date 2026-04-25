export async function sendLineMessage(channelToken: string, targetId: string, messages: any[]) {
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
