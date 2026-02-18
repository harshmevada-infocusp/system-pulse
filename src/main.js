import { app, BrowserWindow, ipcMain, ipcRenderer } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { getSystemStats } from "../utils/system-utils";
import logger, { getRecentLogs } from "./logger/logger";
import {
  createMetrics,
  initTracing,
  shutdownTracing,
} from "./telemetry/tracing";
import { getRecentMetrics, initDB, insertMetrics } from "./db/db";
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
let mainWindow;
initTracing();
const { cpuGuage, ramGauge } = createMetrics();

const db = initDB();
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  logger.info("Application started");
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", reason);
});
app.on("before-quit", () => {
  logger.info("Application is quitting...");
  shutdownTracing();
});
setInterval(() => {
  if (!mainWindow) return;

  const systemStats = getSystemStats();

  // console.log("System Stats:", systemStats);

  mainWindow.webContents.send("system-stats", systemStats);

  insertMetrics({ db, ...systemStats });
  // logger.info("System stats updated", { ...systemStats, service: "resource" });
}, 1000);

setInterval(() => {
  if (!mainWindow) return;

  const recentLogs = getRecentLogs();
  const systemLogs = getRecentMetrics({ db });
  console.log("systemLogs", systemLogs);
  mainWindow.webContents.send("system-logs", recentLogs);
}, 3000);

ipcMain.on("log-message", (_event, { level, message }) => {
  logger.log(level, message);
});

cpuGuage.addCallback((observableResult) => {
  const systemStats = getSystemStats();
  observableResult.observe(systemStats.cpu);
});

ramGauge.addCallback((observableResult) => {
  const systemStats = getSystemStats();

  observableResult.observe(systemStats.ram);
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
