"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getAppPath: () => electron_1.ipcRenderer.invoke("get-app-path"),
    getDocumentsPath: () => electron_1.ipcRenderer.invoke("get-documents-path"),
    // Add more IPC methods as needed for client-side processing
    platform: process.platform,
    isElectron: true,
});
