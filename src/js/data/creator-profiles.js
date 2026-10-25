// Worth The Trip — Creator profiles from the server
//
// Guides from the API only carry a creatorId, so the app used to invent a
// placeholder creator ("Creator", no avatar) for anyone approved after launch.
// This pulls the real profile — name, bio, socials and the account's uploaded
// avatar — for every approved creator and merges it over the static list.
//
// app.js waits on window.WTT_CREATOR_PROFILES_READY.

(function () {
  if (typeof WTT_CREATORS === 'undefined') {
    window.WTT_CREATOR_PROFILES_READY = Promise.resolve(0);
    return;
  }

  // `?v=` busts the browser cache; the `_ts` busts SiteGround's proxy, which
  // keys on the URL alone and ignores cookies.
  window.WTT_CREATOR_PROFILES_READY = fetch('/api/creator-profiles?_ts=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : { creators: [] }; })
    .then(function (res) {
      var list = (res && res.creators) || [];
      list.forEach(function (c) {
        if (!c || !c.id) return;
        var existing = WTT_CREATORS[c.id] || {};
        var merged = Object.assign({}, existing, c);
        // Keep the previous avatar when the creator has not uploaded one.
        if (!c.avatar) merged.avatar = existing.avatar || null;
        WTT_CREATORS[c.id] = merged;
      });
      return list.length;
    })
    .catch(function () { return 0; });
})();
