const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const { logger, sessionId } = require("./logger");
const {
  initTelemetry,
  shutdownTelemetry,
  tracedHandler,
  createMetrics,
  setEnabled,
} = require("./telemetry");

// Initialize telemetry BEFORE app ready
initTelemetry();
const appMetrics = createMetrics();

let mainWindow;
let lastCpuUsage = 0;
let lastMemPercent = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  logger.info("App started", { version: app.getVersion(), sessionId });
  createWindow();
});

app.on("before-quit", async () => {
  logger.info("Shutting down gracefully");
  await shutdownTelemetry();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Observable gauges (async callbacks) ---
appMetrics.cpuGauge.addCallback((result) => {
  result.observe(lastCpuUsage);
});
appMetrics.memGauge.addCallback((result) => {
  result.observe(lastMemPercent);
});

// --- Traced IPC Handlers ---
ipcMain.handle(
  "get-system-stats",
  tracedHandler("get-system-stats", async (event) => {
    const start = Date.now();
    logger.debug("IPC: get-system-stats called");

    const cpus = os.cpus();
    const avgLoad =
      cpus.reduce((sum, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return sum + ((total - cpu.times.idle) / total) * 100;
      }, 0) / cpus.length;

    const stats = {
      cpuUsage: avgLoad.toFixed(1),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      usedMemory: os.totalmem() - os.freemem(),
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      timestamp: Date.now(),
    };

    // Update gauge values
    lastCpuUsage = parseFloat(stats.cpuUsage);
    lastMemPercent = (stats.usedMemory / stats.totalMemory) * 100;

    // Record metrics
    const duration = Date.now() - start;
    appMetrics.ipcCallCounter.add(1, { channel: "get-system-stats" });
    appMetrics.ipcDurationHistogram.record(duration, {
      channel: "get-system-stats",
    });
    appMetrics.statsCollectionCounter.add(1);

    logger.info("Stats collected", {
      durationMs: duration,
      cpu: stats.cpuUsage,
    });

    if (lastMemPercent > 85) {
      logger.warn("High memory", { percent: lastMemPercent.toFixed(1) });
    }

    return stats;
  }),
);

// --- Telemetry toggle ---
ipcMain.handle("set-telemetry-enabled", async (event, enabled) => {
  setEnabled(enabled);
  return { enabled };
});

// --- Log reader (from Phase 2) ---
const fs = require("fs");
ipcMain.handle("get-recent-logs", async (event, count = 50) => {
  const logDir = path.join(app.getPath("userData"), "logs");
  try {
    const files = fs
      .readdirSync(logDir)
      .filter((f) => f.startsWith("system-pulse-"))
      .sort()
      .reverse();
    if (files.length === 0) return [];
    const content = fs.readFileSync(path.join(logDir, files[0]), "utf-8");
    return content
      .trim()
      .split("\\n")
      .slice(-count)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: "info" };
        }
      });
  } catch (err) {
    logger.error("Failed to read logs", { error: err.message });
    return [];
  }
});

// --- Simulate an error for testing ---
ipcMain.handle(
  "trigger-test-error",
  tracedHandler("trigger-test-error", async () => {
    appMetrics.errorCounter.add(1, { type: "test-error" });
    logger.error("Test error triggered", { source: "user-action" });
    throw new Error("Intentional test error for observability validation");
  }),
);
