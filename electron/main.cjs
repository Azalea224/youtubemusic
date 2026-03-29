const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, nativeTheme, session, WebContentsView } = require("electron");
const path = require("path");
const fs = require("fs");
const createDiscordRPC = require("discord-rich-presence");
const WebSocket = require("ws");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const fetch = require("cross-fetch");
const kdeAccent = require("./kde-accent.cjs");
const { createDiscordPresence } = require("./discord-presence.cjs");

const TITLEBAR_HEIGHT_NORMAL = 40;
const TITLEBAR_HEIGHT_COMPACT = 28;

function getTitlebarHeight() {
  const s = getSettings();
  return s.appearance.compact_mode ? TITLEBAR_HEIGHT_COMPACT : TITLEBAR_HEIGHT_NORMAL;
}

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
/** Delay (ms) before quitting to allow Discord RPC to disconnect. */
const DISCORD_QUIT_DELAY_MS = 150;

// Explicit app name for WM_CLASS matching (Linux/COSMIC/GNOME taskbar, Alt+Tab)
app.name = "YouTube Music";

// Windows: set AppUserModelID before any windows are created (fixes taskbar icon)
if (process.platform === "win32") {
  app.setAppUserModelId("com.youtube-music.client");
}

// Linux: Wayland and global shortcuts
if (process.platform === "linux") {
  const features = ["GlobalShortcutsPortal"];
  if (process.env.XDG_SESSION_TYPE === "wayland") {
    features.push("UseOzonePlatform", "WaylandWindowDecorations");
    app.commandLine.appendSwitch("ozone-platform", "wayland");
  }
  app.commandLine.appendSwitch("enable-features", features.join(","));
}

tryRegisterYoutubemusicProtocol();

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
let titlebarView = null;
let contentView = null;
let settingsWindow = null;
let tray = null;
let lastPlaybackState = null;
/** @type {import("fs").FSWatcher | null} */
let kdeglobalsWatcher = null;
let mprisLinux = null;
/** macOS: protocol URL may arrive before ready */
let pendingDeepLink = null;

const discordPresence = createDiscordPresence({
  createDiscordRPC,
  WebSocket,
  isDev,
  getSettings,
  getLastPlaybackState: () => lastPlaybackState,
});

/** WebContents for the YTM page (content view). Use for injection and playback. */
function getContentWebContents() {
  return contentView && contentView.webContents && !contentView.webContents.isDestroyed()
    ? contentView.webContents
    : null;
}

function navigateYtm(url) {
  const wc = getContentWebContents();
  if (!wc || wc.isDestroyed()) return;
  if (url && url.startsWith("https://music.youtube.com")) {
    wc.loadURL(url);
  }
}

