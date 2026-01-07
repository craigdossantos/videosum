const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const { fork } = require("child_process");
const path = require("path");
const http = require("http");

const isDev = process.env.NODE_ENV === "development";
const PORT = 3005;

let mainWindow;
let serverProcess;

// Check if server is ready
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
        })
        .on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error("Server failed to start"));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

// Start the Next.js server (only in production - dev mode uses concurrently)
function startServer() {
  const isPackaged = app.isPackaged;

  // In development, the server is started by concurrently, so we don't start it here
  if (!isPackaged) {
    console.log("[Electron] Dev mode - server started by concurrently");
    return;
  }

  // In production, run the standalone Next.js server using fork()
  // fork() uses Electron's bundled Node.js instead of requiring system node
  const serverPath = path.join(process.resourcesPath, "standalone");
  const serverScript = path.join(serverPath, "server.js");

  serverProcess = fork(serverScript, [], {
    cwd: serverPath,
    env: {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: "production",
    },
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  serverProcess.stdout?.on("data", (data) => {
    console.log(`[Server] ${data}`);
  });

  serverProcess.stderr?.on("data", (data) => {
    console.error(`[Server] ${data}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start server:", err);
    dialog.showErrorBox(
      "Server Error",
      `Failed to start server: ${err.message}`,
    );
  });
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "VideoSum",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show until ready
  });

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Build the application menu
function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            // TODO: Open settings window for API keys
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Settings",
              message:
                'API keys are configured in ~/.videosum/config.json\n\nCreate this file with:\n{\n  "OPENAI_API_KEY": "sk-...",\n  "ANTHROPIC_API_KEY": "sk-ant-..."\n}',
            });
          },
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Output Folder",
          click: () => {
            const outputDir =
              process.env.CLASS_NOTES_DIR ||
              path.join(require("os").homedir(), "ClassNotes");
            shell.openPath(outputDir);
          },
        },
        {
          label: "GitHub Repository",
          click: () => {
            shell.openExternal("https://github.com/craigdossantos/videosum");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App ready
app.whenReady().then(async () => {
  buildMenu();
  createWindow();

  // Show loading state
  mainWindow.loadURL(`data:text/html,
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .loader { text-align: center; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e0e0e0;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p>Starting VideoSum...</p>
        </div>
      </body>
    </html>
  `);

  // Start server and wait for it
  startServer();

  try {
    await waitForServer(`http://localhost:${PORT}/demo`);
    mainWindow.loadURL(`http://localhost:${PORT}/demo`);
  } catch (err) {
    dialog.showErrorBox("Error", "Failed to start the application server.");
    app.quit();
  }
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up server on quit
app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  dialog.showErrorBox("Error", err.message);
});
