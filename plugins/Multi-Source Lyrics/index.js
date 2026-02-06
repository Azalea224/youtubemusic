/**
 * Multi-Source Lyrics Plugin v2
 * - MutationObserver-based injection
 * - Shadow DOM isolation
 * - NetEase Cloud (default) + LRCLIB (fallback)
 * - timeupdate-driven karaoke sync
 * - Source selector with localStorage persistence
 */
(function() {
  'use strict';
  if (window.__ytmLyricsPluginLoaded) return;
  window.__ytmLyricsPluginLoaded = true;
  console.log('[LyricsPlugin] Initializing v2...');

  const STORAGE_KEY = 'ytm-lyrics-source';
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
    isCustomMode: false,
    timeupdateHandler: null,
    lastSongKey: '',
    unsubscribePlayback: null,
    injected: false
  };

  // --- Shadow-root aware DOM query ---
  function q(root, sel) {
    if (!root) return null;
    const sr = root.shadowRoot || root._shadowRoot;
    if (sr) {
      const r = sr.querySelector(sel);
      if (r) return r;
    }
    return root.querySelector(sel);
  }

  // --- Metadata extraction ---
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

  // --- Lyrics fetchers ---
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
      console.warn('[LyricsPlugin] NetEase fetch error:', e.message);
      return null;
    }
  }

  async function fetchLRCLIB(meta) {
    const cacheKey = `lrclib:${meta.title}|${meta.artist}|${meta.duration}`;
    if (CONFIG.cache.has(cacheKey)) return CONFIG.cache.get(cacheKey);
    const duration = meta.duration || 0;
    if (!duration) {
      console.warn('[LyricsPlugin] LRCLIB requires duration; skipping');
      return null;
    }
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
      console.warn('[LyricsPlugin] LRCLIB fetch error:', e.message);
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

  // --- LRC Parser ---
  function parseLRC(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split('\n');
    const result = [];
    const re = /^\[(\d{2}):(\d{2}\.\d+)\](.*)/;
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
        const text = m[3].trim();
        if (text) result.push({ time, text });
      }
    }
    return result;
  }

  // --- Sync engine (timeupdate-driven) ---
  function startSyncEngine(container) {
    stopSyncEngine();
    const video = document.querySelector('video');
    if (!video) return;
    const handler = () => {
      if (!STATE.isCustomMode || !STATE.currentLyrics || !container.isConnected) return;
      let idx = -1;
      const t = video.currentTime;
      for (let i = 0; i < STATE.currentLyrics.length; i++) {
        if (STATE.currentLyrics[i].time <= t) idx = i;
        else break;
      }
      if (idx !== STATE.activeLineIndex) {
        STATE.activeLineIndex = idx;
        const lines = container.querySelectorAll('.ytm-lyric-line');
        lines.forEach((el, i) => {
          el.classList.toggle('ytm-lyric-active', i === idx);
          if (i === idx) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
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

  // --- Render lyrics ---
  function renderLyrics(data, container) {
    container.replaceChildren();
    STATE.currentLyrics = null;
    stopSyncEngine();

    if (data?.syncedLyrics) {
      STATE.currentLyrics = parseLRC(data.syncedLyrics);
      const video = document.querySelector('video');
      STATE.currentLyrics.forEach(line => {
        const div = document.createElement('div');
        div.className = 'ytm-lyric-line';
        div.textContent = line.text;
        div.onclick = () => { if (video) video.currentTime = line.time; };
        container.appendChild(div);
      });
      startSyncEngine(container);
    } else if (data?.plainLyrics) {
      container.style.whiteSpace = 'pre-wrap';
      container.textContent = data.plainLyrics;
    } else {
      container.textContent = 'No lyrics found for this song.';
    }
  }

  // --- Source selector (dropdown) ---
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

  function createSourceSelector(nativeHost, customContainer, shadowRoot) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ytm-lyrics-source-selector';

    const label = document.createElement('label');
    label.textContent = 'Source: ';
    label.className = 'ytm-lyrics-source-label';

    const select = document.createElement('select');
    select.className = 'ytm-lyrics-source-dropdown';
    [
      [SOURCE_YOUTUBE, 'YouTube'],
      [SOURCE_NETEASE, 'NetEase Cloud'],
      [SOURCE_LRCLIB, 'LRCLIB'],
      [SOURCE_AUTO, 'Auto (NetEase → LRCLIB)']
    ].forEach(([val, text]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = text;
      select.appendChild(opt);
    });
    select.value = getStoredSource();

    select.addEventListener('change', () => {
      const val = select.value;
      setStoredSource(val);
      if (val === SOURCE_YOUTUBE) {
        STATE.isCustomMode = false;
        nativeHost.style.display = '';
        customContainer.style.display = 'none';
      } else {
        STATE.isCustomMode = true;
        nativeHost.style.display = 'none';
        customContainer.style.display = 'block';
        loadAndRender(customContainer);
      }
    });

    wrapper.append(label, select);
    return { wrapper, select };
  }

  async function loadAndRender(container) {
    container.replaceChildren();
    container.textContent = 'Loading...';
    const meta = await getMetadata();
    if (!meta.title && !meta.artist) {
      container.textContent = 'No track playing.';
      return;
    }
    const source = getStoredSource();
    if (source === SOURCE_YOUTUBE) return;
    const data = await fetchFromSource(source, meta);
    renderLyrics(data, container);
  }

  // --- Shadow DOM UI ---
  const SHADOW_STYLES = `
    :host {
      display: block;
      font-family: "Roboto", "YouTube Sans", sans-serif;
    }
    .ytm-lyric-line {
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.2s ease-out;
      cursor: pointer;
      opacity: 0.4;
      font-size: 22px;
      line-height: 1.6;
      margin-bottom: 10px;
      color: #aaa;
    }
    .ytm-lyric-line:hover { opacity: 0.7; }
    .ytm-lyric-active {
      opacity: 1 !important;
      font-weight: 700;
      transform: scale(1.03);
      color: #fff !important;
      background: rgba(255,255,255,0.05);
      border-left: 4px solid #fff;
      padding-left: 20px;
    }
    .ytm-lyrics-view {
      scroll-behavior: smooth;
      height: 60vh;
      overflow-y: auto;
      padding: 20px 0;
      margin-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .ytm-lyrics-view::-webkit-scrollbar { display: none; }
    .ytm-lyrics-source-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 15px 0;
    }
    .ytm-lyrics-source-label {
      font-size: 14px;
      color: #888;
    }
    .ytm-lyrics-source-dropdown {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #444;
      background: #1d1d1d;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
    }
  `;

  function createShadowRootUI(anchorHost) {
    const host = document.createElement('div');
    host.id = 'ytm-lyrics-plugin-root';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SHADOW_STYLES;
    shadow.appendChild(style);

    const customView = document.createElement('div');
    customView.className = 'ytm-lyrics-view';
    customView.style.display = 'none';

    const { wrapper: selectorWrapper, select } = createSourceSelector(anchorHost, customView, shadow);
    shadow.appendChild(selectorWrapper);
    shadow.appendChild(customView);

    const stored = getStoredSource();
    if (stored !== SOURCE_YOUTUBE) {
      STATE.isCustomMode = true;
      anchorHost.style.display = 'none';
      customView.style.display = 'block';
      loadAndRender(customView);
    }

    return host;
  }

  // --- Injection target finder ---
  function findInjectionTarget() {
    const standard = document.querySelector('ytmusic-description-shelf-renderer');
    if (standard) return standard;
    for (const mr of document.querySelectorAll('ytmusic-message-renderer')) {
      if (mr.innerText && (mr.innerText.includes('Lyrics') || mr.innerText.includes('lyrics'))) return mr;
    }
    return null;
  }

  function cleanup() {
    stopSyncEngine();
    document.getElementById('ytm-lyrics-plugin-root')?.remove();
    const hidden = document.querySelectorAll('ytmusic-description-shelf-renderer, ytmusic-message-renderer');
    hidden.forEach(el => { el.style.display = ''; });
    STATE.injected = false;
  }

  function inject() {
    if (STATE.injected) return;
    const anchorHost = findInjectionTarget();
    if (!anchorHost) return;

    STATE.injected = true;
    console.log('[LyricsPlugin] Injecting UI on:', anchorHost.tagName);

    const root = createShadowRootUI(anchorHost);
    anchorHost.parentNode.insertBefore(root, anchorHost);
  }

  function onSongChange(newKey) {
    if (newKey === STATE.lastSongKey) return;
    STATE.lastSongKey = newKey;
    console.log('[LyricsPlugin] Song change:', newKey);
    cleanup();
    STATE.injected = false;
    const anchor = findInjectionTarget();
    if (anchor) inject();
  }

  // --- MutationObserver for injection ---
  function setupMutationObserver() {
    const observer = new MutationObserver(() => {
      if (STATE.injected) {
        const root = document.getElementById('ytm-lyrics-plugin-root');
        if (root?.isConnected) return;
        STATE.injected = false;
      }
      if (findInjectionTarget()) inject();
    });

    const observe = () => {
      const target = document.querySelector('ytmusic-player-page') || document.querySelector('ytmusic-app') || document.body;
      if (target && !target.dataset.ytmLyricsObserved) {
        target.dataset.ytmLyricsObserved = '1';
        observer.observe(target, { childList: true, subtree: true });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(observe, 500));
    } else {
      setTimeout(observe, 500);
    }
  }

  // --- Playback update (song change) ---
  function setupPlaybackListener() {
    if (!window.ytm?.onPlaybackUpdate) return;
    STATE.unsubscribePlayback = window.ytm.onPlaybackUpdate((state) => {
      if (state && (state.title || state.artist)) {
        onSongChange(`${state.title || ''}-${state.artist || ''}`);
      }
    });
  }

  // --- Init ---
  function init() {
    if (!document.location.hostname.includes('music.youtube.com')) return;

    setupPlaybackListener();
    setupMutationObserver();

    getMetadata().then(meta => {
      STATE.lastSongKey = meta.key;
      if (findInjectionTarget()) inject();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();
