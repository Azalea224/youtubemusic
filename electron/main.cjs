const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, nativeTheme } = require("electron");

// Force dark mode for settings window and native UI
nativeTheme.themeSource = "dark";
const path = require("path");
const fs = require("fs");
const createDiscordRPC = require("discord-rich-presence");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEFAULT_CLIENT_ID = "";

// Explicit app name for WM_CLASS matching (Linux/COSMIC/GNOME taskbar, Alt+Tab)
app.name = "YouTube Music";

// Windows: set AppUserModelID before any windows are created (fixes taskbar icon)
if (process.platform === "win32") {
  app.setAppUserModelId("com.youtube-music.client");
}

// Linux Wayland: enable global shortcuts portal (required for globalShortcut to work)
if (process.platform === "linux") {
  app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");
}

function getIconPath() {
  const base = path.join(__dirname, "..");
  // Windows taskbar prefers .ico; use it when available
  if (process.platform === "win32") {
    const icoPath = path.join(base, "build", "icons", "icon.ico");
    if (fs.existsSync(icoPath)) return icoPath;
  }
  return path.join(base, "public", "icon.png");
}

function getStorePath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadStore() {
  try {
    const data = fs.readFileSync(getStorePath(), "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveStore(obj) {
  fs.writeFileSync(getStorePath(), JSON.stringify(obj, null, 2), "utf8");
}

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let discordClient = null;
let lastPlaybackState = null;

function getAppDataDir() {
  return app.getPath("userData");
}

function getPluginsDir() {
  return path.join(getAppDataDir(), "plugins");
}

function getSettings() {
  const defaults = {
    general: {
      start_minimized: false,
      minimize_to_tray: true,
      launch_at_login: false,
      language: "en-GB",
    },
    appearance: {
      theme: "system",
      accent_color: "#ff0000",
      font_size: "medium",
      compact_mode: false,
    },
    playback: {
      default_quality: "auto",
      crossfade: false,
      gapless: true,
      repeat_default: "none",
      shuffle_default: false,
    },
    discord: {
      enabled: true,
      client_id: "1234567890123456789",
      show_buttons: true,
      hide_listening: false,
    },
    plugins: {
      enabled_plugins: [],
    },
    advanced: {
      data_directory: "",
      cache_size_mb: 500,
      debug_mode: false,
      custom_css: "",
      custom_js: "",
    },
  };
  const store = loadStore();
  const merged = {
    general: { ...defaults.general, ...store.general },
    appearance: { ...defaults.appearance, ...store.appearance },
    playback: { ...defaults.playback, ...store.playback },
    discord: { ...defaults.discord, ...store.discord },
    plugins: { ...defaults.plugins, ...store.plugins },
    advanced: { ...defaults.advanced, ...store.advanced },
  };
  return merged;
}

function setSettings(settings) {
  const store = loadStore();
  store.general = settings.general;
  store.appearance = settings.appearance;
  store.playback = settings.playback;
  store.discord = settings.discord;
  store.plugins = settings.plugins;
  store.advanced = settings.advanced;
  saveStore(store);
}

function getPluginsSourceDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "plugins");
  }
  return path.join(__dirname, "..", "plugins");
}

function ensureDefaultPlugins() {
  const fs = require("fs");
  const pluginsDest = getPluginsDir();
  const pluginsSource = getPluginsSourceDir();
  if (!fs.existsSync(pluginsSource)) return;
  if (isDev && fs.existsSync(pluginsDest)) {
    fs.rmSync(pluginsDest, { recursive: true });
  }
  fs.mkdirSync(pluginsDest, { recursive: true });
  const defaultPlugins = ["fine-volume-control", "Multi-Source Lyrics CC"];
  const toCopy = isDev
    ? fs.readdirSync(pluginsSource).filter((n) => {
        const p = path.join(pluginsSource, n);
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "manifest.json"));
      })
    : defaultPlugins;
  for (const name of toCopy) {
    const src = path.join(pluginsSource, name);
    const dest = path.join(pluginsDest, name);
    const shouldCopy = fs.existsSync(src) && fs.statSync(src).isDirectory();
    const isNew = !fs.existsSync(dest);
    const isDevLocal = !app.isPackaged;
    if (shouldCopy && (isNew || isDevLocal)) {
      copyDirSync(src, dest);
    }
  }
}

