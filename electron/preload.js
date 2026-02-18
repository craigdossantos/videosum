const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Move a video folder to the OS trash.
   * @param {string} videoId - The video folder name (relative ID, not an absolute path).
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  trashItem: (videoId) => ipcRenderer.invoke("trash-item", videoId),
});
