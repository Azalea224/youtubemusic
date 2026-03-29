/**
 * MPRIS (org.mpris.MediaPlayer2) for Linux: shell media keys, lock screen, taskbar controls.
 * Requires session D-Bus (not available in headless/CI — init catches errors).
 */
const Player = require("mpris-service");

let player = null;

/**
 * @param {object} handlers
 * @param {() => void} handlers.onRaise
 * @param {() => void} handlers.onQuit
 * @param {(kind: string) => void} handlers.onMediaAction
 * @param {() => number} handlers.getPositionSec
 */
function init(handlers) {
  if (process.platform !== "linux") return;
  if (player) return;
  try {
    player = Player({
      name: "youtubemusic",
      identity: "YouTube Music",
      supportedUriSchemes: ["http", "https", "youtubemusic"],
      supportedMimeTypes: [],
      desktopEntry: "youtube-music-client",
    });
    player.canQuit = true;
    player.canRaise = true;
    player.canControl = true;
    player.canPlay = true;
    player.canPause = true;
    player.canGoNext = true;
    player.canGoPrevious = true;
    player.canSeek = false;
    player.playbackStatus = "Stopped";
    player.metadata = {
      "mpris:trackid": player.objectPath("track/0"),
      "xesam:title": "YouTube Music",
      "xesam:artist": [""],
    };
    player.getPosition = function () {
      return Math.floor((handlers.getPositionSec() || 0) * 1e6);
    };
    player.on("raise", handlers.onRaise);
    player.on("quit", handlers.onQuit);
    player.on("playpause", () => handlers.onMediaAction("playpause"));
    player.on("play", () => handlers.onMediaAction("play"));
    player.on("pause", () => handlers.onMediaAction("pause"));
    player.on("next", () => handlers.onMediaAction("next"));
    player.on("previous", () => handlers.onMediaAction("previous"));
    player.on("stop", () => handlers.onMediaAction("stop"));
    player.on("error", (err) => console.warn("[YTM] MPRIS:", err && err.message ? err.message : err));
  } catch (e) {
    player = null;
    throw e;
  }
}

/**
 * @param {object | null} state title, artist, album, state, progress, duration
 */
function sync(state) {
  if (!player) return;
  if (!state || (!state.title && !state.artist)) {
    player.playbackStatus = "Stopped";
    player.metadata = {
      "mpris:trackid": player.objectPath("track/0"),
      "xesam:title": "YouTube Music",
      "xesam:artist": [""],
    };
    return;
  }
  player.playbackStatus = state.state === "playing" ? "Playing" : "Paused";
  player.metadata = {
    "mpris:trackid": player.objectPath("track/0"),
    "mpris:length": Math.floor((state.duration || 0) * 1e6),
    "xesam:title": state.title || "Unknown",
    "xesam:artist": [state.artist || ""],
    "xesam:album": state.album || "",
  };
}

module.exports = { init, sync };
