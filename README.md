# YouTube Music Desktop Client

A desktop app for [YouTube Music](https://music.youtube.com) on Windows (portable) and Linux. Listen with a native window, system tray, synced lyrics, Discord status, and optional plugins.

---

## Download

Get the latest release from [GitHub Releases](https://github.com/Azalea224/youtubemusic/releases). Pick the file for your system:

| Platform | File |
|----------|------|
| **Linux** | `.AppImage` or `.tar.gz` |
| **Windows** | portable `.exe` |

On Linux, the app detects a Wayland session (`XDG_SESSION_TYPE=wayland`) and uses native Wayland when available; global shortcuts work via the GlobalShortcuts portal.

### Arch Linux (local install via pacman)

- **Build a local package** (generates a `*.pkg.tar.zst`) and install it with `pacman`:

```bash
cd aur-git
makepkg -s
sudo pacman -U ./*.pkg.tar.zst
```

## Features

- **YouTube Music** – Full YouTube Music experience in a desktop window
- **Ad handling** – Network-level blocking (EasyList-style filters via Ghostery) plus DOM-level skip (click “Skip ad”, close overlays, seek in-stream ads to end); when an ad is playing, Discord and playback state are not updated
- **Lyrics** – Synced lyrics overlay (closed-caption style) from NetEase Cloud, LRCLIB, or YouTube
- **Discord Rich Presence** – Show what you’re listening to on Discord
- **Plugins** – Add extra features via plugins (e.g. fine volume control, lyrics)
- **Settings** – General, Appearance, Playback, Discord, Plugins, and more
- **System Tray** – Minimize to tray; open from the tray icon
- **Portable** – AppImage on Linux, portable exe on Windows

## Opening Settings

- **Shortcut**: `Ctrl+Shift+S` (Windows/Linux)
- **Menu**: File → Settings
- **Tray**: Right‑click the tray icon → Settings

If the shortcut doesn’t work (e.g. conflicts with another app), use the menu or tray.

## Discord Rich Presence

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create an application
2. Copy the **Application ID**
3. In the app: Settings → Discord → paste the ID

## Ad handling

The app uses a two-pronged approach:

1. **Network-level** – [@ghostery/adblocker-electron](https://github.com/ghostery/adblocker) with prebuilt ads/tracking lists is applied to the default session. This blocks known ad/tracking domains and reduces clutter without blocking the main music stream or your plugins’ API requests (e.g. lyrics from NetEase Cloud).

2. **DOM-level** – An injected script detects in-stream ads (e.g. title “Advertisement”, “Sponsored”) and: clicks “Skip ad” / overlay-close when present; seeks the video to the end when an ad is detected so it finishes quickly. Playback state is not reported to Discord or the app while an ad is active, so your status keeps showing the last real track.

## Lyrics

The app includes a **Multi-Source Lyrics (Closed Captions)** plugin that shows synced lyrics at the bottom of the screen. It fetches lyrics from:

- **NetEase Cloud** (primary)
- **LRCLIB** (fallback)
- **YouTube** (integrated captions)

Choose your source in the CC dropdown, or use **Auto** to try them in order. Lyrics appear automatically when you play a track. Use the **Hide** / **Show** button to toggle the overlay.

## Plugins

Plugins are managed in **Settings → Plugins**. Enable or disable them there. New plugins go in the app’s plugins folder (shown in Settings → Plugins).

## Development & Testing

- **Run the app**: `npm run electron` (or `npm run electron:dev` for dev server + Electron).
- **Settings UI (React)**: `npm run test` (watch) or `npm run test:run` (single run). Uses Vitest and Testing Library.
- **Electron scripts**: `npm run test:electron` runs the playback ad-detection unit tests (Node).
- **All tests**: `npm run test:all` runs both the Vitest suite and the Electron script tests.

## Screenshots

<img width="1200" height="800" alt="image" src="https://github.com/user-attachments/assets/aab337b9-8373-450e-86e7-7a7b21783a1a" />

## License

MIT
