// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  onSystemStats: (callback) => {
    ipcRenderer.on("system-stats", (_event, data) => {
      callback(data);
    });
  },
  log: (level, message) => {
    ipcRenderer.send("log-message", { level, message });
  },
});
