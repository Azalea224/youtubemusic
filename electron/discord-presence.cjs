/**
 * Discord Rich Presence and arRPC (Vesktop / WebSocket fallback).
 * State is module-private; main passes getters for settings and last playback snapshot.
 */

/** Discord Application ID for Rich Presence (native Discord IPC and arRPC). */
const BUILTIN_DISCORD_CLIENT_ID = "1477073382104371360";

/** arRPC listens on 6463–6472. Try connecting with Origin so arRPC accepts us. */
const ARRPC_PORTS = [6463, 6464, 6465, 6466, 6467, 6468, 6469, 6470, 6471, 6472];

const ARRPC_IPC_TIMEOUT_MS = 3500;

/** @param {{ createDiscordRPC: Function; WebSocket: Function; isDev: boolean; getSettings: () => object; getLastPlaybackState: () => unknown }} deps */
function createDiscordPresence(deps) {
  const { createDiscordRPC, WebSocket, isDev, getSettings, getLastPlaybackState } = deps;

  let discordClient = null;
  let arrpcWs = null;
  let arrpcRefreshTimer = null;
  let arrpcStandaloneWarned = false;

  function tryConnectArrpcViaIPC(clientId) {
    return new Promise((resolve, reject) => {
      const client = createDiscordRPC(clientId);
      const timeout = setTimeout(() => {
        try {
          if (typeof client.destroy === "function") client.destroy();
          else if (typeof client.disconnect === "function") client.disconnect();
        } catch {}
        reject(new Error("IPC timeout"));
      }, ARRPC_IPC_TIMEOUT_MS);
      client.once("connected", () => {
        clearTimeout(timeout);
        resolve(client);
      });
      client.once("error", () => {
        clearTimeout(timeout);
        try {
          if (typeof client.destroy === "function") client.destroy();
          else if (typeof client.disconnect === "function") client.disconnect();
        } catch {}
        reject(new Error("IPC error"));
      });
    });
  }

  function connectArrpc(clientId) {
    return new Promise((resolve) => {
      let tried = 0;
      function tryPort() {
        const port = ARRPC_PORTS[tried];
        if (port == null) {
          resolve(null);
          return;
        }
        const url = `ws://127.0.0.1:${port}/?v=1&encoding=json&client_id=${clientId}`;
        const ws = new WebSocket(url, {
          origin: "https://discord.com",
        });
        const timeout = setTimeout(() => {
          try {
            ws.close();
          } catch {}
          tried++;
          tryPort();
        }, 2000);
        ws.on("open", () => {
          clearTimeout(timeout);
          resolve(ws);
        });
        ws.on("error", () => {
          clearTimeout(timeout);
          tried++;
          tryPort();
        });
        ws.on("close", () => {
          clearTimeout(timeout);
        });
      }
      tryPort();
    });
  }

  function closeArrpc() {
    if (arrpcRefreshTimer) {
      clearInterval(arrpcRefreshTimer);
      arrpcRefreshTimer = null;
    }
    if (arrpcWs) {
      try {
        arrpcWs.close();
      } catch {}
      arrpcWs = null;
    }
  }

  function safeDestroyClient(client) {
    if (!client) return;
    try {
      if (typeof client.destroy === "function") client.destroy();
      else if (typeof client.disconnect === "function") client.disconnect();
    } catch {}
  }

  /**
   * When Discord is disabled or mode switches, tear down IPC/WS as in original main.
   * @param {unknown} settings
   */
  function applyDiscordSettingsChange(settings) {
    if (!settings || typeof settings !== "object" || !settings.discord) return;
    const { enabled, use_arrpc } = settings.discord;
    if (!enabled) {
      safeDestroyClient(discordClient);
      discordClient = null;
      closeArrpc();
      return;
    }
    if (use_arrpc && discordClient) {
      safeDestroyClient(discordClient);
      discordClient = null;
    }
    if (!use_arrpc && arrpcWs) closeArrpc();
    if (!use_arrpc && discordClient) {
      safeDestroyClient(discordClient);
      discordClient = null;
    }
  }

  async function updatePresence(playback) {
    if (!playback || (!playback.title && !playback.artist)) return;
    const s = getSettings();
    const { enabled, hide_listening, use_arrpc, show_buttons } = s.discord;
    if (!enabled || hide_listening) return;
    const ytmButtons = show_buttons
      ? [
          { label: "Listen on YouTube Music", url: "https://music.youtube.com" },
          { label: "YouTube Music", url: "https://music.youtube.com" },
        ]
      : null;
    try {
      if (use_arrpc) {
        const needConnection = !discordClient && (!arrpcWs || arrpcWs.readyState !== WebSocket.OPEN);
        if (needConnection) {
          closeArrpc();
          try {
            discordClient = await tryConnectArrpcViaIPC(BUILTIN_DISCORD_CLIENT_ID);
            if (isDev) console.log("[Discord RPC] arRPC connected via IPC (discord-ipc-0)");
            discordClient.on("error", () => {
              discordClient = null;
            });
          } catch {
            discordClient = null;
            arrpcWs = await connectArrpc(BUILTIN_DISCORD_CLIENT_ID);
            if (arrpcWs) {
              if (isDev) console.log("[Discord RPC] arRPC connected via WebSocket (6463 fallback)");
              arrpcWs.on("close", () => {
                arrpcWs = null;
                if (arrpcRefreshTimer) clearInterval(arrpcRefreshTimer);
                arrpcRefreshTimer = null;
              });
              arrpcStandaloneWarned = false;
              arrpcWs.on("message", (data) => {
                if (isDev && data) console.log("[Discord RPC] arRPC reply:", String(data).slice(0, 200));
                if (data && !arrpcStandaloneWarned) {
                  try {
                    const msg = typeof data === "string" ? JSON.parse(data) : data;
                    if (msg.cmd === "DISPATCH" && msg.evt === "READY" && msg.data?.user?.username === "arrpc") {
                      arrpcStandaloneWarned = true;
                      console.warn(
                        "[Discord RPC] arRPC server is in standalone mode (no Discord client linked). " +
                          "Enable the WebRichPresence (arRPC) plugin in Vesktop (Vencord → Plugins) and close any manual npx arrpc."
                      );
                    }
                  } catch {}
                }
              });
            } else {
              if (isDev) {
                console.warn(
                  "[Discord RPC] arRPC: IPC and WebSocket (6463–6472) failed. Is the arRPC server running?"
                );
              }
              return;
            }
          }
        }
        if (discordClient) {
          const activity = {
            type: 2,
            name: "YouTube Music",
            details: playback.title,
            state: playback.artist,
            largeImageKey: "ytm",
            largeImageText: "YouTube Music",
          };
          if (ytmButtons) activity.buttons = ytmButtons;
          if (playback.state === "playing" && playback.duration > 0) {
            const now = Math.floor(Date.now() / 1000);
            activity.startTimestamp = now;
            activity.endTimestamp = now + (playback.duration - playback.progress);
          }
          discordClient.updatePresence(activity);
          if (!arrpcRefreshTimer && playback.state === "playing") {
            arrpcRefreshTimer = setInterval(() => {
              if (!discordClient && !arrpcWs) return;
              const s2 = getSettings();
              if (!s2.discord.enabled || s2.discord.hide_listening || !s2.discord.use_arrpc) return;
              updatePresence(getLastPlaybackState());
            }, 25000);
          }
          return;
        }
        if (arrpcWs && arrpcWs.readyState === WebSocket.OPEN) {
          const activity = {
            type: 2,
            name: "YouTube Music",
            state: playback.artist,
            details: playback.title,
            assets: { large_image: "ytm", large_text: "YouTube Music" },
          };
          if (ytmButtons) activity.buttons = ytmButtons;
          if (playback.state === "playing" && playback.duration > 0) {
            const now = Math.floor(Date.now() / 1000);
            activity.timestamps = {
              start: now,
              end: now + Math.max(0, Math.floor(playback.duration - playback.progress)),
            };
          }
          arrpcWs.send(
            JSON.stringify({
              cmd: "SET_ACTIVITY",
              nonce: String(Date.now()),
              args: { pid: process.pid, activity },
            })
          );
          if (isDev) console.log("[Discord RPC] arRPC SET_ACTIVITY sent (WS):", activity.details, "—", activity.state);
          if (!arrpcRefreshTimer && playback.state === "playing") {
            arrpcRefreshTimer = setInterval(() => {
              if (!discordClient && (!arrpcWs || arrpcWs.readyState !== WebSocket.OPEN)) return;
              const s2 = getSettings();
              if (!s2.discord.enabled || s2.discord.hide_listening || !s2.discord.use_arrpc) return;
              updatePresence(getLastPlaybackState());
            }, 25000);
          }
        }
        return;
      }
      if (!discordClient) {
        discordClient = createDiscordRPC(BUILTIN_DISCORD_CLIENT_ID);
      }
      const activity = {
        type: 2,
        name: "YouTube Music",
        details: playback.title,
        state: playback.artist,
        largeImageKey: "ytm",
        largeImageText: "YouTube Music",
      };
      if (ytmButtons) activity.buttons = ytmButtons;
      if (playback.state === "playing" && playback.duration > 0) {
        const now = Math.floor(Date.now() / 1000);
        activity.startTimestamp = now;
        activity.endTimestamp = now + (playback.duration - playback.progress);
      }
      discordClient.updatePresence(activity);
    } catch {
      // Discord RPC errors are non-fatal; presence will retry on next update
    }
  }

  function isConnected() {
    return !!(discordClient || arrpcWs);
  }

  /** Clear native client reference and return it so main can destroy(); then call closeArrpc(). */
  function takeNativeClientForQuit() {
    const c = discordClient;
    discordClient = null;
    return c;
  }

  return {
    updatePresence,
    closeArrpc,
    applyDiscordSettingsChange,
    isConnected,
    takeNativeClientForQuit,
  };
}

module.exports = { createDiscordPresence };
