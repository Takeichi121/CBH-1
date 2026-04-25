CREATE TABLE IF NOT EXISTS "announcement_acknowledgments" (
  "id" serial PRIMARY KEY NOT NULL,
  "announcement_id" integer NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
  "username" text NOT NULL REFERENCES "users"("username") ON DELETE CASCADE,
  "acknowledged_at" text NOT NULL,
  UNIQUE("announcement_id", "username")
);
