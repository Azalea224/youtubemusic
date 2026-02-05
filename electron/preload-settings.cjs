const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", settings),
  listPlugins: () => ipcRenderer.invoke("list-plugins"),
  debugPlugins: () => ipcRenderer.invoke("debug-plugins"),
});
