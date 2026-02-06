# YouTube Music Desktop Client

A multi-platform (Windows, Linux, macOS) YouTube Music desktop client built with Electron. Features plugin support, comprehensive settings, native Discord Rich Presence, and portable packaging (AppImage, NSIS, DMG).

## Precompiled Builds

Precompiled builds are published to [GitHub Releases](https://github.com/azalea224/youtubemusic/releases) on each version tag. Download the appropriate package for your platform:

| Platform | Format |
|----------|--------|
| **Linux** (x64) | `.AppImage`, `.deb` |
| **Linux** (ARM64) | `.AppImage`, `.deb` |
| **Windows** | `.exe` (installer), portable |
| **macOS** | `.dmg`, `.zip` |

To create a new release, push a version tag (e.g. `v0.1.0`). The CI will build for all platforms and attach the artifacts to the release.

## Features

- **YouTube Music** – Full web app embedded in a native window
- **Discord Rich Presence** – Show what you're listening to on Discord
- **Plugin System** – Extend functionality with user-installed plugins
- **Verbose Settings** – General, Appearance, Playback, Discord, Plugins, Advanced
- **System Tray** – Minimize to tray, quick access from menu
- **Portable** – AppImage (Linux), portable ZIP (Windows), .app (macOS)

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)

## Development

```bash
npm install
npm run electron:dev
```

This runs the Vite dev server and Electron. For debugging the main YouTube Music window, set `YTM_DEBUG=1`:

```bash
YTM_DEBUG=1 npm run electron:dev
```

## Build

```bash
npm run electron:build
```

Outputs are in `release/`:
- **Linux**: `.AppImage`, `.deb`
- **Windows**: `.exe`, portable
- **macOS**: `.dmg`, `.zip`

## Discord Rich Presence

Enable in Settings > Discord. To use it, add your Discord Application ID:
1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Copy the Application ID
3. Paste it in Settings > Discord > Client ID

Or, for a built-in default: set `DEFAULT_CLIENT_ID` in `electron/main.cjs` to your app's ID.

## Accessing Settings

- **Keyboard shortcut**: `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (macOS); if it conflicts with system shortcuts, try `Ctrl+Alt+S` or use **File → Settings** in the menu bar
- **Tray**: Right-click the system tray icon, then "Settings"

## Plugins

Plugins are loaded from the app data `plugins/` directory (e.g. `~/.config/youtube-music-client/plugins/` on Linux). Each plugin needs:

- `manifest.json` – `{ "name", "version", "main", "permissions" }`
- `index.js` – Plugin entry point

Enable or disable plugins in Settings > Plugins. See `plugins/example/` for a reference.

## License

MIT
