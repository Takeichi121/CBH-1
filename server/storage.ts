import { db } from "./db";
import { users, shifts, config, systemlog, sessions, swapRequests, type User, type Shift, type Config, type SystemLog, type Session, type InsertUser, type InsertShift, type SwapRequest, type InsertSwapRequest } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();
