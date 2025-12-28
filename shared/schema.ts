import { pgTable, text, serial, integer, boolean, unique, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Manager position levels
export const managerPositions = [
  "store_manager",
  "assistant_store_manager", 
  "shift_manager",
  "management_trainee",
] as const;

export type ManagerPosition = typeof managerPositions[number];

export const managerPositionLabels: Record<ManagerPosition, { en: string; th: string }> = {
  store_manager: { en: "Store Manager", th: "ผู้จัดการร้าน" },
  assistant_store_manager: { en: "Assistant Store Manager", th: "ผู้ช่วยผู้จัดการร้าน" },
  shift_manager: { en: "Shift Manager", th: "ผู้จัดการกะ" },
  management_trainee: { en: "Management Trainee", th: "ผู้ฝึกหัดผู้จัดการ" },
};

export const users = pgTable("users", {
  username: text("username").primaryKey(),
  passhash: text("passhash").notNull(),
  role: text("role").notNull().default("staff"),
  fullName: text("full_name"),
  fullNameTh: text("full_name_th"),
  nickName: text("nick_name"),
  phone: text("phone"),
  email: text("email"),
  position: text("position"),
  active: integer("active").notNull().default(1),
  mustChangePassword: integer("must_change_password").notNull().default(0),
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

export const swapRequests = pgTable("swap_requests", {
  id: serial("id").primaryKey(),
  requesterUsername: text("requester_username").notNull(),
  requesterDate: text("requester_date").notNull(),
  targetUsername: text("target_username").notNull(),
  targetDate: text("target_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  approvedBy: text("approved_by"),
  note: text("note"),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const insertConfigSchema = createInsertSchema(config);
export const insertLogSchema = createInsertSchema(systemlog);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertSwapRequestSchema = createInsertSchema(swapRequests);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;

export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Config = typeof config.$inferSelect;
export type SystemLog = typeof systemlog.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SwapRequest = typeof swapRequests.$inferSelect;
