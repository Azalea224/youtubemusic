const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ytm", {
  openSettings: () => ipcRenderer.send("open-settings"),
  getPlaybackState: () => ipcRenderer.invoke("get-playback-state"),
  reportPlayback: (state) => ipcRenderer.invoke("report-playback", state),
  onPlaybackUpdate: (fn) => {
    const handler = (_, state) => fn(state);
    ipcRenderer.on("playback-update", handler);
    return () => ipcRenderer.removeListener("playback-update", handler);
  },
});
