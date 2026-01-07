import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getDocumentsPath: () => ipcRenderer.invoke("get-documents-path"),
  // Add more IPC methods as needed for client-side processing
  platform: process.platform,
  isElectron: true,
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI?: {
      getAppPath: () => Promise<string>;
      getDocumentsPath: () => Promise<string>;
      platform: NodeJS.Platform;
      isElectron: boolean;
    };
  }
}