/** Expects `youtubemusic://open?url=https%3A%2F%2Fmusic.youtube.com%2F...` */
function handleDeepLinkUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return;
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "youtubemusic:") return;
    const explicit = u.searchParams.get("url");
    if (explicit) {
      const decoded = decodeURIComponent(explicit);
      if (decoded.startsWith("https://music.youtube.com")) {
        navigateYtm(decoded);
      }
    }
  } catch (err) {
    console.warn("[YTM] Deep link:", err && err.message ? err.message : err);
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function buildYtmMediaScript(kind) {
  const body = {
    playpause: `var b=q(bar,'#play-pause-button');if(b)b.click();`,
    play: `var b=q(bar,'#play-pause-button');if(b){var l=(b.getAttribute('aria-label')||'').toLowerCase();if(l.indexOf('play')>=0)b.click();}`,
    pause: `var b=q(bar,'#play-pause-button');if(b){var l=(b.getAttribute('aria-label')||'').toLowerCase();if(l.indexOf('pause')>=0)b.click();}`,
    next: `var b=q(bar,'#next-button')||q(bar,'.next-button');if(b)b.click();`,
    previous: `var b=q(bar,'#previous-button')||q(bar,'.previous-button');if(b)b.click();`,
    stop: `var b=q(bar,'#play-pause-button');if(b){var l=(b.getAttribute('aria-label')||'').toLowerCase();if(l.indexOf('pause')>=0)b.click();}`,
  }[kind];
  if (!body) return "";
  return `(function(){try{function q(root,sel){if(!root)return null;var sr=root.shadowRoot||root._shadowRoot;if(sr){var r=sr.querySelector(sel);if(r)return r;}return root.querySelector(sel);}var bar=document.querySelector('ytmusic-player-bar');if(!bar)return;${body}}catch(e){}})();`;
}

function runYtmMediaAction(kind) {
  const wc = getContentWebContents();
  if (!wc || wc.isDestroyed()) return;
  const script = buildYtmMediaScript(kind);
  if (script) wc.executeJavaScript(script).catch(() => {});
}

function processPendingDeepLinks() {
  if (pendingDeepLink) {
    handleDeepLinkUrl(pendingDeepLink);
    pendingDeepLink = null;
    return;
  }
  for (const arg of process.argv) {
    if (typeof arg === "string" && arg.startsWith("youtubemusic://")) {
      handleDeepLinkUrl(arg);
      break;
    }
  }
}

function tryRegisterYoutubemusicProtocol() {
  try {
    app.setAsDefaultProtocolClient("youtubemusic");
  } catch {}
}

function getAppDataDir() {
  return app.getPath("userData");
}

function getPluginsDir() {
  return path.join(getAppDataDir(), "plugins");
}

/** Enable network-level ad/tracking blocking on the default session. */
async function enableAdblocker() {
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(session.defaultSession);
  } catch (err) {
    console.warn("[YTM] Adblocker failed to load:", err?.message || err);
  }
}

function getSettings() {
  const defaults = {
    general: {
      start_minimized: false,
      minimize_to_tray: true,
      launch_at_login: false,
    },
    appearance: {
      theme: "system",
      accent_color: "#b0b0b0",
      accent_source: "custom",
      font_size: "medium",
      compact_mode: false,
    },
    discord: {
      enabled: true,
      show_buttons: true,
      hide_listening: false,
      use_arrpc: false,
    },
    plugins: {
      enabled_plugins: [],
    },
    advanced: {
      custom_css: "",
      custom_js: "",
    },
  };
  const store = loadStore();
  const merged = {
    general: { ...defaults.general, ...store.general },
    appearance: { ...defaults.appearance, ...store.appearance },
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
  if (!state || typeof state !== "object") return;
  if (state.isAdvertisement) return;
  if (!state.title && !state.artist) return;
  lastPlaybackState = state;
  if (process.platform === "linux" && mprisLinux) {
    try {
      mprisLinux.sync(state);
    } catch {}
  }
  const wc = getContentWebContents();
  if (wc && !wc.isDestroyed()) wc.send("playback-update", state);
  discordPresence.updatePresence(state);
}

function makePollInjectOnceScript() {
  const scriptsDir = path.join(__dirname, "scripts");
  const pollPath = path.join(scriptsDir, "playback-poll.js");
  try {
    const { isAdvertisement } = require(path.join(scriptsDir, "playback-ad.cjs"));
    const adPrefix = "window.__ytmIsAd=" + isAdvertisement.toString() + ";\n";
    const pollScript = fs.readFileSync(pollPath, "utf8");
    return adPrefix + pollScript;
  } catch (err) {
    console.warn("[YTM] Playback poll script not found:", pollPath, err?.message);
    return "";
  }
}

function injectPlaybackPollIfEnabled() {
  const wc = getContentWebContents();
  if (!wc || wc.isDestroyed()) return;
  const script = makePollInjectOnceScript();
  wc.executeJavaScript(script).catch(() => {});
}

function getEffectiveAccentColor() {
  const s = getSettings();
  const a = s.appearance || {};
  const fallback = (a.accent_color || "#b0b0b0").trim();
  if ((a.accent_source || "custom") !== "kde") return fallback;
  const kde = kdeAccent.readKdeAccentColor();
  return kde || fallback;
}

function notifyKdeAccentPreview() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("kde-accent-changed");
  }
}

