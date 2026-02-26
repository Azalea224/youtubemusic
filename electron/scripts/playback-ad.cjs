"use strict";

/**
 * Detects if the current playback is an ad from scraped title/artist.
 * Used by playback-poll.js (injected) and by playback-ad.test.cjs.
 */
function isAdvertisement(title, artist) {
  const t = (title || "").trim();
  const adTitleExact = /^(Advertisement|Ad)$/i.test(t);
  const adPhrases = /Sponsored|video will play after this ad/i;
  return !!(
    adTitleExact ||
    (title && adPhrases.test(title)) ||
    (artist && adPhrases.test(artist))
  );
}

module.exports = { isAdvertisement };
