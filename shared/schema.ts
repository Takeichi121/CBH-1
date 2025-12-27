import { pgTable, text, serial, integer, boolean, unique, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  username: text("username").primaryKey(),
  passhash: text("passhash").notNull(),
  role: text("role").notNull().default("staff"),
  fullName: text("full_name"),
  nickName: text("nick_name"),
  phone: text("phone"),
  email: text("email"),
  position: text("position"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  username: text("username").notNull(),
  fullName: text("full_name"),
  nickName: text("nick_name"),
  role: text("role"),
  shiftGroup: text("shift_group").notNull(),
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
}, (t) => ({
  uniqueUserDate: unique().on(t.username, t.date),
}));

export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const systemlog = pgTable("systemlog", {
  id: serial("id").primaryKey(),
  ts: text("ts").notNull(),
  action: text("action").notNull(),
  byUser: text("by_user"),
  detail: text("detail"),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  username: text("username").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const insertConfigSchema = createInsertSchema(config);
export const insertLogSchema = createInsertSchema(systemlog);
export const insertSessionSchema = createInsertSchema(sessions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Config = typeof config.$inferSelect;
export type SystemLog = typeof systemlog.$inferSelect;
export type Session = typeof sessions.$inferSelect;