function refreshKdeAccentUi() {
  if (titlebarView && titlebarView.webContents && !titlebarView.webContents.isDestroyed()) {
    titlebarView.webContents.loadURL(getTitlebarUrl());
  }
  applySettingsToMainWebview();
  notifyKdeAccentPreview();
}

function setupKdeAccentWatcher() {
  if (kdeglobalsWatcher) {
    try {
      kdeglobalsWatcher.close();
    } catch {}
    kdeglobalsWatcher = null;
  }
  const s = getSettings();
  if (process.platform !== "linux" || (s.appearance?.accent_source || "custom") !== "kde") return;
  kdeglobalsWatcher = kdeAccent.watchKdeglobals(() => {
    refreshKdeAccentUi();
  });
}

function buildAppearanceCss() {
  const s = getSettings();
  const a = s.appearance || {};
  const accent = getEffectiveAccentColor();
  const theme = (a.theme || "system").toLowerCase();
  const fontScale = { small: "13px", medium: "14px", large: "16px" }[a.font_size || "medium"] || "14px";
  const lines = [];
  lines.push("/* YTM appearance (accent, font-size, compact) */");
  lines.push(":root { --ytm-accent: " + accent + "; --ytm-font-size: " + fontScale + "; }");
  lines.push("html { font-size: " + fontScale + " !important; }");
  lines.push(
    "a, [href], ytmusic-nav-bar .nav-bar-content a[active], .ytmusic-player-bar progress, [primary], .yt-spec-button-shape-next--filled { color: " +
      accent +
      " !important; }"
  );
  lines.push(
    "ytmusic-nav-bar .nav-bar-content a[active] { border-bottom-color: " + accent + " !important; }"
  );
  if (a.compact_mode) {
    lines.push("ytmusic-app-layout, #content { padding: 4px !important; }");
    lines.push("ytmusic-nav-bar { min-width: 48px !important; }");
  }
  if (theme === "light" || theme === "dark") {
    lines.push(
      "html { color-scheme: " +
        theme +
        " !important; }"
    );
  }
  return lines.join("\n");
}

function applySettingsToMainWebview() {
  const wc = getContentWebContents();
  if (!wc || wc.isDestroyed()) return;
  const pluginScript = getPluginInjectionScript();
  if (pluginScript) {
    wc.executeJavaScript(pluginScript).catch((err) => {
      console.error("[YTM] Plugin injection failed:", err);
    });
  }
  injectPlaybackPollIfEnabled();
  const s = getSettings();
  const appearanceCss = buildAppearanceCss();
  const customCss = (s.advanced.custom_css || "").trim();
  const fullCss = (appearanceCss ? appearanceCss + "\n\n" : "") + customCss;
  if (fullCss) {
    const escaped = JSON.stringify(fullCss);
    wc.executeJavaScript(
      "(function(){ var el = document.getElementById('ytm-custom-css'); if (el) el.remove(); if (!document.head) return; el = document.createElement('style'); el.id = 'ytm-custom-css'; el.textContent = " +
        escaped +
        "; document.head.appendChild(el); })();"
    ).catch(() => {});
  } else {
    wc.executeJavaScript(
      "(function(){ var el=document.getElementById('ytm-custom-css'); if(el)el.remove(); })();"
    ).catch(() => {});
  }
  const customJs = s.advanced.custom_js || "";
  if (customJs) wc.executeJavaScript(customJs).catch(() => {});
}

