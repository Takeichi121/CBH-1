import { initDatabase } from "client/src/db/database.ts";

export async function getConversationSummary(conversationId: number) {
  const { db } = await initDatabase();
  const row = await db.get<{ summary: string }>(
    "SELECT summary FROM conversation_memory WHERE conversation_id = ?",
    conversationId
  );
  return row?.summary ?? "";
}

export async function upsertConversationSummary(conversationId: number, summary: string) {
  const { db } = await initDatabase();
  await db.run(
    `INSERT INTO conversation_memory(conversation_id, summary)
     VALUES(?, ?)
     ON CONFLICT(conversation_id) DO UPDATE SET
       summary=excluded.summary,
       updated_at=CURRENT_TIMESTAMP`,
    conversationId,
    summary
  );
}
