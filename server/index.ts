import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initProactiveChann } from "./services/proactive-agent";
import { pool } from "./db";
import { getSocketIO } from "./socket";

let isShuttingDown = false;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection:", reason);
  // In production, escalate to graceful shutdown; in dev, log only
  if (process.env.NODE_ENV === "production") {
    gracefulShutdown("unhandledRejection");
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.error(`[shutdown] Received ${signal}, shutting down gracefully...`);

  // Determine exit code: uncaughtException is fatal, other signals are clean
  const exitCode = signal === "uncaughtException" ? 1 : 0;

  const forceTimer = setTimeout(() => {
    console.error("[shutdown] Timed out after 10s, forcing exit");
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  const io = getSocketIO();
  if (io) {
    try { io.close(); } catch (_) {}
  }

  httpServer.close(() => {
    console.error("[shutdown] HTTP server closed");
    pool.end().then(() => {
      console.error("[shutdown] Database pool closed");
      clearTimeout(forceTimer);
      process.exit(exitCode);
    }).catch((err) => {
      console.error("[shutdown] Error closing database pool:", err);
      clearTimeout(forceTimer);
      process.exit(1);
    });
  });
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '30mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

    try {
      const { storage } = await import("./storage");
      await storage.seedDropdownDefaults();
      log("Dropdown defaults seeded");
    } catch (seedErr) {
      console.warn("Dropdown seed skipped (table may not exist yet):", seedErr instanceof Error ? seedErr.message : seedErr);
    }

    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const {
        users, shifts, swapRequests, managerRequests, dailySalesReports,
        weeklySalesReports, dailyTargets, wasteTargets, laborSettings,
        dailyLabor, storeSettings, announcements,
      } = await import("@shared/schema");
      const OLD_ID = 'BK001GDP';
      const NEW_ID = 'BK1040';
      const migrations: Array<{ name: string; run: () => Promise<unknown> }> = [
        { name: 'users',                run: () => db.update(users).set({ storeId: NEW_ID }).where(eq(users.storeId, OLD_ID)) },
        { name: 'shifts',               run: () => db.update(shifts).set({ storeId: NEW_ID }).where(eq(shifts.storeId, OLD_ID)) },
        { name: 'swap_requests',        run: () => db.update(swapRequests).set({ storeId: NEW_ID }).where(eq(swapRequests.storeId, OLD_ID)) },
        { name: 'manager_requests',     run: () => db.update(managerRequests).set({ storeId: NEW_ID }).where(eq(managerRequests.storeId, OLD_ID)) },
        { name: 'daily_sales_reports',  run: () => db.update(dailySalesReports).set({ storeId: NEW_ID }).where(eq(dailySalesReports.storeId, OLD_ID)) },
        { name: 'weekly_sales_reports', run: () => db.update(weeklySalesReports).set({ storeId: NEW_ID }).where(eq(weeklySalesReports.storeId, OLD_ID)) },
        { name: 'daily_targets',        run: () => db.update(dailyTargets).set({ storeId: NEW_ID }).where(eq(dailyTargets.storeId, OLD_ID)) },
        { name: 'waste_targets',        run: () => db.update(wasteTargets).set({ storeId: NEW_ID }).where(eq(wasteTargets.storeId, OLD_ID)) },
        { name: 'labor_settings',       run: () => db.update(laborSettings).set({ storeId: NEW_ID }).where(eq(laborSettings.storeId, OLD_ID)) },
        { name: 'daily_labor',          run: () => db.update(dailyLabor).set({ storeId: NEW_ID }).where(eq(dailyLabor.storeId, OLD_ID)) },
        { name: 'store_settings',       run: () => db.update(storeSettings).set({ storeId: NEW_ID }).where(eq(storeSettings.storeId, OLD_ID)) },
        { name: 'announcements',        run: () => db.update(announcements).set({ storeId: NEW_ID }).where(eq(announcements.storeId, OLD_ID)) },
      ];
      const failed: string[] = [];
      for (const m of migrations) {
        try {
          await m.run();
        } catch (err) {
          failed.push(m.name);
          console.warn(`[migration] Failed to update ${m.name}:`, err instanceof Error ? err.message : err);
        }
      }
      if (failed.length > 0) {
        console.warn(`[migration] Store ID migration completed with failures in: ${failed.join(', ')}`);
      } else {
        log("Store ID migration BK001GDP → BK1040 complete");
      }
    } catch (migErr) {
      console.warn("Store ID migration skipped:", migErr instanceof Error ? migErr.message : migErr);
    }

    initProactiveChann();

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("Error:", err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...");
      serveStatic(app);
      log("Static file serving configured");
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`Server successfully started on port ${port}`);
      },
    );

    httpServer.on("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
