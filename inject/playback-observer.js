/**
 * Injected into YouTube Music webview to observe playback state.
 * Emits 'playback-update' events to Tauri with { title, artist, album, state, progress, duration }.
 */
(function() {
  'use strict';

  const YOUTUBE_MUSIC_URL = 'music.youtube.com';

  function getPlaybackState() {
    try {
      // YouTube Music DOM selectors - may need updates as YTM changes
      const titleEl = document.querySelector('#title yt-formatted-string, [title] yt-formatted-string.a.slider-item, ytm-player-bar .title');
      const subtitleEl = document.querySelector('#subtitle yt-formatted-string, ytm-player-bar .subtitle, .byline');
      const progressBar = document.querySelector('ytmusic-player-bar .progress-bar, #progress-bar');
      const playButton = document.querySelector('ytmusic-player-bar #play-pause-button, .play-pause-button');

      const title = titleEl?.textContent?.trim() || '';
      const artist = subtitleEl?.textContent?.trim() || '';
      const album = '';

      let state = 'paused';
      if (playButton) {
        const ariaLabel = playButton.getAttribute('aria-label') || '';
        state = ariaLabel.toLowerCase().includes('pause') ? 'playing' : 'paused';
      }

      let progress = 0;
      let duration = 0;
      if (progressBar) {
        const timeDisplay = document.querySelector('.time-info, .ytmusic-player-bar .time');
        const timeText = timeDisplay?.textContent || '0:00 / 0:00';
        const parts = timeText.split('/').map(s => s.trim());
        if (parts.length >= 2) {
          progress = parseTime(parts[0]);
          duration = parseTime(parts[1]);
        }
      }

      return { title, artist, album, state, progress, duration };
    } catch (e) {
      return { title: '', artist: '', album: '', state: 'paused', progress: 0, duration: 0 };
    }
  }

  function parseTime(str) {
    const parts = str.split(':').map(Number).reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      seconds += (parts[i] || 0) * Math.pow(60, i);
    }
    return seconds;
  }

  function emitUpdate() {
    if (!window.__TAURI_INTERNALS__?.event) return;
    const state = getPlaybackState();
    if (state.title || state.artist) {
      window.__TAURI_INTERNALS__.event.emit('playback-update', state);
    }
  }

  function init() {
    if (!window.location.hostname.includes(YOUTUBE_MUSIC_URL)) return;

    let lastState = '';
    const checkInterval = setInterval(() => {
      const state = getPlaybackState();
      const key = JSON.stringify(state);
      if (key !== lastState) {
        lastState = key;
        emitUpdate();
      }
    }, 1000);

    const observer = new MutationObserver(() => emitUpdate());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
