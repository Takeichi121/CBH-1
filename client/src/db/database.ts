await db.exec(`
  CREATE TABLE IF NOT EXISTS conversation_memory (
    conversation_id INTEGER PRIMARY KEY,
    summary TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);