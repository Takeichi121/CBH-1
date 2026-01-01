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
      await storage.createUser({ username: "manager", passhash: hashPass("1234"), role: "manager", fullName: "Manager", nickName: "", phone: "", email: "", position: "store_manager", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_manager", "system", "manager created as store_manager");
    }
    if (!await storage.getUser("staff")) {
      await storage.createUser({ username: "staff", passhash: hashPass("1234"), role: "staff", fullName: "Staff", nickName: "", phone: "", email: "", position: "Service Staff", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_staff", "system", "staff created");
    }
    if (!await storage.getUser("devstaff")) {
      await storage.createUser({ username: "devstaff", passhash: hashPass("dev1234"), role: "staff", fullName: "Developer Mode", nickName: "Dev", phone: "", email: "", position: "Developer", active: 1, createdAt: new Date().toISOString() });
      await storage.log("setup_create_devstaff", "system", "developer staff created");
    }

    await storage.log("setup_ok", "system", "setup completed");
    res.json({ ok: true, message: "setup ok" });
  });

  // Auth: Login
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password, developerMode } = req.body;
    if (!username || !password) return res.json({ ok: false, message: "กรอกให้ครบ" });
    
    // Check user first to determine if they have 24/7 access
    const u = await storage.getUser(username);
    
    // 24/7 access: admin, creator (Chan.J), or developer mode
    const isCreator = u && (
      u.username.toLowerCase().includes("chan") ||
      (u.fullName && u.fullName.toLowerCase().includes("chanon"))
    );
    const isAdmin = u && u.role === "admin";
    
    // Check if system is closed (allow admin, developer mode, or creator to bypass)
    if (isSystemClosed() && !developerMode && !isCreator && !isAdmin) {
      return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
    }

    if (!u || !u.active) return res.json({ ok: false, message: "ไม่พบบัญชี/ถูกปิดใช้งาน" });
    if (hashPass(password) !== u.passhash) return res.json({ ok: false, message: "รหัสผ่านไม่ถูก" });

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    await storage.createSession({ token, username: u.username, expiresAt });

    await storage.log("login_ok", u.username, "role=" + u.role);
    const profileComplete = !!(u.nickName && u.phone && u.email);
    const mustChangePassword = u.mustChangePassword === 1;
    res.json({ ok: true, token, user: { username: u.username, role: u.role, fullName: u.fullName, fullNameTh: u.fullNameTh, nickName: u.nickName, profileComplete, mustChangePassword } });
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

    const profileComplete = !!(u.nickName && u.phone && u.email);
    const mustChangePassword = u.mustChangePassword === 1;
    res.json({ ok: true, user: { username: u.username, role: u.role, fullName: u.fullName, fullNameTh: u.fullNameTh, nickName: u.nickName, profileComplete, mustChangePassword } });
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
    const { fullName, password } = req.body;
    if (!fullName || !password) return res.json({ ok: false, message: "ต้องกรอก ชื่อ-สกุล / Password" });

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (u) => !!(await storage.getUser(u)));
    if (!username) return res.json({ ok: false, message: "สร้าง username ไม่สำเร็จ" });

    await storage.createUser({
      username, passhash: hashPass(password), role: "staff",
      fullName, nickName: "", phone: "", email: "", position: "Service Staff", active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_staff", username, "fullName=" + fullName);
    res.json({ ok: true, username });
  });

  // Register Manager
  app.post(api.auth.registerManager.path, async (req, res) => {
    if (isSystemClosed()) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
    const { fullName, password, verifyCode } = req.body;
    if (String(verifyCode || "").trim().toLowerCase() !== MANAGER_VERIFY_CODE) return res.json({ ok: false, message: "รหัสยืนยันไม่ถูก" });
    if (!fullName || !password) return res.json({ ok: false, message: "ต้องกรอก ชื่อ-สกุล / Password" });

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (u) => !!(await storage.getUser(u)));
    if (!username) return res.json({ ok: false, message: "สร้าง username ไม่สำเร็จ" });

    // Default all managers to Store Manager position
    await storage.createUser({
      username, passhash: hashPass(password), role: "manager",
      fullName, nickName: "", phone: "", email: "", position: "store_manager", active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_manager", username, `fullName=${fullName}, position=store_manager`);
    res.json({ ok: true, username });
  });

  // Complete Profile (first login)
  app.post(api.auth.completeProfile.path, async (req, res) => {
    const { token, nickName, phone, email } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "session หมดอายุ" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "ไม่พบผู้ใช้" });

    if (!nickName || !phone || !email) {
      return res.json({ ok: false, message: "กรุณากรอกข้อมูลให้ครบ" });
    }

    await storage.updateUser(u.username, { nickName, phone, email });
    await storage.log("complete_profile", u.username, `nickName=${nickName}, phone=${phone}, email=${email}`);
    res.json({ ok: true });
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

  // User: Update Profile Picture
  app.post("/api/updateProfilePicture", async (req, res) => {
    const { token, profilePicture } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const [updated] = await db.update(users)
      .set({ profilePicture })
      .where(eq(users.username, u.username))
      .returning();

    await storage.log("update_profile_picture", u.username, "profile picture updated");
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
      .set({ passhash: hashPass(newPassword), mustChangePassword: 0 })
      .where(eq(users.username, u.username));

    await storage.log("change_password", u.username, "password updated");
    res.json({ ok: true });
  });

  // User: First-time Password Change (when mustChangePassword is true)
  app.post("/api/forceChangePassword", async (req, res) => {
    const { token, newPassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (u.mustChangePassword !== 1) {
      return res.json({ ok: false, message: "Not required to change password" });
    }

    await db.update(users)
      .set({ passhash: hashPass(newPassword), mustChangePassword: 0 })
      .where(eq(users.username, u.username));

    await storage.log("force_change_password", u.username, "first-time password updated");
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

  // Admin/Manager: Delete User
  app.post("/api/admin/deleteUser", async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    // Cannot delete admin users unless you are admin
    if (targetUser.role === "admin" && u.role !== "admin") {
      return res.json({ ok: false, message: "Cannot delete admin" });
    }

    // Cannot delete yourself
    if (username === u.username) {
      return res.json({ ok: false, message: "Cannot delete yourself" });
    }

    await db.delete(users).where(eq(users.username, username));
    await storage.log("delete_user", u.username, `deleted ${username}`);
    res.json({ ok: true });
  });

  // Admin/Manager: Mark User as Resigned
  app.post("/api/admin/resignUser", async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    // Cannot resign yourself
    if (username === u.username) {
      return res.json({ ok: false, message: "Cannot resign yourself" });
    }

    // Set active = 2 for resigned
    await db.update(users).set({ active: 2 }).where(eq(users.username, username));
    await storage.log("resign_user", u.username, `marked ${username} as resigned`);
    res.json({ ok: true });
  });

  // Position hierarchy (lower number = higher rank)
  const positionHierarchy: Record<string, number> = {
    "admin": 0,
    "store_manager": 1,
    "assistant_store_manager": 2,
    "shift_manager": 3,
    "management_trainee": 4,
    "staff": 5,
  };

  const getUserRank = (user: any): number => {
    if (user.role === "admin") return 0;
    if (user.role === "manager") return positionHierarchy[user.position] || 5;
    return 5; // staff
  };

  // Helper: Check if user can manage others
  const canManageUsers = (user: any) => {
    if (user.role === "admin") return true;
    if (user.role === "manager" && user.position === "store_manager") return true;
    return false;
  };

  // Helper: Check if user can create profile for target role/position
  const canCreateProfile = (creator: any, targetRole: string, targetPosition?: string): boolean => {
    const creatorRank = getUserRank(creator);
    
    // Admin and Store Manager can create anyone (except Admin for Store Manager)
    if (creator.role === "admin") return true;
    if (creator.role === "manager" && creator.position === "store_manager") {
      if (targetRole === "admin") return false;
      return true;
    }
    
    // Other managers can only create profiles for lower ranks
    if (creator.role === "manager") {
      if (targetRole === "admin") return false;
      if (targetRole === "staff") return true;
      if (targetRole === "manager" && targetPosition) {
        const targetRank = positionHierarchy[targetPosition] || 5;
        return targetRank > creatorRank; // Can only create lower rank
      }
    }
    
    return false;
  };

  // Manager: Create Profile for Team Member
  app.post("/api/admin/createProfile", async (req, res) => {
    const { token, fullName, fullNameTh, password, role, position, nickName, phone, email, mustChangePassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || u.role === "staff") return res.json({ ok: false, message: "No permission" });

    if (!fullName || !password) {
      return res.json({ ok: false, message: "Full name and password required" });
    }

    // Check if creator has permission to create this role/position
    if (!canCreateProfile(u, role, position)) {
      return res.json({ ok: false, message: "Cannot create profile with higher or equal rank" });
    }

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (un) => !!(await storage.getUser(un)));
    if (!username) return res.json({ ok: false, message: "Cannot create username" });

    await storage.createUser({
      username,
      passhash: hashPass(password),
      role: role || "staff",
      fullName,
      fullNameTh: fullNameTh || "",
      nickName: nickName || "",
      phone: phone || "",
      email: email || "",
      position: role === "manager" ? (position || "store_manager") : "Service Staff",
      active: 1,
      mustChangePassword: mustChangePassword ? 1 : 0,
      createdAt: new Date().toISOString()
    });

    await storage.log("create_profile", u.username, `created ${username} role=${role} position=${position || "none"}`);
    res.json({ ok: true, username });
  });

  // Admin/Store Manager: Update User Role and Position
  app.post("/api/admin/updateUserRole", async (req, res) => {
    const { token, username, role, position } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !canManageUsers(u)) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    // Store Manager cannot set someone as Admin
    if (u.role !== "admin" && role === "admin") {
      return res.json({ ok: false, message: "Only Admin can set Admin role" });
    }

    // Store Manager cannot modify Admin users
    if (u.role !== "admin" && targetUser.role === "admin") {
      return res.json({ ok: false, message: "Cannot modify Admin users" });
    }

    await storage.updateUserRole(username, role, position);
    await storage.log("update_user_role", u.username, `set ${username} role=${role} position=${position || "none"}`);
    res.json({ ok: true });
  });

  // Admin/Manager: Get all users
  app.post("/api/admin/getUsers", async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || u.role === "staff") return res.json({ ok: false, message: "No permission" });

    const allUsers = await storage.getUsers();
    const creatorRank = getUserRank(u);
    
    res.json({ 
      ok: true, 
      users: allUsers.map(user => ({
        ...user,
        passhash: undefined // Don't send password hash
      })),
      creatorRank,
      canManageAll: canManageUsers(u)
    });
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

  // Shifts: Delete by ID (Manager)
  app.post("/api/deleteShift", async (req, res) => {
    const { token, shiftId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      await db.delete(shifts).where(eq(shifts.id, shiftId));
      await storage.log("manager_delete_shift_by_id", u.username, `shiftId=${shiftId}`);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: "Failed to delete" });
    }
  });

  // Shifts: Update by ID (Manager)
  app.post("/api/updateShift", async (req, res) => {
    const { token, shiftId, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      await db.update(shifts).set({
        shiftGroup,
        startTime,
        note: note || "",
        updatedAt: new Date().toISOString(),
        updatedBy: u.username,
      }).where(eq(shifts.id, shiftId));
      await storage.log("manager_update_shift", u.username, `shiftId=${shiftId}`);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: "Failed to update" });
    }
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

  // =============== SALES ROUTES ===============

  // Create Daily Sales Report
  app.post(api.sales.createReport.path, async (req, res) => {
    const { token, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      const created = await storage.createDailySalesReport(report);
      await storage.log("create_sales_report", u.username, `date=${report.reportDate}`);
      res.json({ ok: true, report: created });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to create report" });
    }
  });

  // Get Single Report
  app.post(api.sales.getReport.path, async (req, res) => {
    const { token, id } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const report = await storage.getDailySalesReport(id);
    if (!report) return res.json({ ok: false, message: "Report not found" });
    res.json({ ok: true, report });
  });

  // Get Reports List
  app.post(api.sales.getReports.path, async (req, res) => {
    const { token, date, limit } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const reports = await storage.getDailySalesReports(date, limit);
    res.json({ ok: true, reports });
  });

  // Update Report
  app.post(api.sales.updateReport.path, async (req, res) => {
    const { token, id, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      const updated = await storage.updateDailySalesReport(id, report);
      await storage.log("update_sales_report", u.username, `id=${id}`);
      res.json({ ok: true, report: updated });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update report" });
    }
  });

  // Delete Report
  app.post(api.sales.deleteReport.path, async (req, res) => {
    const { token, id } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    const deleted = await storage.deleteDailySalesReport(id);
    if (!deleted) return res.json({ ok: false, message: "Report not found" });
    await storage.log("delete_sales_report", u.username, `id=${id}`);
    res.json({ ok: true });
  });

  // Get MTD Summary
  app.post(api.sales.getMtdSummary.path, async (req, res) => {
    const { token, year, month, beforeDate } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const summary = await storage.getMtdSummary(year, month, beforeDate);
      res.json({ ok: true, ...summary });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get MTD summary" });
    }
  });

  // Get Store Settings
  app.post(api.sales.getSettings.path, async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const settings = await storage.getStoreSettings();
    res.json({ ok: true, settings });
  });

  // Update Store Settings
  app.post(api.sales.updateSettings.path, async (req, res) => {
    const { token, settings } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      const updated = await storage.updateStoreSettings(settings);
      await storage.log("update_store_settings", u.username, "settings updated");
      res.json({ ok: true, settings: updated });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update settings" });
    }
  });

  // Get Daily Targets for Month
  app.post(api.sales.getDailyTargets.path, async (req, res) => {
    const { token, year, month } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const targets = await storage.getDailyTargetsForMonth(year, month);
      res.json({ ok: true, targets });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get daily targets" });
    }
  });

  // Save Daily Targets
  app.post(api.sales.saveDailyTargets.path, async (req, res) => {
    const { token, targets } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      await storage.bulkUpsertDailyTargets(targets);
      await storage.log("save_daily_targets", u.username, `count=${targets.length}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save daily targets" });
    }
  });

  // Get Daily Target for Specific Date
  app.post(api.sales.getDailyTargetForDate.path, async (req, res) => {
    const { token, date } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const target = await storage.getDailyTarget(date);
      res.json({ ok: true, target });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get daily target" });
    }
  });

  // Get MTD Target Sum up to a date
  app.post(api.sales.getMtdTargetSum.path, async (req, res) => {
    const { token, year, month, upToDate } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const mtdTargetSum = await storage.getMtdTargetSum(year, month, upToDate);
      res.json({ ok: true, mtdTargetSum });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get MTD target sum" });
    }
  });

  // Get Monthly Reports for Settings page
  app.post(api.sales.getMonthlyReports.path, async (req, res) => {
    const { token, year, month } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const reports = await storage.getDailySalesReportsForMonth(year, month);
      res.json({ ok: true, reports });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get monthly reports" });
    }
  });

  return httpServer;
}
