# YouTube Music Desktop Client

A desktop app for [YouTube Music](https://music.youtube.com) on Windows, Linux, and macOS. Listen with a native window, system tray, synced lyrics, Discord status, and optional plugins.

## Download

Get the latest release from [GitHub Releases](https://github.com/Azalea224/youtubemusic/releases). Pick the file for your system:

| Platform | File |
|----------|------|
| **Windows** | `.exe` installer or portable `.exe` |
| **macOS** | `.dmg` or `.zip` |
| **Linux** | `.AppImage` or `.deb` |

## Features

- **YouTube Music** – Full YouTube Music experience in a desktop window
- **Lyrics** – Synced lyrics overlay (closed-caption style) from NetEase Cloud, LRCLIB, or YouTube
- **Discord Rich Presence** – Show what you’re listening to on Discord
- **Plugins** – Add extra features via plugins (e.g. fine volume control, lyrics)
- **Settings** – General, Appearance, Playback, Discord, Plugins, and more
- **System Tray** – Minimize to tray; open from the tray icon
- **Portable** – AppImage on Linux, portable exe on Windows

## Opening Settings

- **Shortcut**: `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (macOS)
- **Menu**: File → Settings
- **Tray**: Right‑click the tray icon → Settings

If the shortcut doesn’t work (e.g. conflicts with another app), use the menu or tray.

## Discord Rich Presence

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create an application
2. Copy the **Application ID**
3. In the app: Settings → Discord → paste the ID

## Lyrics

The app includes a **Multi-Source Lyrics (Closed Captions)** plugin that shows synced lyrics at the bottom of the screen. It fetches lyrics from:

- **NetEase Cloud** (primary)
- **LRCLIB** (fallback)
- **YouTube** (integrated captions)

Choose your source in the CC dropdown, or use **Auto** to try them in order. Lyrics appear automatically when you play a track. Use the **Hide** / **Show** button to toggle the overlay.

## Plugins

Plugins are managed in **Settings → Plugins**. Enable or disable them there. New plugins go in the app’s plugins folder (shown in Settings → Plugins).

## Screenshots

<img width="1200" height="800" alt="image" src="https://github.com/user-attachments/assets/aab337b9-8373-450e-86e7-7a7b21783a1a" />


## License

MIT
