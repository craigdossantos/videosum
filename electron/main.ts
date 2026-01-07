import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV !== "production";
const PORT = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the Next.js app
  const url = `http://localhost:${PORT}`;

  // Wait for Next.js to be ready, then load
  const loadApp = () => {
    mainWindow?.loadURL(url).catch(() => {
      // Retry after 1 second if Next.js isn't ready yet
      setTimeout(loadApp, 1000);
    });
  };

  if (isDev) {
    // In dev mode, assume Next.js dev server is running separately
    loadApp();
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start Next.js server
    startNextServer().then(loadApp);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startNextServer(): Promise<void> {
  return new Promise((resolve) => {
    const serverPath = path.join(
      __dirname,
      "..",
      ".next",
      "standalone",
      "server.js",
    );

    nextServer = spawn("node", [serverPath], {
      env: { ...process.env, PORT: String(PORT) },
      cwd: path.join(__dirname, ".."),
    });

    nextServer.stdout?.on("data", (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes("Ready")) {
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data) => {
      console.error(`Next.js error: ${data}`);
    });

    // Give it a few seconds to start
    setTimeout(resolve, 3000);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for client-side operations
ipcMain.handle("get-app-path", () => {
  return app.getPath("userData");
});

ipcMain.handle("get-documents-path", () => {
  return app.getPath("documents");
});
