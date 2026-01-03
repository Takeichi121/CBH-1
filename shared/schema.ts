import { pgTable, text, serial, integer, boolean, unique, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Chat tables for OpenAI integration
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

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

// Staff position levels
export const staffPositions = [
  "team_lead",
  "guest_ambassador",
  "service_staff",
] as const;

export type StaffPosition = typeof staffPositions[number];

export const staffPositionLabels: Record<StaffPosition, { en: string; th: string }> = {
  team_lead: { en: "Team Lead", th: "หัวหน้าทีม" },
  guest_ambassador: { en: "Guest Ambassador", th: "ผู้ดูแลลูกค้า" },
  service_staff: { en: "Service Staff", th: "พนักงานบริการ" },
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
  profilePicture: text("profile_picture"),
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

// Daily Sales Reports
export const dailySalesReports = pgTable("daily_sales_reports", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  reportBy: text("report_by").notNull(),
  workShift: text("work_shift").notNull().default("full"),
  
  // Daily Sales
  dailyTarget: text("daily_target").notNull().default("0"),
  actualSales: text("actual_sales").notNull().default("0"),
  transactionCount: text("transaction_count").notNull().default("0"),
  
  // MTD (Month To Date)
  mtdTarget: text("mtd_target").default("0"),
  mtdActual: text("mtd_actual").default("0"),
  mtdTc: text("mtd_tc").default("0"),
  
  // In Store
  dineIn: text("dine_in").default("0"),
  dineInTc: text("dine_in_tc").default("0"),
  takeAway: text("take_away").default("0"),
  takeAwayTc: text("take_away_tc").default("0"),
  
  // Delivery
  grabfood: text("grabfood").default("0"),
  lineman: text("lineman").default("0"),
  shopee: text("shopee").default("0"),
  bkapp: text("bkapp").default("0"),
  
  // Performance Metrics
  osat: text("osat").default("0"),
  surveyCount: text("survey_count").default("0"),
  voidAmount: text("void_amount").default("0"),
  voidCount: text("void_count").default("0"),
  
  // Add-ons
  addCheeseCount: text("add_cheese_count").default("0"),
  addCheesePercent: text("add_cheese_percent").default("0"),
  vMealCount: text("v_meal_count").default("0"),
  vMealPercent: text("v_meal_percent").default("0"),
  upSizeCount: text("up_size_count").default("0"),
  upSizePercent: text("up_size_percent").default("0"),
  
  // Waste - Daily
  wasteRawDaily: text("waste_raw_daily").default("0"),
  wasteRawDailyPercent: text("waste_raw_daily_percent").default("0"),
  wasteMealDaily: text("waste_meal_daily").default("0"),
  wasteMealDailyPercent: text("waste_meal_daily_percent").default("0"),
  
  // Waste - MTD
  wasteRawMtd: text("waste_raw_mtd").default("0"),
  wasteRawMtdPercent: text("waste_raw_mtd_percent").default("0"),
  wasteMealMtd: text("waste_meal_mtd").default("0"),
  wasteMealMtdPercent: text("waste_meal_mtd_percent").default("0"),
  
  // Labor
  colPercent: text("col_percent").default("0"),
  laborHour: text("labor_hour").default("0"),
  tcmh: text("tcmh").default("0"),
  
  // Roster
  managerRosterDate: text("manager_roster_date"),
  managerRosterText: text("manager_roster_text"),
  staffRosterText: text("staff_roster_text"),
  
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Store Settings
export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull(),
  storeCode: text("store_code").notNull(),
  dailyTarget: text("daily_target").notNull().default("250000"),
  mtdTarget: text("mtd_target").default("7500000"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Manager Request Types
export const managerRequestTypes = [
  "select_work_time",    // เลือกเวลาเข้างาน (จำกัด 2 ครั้ง/เดือน)
  "day_off",             // ขอวันหยุด
  "compensate_leave",    // ขอใช้วัน COM
  "annual_leave",        // ลาพักร้อน
  "without_pay",         // ลาไม่รับค่าจ้าง
] as const;

export type ManagerRequestType = typeof managerRequestTypes[number];

export const managerRequestTypeLabels: Record<ManagerRequestType, { en: string; th: string }> = {
  select_work_time: { en: "Select Work Time", th: "เลือกเวลาเข้างาน" },
  day_off: { en: "Day Off", th: "ขอวันหยุด" },
  compensate_leave: { en: "Compensate Leave (COM)", th: "ลาชดเชย (COM)" },
  annual_leave: { en: "Annual Leave", th: "ลาพักร้อน" },
  without_pay: { en: "Without Pay", th: "ลาไม่รับค่าจ้าง" },
};

// Day off reason options
export const dayOffReasons = [
  "doctor_appointment",  // ไปหาหมอ
  "personal",            // ธุระส่วนตัว
  "family",              // ธุระครอบครัว
  "other",               // อื่นๆ
] as const;

export type DayOffReason = typeof dayOffReasons[number];

export const dayOffReasonLabels: Record<DayOffReason, { en: string; th: string }> = {
  doctor_appointment: { en: "Doctor Appointment", th: "ไปหาหมอ" },
  personal: { en: "Personal Business", th: "ธุระส่วนตัว" },
  family: { en: "Family Business", th: "ธุระครอบครัว" },
  other: { en: "Other", th: "อื่นๆ" },
};

// Manager Requests Table
export const managerRequests = pgTable("manager_requests", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // select_work_time, day_off, compensate_leave, annual_leave, without_pay
  requestDate: text("request_date").notNull(), // YYYY-MM-DD - วันที่ขอ
  requestedBy: text("requested_by").notNull(), // username ของผู้ขอ
  
  // สำหรับ select_work_time
  startTime: text("start_time"), // เวลาเริ่ม (HH:MM)
  endTime: text("end_time"),     // เวลาเลิก (HH:MM)
  
  // สำหรับ day_off
  dayOffReason: text("day_off_reason"), // doctor_appointment, personal, family, other
  
  // หมายเหตุทั่วไป
  note: text("note"),
  
  // สถานะ
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Notifications table for in-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientUsername: text("recipient_username").notNull(), // who receives the notification
  type: text("type").notNull(), // shift_change, announcement, swap_request, approval, etc.
  title: text("title").notNull(),
  titleTh: text("title_th"), // Thai translation
  message: text("message").notNull(),
  messageTh: text("message_th"), // Thai translation
  relatedId: text("related_id"), // ID of related record (shift id, announcement id, etc.)
  isRead: integer("is_read").notNull().default(0), // 0 = unread, 1 = read
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"), // who triggered this notification
});

// Announcements table for branch-wide announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleTh: text("title_th"), // Thai translation
  content: text("content").notNull(),
  contentTh: text("content_th"), // Thai translation
  priority: text("priority").notNull().default("normal"), // normal, important, urgent
  targetAudience: text("target_audience").notNull().default("all"), // all, staff, managers
  isPinned: integer("is_pinned").notNull().default(0),
  expiresAt: text("expires_at"), // optional expiration date
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Daily Targets (per day target values like Excel table)
export const dailyTargets = pgTable("daily_targets", {
  id: serial("id").primaryKey(),
  targetDate: text("target_date").notNull(), // YYYY-MM-DD
  targetSales: text("target_sales").notNull().default("130000"),
  targetTc: text("target_tc").default("300"), // optional target transaction count
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqueDate: unique().on(t.targetDate),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const insertConfigSchema = createInsertSchema(config);
export const insertLogSchema = createInsertSchema(systemlog);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertSwapRequestSchema = createInsertSchema(swapRequests);
export const insertDailySalesSchema = createInsertSchema(dailySalesReports).omit({ id: true });
export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({ id: true });
export const insertDailyTargetSchema = createInsertSchema(dailyTargets).omit({ id: true });
export const insertManagerRequestSchema = createInsertSchema(managerRequests).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;
export type InsertDailySales = z.infer<typeof insertDailySalesSchema>;
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type InsertDailyTarget = z.infer<typeof insertDailyTargetSchema>;

export type User = typeof users.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Config = typeof config.$inferSelect;
export type SystemLog = typeof systemlog.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SwapRequest = typeof swapRequests.$inferSelect;
export type DailySalesReport = typeof dailySalesReports.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type DailyTarget = typeof dailyTargets.$inferSelect;
export type ManagerRequest = typeof managerRequests.$inferSelect;
export type InsertManagerRequest = z.infer<typeof insertManagerRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
