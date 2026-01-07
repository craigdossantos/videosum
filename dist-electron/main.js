"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
let mainWindow = null;
let nextServer = null;
const isDev = process.env.NODE_ENV !== "production";
const PORT = 3000;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
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
    }
    else {
        // In production, start Next.js server
        startNextServer().then(loadApp);
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
async function startNextServer() {
    return new Promise((resolve) => {
        const serverPath = path_1.default.join(__dirname, "..", ".next", "standalone", "server.js");
        nextServer = (0, child_process_1.spawn)("node", [serverPath], {
            env: { ...process.env, PORT: String(PORT) },
            cwd: path_1.default.join(__dirname, ".."),
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
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC handlers for client-side operations
electron_1.ipcMain.handle("get-app-path", () => {
    return electron_1.app.getPath("userData");
});
electron_1.ipcMain.handle("get-documents-path", () => {
    return electron_1.app.getPath("documents");
});
