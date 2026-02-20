import { pgTable, text, serial, integer, boolean, unique, timestamp, decimal, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ==========================================
// 👤 Users & Roles
// ==========================================

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

// ==========================================
// 💬 Chat & AI (Updated with User Relation)
// ==========================================

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // ✅ เพิ่ม userId เพื่อระบุเจ้าของแชท
  userId: text("user_id").references(() => users.username, { onDelete: "cascade" }), 
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ==========================================
// 📅 Shifts & Rosters
// ==========================================

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

// ==========================================
// 📋 Manager Requests
// ==========================================

export const managerRequestTypes = [
  "select_work_time",    // เลือกเวลาเข้างาน
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

export const managerRequests = pgTable("manager_requests", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(),
  requestDate: text("request_date").notNull(), 
  requestedBy: text("requested_by").notNull(), 

  // สำหรับ select_work_time
  startTime: text("start_time"), 
  endTime: text("end_time"),     

  // สำหรับ day_off
  dayOffReason: text("day_off_reason"), 

  note: text("note"),
  status: text("status").notNull().default("pending"), 
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  rejectionReason: text("rejection_reason"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ==========================================
// 📊 Sales & Reports
// ==========================================

export const dailySalesReports = pgTable("daily_sales_reports", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  reportBy: text("report_by").notNull(),
  workShift: text("work_shift").notNull().default("full"),

  // Daily Sales
  dailyTarget: text("daily_target").notNull().default("0"),
  actualSales: text("actual_sales").notNull().default("0"),
  transactionCount: text("transaction_count").notNull().default("0"),

  // MTD
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
  robin: text("robin").default("0"),
  gokoo: text("gokoo").default("0"),

  // Metrics
  osat: text("osat").default("0"),
  surveyCount: text("survey_count").default("0"),
  voidAmount: text("void_amount").default("0"),
  voidCount: text("void_count").default("0"),
  sosDaily: text("sos_daily").default("0"),
  sosMtd: text("sos_mtd").default("0"),

  // Add-ons
  addCheeseCount: text("add_cheese_count").default("0"),
  addCheesePercent: text("add_cheese_percent").default("0"),
  vMealCount: text("v_meal_count").default("0"),
  vMealPercent: text("v_meal_percent").default("0"),
  upSizeCount: text("up_size_count").default("0"),
  upSizePercent: text("up_size_percent").default("0"),

  // Waste
  wasteRawDaily: text("waste_raw_daily").default("0"),
  wasteRawDailyPercent: text("waste_raw_daily_percent").default("0"),
  wasteMealDaily: text("waste_meal_daily").default("0"),
  wasteMealDailyPercent: text("waste_meal_daily_percent").default("0"),
  wasteRawMtd: text("waste_raw_mtd").default("0"),
  wasteRawMtdPercent: text("waste_raw_mtd_percent").default("0"),
  wasteMealMtd: text("waste_meal_mtd").default("0"),
  wasteMealMtdPercent: text("waste_meal_mtd_percent").default("0"),

  // Labor
  recommendHours: text("recommend_hours").default("0"),
  rosterCommit: text("roster_commit").default("0"),
  actualHours: text("actual_hours").default("0"),
  otHours: text("ot_hours").default("0"),
  otMtd: text("ot_mtd").default("0"),
  summaryHours: text("summary_hours").default("0"),
  varianceHours: text("variance_hours").default("0"),
  laborCost: text("labor_cost").default("0"),
  colPercent: text("col_percent").default("0"),
  laborHour: text("labor_hour").default("0"),
  tcmh: text("tcmh").default("0"),

  // Roster
  managerRosterDate: text("manager_roster_date"),
  managerRosterText: text("manager_roster_text"),
  staffRosterText: text("staff_roster_text"),

  // Excel Comparison Fields
  lastYearSales: text("last_year_sales").default("0"),
  forecastSales: text("forecast_sales").default("0"),
  lastYearTc: text("last_year_tc").default("0"),
  targetTc: text("target_tc").default("0"),
  targetTa: text("target_ta").default("0"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Weekly Sales Reports
export const weeklySalesReports = pgTable("weekly_sales_reports", {
  id: serial("id").primaryKey(),
  weekStartDate: text("week_start_date").notNull(),
  weekEndDate: text("week_end_date").notNull(),
  reportBy: text("report_by").notNull(),

  sale: text("sale").default(""),
  tc: text("tc").default(""),
  ta: text("ta").default(""),
  cog: text("cog").default(""),
  waste: text("waste").default(""),
  unac: text("unac").default(""),
  sos: text("sos").default(""),
  gsi: text("gsi").default(""),
  osat: text("osat").default(""),
  delivery: text("delivery").default(""),
  googleReview: text("google_review").default(""),
  colMtd: text("col_mtd").default(""),

  wasteTop3: text("waste_top3").default(""),
  unaccountedTop3: text("unaccounted_top3").default(""),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqueWeek: unique().on(t.weekStartDate),
}));

export const dailyTargets = pgTable("daily_targets", {
  id: serial("id").primaryKey(),
  targetDate: text("target_date").notNull(),
  targetSales: text("target_sales").notNull().default("130000"),
  targetTc: text("target_tc").default("300"),
  wasteRawDaily: text("waste_raw_daily").default("0"),
  wasteMealDaily: text("waste_meal_daily").default("0"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqueDate: unique().on(t.targetDate),
}));

export const wasteTargets = pgTable("waste_targets", {
  id: serial("id").primaryKey(),
  targetMonth: text("target_month").notNull(),
  mtdAmount: text("mtd_amount").default("0"),
  mtdPercent: text("mtd_percent").default("0"),
  mealAmount: text("meal_amount").default("0"),
  mealPercent: text("meal_percent").default("0"),
  rawAmount: text("raw_amount").default("0"),
  rawPercent: text("raw_percent").default("0"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqueMonth: unique().on(t.targetMonth),
}));

// ==========================================
// 📦 Borrow Tracker
// ==========================================

// 1. Define the table first
// ✅ This is a Drizzle Table definition
export const borrowBranches = pgTable("borrow_branches", {
  id: text("id").primaryKey(), // You noted "must be string" in your comments
  name: text("name").notNull(),
  code: text("code"),
  isActive: integer("is_active").notNull().default(1),
});

export const itemCategories = [
  { id: "meat", th: "หมวดเนื้อสัตว์", en: "Meat & Pork" },
  { id: "bun", th: "หมวดขนมปัง", en: "Bun" },
  { id: "chicken", th: "หมวดไก่และปลา", en: "Chicken & Fish" },
  { id: "fried", th: "หมวดของทอด", en: "Fried" },
  { id: "ingredients", th: "หมวดวัตถุดิบและผัก", en: "Ingredients & Veg" },
  { id: "sauce", th: "หมวดซอสและเครื่องปรุง", en: "Sauce & Condiment" },
  { id: "beverage", th: "หมวดเครื่องดื่ม", en: "Beverage" },
  { id: "dessert", th: "หมวดของหวานและเบเกอรี่", en: "Dessert & Pie" },
  { id: "packaging", th: "หมวดบรรจุภัณฑ์", en: "Packaging - Bags & Boxes" },
  { id: "cup", th: "หมวดแก้ว ฝา และหลอด", en: "Cup, Lid & Straw" },
  { id: "utensil", th: "หมวดอุปกรณ์พลาสติกและกระดาษ", en: "Utensil & Paper" },
] as const;

export type ItemCategoryId = typeof itemCategories[number]["id"];

export const borrowItems = pgTable("borrow_items", {
  id: text("id").primaryKey(), // Changed from serial to text if you generate ID like "it_..." manually
  code: text("code"),
  name: text("name").notNull(),
  category: text("category"),
  units: text("units").array(),
  isActive: integer("is_active").notNull().default(1),
});

export const borrowTransactions = pgTable("borrow_transactions", {
  id: text("id").primaryKey(), // Changed from serial to text if you generate ID like "tx_..." manually
  txDate: text("tx_date").notNull(),
  dueDate: text("due_date"),
  txType: text("tx_type").notNull(), // 'borrow_in' | 'borrow_out'
  branch: text("branch").notNull(), // Stores branch ID
  item: text("item").notNull(),
  qty: integer("qty").notNull().default(0),
  unit: text("unit"),
  borrower: text("borrower"),
  lender: text("lender"),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(), // Backend seems to generate string timestamps
});

// ==========================================
// ⚙️ Labor & Cost Control
// ==========================================

export const laborSettings = pgTable("labor_settings", {
  id: serial("id").primaryKey(),
  rosterHours: decimal("roster_hours", { precision: 10, scale: 2 }).default("88"),        
  dutyDailyHours: decimal("duty_daily_hours", { precision: 10, scale: 2 }).default("40"), 
  fixedCostDaily: decimal("fixed_cost_daily", { precision: 10, scale: 2 }).default("0"),  
  closeShiftDailyCost: decimal("close_shift_daily_cost", { precision: 10, scale: 2 }).default("0"), 
  ptWageRate: decimal("pt_wage_rate", { precision: 10, scale: 2 }).default("45"),         
  updatedAt: text("updated_at"),
});

export const dailyLabor = pgTable("daily_labor", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }).default("0"), 
  otHours: decimal("ot_hours", { precision: 10, scale: 2 }).default("0"),         
  summaryHours: decimal("summary_hours", { precision: 10, scale: 2 }).default("0"),     
  varianceHours: decimal("variance_hours", { precision: 10, scale: 2 }).default("0"),   
  laborCostTotal: decimal("labor_cost_total", { precision: 10, scale: 2 }).default("0"),
  colPercent: decimal("col_percent", { precision: 10, scale: 2 }).default("0"),         
  tcmh: decimal("tcmh", { precision: 10, scale: 2 }).default("0"),                      
  updatedAt: text("updated_at"),
});

// ==========================================
// 🔧 System & Config
// ==========================================

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

// ==========================================
// 🔐 Password Reset OTP
// ==========================================

export const passwordResetOtps = pgTable("password_reset_otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  otp: text("otp").notNull(),
  otpSalt: text("otp_salt").notNull().default(""),
  resetToken: text("reset_token"),
  expiresAt: integer("expires_at").notNull(),
  used: integer("used").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull(),
  storeCode: text("store_code").notNull(),
  dailyTarget: text("daily_target").notNull().default("250000"),
  mtdTarget: text("mtd_target").default("7500000"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientUsername: text("recipient_username").notNull(), 
  type: text("type").notNull(), 
  title: text("title").notNull(),
  titleTh: text("title_th"), 
  message: text("message").notNull(),
  messageTh: text("message_th"), 
  relatedId: text("related_id"), 
  isRead: integer("is_read").notNull().default(0), 
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"), 
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleTh: text("title_th"), 
  content: text("content").notNull(),
  contentTh: text("content_th"), 
  priority: text("priority").notNull().default("normal"), 
  targetAudience: text("target_audience").notNull().default("all"), 
  isPinned: integer("is_pinned").notNull().default(0),
  expiresAt: text("expires_at"), 
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ==========================================
// 💬 Staff Chat Messages (Persistent)
// ==========================================

export const staffChatMessages = pgTable("staff_chat_messages", {
  id: serial("id").primaryKey(),
  senderUsername: text("sender_username").notNull(),
  senderDisplayName: text("sender_display_name").notNull(),
  recipientUsername: text("recipient_username"), // null = group message
  text: text("text").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, image, sticker
  imageUrl: text("image_url"), // URL for image messages
  isRead: integer("is_read").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// Sticker definitions for chat - using icon names from lucide-react
export const CHAT_STICKERS = [
  { id: "thumbs-up", icon: "ThumbsUp", label: "OK" },
  { id: "heart", icon: "Heart", label: "Love" },
  { id: "smile", icon: "Smile", label: "Smile" },
  { id: "sparkles", icon: "Sparkles", label: "Wow" },
  { id: "frown", icon: "Frown", label: "Sad" },
  { id: "flame", icon: "Flame", label: "Fire" },
  { id: "zap", icon: "Zap", label: "Zap" },
  { id: "star", icon: "Star", label: "Star" },
  { id: "check-circle", icon: "CheckCircle", label: "Check" },
  { id: "trophy", icon: "Trophy", label: "Trophy" },
  { id: "party-popper", icon: "PartyPopper", label: "Party" },
  { id: "rocket", icon: "Rocket", label: "Rocket" },
  { id: "coffee", icon: "Coffee", label: "Coffee" },
  { id: "utensils", icon: "Utensils", label: "Food" },
  { id: "clock", icon: "Clock", label: "Time" },
  { id: "message-circle", icon: "MessageCircle", label: "Message" },
] as const;

// ==========================================
// 🛡️ Zod Schemas
// ==========================================

export const insertUserSchema = createInsertSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const insertConfigSchema = createInsertSchema(config);
export const insertLogSchema = createInsertSchema(systemlog);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertSwapRequestSchema = createInsertSchema(swapRequests);
export const insertDailySalesSchema = createInsertSchema(dailySalesReports).omit({ id: true });
export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({ id: true });
export const insertDailyTargetSchema = createInsertSchema(dailyTargets).omit({ id: true });
export const insertWasteTargetSchema = createInsertSchema(wasteTargets).omit({ id: true });
export const insertManagerRequestSchema = createInsertSchema(managerRequests).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true });
export const insertBorrowBranchSchema = createInsertSchema(borrowBranches).omit({ id: true });
export const insertBorrowItemSchema = createInsertSchema(borrowItems).omit({ id: true });
export const insertBorrowTransactionSchema = createInsertSchema(borrowTransactions).omit({ id: true });
export const insertLaborSettingsSchema = createInsertSchema(laborSettings).omit({ id: true });
export const insertDailyLaborSchema = createInsertSchema(dailyLabor).omit({ id: true });
export const insertWeeklySalesSchema = createInsertSchema(weeklySalesReports).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertStaffChatMessageSchema = createInsertSchema(staffChatMessages).omit({ id: true });

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
export type WasteTarget = typeof wasteTargets.$inferSelect;
export type InsertWasteTarget = z.infer<typeof insertWasteTargetSchema>;
export type ManagerRequest = typeof managerRequests.$inferSelect;
export type InsertManagerRequest = z.infer<typeof insertManagerRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type BorrowBranch = typeof borrowBranches.$inferSelect;
export type InsertBorrowBranch = z.infer<typeof insertBorrowBranchSchema>;
export type BorrowItem = typeof borrowItems.$inferSelect;
export type InsertBorrowItem = z.infer<typeof insertBorrowItemSchema>;
export type BorrowTransaction = typeof borrowTransactions.$inferSelect;
export type InsertBorrowTransaction = z.infer<typeof insertBorrowTransactionSchema>;
export type LaborSettings = typeof laborSettings.$inferSelect;
export type InsertLaborSettings = z.infer<typeof insertLaborSettingsSchema>;
export type DailyLabor = typeof dailyLabor.$inferSelect;
export type InsertDailyLabor = z.infer<typeof insertDailyLaborSchema>;
export type WeeklySalesReport = typeof weeklySalesReports.$inferSelect;
export type InsertWeeklySales = z.infer<typeof insertWeeklySalesSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type StaffChatMessage = typeof staffChatMessages.$inferSelect;
export type InsertStaffChatMessage = z.infer<typeof insertStaffChatMessageSchema>;

// Cart item type for borrow tracker (client-side)
export interface BorrowCartItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
}

// ==========================================
// 🤖 Chann AI Conversations
// ==========================================

export const channConversations = pgTable("chann_conversations", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChannConversation = typeof channConversations.$inferSelect;
export type InsertChannConversation = typeof channConversations.$inferInsert;