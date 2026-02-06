# Debugging Plugins

Use these steps to find why plugins aren't working.

## 1. Enable DevTools (see JavaScript console)

**Option A: Menu**
- Focus the YouTube Music window (main window)
- Click **View → Toggle Developer Tools**
- DevTools opens; go to the **Console** tab

**Option B: Keyboard shortcut**
- Focus the YouTube Music window (main window)
- Press **Ctrl+Shift+I** (Linux/Windows) or **Cmd+Option+I** (macOS)
- DevTools opens; go to the **Console** tab  
- *Note: On some Linux setups this may conflict with screenshot shortcuts; use the menu instead.*

**Option C: Auto-open in debug builds**
```bash
YTM_DEBUG=1 npm run electron:dev
```
DevTools will open automatically when the app starts.

## 2. Run with debug logging

```bash
YTM_DEBUG=1 npm run electron:dev
```

Watch the terminal for plugin-related logs (enabled plugins, script length, injection attempts).

## 3. Check plugin status via Settings

1. Open Settings (Ctrl+Shift+S)
2. Go to **Plugins**
3. Confirm **Fine Volume Control** is listed and **Enabled**

## 4. Verify plugin files exist

```bash
# Linux
ls -la ~/.config/youtube-music-client/plugins/

# macOS
ls -la ~/Library/Application\ Support/youtube-music-client/plugins/

# Windows
ls %APPDATA%\youtube-music-client\plugins\
```

Should show: `fine-volume-control/`

If missing, delete the plugins folder and restart so they're copied from the project:
```bash
rm -rf ~/.config/youtube-music-client/plugins
```

## 5. Test injection (CSP / eval)

In the DevTools Console (on the YTM page), run:

```javascript
document.body.appendChild(document.createElement('div')).id='ytm-inject-test';
document.getElementById('ytm-inject-test').textContent='INJECTION WORKS';
document.getElementById('ytm-inject-test').style.cssText='position:fixed;top:10px;right:10px;background:red;color:white;padding:8px;z-index:99999;';
```

- **If you see a red "INJECTION WORKS" box**: Manual JS runs; the issue is likely in our plugin code or injection timing.
- **If you get a CSP or security error**: YouTube Music is blocking `eval`; we need a different injection method.

## 6. Check for errors in Console

After the app runs for ~10 seconds, look in the Console for:

- `Refused to evaluate a string as JavaScript` → CSP blocking eval
- `Uncaught SyntaxError` → Plugin script has a syntax error
- `Uncaught TypeError` → Plugin code error (e.g. null reference)
- No errors but no plugins → Injection may not be reaching the YTM page

## 7. Verify we're on the right page

In the Console, run:

```javascript
console.log('URL:', location.href);
console.log('Host:', location.hostname);
```

Expected: `music.youtube.com`. If different, we may be injecting into the wrong window.

## 8. Manual plugin test

Paste this in the Console to simulate a plugin:

```javascript
(function(){
  const btn = document.createElement('button');
  btn.textContent = '♪ TEST';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px;background:red;color:white;border:none;cursor:pointer;';
  btn.onclick = () => alert('Plugin test works!');
  document.body.appendChild(btn);
})();
```

If a red "♪ TEST" button appears and works, injection and DOM access are fine; the problem is in the plugin scripts or how they're loaded.

## 9. Call the debug command

**From the Settings window:**
1. Open Settings (Ctrl+Shift+S)
2. Press **Ctrl+Shift+I** to open DevTools for the Settings window
3. In the Console tab, run:

```javascript
const info = await window.electronAPI.debugPlugins();
console.log(info);
```

This returns: `app_data_dir`, `plugins_dir_exists`, `enabled_plugins`, `script_length`, `script_preview`.

**Important:** Use DevTools on the **main** (YouTube Music) window to see plugin/JS errors. Use DevTools on the **Settings** window to run `debugPlugins`.

## Scenario A: You see no logs at all

**Cause:** The plugin script is not being loaded, or it's not running in the YTM page context.

**Fix:**

1. **Check manifest.json path** – Each plugin must have `plugins/<plugin-id>/manifest.json`. The `plugin-id` is the folder name (e.g. `Multi-Source Lyrics` or `fine-volume-control`). It must match exactly what's in Settings → Plugins.

2. **Check the main file** – `manifest.json` must have `"main": "index.js"` (or your entry file). That file must exist in the plugin folder.

3. **Verify the plugin is enabled** – In Settings → Plugins, ensure the toggle is ON for your plugin.

4. **Run `debugPlugins()`** – In the Settings window DevTools Console:
   ```javascript
   const info = await window.electronAPI.debugPlugins();
   console.log(info);
   ```
   - If `script_length` is 0 or your plugin's code is missing from `script_preview`, the file isn't being read.
   - If `enabled_plugins` doesn't list your plugin, it's not enabled or the folder name doesn't match.

5. **Confirm injection target** – Plugins run in the main window (YouTube Music), not the Settings window. Open DevTools on the **main** window to see plugin logs.

## Common causes

| Symptom | Likely cause |
|---------|--------------|
| "TrustedHTML" / Trusted Types | Avoid innerHTML; use createElementNS or textContent for DOM modifications |
| No buttons/UI at all | CSP blocking eval, or injection into wrong window |
| Buttons appear but don't work | Plugin logic error; check Console |
| Volume input doesn't change volume | Video/player API not found; YTM may use different structure |
