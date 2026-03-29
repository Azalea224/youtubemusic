# YouTube Music Desktop Client

A desktop wrapper for [YouTube Music](https://music.youtube.com), **developed for Linux first** (Wayland and X11, KDE/GNOME-style desktops, tray integration, and Arch packaging). A **Windows** portable build is also provided for parity.

You get a native window, system tray, synced lyrics, Discord status, and optional plugins.

---

## Download

Releases are on [GitHub Releases](https://github.com/Azalea224/youtubemusic/releases). **Linux is the primary target**; pick the binary that matches your system:

| Platform | File |
|----------|------|
| **Linux** (recommended) | `.AppImage` (portable); `.deb` / `.rpm` (install with `apt`/`dnf`/`rpm`); `.pkg.tar.*` (Arch, `pacman -U`) |
| **Windows** (secondary) | portable `.exe` |

On Linux, the app detects a Wayland session (`XDG_SESSION_TYPE=wayland`) and uses native Wayland when available; global shortcuts use the GlobalShortcuts portal. Appearance options can follow the system theme and (on KDE Plasma) accent colours from `~/.config/kdeglobals`.

**Desktop integration (Linux)**

- **MPRIS** – Playback metadata and controls are exposed on the session D-Bus (`org.mpris.MediaPlayer2`), so GNOME/KDE media controls, lock-screen widgets, and hardware keys can drive play/pause/next/previous when the app is running.
- **Single instance** – Launching the app again focuses the existing window instead of opening a second process.
- **Deep links** – The `youtubemusic` URL scheme opens the app and navigates the embedded player to a YouTube Music URL, for example:

  `youtubemusic://open?url=https%3A%2F%2Fmusic.youtube.com%2Fwatch%3Fv%3D…`

  Packaged builds register `x-scheme-handler/youtubemusic` in the `.desktop` entry where the installer supports it.

**`.deb` / `.rpm` from releases** (pick the asset for your CPU architecture):

```bash
# Debian / Ubuntu (example: x64 .deb from the release page)
sudo apt install ./YouTubeMusic-*-linux-x64.deb

# Fedora / RHEL-style (example: x64 .rpm)
sudo dnf install ./YouTubeMusic-*-linux-x64.rpm
```

### Arch Linux (`pacman`)

- **From GitHub Releases** – Use the `YouTubeMusic-*-linux-x64.pkg.tar.*` or `…-linux-arm64.pkg.tar.*` asset for your CPU, then:

```bash
sudo pacman -U ./YouTubeMusic-*-linux-*.pkg.tar.*
```

- **From source** – Clone this repo and run `npm run electron:build` to produce Linux artifacts under `release/` (see `package.json` / electron-builder config). For Arch, the `.pkg.tar.*` from GitHub Releases is the supported install path unless you maintain your own PKGBUILD.

## Features

- **YouTube Music** – Full YouTube Music experience in a desktop window
- **Ad handling** – Network-level blocking (EasyList-style filters via Ghostery) plus DOM-level skip (click “Skip ad”, close overlays, seek in-stream ads to end); when an ad is playing, Discord and playback state are not updated
- **Lyrics** – Synced lyrics overlay (closed-caption style) from NetEase Cloud, LRCLIB, or YouTube
- **Discord Rich Presence** – Show what you’re listening to on Discord
- **Plugins** – Add extra features via plugins (e.g. fine volume control, lyrics)
- **Settings** – General, Appearance, Discord, Plugins, and Advanced (custom CSS/JS)
- **System Tray** – Minimize to tray; open from the tray icon
- **Portable** – AppImage or Arch package on Linux (primary); portable `.exe` on Windows

## Opening Settings

- **Shortcut**: `Ctrl+Shift+S` (Linux / Windows)
- **Menu**: File → Settings
- **Tray**: Right‑click the tray icon → Settings

If the shortcut doesn’t work (e.g. conflicts with another app), use the menu or tray.

## Discord Rich Presence

Enable **Settings → Discord** to show what you are listening to. The app ships with a built-in Discord application for Rich Presence; use **arRPC** if you use Discord in the browser or Vesktop (see the in-app toggle and hint text).

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
- **Lint & types**: `npm run lint` and `npm run typecheck`.
- **Settings UI (React)**: `npm run test` (watch) or `npm run test:run` (single run). Uses Vitest and Testing Library.
- **Electron scripts**: `npm run test:electron` runs the playback ad-detection unit tests (Node).
- **All tests**: `npm run test:all` runs both the Vitest suite and the Electron script tests.

## Screenshots

<img width="1200" height="800" alt="image" src="https://github.com/user-attachments/assets/aab337b9-8373-450e-86e7-7a7b21783a1a" />

## License

MIT
