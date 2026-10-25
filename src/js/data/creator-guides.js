/* Worth The Trip — creator-published guides
 *
 * Fetches guides that creators published (via /api/guides) and merges them into
 * the built-in WTT_GUIDES array BEFORE app.js renders, so creator guides get a
 * pin on the Explore map, a card, and a full guide panel exactly like WTT's own.
 *
 * Load order matters: after guides.js + creators.js, before app.js.
 * app.js waits on window.WTT_CREATOR_GUIDES_READY.
 */
(function () {
  'use strict';

  if (typeof WTT_GUIDES === 'undefined') {
    window.WTT_CREATOR_GUIDES_READY = Promise.resolve(0);
    return;
  }

  // Creator guides don't carry WTT's priceTier — derive it from the price.
  function priceTierOf(price) {
    var p = Number(price) || 0;
    if (p <= 500) return 1;
    if (p <= 1200) return 2;
    return 3;
  }

  function normalize(g) {
    var city = g.city || g.prefecture || 'Japan';
    var stops = (g.timeline || []).map(function (t) {
      return {
        day: t.day || 1,
        time: t.time || '',
        title: t.title || '',
        desc: t.desc || '',
        travelTime: t.travelTime || '',
        travelMode: t.travelMode || 'walk',
        image: t.image || '',
        googleMapsUrl: t.googleMapsUrl || '',
        mapPin: Array.isArray(t.mapPin) ? t.mapPin : null
      };
    }).filter(function (t) { return t.title && t.mapPin; });

    var ja = (g.ja && g.ja.title) ? {
      title: g.ja.title,
      tagline: g.ja.tagline || '',
      duration: g.ja.duration || '',
      includes: g.ja.includes || [],
      timeline: (g.ja.timeline || []).map(function (t) {
        return { title: t.title || '', desc: t.desc || '' };
      })
    } : undefined;

    return {
      id: g.id,
      creatorId: g.creatorId,
      title: g.title || 'Untitled guide',
      tagline: g.tagline || '',
      // The app calls location.toLowerCase() and splits on '·' — it must exist.
      location: 'Japan · ' + city,
      city: g.city || '',
      prefecture: g.prefecture || '',
      duration: g.duration || '',
      price: Number(g.price) || 0,
      priceTier: priceTierOf(g.price),
      category: g.category || 'culture',
      season: g.season || [],
      stay: [],
      coordinates: g.coordinates,
      zoomLevel: g.zoomLevel || 11,
      // Match the built-in guides' path style (no leading slash).
      heroImage: String(g.heroImage || '').replace(/^\//, ''),
      includes: g.includes || [],
      timeline: stops,
      subDestinations: [],
      // The app reads guide.youtubeRef for the "Watch the original trip" block.
      youtubeRef: (g.video && g.video.url) ? {
        url: g.video.url,
        title: g.video.handle ? ('Watch ' + g.video.handle) : 'Watch the original trip',
        description: g.video.platform ? ('Originally published on ' + g.video.platform) : ''
      } : null,
      ja: ja,
      _creatorGuide: true
    };
  }

  window.WTT_CREATOR_GUIDES_READY = fetch('/api/guides')
    .then(function (r) { return r.ok ? r.json() : { guides: [] }; })
    .then(function (res) {
      var list = (res && res.guides) || [];
      var creatorIds = [];
      list.forEach(function (raw) {
        if (!raw || !raw.id) return;
        if (WTT_GUIDES.some(function (x) { return x.id === raw.id; })) return;
        if (raw.creatorId && creatorIds.indexOf(raw.creatorId) === -1) creatorIds.push(raw.creatorId);
        if (typeof WTT_CREATORS !== 'undefined' && raw.creatorId && !WTT_CREATORS[raw.creatorId]) {
          WTT_CREATORS[raw.creatorId] = {
            id: raw.creatorId,
            name: raw.creatorName || 'Creator',
            handle: raw.creatorHandle || '',
            role: 'Featured Creator',
            bio: '',
            avatar: null,
            verified: false,
            platforms: [],
            followers: '',
            youtubeUrl: (raw.video && raw.video.url) || '',
            // Invented here, not from the server — hidden from the public list
            // unless an approved profile later claims this id.
            placeholder: true
          };
        }
        WTT_GUIDES.push(normalize(raw));
      });
      // Only live guides belong on the map. The studio writes every guide it
      // saves into the served guides.js, so that file can contain drafts and
      // rejected submissions — and a half-finished one (no location, no title)
      // used to throw and blank the whole Trips page.
      for (var i = WTT_GUIDES.length - 1; i >= 0; i--) {
        var st = WTT_GUIDES[i] && WTT_GUIDES[i].status;
        if (st && st !== 'published') WTT_GUIDES.splice(i, 1);
      }
      // app.js defaults visibleCreators to ['wtt']; tell it which creators are live.
      window.WTT_CREATOR_IDS = creatorIds;
      return list.length;
    })
    .catch(function () { window.WTT_CREATOR_IDS = []; return 0; });
})();
