"use strict";

const { isAdvertisement } = require("./playback-ad.cjs");

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

assert(isAdvertisement("Advertisement", ""), "title 'Advertisement' is ad");
assert(isAdvertisement("Ad", ""), "title 'Ad' is ad");
assert(isAdvertisement("ad", ""), "title 'ad' (case) is ad");
assert(!isAdvertisement("Some Song", "Artist"), "normal title is not ad");
assert(!isAdvertisement("", ""), "empty is not ad");

assert(isAdvertisement("Sponsored", ""), "title 'Sponsored' is ad");
assert(isAdvertisement("", "Sponsored content"), "artist with Sponsored is ad");
assert(isAdvertisement("Video will play after this ad", ""), "title with phrase is ad");

console.log("playback-ad.test.cjs: all assertions passed");
