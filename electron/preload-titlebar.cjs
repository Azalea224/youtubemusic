const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("titlebarAPI", {
  showAppMenu: (which, x, y) => ipcRenderer.invoke("titlebar-show-app-menu", which, x, y),
  openSettings: () => ipcRenderer.send("open-settings"),
});
