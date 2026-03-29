/**
 * Read Plasma accent / highlight colours from ~/.config/kdeglobals (Linux).
 * No KDE libraries required — parses the same INI file KConfig uses.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

function getKdeglobalsPath() {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdg, "kdeglobals");
}

/** Minimal INI parser (KDE sections and key=value). */
function parseSimpleIni(content) {
  /** @type {Record<string, Record<string, string>>} */
  const sections = {};
  let current = "";
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith(";")) continue;
    if (t.startsWith("[") && t.endsWith("]")) {
      current = t.slice(1, -1);
      if (!sections[current]) sections[current] = {};
      continue;
    }
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    sections[current][key] = val;
  }
  return sections;
}

function parseRgbOrHex(s) {
  if (!s) return null;
  const hex = s.match(/^#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const parts = s.split(",").map((x) => parseInt(x.trim(), 10));
  if (parts.length >= 3 && parts.every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) {
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}

function rgbToHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Returns a CSS hex colour for the current Plasma accent / highlight, or null.
 */
function readKdeAccentColor() {
  if (process.platform !== "linux") return null;
  let content;
  try {
    content = fs.readFileSync(getKdeglobalsPath(), "utf8");
  } catch {
    return null;
  }
  const ini = parseSimpleIni(content);
  const general = ini.General || {};
  const button = ini["Colors:Button"] || {};
  const selection = ini["Colors:Selection"] || {};
  const view = ini["Colors:View"] || {};

  const candidates = [
    general.AccentColor,
    general.accentColor,
    button.DecorationFocus,
    button.ForegroundActive,
    selection.BackgroundNormal,
    view.DecorationFocus,
  ];
  for (const raw of candidates) {
    const rgb = parseRgbOrHex(raw);
    if (rgb) return rgbToHex(rgb);
  }
  return null;
}

function isKdeAccentAvailable() {
  if (process.platform !== "linux") return false;
  try {
    fs.accessSync(getKdeglobalsPath(), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Watch kdeglobals for changes (accent / colour scheme updates in System Settings).
 * @param {() => void} onChange debounced callback
 * @returns {fs.FSWatcher | null}
 */
function watchKdeglobals(onChange) {
  const fp = getKdeglobalsPath();
  let timer = null;
  try {
    return fs.watch(fp, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onChange();
      }, 300);
    });
  } catch {
    return null;
  }
}

module.exports = {
  readKdeAccentColor,
  isKdeAccentAvailable,
  watchKdeglobals,
  getKdeglobalsPath,
};
