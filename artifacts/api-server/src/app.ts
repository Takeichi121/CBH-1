import express, { type Express, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { registerRoutes } from "./routes/routes";
import { initProactiveChann } from "./services/proactive-agent";
import { logger } from "./lib/logger";

export async function createApp(): Promise<{ app: Express; httpServer: ReturnType<typeof createServer> }> {
  const app: Express = express();
  app.set("trust proxy", 1);
  const httpServer = createServer(app);

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

  initProactiveChann();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    logger.error({ err }, "Unhandled error");
  });

  return { app, httpServer };
}
