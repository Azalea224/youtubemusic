# YouTube Music Client Plugins (Electron)

Plugins extend the YouTube Music webview with custom functionality. They run in the YTM page context and use the `window.ytm` API for Electron IPC.

## Plugin Structure

Each plugin is a folder containing:

- **manifest.json** – `{ "name", "version", "description?", "main", "permissions" }`
- **index.js** – Entry point (IIFE or self-executing script)

## window.ytm API

Plugins have access to `window.ytm` (exposed by the Electron preload):

| Method | Description |
|--------|-------------|
| `openSettings()` | Opens the Settings window |
| `getPlaybackState()` | Returns `Promise` with `{title, artist, album, state, progress, duration}` or `null` |
| `reportPlayback(state)` | Reports playback state to the main process (used internally for Discord, etc.). |
| `onPlaybackUpdate(fn)` | Subscribe to playback updates. `fn(state)` is called when playback changes. Returns unsubscribe function. |

## Example Plugin

See `plugins/example/` for a minimal plugin that demonstrates `getPlaybackState` and `onPlaybackUpdate`.

## Writing Plugins

1. Use an IIFE to avoid polluting the global scope: `(function() { 'use strict'; ... })();`
2. Guard against double-loading: `if (window.__yourPluginLoaded) return;`
3. Check for `window.ytm` before using IPC methods (only available in Electron)
4. Prefer `navigator.mediaSession.metadata` for track info when available (title, artist)
5. Run only on `music.youtube.com`: `if (!document.location.hostname.includes('music.youtube.com')) return;`

## Installation

Place plugin folders in the app data `plugins/` directory:

- **Linux**: `~/.config/youtube-music-client/plugins/`
- **macOS**: `~/Library/Application Support/youtube-music-client/plugins/`
- **Windows**: `%APPDATA%\youtube-music-client\plugins\`

Enable or disable plugins in Settings > Plugins.
