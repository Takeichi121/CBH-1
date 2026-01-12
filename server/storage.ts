import { db } from "./db";
import { users, shifts, config, systemlog, sessions, swapRequests, dailySalesReports, storeSettings, dailyTargets, wasteTargets, managerRequests, notifications, announcements, borrowBranches, borrowItems, borrowTransactions, laborSettings, dailyLabor, type User, type Shift, type Config, type SystemLog, type Session, type InsertUser, type InsertShift, type SwapRequest, type InsertSwapRequest, type DailySalesReport, type InsertDailySales, type StoreSettings, type InsertStoreSettings, type DailyTarget, type InsertDailyTarget, type WasteTarget, type ManagerRequest, type InsertManagerRequest, type Notification, type InsertNotification, type Announcement, type InsertAnnouncement, type BorrowBranch, type InsertBorrowBranch, type BorrowItem, type InsertBorrowItem, type BorrowTransaction, type InsertBorrowTransaction, type LaborSettings, type InsertLaborSettings, type DailyLabor, type InsertDailyLabor } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, like } from "drizzle-orm";

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
  updateUser(username: string, data: Partial<{ fullName: string; fullNameTh: string; nickName: string; phone: string; email: string; active: number }>): Promise<void>;
  updateUserRole(username: string, role: string, position?: string): Promise<void>;

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

  // Swap Requests
  createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest>;
  getSwapRequests(status?: string): Promise<SwapRequest[]>;
  getSwapRequestById(id: number): Promise<SwapRequest | undefined>;
  updateSwapRequestStatus(id: number, status: string, approvedBy?: string, note?: string): Promise<void>;

  // Daily Sales Reports
  createDailySalesReport(report: InsertDailySales): Promise<DailySalesReport>;
  getDailySalesReport(id: number): Promise<DailySalesReport | undefined>;
  getDailySalesReportByDate(date: string): Promise<DailySalesReport | undefined>;
  getDailySalesReports(date?: string, limit?: number): Promise<DailySalesReport[]>;
  getDailySalesReportsForMonth(year: number, month: number): Promise<DailySalesReport[]>;
  updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport>;
  upsertDailySalesReportByDate(report: InsertDailySales): Promise<DailySalesReport>;
  deleteDailySalesReport(id: number): Promise<boolean>;
  getMtdSummary(year: number, month: number, beforeDate?: string): Promise<{
    mtdActual: number;
    mtdTc: number;
    mtdTarget: number;
    reportCount: number;
    wasteMtdTotal: number;
    wasteMealMtd: number;
  }>;

  // Store Settings
  getStoreSettings(): Promise<StoreSettings | undefined>;
  updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings>;

  // Daily Targets
  getDailyTargetsForMonth(year: number, month: number): Promise<DailyTarget[]>;
  getDailyTarget(date: string): Promise<DailyTarget | undefined>;
  upsertDailyTarget(target: InsertDailyTarget): Promise<DailyTarget>;
  bulkUpsertDailyTargets(targets: InsertDailyTarget[]): Promise<void>;
  getMtdTargetSum(year: number, month: number, upToDate: string): Promise<number>;

  // Waste Targets
  getWasteTarget(targetMonth: string): Promise<WasteTarget | undefined>;
  upsertWasteTarget(targetMonth: string, data: Partial<WasteTarget>): Promise<WasteTarget>;

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

  // Borrow Tracker - Transactions
  getBorrowTransactions(limit?: number): Promise<BorrowTransaction[]>;
  addBorrowTransaction(data: { txDate: string; dueDate?: string; txType: string; branch: string; item: string; qty: number; unit: string; borrower: string; lender: string; note: string }): Promise<{ ok: boolean; message?: string }>;
  toggleBorrowTransaction(id: string): Promise<{ ok: boolean; status?: string; message?: string }>;
  deleteBorrowTransaction(id: string): Promise<void>;
  getOverdueBorrowTransactions(): Promise<BorrowTransaction[]>;
  getBorrowDashboardMetrics(): Promise<{ totalTransactions: number; totalBorrowIn: number; totalBorrowOut: number }>;

  // Labor Settings
  getLaborSettings(): Promise<LaborSettings | undefined>;
  saveLaborSettings(data: Partial<InsertLaborSettings>): Promise<LaborSettings>;
  
  // Daily Labor
  getDailyLabor(date: string): Promise<DailyLabor | undefined>;
  saveDailyLabor(date: string, data: Partial<InsertDailyLabor>): Promise<DailyLabor>;
}

