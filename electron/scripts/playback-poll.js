(function () {
  "use strict";
  if (window.__ytmPollInjected) return;
  window.__ytmPollInjected = true;

  var POLL_INTERVAL_MS = 15000;
  var AD_FOLLOW_UP_MS = 2000;

  function findVideo() {
    var v = document.querySelector("video");
    if (v) return v;
    var root = document.body;
    if (!root) return null;
    var sr = root.shadowRoot || root._shadowRoot;
    if (sr) {
      v = sr.querySelector("video");
      if (v) return v;
    }
    return null;
  }

  function trySkipAd(isAd, dur) {
    try {
      var skip = document.querySelector(".ytp-ad-skip-button") ||
        document.querySelector(".ytp-ad-skip-button-modern");
      if (skip) { skip.click(); return; }
      var overlay = document.querySelector(".ytp-ad-overlay-close-button");
      if (overlay) { overlay.click(); return; }
      if (isAd) {
        var video = findVideo();
        if (video && !isNaN(video.duration)) {
          var target = dur && dur > 0 ? dur : video.duration;
          if (video.currentTime < target - 0.5) video.currentTime = target;
        }
      }
    } catch (e) {}
  }

  function scrapeAndReport() {
    try {
      if (document.visibilityState === "hidden") return;
      if (!window.ytm || typeof window.ytm.reportPlayback !== "function") return;

      function q(root, sel) {
        if (!root) return null;
        var sr = root.shadowRoot || root._shadowRoot;
        if (sr) { var r = sr.querySelector(sel); if (r) return r; }
        if (root.__shady_native_querySelector) return root.__shady_native_querySelector(sel);
        return root.querySelector(sel);
      }

      var bar = document.querySelector("ytmusic-player-bar");
      if (!bar) return;

      var t = q(bar, ".title.ytmusic-player-bar") || q(bar, ".title");
      var s = q(bar, ".ytmusic-player-bar.subtitle") || q(bar, ".subtitle");
      if (!s && bar) {
        var sr = bar.shadowRoot || bar._shadowRoot;
        if (sr) {
          var links = sr.querySelectorAll('.subtitle a[href*="channel/"]');
          if (links && links[0]) s = links[0];
        }
      }

      var title = t ? t.textContent.trim() : "";
      var artist = s ? s.textContent.trim() : "";
      var p = q(bar, "#play-pause-button") || q(bar, ".play-pause-button");
      var state = "paused";
      if (p) {
        var label = (p.getAttribute("aria-label") || "").toLowerCase();
        state = label.indexOf("pause") >= 0 ? "playing" : "paused";
      }

      var prog = 0, dur = 0;
      var te = q(bar, ".time-info") || q(bar, ".time");
      if (te) {
        var txt = te.textContent || "0:00 / 0:00";
        var pts = txt.split("/").map(function (x) { return x.trim(); });
        if (pts.length >= 2) {
          function parse(str) {
            var parts = str.split(":").map(Number).reverse(), sec = 0;
            for (var i = 0; i < parts.length; i++) sec += (parts[i] || 0) * Math.pow(60, i);
            return sec;
          }
          prog = parse(pts[0]);
          dur = parse(pts[1]);
        }
      }

      var isAd = window.__ytmIsAd ? window.__ytmIsAd(title, artist) : false;
      if (isAd) {
        trySkipAd(true, dur);
        setTimeout(tick, AD_FOLLOW_UP_MS);
      }

      if (title || artist || isAd) {
        window.ytm.reportPlayback({
          title: title || "",
          artist: artist || "",
          album: "",
          state: state,
          progress: prog,
          duration: dur,
          isAdvertisement: isAd,
        });
      }
    } catch (e) {}
  }

  function tick() {
    if (document.visibilityState === "hidden") return;
    if (window.requestIdleCallback) {
      requestIdleCallback(scrapeAndReport, { timeout: 3000 });
    } else {
      setTimeout(scrapeAndReport, 50);
    }
  }

  tick();
  setInterval(tick, POLL_INTERVAL_MS);
})();
