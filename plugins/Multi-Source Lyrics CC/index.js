/**
 * Multi-Source Lyrics - Closed Captions Style
 * - Fixed overlay at bottom of viewport (like video subtitles)
 * - Shows 1-2 lines at a time
 * - Semi-transparent backdrop, centered white text
 * - NetEase Cloud (default) + LRCLIB fallback
 */
(function() {
  'use strict';
  if (window.__ytmLyricsCCLoaded) return;
  window.__ytmLyricsCCLoaded = true;
  console.log('[LyricsCC] Initializing...');

  const STORAGE_KEY = 'ytm-lyrics-cc-source';
  const SOURCE_YOUTUBE = 'youtube';
  const SOURCE_NETEASE = 'netease';
  const SOURCE_LRCLIB = 'lrclib';
  const SOURCE_AUTO = 'auto';

  const CONFIG = {
    neteaseBase: 'https://netease-cloud-music-api-two-taupe.vercel.app',
    lrclibBase: 'https://lrclib.net/api',
    cache: new Map(),
    clientHeader: 'YTM-Electron-Wrapper/2.0'
  };

  const STATE = {
    currentLyrics: null,
    activeLineIndex: -1,
    timeupdateHandler: null,
    lastSongKey: '',
    unsubscribePlayback: null,
    root: null
  };

  function q(root, sel) {
    if (!root) return null;
    const sr = root.shadowRoot || root._shadowRoot;
    if (sr) {
      const r = sr.querySelector(sel);
      if (r) return r;
    }
    return root.querySelector(sel);
  }

  function getMetadata() {
    const meta = { title: '', artist: '', album: '', duration: 0, key: '' };
    if (window.ytm?.getPlaybackState) {
      const p = window.ytm.getPlaybackState();
      if (p && typeof p.then === 'function') {
        return p.then(s => {
          if (s) {
            meta.title = (s.title || '').trim();
            meta.artist = (s.artist || '').trim();
            meta.album = (s.album || '').trim();
            meta.duration = Math.round(s.duration || 0);
          }
          if (!meta.title || !meta.artist) Object.assign(meta, getMetadataFromDOM());
          if (!meta.duration) {
            const v = document.querySelector('video');
            meta.duration = v && !isNaN(v.duration) ? Math.round(v.duration) : 0;
          }
          meta.key = `${meta.title}-${meta.artist}`;
          return meta;
        });
      }
    }
    Object.assign(meta, getMetadataFromDOM());
    const v = document.querySelector('video');
    meta.duration = v && !isNaN(v.duration) ? Math.round(v.duration) : 0;
    meta.key = `${meta.title}-${meta.artist}`;
    return Promise.resolve(meta);
  }

  function getMetadataFromDOM() {
    const bar = document.querySelector('ytmusic-player-bar');
    const titleEl = bar ? q(bar, '.title.ytmusic-player-bar') || q(bar, '.title') : null;
    const subEl = bar ? q(bar, '.subtitle') || q(bar, '.ytmusic-player-bar.subtitle') : null;
    if (!subEl && bar && (bar.shadowRoot || bar._shadowRoot)) {
      const sr = bar.shadowRoot || bar._shadowRoot;
      const links = sr.querySelectorAll('.subtitle a[href*="channel/"]');
      if (links && links[0]) subEl = links[0];
    }
    const title = titleEl?.textContent?.trim() || '';
    const artist = (subEl?.textContent || '').split('•')[0]?.trim() || '';
    const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/ft\..*$/i, '').replace(/official\s*(video|audio)?/gi, '').trim();
    return { title: cleanTitle || title, artist };
  }

  async function fetchNetEase(meta) {
    const cacheKey = `netease:${meta.title}|${meta.artist}`;
    if (CONFIG.cache.has(cacheKey)) return CONFIG.cache.get(cacheKey);
    try {
      const keywords = `${meta.title} ${meta.artist}`.trim();
      const searchUrl = `${CONFIG.neteaseBase}/cloudsearch?keywords=${encodeURIComponent(keywords)}&type=1&limit=5`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      const songs = searchData?.result?.songs;
      if (!songs?.length) return null;
      const songId = songs[0].id;
      const lyricUrl = `${CONFIG.neteaseBase}/lyric?id=${songId}`;
      const lyricRes = await fetch(lyricUrl);
      if (!lyricRes.ok) return null;
      const lyricData = await lyricRes.json();
      const lrcText = lyricData?.lrc?.lyric;
      const result = lrcText ? { syncedLyrics: lrcText } : null;
      if (result) CONFIG.cache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn('[LyricsCC] NetEase fetch error:', e.message);
      return null;
    }
  }

  async function fetchLRCLIB(meta) {
    const cacheKey = `lrclib:${meta.title}|${meta.artist}|${meta.duration}`;
    if (CONFIG.cache.has(cacheKey)) return CONFIG.cache.get(cacheKey);
    const duration = meta.duration || 0;
    if (!duration) return null;
    try {
      const params = new URLSearchParams({
        artist_name: meta.artist || 'Unknown',
        track_name: meta.title || 'Unknown',
        album_name: meta.album || '',
        duration: String(duration)
      });
      const url = `${CONFIG.lrclibBase}/get?${params}`;
      const res = await fetch(url, { headers: { 'User-Agent': CONFIG.clientHeader } });
      if (!res.ok) return null;
      const data = await res.json();
      CONFIG.cache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.warn('[LyricsCC] LRCLIB fetch error:', e.message);
      return null;
    }
  }

  async function fetchFromSource(source, meta) {
    if (source === SOURCE_AUTO) {
      const netease = await fetchNetEase(meta);
      if (netease?.syncedLyrics || netease?.plainLyrics) return netease;
      return fetchLRCLIB(meta);
    }
    if (source === SOURCE_NETEASE) return fetchNetEase(meta);
    if (source === SOURCE_LRCLIB) return fetchLRCLIB(meta);
    return null;
  }

  function parseLRC(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split('\n');
    const result = [];
    const re = /^\[(\d{2}):(\d{2}\.\d+)\](.*)/;
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
        const txt = m[3].trim();
        if (txt) result.push({ time, text: txt });
      }
    }
    return result;
  }

  function getStoredSource() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if ([SOURCE_YOUTUBE, SOURCE_NETEASE, SOURCE_LRCLIB, SOURCE_AUTO].includes(s)) return s;
    } catch (_) {}
    return SOURCE_AUTO;
  }

  function setStoredSource(val) {
    try { localStorage.setItem(STORAGE_KEY, val); } catch (_) {}
  }

  const CC_STYLES = `
    :host {
      position: fixed;
      bottom: 64px;
      left: 0;
      right: 0;
      z-index: 99998;
      pointer-events: none;
      font-family: "Roboto", "YouTube Sans", "Arial", sans-serif;
    }
    .ytm-cc-backdrop {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px 24px 24px;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      text-align: center;
    }
    .ytm-cc-text {
      max-width: 90%;
      font-size: 22px;
      line-height: 1.5;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      word-wrap: break-word;
    }
    .ytm-cc-controls {
      pointer-events: auto;
      position: absolute;
      top: 4px;
      right: 8px;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .ytm-cc-controls select {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
    .ytm-cc-controls .ytm-cc-hide {
      padding: 2px 8px;
      border: none;
      border-radius: 4px;
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 11px;
      cursor: pointer;
    }
  `;

  function createCCOverlay() {
    const host = document.createElement('div');
    host.id = 'ytm-lyrics-cc-root';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CC_STYLES;
    shadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'ytm-cc-backdrop';

    const textEl = document.createElement('div');
    textEl.className = 'ytm-cc-text';
    textEl.textContent = '';

    const controls = document.createElement('div');
    controls.className = 'ytm-cc-controls';

    const select = document.createElement('select');
    [
      [SOURCE_YOUTUBE, 'YouTube'],
      [SOURCE_NETEASE, 'NetEase'],
      [SOURCE_LRCLIB, 'LRCLIB'],
      [SOURCE_AUTO, 'Auto']
    ].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      select.appendChild(opt);
    });
    select.value = getStoredSource();

    const hideBtn = document.createElement('button');
    hideBtn.className = 'ytm-cc-hide';
    hideBtn.textContent = 'Hide';
    hideBtn.title = 'Hide captions (YouTube mode)';

    select.addEventListener('change', () => {
      setStoredSource(select.value);
      if (select.value === SOURCE_YOUTUBE) {
        textEl.textContent = '';
        STATE.currentLyrics = null;
        stopSyncEngine();
      } else {
        loadAndUpdate(textEl);
      }
    });

    const pill = document.createElement('button');
    pill.className = 'ytm-cc-pill';
    pill.textContent = 'CC';
    pill.title = 'Show closed captions';
    pill.style.display = 'none';

    hideBtn.addEventListener('click', () => {
      host.style.display = 'none';
      hideBtn.textContent = 'Show';
      pill.style.display = 'block';
    });

    pill.addEventListener('click', () => {
      host.style.display = '';
      hideBtn.textContent = 'Hide';
      pill.style.display = 'none';
    });

    controls.append(select, hideBtn);
    backdrop.appendChild(textEl);
    shadow.appendChild(controls);
    shadow.appendChild(backdrop);

    return { host, textEl, select, pill };
  }

  function startSyncEngine(textEl) {
    stopSyncEngine();
    const video = document.querySelector('video');
    if (!video) return;
    const handler = () => {
      if (!STATE.currentLyrics || !textEl.isConnected) return;
      let idx = -1;
      const t = video.currentTime;
      for (let i = 0; i < STATE.currentLyrics.length; i++) {
        if (STATE.currentLyrics[i].time <= t) idx = i;
        else break;
      }
      if (idx !== STATE.activeLineIndex) {
        STATE.activeLineIndex = idx;
        const lines = STATE.currentLyrics;
        const current = idx >= 0 ? lines[idx].text : '';
        textEl.textContent = current;
      }
    };
    STATE.timeupdateHandler = handler;
    video.addEventListener('timeupdate', handler);
    handler();
  }

  function stopSyncEngine() {
    if (STATE.timeupdateHandler) {
      const video = document.querySelector('video');
      if (video) video.removeEventListener('timeupdate', STATE.timeupdateHandler);
      STATE.timeupdateHandler = null;
    }
    STATE.activeLineIndex = -1;
  }

  async function loadAndUpdate(textEl) {
    textEl.textContent = 'Loading...';
    const meta = await getMetadata();
    if (!meta.title && !meta.artist) {
      textEl.textContent = '';
      return;
    }
    const source = getStoredSource();
    if (source === SOURCE_YOUTUBE) {
      textEl.textContent = '';
      return;
    }
    const data = await fetchFromSource(source, meta);
    STATE.currentLyrics = null;
    stopSyncEngine();
    if (data?.syncedLyrics) {
      STATE.currentLyrics = parseLRC(data.syncedLyrics);
      if (STATE.currentLyrics.length) {
        startSyncEngine(textEl);
      } else {
        textEl.textContent = data?.plainLyrics ? data.plainLyrics.split('\n')[0] || '' : '';
      }
    } else if (data?.plainLyrics) {
      const first = data.plainLyrics.split('\n')[0] || '';
      textEl.textContent = first;
    } else {
      textEl.textContent = '';
    }
  }

  const PILL_STYLES = `
    .ytm-cc-pill {
      position: fixed;
      bottom: 8px;
      right: 8px;
      z-index: 99997;
      padding: 4px 10px;
      border: none;
      border-radius: 4px;
      background: rgba(0,0,0,0.75);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
    }
  `;

  function init() {
    if (!document.location.hostname.includes('music.youtube.com')) return;

    const { host, textEl, select, pill } = createCCOverlay();
    STATE.root = host;
    document.body.appendChild(host);

    const pillStyle = document.createElement('style');
    pillStyle.textContent = PILL_STYLES;
    document.head.appendChild(pillStyle);
    document.body.appendChild(pill);

    if (getStoredSource() !== SOURCE_YOUTUBE) {
      loadAndUpdate(textEl);
    }

    if (window.ytm?.onPlaybackUpdate) {
      STATE.unsubscribePlayback = window.ytm.onPlaybackUpdate((state) => {
        if (state && (state.title || state.artist)) {
          const newKey = `${state.title || ''}-${state.artist || ''}`;
          if (newKey !== STATE.lastSongKey) {
            STATE.lastSongKey = newKey;
            if (getStoredSource() !== SOURCE_YOUTUBE) {
              loadAndUpdate(textEl);
            }
          }
        }
      });
    }

    getMetadata().then(meta => {
      STATE.lastSongKey = meta.key;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();