function copyDirSync(src, dst) {
  const fs = require("fs");
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function getEnabledPlugins() {
  const s = getSettings();
  const arr = s.plugins.enabled_plugins;
  return Array.isArray(arr) && arr.length > 0 ? arr : ["fine-volume-control", "Multi-Source Lyrics CC"];
}

function getPluginInjectionScript() {
  const fs = require("fs");
  const pluginsDir = getPluginsDir();
  const enabled = getEnabledPlugins();
  const scripts = [];
  if (!fs.existsSync(pluginsDir) || enabled.length === 0) {
    return scripts.join("\n;\n");
  }
  for (const id of enabled) {
    const pluginDir = path.join(pluginsDir, id);
    const manifestPath = path.join(pluginDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.warn("[YTM] Plugin skipped (no manifest):", id, "at", pluginDir);
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
      console.warn("[YTM] Plugin skipped (invalid manifest):", id, e.message);
      continue;
    }
    const mainFile = manifest.main || "index.js";
    const scriptPath = path.join(pluginDir, mainFile);
    if (!fs.existsSync(scriptPath)) {
      console.warn("[YTM] Plugin skipped (main file missing):", id, "expected", scriptPath);
      continue;
    }
    const raw = fs.readFileSync(scriptPath, "utf8");
    const safeId = JSON.stringify(id);
    scripts.push(
      "(function(__ytmPluginId){try{" + raw + "}catch(e){console.error('[YTM] Plugin',__ytmPluginId,'failed:',e);}})(" + safeId + ");"
    );
  }
  if (scripts.length === 0) return "";
  return 'console.log("[YTM] Loading",' + scripts.length + ',"plugin(s)");\n' + scripts.join("\n");
}

function reportPlaybackState(state) {
  if (!state || (!state.title && !state.artist)) return;
  lastPlaybackState = state;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("playback-update", state);
  }
  updateDiscordPresence(state);
}

function makePollInjectOnceScript() {
  return `
(function(){
  if(window.__ytmPollInjected)return;
  window.__ytmPollInjected=true;
  function scrapeAndReport(){
    try{
      if(document.visibilityState==='hidden')return;
      if(!window.ytm||typeof window.ytm.reportPlayback!=='function')return;
      function q(root,sel){
        if(!root)return null;
        var sr=root.shadowRoot||root._shadowRoot;
        if(sr){var r=sr.querySelector(sel);if(r)return r;}
        if(root.__shady_native_querySelector)return root.__shady_native_querySelector(sel);
        return root.querySelector(sel);
      }
      var bar=document.querySelector('ytmusic-player-bar');
      if(!bar)return;
      var t=q(bar,'.title.ytmusic-player-bar')||q(bar,'.title');
      var s=q(bar,'.ytmusic-player-bar.subtitle')||q(bar,'.subtitle');
      if(!s){var sr=bar.shadowRoot||bar._shadowRoot;if(sr){var links=sr.querySelectorAll('.subtitle a[href*="channel/"]');if(links&&links[0])s=links[0];}}
      var p=q(bar,'#play-pause-button')||q(bar,'.play-pause-button');
      var title=t?t.textContent.trim():'';
      var artist=s?s.textContent.trim():'';
      var state='paused';
      if(p){var l=(p.getAttribute('aria-label')||'').toLowerCase();state=l.indexOf('pause')>=0?'playing':'paused';}
      var prog=0,dur=0;
      var te=q(bar,'.time-info')||q(bar,'.time');
      if(te){
        var txt=te.textContent||'0:00 / 0:00';
        var pts=txt.split('/').map(function(x){return x.trim();});
        if(pts.length>=2){
          function parse(str){var parts=str.split(':').map(Number).reverse(),sec=0;for(var i=0;i<parts.length;i++)sec+=(parts[i]||0)*Math.pow(60,i);return sec;}
          prog=parse(pts[0]);dur=parse(pts[1]);
        }
      }
      if(title||artist){
        window.ytm.reportPlayback({title:title,artist:artist,album:'',state:state,progress:prog,duration:dur});
      }
    }catch(e){}
  }
  function tick(){
    if(document.visibilityState==='hidden')return;
    if(window.requestIdleCallback){
      requestIdleCallback(scrapeAndReport,{timeout:3000});
    }else{
      setTimeout(scrapeAndReport,50);
    }
  }
  tick();
  setInterval(tick,15000);
})();
`;
}

function injectPlaybackPollIfEnabled() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const script = makePollInjectOnceScript();
  mainWindow.webContents.executeJavaScript(script).catch(() => {});
}

