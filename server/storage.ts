import { db } from "./db";
import { users, shifts, config, systemlog, sessions, swapRequests, dailySalesReports, storeSettings, dailyTargets, wasteTargets, managerRequests, notifications, announcements, announcementAcknowledgments, borrowBranches, borrowItems, borrowTransactions, laborSettings, dailyLabor, weeklySalesReports, channNotes, agentRequests, dropdownOptions, stores, clockRecords, type User, type Shift, type Config, type SystemLog, type Session, type InsertUser, type InsertShift, type SwapRequest, type InsertSwapRequest, type DailySalesReport, type InsertDailySales, type StoreSettings, type InsertStoreSettings, type DailyTarget, type InsertDailyTarget, type WasteTarget, type ManagerRequest, type InsertManagerRequest, type Notification, type InsertNotification, type Announcement, type InsertAnnouncement, type AnnouncementAcknowledgment, type BorrowBranch, type InsertBorrowBranch, type BorrowItem, type InsertBorrowItem, type BorrowTransaction, type InsertBorrowTransaction, type LaborSettings, type InsertLaborSettings, type DailyLabor, type InsertDailyLabor, type WeeklySalesReport, type InsertWeeklySales, type ChannNote, type AgentRequest, type InsertAgentRequest, type DropdownOption, type InsertDropdownOption, type Store, type InsertStore, type ClockRecord, type InsertClockRecord } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, like } from "drizzle-orm";

