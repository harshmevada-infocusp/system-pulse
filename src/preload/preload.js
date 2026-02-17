const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("systemPulse", {
  getStats: () => ipcRenderer.invoke("get-system-stats"),
  getRecentLogs: (count) => ipcRenderer.invoke("get-recent-logs", count),
  setTelemetryEnabled: (enabled) =>
    ipcRenderer.invoke("set-telemetry-enabled", enabled),
  triggerTestError: () => ipcRenderer.invoke("trigger-test-error"),
  // We'll add more APIs here as we go
});