function applySettingsToMainWebview() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const pluginScript = getPluginInjectionScript();
  if (pluginScript) {
    mainWindow.webContents.executeJavaScript(pluginScript).catch((err) => {
      console.error("[YTM] Plugin injection failed:", err);
    });
  }
  injectPlaybackPollIfEnabled();
  const s = getSettings();
  const customCss = s.advanced.custom_css || "";
  const customJs = s.advanced.custom_js || "";
  if (customCss) {
    const escaped = JSON.stringify(customCss);
    mainWindow.webContents
      .executeJavaScript(
        "(function(){ var el = document.getElementById('ytm-custom-css'); if (el) el.remove(); if (!document.head) return; el = document.createElement('style'); el.id = 'ytm-custom-css'; el.textContent = " + escaped + "; document.head.appendChild(el); })();"
      )
      .catch(() => {});
  } else {
    mainWindow.webContents
      .executeJavaScript(
        "(function(){ var el=document.getElementById('ytm-custom-css'); if(el)el.remove(); })();"
      )
      .catch(() => {});
  }
  if (customJs) {
    mainWindow.webContents.executeJavaScript(customJs).catch(() => {});
  }
}

function updateDiscordPresence(playback) {
  if (!playback || (!playback.title && !playback.artist)) return;
  const s = getSettings();
  const { enabled, hide_listening, client_id } = s.discord;
  const cid = client_id || DEFAULT_CLIENT_ID;
  if (
    !enabled ||
    hide_listening ||
    !cid ||
    cid.startsWith("REPLACE_") ||
    !/^\d+$/.test(cid)
  ) {
    return;
  }
  try {
    if (!discordClient) {
      discordClient = createDiscordRPC(cid);
    }
    const activity = {
      details: playback.title,
      state: playback.artist,
      largeImageKey: "ytm",
      largeImageText: "YouTube Music",
    };
    if (playback.state === "playing" && playback.duration > 0) {
      const now = Math.floor(Date.now() / 1000);
      activity.startTimestamp = now;
      activity.endTimestamp = now + (playback.duration - playback.progress);
    }
    discordClient.updatePresence(activity);
  } catch {}
}

