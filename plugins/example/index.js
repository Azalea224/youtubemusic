/**
 * Example plugin for YouTube Music Client (Electron)
 * Demonstrates the window.ytm API: getPlaybackState, onPlaybackUpdate, openSettings.
 * Plugins run in the YTM webview and use window.ytm for Electron IPC.
 */
(function() {
  'use strict';
  if (window.__ytmExampleLoaded) return;
  window.__ytmExampleLoaded = true;

  const API = window.ytm;
  if (!API) {
    console.log('[Example Plugin] window.ytm not available (not in Electron?)');
    return;
  }

  async function onLoad() {
    console.log('[Example Plugin] Loaded');
    try {
      const state = await API.getPlaybackState();
      if (state) {
        console.log('[Example Plugin] Current playback:', state.title, '-', state.artist);
      } else {
        console.log('[Example Plugin] No playback state yet');
      }
    } catch (e) {
      console.log('[Example Plugin] getPlaybackState error:', e);
    }

    API.onPlaybackUpdate?.((state) => {
      if (state && (state.title || state.artist)) {
        console.log('[Example Plugin] Playback update:', state.title, '-', state.artist, '(' + state.state + ')');
      }
    });
  }

  function init() {
    if (!document.location.hostname.includes('music.youtube.com')) return;
    onLoad();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }
})();