export class StorageError extends Error {
  public readonly operation: string;
  public readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Storage operation "${operation}" failed: ${msg}`);
    this.name = "StorageError";
    this.operation = operation;
    this.cause = cause;
  }
}

function wrapStorageError(operation: string, err: unknown): never {
  console.error(`Storage error [${operation}]:`, err);
  throw new StorageError(operation, err);
}

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;

export async function transaction<T>(fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => fn(tx));
}

export async function updateShiftById(
  tx: Tx,
  id: number | string,
  patch: Partial<{
    date: string;
    shiftGroup: string;
    startTime: string;
    endTime: string;
    note: string | null;
    updatedAt: string;
    updatedBy: string;
  }>,
) {
  const r = await tx
    .update(shifts)
    .set(patch)
    .where(eq(shifts.id, Number(id)))
    .returning({ id: shifts.id });

  if (!r.length) throw new Error("Shift not found");
}

export interface IStorage {
  // Users
  getUser(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserStatus(username: string, active: number): Promise<void>;
  updateUser(username: string, data: Partial<{ fullName: string; fullNameTh: string; nickName: string; phone: string; email: string; active: number; mustChangePassword: number; position: string }>): Promise<void>;
  updateUserRole(username: string, role: string, position?: string): Promise<void>;
  updateUserFeatures(username: string, allowedFeatures: string | null): Promise<void>;

  // Shifts
  getShift(username: string, date: string): Promise<Shift | undefined>;
  getShiftsInRange(startDate: string, endDate: string): Promise<Shift[]>;
  upsertShift(shift: InsertShift): Promise<Shift>;
  deleteShift(username: string, date: string): Promise<void>;

  // Config
  getConfig(): Promise<Record<string, string>>;
  setConfig(key: string, value: string): Promise<void>;

  // Sessions
  createSession(session: typeof sessions.$inferInsert): Promise<void>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;

  // Logs
  log(action: string, byUser: string, detail: string): Promise<void>;
  batchLog(entries: Array<{ action: string; byUser: string; detail: string }>): Promise<void>;

  // Swap Requests
  createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest>;
  getSwapRequests(status?: string, storeId?: string): Promise<SwapRequest[]>;
  getSwapRequestById(id: number, storeId?: string | null): Promise<SwapRequest | undefined>;
  updateSwapRequestStatus(id: number, status: string, approvedBy?: string, note?: string): Promise<void>;

  // Daily Sales Reports
  createDailySalesReport(report: InsertDailySales): Promise<DailySalesReport>;
  getDailySalesReport(id: number): Promise<DailySalesReport | undefined>;
  getDailySalesReportByDate(date: string, storeId?: string): Promise<DailySalesReport | undefined>;
  getDailySalesReports(date?: string, limit?: number, storeId?: string): Promise<DailySalesReport[]>;
  getDailySalesReportsForMonth(year: number, month: number, storeId?: string): Promise<DailySalesReport[]>;
  getDailySalesReportsByDateRange(startDate: string, endDate: string, storeId?: string): Promise<DailySalesReport[]>;
  updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport>;
  upsertDailySalesReportByDate(report: InsertDailySales, storeId?: string, isManualSave?: boolean): Promise<DailySalesReport>;
  deleteDailySalesReport(id: number): Promise<boolean>;
  getMtdSummary(year: number, month: number, beforeDate?: string, storeId?: string): Promise<{
    mtdActual: number;
    mtdTc: number;
    mtdTarget: number;
    reportCount: number;
    wasteMtdTotal: number;
    wasteMealMtd: number;
    otMtd: number;
  }>;

  // Store Settings
  getStoreSettings(): Promise<StoreSettings | undefined>;
  updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings>;

  // Daily Targets
  getDailyTargetsForMonth(year: number, month: number, storeId?: string): Promise<DailyTarget[]>;
  getDailyTarget(date: string, storeId?: string): Promise<DailyTarget | undefined>;
  upsertDailyTarget(target: InsertDailyTarget, storeId?: string): Promise<DailyTarget>;
  bulkUpsertDailyTargets(targets: InsertDailyTarget[], storeId?: string): Promise<void>;
  getMtdTargetSum(year: number, month: number, upToDate: string, defaultPerDay?: number, storeId?: string): Promise<number>;

  // Weekly Sales Reports
  getWeeklySalesReport(weekStartDate: string, storeId?: string): Promise<WeeklySalesReport | undefined>;
  upsertWeeklySalesReport(report: InsertWeeklySales, storeId?: string): Promise<WeeklySalesReport>;
  getWeeklySalesReports(limit?: number, storeId?: string): Promise<WeeklySalesReport[]>;

  // Waste Targets
  getWasteTarget(targetMonth: string, storeId?: string): Promise<WasteTarget | undefined>;
  upsertWasteTarget(targetMonth: string, data: Partial<WasteTarget>, storeId?: string): Promise<WasteTarget>;

  // Manager Requests
  createManagerRequest(request: InsertManagerRequest): Promise<ManagerRequest>;
  getManagerRequest(id: number): Promise<ManagerRequest | undefined>;
  getManagerRequestsByUser(username: string, year?: number, month?: number): Promise<ManagerRequest[]>;
  getAllManagerRequests(status?: string): Promise<ManagerRequest[]>;
  updateManagerRequestStatus(id: number, status: string, approvedBy: string, reason?: string): Promise<void>;
  deleteManagerRequest(id: number): Promise<void>;
  getSelectWorkTimeCountForMonth(username: string, year: number, month: number): Promise<number>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  createNotificationsForUsers(usernames: string[], notification: Omit<InsertNotification, 'recipientUsername'>): Promise<void>;
  getNotificationsForUser(username: string, limit?: number): Promise<Notification[]>;
  getUnreadCountForUser(username: string): Promise<number>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(username: string): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncements(limit?: number, includeExpired?: boolean): Promise<Announcement[]>;
  getAnnouncementsFiltered(opts: { storeId?: string | null; allStores?: boolean; isManager: boolean; includeExpired: boolean; limit: number; }): Promise<Announcement[]>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

  // Borrow Tracker - Branches
  getBorrowBranches(): Promise<BorrowBranch[]>;
  addBorrowBranch(name: string, code?: string | null): Promise<{ ok: boolean; message?: string }>;
  deleteBorrowBranch(id: string): Promise<void>;

  // Borrow Tracker - Items
  getBorrowItems(): Promise<BorrowItem[]>;
  addBorrowItem(name: string, code?: string | null, units?: string[] | null, category?: string | null): Promise<{ ok: boolean; message?: string }>;
  updateBorrowItem(id: string, data: { units?: string[] | null; category?: string | null }): Promise<{ ok: boolean; message?: string }>;
  deleteBorrowItem(id: string): Promise<void>;
  deleteAllBorrowItems(): Promise<void>;

  // Borrow Tracker - Transactions
  getBorrowTransactions(limit?: number): Promise<BorrowTransaction[]>;
  addBorrowTransaction(data: { txDate: string; dueDate?: string; txType: string; branch: string; item: string; qty: number; unit: string; borrower: string; lender: string; note: string }): Promise<{ ok: boolean; message?: string }>;
  toggleBorrowTransaction(id: string): Promise<{ ok: boolean; status?: string; message?: string }>;
  deleteBorrowTransaction(id: string): Promise<void>;
  getOverdueBorrowTransactions(): Promise<BorrowTransaction[]>;
  getBorrowDashboardMetrics(): Promise<{ totalTransactions: number; totalBorrowIn: number; totalBorrowOut: number }>;

  // Labor Settings
  getLaborSettings(storeId?: string): Promise<LaborSettings | undefined>;
  saveLaborSettings(data: Partial<InsertLaborSettings>, storeId?: string): Promise<LaborSettings>;
  
  // Daily Labor
  getDailyLabor(date: string, storeId?: string): Promise<DailyLabor | undefined>;
  saveDailyLabor(date: string, data: Partial<InsertDailyLabor>, storeId?: string): Promise<DailyLabor>;

  // Chann Agent Notes (Memory)
  saveChannNote(username: string, title: string, content: string): Promise<ChannNote>;
  getChannNotes(username: string, query?: string): Promise<ChannNote[]>;
  deleteChannNote(id: number): Promise<void>;

  // Agent Requests
  createAgentRequest(data: InsertAgentRequest): Promise<AgentRequest>;
  getAgentRequests(): Promise<AgentRequest[]>;
  updateAgentRequestStatus(id: number, status: string): Promise<AgentRequest>;
  updateAgentRequestResponse(id: number, response: string): Promise<AgentRequest>;

  // Dropdown Options
  getDropdownOptionsByCategory(category: string): Promise<DropdownOption[]>;
  createDropdownOption(data: InsertDropdownOption): Promise<DropdownOption>;
  updateDropdownOption(id: number, data: Partial<InsertDropdownOption>): Promise<DropdownOption>;
  deleteDropdownOption(id: number): Promise<void>;

  // Stores
  getStores(): Promise<Store[]>;
  getStore(id: string): Promise<Store | undefined>;
  createStore(data: InsertStore): Promise<Store>;
  updateStore(id: string, data: Partial<InsertStore>): Promise<Store>;
  toggleStoreActive(id: string): Promise<Store>;

  // Clock Records (Attendance)
  getClockRecords(year: number, month: number, storeId?: string): Promise<ClockRecord[]>;
  getClockRecordsByDate(date: string, storeId?: string): Promise<ClockRecord[]>;
  upsertClockRecord(record: InsertClockRecord): Promise<ClockRecord>;
  updateClockRecord(id: number, data: Partial<InsertClockRecord>): Promise<ClockRecord>;
  deleteClockRecord(id: number): Promise<void>;
  getClockEmployees(storeId?: string): Promise<Array<{ fullName: string; nickName: string | null; position: string | null }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values({
          ...user,
          username: user.username.toLowerCase()
      }).returning();
      return newUser;
    } catch (err) {
      wrapStorageError("createUser", err);

    }
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserStatus(username: string, active: number): Promise<void> {
    try {
      await db.update(users)
        .set({ active })
        .where(eq(users.username, username.toLowerCase()));
    } catch (err) {
      wrapStorageError("updateUserStatus", err);

    }
  }

  async updateUser(username: string, data: Partial<{ fullName: string; fullNameTh: string; nickName: string; phone: string; email: string; active: number; mustChangePassword: number; position: string }>): Promise<void> {
    try {
      await db.update(users)
        .set(data)
        .where(eq(users.username, username.toLowerCase()));
    } catch (err) {
      wrapStorageError("updateUser", err);

    }
  }

  async updateUserRole(username: string, role: string, position?: string): Promise<void> {
    try {
      await db.update(users)
        .set({ role, position: position || null })
        .where(eq(users.username, username.toLowerCase()));
    } catch (err) {
      wrapStorageError("updateUserRole", err);

    }
  }

  async updateUserFeatures(username: string, allowedFeatures: string | null): Promise<void> {
    try {
      await db.update(users)
        .set({ allowedFeatures })
        .where(eq(users.username, username.toLowerCase()));
    } catch (err) {
      wrapStorageError("updateUserFeatures", err);
    }
  }

  async getShift(username: string, date: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(
      and(eq(shifts.username, username.toLowerCase()), eq(shifts.date, date))
    );
    return shift;
  }

  async getShiftsInRange(startDate: string, endDate: string): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(and(gte(shifts.date, startDate), lte(shifts.date, endDate)))
      .orderBy(shifts.date);
  }

  async upsertShift(shift: InsertShift): Promise<Shift> {
    try {
      const existing = await this.getShift(shift.username, shift.date);
      if (existing) {
        const [updated] = await db.update(shifts)
          .set({
            ...shift,
            updatedAt: new Date().toISOString()
          })
          .where(eq(shifts.id, existing.id))
          .returning();
        return updated;
      } else {
        const [inserted] = await db.insert(shifts)
          .values({
              ...shift,
              username: shift.username.toLowerCase(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          })
          .returning();
        return inserted;
      }
    } catch (err) {
      wrapStorageError("upsertShift", err);

    }
  }

  async deleteShift(username: string, date: string): Promise<void> {
    try {
      await db.delete(shifts).where(
        and(eq(shifts.username, username.toLowerCase()), eq(shifts.date, date))
      );
    } catch (err) {
      wrapStorageError("deleteShift", err);

    }
  }

  async getConfig(): Promise<Record<string, string>> {
    const rows = await db.select().from(config);
    const res: Record<string, string> = {};
    rows.forEach(r => res[r.key] = r.value);
    return res;
  }

  async setConfig(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(config).where(eq(config.key, key));
    if (existing) {
      await db.update(config).set({ value, updatedAt: new Date().toISOString() }).where(eq(config.key, key));
    } else {
      await db.insert(config).values({ key, value, updatedAt: new Date().toISOString() });
    }
  }

  async createSession(session: typeof sessions.$inferInsert): Promise<void> {
    try {
      await db.insert(sessions).values(session);
    } catch (err) {
      wrapStorageError("createSession", err);

    }
  }

  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async log(action: string, byUser: string, detail: string): Promise<void> {
    await db.insert(systemlog).values({
      ts: new Date().toISOString(),
      action,
      byUser,
      detail
    });
  }

  // D4: Batch insert multiple log entries in one DB round-trip
  async batchLog(entries: Array<{ action: string; byUser: string; detail: string }>): Promise<void> {
    if (!entries || entries.length === 0) return;
    const ts = new Date().toISOString();
    await db.insert(systemlog).values(entries.map(e => ({ ts, action: e.action, byUser: e.byUser, detail: e.detail })));
  }

  async createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest> {
    try {
      const [created] = await db.insert(swapRequests).values(request).returning();
      return created;
    } catch (err) {
      wrapStorageError("createSwapRequest", err);

    }
  }

  async getSwapRequests(status?: string, storeId: string = 'BK1040'): Promise<SwapRequest[]> {
    if (status) {
      return await db.select().from(swapRequests)
        .where(and(eq(swapRequests.status, status), eq(swapRequests.storeId, storeId)))
        .orderBy(desc(swapRequests.createdAt));
    }
    return await db.select().from(swapRequests)
      .where(eq(swapRequests.storeId, storeId))
      .orderBy(desc(swapRequests.createdAt));
  }

  async getSwapRequestById(id: number, storeId: string = 'BK1040'): Promise<SwapRequest | undefined> {
    const [request] = await db.select().from(swapRequests)
      .where(and(eq(swapRequests.id, id), eq(swapRequests.storeId, storeId)));
    return request;
  }

  async updateSwapRequestStatus(id: number, status: string, approvedBy?: string, note?: string): Promise<void> {
    try {
      await db.update(swapRequests)
        .set({ 
          status, 
          approvedBy: approvedBy || null, 
          note: note || null,
          updatedAt: new Date().toISOString() 
        })
        .where(eq(swapRequests.id, id));
    } catch (err) {
      wrapStorageError("updateSwapRequestStatus", err);

    }
  }

  // Daily Sales Reports
  async createDailySalesReport(report: InsertDailySales): Promise<DailySalesReport> {
    try {
      const [created] = await db.insert(dailySalesReports).values({
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      return created;
    } catch (err) {
      wrapStorageError("createDailySalesReport", err);

    }
  }

  async getDailySalesReport(id: number): Promise<DailySalesReport | undefined> {
    const [report] = await db.select().from(dailySalesReports).where(eq(dailySalesReports.id, id));
    return report;
  }

  async getDailySalesReportByDate(date: string, storeId: string = 'BK1040'): Promise<DailySalesReport | undefined> {
    const [report] = await db.select().from(dailySalesReports).where(and(eq(dailySalesReports.reportDate, date), eq(dailySalesReports.storeId, storeId)));
    return report;
  }

  async getDailySalesReports(date?: string, limit: number = 30, storeId: string = 'BK1040'): Promise<DailySalesReport[]> {
    if (date) {
      return await db.select().from(dailySalesReports)
        .where(and(eq(dailySalesReports.reportDate, date), eq(dailySalesReports.storeId, storeId)))
        .orderBy(desc(dailySalesReports.reportDate))
        .limit(limit);
    }
    return await db.select().from(dailySalesReports)
      .where(eq(dailySalesReports.storeId, storeId))
      .orderBy(desc(dailySalesReports.reportDate))
      .limit(limit);
  }

  async getDailySalesReportsForMonth(year: number, month: number, storeId: string = 'BK1040'): Promise<DailySalesReport[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return await db.select().from(dailySalesReports)
      .where(and(gte(dailySalesReports.reportDate, startDate), lte(dailySalesReports.reportDate, endDate), eq(dailySalesReports.storeId, storeId)))
      .orderBy(dailySalesReports.reportDate);
  }

  async getDailySalesReportsByDateRange(startDate: string, endDate: string, storeId: string = 'BK1040'): Promise<DailySalesReport[]> {
    return await db.select().from(dailySalesReports)
      .where(and(gte(dailySalesReports.reportDate, startDate), lte(dailySalesReports.reportDate, endDate), eq(dailySalesReports.storeId, storeId)))
      .orderBy(dailySalesReports.reportDate);
  }

  async updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport> {
    try {
      const [updated] = await db.update(dailySalesReports)
        .set({ ...report, updatedAt: new Date().toISOString() })
        .where(eq(dailySalesReports.id, id))
        .returning();
      if (!updated) throw new Error("Report not found");
      return updated;
    } catch (err) {
      wrapStorageError("updateDailySalesReport", err);

    }
  }

  // isManualSave=true bypasses the autosave guard so intentional zeros (e.g. store closed) are honoured.
  async upsertDailySalesReportByDate(report: InsertDailySales, storeId: string = 'BK1040', isManualSave: boolean = false): Promise<DailySalesReport> {
    const sId = report.storeId || storeId;
    const existing = await this.getDailySalesReportByDate(report.reportDate, sId);
    if (existing) {
      const cleanNum = (v?: string | null) => parseFloat((v || "0").replace(/,/g, "").trim());
      const existingActual = cleanNum(existing.actualSales);
      const incomingActual = cleanNum(report.actualSales);

      // Guard: if existing record has real sales data but incoming has 0, this is likely an
      // autosave of an empty form — preserve non-zero values to prevent accidental overwrite.
      // Skip guard when isManualSave=true so intentional zero-outs (e.g. closed day) are saved.
      if (!isManualSave && existingActual > 0 && incomingActual === 0) {
        const safeFields = [
          "actualSales", "transactionCount",
          "dineIn", "takeAway", "grabfood", "lineman", "shopee", "bkapp", "robin", "gokoo",
          "wasteRawDaily", "wasteMealDaily", "wasteRawDailyPercent",
          "actualHours", "otHours", "summaryHours",
          "laborCost", "colPercent", "tcmh",
          "vMealCount", "vMealPercent", "upSizeCount", "upSizePercent",
          "addCheeseCount", "addCheesePercent",
          "recommendHours", "rosterCommit",
        ];
        const merged: any = { ...report };
        for (const field of safeFields) {
          const incoming = cleanNum(merged[field]);
          const existingVal = cleanNum((existing as any)[field]);
          if (incoming === 0 && existingVal > 0) {
            merged[field] = (existing as any)[field];
          }
        }
        return await this.updateDailySalesReport(existing.id, merged);
      }

      return await this.updateDailySalesReport(existing.id, report);
    }
    return await this.createDailySalesReport(report);
  }

  async deleteDailySalesReport(id: number): Promise<boolean> {
    try {
      const result = await db.delete(dailySalesReports).where(eq(dailySalesReports.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      wrapStorageError("deleteDailySalesReport", err);

    }
  }

  // MTD Summary - Calculate from saved reports
  async getMtdSummary(year: number, month: number, beforeDate?: string, storeId: string = 'BK1040'): Promise<{
    mtdActual: number;
    mtdTc: number;
    mtdTarget: number;
    reportCount: number;
    wasteMtdTotal: number;
    wasteMealMtd: number;
    otMtd: number;
  }> {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = beforeDate || `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [row] = await db
      .select({
        mtdActual: sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.actualSales}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        mtdTc:     sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.transactionCount}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        mtdTarget: sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.dailyTarget}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        wasteRaw:  sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.wasteRawDaily}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        wasteMeal: sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.wasteMealDaily}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        otMtd:     sql<number>`COALESCE(SUM(CAST(NULLIF(REGEXP_REPLACE(${dailySalesReports.otHours}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0)`,
        reportCount: sql<number>`COUNT(*)`,
      })
      .from(dailySalesReports)
      .where(
        and(
          gte(dailySalesReports.reportDate, startOfMonth),
          lte(dailySalesReports.reportDate, endDate),
          eq(dailySalesReports.storeId, storeId)
        )
      );

    const mtdActual    = Number(row.mtdActual);
    const mtdTc        = Number(row.mtdTc);
    const mtdTarget    = Number(row.mtdTarget);
    const wasteMealMtd = Number(row.wasteMeal);
    const wasteMtdTotal = Number(row.wasteRaw) + wasteMealMtd;
    const otMtd        = Number(row.otMtd);
    const reportCount  = Number(row.reportCount);

    return { mtdActual, mtdTc, mtdTarget, reportCount, wasteMtdTotal, wasteMealMtd, otMtd };
  }

  // Store Settings
  async getStoreSettings(): Promise<StoreSettings | undefined> {
    const [settings] = await db.select().from(storeSettings).limit(1);
    return settings;
  }

  async updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings> {
    const existing = await this.getStoreSettings();
    if (existing) {
      const [updated] = await db.update(storeSettings)
        .set({ ...settings, updatedAt: new Date().toISOString() })
        .where(eq(storeSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(storeSettings).values({
        ...settings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      return created;
    }
  }

  // Daily Targets
  async getDailyTargetsForMonth(year: number, month: number, storeId: string = 'BK1040'): Promise<DailyTarget[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return await db.select().from(dailyTargets)
      .where(and(gte(dailyTargets.targetDate, startDate), lte(dailyTargets.targetDate, endDate), eq(dailyTargets.storeId, storeId)))
      .orderBy(dailyTargets.targetDate);
  }

  async getDailyTarget(date: string, storeId: string = 'BK1040'): Promise<DailyTarget | undefined> {
    const [target] = await db.select().from(dailyTargets).where(and(eq(dailyTargets.targetDate, date), eq(dailyTargets.storeId, storeId)));
    return target;
  }

  async upsertDailyTarget(target: InsertDailyTarget, storeId: string = 'BK1040'): Promise<DailyTarget> {
    const sId = target.storeId || storeId;
    const existing = await this.getDailyTarget(target.targetDate, sId);
    if (existing) {
      const [updated] = await db.update(dailyTargets)
        .set({ ...target, storeId: sId, updatedAt: new Date().toISOString() })
        .where(eq(dailyTargets.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(dailyTargets).values({
        ...target,
        storeId: sId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      return created;
    }
  }

  async bulkUpsertDailyTargets(targets: InsertDailyTarget[], storeId: string = 'BK1040'): Promise<void> {
    for (const target of targets) {
      await this.upsertDailyTarget(target, storeId);
    }
  }

  async getMtdTargetSum(year: number, month: number, upToDate: string, defaultPerDay: number = 0, storeId: string = 'BK1040'): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const targets = await db.select().from(dailyTargets)
      .where(and(gte(dailyTargets.targetDate, startDate), lte(dailyTargets.targetDate, upToDate), eq(dailyTargets.storeId, storeId)));
    // Build date → targetSales map
    const targetMap = new Map<string, number>();
    targets.forEach(t => targetMap.set(t.targetDate, parseFloat(t.targetSales || "0")));
    // Enumerate every date in range; use defaultPerDay for dates with no explicit entry
    let sum = 0;
    const end = new Date(upToDate + "T00:00:00Z");
    for (let d = new Date(startDate + "T00:00:00Z"); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      sum += targetMap.has(dateStr) ? targetMap.get(dateStr)! : defaultPerDay;
    }
    return sum;
  }

  // Waste Targets
  async getWasteTarget(targetMonth: string, storeId: string = 'BK1040'): Promise<WasteTarget | undefined> {
    const [target] = await db.select().from(wasteTargets).where(and(eq(wasteTargets.targetMonth, targetMonth), eq(wasteTargets.storeId, storeId)));
    return target;
  }

  async upsertWasteTarget(targetMonth: string, data: Partial<WasteTarget>, storeId: string = 'BK1040'): Promise<WasteTarget> {
    const existing = await this.getWasteTarget(targetMonth, storeId);
    if (existing) {
      const [updated] = await db.update(wasteTargets)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(wasteTargets.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(wasteTargets).values({
        targetMonth,
        mtdAmount: data.mtdAmount || "0",
        mtdPercent: data.mtdPercent || "0",
        mealAmount: data.mealAmount || "0",
        mealPercent: data.mealPercent || "0",
        rawAmount: data.rawAmount || "0",
        rawPercent: data.rawPercent || "0",
        storeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      return created;
    }
  }

  // Manager Requests
  async createManagerRequest(request: InsertManagerRequest): Promise<ManagerRequest> {
    try {
      const [created] = await db.insert(managerRequests).values(request).returning();
      return created;
    } catch (err) {
      wrapStorageError("createManagerRequest", err);

    }
  }

  async getManagerRequest(id: number): Promise<ManagerRequest | undefined> {
    const [request] = await db.select().from(managerRequests).where(eq(managerRequests.id, id));
    return request;
  }

  async getManagerRequestsByUser(username: string, year?: number, month?: number): Promise<ManagerRequest[]> {
    if (year && month) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      return await db.select().from(managerRequests)
        .where(and(
          eq(managerRequests.requestedBy, username),
          like(managerRequests.requestDate, `${monthStr}%`)
        ))
        .orderBy(desc(managerRequests.createdAt));
    }
    return await db.select().from(managerRequests)
      .where(eq(managerRequests.requestedBy, username))
      .orderBy(desc(managerRequests.createdAt));
  }

  async getAllManagerRequests(status?: string): Promise<ManagerRequest[]> {
    if (status) {
      return await db.select().from(managerRequests)
        .where(eq(managerRequests.status, status))
        .orderBy(desc(managerRequests.createdAt));
    }
    return await db.select().from(managerRequests)
      .orderBy(desc(managerRequests.createdAt));
  }

  async updateManagerRequestStatus(id: number, status: string, approvedBy: string, reason?: string): Promise<void> {
    try {
      await db.update(managerRequests)
        .set({
          status,
          approvedBy,
          approvedAt: new Date().toISOString(),
          rejectionReason: reason || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(managerRequests.id, id));
    } catch (err) {
      wrapStorageError("updateManagerRequestStatus", err);

    }
  }

  async deleteManagerRequest(id: number): Promise<void> {
    try {
      await db.delete(managerRequests).where(eq(managerRequests.id, id));
    } catch (err) {
      wrapStorageError("deleteManagerRequest", err);

    }
  }

  async getSelectWorkTimeCountForMonth(username: string, year: number, month: number): Promise<number> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const requests = await db.select().from(managerRequests)
      .where(and(
        eq(managerRequests.requestedBy, username),
        eq(managerRequests.requestType, "select_work_time"),
        like(managerRequests.requestDate, `${monthStr}%`)
      ));
    return requests.length;
  }

  // Developer Tools methods
  async getSystemLogs(limit: number = 100, action?: string): Promise<SystemLog[]> {
    if (action) {
      return await db.select().from(systemlog)
        .where(like(systemlog.action, `%${action}%`))
        .orderBy(desc(systemlog.ts))
        .limit(limit);
    }
    return await db.select().from(systemlog)
      .orderBy(desc(systemlog.ts))
      .limit(limit);
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async clearSessions(username?: string): Promise<number> {
    if (username) {
      const result = await db.delete(sessions).where(eq(sessions.username, username)).returning();
      return result.length;
    }
    const result = await db.delete(sessions).returning();
    return result.length;
  }

  async updateUserPassword(username: string, passhash: string): Promise<void> {
    await db.update(users)
      .set({ passhash })
      .where(eq(users.username, username.toLowerCase()));
  }

  async getTableList(): Promise<{ name: string; count: number }[]> {
    const tableNames = [
      "users", "shifts", "config", "systemlog", "sessions",
      "swap_requests", "daily_sales_reports", "store_settings",
      "daily_targets", "manager_requests",
      "borrow_branches", "borrow_items", "borrow_transactions",
      "labor_settings", "daily_labor",
      "chann_notes", "agent_requests",
      "announcements", "notifications"
    ];
    const result: { name: string; count: number }[] = [];
    for (const name of tableNames) {
      try {
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(name)}`);
        const count = Number((countResult.rows[0] as any)?.count || 0);
        result.push({ name, count });
      } catch {
        result.push({ name, count: 0 });
      }
    }
    return result;
  }

  async getTableRows(tableName: string, limit: number = 100): Promise<any[]> {
    const allowedTables: Record<string, any> = {
      users, shifts, config, systemlog, sessions, 
      swap_requests: swapRequests, 
      daily_sales_reports: dailySalesReports, 
      store_settings: storeSettings, 
      daily_targets: dailyTargets,
      manager_requests: managerRequests,
      borrow_branches: borrowBranches,
      borrow_items: borrowItems,
      borrow_transactions: borrowTransactions,
      labor_settings: laborSettings,
      daily_labor: dailyLabor,
      agent_requests: agentRequests,
      chann_notes: channNotes,
      announcements,
      notifications
    };
    const table = allowedTables[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);
    return await db.select().from(table).limit(limit);
  }

  async clearTable(tableName: string): Promise<number> {
    const allowedTables: Record<string, any> = {
      shifts, systemlog, sessions, 
      swap_requests: swapRequests, 
      daily_sales_reports: dailySalesReports,
      manager_requests: managerRequests
    };
    const table = allowedTables[tableName];
    if (!table) throw new Error(`Cannot clear table: ${tableName}`);
    const result = await db.delete(table).returning() as any[];
    return result.length;
  }

  async executeReadQuery(query: string): Promise<any[]> {
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [created] = await db.insert(notifications).values(notification).returning();
      return created;
    } catch (err) {
      wrapStorageError("createNotification", err);

    }
  }

  async createNotificationsForUsers(usernames: string[], notification: Omit<InsertNotification, 'recipientUsername'>): Promise<void> {
    try {
      for (const username of usernames) {
        await db.insert(notifications).values({
          ...notification,
          recipientUsername: username
        });
      }
    } catch (err) {
      wrapStorageError("createNotificationsForUsers", err);

    }
  }

  async getNotificationsForUser(username: string, limit: number = 50): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.recipientUsername, username))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadCountForUser(username: string): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(
        eq(notifications.recipientUsername, username),
        eq(notifications.isRead, 0)
      ));
    return result.length;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(username: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.recipientUsername, username));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Announcements
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async getAnnouncements(limit: number = 20, includeExpired: boolean = false): Promise<Announcement[]> {
    const now = new Date().toISOString();
    if (includeExpired) {
      return await db.select().from(announcements)
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
        .limit(limit);
    }
    const results = await db.select().from(announcements)
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(limit);
    return results.filter(a => !a.expiresAt || a.expiresAt > now);
  }

  async getAnnouncementsFiltered(opts: { storeId?: string | null; allStores?: boolean; isManager: boolean; includeExpired: boolean; limit: number; }): Promise<Announcement[]> {
    const { storeId, allStores, isManager, includeExpired, limit } = opts;
    const now = new Date().toISOString();

    // Build WHERE conditions in SQL
    const conditions = [];
    if (!allStores && storeId) {
      conditions.push(eq(announcements.storeId, storeId));
    }
    if (!isManager) {
      // Staff only see "all" or "staff" targeted announcements
      conditions.push(sql`${announcements.targetAudience} IN ('all', 'staff')`);
    }
    if (!includeExpired) {
      // Exclude expired: expiresAt IS NULL or expiresAt > now
      conditions.push(sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${now})`);
    }

    if (conditions.length === 0) {
      return await db.select().from(announcements)
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
        .limit(limit);
    }
    return await db.select().from(announcements)
      .where(and(...conditions))
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(limit);
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [result] = await db.select().from(announcements).where(eq(announcements.id, id));
    return result;
  }

  async updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db.update(announcements)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async acknowledgeAnnouncement(announcementId: number, username: string): Promise<void> {
    const now = new Date().toISOString();
    await db.insert(announcementAcknowledgments)
      .values({ announcementId, username, acknowledgedAt: now })
      .onConflictDoNothing();
  }

  async getAcknowledgments(announcementId: number): Promise<AnnouncementAcknowledgment[]> {
    return await db.select().from(announcementAcknowledgments)
      .where(eq(announcementAcknowledgments.announcementId, announcementId))
      .orderBy(announcementAcknowledgments.acknowledgedAt);
  }

  async getUserAcknowledgedIds(username: string): Promise<number[]> {
    const rows = await db.select({ announcementId: announcementAcknowledgments.announcementId })
      .from(announcementAcknowledgments)
      .where(eq(announcementAcknowledgments.username, username));
    return rows.map(r => r.announcementId);
  }

  async getUsersByStoreAndAudience(storeId: string, targetAudience: string): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.active, 1));
    return allUsers.filter(u => {
      if (u.storeId !== storeId) return false;
      if (targetAudience === "all") return true;
      if (targetAudience === "staff") return u.role === "staff";
      if (targetAudience === "managers") return u.role === "manager" || u.role === "admin" || u.role === "area";
      return true;
    });
  }

  // Borrow Tracker - Branches
  async getBorrowBranches(): Promise<BorrowBranch[]> {
    return await db.select().from(borrowBranches);
  }

  async addBorrowBranch(name: string, code?: string | null): Promise<{ ok: boolean; message?: string }> {
    if (!name.trim()) return { ok: false, message: "Name is required" };
    const id = `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(borrowBranches).values({ id, name: name.trim(), code: code?.trim() || null, isActive: 1 });
    return { ok: true };
  }

  async deleteBorrowBranch(id: string): Promise<void> {
    await db.delete(borrowBranches).where(eq(borrowBranches.id, id));
  }

  // Borrow Tracker - Items
  async getBorrowItems(): Promise<BorrowItem[]> {
    return await db.select().from(borrowItems);
  }

  async addBorrowItem(name: string, code?: string | null, units?: string[] | null, category?: string | null): Promise<{ ok: boolean; message?: string }> {
    if (!name.trim()) return { ok: false, message: "Name is required" };
    const id = `it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanUnits = units?.map(u => u.trim()).filter(u => u.length > 0) || null;
    await db.insert(borrowItems).values({ id, name: name.trim(), code: code?.trim() || null, units: cleanUnits, category: category?.trim() || null, isActive: 1 });
    return { ok: true };
  }

  async updateBorrowItem(id: string, data: { units?: string[] | null; category?: string | null }): Promise<{ ok: boolean; message?: string }> {
    const [existing] = await db.select().from(borrowItems).where(eq(borrowItems.id, id));
    if (!existing) return { ok: false, message: "Item not found" };
    const cleanUnits = data.units?.map(u => u.trim()).filter(u => u.length > 0) || null;
    const updateData: { units?: string[] | null; category?: string | null } = { units: cleanUnits };
    if (data.category !== undefined) {
      updateData.category = data.category?.trim() || null;
    }
    await db.update(borrowItems).set(updateData).where(eq(borrowItems.id, id));
    return { ok: true };
  }

  async deleteBorrowItem(id: string): Promise<void> {
    await db.delete(borrowItems).where(eq(borrowItems.id, id));
  }

  async deleteAllBorrowItems(): Promise<void> {
    await db.delete(borrowItems);
  }

  async getBorrowTransactions(limit: number = 100): Promise<BorrowTransaction[]> {
    return await db.select().from(borrowTransactions)
      .orderBy(desc(borrowTransactions.createdAt))
      .limit(limit);
  }

  async addBorrowTransaction(data: { txDate: string; dueDate?: string; txType: string; branch: string; item: string; qty: number; unit: string; borrower: string; lender: string; note: string }): Promise<{ ok: boolean; message?: string }> {
    try {
      const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await db.insert(borrowTransactions).values({
        id: id,
        txDate: data.txDate,
        dueDate: data.dueDate || null,
        txType: data.txType,
        branch: data.branch,
        item: data.item,
        qty: data.qty,
        unit: data.unit,
        borrower: data.borrower,
        lender: data.lender,
        note: data.note,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      return { ok: true };
    } catch (err) {
      wrapStorageError("addBorrowTransaction", err);

    }
  }

  async toggleBorrowTransaction(id: string): Promise<{ ok: boolean; status?: string; message?: string }> {
    const [tx] = await db.select().from(borrowTransactions).where(eq(borrowTransactions.id, id));
    if (!tx) return { ok: false, message: "Transaction not found" };
    const newStatus = tx.status === "pending" ? "done" : "pending";
    await db.update(borrowTransactions).set({ status: newStatus }).where(eq(borrowTransactions.id, id));
    return { ok: true, status: newStatus };
  }

  async deleteBorrowTransaction(id: string): Promise<void> {
    await db.delete(borrowTransactions).where(eq(borrowTransactions.id, id));
  }

  async getOverdueBorrowTransactions(): Promise<BorrowTransaction[]> {
    const today = new Date().toISOString().split("T")[0];
    const all = await db.select().from(borrowTransactions)
      .where(and(eq(borrowTransactions.status, "pending")));
    return all.filter(t => t.dueDate && t.dueDate < today);
  }

  async getBorrowDashboardMetrics(): Promise<{ totalTransactions: number; totalBorrowIn: number; totalBorrowOut: number }> {
    const all = await db.select().from(borrowTransactions);
    const borrowIn = all.filter(t => t.txType === "borrow_in").length;
    const borrowOut = all.filter(t => t.txType === "borrow_out").length;
    return { totalTransactions: all.length, totalBorrowIn: borrowIn, totalBorrowOut: borrowOut };
  }

  // Labor Settings
  async getLaborSettings(storeId: string = 'BK1040'): Promise<LaborSettings | undefined> {
    const [settings] = await db.select().from(laborSettings).where(eq(laborSettings.storeId, storeId)).limit(1);
    return settings;
  }

  async saveLaborSettings(data: Partial<InsertLaborSettings>, storeId: string = 'BK1040'): Promise<LaborSettings> {
    const existing = await this.getLaborSettings(storeId);
    if (existing) {
      const [updated] = await db.update(laborSettings)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(laborSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(laborSettings)
        .values({ ...data, storeId, updatedAt: new Date().toISOString() })
        .returning();
      return inserted;
    }
  }

  // Daily Labor
  async getDailyLabor(date: string, storeId: string = 'BK1040'): Promise<DailyLabor | undefined> {
    const [labor] = await db.select().from(dailyLabor).where(and(eq(dailyLabor.date, date), eq(dailyLabor.storeId, storeId)));
    return labor;
  }

  async saveDailyLabor(date: string, data: Partial<InsertDailyLabor>, storeId: string = 'BK1040'): Promise<DailyLabor> {
    const existing = await this.getDailyLabor(date, storeId);
    if (existing) {
      const [updated] = await db.update(dailyLabor)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(dailyLabor.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(dailyLabor)
        .values({ date, storeId, ...data, updatedAt: new Date().toISOString() })
        .returning();
      return inserted;
    }
  }

  // Weekly Sales Reports
  async getWeeklySalesReport(weekStartDate: string, storeId: string = 'BK1040'): Promise<WeeklySalesReport | undefined> {
    const [report] = await db.select().from(weeklySalesReports)
      .where(and(eq(weeklySalesReports.weekStartDate, weekStartDate), eq(weeklySalesReports.storeId, storeId)));
    return report;
  }

  async upsertWeeklySalesReport(report: InsertWeeklySales, storeId: string = 'BK1040'): Promise<WeeklySalesReport> {
    const sId = report.storeId || storeId;
    const existing = await this.getWeeklySalesReport(report.weekStartDate, sId);
    if (existing) {
      const [updated] = await db.update(weeklySalesReports)
        .set({ ...report, updatedAt: new Date().toISOString() })
        .where(eq(weeklySalesReports.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(weeklySalesReports)
      .values({ ...report, storeId: sId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .returning();
    return created;
  }

  async getWeeklySalesReports(limit?: number, storeId: string = 'BK1040'): Promise<WeeklySalesReport[]> {
    const q = db.select().from(weeklySalesReports).where(eq(weeklySalesReports.storeId, storeId)).orderBy(desc(weeklySalesReports.weekStartDate));
    if (limit) return await q.limit(limit);
    return await q;
  }

  async saveChannNote(username: string, title: string, content: string): Promise<ChannNote> {
    const now = new Date();
    const existing = await db.select().from(channNotes)
      .where(and(eq(channNotes.username, username), eq(channNotes.title, title)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(channNotes)
        .set({ content, updatedAt: now })
        .where(eq(channNotes.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(channNotes)
      .values({ username, title, content, createdAt: now, updatedAt: now })
      .returning();
    return created;
  }

  async getChannNotes(username: string, query?: string): Promise<ChannNote[]> {
    if (query) {
      return await db.select().from(channNotes)
        .where(and(
          eq(channNotes.username, username),
          sql`(${channNotes.title} ILIKE ${'%' + query + '%'} OR ${channNotes.content} ILIKE ${'%' + query + '%'})`
        ))
        .orderBy(desc(channNotes.updatedAt));
    }
    return await db.select().from(channNotes)
      .where(eq(channNotes.username, username))
      .orderBy(desc(channNotes.updatedAt));
  }

  async deleteChannNote(id: number): Promise<void> {
    await db.delete(channNotes).where(eq(channNotes.id, id));
  }

  async createAgentRequest(data: InsertAgentRequest): Promise<AgentRequest> {
    try {
      const now = new Date().toISOString();
      const [created] = await db.insert(agentRequests)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
      return created;
    } catch (err) {
      wrapStorageError("createAgentRequest", err);

    }
  }

  async getAgentRequests(): Promise<AgentRequest[]> {
    return await db.select().from(agentRequests)
      .orderBy(desc(agentRequests.createdAt));
  }

  async updateAgentRequestStatus(id: number, status: string): Promise<AgentRequest> {
    try {
      const [updated] = await db.update(agentRequests)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(agentRequests.id, id))
        .returning();
      return updated;
    } catch (err) {
      wrapStorageError("updateAgentRequestStatus", err);

    }
  }

  async updateAgentRequestResponse(id: number, response: string): Promise<AgentRequest> {
    try {
      const [updated] = await db.update(agentRequests)
        .set({ response, updatedAt: new Date().toISOString() })
        .where(eq(agentRequests.id, id))
        .returning();
      return updated;
    } catch (err) {
      wrapStorageError("updateAgentRequestResponse", err);

    }
  }

  async getDropdownOptionsByCategory(category: string): Promise<DropdownOption[]> {
    return await db.select().from(dropdownOptions)
      .where(eq(dropdownOptions.category, category))
      .orderBy(dropdownOptions.sortOrder);
  }

  async createDropdownOption(data: InsertDropdownOption): Promise<DropdownOption> {
    try {
      const [created] = await db.insert(dropdownOptions).values(data).returning();
      return created;
    } catch (err) {
      wrapStorageError("createDropdownOption", err);
    }
  }

  async updateDropdownOption(id: number, data: Partial<InsertDropdownOption>): Promise<DropdownOption> {
    try {
      const [updated] = await db.update(dropdownOptions)
        .set(data)
        .where(eq(dropdownOptions.id, id))
        .returning();
      return updated;
    } catch (err) {
      wrapStorageError("updateDropdownOption", err);
    }
  }

  async deleteDropdownOption(id: number): Promise<void> {
    await db.delete(dropdownOptions).where(eq(dropdownOptions.id, id));
  }

  async seedDropdownDefaults(): Promise<void> {
    const existingShift = await this.getDropdownOptionsByCategory("manager_shift");
    const existingStaffShift = await this.getDropdownOptionsByCategory("staff_shift");

    if (existingShift.length === 0) {
      const shiftDefaults = [
        { value: "07:00-16:00", label: "07:00-16:00" },
        { value: "09:00-18:00", label: "09:00-18:00" },
        { value: "10:00-19:00", label: "10:00-19:00" },
        { value: "11:00-20:00", label: "11:00-20:00" },
        { value: "12:00-21:00", label: "12:00-21:00" },
        { value: "13:00-22:00", label: "13:00-22:00" },
        { value: "14:00-23:00", label: "14:00-23:00" },
        { value: "15:00-00:00", label: "15:00-00:00" },
        { value: "16:00-01:00", label: "16:00-01:00" },
        { value: "19:00-04:00", label: "19:00-04:00" },
        { value: "22:00-07:00", label: "22:00-07:00" },
        { value: "OFF", label: "OFF" },
        { value: "SICK", label: "SICK" },
        { value: "COM", label: "COM" },
        { value: "Vacation", label: "Vacation" },
        { value: "QSNCC", label: "QSNCC" },
        { value: "Training", label: "Training" },
      ];
      for (let i = 0; i < shiftDefaults.length; i++) {
        await this.createDropdownOption({
          category: "manager_shift",
          value: shiftDefaults[i].value,
          label: shiftDefaults[i].label,
          sortOrder: i,
          isActive: true,
        });
      }
    }

    if (existingStaffShift.length === 0) {
      const staffShiftDefaults = [
        { value: "07:00-16:00", label: "07:00-16:00" },
        { value: "09:00-18:00", label: "09:00-18:00" },
        { value: "10:00-19:00", label: "10:00-19:00" },
        { value: "11:00-20:00", label: "11:00-20:00" },
        { value: "12:00-21:00", label: "12:00-21:00" },
        { value: "13:00-22:00", label: "13:00-22:00" },
        { value: "14:00-23:00", label: "14:00-23:00" },
        { value: "15:00-00:00", label: "15:00-00:00" },
        { value: "18:00-00:00", label: "18:00-00:00" },
        { value: "19:00-04:00", label: "19:00-04:00" },
        { value: "21:00-06:00", label: "21:00-06:00" },
        { value: "22:00-07:00", label: "22:00-07:00" },
        { value: "CUSTOM", label: "กำหนดเอง" },
      ];
      for (let i = 0; i < staffShiftDefaults.length; i++) {
        await this.createDropdownOption({
          category: "staff_shift",
          value: staffShiftDefaults[i].value,
          label: staffShiftDefaults[i].label,
          sortOrder: i,
          isActive: true,
        });
      }
    }
  }

  // Stores
  async getStores(): Promise<Store[]> {
    return db.select().from(stores).orderBy(stores.name);
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(data: InsertStore): Promise<Store> {
    const now = new Date().toISOString();
    const [store] = await db.insert(stores).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return store;
  }

  async updateStore(id: string, data: Partial<InsertStore>): Promise<Store> {
    const now = new Date().toISOString();
    const [store] = await db.update(stores).set({ ...data, updatedAt: now }).where(eq(stores.id, id)).returning();
    if (!store) throw new Error("Store not found");
    return store;
  }

  async toggleStoreActive(id: string): Promise<Store> {
    const existing = await this.getStore(id);
    if (!existing) throw new Error("Store not found");
    const [store] = await db.update(stores)
      .set({ isActive: existing.isActive === 1 ? 0 : 1, updatedAt: new Date().toISOString() })
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  // ─────────────────────────────────────────────
  // Clock Records (Attendance)
  // ─────────────────────────────────────────────

  async getClockRecords(year: number, month: number, storeId?: string): Promise<ClockRecord[]> {
    const monthStr = String(month).padStart(2, "0");
    const prefix = `${year}-${monthStr}`;
    const conds = [like(clockRecords.date, `${prefix}%`)];
    if (storeId) conds.push(eq(clockRecords.storeId, storeId));
    return db.select().from(clockRecords).where(and(...conds)).orderBy(clockRecords.date, clockRecords.employeeFullName);
  }

  async getClockRecordsByDate(date: string, storeId?: string): Promise<ClockRecord[]> {
    const conds = [eq(clockRecords.date, date)];
    if (storeId) conds.push(eq(clockRecords.storeId, storeId));
    return db.select().from(clockRecords).where(and(...conds));
  }

  async upsertClockRecord(record: InsertClockRecord): Promise<ClockRecord> {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(clockRecords)
      .values({ ...record, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [clockRecords.date, clockRecords.storeId, clockRecords.employeeFullName],
        set: {
          employeeNickName: record.employeeNickName,
          position: record.position,
          rosterTime: record.rosterTime,
          clockInTime: record.clockInTime,
          clockOutTime: record.clockOutTime,
          notes: record.notes,
          importSource: record.importSource,
          updatedAt: now,
        }
      })
      .returning();
    return row;
  }

  async updateClockRecord(id: number, data: Partial<InsertClockRecord>): Promise<ClockRecord> {
    const [row] = await db
      .update(clockRecords)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(clockRecords.id, id))
      .returning();
    if (!row) throw new Error(`Clock record ${id} not found`);
    return row;
  }

  async deleteClockRecord(id: number): Promise<void> {
    await db.delete(clockRecords).where(eq(clockRecords.id, id));
  }

  async getClockEmployees(storeId?: string): Promise<Array<{ fullName: string; nickName: string | null; position: string | null }>> {
    const conds = storeId ? [eq(clockRecords.storeId, storeId)] : [];
    const rows = await db
      .selectDistinct({
        fullName: clockRecords.employeeFullName,
        nickName: clockRecords.employeeNickName,
        position: clockRecords.position,
      })
      .from(clockRecords)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(clockRecords.employeeFullName);
    return rows;
  }
}

export const storage = new DatabaseStorage();
