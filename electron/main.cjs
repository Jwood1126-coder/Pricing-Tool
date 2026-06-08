const { app, BrowserWindow } = require("electron");
const path = require("path");

// In dev we load the Vite server; when packaged we load the built files.
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    backgroundColor: "#0F2744",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
