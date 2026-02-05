/**
 * Fine Volume Control Plugin - Replaces YTM's volume slider with percentage input
 * Electron: Pure DOM manipulation, no backend calls. Works in the YTM webview.
 * Enter 0–100 and press Enter, or click outside to apply.
 */
(function() {
  'use strict';
  if (window.__ytmFineVolumeLoaded) return;
  window.__ytmFineVolumeLoaded = true;

  function queryInTree(root, selector) {
    if (!root) return null;
    const q = (el, sel) => (el.__shady_native_querySelector || el.querySelector)?.call(el, sel);
    let found = q(root, selector);
    if (found) return found;
    const sr = root.shadowRoot || root._shadowRoot;
    if (sr) {
      found = q(sr, selector);
      if (found) return found;
    }
    return null;
  }

  function getVideo() {
    return document.querySelector('video') || queryInTree(document.body, 'video');
  }

  function getVideoPlayer() {
    return document.querySelector('.html5-video-player') || queryInTree(document.body, '.html5-video-player');
  }

  function getVolume() {
    const player = getVideoPlayer();
    if (player && typeof player.getVolume === 'function') return Math.round(player.getVolume());
    const video = getVideo();
    if (video) return Math.round((video.volume ?? 1) * 100);
    return 100;
  }

  function setVolume(pct) {
    const v = Math.max(0, Math.min(100, parseInt(pct, 10) || 0)) / 100;
    const player = getVideoPlayer();
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(Math.round(v * 100));
      return;
    }
    const video = getVideo();
    if (video) video.volume = v;
  }

  function findVolumeSlider() {
    const selectors = [
      '#volume-slider',
      'volume-bar',
      '[volume-bar]',
      'tp-yt-paper-slider[aria-label*="volume" i]',
      'tp-yt-paper-slider',
      'input[type="range"][aria-label*="volume" i]',
      '.volume-bar',
      '[class*="volume"]'
    ];
    const playerBar = document.querySelector('ytmusic-player-bar');
    const searchRoot = playerBar || document.body;
    for (const sel of selectors) {
      const el = queryInTree(searchRoot, sel);
      if (el) return el;
    }
    if (playerBar) {
      const sr = playerBar.shadowRoot || playerBar._shadowRoot;
      if (sr) {
        const vol = sr.querySelector('volume-bar') || sr.querySelector('#volume-slider') ||
          sr.querySelector('[volume-bar]') || sr.querySelector('tp-yt-paper-slider') ||
          sr.querySelector('input[type="range"]') || sr.querySelector('[class*="volume"]');
        if (vol) return vol;
      }
    }
    return null;
  }

  function createVolumeInput() {
    const container = document.createElement('div');
    container.id = 'ytm-fine-volume-container';
    container.style.cssText = 'display:flex;align-items:center;gap:4px;min-width:80px;position:relative;z-index:9999;pointer-events:auto;';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
    input.value = '100';
    input.id = 'ytm-volume-input';
    input.style.cssText = 'width:48px;padding:2px 4px;background:transparent;color:inherit;border:1px solid rgba(255,255,255,0.3);border-radius:4px;font-size:12px;text-align:center;pointer-events:auto;';
    const span = document.createElement('span');
    span.textContent = '%';
    span.style.cssText = 'font-size:12px;opacity:0.8;pointer-events:auto;';
    container.appendChild(input);
    container.appendChild(span);
    container.addEventListener('click', (e) => e.stopPropagation());
    container.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('change', () => { setVolume(input.value); input.value = String(getVolume()); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { setVolume(input.value); input.value = String(getVolume()); } });
    return { container, input };
  }

  function injectVolumeInput() {
    if (document.getElementById('ytm-fine-volume-container')) return false;
    const slider = findVolumeSlider();
    if (!slider) return false;

    const parent = slider.parentElement;
    if (!parent) return false;

    const { container, input } = createVolumeInput();
    input.value = String(getVolume());

    slider.style.display = 'none';
    slider.style.visibility = 'hidden';
    slider.style.position = 'absolute';
    slider.style.width = '0';
    slider.style.height = '0';
    slider.style.overflow = 'hidden';
    slider.setAttribute('aria-hidden', 'true');

    parent.insertBefore(container, slider.nextSibling);

    const updateInput = () => {
      if (document.activeElement !== input) input.value = String(getVolume());
    };
    setInterval(updateInput, 2000);
    return true;
  }

  function init() {
    if (!document.location.hostname.includes('music.youtube.com')) return;
    try {
      const tryInject = () => {
        if (injectVolumeInput()) return true;
        return false;
      };
      if (!tryInject()) {
        const observer = new MutationObserver(() => {
          if (tryInject()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { if (tryInject()) observer.disconnect(); }, 1500);
        setTimeout(() => { if (tryInject()) observer.disconnect(); }, 4000);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
  } else {
    setTimeout(init, 1000);
  }
})();
