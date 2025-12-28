import type { Express } from "express";
import type { Server } from "http";
import { storage, transaction, updateShiftById } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { hashPass, generateUsernameBase, allocateUsername, isSystemClosed, getWeekRangeTuesday, DEFAULT_CAPACITY, SHIFT_GROUPS } from "./utils";
import { db } from "./db";
import { users, shifts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const MANAGER_VERIFY_CODE = (process.env.MANAGER_VERIFY_CODE || "bk1040").toLowerCase();
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 6);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Ping
  app.post(api.system.ping.path, (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString(), closed: isSystemClosed(), branch: process.env.BRANCH_NAME || "Grand Diamond" });
  });

  // Setup
  app.post(api.system.setup.path, async (req, res) => {
    // Default configs
    const cfg = await storage.getConfig();
    for (const k of Object.keys(DEFAULT_CAPACITY)) {
      if (!("cap_" + k in cfg)) await storage.setConfig("cap_" + k, String(DEFAULT_CAPACITY[k as keyof typeof DEFAULT_CAPACITY]));
    }

    // Default users
    if (!await storage.getUser("admin")) {
      await storage.createUser({ username: "admin", passhash: hashPass("1234"), role: "admin", fullName: "Admin", nickName: "", phone: "", email: "", position: "Admin", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_admin", "system", "admin created");
    }
    if (!await storage.getUser("manager")) {
      await storage.createUser({ username: "manager", passhash: hashPass("1234"), role: "manager", fullName: "Manager", nickName: "", phone: "", email: "", position: "Manager", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_manager", "system", "manager created");
    }
    if (!await storage.getUser("staff")) {
      await storage.createUser({ username: "staff", passhash: hashPass("1234"), role: "staff", fullName: "Staff", nickName: "", phone: "", email: "", position: "Service Staff", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_staff", "system", "staff created");
    }

    await storage.log("setup_ok", "system", "setup completed");
    res.json({ ok: true, message: "setup ok" });
  });

  // Auth: Login
  app.post(api.auth.login.path, async (req, res) => {
    if (isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
    const { username, password } = req.body;
    if (!username || !password) return res.json({ ok: false, message: "กรอกให้ครบ" });

    const u = await storage.getUser(username);
    if (!u || !u.active) return res.json({ ok: false, message: "ไม่พบบัญชี/ถูกปิดใช้งาน" });
    if (hashPass(password) !== u.passhash) return res.json({ ok: false, message: "รหัสผ่านไม่ถูก" });

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    await storage.createSession({ token, username: u.username, expiresAt });

    await storage.log("login_ok", u.username, "role=" + u.role);
    res.json({ ok: true, token, user: { username: u.username, role: u.role, fullName: u.fullName, nickName: u.nickName } });
  });

  // Auth: Validate
  app.post(api.auth.validate.path, async (req, res) => {
    const { token } = req.body;
    if (!token) return res.json({ ok: false });
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });

    if (Math.floor(Date.now() / 1000) > session.expiresAt) {
      await storage.deleteSession(token);
      return res.json({ ok: false });
    }

    const u = await storage.getUser(session.username);
    if (!u || !u.active) return res.json({ ok: false });

    res.json({ ok: true, user: { username: u.username, role: u.role, fullName: u.fullName, nickName: u.nickName } });
  });

  // Auth: Logout
  app.post(api.auth.logout.path, async (req, res) => {
    const { token } = req.body;
    if (token) await storage.deleteSession(token);
    res.json({ ok: true });
  });

  // Register Staff
  app.post(api.auth.registerStaff.path, async (req, res) => {
    if (isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
    const { fullName, nickName, phone, email, password } = req.body;
    if (!fullName || !password || !email) return res.json({ ok: false, message: "ต้องกรอก ชื่อ-สกุล / Email / Password" });

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (u) => !!(await storage.getUser(u)));
    if (!username) return res.json({ ok: false, message: "สร้าง username ไม่สำเร็จ" });

    await storage.createUser({
      username, passhash: hashPass(password), role: "staff",
      fullName, nickName, phone, email, position: "Service Staff", active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_staff", username, "fullName=" + fullName);
    res.json({ ok: true, username });
  });

  // Register Manager
  app.post(api.auth.registerManager.path, async (req, res) => {
    if (isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
    const { fullName, nickName, phone, email, password, verifyCode, position } = req.body;
    if (String(verifyCode || "").trim().toLowerCase() !== MANAGER_VERIFY_CODE) return res.json({ ok: false, message: "รหัสยืนยันไม่ถูก" });
    if (!fullName || !password || !email) return res.json({ ok: false, message: "ต้องกรอก ชื่อ-สกุล / Email / Password" });
    if (!position) return res.json({ ok: false, message: "กรุณาเลือกตำแหน่ง" });

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (u) => !!(await storage.getUser(u)));
    if (!username) return res.json({ ok: false, message: "สร้าง username ไม่สำเร็จ" });

    await storage.createUser({
      username, passhash: hashPass(password), role: "manager",
      fullName, nickName, phone, email, position, active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_manager", username, `fullName=${fullName}, position=${position}`);
    res.json({ ok: true, username });
  });

  // Settings
  app.post(api.settings.get.path, async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "session หมดอายุ" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "สิทธิ์ไม่พอ" });

    const cfg = await storage.getConfig();
    const capacity: Record<string, number> = {};
    for (const k of Object.keys(DEFAULT_CAPACITY)) capacity[k] = Number(cfg["cap_" + k] || DEFAULT_CAPACITY[k as keyof typeof DEFAULT_CAPACITY]);

    const lockTimePeriod = cfg.lock_time_period === "true";

    res.json({ ok: true, capacity, groups: SHIFT_GROUPS, lockTimePeriod });
  });

  app.post(api.settings.update.path, async (req, res) => {
    const { token, capacity, lockTimePeriod } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false });

    if (capacity) {
      for (const k of Object.keys(capacity)) {
        if (k in DEFAULT_CAPACITY) await storage.setConfig("cap_" + k, String(capacity[k]));
      }
    }
    
    if (lockTimePeriod !== undefined) {
      await storage.setConfig("lock_time_period", String(lockTimePeriod));
    }

    await storage.log("update_settings", u.username, JSON.stringify({ capacity, lockTimePeriod }));
    res.json({ ok: true });
  });

  // Shifts: Get My Week
  app.post(api.shifts.getMyWeek.path, async (req, res) => {
    const { token, anyDate } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const range = getWeekRangeTuesday(anyDate);
    const shifts = await storage.getShiftsInRange(range.start, range.end);
    const myShifts = shifts.filter(s => s.username === u.username);

    res.json({ ok: true, weekRange: range, shifts: myShifts });
  });

  // Shifts: Get My Month (for managers)
  app.post(api.shifts.getMyMonth.path, async (req, res) => {
    const { token, month, year } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    // Get first and last day of the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const shifts = await storage.getShiftsInRange(startDate, endDate);
    const myShifts = shifts.filter(s => s.username === u.username);

    res.json({ ok: true, month, year, shifts: myShifts });
  });

  // Shifts: Book
  app.post(api.shifts.book.path, async (req, res) => {
    const { token, date, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const isManager = u.role === "admin" || u.role === "manager";
    if (!isManager && isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });

    // Validate
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ ok: false, message: "Date invalid" });
    const grp = SHIFT_GROUPS.find(g => g.key === shiftGroup);
    if (!grp) return res.json({ ok: false, message: "Shift group invalid" });

    // Handle staff booking default time
    let finalStartTime = startTime;
    if (!finalStartTime || finalStartTime === "") {
      finalStartTime = grp.main || grp.windowStart;
    }

    // Capacity check
    const shiftsOnDate = await storage.getShiftsInRange(date, date);
    const count = shiftsOnDate.filter(s => s.shiftGroup === shiftGroup).length;
    const cfg = await storage.getConfig();
    const cap = Number(cfg["cap_" + shiftGroup] || DEFAULT_CAPACITY[shiftGroup as keyof typeof DEFAULT_CAPACITY]);

    // Check if user already has shift on this date
    const existing = await storage.getShift(u.username, date);
    // If updating existing shift, we don't increase count. If inserting new, we do.
    // If existing and changing group, check capacity of new group.
    if (!existing) {
       if (count >= cap) return res.json({ ok: false, message: "เต็มแล้ว (Full)" });
    } else if (existing.shiftGroup !== shiftGroup) {
       if (count >= cap) return res.json({ ok: false, message: "เต็มแล้ว (Full)" });
    }

    await storage.upsertShift({
      date, username: u.username, fullName: u.fullName, role: u.role,
      nickName: u.nickName,
      shiftGroup, startTime, endTime: "", note: note || "", 
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: u.username
    });
    await storage.log("book_shift", u.username, `${date} ${shiftGroup}`);
    res.json({ ok: true });
  });

  // Shifts: Cancel
  app.post(api.shifts.cancel.path, async (req, res) => {
    const { token, date } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const isManager = u.role === "admin" || u.role === "manager";
    if (!isManager && isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });

    await storage.deleteShift(u.username, date);
    await storage.log("cancel_shift", u.username, date);
    res.json({ ok: true });
  });

  // Shifts: Roster
  app.post(api.shifts.getRoster.path, async (req, res) => {
    const { token, anyDate } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const range = getWeekRangeTuesday(anyDate);
    const shifts = await storage.getShiftsInRange(range.start, range.end);
    const allUsers = await storage.getUsers();
    res.json({ ok: true, weekRange: range, roster: shifts, users: allUsers });
  });

  // User: Update Profile
  app.post("/api/updateProfile", async (req, res) => {
    const { token, fullName, nickName, phone, email } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const [updated] = await db.update(users)
      .set({ fullName, nickName, phone, email })
      .where(eq(users.username, u.username))
      .returning();

    res.json({ ok: true, user: updated });
  });

  // User: Change Password
  app.post("/api/changePassword", async (req, res) => {
    const { token, currentPassword, newPassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (hashPass(currentPassword) !== u.passhash) {
      return res.json({ ok: false, message: "Current password incorrect" });
    }

    await db.update(users)
      .set({ passhash: hashPass(newPassword) })
      .where(eq(users.username, u.username));

    await storage.log("change_password", u.username, "password updated");
    res.json({ ok: true });
  });

  // User: Set Active Status (Manager)
  app.post("/api/updateUserStatus", async (req, res) => {
    const { token, username, active } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    await storage.updateUserStatus(username, active);
    await storage.log("update_user_status", u.username, `set ${username} active=${active}`);
    res.json({ ok: true });
  });

  // Shifts: Set For User (Manager)
  app.post(api.shifts.setForUser.path, async (req, res) => {
    const { token, username, date, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    await storage.upsertShift({
      date, username: targetUser.username, fullName: targetUser.fullName, role: targetUser.role,
      nickName: targetUser.nickName,
      shiftGroup, startTime, endTime: "", note: note || "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: u.username
    });
    await storage.log("manager_set_shift", u.username, `for ${username} on ${date}`);
    res.json({ ok: true });
  });

  // Shifts: Delete For User (Manager)
  app.post(api.shifts.deleteForUser.path, async (req, res) => {
    const { token, username, date } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    await storage.deleteShift(username, date);
    await storage.log("manager_delete_shift", u.username, `for ${username} on ${date}`);
    res.json({ ok: true });
  });

  // Shifts: Swap Request (creates a pending request for manager approval)
  app.post(api.shifts.swap.path, async (req, res) => {
    const { token, myDate, targetUsername, targetDate } = req.body;

    if (!token) return res.json({ ok: false, message: "Missing token" });
    if (!myDate || !targetDate) return res.json({ ok: false, message: "Missing date" });
    if (!targetUsername) return res.json({ ok: false, message: "Missing targetUsername" });

    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const me = await storage.getUser(session.username);
    if (!me) return res.json({ ok: false, message: "User not found" });

    const target = await storage.getUser(String(targetUsername).toLowerCase().trim());
    if (!target) return res.json({ ok: false, message: "Target user not found" });

    if (me.username === target.username) {
      return res.json({ ok: false, message: "Cannot swap with yourself" });
    }
    if (me.role !== "staff" || target.role !== "staff") {
      return res.json({ ok: false, message: "Swap allowed for staff only" });
    }

    // Check if both have shifts on their respective dates
    const myShift = await storage.getShift(me.username, myDate);
    if (!myShift) return res.json({ ok: false, message: "You have no shift on the selected date" });

    const targetShift = await storage.getShift(target.username, targetDate);
    if (!targetShift) return res.json({ ok: false, message: "Target has no shift on the selected date" });

    // Create swap request (pending manager approval)
    const now = new Date().toISOString();
    await storage.createSwapRequest({
      requesterUsername: me.username,
      requesterDate: myDate,
      targetUsername: target.username,
      targetDate: targetDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await storage.log("swap_request", me.username, `request swap ${me.username}:${myDate} <-> ${target.username}:${targetDate}`);
    return res.json({ ok: true, message: "Swap request submitted for manager approval" });
  });

  // Get Swap Requests (for manager view)
  app.post(api.shifts.getSwapRequests.path, async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    // Get pending requests for managers, or user's own requests for staff
    const isManager = u.role === "admin" || u.role === "manager";
    const requests = await storage.getSwapRequests(isManager ? "pending" : undefined);
    
    // For staff, filter to only their own requests
    const filteredRequests = isManager 
      ? requests 
      : requests.filter(r => r.requesterUsername === u.username || r.targetUsername === u.username);

    res.json({ ok: true, requests: filteredRequests });
  });

  // Approve Swap Request (manager only)
  app.post(api.shifts.approveSwap.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    const request = await storage.getSwapRequestById(requestId);
    if (!request) return res.json({ ok: false, message: "Request not found" });
    if (request.status !== "pending") return res.json({ ok: false, message: "Request already processed" });

    try {
      await transaction(async (tx) => {
        const [requesterShift] = await tx
          .select()
          .from(shifts)
          .where(and(eq(shifts.username, request.requesterUsername), eq(shifts.date, request.requesterDate)))
          .limit(1);

        if (!requesterShift) throw new Error("Requester shift not found");

        const [targetShift] = await tx
          .select()
          .from(shifts)
          .where(and(eq(shifts.username, request.targetUsername), eq(shifts.date, request.targetDate)))
          .limit(1);

        if (!targetShift) throw new Error("Target shift not found");

        const now = new Date().toISOString();

        // Swap the dates
        await updateShiftById(tx, requesterShift.id, {
          date: request.targetDate,
          updatedAt: now,
          updatedBy: u.username,
        });

        await updateShiftById(tx, targetShift.id, {
          date: request.requesterDate,
          updatedAt: now,
          updatedBy: u.username,
        });
      });

      await storage.updateSwapRequestStatus(requestId, "approved", u.username);
      await storage.log("approve_swap", u.username, `approved swap #${requestId}`);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.json({ ok: false, message: e?.message || "Swap failed" });
    }
  });

  // Reject Swap Request (manager only)
  app.post(api.shifts.rejectSwap.path, async (req, res) => {
    const { token, requestId, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    const request = await storage.getSwapRequestById(requestId);
    if (!request) return res.json({ ok: false, message: "Request not found" });
    if (request.status !== "pending") return res.json({ ok: false, message: "Request already processed" });

    await storage.updateSwapRequestStatus(requestId, "rejected", u.username, note);
    await storage.log("reject_swap", u.username, `rejected swap #${requestId}`);
    return res.json({ ok: true });
  });

  // User: Get Profile
  app.post(api.shifts.getUserProfile.path, async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    
    const u = await storage.getUser(username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    res.json({ 
      ok: true, 
      user: {
        fullName: u.fullName || "",
        nickName: u.nickName || "",
        phone: u.phone || "",
        email: u.email || "",
        position: u.position || "Staff"
      }
    });
  });

  return httpServer;
}
