import { db } from "./db";
import { users, shifts, config, systemlog, sessions, swapRequests, dailySalesReports, storeSettings, dailyTargets, type User, type Shift, type Config, type SystemLog, type Session, type InsertUser, type InsertShift, type SwapRequest, type InsertSwapRequest, type DailySalesReport, type InsertDailySales, type StoreSettings, type InsertStoreSettings, type DailyTarget, type InsertDailyTarget } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

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
  updateUser(username: string, data: Partial<{ nickName: string; phone: string; email: string }>): Promise<void>;
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
  getDailySalesReports(date?: string, limit?: number): Promise<DailySalesReport[]>;
  updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport>;
  deleteDailySalesReport(id: number): Promise<boolean>;
  getMtdSummary(year: number, month: number, beforeDate?: string): Promise<{
    mtdActual: number;
    mtdTc: number;
    mtdTarget: number;
    reportCount: number;
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

  async updateUser(username: string, data: Partial<{ nickName: string; phone: string; email: string }>): Promise<void> {
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

  async updateDailySalesReport(id: number, report: Partial<InsertDailySales>): Promise<DailySalesReport> {
    const [updated] = await db.update(dailySalesReports)
      .set({ ...report, updatedAt: new Date().toISOString() })
      .where(eq(dailySalesReports.id, id))
      .returning();
    if (!updated) throw new Error("Report not found");
    return updated;
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
    
    for (const report of reports) {
      mtdActual += parseFloat(report.actualSales || "0");
      mtdTc += parseFloat(report.transactionCount || "0");
      mtdTarget += parseFloat(report.dailyTarget || "0");
    }
    
    return { mtdActual, mtdTc, mtdTarget, reportCount: reports.length };
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
}

export const storage = new DatabaseStorage();
