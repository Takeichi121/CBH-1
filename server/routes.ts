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
  app.post(api.system.ping.path, async (req, res) => {
    const cfg = await storage.getConfig();
    res.json({ ok: true, ts: new Date().toISOString(), closed: isSystemClosed(cfg), branch: process.env.BRANCH_NAME || "Grand Diamond" });
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
    const cfg = await storage.getConfig();
    
    // 24/7 access: admin, creator (Chan.J), or developer mode
    const isCreator = u && (
      u.username.toLowerCase().includes("chan") ||
      (u.fullName && u.fullName.toLowerCase().includes("chanon"))
    );
    const isAdmin = u && u.role === "admin";
    const isManager = u && (u.role === "manager" || u.role === "admin");
    
    // Check if system is closed (allow admin, manager, developer mode, or creator to bypass)
    if (isSystemClosed(cfg) && !developerMode && !isCreator && !isAdmin && !isManager) {
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
    res.json({ ok: true, token, user: { username: u.username, role: u.role, fullName: u.fullName, fullNameTh: u.fullNameTh, nickName: u.nickName, phone: u.phone, email: u.email, profilePicture: u.profilePicture, profileComplete, mustChangePassword } });
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
    res.json({ ok: true, user: { username: u.username, role: u.role, fullName: u.fullName, fullNameTh: u.fullNameTh, nickName: u.nickName, phone: u.phone, email: u.email, profilePicture: u.profilePicture, profileComplete, mustChangePassword } });
  });

  // Auth: Logout
  app.post(api.auth.logout.path, async (req, res) => {
    const { token } = req.body;
    if (token) await storage.deleteSession(token);
    res.json({ ok: true });
  });

  // Register Staff
  app.post(api.auth.registerStaff.path, async (req, res) => {
    const cfg = await storage.getConfig();
    if (isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
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
    const cfg = await storage.getConfig();
    if (isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้" });
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
    
    // Maintenance window settings
    const maintenance = {
      enabled: cfg.maintenance_enabled === "true",
      startDay: Number(cfg.maintenance_start_day ?? 2),
      startTime: cfg.maintenance_start_time ?? "12:00",
      endDay: Number(cfg.maintenance_end_day ?? 3),
      endTime: cfg.maintenance_end_time ?? "00:00"
    };
    
    const systemClosed = isSystemClosed(cfg);

    res.json({ ok: true, capacity, groups: SHIFT_GROUPS, lockTimePeriod, maintenance, systemClosed });
  });

  app.post(api.settings.update.path, async (req, res) => {
    const { token, capacity, lockTimePeriod, maintenance } = req.body;
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
    
    // Update maintenance window settings
    if (maintenance) {
      await storage.setConfig("maintenance_enabled", String(maintenance.enabled ?? false));
      await storage.setConfig("maintenance_start_day", String(maintenance.startDay ?? 2));
      await storage.setConfig("maintenance_start_time", String(maintenance.startTime ?? "12:00"));
      await storage.setConfig("maintenance_end_day", String(maintenance.endDay ?? 3));
      await storage.setConfig("maintenance_end_time", String(maintenance.endTime ?? "00:00"));
    }

    await storage.log("update_settings", u.username, JSON.stringify({ capacity, lockTimePeriod, maintenance }));
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
    
    const cfg = await storage.getConfig();
    const isManager = u.role === "admin" || u.role === "manager";
    const closed = !isManager && isSystemClosed(cfg);

    res.json({ ok: true, weekRange: range, shifts: myShifts, items: myShifts, closed });
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

  // Shifts: Get Manager Team Month (all managers' schedules for a month)
  app.post(api.shifts.getManagerTeamMonth.path, async (req, res) => {
    const { token, month, year } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    // Only managers and admins can view manager team schedule
    if (u.role !== "manager" && u.role !== "admin") {
      return res.json({ ok: false, message: "Permission denied" });
    }

    // Get first and last day of the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get all managers (role = manager or admin)
    const allUsers = await storage.getUsers();
    const managers = allUsers.filter(user => (user.role === "manager" || user.role === "admin") && user.active === 1);

    // Get shifts for all managers in this month
    const shifts = await storage.getShiftsInRange(startDate, endDate);
    const managerUsernames = managers.map(m => m.username);
    const managerShifts = shifts.filter(s => managerUsernames.includes(s.username));

    res.json({ 
      ok: true, 
      month, 
      year, 
      managers: managers.map(m => ({
        username: m.username,
        fullName: m.fullName,
        fullNameTh: m.fullNameTh,
        nickName: m.nickName,
        position: m.position,
        role: m.role
      })),
      shifts: managerShifts 
    });
  });

  // Shifts: Book
  app.post(api.shifts.book.path, async (req, res) => {
    const { token, date, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const cfg = await storage.getConfig();
    const isManager = u.role === "admin" || u.role === "manager";
    if (!isManager && isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้ (System maintenance in progress)" });

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

    const cfg = await storage.getConfig();
    const isManager = u.role === "admin" || u.role === "manager";
    if (!isManager && isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้ (System maintenance in progress)" });

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

    // Only update fields that are provided (not empty/undefined)
    const updateData: Record<string, string> = {};
    if (fullName !== undefined && fullName !== "") updateData.fullName = fullName;
    if (nickName !== undefined && nickName !== "") updateData.nickName = nickName;
    if (phone !== undefined && phone !== "") updateData.phone = phone;
    if (email !== undefined && email !== "") updateData.email = email;

    // If no valid fields to update, return current user
    if (Object.keys(updateData).length === 0) {
      return res.json({ ok: true, user: u });
    }

    const [updated] = await db.update(users)
      .set(updateData)
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

    // Validate profile picture
    if (!profilePicture || typeof profilePicture !== "string") {
      return res.json({ ok: false, message: "Invalid profile picture" });
    }

    // Must be a valid data URL with image mime type (check header only)
    const headerRegex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!headerRegex.test(profilePicture)) {
      return res.json({ ok: false, message: "Invalid image format. Only JPEG, PNG, GIF, WEBP allowed." });
    }

    // Check base64 size (limit ~2MB - base64 is ~1.37x larger than binary)
    const base64Data = profilePicture.split(",")[1] || "";
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (sizeInBytes > maxSize) {
      return res.json({ ok: false, message: "File too large. Maximum size is 2MB." });
    }

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

  // Upsert Report By Date (auto-save)
  app.post(api.sales.upsertReportByDate.path, async (req, res) => {
    const { token, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      const saved = await storage.upsertDailySalesReportByDate(report);
      res.json({ ok: true, report: saved });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save report" });
    }
  });

  // Get Report By Date
  app.post(api.sales.getReportByDate.path, async (req, res) => {
    const { token, date } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const report = await storage.getDailySalesReportByDate(date);
    res.json({ ok: true, report: report || null });
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

  // Get Waste Targets for Month
  app.post(api.sales.getWasteTargets.path, async (req, res) => {
    const { token, year, month } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      const wasteTarget = await storage.getWasteTarget(targetMonth);
      res.json({ ok: true, wasteTarget });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get waste targets" });
    }
  });

  // Save Waste Targets
  app.post(api.sales.saveWasteTargets.path, async (req, res) => {
    const { token, year, month, wasteTarget } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }

    try {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      await storage.upsertWasteTarget(targetMonth, wasteTarget);
      await storage.log("save_waste_targets", u.username, `month=${targetMonth}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save waste targets" });
    }
  });

  // ==================== Manager Requests ====================

  // Create Manager Request
  app.post(api.managerRequests.create.path, async (req, res) => {
    const { token, requestType, requestDate, startTime, endTime, dayOffReason, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u || (u.role !== "manager" && u.role !== "admin")) {
      return res.json({ ok: false, message: "Only managers can create requests" });
    }
    
    // Validate required fields
    if (!requestType || !requestDate) {
      return res.json({ ok: false, message: "Request type and date are required" });
    }

    // Check limit for select_work_time (2 per month)
    if (requestType === "select_work_time") {
      const dateParts = requestDate.split("-");
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const count = await storage.getSelectWorkTimeCountForMonth(u.username, year, month);
      if (count >= 2) {
        return res.json({ ok: false, message: "คุณเลือกเวลาเข้างานครบ 2 ครั้งแล้วในเดือนนี้" });
      }
    }

    try {
      const now = new Date().toISOString();
      const request = await storage.createManagerRequest({
        requestType,
        requestDate,
        requestedBy: u.username,
        startTime: startTime || null,
        endTime: endTime || null,
        dayOffReason: dayOffReason || null,
        note: note || null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      await storage.log("manager_request_create", u.username, `type=${requestType} date=${requestDate}`);
      res.json({ ok: true, request });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to create request" });
    }
  });

  // Get My Requests
  app.post(api.managerRequests.getMyRequests.path, async (req, res) => {
    const { token, year, month } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const requests = await storage.getManagerRequestsByUser(session.username, year, month);
      res.json({ ok: true, requests });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get requests" });
    }
  });

  // Get All Requests (Admin/Store Manager only)
  app.post(api.managerRequests.getAllRequests.path, async (req, res) => {
    const { token, status } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    // Check if user is Admin or Store Manager
    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) {
      return res.json({ ok: false, message: "Only Admin or Store Manager can view all requests" });
    }

    try {
      const requests = await storage.getAllManagerRequests(status);
      res.json({ ok: true, requests });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get requests" });
    }
  });

  // Approve Request
  app.post(api.managerRequests.approve.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) {
      return res.json({ ok: false, message: "Only Admin or Store Manager can approve requests" });
    }

    try {
      await storage.updateManagerRequestStatus(requestId, "approved", u.username);
      await storage.log("manager_request_approve", u.username, `requestId=${requestId}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to approve request" });
    }
  });

  // Reject Request
  app.post(api.managerRequests.reject.path, async (req, res) => {
    const { token, requestId, reason } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) {
      return res.json({ ok: false, message: "Only Admin or Store Manager can reject requests" });
    }

    try {
      await storage.updateManagerRequestStatus(requestId, "rejected", u.username, reason);
      await storage.log("manager_request_reject", u.username, `requestId=${requestId} reason=${reason}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to reject request" });
    }
  });

  // Delete Request (own request only, if pending)
  app.post(api.managerRequests.delete.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const request = await storage.getManagerRequest(requestId);
    if (!request) return res.json({ ok: false, message: "Request not found" });
    if (request.requestedBy !== session.username) {
      return res.json({ ok: false, message: "You can only delete your own requests" });
    }
    if (request.status !== "pending") {
      return res.json({ ok: false, message: "Can only delete pending requests" });
    }

    try {
      await storage.deleteManagerRequest(requestId);
      await storage.log("manager_request_delete", session.username, `requestId=${requestId}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to delete request" });
    }
  });

  // Get Select Work Time Count for Month
  app.post(api.managerRequests.getSelectWorkTimeCount.path, async (req, res) => {
    const { token, year, month } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    try {
      const count = await storage.getSelectWorkTimeCountForMonth(session.username, year, month);
      res.json({ ok: true, count });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get count" });
    }
  });

  // ==================== Developer Tools ====================
  const DEV_CODE = "bk1040";
  
  const verifyDevAccess = async (token: string, devCode?: string): Promise<{ ok: boolean; user?: any; message?: string }> => {
    const session = await storage.getSession(token);
    if (!session) return { ok: false, message: "Session expired" };
    
    const u = await storage.getUser(session.username);
    if (!u) return { ok: false, message: "User not found" };
    
    // Allow if admin or if correct dev code provided
    if (u.role === "admin" || devCode === DEV_CODE) {
      return { ok: true, user: u };
    }
    
    return { ok: false, message: "Access denied - Admin or Dev Code required" };
  };

  // Get System Logs
  app.post(api.devTools.getSystemLogs.path, async (req, res) => {
    const { token, devCode, limit = 100, action } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      const logs = await storage.getSystemLogs(limit, action);
      res.json({ ok: true, logs });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get logs" });
    }
  });

  // Get Sessions
  app.post(api.devTools.getSessions.path, async (req, res) => {
    const { token, devCode } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      const sessions = await storage.getAllSessions();
      res.json({ ok: true, sessions });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get sessions" });
    }
  });

  // Clear Sessions
  app.post(api.devTools.clearSessions.path, async (req, res) => {
    const { token, devCode, username } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      const count = await storage.clearSessions(username);
      await storage.log("dev_clear_sessions", access.user.username, username ? `user=${username}` : "all sessions");
      res.json({ ok: true, count });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to clear sessions" });
    }
  });

  // Get Config
  app.post(api.devTools.getConfig.path, async (req, res) => {
    const { token, devCode } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      const config = await storage.getConfig();
      res.json({ ok: true, config });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get config" });
    }
  });

  // Set Config
  app.post(api.devTools.setConfig.path, async (req, res) => {
    const { token, devCode, key, value } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      await storage.setConfig(key, value);
      await storage.log("dev_set_config", access.user.username, `${key}=${value}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to set config" });
    }
  });

  // Reset Password
  app.post(api.devTools.resetPassword.path, async (req, res) => {
    const { token, devCode, username, newPassword } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      const salt = process.env.SALT || "bk_salt";
      const crypto = await import("crypto");
      const passhash = crypto.createHash("sha256").update(newPassword + salt).digest("hex");
      await storage.updateUserPassword(username, passhash);
      await storage.log("dev_reset_password", access.user.username, `user=${username}`);
      res.json({ ok: true, message: `Password reset for ${username}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to reset password" });
    }
  });

  // Update User Role
  app.post(api.devTools.updateUserRole.path, async (req, res) => {
    const { token, devCode, username, role, position } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      await storage.updateUserRole(username, role, position);
      await storage.log("dev_update_role", access.user.username, `user=${username} role=${role} position=${position || ""}`);
      res.json({ ok: true, message: `Role updated for ${username}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update role" });
    }
  });

  // Get Table Info
  app.post(api.devTools.getTableInfo.path, async (req, res) => {
    const { token, devCode, tableName } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      if (tableName) {
        const rows = await storage.getTableRows(tableName, 100);
        res.json({ ok: true, rows });
      } else {
        const tables = await storage.getTableList();
        res.json({ ok: true, tables });
      }
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get table info" });
    }
  });

  // Clear Test Data
  app.post(api.devTools.clearTestData.path, async (req, res) => {
    const { token, devCode, tableName } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    // Only allow clearing certain tables
    const allowedTables = ["shifts", "systemlog", "sessions", "swap_requests", "daily_sales_reports", "manager_requests"];
    if (!allowedTables.includes(tableName)) {
      return res.json({ ok: false, message: `Cannot clear table: ${tableName}. Allowed: ${allowedTables.join(", ")}` });
    }

    try {
      const count = await storage.clearTable(tableName);
      await storage.log("dev_clear_table", access.user.username, `table=${tableName} count=${count}`);
      res.json({ ok: true, count, message: `Cleared ${count} rows from ${tableName}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to clear table" });
    }
  });

  // Execute Query (READ ONLY - strict validation)
  app.post(api.devTools.executeQuery.path, async (req, res) => {
    const { token, devCode, query } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    // Strict validation: only allow simple SELECT queries
    const cleanQuery = query.trim();
    const upperQuery = cleanQuery.toUpperCase();
    
    // Remove leading comments and check for SELECT
    const noComments = upperQuery.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim();
    
    // Reject if not starting with SELECT
    if (!noComments.startsWith("SELECT")) {
      return res.json({ ok: false, message: "Only SELECT queries are allowed" });
    }
    
    // Reject dangerous patterns (multiple statements, subquery manipulation)
    const dangerousPatterns = [
      /;.*\S/i, // Multiple statements  
      /\bDROP\b/i,
      /\bDELETE\b/i,
      /\bINSERT\b/i,
      /\bUPDATE\b/i,
      /\bTRUNCATE\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bEXECUTE\b/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(cleanQuery)) {
        return res.json({ ok: false, message: "Query contains disallowed keywords" });
      }
    }

    try {
      const result = await storage.executeReadQuery(cleanQuery);
      await storage.log("dev_execute_query", access.user.username, cleanQuery.substring(0, 100));
      res.json({ ok: true, result });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Query failed" });
    }
  });

  // Bulk Import Users
  app.post(api.devTools.bulkImportUsers.path, async (req, res) => {
    const { token, devCode, users: inputUsers } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    if (!Array.isArray(inputUsers) || inputUsers.length === 0) {
      return res.json({ ok: false, message: "No users provided" });
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    const validRoles = ["staff", "manager", "admin"];

    for (const u of inputUsers) {
      try {
        if (!u.username || !u.password) {
          errors.push(`Missing username or password for entry`);
          failed++;
          continue;
        }
        
        const username = u.username.toLowerCase().trim();
        if (!/^[a-z0-9._-]+$/.test(username)) {
          errors.push(`Invalid username format: ${u.username}`);
          failed++;
          continue;
        }
        
        // Check if user exists
        const existing = await storage.getUser(username);
        if (existing) {
          errors.push(`User ${username} already exists`);
          failed++;
          continue;
        }
        
        const role = validRoles.includes(u.role) ? u.role : "staff";
        
        await storage.createUser({
          username,
          passhash: hashPass(u.password),
          role,
          fullName: typeof u.fullName === "string" ? u.fullName.trim() : null,
          nickName: typeof u.nickName === "string" ? u.nickName.trim() : null,
          phone: typeof u.phone === "string" ? u.phone.trim() : null,
          email: typeof u.email === "string" ? u.email.trim() : null,
          active: 1,
          mustChangePassword: 1,
          createdAt: new Date().toISOString(),
        });
        imported++;
      } catch (e: any) {
        errors.push(`Failed to import ${u.username}: ${e?.message || "Unknown error"}`);
        failed++;
      }
    }

    await storage.log("dev_bulk_import", access.user.username, `imported=${imported} failed=${failed}`);
    res.json({ ok: true, imported, failed, errors: errors.length > 0 ? errors : undefined, message: `Imported ${imported} users, ${failed} failed` });
  });

  // Update User Profile
  app.post(api.devTools.updateUserProfile.path, async (req, res) => {
    const { token, devCode, username, updates } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    if (!username || typeof username !== "string") {
      return res.json({ ok: false, message: "Username is required" });
    }

    try {
      const user = await storage.getUser(username);
      if (!user) {
        return res.json({ ok: false, message: `User ${username} not found` });
      }

      // Whitelist allowed fields for update
      const allowedFields = ["fullName", "fullNameTh", "nickName", "phone", "email", "active"];
      const sanitizedUpdates: Record<string, any> = {};
      
      for (const key of allowedFields) {
        if (updates && key in updates) {
          const value = updates[key];
          if (key === "active") {
            const numValue = typeof value === "string" ? Number(value) : value;
            sanitizedUpdates[key] = numValue === 0 ? 0 : 1;
          } else if (typeof value === "string") {
            sanitizedUpdates[key] = value.trim();
          }
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res.json({ ok: false, message: "No valid updates provided" });
      }

      await storage.updateUser(username, sanitizedUpdates);
      await storage.log("dev_update_profile", access.user.username, `user=${username} updates=${JSON.stringify(sanitizedUpdates)}`);
      res.json({ ok: true, message: `Profile updated for ${username}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update profile" });
    }
  });

  return httpServer;
}
