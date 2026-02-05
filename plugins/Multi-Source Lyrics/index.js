/**
 * Multi-Source Lyrics Plugin (Universal Injection Edition)
 * - Fixes missing slider on "Lyrics not available" screens.
 * - Injectable on both standard lyrics and error message screens.
 */
(function() {
    'use strict';
    if (window.__ytmLyricsPluginLoaded) return;
    window.__ytmLyricsPluginLoaded = true;
    console.log('[LyricsPlugin] Initializing...');
  
    const CONFIG = {
      apiBase: 'https://lrclib.net/api',
      cache: new Map()
    };
  
    const STATE = {
      currentLyrics: null,
      activeLineIndex: -1,
      isCustomMode: false,
      syncInterval: null,
      lastSongKey: '' 
    };
  
    // --- CSS Injection ---
    const style = document.createElement('style');
    style.textContent = `
      .ytm-lyric-line {
        padding: 8px 12px;
        border-radius: 8px;
        transition: all 0.2s ease-out;
        cursor: pointer;
        opacity: 0.4;
        font-size: 22px;
        line-height: 1.6;
        margin-bottom: 10px;
        color: var(--ytmusic-text-secondary);
      }
      .ytm-lyric-active {
        opacity: 1 !important;
        font-weight: 700;
        transform: scale(1.03);
        color: #fff !important;
        background: rgba(255,255,255,0.05);
        border-left: 4px solid #fff;
        padding-left: 20px;
      }
      #ytm-custom-lyrics-view {
        scroll-behavior: smooth;
        height: 60vh;
        overflow-y: auto;
        padding: 20px 0;
        margin-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      #ytm-custom-lyrics-view::-webkit-scrollbar { display: none; }
      
      #ytm-lyrics-source-toggle {
        display: flex; 
        gap: 10px; 
        margin: 15px auto; 
        justify-content: center; 
        padding: 6px; 
        background: #1d1d1d; 
        border-radius: 25px; 
        width: fit-content; 
        border: 1px solid #333; 
        z-index: 9999; 
        position: relative;
      }
    `;
    document.head.appendChild(style);
  
    // --- Helpers ---
    function getMetadata() {
      const titleEl = document.querySelector('ytmusic-player-bar .title') || document.querySelector('.title.ytmusic-player-bar');
      const artistEl = document.querySelector('ytmusic-player-bar .byline') || document.querySelector('.byline.ytmusic-player-bar');
      const title = titleEl?.textContent?.trim() || '';
      const artist = artistEl?.textContent?.split('•')[0]?.trim() || '';
      return { title, artist, key: `${title}-${artist}` };
    }
  
    async function fetchLyrics(title, artist) {
      const cacheKey = `${title}|${artist}`;
      if (CONFIG.cache.has(cacheKey)) return CONFIG.cache.get(cacheKey);
      try {
        console.log(`[LyricsPlugin] Fetching: ${title} by ${artist}`);
        const cleanTitle = title.replace(/\(.*\)/g, '').replace(/ft\..*/i, '').trim();
        const url = `${CONFIG.apiBase}/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { headers: { 'Lrclib-Client': 'YTM-Electron-Wrapper' } });
        const data = await res.json();
        CONFIG.cache.set(cacheKey, data);
        return data;
      } catch (e) { 
        console.error('[LyricsPlugin] Fetch error:', e);
        return null; 
      }
    }
  
    function startSyncEngine(container) {
      if (STATE.syncInterval) clearInterval(STATE.syncInterval);
      const v = document.querySelector('video');
      STATE.syncInterval = setInterval(() => {
        if (!STATE.isCustomMode || !STATE.currentLyrics || !v) return;
        let idx = -1;
        for (let i = 0; i < STATE.currentLyrics.length; i++) {
          if (STATE.currentLyrics[i].time <= v.currentTime) idx = i; else break;
        }
        if (idx !== STATE.activeLineIndex) {
          STATE.activeLineIndex = idx;
          const lines = container.querySelectorAll('.ytm-lyric-line');
          lines.forEach((l, i) => {
            l.classList.toggle('ytm-lyric-active', i === idx);
            if (i === idx) l.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
      }, 250);
    }
  
    function renderLyrics(data, container) {
      container.replaceChildren();
      STATE.currentLyrics = null;
      if (data?.syncedLyrics) {
        const lines = data.syncedLyrics.split('\n');
        STATE.currentLyrics = lines.map(l => {
          const m = l.match(/^\[(\d{2}):(\d{2}\.\d+)\](.*)/);
          return m ? { time: parseInt(m[1])*60 + parseFloat(m[2]), text: m[3].trim() } : null;
        }).filter(x => x && x.text);
  
        STATE.currentLyrics.forEach(line => {
          const div = document.createElement('div');
          div.className = 'ytm-lyric-line';
          div.textContent = line.text;
          div.onclick = () => { document.querySelector('video').currentTime = line.time; };
          container.appendChild(div);
        });
        startSyncEngine(container);
      } else {
        container.style.whiteSpace = 'pre-wrap';
        container.textContent = data?.plainLyrics || "No 3rd party lyrics found for this song.";
      }
    }
  
    function createToggle(nativeHost, customContainer) {
      const wrapper = document.createElement('div');
      wrapper.id = 'ytm-lyrics-source-toggle';
  
      const btn = (txt, active) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.style.cssText = `cursor:pointer; padding:6px 14px; border-radius:20px; border:none; font-family:Roboto; font-size:13px; transition:0.2s; ${active ? 'background:#fff;color:#000;font-weight:bold;' : 'background:transparent;color:#888;'}`;
        return b;
      };
  
      const bNav = btn('YouTube', true);
      const bCus = btn('Lrclib', false);
  
      const update = (mode) => {
        STATE.isCustomMode = (mode === 'custom');
        if(mode === 'custom') {
            bNav.style.background = 'transparent'; bNav.style.color = '#888';
            bCus.style.background = '#fff'; bCus.style.color = '#000';
            nativeHost.style.display = 'none'; // Hide the native message/lyrics
            customContainer.style.display = 'block';
            
            if (!customContainer.hasChildNodes()) {
              customContainer.textContent = 'Loading...';
              const meta = getMetadata();
              fetchLyrics(meta.title, meta.artist).then(d => renderLyrics(d, customContainer));
            }
        } else {
            bCus.style.background = 'transparent'; bCus.style.color = '#888';
            bNav.style.background = '#fff'; bNav.style.color = '#000';
            nativeHost.style.display = ''; // Show native message/lyrics
            customContainer.style.display = 'none';
        }
      };
  
      bNav.onclick = () => update('native');
      bCus.onclick = () => update('custom');
      wrapper.append(bNav, bCus);
      return wrapper;
    }
  
    // --- Finder Logic ---
    function findInjectionTarget() {
      // 1. Try to find the standard Lyrics container
      const standardLyrics = document.querySelector('ytmusic-description-shelf-renderer');
      if (standardLyrics) return standardLyrics;

      // 2. Try to find the "Lyrics not available" message
      // This element is usually a ytmusic-message-renderer
      const messageRenderers = document.querySelectorAll('ytmusic-message-renderer');
      for (const mr of messageRenderers) {
          // Check if it's actually visible and likely the lyrics error
          if (mr.innerText.includes("Lyrics") || mr.innerText.includes("lyrics")) {
              return mr;
          }
      }
      
      return null;
    }
  
    function attemptInject() {
      const meta = getMetadata();
      
      // Reset if song changed
      if (meta.key !== STATE.lastSongKey) {
          STATE.lastSongKey = meta.key;
          console.log(`[LyricsPlugin] Song Change: ${meta.key}`);
          document.getElementById('ytm-lyrics-source-toggle')?.remove();
          document.getElementById('ytm-custom-lyrics-view')?.remove();
          
          const hidden = document.querySelectorAll('ytmusic-description-shelf-renderer, ytmusic-message-renderer');
          hidden.forEach(el => el.style.display = '');
      }
  
      if (document.getElementById('ytm-lyrics-source-toggle')) return;

      const anchorHost = findInjectionTarget();
      if (!anchorHost) return;

      console.log('[LyricsPlugin] Injecting UI on:', anchorHost.tagName);

      const customView = document.createElement('div');
      customView.id = 'ytm-custom-lyrics-view';
      customView.style.display = 'none';
  
      const toggle = createToggle(anchorHost, customView);
      
      // Inject BEFORE the host component so it sits at the top of the tab
      anchorHost.parentNode.insertBefore(toggle, anchorHost);
      anchorHost.parentNode.insertBefore(customView, anchorHost);
    }
  
    setInterval(attemptInject, 1000);
  })();