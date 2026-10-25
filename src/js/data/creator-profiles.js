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
        var canonical = c.id;
        var existing = WTT_CREATORS[canonical] || {};
        var merged = Object.assign({}, existing, c);
        // Keep the previous avatar when the creator has not uploaded one.
        if (!c.avatar) merged.avatar = existing.avatar || null;
        // An approved profile replaces any placeholder this id was given.
        merged.placeholder = false;
        WTT_CREATORS[canonical] = merged;
        // Guides are stamped with the creator's account id, which is not always
        // the creator-record id. Alias that key to the same profile so guide
        // attribution resolves, but keep it out of the public list.
        if (c.userId && c.userId !== canonical) {
          WTT_CREATORS[c.userId] = Object.assign({}, merged, {
            id: c.userId, alias: true, canonicalId: canonical, placeholder: false
          });
        }
      });
      return list.length;
    })
    .catch(function () { return 0; });
})();
