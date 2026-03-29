/**
 * Maps persisted settings (snake_case JSON from main process) to renderer-friendly camelCase and back.
 */

function fromPersisted(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const g = raw.general || {};
  const a = raw.appearance || {};
  const d = raw.discord || {};
  const p = raw.plugins || {};
  const adv = raw.advanced || {};
  return {
    general: {
      startMinimized: !!g.start_minimized,
      minimizeToTray: g.minimize_to_tray !== false,
      launchAtLogin: !!g.launch_at_login,
    },
    appearance: {
      theme: typeof a.theme === "string" ? a.theme : "system",
      accentColor: String(a.accent_color ?? "#b0b0b0").trim(),
      accentSource: a.accent_source === "kde" ? "kde" : "custom",
      fontSize: ["small", "medium", "large"].includes(a.font_size) ? a.font_size : "medium",
      compactMode: !!a.compact_mode,
    },
    discord: {
      enabled: d.enabled !== false,
      showButtons: d.show_buttons !== false,
      hideListening: !!d.hide_listening,
      useArrpc: !!d.use_arrpc,
    },
    plugins: {
      enabledPlugins: Array.isArray(p.enabled_plugins) ? [...p.enabled_plugins] : [],
    },
    advanced: {
      customCss: typeof adv.custom_css === "string" ? adv.custom_css : "",
      customJs: typeof adv.custom_js === "string" ? adv.custom_js : "",
    },
  };
}

function toPersisted(ui) {
  if (!ui || typeof ui !== "object") return ui;
  const g = ui.general || {};
  const a = ui.appearance || {};
  const d = ui.discord || {};
  const p = ui.plugins || {};
  const adv = ui.advanced || {};
  return {
    general: {
      start_minimized: !!g.startMinimized,
      minimize_to_tray: g.minimizeToTray !== false,
      launch_at_login: !!g.launchAtLogin,
    },
    appearance: {
      theme: typeof a.theme === "string" ? a.theme : "system",
      accent_color: String(a.accentColor ?? "#b0b0b0").trim(),
      accent_source: a.accentSource === "kde" ? "kde" : "custom",
      font_size: ["small", "medium", "large"].includes(a.fontSize) ? a.fontSize : "medium",
      compact_mode: !!a.compactMode,
    },
    discord: {
      enabled: d.enabled !== false,
      show_buttons: d.showButtons !== false,
      hide_listening: !!d.hideListening,
      use_arrpc: !!d.useArrpc,
    },
    plugins: {
      enabled_plugins: Array.isArray(p.enabledPlugins) ? [...p.enabledPlugins] : [],
    },
    advanced: {
      custom_css: typeof adv.customCss === "string" ? adv.customCss : "",
      custom_js: typeof adv.customJs === "string" ? adv.customJs : "",
    },
  };
}

module.exports = { fromPersisted, toPersisted };