function scanPlugins() {
  const fs = require("fs");
  const pluginsDir = getPluginsDir();
  fs.mkdirSync(pluginsDir, { recursive: true });
  const result = [];
  if (!fs.existsSync(pluginsDir)) return result;
  for (const name of fs.readdirSync(pluginsDir)) {
    const dir = path.join(pluginsDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      result.push([name, manifest]);
    } catch {}
  }
  return result;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "YouTube Music",
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload-ytm.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL("https://music.youtube.com");

  mainWindow.webContents.on("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    if (url && url.includes("music.youtube.com")) {
      applySettingsToMainWebview();
    }
  });

  if (isDev && process.env.YTM_DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("close", (e) => {
    const s = getSettings();
    if (s.general.minimize_to_tray && !app.isQuitting) {
      // If window is already hidden, user is trying to quit from taskbar/dock - actually quit
      if (mainWindow && !mainWindow.isVisible()) {
        app.quit();
        return;
      }
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Minimal menu with Settings and DevTools (fallback when global shortcut conflicts on some platforms)
  const spacer = process.platform !== "darwin" ? [
    { label: "   ", submenu: [{ label: " ", enabled: false }] },
  ] : [];
  const appMenu = Menu.buildFromTemplate([
    ...spacer,
    {
      label: process.platform === "darwin" ? "YouTube Music" : "File",
      submenu: [
        { label: "Settings", accelerator: process.platform === "darwin" ? "Command+Shift+S" : "Ctrl+Shift+S", click: () => showSettings() },
        { type: "separator" },
        { label: process.platform === "darwin" ? "Quit" : "Exit", role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Developer Tools", accelerator: process.platform === "darwin" ? "Command+Option+I" : "Ctrl+Shift+I", click: () => mainWindow?.webContents?.toggleDevTools() },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    title: "Settings - YouTube Music",
    width: 600,
    height: 550,
    show: false,
    backgroundColor: "#0a0a0a",
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload-settings.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexUrl = isDev
    ? "http://localhost:1420/index.html"
    : "file://" + path.join(__dirname, "..", "dist", "index.html").split(path.sep).join("/");
  settingsWindow.loadURL(indexUrl);

  // Force-inject dark styles - overrides everything
  settingsWindow.webContents.on("did-finish-load", () => {
    settingsWindow.webContents.insertCSS(`
      html, body { background: #0a0a0a !important; color: #fff !important; }
      #root, .settings-app { background: #0a0a0a !important; }
    `);
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
    settingsWindow.focus();
  });
}

function showSettings() {
  createSettingsWindow();
}

function createTray() {
  tray = new Tray(getIconPath());
  tray.setToolTip("YouTube Music - Left-click for menu");
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show", click: () => mainWindow?.show() },
    { label: "Settings", click: () => showSettings() },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow?.show());
}

app.whenReady().then(() => {
  ensureDefaultPlugins();
  createMainWindow();
  createTray();

  const s = getSettings();
  if (s.general.start_minimized) {
    mainWindow?.hide();
  }

  try {
    app.setLoginItemSettings({ openAtLogin: s.general.launch_at_login });
  } catch {}

  // Register settings shortcut; use fallback if primary conflicts with system (e.g. Linux screenshot tools)
  const shortcuts =
    process.platform === "darwin"
      ? ["Command+Shift+S", "Command+Alt+S"]
      : ["Ctrl+Shift+S", "Ctrl+Alt+S"];
  let registered = false;
  for (const accel of shortcuts) {
    if (globalShortcut.register(accel, () => showSettings())) {
      registered = true;
      break;
    }
  }
  if (!registered) {
    console.warn("[YTM] Could not register settings shortcut; use tray menu or Settings in app menu.");
  }

  const initialSettings = getSettings();
  let lastEnabledPlugins = (initialSettings.plugins?.enabled_plugins || []).slice().sort();

  ipcMain.handle("get-settings", () => getSettings());
  ipcMain.handle("set-settings", (_, settings) => {
    const prevPlugins = lastEnabledPlugins;
    lastEnabledPlugins = (settings?.plugins?.enabled_plugins || []).slice().sort();
    setSettings(settings);
    try {
      app.setLoginItemSettings({ openAtLogin: settings.general.launch_at_login });
    } catch {}
    const theme = settings?.appearance?.theme || "system";
    if (["light", "dark", "system"].includes(theme)) {
      nativeTheme.themeSource = theme;
    }
    if (settings?.discord && discordClient) {
      const { enabled, client_id } = settings.discord;
      if (!enabled || !client_id || client_id.startsWith("REPLACE_") || !/^\d+$/.test(client_id)) {
        try {
          if (typeof discordClient.destroy === "function") discordClient.destroy();
          else if (typeof discordClient.disconnect === "function") discordClient.disconnect();
        } catch {}
        discordClient = null;
      }
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("settings-changed");
    }
    const pluginsChanged =
      !prevPlugins ||
      prevPlugins.length !== lastEnabledPlugins.length ||
      prevPlugins.some((p, i) => p !== lastEnabledPlugins[i]);
    if (pluginsChanged && mainWindow && !mainWindow.isDestroyed()) {
      const url = mainWindow.webContents.getURL();
      if (url && url.includes("music.youtube.com")) {
        mainWindow.webContents.reload();
      }
    } else {
      applySettingsToMainWebview();
    }
  });
  ipcMain.handle("list-plugins", () => scanPlugins());
  ipcMain.handle("debug-plugins", () => ({
    app_data_dir: getAppDataDir(),
    plugins_dir_exists: require("fs").existsSync(getPluginsDir()),
    enabled_plugins: getEnabledPlugins(),
    script_length: getPluginInjectionScript().length,
    script_preview:
      getPluginInjectionScript().slice(0, 200) +
      (getPluginInjectionScript().length > 200 ? "..." : ""),
  }));
  ipcMain.handle("get-playback-state", () => lastPlaybackState);
  ipcMain.handle("report-playback", (_, state) => {
    if (state && typeof state === "object") reportPlaybackState(state);
  });
  ipcMain.on("open-settings", () => showSettings());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (e) => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();

  if (discordClient) {
    // Discord RPC disconnect is async (doesn't return Promise) - delay quit to allow cleanup
    e.preventDefault();
    const client = discordClient;
    discordClient = null;
    try {
      if (typeof client.destroy === "function") client.destroy();
      else if (typeof client.disconnect === "function") client.disconnect();
    } catch {}
    // Give Discord IPC time to close before proceeding with quit
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.destroy();
      if (tray) {
        try {
          tray.destroy();
        } catch {}
        tray = null;
      }
      mainWindow = null;
      settingsWindow = null;
      app.quit();
    }, 150);
    return;
  }

  // No Discord - destroy windows and tray explicitly for clean shutdown
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.destroy();
  if (tray) {
    try {
      tray.destroy();
    } catch {}
    tray = null;
  }
  mainWindow = null;
  settingsWindow = null;
});