export class DatabaseStorage implements IStorage {
  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
        ...user,
        username: user.username.toLowerCase()
    }).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserStatus(username: string, active: number): Promise<void> {
    await db.update(users)
      .set({ active })
      .where(eq(users.username, username.toLowerCase()));
  }

  async updateUser(username: string, data: Partial<{ fullName: string; fullNameTh: string; nickName: string; phone: string; email: string; active: number }>): Promise<void> {
    await db.update(users)
      .set(data)
      .where(eq(users.username, username.toLowerCase()));
  }

  async updateUserRole(username: string, role: string, position?: string): Promise<void> {
    await db.update(users)
      .set({ role, position: position || null })
      .where(eq(users.username, username.toLowerCase()));
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
    // Try to find existing
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
  }

  async deleteShift(username: string, date: string): Promise<void> {
    await db.delete(shifts).where(
      and(eq(shifts.username, username.toLowerCase()), eq(shifts.date, date))
    );
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
    await db.insert(sessions).values(session);
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

  async createSwapRequest(request: InsertSwapRequest): Promise<SwapRequest> {
    const [created] = await db.insert(swapRequests).values(request).returning();
    return created;
  }

  async getSwapRequests(status?: string): Promise<SwapRequest[]> {
    if (status) {
      return await db.select().from(swapRequests)
        .where(eq(swapRequests.status, status))
        .orderBy(desc(swapRequests.createdAt));
    }
    return await db.select().from(swapRequests).orderBy(desc(swapRequests.createdAt));
  }

  async getSwapRequestById(id: number): Promise<SwapRequest | undefined> {
    const [request] = await db.select().from(swapRequests).where(eq(swapRequests.id, id));
    return request;
  }

  async updateSwapRequestStatus(id: number, status: string, approvedBy?: string, note?: string): Promise<void> {
    await db.update(swapRequests)
      .set({ 
        status, 
        approvedBy: approvedBy || null, 
        note: note || null,
        updatedAt: new Date().toISOString() 
      })
      .where(eq(swapRequests.id, id));
  }

  // Daily Sales Reports
  async createDailySalesReport(report: InsertDailySales): Promise<DailySalesReport> {
    const [created] = await db.insert(dailySalesReports).values({
      ...report,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    return created;
  }

  async getDailySalesReport(id: number): Promise<DailySalesReport | undefined> {
    const [report] = await db.select().from(dailySalesReports).where(eq(dailySalesReports.id, id));
    return report;
  }

  async getDailySalesReportByDate(date: string): Promise<DailySalesReport | undefined> {
    const [report] = await db.select().from(dailySalesReports).where(eq(dailySalesReports.reportDate, date));
    return report;
  }

  async getDailySalesReports(date?: string, limit: number = 30): Promise<DailySalesReport[]> {
    if (date) {
      return await db.select().from(dailySalesReports)
        .where(eq(dailySalesReports.reportDate, date))
        .orderBy(desc(dailySalesReports.reportDate))
        .limit(limit);
    }
    return await db.select().from(dailySalesReports)
      .orderBy(desc(dailySalesReports.reportDate))
      .limit(limit);
  }

  async getDailySalesReportsForMonth(year: number, month: number): Promise<DailySalesReport[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    return await db.select().from(dailySalesReports)
      .where(and(gte(dailySalesReports.reportDate, startDate), lte(dailySalesReports.reportDate, endDate)))
      .orderBy(dailySalesReports.reportDate);
  }

  async updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport> {
    const [updated] = await db.update(dailySalesReports)
      .set({ ...report, updatedAt: new Date().toISOString() })
      .where(eq(dailySalesReports.id, id))
      .returning();
    if (!updated) throw new Error("Report not found");
    return updated;
  }

  async upsertDailySalesReportByDate(report: InsertDailySales): Promise<DailySalesReport> {
    const existing = await this.getDailySalesReportByDate(report.reportDate);
    if (existing) {
      return await this.updateDailySalesReport(existing.id, report);
    }
    return await this.createDailySalesReport(report);
  }

  async deleteDailySalesReport(id: number): Promise<boolean> {
    const result = await db.delete(dailySalesReports).where(eq(dailySalesReports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // MTD Summary - Calculate from saved reports
  async getMtdSummary(year: number, month: number, beforeDate?: string): Promise<{
    mtdActual: number;
    mtdTc: number;
    mtdTarget: number;
    reportCount: number;
    wasteMtdTotal: number;
    wasteMealMtd: number;
  }> {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = beforeDate || `${year}-${String(month).padStart(2, '0')}-31`;
    
    const reports = await db.select().from(dailySalesReports)
      .where(
        and(
          gte(dailySalesReports.reportDate, startOfMonth),
          lte(dailySalesReports.reportDate, endDate)
        )
      );
    
    let mtdActual = 0;
    let mtdTc = 0;
    let mtdTarget = 0;
    let wasteMtdTotal = 0;
    let wasteMealMtd = 0;
    
    for (const report of reports) {
      mtdActual += parseFloat(report.actualSales || "0");
      mtdTc += parseFloat(report.transactionCount || "0");
      mtdTarget += parseFloat(report.dailyTarget || "0");
      const rawDaily = parseFloat(report.wasteRawDaily || "0");
      const mealDaily = parseFloat(report.wasteMealDaily || "0");
      wasteMtdTotal += rawDaily + mealDaily;
      wasteMealMtd += mealDaily;
    }
    
    return { mtdActual, mtdTc, mtdTarget, reportCount: reports.length, wasteMtdTotal, wasteMealMtd };
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
  async getDailyTargetsForMonth(year: number, month: number): Promise<DailyTarget[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    return await db.select().from(dailyTargets)
      .where(and(gte(dailyTargets.targetDate, startDate), lte(dailyTargets.targetDate, endDate)))
      .orderBy(dailyTargets.targetDate);
  }

  async getDailyTarget(date: string): Promise<DailyTarget | undefined> {
    const [target] = await db.select().from(dailyTargets).where(eq(dailyTargets.targetDate, date));
    return target;
  }

  async upsertDailyTarget(target: InsertDailyTarget): Promise<DailyTarget> {
    const existing = await this.getDailyTarget(target.targetDate);
    if (existing) {
      const [updated] = await db.update(dailyTargets)
        .set({ ...target, updatedAt: new Date().toISOString() })
        .where(eq(dailyTargets.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(dailyTargets).values({
        ...target,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      return created;
    }
  }

  async bulkUpsertDailyTargets(targets: InsertDailyTarget[]): Promise<void> {
    for (const target of targets) {
      await this.upsertDailyTarget(target);
    }
  }

  async getMtdTargetSum(year: number, month: number, upToDate: string): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const targets = await db.select().from(dailyTargets)
      .where(and(gte(dailyTargets.targetDate, startDate), lte(dailyTargets.targetDate, upToDate)));
    return targets.reduce((sum, t) => sum + parseFloat(t.targetSales || "0"), 0);
  }

  // Waste Targets
  async getWasteTarget(targetMonth: string): Promise<WasteTarget | undefined> {
    const [target] = await db.select().from(wasteTargets).where(eq(wasteTargets.targetMonth, targetMonth));
    return target;
  }

  async upsertWasteTarget(targetMonth: string, data: Partial<WasteTarget>): Promise<WasteTarget> {
    const existing = await this.getWasteTarget(targetMonth);
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      return created;
    }
  }

  // Manager Requests
  async createManagerRequest(request: InsertManagerRequest): Promise<ManagerRequest> {
    const [created] = await db.insert(managerRequests).values(request).returning();
    return created;
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
    await db.update(managerRequests)
      .set({
        status,
        approvedBy,
        approvedAt: new Date().toISOString(),
        rejectionReason: reason || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(managerRequests.id, id));
  }

  async deleteManagerRequest(id: number): Promise<void> {
    await db.delete(managerRequests).where(eq(managerRequests.id, id));
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
    const tableNames = ["users", "shifts", "config", "systemlog", "sessions", "swap_requests", "daily_sales_reports", "store_settings", "daily_targets", "manager_requests"];
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
      manager_requests: managerRequests
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
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async createNotificationsForUsers(usernames: string[], notification: Omit<InsertNotification, 'recipientUsername'>): Promise<void> {
    for (const username of usernames) {
      await db.insert(notifications).values({
        ...notification,
        recipientUsername: username
      });
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

  // Borrow Tracker - Transactions
  async getBorrowTransactions(limit?: number): Promise<BorrowTransaction[]> {
    const query = db.select().from(borrowTransactions).orderBy(desc(borrowTransactions.createdAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async addBorrowTransaction(data: { txDate: string; dueDate?: string; txType: string; branch: string; item: string; qty: number; unit: string; borrower: string; lender: string; note: string }): Promise<{ ok: boolean; message?: string }> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(borrowTransactions).values({
      id,
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
  async getLaborSettings(): Promise<LaborSettings | undefined> {
    const [settings] = await db.select().from(laborSettings).limit(1);
    return settings;
  }

  async saveLaborSettings(data: Partial<InsertLaborSettings>): Promise<LaborSettings> {
    const existing = await this.getLaborSettings();
    if (existing) {
      const [updated] = await db.update(laborSettings)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(laborSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(laborSettings)
        .values({ ...data, updatedAt: new Date().toISOString() })
        .returning();
      return inserted;
    }
  }

  // Daily Labor
  async getDailyLabor(date: string): Promise<DailyLabor | undefined> {
    const [labor] = await db.select().from(dailyLabor).where(eq(dailyLabor.date, date));
    return labor;
  }

  async saveDailyLabor(date: string, data: Partial<InsertDailyLabor>): Promise<DailyLabor> {
    const existing = await this.getDailyLabor(date);
    if (existing) {
      const [updated] = await db.update(dailyLabor)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(dailyLabor.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(dailyLabor)
        .values({ date, ...data, updatedAt: new Date().toISOString() })
        .returning();
      return inserted;
    }
  }
}

export const storage = new DatabaseStorage();
