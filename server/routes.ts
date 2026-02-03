import type { Express } from "express";
import type { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage, transaction, updateShiftById } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import multer from "multer";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { hashPass, generateUsernameBase, allocateUsername, isSystemClosed, getWeekRangeTuesday, DEFAULT_CAPACITY, SHIFT_GROUPS } from "./utils";
import { db } from "./db";
import { 
  users, 
  shifts, 
  borrowBranches, 
  borrowItems, 
  borrowTransactions, 
  laborSettings, 
  dailyLabor, 
  sessions,
  dailySalesReports,
  passwordResetOtps,
  staffChatMessages
} from "@shared/schema";
import { eq, and, desc, sql, isNull, isNotNull, or, inArray } from "drizzle-orm";

const MANAGER_VERIFY_CODE = (process.env.MANAGER_VERIFY_CODE || "bk1040").toLowerCase();
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 6);

// ตั้งค่า Multer สำหรับอัปโหลดไฟล์
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Multer config for chat images - save to disk
const chatImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "chat");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `chat-${uniqueSuffix}${ext}`);
  }
});
const chatImageUpload = multer({
  storage: chatImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ==========================================
  // 🛡️ Helpers
  // ==========================================
  const verifyManagerAccess = async (token: string) => {
    if (!token) return { ok: false as const, message: "Token required" };

    // ตรวจสอบ Session จาก DB โดยตรง
    const session = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    if (session.length === 0 || session[0].expiresAt < Math.floor(Date.now() / 1000)) {
      return { ok: false as const, message: "Session expired" };
    }

    const user = await db.select().from(users).where(eq(users.username, session[0].username)).limit(1);
    if (user.length === 0) return { ok: false as const, message: "User not found" };

    if (user[0].role !== "admin" && user[0].role !== "manager") {
      return { ok: false as const, message: "No permission" };
    }
    return { ok: true as const, user: user[0] };
  };

  // ==========================================
  // 📁 Static file serving for uploads
  // ==========================================
  const express = await import("express");
  app.use("/uploads", express.default.static(path.join(process.cwd(), "uploads")));

  // ==========================================
  // 📸 Chat Image Upload
  // ==========================================
  app.post("/api/chat/upload-image", chatImageUpload.single("image"), async (req, res) => {
    try {
      const token = req.body.token;
      if (!token) return res.json({ ok: false, message: "Token required" });
      
      const session = await storage.getSession(token);
      if (!session) return res.json({ ok: false, message: "Invalid session" });

      if (!req.file) return res.json({ ok: false, message: "No file uploaded" });

      const imageUrl = `/uploads/chat/${req.file.filename}`;
      res.json({ ok: true, imageUrl });
    } catch (e: any) {
      console.error("Chat image upload error:", e);
      res.json({ ok: false, message: e.message || "Upload failed" });
    }
  });

  // ==========================================
  // 🤖 Chann AI Assistant
  // ==========================================
  app.post("/api/chann", async (req, res) => {
    try {
      const { token, message, history } = req.body;
      if (!token || !message) {
        return res.json({ ok: false, message: "Token and message required" });
      }

      const session = await storage.getSession(token);
      if (!session) {
        return res.json({ ok: false, message: "Invalid session" });
      }

      const user = await storage.getUser(session.username);
      if (!user) {
        return res.json({ ok: false, message: "User not found" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `คุณคือ "Chann" — AI Agent อัจฉริยะสุขุมและมืออาชีพ

[บุคลิกภาพ]
- สุขุม มั่นใจ แต่มีอารมณ์ขันเล็กน้อย
- อธิบายเรื่องซับซ้อนให้เข้าใจง่าย เรียงลำดับตรรกะชัดเจน
- ตอบได้ทั้งภาษาไทยและอังกฤษอย่างเป็นธรรมชาติ
- ถ้าผู้ใช้ถามเป็นภาษาไทย ให้ตอบเป็นภาษาไทย

[ความสามารถหลัก]
- เข้าถึงฐานข้อมูลของระบบได้ (Roster, Sales, Labor, Borrow Tracker)
- วิเคราะห์ข้อมูล สรุปรายงาน ทำ visualization
- ออกแบบและพัฒนาเว็บไซต์
- เขียนบทความ สรุป และรายงานเชิงลึก
- วิเคราะห์ยอดขาย ข้อมูลธุรกิจ

[หลักการทำงาน]
- ถ้าเป็นงานเทคนิค ให้อธิบาย pseudocode ก่อนเสมอ
- เสนอการปรับปรุงที่มีเหตุผลชัดเจน
- ตอบกระชับ ตรงประเด็น ไม่เยิ่นเย้อ
- ถ้าไม่แน่ใจ ให้ถามก่อนทำ

[บริบทฐานข้อมูล]
คุณสามารถช่วยดูข้อมูลในตารางต่อไปนี้:
1. users: ข้อมูลพนักงานและสิทธิ์
2. shifts: ตารางเวรพนักงาน
3. dailySalesReports: รายงานยอดขายรายวัน
4. borrow_transactions: ข้อมูลการยืมคืนของระหว่างสาขา
5. labor_settings & daily_labor: ข้อมูลต้นทุนแรงงาน

ผู้ใช้ปัจจุบัน: ${user.nickName || user.fullName} (${user.role})

ข้อมูลปัจจุบันในระบบ (Snapshot):
${JSON.stringify(await storage.getTableList(), null, 2)}`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      if (history && Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          if (msg.role === "user" || msg.role === "assistant") {
            const sanitizedContent = typeof msg.content === "string" ? msg.content.slice(0, 2000) : "";
            messages.push({ role: msg.role, content: sanitizedContent });
          }
        }
      }

      const userContent = typeof message === "string" ? message.slice(0, 2000) : "";
      messages.push({ role: "user", content: userContent });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_completion_tokens: 2048,
        tools: [
          {
            type: "function",
            function: {
              name: "getTableRows",
              description: "Get data from a specific table in the database",
              parameters: {
                type: "object",
                properties: {
                  tableName: {
                    type: "string",
                    enum: ["users", "shifts", "daily_sales_reports", "borrow_transactions", "daily_labor"],
                    description: "The name of the table to read"
                  },
                  limit: {
                    type: "number",
                    description: "Number of rows to return (max 100)",
                    default: 50
                  }
                },
                required: ["tableName"]
              }
            }
          }
        ]
      });

      const toolCalls = response.choices[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if ((toolCall as any).function?.name === "getTableRows") {
            const args = JSON.parse((toolCall as any).function.arguments);
            const tableData = await storage.getTableRows(args.tableName, args.limit);
            messages.push(response.choices[0].message);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(tableData)
            });
          }
        }

        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
        });

        const secondReply = secondResponse.choices[0]?.message?.content || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
        return res.json({ ok: true, reply: secondReply });
      }

      const reply = response.choices[0]?.message?.content || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
      res.json({ ok: true, reply });
    } catch (e: any) {
      console.error("Chann AI error:", e);
      res.json({ ok: false, message: e.message || "AI error" });
    }
  });

  // ==========================================
  // 🔧 System & Auth
  // ==========================================

  // Ping
  app.post(api.system.ping.path, async (req, res) => {
    const cfg = await storage.getConfig();
    res.json({ ok: true, ts: new Date().toISOString(), closed: isSystemClosed(cfg), branch: process.env.BRANCH_NAME || "Grand Diamond" });
  });

  // Setup
  app.post(api.system.setup.path, async (req, res) => {
    const cfg = await storage.getConfig();
    for (const k of Object.keys(DEFAULT_CAPACITY)) {
      if (!("cap_" + k in cfg)) await storage.setConfig("cap_" + k, String(DEFAULT_CAPACITY[k as keyof typeof DEFAULT_CAPACITY]));
    }

    if (!await storage.getUser("admin")) {
      await storage.createUser({ username: "admin", passhash: hashPass("1234"), role: "admin", fullName: "Admin", nickName: "", phone: "", email: "", position: "Admin", active: 1, createdAt: new Date().toISOString() });
    }
    if (!await storage.getUser("manager")) {
      await storage.createUser({ username: "manager", passhash: hashPass("1234"), role: "manager", fullName: "Manager", nickName: "", phone: "", email: "", position: "store_manager", active: 1, createdAt: new Date().toISOString() });
    }
    if (!await storage.getUser("staff")) {
      await storage.createUser({ username: "staff", passhash: hashPass("1234"), role: "staff", fullName: "Staff", nickName: "", phone: "", email: "", position: "Service Staff", active: 1, createdAt: new Date().toISOString() });
    }
    if (!await storage.getUser("devstaff")) {
      await storage.createUser({ username: "devstaff", passhash: hashPass("dev1234"), role: "staff", fullName: "Developer Mode", nickName: "Dev", phone: "", email: "", position: "Developer", active: 1, createdAt: new Date().toISOString() });
    }

    await storage.log("setup_ok", "system", "setup completed");
    res.json({ ok: true, message: "setup ok" });
  });

  // Auth: Login
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password, developerMode } = req.body;
    if (!username || !password) return res.json({ ok: false, message: "กรอกให้ครบ" });

    const u = await storage.getUser(username);
    const cfg = await storage.getConfig();

    const isCreator = u && (u.username.toLowerCase().includes("chan") || (u.fullName && u.fullName.toLowerCase().includes("chanon")));
    const isAdmin = u && u.role === "admin";
    const isManager = u && (u.role === "manager" || u.role === "admin");

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
    if (isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้ / System closed" });
    const { username, fullName, email, phone, password, confirmPassword } = req.body;
    if (!username || !fullName || !email || !phone || !password) return res.json({ ok: false, message: "กรุณากรอกข้อมูลให้ครบ / Fill all fields" });
    if (password !== confirmPassword) return res.json({ ok: false, message: "รหัสผ่านไม่ตรงกัน / Passwords do not match" });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ ok: false, message: "Username ต้องเป็นตัวอักษร/ตัวเลข/_ เท่านั้น" });
    
    const existing = await storage.getUser(username.toLowerCase());
    if (existing) return res.json({ ok: false, message: "Username นี้ถูกใช้แล้ว / Username taken" });

    await storage.createUser({
      username: username.toLowerCase(), passhash: hashPass(password), role: "staff",
      fullName, nickName: "", phone, email, position: "Service Staff", active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_staff", username.toLowerCase(), "fullName=" + fullName);
    res.json({ ok: true, username: username.toLowerCase() });
  });

  // Register Manager
  app.post(api.auth.registerManager.path, async (req, res) => {
    const cfg = await storage.getConfig();
    if (isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้ / System closed" });
    const { username, fullName, email, phone, password, confirmPassword, verifyCode } = req.body;
    if (String(verifyCode || "").trim().toLowerCase() !== MANAGER_VERIFY_CODE) return res.json({ ok: false, message: "รหัสยืนยันไม่ถูก / Invalid code" });
    if (!username || !fullName || !email || !phone || !password) return res.json({ ok: false, message: "กรุณากรอกข้อมูลให้ครบ / Fill all fields" });
    if (password !== confirmPassword) return res.json({ ok: false, message: "รหัสผ่านไม่ตรงกัน / Passwords do not match" });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ ok: false, message: "Username ต้องเป็นตัวอักษร/ตัวเลข/_ เท่านั้น" });
    
    const existing = await storage.getUser(username.toLowerCase());
    if (existing) return res.json({ ok: false, message: "Username นี้ถูกใช้แล้ว / Username taken" });

    await storage.createUser({
      username: username.toLowerCase(), passhash: hashPass(password), role: "manager",
      fullName, nickName: "", phone, email, position: "store_manager", active: 1, createdAt: new Date().toISOString()
    });
    await storage.log("register_manager", username.toLowerCase(), `fullName=${fullName}, position=store_manager`);
    res.json({ ok: true, username: username.toLowerCase() });
  });

  // Complete Profile
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

  // Auth: Force Change Password
  app.post("/api/forceChangePassword", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.json({ ok: false, message: "Token and new password required" });
      }

      const session = await storage.getSession(token);
      if (!session) {
        return res.json({ ok: false, message: "Invalid session" });
      }

      await storage.updateUserPassword(session.username, hashPass(newPassword));
      await storage.updateUser(session.username, { mustChangePassword: 0 as any });
      await storage.log("password_change_forced", session.username, "success");

      res.json({ ok: true, message: "Password updated successfully" });
    } catch (e: any) {
      console.error("Force change password error:", e);
      res.json({ ok: false, message: e.message || "Failed to update password" });
    }
  });

  // Auth: Request Password Reset (send OTP via email)
  app.post(api.auth.requestPasswordReset.path, async (req, res) => {
    const parsed = api.auth.requestPasswordReset.input.safeParse(req.body);
    if (!parsed.success) {
      return res.json({ ok: false, message: "กรุณากรอกข้อมูลให้ถูกต้อง / Please enter valid information" });
    }
    const { username, email } = parsed.data;

    // Find user by both username AND email (must match)
    const allUsers = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.email, email)
      )
    );
    
    const now = Math.floor(Date.now() / 1000);
    const recentOtps = await db.select()
      .from(passwordResetOtps)
      .where(and(
        eq(passwordResetOtps.email, email),
        sql`${passwordResetOtps.createdAt} > ${new Date(Date.now() - 60000).toISOString()}`
      ));
    
    if (recentOtps.length > 0) {
      return res.json({ ok: false, message: "กรุณารอ 1 นาทีก่อนขอรหัสใหม่ / Please wait 1 minute before requesting again" });
    }

    if (allUsers.length === 0) {
      return res.json({ ok: true, message: "หากอีเมลนี้มีในระบบ คุณจะได้รับ OTP / If this email exists, you will receive an OTP" });
    }

    const user = allUsers[0];
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpSalt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(otp + otpSalt).digest('hex');
    const expiresAt = now + (10 * 60);

    await db.update(passwordResetOtps)
      .set({ used: 1 })
      .where(and(
        eq(passwordResetOtps.email, email),
        eq(passwordResetOtps.used, 0)
      ));

    await db.insert(passwordResetOtps).values({
      email,
      username: user.username,
      otp: otpHash,
      otpSalt,
      expiresAt,
      used: 0,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    const { sendOtpEmail } = await import('./resend');
    const displayName = user.nickName || user.fullName || user.username;
    const sent = await sendOtpEmail(email, otp, displayName, user.username);
    
    if (!sent) {
      return res.json({ ok: false, message: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ / Failed to send email" });
    }

    await storage.log("password_reset_request", user.username, `otp sent to ${email}`);
    res.json({ ok: true, message: "หากอีเมลนี้มีในระบบ คุณจะได้รับ OTP / If this email exists, you will receive an OTP" });
  });

  // Auth: Verify OTP
  app.post(api.auth.verifyOtp.path, async (req, res) => {
    const parsed = api.auth.verifyOtp.input.safeParse(req.body);
    if (!parsed.success) {
      return res.json({ ok: false, message: "ข้อมูลไม่ครบหรือไม่ถูกต้อง / Missing or invalid data" });
    }
    const { email, otp } = parsed.data;

    const now = Math.floor(Date.now() / 1000);
    
    const otpRecords = await db.select()
      .from(passwordResetOtps)
      .where(and(
        eq(passwordResetOtps.email, email),
        eq(passwordResetOtps.used, 0)
      ))
      .orderBy(desc(passwordResetOtps.id))
      .limit(1);

    if (otpRecords.length === 0) {
      return res.json({ ok: false, message: "รหัส OTP ไม่ถูกต้อง / Invalid OTP" });
    }

    const otpRecord = otpRecords[0];
    
    if (otpRecord.attempts >= 5) {
      await db.update(passwordResetOtps)
        .set({ used: 1 })
        .where(eq(passwordResetOtps.id, otpRecord.id));
      return res.json({ ok: false, message: "ลองผิดหลายครั้ง กรุณาขอรหัสใหม่ / Too many attempts, please request new OTP" });
    }

    const otpHash = crypto.createHash('sha256').update(otp + otpRecord.otpSalt).digest('hex');
    if (otpRecord.otp !== otpHash) {
      await db.update(passwordResetOtps)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(passwordResetOtps.id, otpRecord.id));
      return res.json({ ok: false, message: "รหัส OTP ไม่ถูกต้อง / Invalid OTP" });
    }

    if (otpRecord.expiresAt < now) {
      return res.json({ ok: false, message: "รหัส OTP หมดอายุแล้ว / OTP expired" });
    }

    const resetToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const resetExpiresAt = now + (15 * 60);

    await db.update(passwordResetOtps)
      .set({ 
        used: 1,
        resetToken,
        expiresAt: resetExpiresAt
      })
      .where(eq(passwordResetOtps.id, otpRecord.id));
    
    res.json({ ok: true, resetToken, message: "OTP ถูกต้อง / OTP verified" });
  });

  // Auth: Reset Password
  app.post(api.auth.resetPassword.path, async (req, res) => {
    const parsed = api.auth.resetPassword.input.safeParse(req.body);
    if (!parsed.success) {
      return res.json({ ok: false, message: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร / Password must be at least 4 characters" });
    }
    const { resetToken, newPassword } = parsed.data;

    const now = Math.floor(Date.now() / 1000);
    
    const otpRecords = await db.select()
      .from(passwordResetOtps)
      .where(and(
        eq(passwordResetOtps.resetToken, resetToken),
        eq(passwordResetOtps.used, 1)
      ))
      .limit(1);

    if (otpRecords.length === 0) {
      return res.json({ ok: false, message: "ลิงก์หมดอายุแล้ว กรุณาขอใหม่ / Link expired, please request again" });
    }

    const otpRecord = otpRecords[0];
    
    if (otpRecord.expiresAt < now) {
      await db.update(passwordResetOtps)
        .set({ resetToken: null })
        .where(eq(passwordResetOtps.id, otpRecord.id));
      return res.json({ ok: false, message: "ลิงก์หมดอายุแล้ว กรุณาขอใหม่ / Link expired, please request again" });
    }

    await db.update(users)
      .set({ passhash: hashPass(newPassword), mustChangePassword: 0 })
      .where(eq(users.username, otpRecord.username));

    await db.update(passwordResetOtps)
      .set({ resetToken: null })
      .where(eq(passwordResetOtps.id, otpRecord.id));
      
    await storage.log("password_reset_success", otpRecord.username, "password changed via OTP");
    
    res.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ / Password changed successfully" });
  });

  // ==========================================
  // ⚙️ Settings & Config
  // ==========================================

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

    if (lockTimePeriod !== undefined) await storage.setConfig("lock_time_period", String(lockTimePeriod));

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

  // ==========================================
  // 📅 Shifts
  // ==========================================

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

  app.post(api.shifts.getMyMonth.path, async (req, res) => {
    const { token, month, year } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const shifts = await storage.getShiftsInRange(startDate, endDate);
    const myShifts = shifts.filter(s => s.username === u.username);

    res.json({ ok: true, month, year, shifts: myShifts });
  });

  app.post(api.shifts.getManagerTeamMonth.path, async (req, res) => {
    const { token, month, year } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (u.role !== "manager" && u.role !== "admin") return res.json({ ok: false, message: "Permission denied" });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const allUsers = await storage.getUsers();
    const managers = allUsers.filter(user => (user.role === "manager" || user.role === "admin") && user.active === 1);
    const shifts = await storage.getShiftsInRange(startDate, endDate);
    const managerUsernames = managers.map(m => m.username);
    const managerShifts = shifts.filter(s => managerUsernames.includes(s.username));

    res.json({ 
      ok: true, 
      month, year, 
      managers: managers.map(m => ({ username: m.username, fullName: m.fullName, fullNameTh: m.fullNameTh, nickName: m.nickName, position: m.position, role: m.role })),
      shifts: managerShifts 
    });
  });

  app.post(api.shifts.book.path, async (req, res) => {
    const { token, date, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false });

    const cfg = await storage.getConfig();
    const isManager = u.role === "admin" || u.role === "manager";
    if (!isManager && isSystemClosed(cfg)) return res.json({ ok: false, message: "ระบบปิดช่วงนี้ (System maintenance in progress)" });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ ok: false, message: "Date invalid" });
    const grp = SHIFT_GROUPS.find(g => g.key === shiftGroup);
    if (!grp) return res.json({ ok: false, message: "Shift group invalid" });

    let finalStartTime = startTime;
    if (!finalStartTime || finalStartTime === "") finalStartTime = grp.main || grp.windowStart;

    const shiftsOnDate = await storage.getShiftsInRange(date, date);
    const count = shiftsOnDate.filter(s => s.shiftGroup === shiftGroup).length;
    const cap = Number(cfg["cap_" + shiftGroup] || DEFAULT_CAPACITY[shiftGroup as keyof typeof DEFAULT_CAPACITY]);

    const existing = await storage.getShift(u.username, date);
    if (!existing) {
       if (count >= cap) return res.json({ ok: false, message: "เต็มแล้ว (Full)" });
    } else if (existing.shiftGroup !== shiftGroup) {
       if (count >= cap) return res.json({ ok: false, message: "เต็มแล้ว (Full)" });
    }

    await storage.upsertShift({
      date, username: u.username, fullName: u.fullName, role: u.role, nickName: u.nickName,
      shiftGroup, startTime, endTime: "", note: note || "", 
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: u.username
    });
    await storage.log("book_shift", u.username, `${date} ${shiftGroup}`);
    res.json({ ok: true });
  });

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

  // ==========================================
  // 👤 User Management & Admin
  // ==========================================

  app.post("/api/updateProfile", async (req, res) => {
    const { token, fullName, nickName, phone, email } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const updateData: Record<string, string> = {};
    if (fullName !== undefined && fullName !== "") updateData.fullName = fullName;
    if (nickName !== undefined && nickName !== "") updateData.nickName = nickName;
    if (phone !== undefined && phone !== "") updateData.phone = phone;
    if (email !== undefined && email !== "") updateData.email = email;

    if (Object.keys(updateData).length === 0) return res.json({ ok: true, user: u });

    const [updated] = await db.update(users).set(updateData).where(eq(users.username, u.username)).returning();
    res.json({ ok: true, user: updated });
  });

  app.post("/api/updateProfilePicture", async (req, res) => {
    const { token, profilePicture } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (!profilePicture || typeof profilePicture !== "string") return res.json({ ok: false, message: "Invalid profile picture" });
    const headerRegex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!headerRegex.test(profilePicture)) return res.json({ ok: false, message: "Invalid image format. Only JPEG, PNG, GIF, WEBP allowed." });

    const base64Data = profilePicture.split(",")[1] || "";
    if ((base64Data.length * 3) / 4 > 2 * 1024 * 1024) return res.json({ ok: false, message: "File too large. Maximum size is 2MB." });

    const [updated] = await db.update(users).set({ profilePicture }).where(eq(users.username, u.username)).returning();
    await storage.log("update_profile_picture", u.username, "profile picture updated");
    res.json({ ok: true, user: updated });
  });

  app.post("/api/changePassword", async (req, res) => {
    const { token, currentPassword, newPassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (hashPass(currentPassword) !== u.passhash) return res.json({ ok: false, message: "Current password incorrect" });

    await db.update(users).set({ passhash: hashPass(newPassword), mustChangePassword: 0 }).where(eq(users.username, u.username));
    await storage.log("change_password", u.username, "password updated");
    res.json({ ok: true });
  });

  app.post("/api/forceChangePassword", async (req, res) => {
    const { token, newPassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    if (u.mustChangePassword !== 1) return res.json({ ok: false, message: "Not required to change password" });

    await db.update(users).set({ passhash: hashPass(newPassword), mustChangePassword: 0 }).where(eq(users.username, u.username));
    await storage.log("force_change_password", u.username, "first-time password updated");
    res.json({ ok: true });
  });

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

  app.post("/api/admin/deleteUser", async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });
    if (targetUser.role === "admin" && u.role !== "admin") return res.json({ ok: false, message: "Cannot delete admin" });
    if (username === u.username) return res.json({ ok: false, message: "Cannot delete yourself" });

    await db.delete(users).where(eq(users.username, username));
    await storage.log("delete_user", u.username, `deleted ${username}`);
    res.json({ ok: true });
  });

  app.post("/api/admin/resignUser", async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });
    if (username === u.username) return res.json({ ok: false, message: "Cannot resign yourself" });

    await db.update(users).set({ active: 2 }).where(eq(users.username, username));
    await storage.log("resign_user", u.username, `marked ${username} as resigned`);
    res.json({ ok: true });
  });

  const positionHierarchy: Record<string, number> = {
    "admin": 0, "store_manager": 1, "assistant_store_manager": 2, "shift_manager": 3, "management_trainee": 4, "staff": 5,
  };

  const getUserRank = (user: any): number => {
    if (user.role === "admin") return 0;
    if (user.role === "manager") return positionHierarchy[user.position] || 5;
    return 5;
  };

  const canManageUsers = (user: any) => {
    if (user.role === "admin") return true;
    if (user.role === "manager" && user.position === "store_manager") return true;
    return false;
  };

  const canCreateProfile = (creator: any, targetRole: string, targetPosition?: string): boolean => {
    const creatorRank = getUserRank(creator);
    if (creator.role === "admin") return true;
    if (creator.role === "manager" && creator.position === "store_manager") {
      if (targetRole === "admin") return false;
      return true;
    }
    if (creator.role === "manager") {
      if (targetRole === "admin") return false;
      if (targetRole === "staff") return true;
      if (targetRole === "manager" && targetPosition) {
        const targetRank = positionHierarchy[targetPosition] || 5;
        return targetRank > creatorRank;
      }
    }
    return false;
  };

  app.post("/api/admin/createProfile", async (req, res) => {
    const { token, fullName, fullNameTh, password, role, position, nickName, phone, email, mustChangePassword } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || u.role === "staff") return res.json({ ok: false, message: "No permission" });

    if (!fullName || !password) return res.json({ ok: false, message: "Full name and password required" });
    if (!canCreateProfile(u, role, position)) return res.json({ ok: false, message: "Cannot create profile with higher or equal rank" });

    const base = generateUsernameBase(fullName);
    const username = await allocateUsername(base, async (un) => !!(await storage.getUser(un)));
    if (!username) return res.json({ ok: false, message: "Cannot create username" });

    await storage.createUser({
      username, passhash: hashPass(password), role: role || "staff", fullName, fullNameTh: fullNameTh || "",
      nickName: nickName || "", phone: phone || "", email: email || "",
      position: role === "manager" ? (position || "store_manager") : "Service Staff",
      active: 1, mustChangePassword: mustChangePassword ? 1 : 0, createdAt: new Date().toISOString()
    });

    await storage.log("create_profile", u.username, `created ${username} role=${role} position=${position || "none"}`);
    res.json({ ok: true, username });
  });

  app.post("/api/admin/updateUserRole", async (req, res) => {
    const { token, username, role, position } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !canManageUsers(u)) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });
    if (u.role !== "admin" && role === "admin") return res.json({ ok: false, message: "Only Admin can set Admin role" });
    if (u.role !== "admin" && targetUser.role === "admin") return res.json({ ok: false, message: "Cannot modify Admin users" });

    await storage.updateUserRole(username, role, position);
    await storage.log("update_user_role", u.username, `set ${username} role=${role} position=${position || "none"}`);
    res.json({ ok: true });
  });

  app.post("/api/admin/getUsers", async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || u.role === "staff") return res.json({ ok: false, message: "No permission" });

    const allUsers = await storage.getUsers();
    res.json({ ok: true, users: allUsers.map(user => ({ ...user, passhash: undefined })), creatorRank: getUserRank(u), canManageAll: canManageUsers(u) });
  });

  app.post("/api/admin/updateUserProfile", async (req, res) => {
    const { token, username, nickName, phone, email, position } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || u.role !== "admin") return res.json({ ok: false, message: "Only Admin can edit user profile" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    const updates: Record<string, any> = {};
    if (nickName !== undefined) updates.nickName = nickName;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (position !== undefined) updates.position = position;

    if (Object.keys(updates).length === 0) {
      return res.json({ ok: false, message: "No updates provided" });
    }

    await storage.updateUser(username, updates);
    await storage.log("admin_update_profile", u.username, `updated ${username}: ${JSON.stringify(updates)}`);
    res.json({ ok: true });
  });

  // ==========================================
  // 📋 Shifts Management (Admin/Manager)
  // ==========================================

  app.post(api.shifts.setForUser.path, async (req, res) => {
    const { token, username, date, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const targetUser = await storage.getUser(username);
    if (!targetUser) return res.json({ ok: false, message: "User not found" });

    await storage.upsertShift({
      date, username: targetUser.username, fullName: targetUser.fullName, role: targetUser.role, nickName: targetUser.nickName,
      shiftGroup, startTime, endTime: "", note: note || "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: u.username
    });
    await storage.log("manager_set_shift", u.username, `for ${username} on ${date}`);
    res.json({ ok: true });
  });

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
  
  app.post("/api/deleteShiftsForWeek", async (req, res) => {
    const { token, days } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    if (!days || !Array.isArray(days) || days.length === 0) {
      return res.json({ ok: false, message: "No days specified" });
    }

    try {
      const deleted = await db.delete(shifts).where(inArray(shifts.date, days));
      await storage.log("manager_delete_week_shifts", u.username, `days=${days.join(",")}`);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: "Failed to delete" });
    }
  });

  app.post("/api/updateShift", async (req, res) => {
    const { token, shiftId, shiftGroup, startTime, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      await db.update(shifts).set({ shiftGroup, startTime, note: note || "", updatedAt: new Date().toISOString(), updatedBy: u.username }).where(eq(shifts.id, shiftId));
      await storage.log("manager_update_shift", u.username, `shiftId=${shiftId}`);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: "Failed to update" });
    }
  });

  app.post(api.shifts.swap.path, async (req, res) => {
    const { token, myDate, targetUsername, targetDate } = req.body;
      if (!token || !myDate || !targetDate || !targetUsername) return res.json({ ok: false, message: "Missing fields" });

    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const me = await storage.getUser(session.username);
    if (!me) return res.json({ ok: false, message: "User not found" });

    const target = await storage.getUser(String(targetUsername).toLowerCase().trim());
    if (!target) return res.json({ ok: false, message: "Target user not found" });

    if (me.username === target.username) return res.json({ ok: false, message: "Cannot swap with yourself" });
    if (me.role !== "staff" || target.role !== "staff") return res.json({ ok: false, message: "Swap allowed for staff only" });

    const myShift = await storage.getShift(me.username, myDate);
    if (!myShift) return res.json({ ok: false, message: "You have no shift on the selected date" });
    const targetShift = await storage.getShift(target.username, targetDate);
    if (!targetShift) return res.json({ ok: false, message: "Target has no shift on the selected date" });

    const now = new Date().toISOString();
    await storage.createSwapRequest({
      requesterUsername: me.username, requesterDate: myDate, targetUsername: target.username, targetDate: targetDate,
      status: "pending", createdAt: now, updatedAt: now,
    });

    await storage.log("swap_request", me.username, `request swap ${me.username}:${myDate} <-> ${target.username}:${targetDate}`);
    return res.json({ ok: true, message: "Swap request submitted for manager approval" });
  });

  app.post(api.shifts.getSwapRequests.path, async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isManager = u.role === "admin" || u.role === "manager";
    const requests = await storage.getSwapRequests(isManager ? "pending" : undefined);
    const filteredRequests = isManager ? requests : requests.filter(r => r.requesterUsername === u.username || r.targetUsername === u.username);
    res.json({ ok: true, requests: filteredRequests });
  });

  app.post(api.shifts.approveSwap.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const request = await storage.getSwapRequestById(requestId);
    if (!request || request.status !== "pending") return res.json({ ok: false, message: "Request invalid" });

    try {
      await transaction(async (tx) => {
        const [requesterShift] = await tx.select().from(shifts).where(and(eq(shifts.username, request.requesterUsername), eq(shifts.date, request.requesterDate))).limit(1);
        if (!requesterShift) throw new Error("Requester shift not found");
        const [targetShift] = await tx.select().from(shifts).where(and(eq(shifts.username, request.targetUsername), eq(shifts.date, request.targetDate))).limit(1);
        if (!targetShift) throw new Error("Target shift not found");

        const now = new Date().toISOString();
        await updateShiftById(tx, requesterShift.id, { date: request.targetDate, updatedAt: now, updatedBy: u.username });
        await updateShiftById(tx, targetShift.id, { date: request.requesterDate, updatedAt: now, updatedBy: u.username });
      });

      await storage.updateSwapRequestStatus(requestId, "approved", u.username);
      await storage.log("approve_swap", u.username, `approved swap #${requestId}`);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.json({ ok: false, message: e?.message || "Swap failed" });
    }
  });

  app.post(api.shifts.rejectSwap.path, async (req, res) => {
    const { token, requestId, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const request = await storage.getSwapRequestById(requestId);
    if (!request || request.status !== "pending") return res.json({ ok: false, message: "Request invalid" });

    await storage.updateSwapRequestStatus(requestId, "rejected", u.username, note);
    await storage.log("reject_swap", u.username, `rejected swap #${requestId}`);
    return res.json({ ok: true });
  });

  app.post(api.shifts.getUserProfile.path, async (req, res) => {
    const { token, username } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(username);
    if (!u) return res.json({ ok: false, message: "User not found" });
    res.json({ ok: true, user: { fullName: u.fullName || "", nickName: u.nickName || "", phone: u.phone || "", email: u.email || "", position: u.position || "Staff" } });
  });

  // ==========================================
  // 📊 Sales & Reports
  // ==========================================

  app.post(api.sales.createReport.path, async (req, res) => {
    const { token, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      const created = await storage.createDailySalesReport(report);
      await storage.log("create_sales_report", u.username, `date=${report.reportDate}`);
      res.json({ ok: true, report: created });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to create report" });
    }
  });

  app.post(api.sales.getReport.path, async (req, res) => {
    const { token, id } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const report = await storage.getDailySalesReport(id);
    if (!report) return res.json({ ok: false, message: "Report not found" });
    res.json({ ok: true, report });
  });

  app.post(api.sales.getReports.path, async (req, res) => {
    const { token, date, limit } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const reports = await storage.getDailySalesReports(date, limit);
    res.json({ ok: true, reports });
  });

  app.post(api.sales.updateReport.path, async (req, res) => {
    const { token, id, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      const updated = await storage.updateDailySalesReport(id, report);
      await storage.log("update_sales_report", u.username, `id=${id}`);
      res.json({ ok: true, report: updated });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update report" });
    }
  });

  app.post(api.sales.deleteReport.path, async (req, res) => {
    const { token, id } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    const deleted = await storage.deleteDailySalesReport(id);
    if (!deleted) return res.json({ ok: false, message: "Report not found" });
    await storage.log("delete_sales_report", u.username, `id=${id}`);
    res.json({ ok: true });
  });

  app.post(api.sales.upsertReportByDate.path, async (req, res) => {
    const { token, report } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      const saved = await storage.upsertDailySalesReportByDate(report);
      res.json({ ok: true, report: saved });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save report" });
    }
  });

  app.post(api.sales.getReportByDate.path, async (req, res) => {
    const { token, date } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const report = await storage.getDailySalesReportByDate(date);
    res.json({ ok: true, report: report || null });
  });

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

  app.post(api.sales.getSettings.path, async (req, res) => {
    const { token } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const settings = await storage.getStoreSettings();
    res.json({ ok: true, settings });
  });

  app.post(api.sales.updateSettings.path, async (req, res) => {
    const { token, settings } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });

    try {
      const updated = await storage.updateStoreSettings(settings);
      await storage.log("update_store_settings", u.username, "settings updated");
      res.json({ ok: true, settings: updated });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update settings" });
    }
  });

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

  app.post(api.sales.saveDailyTargets.path, async (req, res) => {
    const { token, targets } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });
    try {
      await storage.bulkUpsertDailyTargets(targets);
      await storage.log("save_daily_targets", u.username, `count=${targets.length}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save daily targets" });
    }
  });

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

  // Sales History for Dashboard Chart (Manager/Admin only)
  app.post("/api/sales/history", async (req, res) => {
    const { token, days = 7 } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) {
      return res.json({ ok: false, message: "No permission" });
    }
    
    try {
      const salesData = await storage.getDailySalesReports(undefined, days);
      const formattedData = salesData
        .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
        .map(item => ({
          reportDate: item.reportDate,
          actual_sales: Number(item.actualSales || 0),
          transaction_count: Number(item.transactionCount || 0)
        }));
      res.json({ ok: true, data: formattedData });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get sales history" });
    }
  });

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

  app.post(api.sales.saveWasteTargets.path, async (req, res) => {
    const { token, year, month, wasteTarget } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || !(u.role === "admin" || u.role === "manager")) return res.json({ ok: false, message: "No permission" });
    try {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      await storage.upsertWasteTarget(targetMonth, wasteTarget);
      await storage.log("save_waste_targets", u.username, `month=${targetMonth}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to save waste targets" });
    }
  });

  app.post(api.sales.saveDailySalesData.path, async (req, res) => {
    const { token, salesData } = req.body;
    if (!token || !salesData) return res.json({ ok: false, message: "Missing data" });
    if (!Array.isArray(salesData)) return res.json({ ok: false, message: "Invalid data format" });

    try { // <--- [1] TRY OPENS
      const session = await storage.getSession(token);
      if (!session) return res.json({ ok: false, message: "Session expired" });

      const u = await storage.getUser(session.username);
      if (!u || !(u.role === "admin" || u.role === "manager")) {
        return res.json({ ok: false, message: "No permission" });
      }

      for (const data of salesData) {
        if (!data.reportDate) continue; 

        await storage.upsertDailySalesReportByDate({
          reportDate: data.reportDate,
          reportBy: u.nickName || u.fullName || u.username,
          workShift: "full",
          actualSales: String(data.actualSales ?? "0"),
          transactionCount: String(data.transactionCount ?? "0"),
          recommendHours: String(data.recommendHours ?? "0"),
          rosterCommit: String(data.rosterCommit ?? "0"),
          actualHours: String(data.actualHours ?? "0"),
          otHours: String(data.otHours ?? "0"),
          wasteRawDaily: String(data.wasteDaily ?? "0"),
        } as any); 
      } // <--- [2] FOR LOOP ENDS

      await storage.log("save_daily_sales_data", u.username, `count=${salesData.length}`);
      res.json({ ok: true });

    } catch (e: any) { 
      console.error("Save Sales Error:", e);
      res.json({ ok: false, message: e?.message || "Failed" });
    } // <--- [4] CATCH ENDS
  }); 
  // ==================== Manager Requests ====================

  app.post(api.managerRequests.create.path, async (req, res) => {
    const { token, requestType, requestDate, startTime, endTime, dayOffReason, note } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u || (u.role !== "manager" && u.role !== "admin")) return res.json({ ok: false, message: "Only managers can create requests" });

    if (!requestType || !requestDate) return res.json({ ok: false, message: "Request type and date are required" });

    if (requestType === "select_work_time") {
      const dateParts = requestDate.split("-");
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const count = await storage.getSelectWorkTimeCountForMonth(u.username, year, month);
      if (count >= 2) return res.json({ ok: false, message: "คุณเลือกเวลาเข้างานครบ 2 ครั้งแล้วในเดือนนี้" });
    }

    try {
      const now = new Date().toISOString();
      const request = await storage.createManagerRequest({
        requestType, requestDate, requestedBy: u.username,
        startTime: startTime || null, endTime: endTime || null, dayOffReason: dayOffReason || null, note: note || null,
        status: "pending", createdAt: now, updatedAt: now,
      });
      await storage.log("manager_request_create", u.username, `type=${requestType} date=${requestDate}`);
      res.json({ ok: true, request });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to create request" });
    }
  });

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

  app.post(api.managerRequests.getAllRequests.path, async (req, res) => {
    const { token, status } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) return res.json({ ok: false, message: "Only Admin or Store Manager can view all requests" });

    try {
      const requests = await storage.getAllManagerRequests(status);
      res.json({ ok: true, requests });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to get requests" });
    }
  });

  app.post(api.managerRequests.approve.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) return res.json({ ok: false, message: "Only Admin or Store Manager can approve requests" });

    try {
      await storage.updateManagerRequestStatus(requestId, "approved", u.username);
      await storage.log("manager_request_approve", u.username, `requestId=${requestId}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to approve request" });
    }
  });

  app.post(api.managerRequests.reject.path, async (req, res) => {
    const { token, requestId, reason } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });
    const u = await storage.getUser(session.username);
    if (!u) return res.json({ ok: false, message: "User not found" });

    const isAdmin = u.role === "admin";
    const isStoreManager = u.role === "manager" && u.position === "store_manager";
    if (!isAdmin && !isStoreManager) return res.json({ ok: false, message: "Only Admin or Store Manager can reject requests" });

    try {
      await storage.updateManagerRequestStatus(requestId, "rejected", u.username, reason);
      await storage.log("manager_request_reject", u.username, `requestId=${requestId} reason=${reason}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to reject request" });
    }
  });

  app.post(api.managerRequests.delete.path, async (req, res) => {
    const { token, requestId } = req.body;
    const session = await storage.getSession(token);
    if (!session) return res.json({ ok: false, message: "Session expired" });

    const request = await storage.getManagerRequest(requestId);
    if (!request) return res.json({ ok: false, message: "Request not found" });
    if (request.requestedBy !== session.username) return res.json({ ok: false, message: "You can only delete your own requests" });
    if (request.status !== "pending") return res.json({ ok: false, message: "Can only delete pending requests" });

    try {
      await storage.deleteManagerRequest(requestId);
      await storage.log("manager_request_delete", session.username, `requestId=${requestId}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to delete request" });
    }
  });

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

  // ==========================================
  // 🔨 Developer Tools
  // ==========================================
  const DEV_CODE = "bk1040";

  const verifyDevAccess = async (token: string, devCode?: string): Promise<{ ok: boolean; user?: any; message?: string }> => {
    const session = await storage.getSession(token);
    if (!session) return { ok: false, message: "Session expired" };
    const u = await storage.getUser(session.username);
    if (!u) return { ok: false, message: "User not found" };
    if (u.role === "admin" || devCode === DEV_CODE) return { ok: true, user: u };
    return { ok: false, message: "Access denied - Admin or Dev Code required" };
  };

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

  app.post(api.devTools.resetPassword.path, async (req, res) => {
    const { token, devCode, username, newPassword } = req.body;

    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    try {
      // แนะนำ: ถ้าเป็นไปได้ควรย้าย import ไปไว้บรรทัดบนสุดของไฟล์
      const { hashPassword } = await import("./utils");

      // ✅ แก้ไข: เพิ่ม await ตรงนี้
      const passhash = await hashPassword(newPassword);

      await storage.updateUserPassword(username, passhash);
      await storage.log("dev_reset_password", access.user.username, `user=${username}`);

      res.json({ ok: true, message: `Password reset for ${username}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to reset password" });
    }
  });

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

  app.post(api.devTools.clearTestData.path, async (req, res) => {
    const { token, devCode, tableName } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);
    const allowedTables = ["shifts", "systemlog", "sessions", "swap_requests", "daily_sales_reports", "manager_requests"];
    if (!allowedTables.includes(tableName)) return res.json({ ok: false, message: `Cannot clear table: ${tableName}` });
    try {
      const count = await storage.clearTable(tableName);
      await storage.log("dev_clear_table", access.user.username, `table=${tableName} count=${count}`);
      res.json({ ok: true, count, message: `Cleared ${count} rows from ${tableName}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to clear table" });
    }
  });

  app.post(api.devTools.executeQuery.path, async (req, res) => {
    const { token, devCode, query } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);

    const cleanQuery = query.trim();
    const upperQuery = cleanQuery.toUpperCase();
    const noComments = upperQuery.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim();

    if (!noComments.startsWith("SELECT")) return res.json({ ok: false, message: "Only SELECT queries are allowed" });
    const dangerousPatterns = [/;.*\S/i, /\bDROP\b/i, /\bDELETE\b/i, /\bINSERT\b/i, /\bUPDATE\b/i, /\bTRUNCATE\b/i, /\bALTER\b/i, /\bCREATE\b/i, /\bGRANT\b/i, /\bREVOKE\b/i, /\bEXECUTE\b/i];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(cleanQuery)) return res.json({ ok: false, message: "Query contains disallowed keywords" });
    }

    try {
      const result = await storage.executeReadQuery(cleanQuery);
      await storage.log("dev_execute_query", access.user.username, cleanQuery.substring(0, 100));
      res.json({ ok: true, result });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Query failed" });
    }
  });

  app.post(api.devTools.bulkImportUsers.path, async (req, res) => {
    const { token, devCode, users: inputUsers } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);
    if (!Array.isArray(inputUsers) || inputUsers.length === 0) return res.json({ ok: false, message: "No users provided" });

    let imported = 0, failed = 0;
    const errors: string[] = [];
    const validRoles = ["staff", "manager", "admin"];

    for (const u of inputUsers) {
      try {
        if (!u.username || !u.password) { errors.push(`Missing username or password`); failed++; continue; }
        const username = u.username.toLowerCase().trim();
        if (!/^[a-z0-9._-]+$/.test(username)) { errors.push(`Invalid username: ${u.username}`); failed++; continue; }
        const existing = await storage.getUser(username);
        if (existing) { errors.push(`User ${username} already exists`); failed++; continue; }

        await storage.createUser({
          username, passhash: hashPass(u.password), role: validRoles.includes(u.role) ? u.role : "staff",
          fullName: typeof u.fullName === "string" ? u.fullName.trim() : null,
          nickName: typeof u.nickName === "string" ? u.nickName.trim() : null,
          phone: typeof u.phone === "string" ? u.phone.trim() : null,
          email: typeof u.email === "string" ? u.email.trim() : null,
          active: 1, mustChangePassword: 1, createdAt: new Date().toISOString(),
        });
        imported++;
      } catch (e: any) {
        errors.push(`Failed to import ${u.username}: ${e?.message}`);
        failed++;
      }
    }
    await storage.log("dev_bulk_import", access.user.username, `imported=${imported} failed=${failed}`);
    res.json({ ok: true, imported, failed, errors: errors.length > 0 ? errors : undefined, message: `Imported ${imported} users, ${failed} failed` });
  });

  app.post(api.devTools.updateUserProfile.path, async (req, res) => {
    const { token, devCode, username, updates } = req.body;
    const access = await verifyDevAccess(token, devCode);
    if (!access.ok) return res.json(access);
    if (!username || typeof username !== "string") return res.json({ ok: false, message: "Username is required" });

    try {
      const user = await storage.getUser(username);
      if (!user) return res.json({ ok: false, message: `User ${username} not found` });

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
      if (Object.keys(sanitizedUpdates).length === 0) return res.json({ ok: false, message: "No valid updates provided" });

      await storage.updateUser(username, sanitizedUpdates);
      await storage.log("dev_update_profile", access.user.username, `user=${username} updates=${JSON.stringify(sanitizedUpdates)}`);
      res.json({ ok: true, message: `Profile updated for ${username}` });
    } catch (e: any) {
      res.json({ ok: false, message: e?.message || "Failed to update profile" });
    }
  });

  // ==========================================
  // 📦 Borrow Tracker (Using Direct DB)
  // ==========================================

  // Get Branches
  app.post("/api/borrow/branches", async (req, res) => {
    try {
      const { token } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      const branches = await db.select().from(borrowBranches).where(eq(borrowBranches.isActive, 1));
      res.json({ ok: true, branches });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Add Branch
  app.post("/api/borrow/branches/add", async (req, res) => {
    try {
      const { token, name, code } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      
      const id = `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.insert(borrowBranches).values({
        id,
        name,
        code: code || "",
        isActive: 1
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Delete Branch
  app.post("/api/borrow/branches/delete", async (req, res) => {
    try {
      const { token, id } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      await db.delete(borrowBranches).where(eq(borrowBranches.id, id));
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Import Branches (Excel)
  app.post("/api/borrow/branches/import", upload.single("file"), async (req, res) => {
    try {
      const token = req.body.token;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      if (!req.file) return res.json({ ok: false, message: "No file" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(sheet);

      let imported = 0;
      for (const row of data) {
        const name = row['Branch Name'] || row['name'] || row['Name'];
        const code = row['Branch Code'] || row['code'] || row['Code'] || "";
        if (name) {
          const id = `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await db.insert(borrowBranches).values({
            id,
            name: String(name).trim(),
            code: String(code).trim(),
            isActive: 1
          });
          imported++;
        }
      }
      res.json({ ok: true, imported });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Get Items
  app.post("/api/borrow/items", async (req, res) => {
    try {
      const { token } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      const items = await db.select().from(borrowItems).where(eq(borrowItems.isActive, 1));
      res.json({ ok: true, items });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Add Item
  app.post("/api/borrow/items/add", async (req, res) => {
    try {
      const { token, name, code, units, category } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      
      const id = `it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.insert(borrowItems).values({
        id,
        name,
        code: code || "",
        units: units || [],
        category: category || "General",
        isActive: 1
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Update Item
  app.post("/api/borrow/items/update", async (req, res) => {
    try {
      const { token, id, units, category } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      await db.update(borrowItems).set({ units, category }).where(eq(borrowItems.id, id));
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Delete Item
  app.post("/api/borrow/items/delete", async (req, res) => {
    try {
      const { token, id } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      await db.delete(borrowItems).where(eq(borrowItems.id, id));
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Delete All Items
  app.post("/api/borrow/items/delete-all", async (req, res) => {
    try {
      const { token } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      await db.delete(borrowItems);
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Import Items (CSV/Excel) - Updated with Unit logic
  app.post("/api/borrow/items/import", upload.single("file"), async (req, res) => {
    try {
      const token = req.body.token;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      if (!req.file) return res.json({ ok: false, message: "No file" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(sheet);

      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const name = row['Item Name'] || row['name'] || row['Name'];
        const code = row['Item ID'] || row['code'] || row['Code'] || "";
        const rawUnit = row['Unit'] || row['Packing Unit'] || row['Packing Detail'] || row['Packing Unit (Cleaned)'] || row['Inv Unit'] || row['unit'] || "";
        const category = row['Category'] || "General";

        if (!name) {
          skipped++;
          continue;
        }

        const id = `it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const units = rawUnit ? [String(rawUnit).trim()] : [];
        await db.insert(borrowItems).values({
          id,
          name: String(name).trim(),
          code: code ? String(code).trim() : null,
          units,
          category,
          isActive: 1
        });
        imported++;
      }
      res.json({ ok: true, imported, skipped });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Get Transactions
  app.post("/api/borrow/transactions", async (req, res) => {
    try {
      const { token, limit } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      const transactions = await db.select().from(borrowTransactions)
        .orderBy(desc(borrowTransactions.txDate))
        .limit(limit || 100);
      res.json({ ok: true, transactions });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Add Transaction
  app.post("/api/borrow/transactions/add", async (req, res) => {
    try {
      const { token, ...txData } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);

      const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.insert(borrowTransactions).values({
        id,
        txDate: txData.txDate,
        dueDate: txData.dueDate || undefined,
        txType: txData.txType,
        branch: txData.branch,
        item: txData.item,
        qty: txData.qty,
        unit: txData.unit || "",
        borrower: txData.borrower || "",
        lender: txData.lender || "",
        note: txData.note || "",
        status: "pending",
        createdAt: new Date().toISOString()
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Toggle Transaction Status
  app.post("/api/borrow/transactions/toggle", async (req, res) => {
    try {
      const { token, id } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);

      const tx = await db.select().from(borrowTransactions).where(eq(borrowTransactions.id, id)).limit(1);
      if (tx.length === 0) return res.json({ ok: false, message: "Not found" });

      const newStatus = tx[0].status === "pending" ? "done" : "pending";
      await db.update(borrowTransactions).set({ status: newStatus }).where(eq(borrowTransactions.id, id));
      res.json({ ok: true, status: newStatus });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Delete Transaction
  app.post("/api/borrow/transactions/delete", async (req, res) => {
    try {
      const { token, id } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);
      await db.delete(borrowTransactions).where(eq(borrowTransactions.id, id));
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Dashboard
  app.post("/api/borrow/dashboard", async (req, res) => {
    try {
      const { token } = req.body;
      const access = await verifyManagerAccess(token);
      if (!access.ok) return res.status(401).json(access);

      const allTx = await db.select().from(borrowTransactions);
      const totalTransactions = allTx.length;
      const totalBorrowIn = allTx.filter(t => t.txType === "borrow_in").length;
      const totalBorrowOut = allTx.filter(t => t.txType === "borrow_out").length;

      const today = new Date().toISOString().split('T')[0];
      const overdueTransactions = allTx.filter(t => t.status === "pending" && t.dueDate && t.dueDate < today);

      res.json({ 
        ok: true, 
        totalTransactions, 
        totalBorrowIn, 
        totalBorrowOut, 
        overdueCount: overdueTransactions.length,
        overdueTransactions 
      });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // ==========================================
  // ⚙️ Labor Cost Control (Using Direct DB)
  // ==========================================

  // Get Labor Settings
  app.post("/api/settings/get-labor", async (req, res) => {
    try {
      const result = await db.select().from(laborSettings).limit(1);
      const settings = result[0] || { 
        rosterHours: "88", 
        dutyDailyHours: "40", 
        ptWageRate: "45", 
        fixedCostDaily: "0", 
        closeShiftDailyCost: "0" 
      };
      res.json({ ok: true, settings });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Save Labor Settings
  app.post("/api/settings/save-labor", async (req, res) => {
    const { token, rosterHours, dutyDailyHours, ptWageRate, fixedCostDaily, closeShiftDailyCost } = req.body;
    const access = await verifyManagerAccess(token);
    if (!access.ok) return res.json(access);

    try {
      const existing = await db.select().from(laborSettings).limit(1);
      if (existing.length > 0) {
        await db.update(laborSettings).set({
          rosterHours: String(rosterHours || 88),
          dutyDailyHours: String(dutyDailyHours || 40),
          ptWageRate: String(ptWageRate || 45),
          fixedCostDaily: String(fixedCostDaily || 0),
          closeShiftDailyCost: String(closeShiftDailyCost || 0),
          updatedAt: new Date().toISOString()
        }).where(eq(laborSettings.id, existing[0].id));
      } else {
        await db.insert(laborSettings).values({
          rosterHours: String(rosterHours || 88),
          dutyDailyHours: String(dutyDailyHours || 40),
          ptWageRate: String(ptWageRate || 45),
          fixedCostDaily: String(fixedCostDaily || 0),
          closeShiftDailyCost: String(closeShiftDailyCost || 0),
          updatedAt: new Date().toISOString()
        });
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Calculate Labor Logic Helper
  async function calculateLaborLogic(date: string, inputs: { actualHours?: number; otHours?: number }) {
    // 1. Get Settings
    const settingsRes = await db.select().from(laborSettings).limit(1);
    const cfg = settingsRes[0] || { rosterHours: "88", dutyDailyHours: "40", ptWageRate: "45", fixedCostDaily: "0", closeShiftDailyCost: "0" };

    // 2. Get Sales data for that date
    const salesRes = await db.select().from(dailySalesReports).where(eq(dailySalesReports.reportDate, date)).limit(1);
    const salesData = salesRes[0];
    const sales = Number(salesData?.actualSales || 0);
    const tc = Number(salesData?.transactionCount || 0);

    // 3. Daily inputs
    const actual = Number(inputs.actualHours || 0);
    const ot = Number(inputs.otHours || 0);

    // --- Calculate ---
    const dutyHours = Number(cfg.dutyDailyHours) || 40;
    const summaryHours = dutyHours + actual + ot;
    const rosterHours = Number(cfg.rosterHours) || 88;
    const varianceHours = summaryHours - rosterHours;

    const variableCost = (actual + ot) * (Number(cfg.ptWageRate) || 0);
    const fixedCost = (Number(cfg.fixedCostDaily) || 0) + (Number(cfg.closeShiftDailyCost) || 0);
    const laborCostTotal = fixedCost + variableCost;

    const colPercent = sales > 0 ? (laborCostTotal / sales) * 100 : 0;
    const tcmh = summaryHours > 0 ? (tc / summaryHours) : 0;

    return {
      actualHours: String(actual),
      otHours: String(ot),
      summaryHours: String(summaryHours.toFixed(2)),
      varianceHours: String(varianceHours.toFixed(2)),
      laborCostTotal: String(laborCostTotal.toFixed(2)),
      colPercent: String(colPercent.toFixed(2)),
      tcmh: String(tcmh.toFixed(2))
    };
  }

  // Save Daily Labor
  app.post("/api/sales/save-daily-labor", async (req, res) => {
    const { token, date, actualHours, otHours } = req.body;
    const access = await verifyManagerAccess(token);
    if (!access.ok) return res.json(access);

    try {
      const result = await calculateLaborLogic(date, { actualHours, otHours });

      // Upsert daily labor
      const existing = await db.select().from(dailyLabor).where(eq(dailyLabor.date, date)).limit(1);
      if (existing.length > 0) {
        await db.update(dailyLabor).set({ ...result, updatedAt: new Date().toISOString() }).where(eq(dailyLabor.id, existing[0].id));
      } else {
        await db.insert(dailyLabor).values({ date, ...result, updatedAt: new Date().toISOString() });
      }

      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // Get Daily Labor
  app.post("/api/sales/get-daily-labor", async (req, res) => {
    const { date } = req.body;
    try {
      const result = await db.select().from(dailyLabor).where(eq(dailyLabor.date, date)).limit(1);
      res.json({ ok: true, data: result[0] || null });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // ==========================================
  // 📂 DBF Import (Aloha POS Integration)
  // ==========================================
  
  // Parse DBF file and return data
  app.post("/api/import/parse-dbf", upload.single("file"), async (req, res) => {
    const { token } = req.body;
    const access = await verifyManagerAccess(token);
    if (!access.ok) return res.json(access);

    if (!req.file) {
      return res.json({ ok: false, message: "No file uploaded" });
    }

    try {
      const DBFFile = await import("dbffile");
      
      // Write buffer to temp file (dbffile needs file path)
      const tempPath = path.join(process.cwd(), "uploads", `temp_${Date.now()}.dbf`);
      fs.writeFileSync(tempPath, req.file.buffer);
      
      const dbf = await DBFFile.DBFFile.open(tempPath);
      const records = await dbf.readRecords();
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      res.json({ 
        ok: true, 
        fields: dbf.fields.map(f => ({ name: f.name, type: f.type, size: f.size })),
        recordCount: dbf.recordCount,
        records: records.slice(0, 100) // Return first 100 records for preview
      });
    } catch (e: any) {
      console.error("DBF parse error:", e);
      res.json({ ok: false, message: e.message || "Failed to parse DBF file" });
    }
  });

  // Import employees from DBF
  app.post("/api/import/employees-from-dbf", async (req, res) => {
    const { token, employees } = req.body;
    const access = await verifyManagerAccess(token);
    if (!access.ok) return res.json(access);

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.json({ ok: false, message: "No employees to import" });
    }

    try {
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const emp of employees) {
        try {
          // Check if employee exists
          const existing = await db.select().from(users).where(eq(users.username, emp.username.toLowerCase())).limit(1);
          
          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Create new employee
          await db.insert(users).values({
            username: emp.username.toLowerCase(),
            passhash: hashPass(emp.password || "1234"),
            fullName: emp.fullName || emp.username,
            nickName: emp.nickName || null,
            role: "staff",
            phone: emp.phone || null,
            email: emp.email || null,
            active: 1,
            createdAt: new Date().toISOString()
          });
          imported++;
        } catch (e: any) {
          errors.push(`${emp.username}: ${e.message}`);
        }
      }

      res.json({ 
        ok: true, 
        imported, 
        skipped, 
        errors: errors.length > 0 ? errors : undefined,
        message: `Imported ${imported} employees, skipped ${skipped} existing`
      });
    } catch (e: any) {
      res.json({ ok: false, message: e.message });
    }
  });

  // ==========================================
  // 💬 Socket.IO Chat System (Persistent)
  // ==========================================
  const io = new SocketIOServer(httpServer);

  interface ChatMessage {
    id?: number;
    user: string;
    senderUsername: string;
    recipientUsername?: string | null;
    text: string;
    messageType?: string; // text, image, sticker
    imageUrl?: string | null;
    timestamp: string;
    isPrivate?: boolean;
    isRead?: number;
  }

  const onlineUsers = new Map<string, { username: string; displayName: string; socketId: string }>();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const session = await storage.getSession(token);
    if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) {
      return next(new Error("Invalid or expired session"));
    }
    const user = await storage.getUser(session.username);
    if (!user) {
      return next(new Error("User not found"));
    }
    socket.data.user = user;
    next();
  });

  const broadcastOnlineUsers = () => {
    const usersList = Array.from(onlineUsers.values()).map(u => ({
      username: u.username,
      displayName: u.displayName
    }));
    io.emit("online_users", usersList);
  };

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    const displayName = user.nickName || user.fullName || user.username;
    console.log("User connected:", user.username);

    onlineUsers.set(user.username, {
      username: user.username,
      displayName,
      socketId: socket.id
    });

    // Load group chat history from database (last 50 messages where recipientUsername is null)
    try {
      const groupHistory = await db.select()
        .from(staffChatMessages)
        .where(isNull(staffChatMessages.recipientUsername))
        .orderBy(desc(staffChatMessages.id))
        .limit(50);
      
      const formattedHistory: ChatMessage[] = groupHistory.reverse().map(m => ({
        id: m.id,
        user: m.senderDisplayName,
        senderUsername: m.senderUsername,
        text: m.text,
        messageType: m.messageType,
        imageUrl: m.imageUrl,
        timestamp: m.createdAt,
        isPrivate: false
      }));
      socket.emit("chat_history", formattedHistory);
    } catch (e) {
      console.error("Error loading chat history:", e);
      socket.emit("chat_history", []);
    }
    
    broadcastOnlineUsers();

    // Group message - save to database (supports text, image, sticker)
    socket.on("message", async (payload: { text: string; messageType?: string; imageUrl?: string }) => {
      const timestamp = new Date().toISOString();
      const messageType = payload.messageType || "text";
      const msg: ChatMessage = {
        user: displayName,
        senderUsername: user.username,
        text: payload.text,
        messageType,
        imageUrl: payload.imageUrl || null,
        timestamp,
        isPrivate: false
      };

      try {
        // Save to database
        const result = await db.insert(staffChatMessages).values({
          senderUsername: user.username,
          senderDisplayName: displayName,
          recipientUsername: null,
          text: payload.text,
          messageType,
          imageUrl: payload.imageUrl || null,
          isRead: 0,
          createdAt: timestamp
        }).returning();
        msg.id = result[0]?.id;
      } catch (e) {
        console.error("Error saving message:", e);
      }

      io.emit("message", msg);
    });

    // Private message - save to database and deliver to recipient (even if offline)
    socket.on("private_message", async (payload: { text: string; to: string; messageType?: string; imageUrl?: string }) => {
      const timestamp = new Date().toISOString();
      const messageType = payload.messageType || "text";
      const msg: ChatMessage = {
        user: displayName,
        senderUsername: user.username,
        recipientUsername: payload.to,
        text: payload.text,
        messageType,
        imageUrl: payload.imageUrl || null,
        timestamp,
        isPrivate: true
      };

      try {
        // Save to database
        const result = await db.insert(staffChatMessages).values({
          senderUsername: user.username,
          senderDisplayName: displayName,
          recipientUsername: payload.to,
          text: payload.text,
          messageType,
          imageUrl: payload.imageUrl || null,
          isRead: 0,
          createdAt: timestamp
        }).returning();
        msg.id = result[0]?.id;
      } catch (e) {
        console.error("Error saving private message:", e);
      }

      // Send to sender
      socket.emit("message", msg);

      // Send to recipient if online
      const targetUser = onlineUsers.get(payload.to);
      if (targetUser) {
        io.to(targetUser.socketId).emit("message", msg);
      }
    });

    // Get private history from database
    socket.on("get_private_history", async (targetUsername: string) => {
      try {
        const history = await db.select()
          .from(staffChatMessages)
          .where(
            or(
              and(
                eq(staffChatMessages.senderUsername, user.username),
                eq(staffChatMessages.recipientUsername, targetUsername)
              ),
              and(
                eq(staffChatMessages.senderUsername, targetUsername),
                eq(staffChatMessages.recipientUsername, user.username)
              )
            )
          )
          .orderBy(desc(staffChatMessages.id))
          .limit(100);

        const formattedHistory: ChatMessage[] = history.reverse().map(m => ({
          id: m.id,
          user: m.senderDisplayName,
          senderUsername: m.senderUsername,
          recipientUsername: m.recipientUsername,
          text: m.text,
          messageType: m.messageType,
          imageUrl: m.imageUrl,
          timestamp: m.createdAt,
          isPrivate: true
        }));
        socket.emit("private_history", formattedHistory);

        // Mark messages as read
        await db.update(staffChatMessages)
          .set({ isRead: 1 })
          .where(
            and(
              eq(staffChatMessages.senderUsername, targetUsername),
              eq(staffChatMessages.recipientUsername, user.username),
              eq(staffChatMessages.isRead, 0)
            )
          );
      } catch (e) {
        console.error("Error loading private history:", e);
        socket.emit("private_history", []);
      }
    });

    // Get all users for private chat (including offline)
    socket.on("get_all_users", async () => {
      try {
        const allUsers = await db.select({
          username: users.username,
          fullName: users.fullName,
          nickName: users.nickName
        }).from(users).where(eq(users.active, 1));

        const userList = allUsers
          .filter(u => u.username !== user.username)
          .map(u => ({
            username: u.username,
            displayName: u.nickName || u.fullName || u.username,
            online: onlineUsers.has(u.username)
          }));
        socket.emit("all_users", userList);
      } catch (e) {
        console.error("Error getting users:", e);
        socket.emit("all_users", []);
      }
    });

    // Get all private messages for the current user (for recent chats)
    socket.on("get_all_private_history", async () => {
      try {
        const history = await db.select()
          .from(staffChatMessages)
          .where(
            and(
              isNotNull(staffChatMessages.recipientUsername),
              or(
                eq(staffChatMessages.senderUsername, user.username),
                eq(staffChatMessages.recipientUsername, user.username)
              )
            )
          )
          .orderBy(desc(staffChatMessages.id))
          .limit(200);

        const formattedHistory: ChatMessage[] = history.reverse().map(m => ({
          id: m.id,
          user: m.senderDisplayName,
          senderUsername: m.senderUsername,
          recipientUsername: m.recipientUsername,
          text: m.text,
          messageType: m.messageType,
          imageUrl: m.imageUrl,
          timestamp: m.createdAt,
          isPrivate: true
        }));
        socket.emit("private_history", formattedHistory);
      } catch (e) {
        console.error("Error loading all private history:", e);
        socket.emit("private_history", []);
      }
    });

    // Get unread message count
    socket.on("get_unread_count", async () => {
      try {
        const unreadMessages = await db.select()
          .from(staffChatMessages)
          .where(
            and(
              eq(staffChatMessages.recipientUsername, user.username),
              eq(staffChatMessages.isRead, 0)
            )
          );
        socket.emit("unread_count", unreadMessages.length);
      } catch (e) {
        socket.emit("unread_count", 0);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", user.username);
      onlineUsers.delete(user.username);
      broadcastOnlineUsers();
    });
  });

  // ===== ROSTER IMPORT FROM EXCEL =====
  app.post("/api/roster/import", async (req, res) => {
    try {
      const { token, data } = req.body;

      const session = await storage.getSession(token);
      if (!session) {
        return res.json({ ok: false, message: "Session expired" });
      }

      const currentUser = await storage.getUser(session.username);
      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "manager")) {
        return res.json({ ok: false, message: "Permission denied" });
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };

      const allUsers = await storage.getUsers();
      const nicknameMap = new Map<string, string>();
      allUsers.forEach(u => {
        if (u.nickName) {
          nicknameMap.set(u.nickName.toLowerCase(), u.username);
        }
      });

      const getDefaultTimes = (shiftGroup: string): { startTime: string; endTime: string } => {
        switch (shiftGroup) {
          case "open": return { startTime: "07:00", endTime: "16:00" };
          case "lunch": return { startTime: "10:00", endTime: "19:00" };
          case "dinner": return { startTime: "16:00", endTime: "01:00" };
          case "late": return { startTime: "22:00", endTime: "07:00" };
          default: return { startTime: "09:00", endTime: "18:00" };
        }
      };

      const parseTimeRange = (timeRange: string): { startTime: string; endTime: string } | null => {
        if (!timeRange) return null;
        const match = timeRange.match(/(\d{1,2})\.(\d{2})\s*-\s*(\d{1,2})\.(\d{2})/);
        if (match) {
          const startHour = match[1].padStart(2, "0");
          const startMin = match[2];
          const endHour = match[3].padStart(2, "0");
          const endMin = match[4];
          return { startTime: `${startHour}:${startMin}`, endTime: `${endHour}:${endMin}` };
        }
        return null;
      };

      for (const item of data) {
        try {
          const username = nicknameMap.get(item.nickname.toLowerCase());
          
          if (!username) {
            results.errors.push(`ไม่พบ username สำหรับ nickname: ${item.nickname}`);
            results.skipped++;
            continue;
          }

          if (!item.shiftGroup) {
            results.skipped++;
            continue;
          }

          const parsedTimes = parseTimeRange(item.timeRange);
          const times = parsedTimes || getDefaultTimes(item.shiftGroup);

          await storage.upsertShift({
            username,
            date: item.date,
            shiftGroup: item.shiftGroup,
            startTime: times.startTime,
            endTime: times.endTime,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          results.imported++;

        } catch (err: any) {
          results.errors.push(`Error for ${item.nickname} on ${item.date}: ${err.message}`);
        }
      }

      return res.json({ ok: true, ...results });

    } catch (error: any) {
      return res.json({ ok: false, message: error.message });
    }
  });

  return httpServer;
}