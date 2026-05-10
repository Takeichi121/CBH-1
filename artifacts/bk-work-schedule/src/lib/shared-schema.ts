// Frontend-friendly re-export of shared schema constants and types
// Types are manually defined to avoid importing from @workspace/db (which triggers DB connection)

// ==========================================
// 👤 Manager & Staff Positions
// ==========================================
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

export const staffPositions = [
  "team_lead",
  "guest_ambassador",
  "service_staff",
] as const;

export type StaffPosition = typeof staffPositions[number];

export const staffPositionLabels: Record<StaffPosition, { en: string; th: string }> = {
  team_lead: { en: "Team Lead", th: "หัวหน้าพนักงาน" },
  guest_ambassador: { en: "Guest Ambassador", th: "ผู้ดูแลลูกค้า" },
  service_staff: { en: "Service Staff", th: "พนักงานบริการ" },
};

// ==========================================
// 📦 Item Categories
// ==========================================
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

// ==========================================
// 💬 Chat Stickers
// ==========================================
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
// 🔑 Feature Permission Keys
// ==========================================
export const featureKeys = [
  "dashboard",
  "handbook",
  "settings",
  "work",
  "roster",
  "requests",
  "sales",
  "sales_settings",
  "sales_import",
  "borrow",
  "chat",
  "admin",
  "chann",
] as const;

export type FeatureKey = typeof featureKeys[number];

export const featureGroups: { group: { en: string; th: string }; keys: FeatureKey[] }[] = [
  { group: { en: "General", th: "ทั่วไป" }, keys: ["dashboard", "handbook", "settings"] },
  { group: { en: "Work", th: "งาน" }, keys: ["work", "roster", "requests"] },
  { group: { en: "Sales", th: "ยอดขาย" }, keys: ["sales", "sales_settings", "sales_import"] },
  { group: { en: "Other", th: "อื่นๆ" }, keys: ["borrow", "chat", "admin", "chann"] },
];

export const featureLabels: Record<FeatureKey, { en: string; th: string }> = {
  dashboard: { en: "Dashboard", th: "หน้า Dashboard" },
  handbook: { en: "Employee Handbook", th: "คู่มือพนักงาน" },
  settings: { en: "App Settings", th: "ตั้งค่า App" },
  work: { en: "My Work / Schedule", th: "My Work / ตารางงาน" },
  roster: { en: "Roster (Manager View)", th: "ตารางงาน (Manager View)" },
  requests: { en: "Manager Requests", th: "Manager Requests" },
  sales: { en: "Sales Report", th: "Sales Report (Dashboard/Daily/Weekly/Reports/Manual)" },
  sales_settings: { en: "Sales Settings Tab", th: "Sales Settings tab" },
  sales_import: { en: "Import DBF Tab", th: "Import DBF tab" },
  borrow: { en: "Borrow Tracker", th: "Borrow Tracker" },
  chat: { en: "Staff Chat", th: "Staff Chat" },
  admin: { en: "Manage Team", th: "Manage Team" },
  chann: { en: "Chann AI Chat", th: "Chann AI Chat" },
};

// ==========================================
// 📦 Type definitions (mirrored from DB schema)
// ==========================================

export interface Notification {
  id: number;
  recipientUsername: string;
  type: string;
  title: string;
  titleTh: string | null;
  message: string;
  messageTh: string | null;
  relatedId: string | null;
  isRead: number;
  createdAt: string;
  createdBy: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  titleTh: string | null;
  content: string;
  contentTh: string | null;
  priority: string;
  targetAudience: string;
  isPinned: number;
  expiresAt: string | null;
  storeId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface AnnouncementAcknowledgment {
  id: number;
  announcementId: number;
  username: string;
  acknowledgedAt: string;
}

export interface BorrowBranch {
  id: string;
  name: string;
  code: string | null;
  isActive: number;
}

export interface BorrowItem {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  units: string[] | null;
  isActive: number;
}

export interface BorrowTransaction {
  id: string;
  txDate: string;
  dueDate: string | null;
  txType: string;
  branch: string;
  item: string;
  qty: number;
  unit: string | null;
  borrower: string | null;
  lender: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface AgentRequest {
  id: number;
  username: string;
  type: string;
  title: string;
  description: string;
  status: string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

// Stubs for Drizzle table objects and Zod schemas used in shared-routes
// These are only needed for type inference in API contract definitions
import { z } from "zod";
export const insertUserSchema = z.object({});
export const insertShiftSchema = z.object({});
export const users = {} as any;
export const shifts = {} as any;
export const config = {} as any;
