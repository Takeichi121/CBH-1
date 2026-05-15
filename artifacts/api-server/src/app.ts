import express, { type Express, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes, ADMIN_ONLY_WRITE_TOOL_NAMES, MANAGER_WRITE_TOOL_NAMES } from "./routes/routes";
import { initProactiveChann } from "./services/proactive-agent";
import { logger } from "./lib/logger";

export async function createApp(): Promise<{ app: Express; httpServer: ReturnType<typeof createServer> }> {
  const app: Express = express();
  app.set("trust proxy", 1);
  const httpServer = createServer(app);

  // CORS policy — derive allowed origins from env vars, fall back to REPLIT_DOMAINS
  const rawAllowedOrigins = process.env["ALLOWED_ORIGINS"] ?? "";
  const rawReplitDomains = process.env["REPLIT_DOMAINS"] ?? "";
  const allowedOrigins: string[] = rawAllowedOrigins.length > 0
    ? rawAllowedOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : rawReplitDomains.split(",").map((d) => d.trim()).filter(Boolean).map((d) => `https://${d}`);

  app.use(
    cors({
      origin:
        allowedOrigins.length > 0
          ? (origin, callback) => {
              // Allow requests with no origin (same-origin, server-to-server, mobile PWA)
              if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
              } else {
                callback(new Error(`CORS: origin '${origin}' not allowed`));
              }
            }
          : (origin, callback) => {
              // No origins configured — allow same-origin (no Origin header) but block cross-origin
              if (!origin) callback(null, true);
              else callback(null, false);
            },
      credentials: true,
    }),
  );

  // Parse cookies — required for httpOnly session cookie support
  app.use(cookieParser());

  app.use(
    express.json({
      limit: "30mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    next();
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: "Too many login attempts. Please try again in 15 minutes." },
  });
  app.use("/api/login", loginLimiter);

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: "Too many AI requests. Please slow down." },
  });
  app.use("/api/chann", aiLimiter);
  app.use("/api/generate-image", aiLimiter);

  // Registration + password-reset endpoints — max 5 requests / 10 min per IP
  const registrationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: "Too many attempts. Please try again in 10 minutes." },
  });
  app.use("/api/registerStaff", registrationLimiter);
  app.use("/api/registerManager", registrationLimiter);
  app.use("/api/registerArea", registrationLimiter);
  app.use("/api/forgotPassword", registrationLimiter);
  app.use("/api/verifyOtp", registrationLimiter);
  app.use("/api/resetPassword", registrationLimiter);

  // Token normalization middleware: inject cookie token into req.body so that all
  // existing route handlers that read req.body.token automatically get cookie-first auth.
  // Cookie token always takes priority over any body-supplied token.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const cookieToken = req.cookies["bk_session"] as string | undefined;
    if (cookieToken) {
      if (!req.body) req.body = {};
      req.body.token = cookieToken;
    }
    next();
  });

  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  await registerRoutes(httpServer, app);
  logger.info("Routes registered");

  try {
    const { storage } = await import("./storage");
    await storage.seedDropdownDefaults();
    logger.info("Dropdown defaults seeded");
  } catch (seedErr) {
    logger.warn({ err: seedErr }, "Dropdown seed skipped");
  }

  // Startup validation: warn loudly if verify codes are weak, missing, or default
  const INSECURE_CODES = new Set([
    "1234", "admin", "password", "bkarea",
    "manager", "staff", "123456", "000000", "111111",
  ]);
  const mgCode = process.env["MANAGER_VERIFY_CODE"] ?? "";
  const arCode = process.env["AREA_VERIFY_CODE"] ?? "";
  if (!mgCode || mgCode.length < 6 || INSECURE_CODES.has(mgCode.toLowerCase())) {
    logger.warn(
      "INSECURE: MANAGER_VERIFY_CODE is not set, too short (<6 chars), or uses a default value. " +
      "Set a strong secret via environment variable before production.",
    );
  }
  if (!arCode || arCode.length < 6 || INSECURE_CODES.has(arCode.toLowerCase())) {
    logger.warn(
      "INSECURE: AREA_VERIFY_CODE is not set, too short (<6 chars), or uses a default value. " +
      "Set a strong secret via environment variable before production.",
    );
  }

  // Startup assertion: log AI write-tool access-control counts derived from the actual
  // constant sets — counts auto-update when tools are added or removed.
  logger.info(
    {
      adminOnlyWriteToolCount: ADMIN_ONLY_WRITE_TOOL_NAMES.size,
      managerWriteToolCount: MANAGER_WRITE_TOOL_NAMES.size,
    },
    "AI write-tool access controls loaded",
  );

  initProactiveChann();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    logger.error({ err }, "Unhandled error");
  });

  return { app, httpServer };
}
