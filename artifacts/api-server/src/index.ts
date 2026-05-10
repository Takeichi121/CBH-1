import { createApp } from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

let isShuttingDown = false;

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  gracefulShutdown("uncaughtException");
});

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  const exitCode = signal === "uncaughtException" ? 1 : 0;

  const forceTimer = setTimeout(() => {
    logger.error("Forced exit after timeout");
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  // httpServer reference set after createApp
  if ((globalThis as any).__httpServer) {
    (globalThis as any).__httpServer.close(() => {
      logger.info("HTTP server closed");
      clearTimeout(forceTimer);
      process.exit(exitCode);
    });
  } else {
    clearTimeout(forceTimer);
    process.exit(exitCode);
  }
}

(async () => {
  try {
    logger.info("Starting server...");
    const { httpServer } = await createApp();

    (globalThis as any).__httpServer = httpServer;

    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      logger.info({ port }, "Server listening");
    });

    httpServer.on("error", (err) => {
      logger.error({ err }, "Server error");
      process.exit(1);
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
})();
