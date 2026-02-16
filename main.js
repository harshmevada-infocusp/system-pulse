const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // if (process.env.VITE_DEV_SERVER_URL) {
  win.loadURL("http://localhost:5173");
  // } else {
  // win.loadFile(path.join(__dirname, "src/renderer/dist/index.html"));
  // }
}

app.whenReady().then(createWindow);