function scanPlugins() {
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

/** Resolve light/dark for the custom titlebar using Electron's nativeTheme (XDG portal / GTK on Linux). */
function resolveTitlebarDark() {
  const s = getSettings();
  const theme = (s.appearance?.theme || "system").toLowerCase();
  if (theme === "light") return false;
  if (theme === "dark") return true;
  return nativeTheme.shouldUseDarkColors;
}

function getTitlebarUrl() {
  const s = getSettings();
  const params = new URLSearchParams({
    theme: s.appearance.theme || "system",
    accent: getEffectiveAccentColor(),
    font: s.appearance.font_size || "medium",
    compact: String(!!s.appearance.compact_mode),
    dark: resolveTitlebarDark() ? "1" : "0",
  });
  const titlebarPath = path.join(__dirname, "titlebar.html");
  return "file://" + titlebarPath.replace(/\\/g, "/") + "?" + params.toString();
}

function layoutViews() {
  if (!mainWindow || mainWindow.isDestroyed() || !titlebarView || !contentView) return;
  const h = getTitlebarHeight();
  const [w, height] = mainWindow.getSize();
  titlebarView.setBounds({ x: 0, y: 0, width: w, height: h });
  contentView.setBounds({ x: 0, y: h, width: w, height: Math.max(0, height - h) });
}

function createMainWindow() {
  const winOpts = {
    title: "YouTube Music",
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    icon: getIconPath(),
    backgroundColor: resolveTitlebarDark() ? "#303030" : "#ebebeb",
    titleBarStyle: "hidden",
    titleBarOverlay: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
  mainWindow = new BrowserWindow(winOpts);

  titlebarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload-titlebar.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  contentView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload-ytm.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.contentView.addChildView(contentView);
  mainWindow.contentView.addChildView(titlebarView);
  titlebarView.webContents.loadURL(getTitlebarUrl());
  titlebarView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  contentView.webContents.setMaxListeners(20);
  contentView.webContents.loadURL("https://music.youtube.com");
  contentView.webContents.setWindowOpenHandler(({ url }) => {
    if (url && url.startsWith("https://music.youtube.com")) {
      contentView.webContents.loadURL(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  contentView.webContents.on("did-finish-load", () => {
    const url = contentView.webContents.getURL();
    if (url && url.includes("music.youtube.com")) {
      applySettingsToMainWebview();
    }
  });

  layoutViews();
  mainWindow.on("resize", layoutViews);

  if (isDev && process.env.YTM_DEBUG) {
    contentView.webContents.openDevTools();
  }

  mainWindow.on("close", (e) => {
    const s = getSettings();
    if (s.general.minimize_to_tray && !app.isQuitting) {
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
    titlebarView = null;
    contentView = null;
  });

  // Minimal menu with Settings and DevTools (fallback when global shortcut conflicts on some platforms)
  const appMenu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        { label: "Settings", accelerator: "Ctrl+Shift+S", click: () => showSettings() },
        { type: "separator" },
        { label: "Exit", role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Developer Tools", accelerator: "Ctrl+Shift+I", click: () => getContentWebContents()?.toggleDevTools() },
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
  settingsWindow.setMenuBarVisibility(false);

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

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    focusMainWindow();
    for (const arg of commandLine) {
      if (typeof arg === "string" && arg.startsWith("youtubemusic://")) {
        handleDeepLinkUrl(arg);
        break;
      }
    }
  });

  if (process.platform === "darwin") {
    app.on("open-url", (event, url) => {
      event.preventDefault();
      pendingDeepLink = url;
      if (app.isReady()) {
        handleDeepLinkUrl(url);
        pendingDeepLink = null;
      }
    });
  }

  app.whenReady().then(async () => {
  await enableAdblocker();
  ensureDefaultPlugins();
  const s = getSettings();
  const theme = s.appearance?.theme || "system";
  if (["light", "dark", "system"].includes(theme)) nativeTheme.themeSource = theme;
  createMainWindow();
  createTray();
  setupKdeAccentWatcher();

  if (process.platform === "linux") {
    try {
      mprisLinux = require("./mpris-linux.cjs");
      mprisLinux.init({
        onRaise: () => focusMainWindow(),
        onQuit: () => app.quit(),
        onMediaAction: (kind) => runYtmMediaAction(kind),
        getPositionSec: () => (lastPlaybackState && lastPlaybackState.progress) || 0,
      });
    } catch (e) {
      console.warn("[YTM] MPRIS:", e.message);
      mprisLinux = null;
    }
  }
  processPendingDeepLinks();

  if (s.general.start_minimized) {
    mainWindow?.hide();
  }

  try {
    app.setLoginItemSettings({ openAtLogin: s.general.launch_at_login });
  } catch {}

  // Register settings shortcut; use fallback if primary conflicts with system (e.g. Linux screenshot tools)
  const shortcuts = ["Ctrl+Shift+S", "Ctrl+Alt+S"];
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

  nativeTheme.on("updated", () => {
    const t = getSettings().appearance?.theme || "system";
    if (t !== "system") return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setBackgroundColor(resolveTitlebarDark() ? "#303030" : "#ebebeb");
      } catch {}
    }
    if (titlebarView && titlebarView.webContents && !titlebarView.webContents.isDestroyed()) {
      titlebarView.webContents.loadURL(getTitlebarUrl());
    }
  });

  const initialSettings = getSettings();
  let lastEnabledPlugins = (initialSettings.plugins?.enabled_plugins || []).slice().sort();

  ipcMain.handle("get-settings", () => getSettings());
  ipcMain.handle("get-effective-accent-color", () => getEffectiveAccentColor());
  ipcMain.handle("get-kde-accent-available", () => kdeAccent.isKdeAccentAvailable());
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
    discordPresence.applyDiscordSettingsChange(settings);
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("settings-changed");
    }
    if (titlebarView && titlebarView.webContents && !titlebarView.webContents.isDestroyed()) {
      titlebarView.webContents.loadURL(getTitlebarUrl());
    }
    setupKdeAccentWatcher();
    layoutViews();
    const pluginsChanged =
      !prevPlugins ||
      prevPlugins.length !== lastEnabledPlugins.length ||
      prevPlugins.some((p, i) => p !== lastEnabledPlugins[i]);
    const wc = getContentWebContents();
    if (pluginsChanged && wc && !wc.isDestroyed()) {
      const url = wc.getURL();
      if (url && url.includes("music.youtube.com")) wc.reload();
    } else {
      applySettingsToMainWebview();
    }
  });
  ipcMain.handle("list-plugins", () => scanPlugins());
  ipcMain.handle("debug-plugins", () => ({
    app_data_dir: getAppDataDir(),
    plugins_dir_exists: fs.existsSync(getPluginsDir()),
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
  ipcMain.handle("titlebar-show-app-menu", (_, which, x, y) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const menu = Menu.getApplicationMenu();
    if (!menu || !menu.items) return;
    const item = menu.items.find(
      (m) => m.submenu && (which === "file" ? (m.label === "File" || m.label === "YouTube Music") : m.label === "View")
    );
    if (!item || !item.submenu) return;
    const bounds = mainWindow.getBounds();
    const screenX = bounds.x + (typeof x === "number" ? x : 0);
    const screenY = bounds.y + (typeof y === "number" ? y : getTitlebarHeight());
    item.submenu.popup({ window: mainWindow, x: Math.round(screenX), y: Math.round(screenY) });
  });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", (e) => {
  app.isQuitting = true;
  if (kdeglobalsWatcher) {
    try {
      kdeglobalsWatcher.close();
    } catch {}
    kdeglobalsWatcher = null;
  }
  globalShortcut.unregisterAll();

  if (discordPresence.isConnected()) {
    e.preventDefault();
    const client = discordPresence.takeNativeClientForQuit();
    try {
      if (client) {
        if (typeof client.destroy === "function") client.destroy();
        else if (typeof client.disconnect === "function") client.disconnect();
      }
    } catch {}
    discordPresence.closeArrpc();
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
    }, DISCORD_QUIT_DELAY_MS);
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
}
