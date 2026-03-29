const { contextBridge, ipcRenderer } = require("electron");
const { fromPersisted, toPersisted } = require("./settings-bridge.cjs");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("get-settings").then(fromPersisted),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", toPersisted(settings)),
  listPlugins: () => ipcRenderer.invoke("list-plugins"),
  debugPlugins: () => ipcRenderer.invoke("debug-plugins"),
  getEffectiveAccentColor: () => ipcRenderer.invoke("get-effective-accent-color"),
  getKdeAccentAvailable: () => ipcRenderer.invoke("get-kde-accent-available"),
  onKdeAccentChanged: (callback) => {
    const ch = () => callback();
    ipcRenderer.on("kde-accent-changed", ch);
    return () => ipcRenderer.removeListener("kde-accent-changed", ch);
  },
});
