/* ============================================================
   WORTH THE TRIP — Main App Logic (MapLibre GL / Vector)
   Map, pins, modal, unlock flow, payments.
   ============================================================ */

(function () {
  'use strict';

  // -------- State --------
  const state = {
    map: null,
    mapOverlay: null,
    pinElements: [],
    stepPinElements: [],
    drive: { active: false, bearing: 0, steps: [], nextStep: null, followPauseUntil: 0 },
    activeGuideId: null,
    tripsDetailId: null,
    travelStart: null,
    travelEnd: null,
    unlockedGuides: loadUnlocked(),
    savedGuides: loadSavedGuides(),
    bookings: [],
    guideBookingStatus: {},
    activeFilter: 'all',
    searchQuery: '',
    diagnosticShown: false,
    tripSearch: '',
    creatorSearch: '',
    creatorPlatform: 'all',
    followedCreators: loadFollowed(),
    visibleCreators: loadVisibleCreators(),
    freeUnlocked: loadFreeUnlocked(),
  };

  function api(path, options) {
    options = options || {};
    // Bust any cached copy of a GET on the proxy (caches on URL alone).
    if ((options.method || 'GET').toUpperCase() === 'GET') {
      path += (path.indexOf('?') === -1 ? '?' : '&') + '_ts=' + Date.now();
    }
    return fetch(path, Object.assign({}, options, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {}),
      credentials: 'include'
    })).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) {
          var e = new Error(body.error || t('errGeneric'));
          e.status = r.status;
          e.problems = body.problems || null;
          throw e;
        }
        return body;
      });
    });
  }

  // -------- Config --------
  const CONFIG = {
    defaultCenter: [138.5, 35.5],
    defaultZoom: 5,
    vectorStyleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=cb1_2yub_1_2c7e35648b443f2f09a02221',
    lightStyleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json?key=cb1_2yub_1_2c7e35648b443f2f09a02221',
    stripePaymentLinks: {
      'tokyo-city-explorer': "https://checkout.stripe.com/c/pay/cs_live_a1rhWREezLiCkqPrwZFJkeTi7bRcipIrDOuOR7tKPjHWRD7cSSvEkAZas9#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'kyoto-heritage-walk': "https://checkout.stripe.com/c/pay/cs_live_a1RaanYhMY3eUqnL4qDnm1U8jABd0QevCbMsSStM9CRwIX3DPlOsP4M71A#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'osaka-food-crawl': "https://checkout.stripe.com/c/pay/cs_live_a1PHbolh8nWUeMu3CVNYOPaSzGufBPqvGxL0sfwrrig7TnMbURVqtoSNoI#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'sapporo-snow-nature': "https://checkout.stripe.com/c/pay/cs_live_a1yFy2838gfEdfhHxgOVy7Xdz7XQ8WqDkjzyzF36JJnSrtGcusBvcejH0h#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'fuji-summit-hike': "https://checkout.stripe.com/c/pay/cs_live_a1Hkgdi99fc2x0Pujb6InI15UwXabnjJe92PDZTcnS8YQUVVOjKRquEiUb#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'hakone-luxury-escape': "https://checkout.stripe.com/c/pay/cs_live_a1cmYZUeeYeaE1GDPjtOGxIBWlmJUg86yEQILCHPtAmZPYVhOBkpkGgq6M#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'hiroshima-miyajima': "https://checkout.stripe.com/c/pay/cs_live_a1ypcGNwmfm7UCXeLDowth6t2ucoLXGyPAvlyz6TWnMDyn5u5FKOwe58GW#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'fukuoka-ramen-trail': "https://checkout.stripe.com/c/pay/cs_live_a1Z8RTRh988qzuaMfbcVEA5OQWx9dulLJha4hQZvMvtPqwRSHTjgQJgnjx#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'nara-deer-temples': "https://checkout.stripe.com/c/pay/cs_live_a14T4DsZ1ZbTies1zAtpqCvMs0CedKXJ0XWXoQwlLNdJ32Gk2qIa1GvdBu#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
      'okinawa-beach-retreat': "https://checkout.stripe.com/c/pay/cs_live_a1FCjZbjFt7kiJYhfEuGQTbBPUXar29mRvdQ37BdWcPH4d4Yor7ELbgunF#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdqd2xibGtGamtxYH1xJz8naGpnbGlgWmR1dScpJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
    },

    stripeUnlockAllCheckoutUrl: "https://checkout.stripe.com/c/pay/cs_live_a1LpyZxQnveqOGugbeX4bPtRfC2xuEocSgjnt1DZGTDWwtPmb8slbElsnw#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2JzJz81KSdkdWxOYHwnPyd1blppbHNgWjA0UFVhSGtCaVJycTA8anQxZ3RNcEpvNzJVV2pVc01GZ3NtR0JmdG1jbV9AcXB8VVBzT1xvU1c3XUlif0J1ZmB0MHM2REF0VkhvdUpKcl9taWhzXHFhS3xiNTVHZjIybEhBUCcpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl",
    unlockAllPriceId: "price_1UPk8UGlWwt59oq4nOxRuzT5",
    postPaymentUrl: '/guide',
    openRouteServiceKey: '',






  };

  // -------- DOM refs --------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    map: $('#map'),
    searchInput: $('#search-input'),
    filterBtn: $('#filter-btn'),
    searchBar: $('#search-bar'),
    filterChips: $$('.chip'),
    popularCarousel: $('#popular-carousel'),
    modalOverlay: $('#guide-modal'),
    modalSheet: $('#modal-sheet'),
    modalClose: $('#modal-close'),
    modalHero: $('#modal-hero'),
    modalLocation: $('#modal-location'),
    modalDuration: $('#modal-duration'),
    modalCurated: $('#modal-curated'),
    modalTitle: $('#modal-title'),
    modalPrice: $('#modal-price'),
    modalUnlockBtn: $('#modal-unlock-btn'),
    modalUnlockSub: $('#modal-unlock-btn .btn-sub'),
    modalSaveBtn: $('#modal-save-btn'),
    modalIncludesLabel: $('#includes-label'),
    modalIncludes: $('#modal-includes'),
    modalTimeline: $('#modal-timeline'),
    modalTimelineContent: $('#modal-timeline-content'),
    modalSubDests: $('#subdest-label'),
    modalSubDestGrid: $('#modal-sub-dest-grid'),
    modalCreator: $('#modal-creator'),
    modalYoutube: $('#modal-youtube'),
    modalRatings: $('#modal-ratings'),
    commentsLabel: $('#comments-label'),
    modalComments: $('#modal-comments'),
    modalBody: document.querySelector('.modal-body'),
    toast: $('#toast'),
    datesModal: $('#dates-modal'),
    dateStart: $('#date-start'),
    dateEnd: $('#date-end'),
    datesSave: $('#dates-save'),
    datesSkip: $('#dates-skip'),
    datesClose: $('#dates-close'),
    brandLogo: $('#brand-logo'),
    modalStartBtn: $('#modal-start-btn'),
    navBanner: $('#nav-banner'),
    navNext: $('#nav-next'),
    navDist: $('#nav-dist'),
    navGmaps: $('#nav-gmaps'),
    navMode: $('#nav-mode'),
    navEnd: $('#nav-end'),
    profileModal: $('#profile-modal'),
    profileClose: $('#profile-close'),
    profileSignin: $('#profile-signin'),
    profileEmail: $('#profile-email'),
    profilePassword: $('#profile-password'),
    profileSigninBtn: $('#profile-signin-btn'),
    profileShowSignup: $('#profile-show-signup'),
    profileSignup: $('#profile-signup'),
    profileSignupUsername: $('#profile-signup-username'),
    profileSignupEmail: $('#profile-signup-email'),
    profileSignupPassword: $('#profile-signup-password'),
    profileSignupBtn: $('#profile-signup-btn'),
    profileShowSignin: $('#profile-show-signin'),
    profileSignedin: $('#profile-signedin'),
    profileSignedinEmail: $('#profile-signedin-email'),
    profileSignoutBtn: $('#profile-signout-btn'),
    profileDetails: $('#profile-details'),
    profileAvatarPreview: $('#profile-avatar-preview'),
    profileAvatarInput: $('#profile-avatar-input'),
    profileUsername: $('#profile-username'),
    profilePhone: $('#profile-phone'),
    profileAddress: $('#profile-address'),
    profileSaveBtn: $('#profile-save-btn'),
    headerProfileIcon: document.querySelector('.header-profile-icon'),
  };

  // -------- Helpers --------
  function showToast(msg, type) {
    els.toast.textContent = msg;
    els.toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => {
      els.toast.classList.remove('show');
    }, 3200);
  }

  function formatPrice(priceYen) {
    const s = loadSettings();
    if (s.currency === 'USD') {
      return '$' + (priceYen / 150).toFixed(2);
    }
    return '¥' + Math.round(priceYen).toLocaleString('en-US');
  }

  // -------- Theme (dark / light) --------
  function currentTheme() {
    return loadSettings().theme === 'light' ? 'light' : 'dark';
  }

  function paintThemeIcon(theme) {
    const moon = $('#theme-icon-moon');
    const sun = $('#theme-icon-sun');
    if (!moon || !sun) return;
    moon.style.display = theme === 'light' ? 'none' : 'block';
    sun.style.display = theme === 'light' ? 'block' : 'none';
    const btn = $('#theme-btn');
    if (btn) btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }

  function applyTheme(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    paintThemeIcon(theme);
    if (save) {
      const s = loadSettings();
      s.theme = theme;
      saveSettings(s);
    }
    if (state.map) {
      const style = theme === 'light' ? CONFIG.lightStyleUrl : CONFIG.vectorStyleUrl;
      try {
        state.map.setStyle(style);
        state.map.once('idle', () => {
          if (state.mapOverlay && !state.mapOverlay.parentNode && state.map.getContainer()) {
            state.map.getContainer().appendChild(state.mapOverlay);
          }
          onMapMove();
        });
      } catch (e) { /* map not ready */ }
    }
  }

  function toggleTheme() {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
  }

  // -------- i18n --------
  function lang() {
    return loadSettings().lang === 'ja' ? 'ja' : 'en';
  }
  function t(key) {
    const L = lang();
    if (WTT_STRINGS[L] && WTT_STRINGS[L][key] !== undefined) return WTT_STRINGS[L][key];
    return WTT_STRINGS.en[key] !== undefined ? WTT_STRINGS.en[key] : key;
  }

  const CATEGORY_LABELS_JA = {
    culture: '文化・歴史',
    food: 'グルメ・食',
    nature: '自然・絶景',
    hiking: 'ハイキング・アウトドア',
    luxury: 'ラグジュアリー',
    temples: '寺院・神社',
    nightlife: 'ナイトライフ・バー',
    shopping: 'ショッピング',
    onsen: '温泉',
    family: 'ファミリー・子ども',
    romance: 'ロマンス・新婚旅行',
    photography: '写真・絶景スポット',
    art: 'アート・美術館',
    festivals: '祭り・イベント',
    wellness: 'ウェルネス・リラックス',
    adventure: 'アドベンチャー・スポーツ',
    budget: 'バックパッカー・低予算',
    daytrips: '日帰り旅行',
    seasonal: '季節・桜',
    local: 'ローカル・穴場',
  };

  const CITY_JA = {
    Tokyo: '東京', Kyoto: '京都', Osaka: '大阪', Sapporo: '札幌',
    'Mt Fuji': '富士山', Hakone: '箱根', Hiroshima: '広島',
    Fukuoka: '福岡', Nara: '奈良', Naha: '那覇',
  };

  const PREF_JA = {
    Tokyo: '東京', Kyoto: '京都', Osaka: '大阪', Hokkaido: '北海道',
    Shizuoka: '静岡', Kanagawa: '神奈川', Hiroshima: '広島',
    Fukuoka: '福岡', Nara: '奈良', Okinawa: '沖縄',
  };

  const STAY_LABELS_JA = { hotel: 'ホテル', ryokan: '旅館', airbnb: 'Airbnb', guesthouse: 'ゲストハウス' };
  const PRICE_TIER_LABELS_JA = { 1: '$ · お手頃', 2: '$$ · スタンダード', 3: '$$$ · ラグジュアリー' };

  function catLabel(cat) {
    return lang() === 'ja' ? (CATEGORY_LABELS_JA[cat] || cat) : (CATEGORY_LABELS[cat] || cat);
  }

  function cityLabel(city) {
    return lang() === 'ja' ? (CITY_JA[city] || city) : city;
  }

  function prefLabel(pref) {
    return lang() === 'ja' ? (PREF_JA[pref] || pref) : pref;
  }

  function stayLabel(s) {
    return lang() === 'ja' ? (STAY_LABELS_JA[s] || s) : (STAY_LABELS[s] || s);
  }

  const TRAVEL_DATES_KEY = 'wtt_travel_dates';

  function loadTravelDates() {
    try {
      const raw = localStorage.getItem(TRAVEL_DATES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && parsed.start && parsed.end ? parsed : {};
    } catch (e) { return {}; }
  }

  function saveTravelDates(start, end) {
    try {
      localStorage.setItem(TRAVEL_DATES_KEY, JSON.stringify({ start, end }));
    } catch (e) {}
  }

  function applyTravelDates(start, end) {
    state.travelStart = start || null;
    state.travelEnd = end || null;
    saveTravelDates(state.travelStart, state.travelEnd);
  }

  function showDatesModal() {
    if (!els.datesModal) return;
    const saved = loadTravelDates();
    if (saved.start) els.dateStart.value = saved.start;
    if (saved.end) els.dateEnd.value = saved.end;
    els.datesModal.classList.add('active');
    els.datesModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function hideDatesModal() {
    if (!els.datesModal) return;
    els.datesModal.classList.remove('active');
    els.datesModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showDatesModalIfFirstVisit() {
    const saved = loadTravelDates();
    if (!saved.start || !saved.end) {
      setTimeout(() => showDatesModal(), 300);
    } else {
      applyTravelDates(saved.start, saved.end);
    }
  }

  function priceTierLabel(tier) {
    if (lang() === 'ja') return PRICE_TIER_LABELS_JA[tier] || PRICE_TIER_LABELS[tier];
    return PRICE_TIER_LABELS[tier];
  }

  // Guide content: g.ja.* overrides when lang is ja (falls back to EN per field)
  function gText(g, field) {
    if (lang() === 'ja' && g.ja && g.ja[field]) return g.ja[field];
    return g[field];
  }

  function gLocation(g) {
    if (lang() === 'ja' && g.ja && g.ja.city) return '日本 · ' + g.ja.city;
    return g.location;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Static HTML: elements carry data-i18n="key" (text) or data-i18n-ph="key" (placeholder)
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', t(el.dataset.i18nPh));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }
  // -------- App settings (language / currency / theme, local MVP) --------
  const SETTINGS_KEY = 'wtt_settings';

  function loadSettings() {
    try {
      return Object.assign({ lang: 'en', currency: 'JPY', theme: 'dark' }, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
    } catch (e) {
      return { lang: 'en', currency: 'JPY', theme: 'dark' };
    }
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) { /* unavailable */ }
  }

  function guideById(id) {
    const found = WTT_GUIDES.find(g => g.id === id);
    if (!found) {
      console.warn('[WTT] guideById miss:', id, 'WTT_GUIDES length:', WTT_GUIDES.length, 'ids:', WTT_GUIDES.map(g => g.id));
    }
    return found;
  }

  function creatorById(id) {
    return WTT_CREATORS[id];
  }

  // Guides are stamped with a creator's account id, which is not always the
  // creator-record id, so resolve whatever key a guide carries back to the
  // canonical creator id. Unknown ids pass through unchanged.
  function creatorKey(id) {
    const c = creatorById(id);
    return (c && c.canonicalId) || id;
  }

  // Visibility is stored as raw ids, which may predate the profiles fetch —
  // accept either the raw key or its canonical form.
  function isCreatorVisible(id) {
    return state.visibleCreators.has(id) || state.visibleCreators.has(creatorKey(id));
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // 128000 -> "128K", 8920000 -> "8.9M"
  function fmtCount(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '';
    if (v >= 1000000) return (v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    // Below 10K, rounding to a whole K loses real precision (4500 -> "5K"),
    // so keep one decimal while the value is not a whole thousand.
    if (v >= 1000) {
      const k = v / 1000;
      return (v % 1000 === 0 ? String(Math.round(k)) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    return String(v);
  }

  // "Jake Penlington" -> "JP"
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }

  function isGuideUnlocked(guideId) {
    return state.unlockedGuides.has(guideId);
  }

  // -------- Saved guides (local MVP) --------
  const SAVED_KEY = 'wtt_saved';

  function loadSavedGuides() {
    try {
      return new Set(JSON.parse(localStorage.getItem(SAVED_KEY)) || []);
    } catch (e) {
      return new Set();
    }
  }

  function persistSavedGuides() {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(state.savedGuides)));
    } catch (e) { /* unavailable */ }
  }

  function isGuideSaved(guideId) {
    return state.savedGuides.has(guideId);
  }

  function toggleSave(guideId) {
    if (state.savedGuides.has(guideId)) {
      state.savedGuides.delete(guideId);
      showToast(t('toast.unsaved'), 'success');
    } else {
      state.savedGuides.add(guideId);
      showToast(t('toast.saved'), 'success');
    }
    persistSavedGuides();
    refreshSaveHearts();
  }

  function refreshSaveHearts() {
    $$('.card-save').forEach(btn => {
      btn.classList.toggle('saved', isGuideSaved(btn.dataset.guideId));
    });
    if (state.activeGuideId && els.modalSaveBtn) {
      els.modalSaveBtn.classList.toggle('saved', isGuideSaved(state.activeGuideId));
    }
    const detailSave = $('#trip-detail-save');
    if (detailSave && state.activeGuideId) {
      detailSave.classList.toggle('saved', isGuideSaved(state.activeGuideId));
    }
    const panelSave = $('#nav-panel-save');
    if (panelSave && state.activeGuideId) {
      panelSave.classList.toggle('saved', isGuideSaved(state.activeGuideId));
    }
  }

  function filteredGuides() {
    const result = WTT_GUIDES.filter(g => {
      // Additive map: WTT guides always show, plus every added creator.
      if (!isCreatorVisible(g.creatorId || 'wtt')) return false;
      if (state.activeFilter !== 'all' && g.category !== state.activeFilter) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const raw = state.searchQuery.trim();
        const jaTitle = (g.ja && g.ja.title) || '';
        const jaLoc = '日本 · ' + cityLabel(g.city || cityOf(g));
        if (!g.title.toLowerCase().includes(q) &&
            !g.location.toLowerCase().includes(q) &&
            !jaTitle.includes(raw) &&
            !jaLoc.includes(raw)) return false;
      }
      return true;
    });

    // Sort by season relevance if travel dates are set.
    if (state.travelStart && state.travelEnd) {
      const start = new Date(state.travelStart + 'T00:00:00');
      const end = new Date(state.travelEnd + 'T00:00:00');
      const months = new Set();
      const d = new Date(start);
      while (d <= end) {
        months.add(d.toLocaleString('en-US', { month: 'short' }).toLowerCase().slice(0, 3));
        d.setDate(d.getDate() + 1);
      }
      const monthArr = Array.from(months);
      result.sort((a, b) => {
        const aMatch = (a.season || []).some(s => monthArr.includes(s)) ? 1 : 0;
        const bMatch = (b.season || []).some(s => monthArr.includes(s)) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    console.log('[WTT] filteredGuides: ' + result.length + ' guides visible (filter="' + state.activeFilter + '", search="' + state.searchQuery + '")');
    return result;
  }

  // -------- Build a question-mark pin SVG as inline DOM (no data URI) --------
  function buildPinSvg() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 792.12 982.89');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('class', 'wtt-pin');
    svg.style.width = '40px';
    svg.style.height = '40px';
    svg.style.display = 'block';
    svg.style.position = 'absolute';
    svg.style.transformOrigin = 'center center';
    svg.style.flexShrink = '0';

    function makePath(d, attrs) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
      return p;
    }

    svg.appendChild(makePath(
      'M402.85,7.15C166.66,7.48-19.31,209.47,10.27,445.06c21.32,176.83,139.51,334.91,268.11,453.47,22.37,20.57,45.99,44.36,71.24,59.26,23.36,13.89,48.32,19.64,73.77,9.2,15.26-6.1,29.35-16.88,41.56-26.92,182.31-151.55,365.71-381.8,308.23-629.32C736.34,142.27,575.88,9.38,403.05,7.16h-.21,0Z',
      { fill: '#fff' }
    ));
    svg.appendChild(makePath(
      'M757.21,258.44C703.78,114,561.43,12.49,407.62,7.88c-84.38-4.22-172.53,26.77-240.59,73.07-64.06,44.02-100.91,94.85-128.97,166.58C1.93,336.05-1.67,422.6,24.64,514.01c31.85,126.36,105.15,231.53,192.37,323.9,33.54,35.3,68.61,68.93,106.61,100.36,22.1,17.48,47.57,39.33,75.48,36.93,14.42-.65,30.63-9.57,44.87-19.5,14.56-10.18,29.33-22.15,43.13-33.75,73.45-62.33,138.81-134.59,193.79-213.75,93.44-135.22,135.55-291.44,76.44-449.43l-.12-.32h0Z',
      { fill: 'none', stroke: '#e90006', 'stroke-miterlimit': '10', 'stroke-width': '15' }
    ));
    svg.appendChild(makePath(
      'M549.18,271.46c0-71.21-50.11-126.58-145.04-126.58-67.24,0-123.95,29-171.41,75.17l-64.61-59.34c59.34-61.98,141.1-106.8,242.62-106.8,146.38,0,245.27,80.43,245.27,205.71,0,179.34-238.67,216.25-216.25,386.36h-96.26c-31.65-187.25,205.71-239.99,205.71-374.49v-.04h-.02Z',
      { fill: '#e90006' }
    ));
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '395.55');
    circle.setAttribute('cy', '801.44');
    circle.setAttribute('r', '101');
    circle.setAttribute('fill', '#e90006');
    svg.appendChild(circle);

    return svg;
  }

  // -------- Question-mark pin — inline SVG DOM --------
  // WTT's own guides get the WTT logo as their pin; other creators keep the ? pin.
  function createPinElement(guide) {
    if (guide && guide.creatorId === 'wtt') return stylePin(buildLogoPin());
    const avatar = guide ? (creatorById(guide.creatorId) || {}).avatar : null;
    const svg = avatar ? buildCreatorPin(avatar) : buildPinSvg();
    return stylePin(svg);
  }

  function stylePin(svg) {
    svg.style.cursor = 'pointer';
    svg.style.pointerEvents = 'auto';
    svg.style.transition = 'filter 150ms ease, box-shadow 150ms ease';
    svg.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))';
    svg.style.boxShadow = 'none';

    svg.addEventListener('mouseenter', () => {
      svg.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))';
      svg.style.boxShadow = 'none';
    });
    svg.addEventListener('mouseleave', () => {
      svg.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))';
      svg.style.boxShadow = 'none';
    });
    svg.addEventListener('touchstart', () => {
      svg.style.filter = 'brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.6))';
      svg.style.boxShadow = 'none';
    });
    svg.addEventListener('touchend', () => {
      svg.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))';
      svg.style.boxShadow = 'none';
    });

    // Let wheel events bubble through pins to the map container so
    // scroll zoom works while hovering a pin without blocking clicks.
    return svg;
  }

  // -------- Render popular carousel --------
  function renderPopularCarousel() {
    const heartSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    const popular = WTT_GUIDES.slice(0, 4);
    els.popularCarousel.innerHTML = popular.map(g => `
      <div class="carousel-card" data-guide-id="${g.id}" tabindex="0" role="button" aria-label="Open ${gText(g, 'title')}">
        <button class="save-heart card-save${isGuideSaved(g.id) ? ' saved' : ''}" data-guide-id="${g.id}" aria-label="Save ${gText(g, 'title')}">${heartSvg}</button>
        <img class="carousel-card-img" src="${g.heroImage}" alt="${gText(g, 'title')}" loading="lazy" onerror="this.style.display='none'">
        <div class="carousel-card-body">
          <div class="carousel-card-title">${gText(g, 'title')}</div>
          <div class="carousel-card-meta">${gText(g, 'duration')} · ${cityLabel(g.city || cityOf(g))}</div>
        </div>
      </div>
    `).join('');

    els.popularCarousel.querySelectorAll('.card-save').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSave(btn.dataset.guideId);
      });
    });

    els.popularCarousel.querySelectorAll('.carousel-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.guideId;
        const guide = guideById(id);
        if (guide && state.map) {
          state.map.flyTo({
            center: [guide.coordinates[1], guide.coordinates[0]],
            zoom: 12,
            duration: 2.0,
            essential: true
          });
        }
        openGuideModal(id);
      });
    });
  }

  // -------- Create map overlay --------
  function createMapOverlay() {
    console.log('[WTT Overlay] createMapOverlay called — state.map exists: ' + (!!state.map));
    if (!state.map || !state.map.getContainer()) {
      console.error('[WTT Overlay] ABORT: map or map container missing');
      return;
    }
    const container = state.map.getContainer();
    console.log('[WTT Overlay] Map container: ' + container.tagName + ', size: ' + container.clientWidth + 'x' + container.clientHeight + 'px');
    const overlay = document.createElement('div');
    overlay.id = 'pin-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10';
    overlay.style.overflow = 'hidden';
    container.appendChild(overlay);
    state.mapOverlay = overlay;
    console.log('[WTT Overlay] Created overlay div — appended to ' + container.tagName + ', overlay size: ' + overlay.clientWidth + 'x' + overlay.clientHeight + 'px');
  }

  // -------- Position a single pin --------
  function buildLogoPin() {
    const img = document.createElement('img');
    img.src = 'public/Branding/WTT Logo 1.svg';
    img.alt = 'Worth The Trip guide';
    img.className = 'logo-pin';
    img.style.position = 'absolute';
    return img;
  }

  // Creator pin: portrait clipped to the WTT pin shape, white wash over it,
  // red pin outline on top (no question mark) so the perimeter stays clean.
  let creatorPinSeq = 0;
  const PIN_FILL_D = 'M406.96,10.88C170.77,11.21-15.2,213.2,14.38,448.79c21.32,176.83,139.51,334.91,268.11,453.47,22.37,20.57,45.99,44.36,71.24,59.26,23.36,13.89,48.32,19.64,73.77,9.2,15.26-6.1,29.35-16.88,41.56-26.92,182.31-151.55,365.71-381.8,308.23-629.32C740.45,146,579.99,13.11,407.16,10.89h-.21,0Z';
  const PIN_OUTLINE_D = 'M766.25,267.2C712.86,122.86,570.84,21.4,417.34,16.8c-84.23-4.2-172.16,26.79-240.12,73.07-63.97,43.98-100.7,94.86-128.75,166.53-36.03,88.47-39.62,175.03-13.37,266.39,31.84,126.35,104.99,231.41,192.02,323.77,33.43,35.29,68.46,68.87,106.39,100.36,22.06,17.49,47.51,39.28,75.35,36.89,14.37-.7,30.54-9.6,44.81-19.49,14.57-10.2,29.24-22.19,43.01-33.79,73.35-62.28,138.53-134.55,193.42-213.72,93.22-135.15,135.23-291.28,76.25-449.22v-.3h-.1v-.1Z';

  function buildCreatorPin(avatarUrl) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 810 1000');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('class', 'wtt-pin');
    svg.style.width = '40px';
    svg.style.height = '40px';
    svg.style.display = 'block';
    svg.style.position = 'absolute';
    svg.style.transformOrigin = 'center center';
    svg.style.flexShrink = '0';

    const clipId = 'creator-clip-' + (++creatorPinSeq);
    const defs = document.createElementNS(NS, 'defs');
    const clip = document.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', clipId);
    const clipPath = document.createElementNS(NS, 'path');
    clipPath.setAttribute('d', PIN_FILL_D);
    clip.appendChild(clipPath);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const img = document.createElementNS(NS, 'image');
    img.setAttribute('href', avatarUrl);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', avatarUrl);
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    img.setAttribute('width', '810');
    img.setAttribute('height', '1000');
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    img.setAttribute('clip-path', 'url(#' + clipId + ')');
    svg.appendChild(img);

    function pinPath(d, attrs) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
      return p;
    }
    svg.appendChild(pinPath(PIN_OUTLINE_D, { fill: 'none', stroke: '#e90006', 'stroke-miterlimit': '10', 'stroke-width': '30' }));
    return svg;
  }

  function positionPin(svg, lngLat, ax, ay) {
      if (!state.map || !state.mapOverlay) return;
      // ax/ay = the point inside the pin box (px from its top-left) that
      // must sit on the geographic coordinate. Defaults match a 40x40 pin
      // anchored at its centre — the live site's convention.
      const anchorX = (typeof ax === 'number') ? ax : 20;
      const anchorY = (typeof ay === 'number') ? ay : 20;
      // Skip pins outside the current view — no layout work for them.
      try {
        if (state.map.getBounds && !state.map.getBounds().contains(lngLat)) {
          if (svg.style.display !== 'none') svg.style.display = 'none';
          return;
        }
      } catch (e) { /* fall through to project */ }
      const pt = state.map.project(lngLat);
      if (!isFinite(pt.x) || !isFinite(pt.y)) {
        console.log('[WTT positionPin] ABORT: invalid coordinates (off screen)');
        svg.style.display = 'none';
        return;
      }
      // The pin element carries no left/top offset of its own, so the
      // transform alone places it. Recomputed on every map move so each pin
      // stays locked to its geographic coordinate while panning/zooming.
      const offsetX = pt.x - anchorX;
      const offsetY = pt.y - anchorY;
      svg.style.transform = 'translate(' + offsetX.toFixed(1) + 'px, ' + offsetY.toFixed(1) + 'px)';
      svg.style.display = 'block';
    }

  // -------- Build / rebuild map pins --------
  function refreshMapMarkers(opts) {
    // opts.fit === false skips the auto-zoom (creator add/remove keeps the user's view).
    console.log('[WTT] refreshMapMarkers called — existing pins: ' + state.pinElements.length);

    state.pinElements.forEach(p => {
      if (p.svg && p.svg.parentNode) p.svg.parentNode.removeChild(p.svg);
    });
    state.pinElements = [];

    if (!state.mapOverlay) {
      createMapOverlay();
    }
    if (!state.mapOverlay) {
      console.error('[WTT] Cannot create map overlay — map container not found');
      return;
    }

    const visible = filteredGuides();

    visible.forEach(guide => {
      const svg = createPinElement(guide);
      state.pinElements.push({ svg, guide, lngLat: [guide.coordinates[1], guide.coordinates[0]], ax: 20, ay: 20 });
      state.mapOverlay.appendChild(svg);
      positionPin(svg, [guide.coordinates[1], guide.coordinates[0]], 20, 20);

      svg.addEventListener('click', (e) => {
        console.log('[WTT] pin clicked:', guide.id, guide.title);
        e.stopPropagation();
        if (state.map) {
          state.map.flyTo({
            center: [guide.coordinates[1], guide.coordinates[0]],
            zoom: 12,
            duration: 1.6,
            essential: true
          });
        }
        openGuideModal(guide.id);
        svg.style.filter = 'drop-shadow(0 2px 12px rgba(211,47,47,0.8))';
        svg.style.boxShadow = 'none';
        setTimeout(() => {
          svg.style.filter = 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))';
          svg.style.boxShadow = 'none';
        }, 400);
      });
    });

    console.log('[WTT] refreshMapMarkers: placed ' + state.pinElements.length + ' pins on overlay');

    if (visible.length > 0 && state.map && (!opts || opts.fit !== false)) {
      const bounds = new maplibregl.LngLatBounds();
      visible.forEach(g => bounds.extend([g.coordinates[1], g.coordinates[0]]));
      state.map.fitBounds(bounds, { padding: { top: 160, bottom: 220, left: 60, right: 60 }, maxZoom: 12 });
    }

    renderPopularCarousel();
    console.log('[WTT] renderPopularCarousel() completed');
  }

  // -------- Update pin positions when map moves --------
  function onMapMove() {
    state.pinElements.forEach(p => {
      if (p.hidden) return;
      positionPin(p.svg, p.lngLat, p.ax, p.ay);
    });
    state.stepPinElements.forEach(p => {
      positionPin(p.svg, p.lngLat, p.ax, p.ay);
    });
    positionNavDot();
  }

  function hideGuidePins() {
    state.pinElements.forEach(p => {
      p.hidden = true;
      if (p.svg) p.svg.style.display = 'none';
    });
  }

  function showGuidePins() {
    state.pinElements.forEach(p => {
      p.hidden = false;
      if (p.svg) p.svg.style.display = 'block';
    });
  }

  // -------- Numbered step pins --------
  function buildStepPin(number, stepIndex) {
    const size = 34;
    const svg = document.createElement('img');
    const svgMarkup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52">' +
      '<path d="M20 0C9.06 0 0 8.78 0 19.6c0 13.58 20 32.4 20 32.4S40 33.18 40 19.6C40 8.78 30.94 0 20 0z" fill="%23D32F2F"/>' +
      '<text x="20" y="27" text-anchor="middle" fill="%23fff" font-size="18" font-weight="700" font-family="Inter,sans-serif">' + number + '</text>' +
      '</svg>';
    svg.src = 'data:image/svg+xml,' + svgMarkup;
    svg.alt = 'Step ' + number;
    svg.className = 'step-pin';
    svg.style.position = 'absolute';
    svg.style.width = size + 'px';
    svg.style.height = (size * 52 / 40) + 'px';
    svg.style.pointerEvents = 'auto';
    svg.style.cursor = 'pointer';
    svg.style.zIndex = '15';
    svg.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    return svg;
  }

  function showStepPins(guide) {
    clearStepPins();
    if (!guide || !state.mapOverlay) return;
    const stops = navStops(guide);
    stops.forEach((stop, idx) => {
      if (!Array.isArray(stop.mapPin)) return;
      // stop.num keeps hotel pins in the same numbering as the timeline.
      const pin = buildStepPin(stop.num || (idx + 1), idx);
      // A borrowed pin (hotel with no coordinates of its own) sits a little to
      // the left so the stop pin it borrowed from stays visible too.
      const ax = stop.pinBorrowed ? 33 : 17;
      state.mapOverlay.appendChild(pin);
      state.stepPinElements.push({ svg: pin, lngLat: [stop.mapPin[1], stop.mapPin[0]], stepIndex: idx, ax: ax, ay: 44.2 });
      if (state.map) positionPin(pin, [stop.mapPin[1], stop.mapPin[0]], ax, 44.2);
    });
  }

  function clearStepPins() {
    state.stepPinElements.forEach(p => {
      if (p.svg && p.svg.parentNode) p.svg.parentNode.removeChild(p.svg);
    });
    state.stepPinElements = [];
  }

  function buildStay22Link(baseUrl, checkIn, checkOut) {
    const url = new URL(baseUrl, window.location.origin);
    const start = state.travelStart || checkIn;
    const end = state.travelEnd || checkOut;
    if (start) url.searchParams.set('checkin', start);
    if (end) url.searchParams.set('checkout', end);
    return url.toString();
  }

  function buildHotelStay22Link(hotel, guideId) {
    const aid = '6ae6fed2c21651647046f81f';
    const campaign = 'wtt-' + (guideId || '');
    const raw = (hotel.directBookingUrl || '').trim();

    if (raw) {
      const encoded = encodeURIComponent(raw);
      let endpoint = 'roam';
      if (raw.includes('booking.com')) endpoint = 'booking';
      else if (raw.includes('expedia.com')) endpoint = 'expedia';
      else if (raw.includes('hotels.com')) endpoint = 'hotels';

      // Direct hotel links must NOT carry checkin/checkout — those turn
      // the deep link into a search on Booking.com. Dates belong only
      // on the address-based fallback search.
      return 'https://www.stay22.com/allez/' + endpoint + '?aid=' + aid + '&link=' + encoded + '&campaign=' + campaign;
    }

    if (hotel.stay22Link) return buildStay22Link(hotel.stay22Link);

    const address = encodeURIComponent([hotel.name, hotel.city].filter(Boolean).join(', '));
    const base = 'https://www.stay22.com/allez/roam?aid=' + aid + '&address=' + address + '&campaign=' + campaign;
    return buildStay22Link(base);
  }

  function buildStay22SearchLink(name, city, guideId) {
    const aid = '6ae6fed2c21651647046f81f';
    const address = encodeURIComponent([name, city].filter(Boolean).join(', '));
    const base = 'https://www.stay22.com/allez/roam?aid=' + aid + '&address=' + address + '&campaign=wtt-' + (guideId || '');
    const url = new URL(base, window.location.origin);
    if (state.travelStart) url.searchParams.set('checkin', state.travelStart);
    if (state.travelEnd) url.searchParams.set('checkout', state.travelEnd);
    return url.toString();
  }

  // -------- Live navigation (GPS follow + check-in + Maps handoff) --------
  const NAV_CHECKIN_M = 50;
  const NAV_ROUTE_REFETCH_M = 25;    // redraw the route after this much movement
  const NAV_WATCH_RETRY_MS = 60000;  // re-arm a quiet GPS watch after this long

  function resetNavState() {
    const prev = state.nav || {};
    // Keep the blue dot + last known position: passive tracking owns them.
    state.nav = {
      watchId: null, guideId: null, bookingId: null, stopIndex: 0, mode: 'walking',
      userLngLat: prev.userLngLat || null, dot: prev.dot || null,
      routeKey: null, routeOrigin: null, routeDrawn: false,
      lastFixAt: 0, watchTimer: null, bookingMarker: null
    };
  }
  resetNavState();

  function haversineM(aLat, aLng, bLat, bLng) {
    const R = 6371000;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // One ordered list drives the timeline badges, the map pins and the
  // navigation index, so creator-added hotels are numbered exactly like
  // guide stops (a hotel that sits second in the guide is step 2).
  function guideSteps(guide) {
    const items = guide ? (guide.timeline || []) : [];
    const hotels = guide ? (guide.hotels || []) : [];
    const hotelByAfter = {};
    hotels.forEach((h, hi) => {
      const raw = (h && h.afterIndex !== '' && h.afterIndex != null) ? Number(h.afterIndex) : NaN;
      const key = (Number.isFinite(raw) && raw >= 0 && raw < items.length) ? Math.floor(raw) : items.length;
      (hotelByAfter[key] = hotelByAfter[key] || []).push(hi);
    });
    const steps = [];
    const pushHotel = (hi, afterIndex) => steps.push(makeHotelStep(hotels[hi], hi, afterIndex));
    items.forEach((stop, i) => {
      steps.push({
        kind: 'stop',
        timelineIndex: i,
        ref: stop,
        mapPin: Array.isArray(stop.mapPin) ? stop.mapPin : null,
        title: null,
        travelTime: stop.travelTime || '',
        afterIndex: null
      });
      (hotelByAfter[i] || []).forEach(hi => pushHotel(hi, i));
    });
    (hotelByAfter[items.length] || []).forEach(hi => pushHotel(hi, items.length));
    // A hotel the creator never pinned still gets a numbered map pin: borrow
    // the location of the stop it follows so it sits in the guide's sequence.
    let lastPin = null;
    steps.forEach((s, i) => {
      s.num = i + 1;
      if (s.kind === 'stop') {
        if (s.mapPin) lastPin = s.mapPin;
      } else if (!s.mapPin && lastPin) {
        s.mapPin = lastPin;
        s.pinBorrowed = true;
      }
    });
    return steps;
  }

  function makeHotelStep(h, hi, afterIndex) {
    return {
      kind: 'hotel',
      hotelIndex: hi,
      ref: h,
      mapPin: (h && Array.isArray(h.coordinates)) ? h.coordinates : null,
      title: (h && h.name) ? h.name : '',
      travelTime: '',
      afterIndex: afterIndex
    };
  }

  function navStops(guide) {
    return guideSteps(guide).filter(s => s.mapPin);
  }

  function navTargetTitle() {
    const target = navTarget();
    if (!target) return '';
    if (target.kind === 'hotel' || target.booking) return target.title || '';
    const guide = guideById(state.nav.guideId);
    const idx = guide && guide.timeline ? guide.timeline.indexOf(target.ref) : -1;
    return tlText(guide, idx, 'title');
  }

  // Timeline / sub-destination JA lookup by index (falls back to EN)
  function tlText(guide, idx, field) {
    if (!guide) return '';
    if (lang() === 'ja' && guide.ja && guide.ja.timeline && guide.ja.timeline[idx] && guide.ja.timeline[idx][field]) {
      return guide.ja.timeline[idx][field];
    }
    return (guide.timeline && guide.timeline[idx] && guide.timeline[idx][field] !== undefined) ? guide.timeline[idx][field] : '';
  }

  function subText(guide, subIdx, field) {
    if (!guide) return '';
    if (lang() === 'ja' && guide.ja && guide.ja.sub && guide.ja.sub[subIdx] && guide.ja.sub[subIdx][field] !== undefined) {
      return guide.ja.sub[subIdx][field];
    }
    return (guide.subDestinations && guide.subDestinations[subIdx] && guide.subDestinations[subIdx][field] !== undefined) ? guide.subDestinations[subIdx][field] : '';
  }

  function ytText(guide, field) {
    if (lang() === 'ja' && guide.ja && guide.ja.youtube && guide.ja.youtube[field]) {
      return guide.ja.youtube[field];
    }
    return guide.youtubeRef ? guide.youtubeRef[field === 'title' ? 'title' : 'description'] : '';
  }

  function creatorText(c, field) {
    if (!c) return '';
    if (lang() === 'ja' && c.ja && c.ja[field] !== undefined) return c.ja[field];
    return c[field];
  }

  function dayLabel(day) {
    return lang() === 'ja' ? day + '日目' : 'DAY ' + day;
  }

  function formatDist(m) {
    if (lang() === 'ja') {
      if (m < 1000) return 'あと' + Math.round(m) + 'm';
      return 'あと' + (m / 1000).toFixed(1) + 'km';
    }
    if (m < 1000) return Math.round(m) + ' m away';
    return (m / 1000).toFixed(1) + ' km away';
  }

  function retargetNavToStop(guide, timelineIdx) {
    // While navigating this guide, route the GPS line to the tapped stop.
    if (!guide || timelineIdx == null || isNaN(timelineIdx)) return;
    if (state.nav.guideId !== guide.id) return;
    // guideSteps() builds fresh objects on every call, so the step lookup and
    // the nav index must come from ONE list or indexOf() never matches.
    const steps = guideSteps(guide);
    const step = steps.find(s => s.kind === 'stop' && s.timelineIndex === Number(timelineIdx));
    const stopIdx = step ? steps.filter(s => s.mapPin).indexOf(step) : -1;
    if (stopIdx < 0) return;
    state.nav.stopIndex = stopIdx;
    updateNavBanner();
    updateNavRoute();
    updateDriveCamera();
  }

  function retargetNavToHotel(guide, hotelIdx) {
    // Same as retargetNavToStop, but for a creator-added hotel step.
    if (!guide || hotelIdx == null || isNaN(hotelIdx)) return;
    if (state.nav.guideId !== guide.id) return;
    const steps = guideSteps(guide);
    const step = steps.find(s => s.kind === 'hotel' && s.hotelIndex === Number(hotelIdx));
    const stopIdx = step ? steps.filter(s => s.mapPin).indexOf(step) : -1;
    if (stopIdx < 0) return;
    state.nav.stopIndex = stopIdx;
    updateNavBanner();
    updateNavRoute();
  }

  // Works out which kind of step a timeline button refers to and retargets.
  function retargetNavFromButton(guide, btn) {
    if (!guide || !btn) return;
    if (btn.dataset.hotelidx != null) retargetNavToHotel(guide, parseInt(btn.dataset.hotelidx, 10));
    else if (btn.dataset.tidx != null) retargetNavToStop(guide, parseInt(btn.dataset.tidx, 10));
  }

  function collapsePastSteps(guideId, currentNavIdx) {
    // Immediately collapse past steps so there's no flash of expanded content.
    const body = $('#nav-panel-body');
    const container = body || document;
    const items = container.querySelectorAll('.timeline-item');
    items.forEach(el => {
      const attr = el.querySelector('.timeline-start-btn')?.dataset.navidx;
      const navIdx = attr != null ? parseInt(attr, 10) : NaN;
      if (!isNaN(navIdx) && navIdx >= 0 && navIdx < currentNavIdx) {
        el.classList.add('past');
      } else {
        el.classList.remove('past');
      }
    });

    // Fade previous step pins on the map.
    state.stepPinElements.forEach(p => {
      if (p.stepIndex < currentNavIdx) {
        p.svg.style.opacity = '0.2';
      } else {
        p.svg.style.opacity = '1';
      }
    });

    // Scroll the current step to top after collapse is applied.
    const currentBtn = container.querySelector('.timeline-start-btn[data-navidx="' + currentNavIdx + '"]');
    if (currentBtn) {
      const timelineItem = currentBtn.closest('.timeline-item');
      if (timelineItem) {
        timelineItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function navTarget() {
    // A booking is a single destination rather than a guide itinerary.
    if (state.nav.bookingId) {
      const b = state.bookings.find(x => x.id === state.nav.bookingId);
      if (b && Array.isArray(b.coordinates) && b.coordinates.length === 2
          && Number.isFinite(Number(b.coordinates[0])) && Number.isFinite(Number(b.coordinates[1]))) {
        return {
          // mapPin is [lat, lng] everywhere else in the nav code.
          mapPin: [Number(b.coordinates[0]), Number(b.coordinates[1])],
          title: b.title,
          travelTime: '',
          booking: b
        };
      }
      return null;
    }
    const guide = guideById(state.nav.guideId);
    if (!guide) return null;
    const stops = navStops(guide);
    return stops[state.nav.stopIndex] || null;
  }

  function updateNavBanner() {
    const target = navTarget();
    if (!target) return;
    els.navNext.textContent = t('nav.next') + ': ' + navTargetTitle();
    if (state.nav.userLngLat) {
      const d = haversineM(state.nav.userLngLat[1], state.nav.userLngLat[0], target.mapPin[0], target.mapPin[1]);
      els.navDist.textContent = formatDist(d) + (target.travelTime ? ' · ' + target.travelTime : '');
    } else {
      els.navDist.textContent = t('nav.locating');
    }
    const mode = state.nav.mode === 'transit' ? 'transit' : 'walking';
    els.navGmaps.href = 'https://www.google.com/maps/dir/?api=1&destination=' + target.mapPin[0] + ',' + target.mapPin[1] + '&travelmode=' + mode;
    els.navMode.textContent = state.nav.mode === 'transit' ? 'Train' : 'Walk';
    const driveGmaps = $('#drive-gmaps');
    if (driveGmaps) driveGmaps.href = els.navGmaps.href;
  }

  function positionNavDot() {
    if (!state.nav.dot || !state.nav.userLngLat || !state.map) return;
    const pt = state.map.project(state.nav.userLngLat);
    if (!isFinite(pt.x) || !isFinite(pt.y)) {
      state.nav.dot.style.display = 'none';
      return;
    }
    state.nav.dot.style.display = 'block';
    state.nav.dot.style.transform = 'translate(' + (pt.x - 9).toFixed(1) + 'px, ' + (pt.y - 9).toFixed(1) + 'px)';
  }

  function ensureNavDot() {
    if (state.nav.dot || !state.mapOverlay) return;
    const dot = document.createElement('div');
    dot.className = 'nav-dot';
    dot.id = 'nav-dot';
    dot.style.display = 'none';
    state.mapOverlay.appendChild(dot);
    state.nav.dot = dot;
  }

  // Passive location (always-on blue dot, no navigation needed)
  function onPassivePosition(pos) {
    state.nav.userLngLat = [pos.coords.longitude, pos.coords.latitude];
    ensureNavDot();
    positionNavDot();
  }

  function startPassiveTracking() {
    if (!('geolocation' in navigator) || state.passiveWatchId !== undefined) return;
    try {
      state.passiveWatchId = navigator.geolocation.watchPosition(onPassivePosition, () => {}, {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 20000,
      });
    } catch (e) { /* unavailable */ }
  }

  function ensureRouteLayer() {
    if (!state.map || state.map.getSource('nav-route')) return true;
    try {
      state.map.addSource('nav-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      state.map.addLayer({
        id: 'nav-route-line',
        type: 'line',
        source: 'nav-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#D32F2F', 'line-width': 4, 'line-opacity': 0.9 }
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function setRouteLine(coords) {
    if (!ensureRouteLayer()) return;
    try {
      state.map.getSource('nav-route').setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: coords }
      });
    } catch (e) { /* map mid-style-change */ }
  }

  function clearNavRoute() {
    try {
      if (state.map && state.map.getLayer('nav-route-line')) state.map.removeLayer('nav-route-line');
      if (state.map && state.map.getSource('nav-route')) state.map.removeSource('nav-route');
    } catch (e) { /* already gone */ }
    if (state.nav) {
      state.nav.routeKey = null;
      state.nav.routeOrigin = null;
      state.nav.routeDrawn = false;
    }
  }

  // Turn-by-turn maneuvers from an OSRM-style payload.
  function osrmSteps(d) {
    const legs = d && d.routes && d.routes[0] && d.routes[0].legs;
    if (!Array.isArray(legs)) return [];
    const out = [];
    legs.forEach(leg => (leg.steps || []).forEach(st => {
      const m = st.maneuver || {};
      if (Array.isArray(m.location)) {
        out.push({ type: m.type || '', modifier: m.modifier || '', name: st.name || '', distance: Number(st.distance) || 0, location: [m.location[0], m.location[1]] });
      }
    }));
    return out;
  }

  function updateNavRoute() {
    const target = navTarget();
    if (!target || !state.nav.userLngLat || !state.map) return;
    const [uLng, uLat] = state.nav.userLngLat;
    const [tLat, tLng] = target.mapPin;

    // Refetch only when the target changed, or the traveller has moved 25m+
    // since the last successful route. Walking does not need a redraw every
    // few metres, and every redraw is another request to a rate-limited router.
    const moved = state.nav.routeOrigin
      ? haversineM(state.nav.routeOrigin[0], state.nav.routeOrigin[1], uLat, uLng)
      : Infinity;
    const key = state.nav.bookingId
      ? 'bk:' + state.nav.bookingId
      : state.nav.guideId + ':' + state.nav.stopIndex;
    if (state.nav.routeKey === key && moved < NAV_ROUTE_REFETCH_M) return;
    state.nav.routeKey = key;

    const straight = () => setRouteLine([[uLng, uLat], [tLng, tLat]]);
    const ok = (coords, steps) => {
      state.nav.routeOrigin = [uLat, uLng];
      state.nav.routeDrawn = true;
      state.nav.route = coords;
      state.drive.steps = Array.isArray(steps) && steps.length ? steps : [];
      setRouteLine(coords);
      if (state.drive.active) updateDriveBanner();
    };
    const fail = () => {
      // Keep whatever line is on screen and clear the key so the next GPS fix
      // retries. Locking the key here used to freeze a straight line for the
      // rest of the walk whenever one request failed.
      state.nav.routeKey = null;
      if (!state.nav.routeDrawn) straight();
    };

    // 1) Our own proxy — cached, retried, three public routers behind it.
    const tryProxy = () => fetch('/api/route?from=' + uLat + ',' + uLng + '&to=' + tLat + ',' + tLng)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const c = d && d.coordinates;
        if (c && c.length > 1) ok(c, d.steps); else tryOsrm();
      })
      .catch(tryOsrm);

    // 2) Straight to a public router if the proxy is unavailable.
    const tryOsrm = () => {
      const u = uLng + ',' + uLat, v = tLng + ',' + tLat;
      fetch('https://router.project-osrm.org/route/v1/foot/' + u + ';' + v + '?overview=full&geometries=geojson&steps=true')
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(d => {
          const c = d && d.routes && d.routes[0] && d.routes[0].geometry && d.routes[0].geometry.coordinates;
          if (c && c.length > 2) ok(c, osrmSteps(d)); else tryOsmDe();
        })
        .catch(tryOsmDe);
    };

    // 3) A second public foot router on a different host.
    const tryOsmDe = () => {
      const u = uLng + ',' + uLat, v = tLng + ',' + tLat;
      fetch('https://routing.openstreetmap.de/routed-foot/route/v1/driving/' + u + ';' + v + '?overview=full&geometries=geojson&steps=true')
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(d => {
          const c = d && d.routes && d.routes[0] && d.routes[0].geometry && d.routes[0].geometry.coordinates;
          if (c && c.length > 2) ok(c, osrmSteps(d)); else fail();
        })
        .catch(fail);
    };

    tryProxy();
  }
  // -------- Immersive drive mode --------
  // Camera sits behind the GPS point, tilted, rotating to the direction of
  // travel and zooming with the next maneuver — the Google-Maps feel, on our
  // own basemap style.
  const DRIVE_PITCH = 55;
  const DRIVE_ZOOM = 17.4;

  function bearingBetween(a, b) {
    // a/b are [lng, lat]; returns a compass bearing in degrees.
    const toRad = (d) => d * Math.PI / 180;
    const toDeg = (r) => r * 180 / Math.PI;
    const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
    const dlng = toRad(b[0] - a[0]);
    const y = Math.sin(dlng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function routeBearing(fromLngLat, coords) {
    if (!Array.isArray(coords) || coords.length < 2) return state.drive.bearing || 0;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = Math.abs(coords[i][0] - fromLngLat[0]) + Math.abs(coords[i][1] - fromLngLat[1]);
      if (d < bestD) { bestD = d; best = i; }
    }
    const ahead = Math.min(coords.length - 1, best + 8);
    if (ahead === best) return state.drive.bearing || 0;
    return bearingBetween(coords[best], coords[ahead]);
  }

  function driveZoom() {
    const next = state.drive.nextStep;
    if (next && next.distanceTo < 80) return 18.0;
    if (next && next.distanceTo < 250) return 17.6;
    return DRIVE_ZOOM;
  }

  function startDriveMode() {
    if (!state.nav.guideId && !state.nav.bookingId) return;
    state.drive.active = true;
    state.drive.followPauseUntil = 0;
    document.body.classList.add('nav-immersive');
    const target = navTarget();
    const p = state.nav.userLngLat || (target && target.mapPin ? [target.mapPin[1], target.mapPin[0]] : null);
    // Face the camera along the route from the very first frame.
    if (p && state.nav.route && state.nav.route.length > 1) {
      state.drive.bearing = routeBearing(p, state.nav.route);
    }
    if (state.map) {
      // Drop from wherever the map is into the follow view.
      state.map.flyTo({
        center: p || state.map.getCenter(),
        zoom: DRIVE_ZOOM,
        pitch: DRIVE_PITCH,
        bearing: state.drive.bearing || 0,
        duration: 1400,
        essential: true
      });
    }
    updateDriveBanner();
  }

  function stopDriveMode() {
    state.drive.active = false;
    document.body.classList.remove('nav-immersive');
    if (state.map) {
      try { state.map.flyTo({ pitch: 0, bearing: 0, duration: 700, essential: true }); } catch (e) {}
    }
  }

  function updateDriveCamera() {
    if (!state.drive.active || !state.map) return;
    if (Date.now() < state.drive.followPauseUntil) return;
    const p = state.nav.userLngLat;
    if (!p) return;
    const bearing = routeBearing(p, state.nav.route);
    state.drive.bearing = bearing;
    try {
      state.map.easeTo({
        center: [p[0], p[1]],
        bearing: bearing,
        pitch: DRIVE_PITCH,
        zoom: driveZoom(),
        duration: 900,
        easing: (t) => t,
        essential: true
      });
    } catch (e) { /* map mid-style-change */ }
  }

  const DRIVE_ICONS = {
    straight: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>',
    left: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>',
    right: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>',
    slight_left: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v-6"/><path d="M12 13l-6 6"/><path d="M6 19h6"/></svg>',
    slight_right: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v-6"/><path d="M12 13l6 6"/><path d="M18 19h-6"/></svg>',
    uturn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h8a4 4 0 0 1 4 4v5"/></svg>',
    roundabout: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 1 9-9"/><path d="M21 12a9 9 0 0 1-9 9"/><path d="M15 9l-3 3-3-3"/></svg>',
    arrive: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };

  function driveIconKey(step) {
    const type = String(step.type || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
    const mod = String(step.modifier || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
    if (type === 'arrive') return 'arrive';
    if (type === 'roundabout' || type === 'rotary' || type === 'roundabout_turn') return 'roundabout';
    if (type === 'uturn') return 'uturn';
    if (mod === 'sharp_left') return 'left';
    if (mod === 'sharp_right') return 'right';
    if (mod === 'slight_left') return 'slight_left';
    if (mod === 'slight_right') return 'slight_right';
    if (mod === 'left') return 'left';
    if (mod === 'right') return 'right';
    return 'straight';
  }

  function driveStepKey(step) {
    const type = String(step.type || 'continue').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
    const mod = String(step.modifier || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
    const full = mod ? type + '_' + mod : type;
    if (t('drive.step.' + full) !== 'drive.step.' + full) return 'drive.step.' + full;
    if (t('drive.step.' + type) !== 'drive.step.' + type) return 'drive.step.' + type;
    return 'drive.followRoute';
  }

  function computeNextStep() {
    const steps = state.drive.steps || [];
    const p = state.nav.userLngLat;
    if (!p || !steps.length) return null;
    let idx = 0, bestD = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const d = haversineM(p[1], p[0], steps[i].location[1], steps[i].location[0]);
      if (d < bestD) { bestD = d; idx = i; }
    }
    // Standing on a maneuver means the next one is the one that matters.
    if (bestD < 30 && idx < steps.length - 1) {
      idx += 1;
      bestD = haversineM(p[1], p[0], steps[idx].location[1], steps[idx].location[0]);
    }
    return { step: steps[idx], distanceTo: bestD };
  }

  function updateDriveBanner() {
    const nextEl = $('#drive-next');
    if (!nextEl) return;
    const subEl = $('#drive-sub');
    const turnEl = $('#drive-turn');
    const etaEl = $('#drive-eta');
    const next = computeNextStep();
    state.drive.nextStep = next;
    const target = navTarget();

    if (next) {
      nextEl.textContent = t(driveStepKey(next.step)) + (next.step.name ? ' · ' + next.step.name : '');
      subEl.textContent = formatDist(next.distanceTo);
      turnEl.innerHTML = DRIVE_ICONS[driveIconKey(next.step)] || DRIVE_ICONS.straight;
    } else if (target) {
      nextEl.textContent = target.title || t('drive.followRoute');
      subEl.textContent = '';
      turnEl.innerHTML = DRIVE_ICONS.straight;
    } else {
      nextEl.textContent = t('drive.followRoute');
      subEl.textContent = '';
      turnEl.innerHTML = DRIVE_ICONS.straight;
    }

    if (etaEl) {
      if (state.nav.userLngLat && target && target.mapPin) {
        const d = haversineM(state.nav.userLngLat[1], state.nav.userLngLat[0], target.mapPin[0], target.mapPin[1]);
        etaEl.textContent = formatDist(d) + (target.travelTime ? ' · ' + target.travelTime : '');
      } else {
        etaEl.textContent = t('nav.locating');
      }
    }
  }


  function setSplitView(on) {
    document.body.classList.toggle('nav-split', on);
    if (state.map) {
      setTimeout(() => {
        try { state.map.resize(); } catch (e) {}
        onMapMove();
      }, 60);
    }
  }

  function renderNavPanel(guideId) {
    const guide = guideById(guideId);
    const body = $('#nav-panel-body');
    const panel = $('#nav-panel');
    if (!guide || !body || !panel) return;
    const unlocked = isGuideUnlocked(guideId);
    const creator = creatorById(guide.creatorId);
    let html = `
      <div class="trip-detail-hero">
        <img src="${guide.heroImage}" alt="${gText(guide, 'title')}" loading="lazy" onerror="this.style.display='none'">
        <div class="modal-hero-overlay"></div>
        <div class="modal-hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          ${guide.location}
        </div>
      </div>
      <div class="modal-meta" style="margin-top:var(--space-md)">
        <div class="modal-duration">${gText(guide, 'duration')}</div>
        <div class="modal-curated">${t('modal.curatedBy')} ${(creator && creator.name) || 'Worth The Trip'}</div>
      </div>
      <div class="modal-title-row">
        ${creator && creator.avatar ? `<img class="detail-creator-avatar" src="${creator.avatar}" alt="${creator.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <h2 class="modal-title">${gText(guide, 'title')}</h2>
        <button id="nav-panel-save" class="save-heart${isGuideSaved(guideId) ? ' saved' : ''}" aria-label="Save guide">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
      </div>
      <div class="modal-price-row">
        <div class="modal-price">${formatPrice(guide.price)}</div>
        ${unlocked
          ? `<button class="btn-primary" disabled style="opacity:0.5;pointer-events:none"><span class="btn-label">${t('modal.unlocked')}</span><span class="btn-sub">${t('modal.followBelow')}</span></button>`
          : `<button class="btn-primary" id="nav-panel-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>`}
        <button class="btn-orange-sub" id="nav-panel-unlock-all"><span class="btn-label">${t('modal.subscribe')}</span></button>
      </div>
      <div class="section-label">${t('modal.includes')}</div>
      <div class="includes-list">${gText(guide, 'includes').map(item => `
        <div class="includes-list-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${item}</span>
        </div>`).join('')}
      </div>`;
    if (unlocked && guide.timeline) {
      html += `
        <div class="section-label">${t('modal.timeline')}</div>
        <div class="timeline">${timelineHtml(guide, guideId)}</div>`;
    }
    if (unlocked && creator) {
      html += `
        <div class="section-label">${t('modal.curatedBy')}</div>
        <div class="creator-card" style="display:flex">
          <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name}" onerror="this.style.display='none'">
          <div class="creator-info">
            <div class="creator-name">${creator.name}</div>
            <div class="creator-handle">${creatorText(creator, 'role')} · ${creator.handle}</div>
          </div>
        </div>`;
    }
    if (unlocked && guide.youtubeRef) {
      html += `
        <div class="section-label">${t('modal.youtube')}</div>
        <a href="${guide.youtubeRef.url}" target="_blank" rel="noopener noreferrer" class="youtube-ref" style="display:flex">
          <div class="youtube-icon">
            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div class="youtube-text">
            <strong>${ytText(guide, 'title')}</strong>
            ${ytText(guide, 'description')}
          </div>
        </a>`;
    }
    body.innerHTML = html;
    panel.setAttribute('aria-hidden', 'false');
    if (unlocked) {
      const pr = body.querySelector('.modal-price-row');
      if (pr) pr.remove();
      const wi = Array.from(body.querySelectorAll('.section-label')).find(el => el.textContent.trim().toLowerCase() === "what's included");
      if (wi) {
        const list = wi.nextElementSibling;
        if (list && list.classList.contains('includes-list')) list.remove();
        wi.remove();
      }
    }

    $('#nav-panel-save').addEventListener('click', () => toggleSave(guideId));
    const unlockBtn = $('#nav-panel-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockAllBtn = $('#nav-panel-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));
    body.querySelectorAll('[data-pin]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pin = JSON.parse(btn.dataset.pin);
        if (state.map) state.map.flyTo({ center: [pin[1], pin[0]], zoom: 16, duration: 1.2 });
        retargetNavFromButton(guide, btn);
      });
    });

    // Start navigation from a specific timeline step in the nav panel.
    body.querySelectorAll('.timeline-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.hotelidx != null) startGuideNav(guideId, null, parseInt(btn.dataset.hotelidx, 10));
        else startGuideNav(guideId, parseInt(btn.dataset.tidx, 10));
      });
    });

    // Clicking a collapsed past step re-expands it and everything after it.
    body.addEventListener('click', (e) => {
      const pastItem = e.target.closest('.timeline-item.past');
      if (!pastItem) return;
      const allItems = Array.from(body.querySelectorAll('.timeline-item'));
      const startIdx = allItems.indexOf(pastItem);
      if (startIdx === -1) return;
      allItems.slice(startIdx).forEach(el => el.classList.remove('past'));
      
      // Restore step pin opacity for re-expanded steps.
      state.stepPinElements.forEach(p => {
        if (p.stepIndex >= startIdx) {
          p.svg.style.opacity = '1';
        }
      });
      
      pastItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function clearNavPanel() {
    const body = $('#nav-panel-body');
    const panel = $('#nav-panel');
    if (body) body.innerHTML = '';
    if (panel) panel.setAttribute('aria-hidden', 'true');
  }

  function onNavPosition(pos) {
    state.nav.userLngLat = [pos.coords.longitude, pos.coords.latitude];
    state.nav.lastFixAt = Date.now();
    ensureNavDot();
    positionNavDot();
    const target = navTarget();
    if (!target) return;
    const d = haversineM(pos.coords.latitude, pos.coords.longitude, target.mapPin[0], target.mapPin[1]);
    if (d <= NAV_CHECKIN_M) {
      // A booking has no itinerary after it, so arriving is the end of the trip.
      if (state.nav.bookingId) {
        showToast(t('toast.checkedIn') + ': ' + target.title, 'success');
        stopGuideNav();
        return;
      }
      state.nav.stopIndex += 1;
      const guide = guideById(state.nav.guideId);
      const remaining = navStops(guide).length - state.nav.stopIndex;
      if (remaining <= 0) {
        showToast(t('toast.guideComplete'), 'success');
        stopGuideNav();
        return;
      }
      showToast(t('toast.checkedIn') + ': ' + target.title, 'success');
    }
    updateNavBanner();
    updateNavRoute();
    if (state.drive.active) updateDriveBanner();
    updateDriveCamera();

    // Auto-collapse past steps as user advances through the guide. The nav
    // index is what collapsePastSteps() compares against data-navidx.
    const guide = guideById(state.nav.guideId);
    if (guide) collapsePastSteps(guide.id, state.nav.stopIndex);
  }

  function onNavError(err) {
    // A GPS error is normal — a tunnel, a weak signal, the phone dozing.
    // watchPosition keeps retrying on its own, so never tear it down here:
    // clearing the watch is what used to end navigation until the guide was
    // restarted. Tell the traveller, then let the next fix recover.
    if (err && err.code === 1) showToast(t('toast.locBlocked'), 'success');
    else showToast(t('toast.navRetrying'), 'success');
  }

  function armNavWatch() {
    try { navigator.geolocation.clearWatch(state.nav.watchId); } catch (e) {}
    state.nav.lastFixAt = Date.now();
    try {
      state.nav.watchId = navigator.geolocation.watchPosition(onNavPosition, onNavError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000
      });
    } catch (e) { return; }
    // If the phone dozes or the signal never recovers, re-arm the watch so
    // navigation resumes by itself instead of silently freezing.
    clearInterval(state.nav.watchTimer);
    state.nav.watchTimer = setInterval(() => {
      if (!state.nav.guideId && !state.nav.bookingId) return;
      if (Date.now() - state.nav.lastFixAt < NAV_WATCH_RETRY_MS) return;
      state.nav.lastFixAt = Date.now();
      armNavWatch();
    }, 30000);
    if (state.nav.watchTimer.unref) state.nav.watchTimer.unref();
  }

  function startGuideNav(guideId, startStopIndex, hotelIndex) {
    const guide = guideById(guideId);
    if (!guide || !isGuideUnlocked(guideId)) {
      showToast(t('toast.unlockFirst'), 'success');
      return;
    }
    if (!('geolocation' in navigator)) {
      showToast(t('toast.noGeo'), 'success');
      return;
    }
    stopGuideNav(true);
    state.nav.guideId = guideId;

    // Convert a timeline index / hotel index into a nav stop index. Both the
    // step lookup and the nav index must come from ONE guideSteps() list — it
    // returns fresh objects, so indexing across two calls never matches.
    const steps = guideSteps(guide);
    const navSteps = steps.filter(s => s.mapPin);
    let startNavIdx = null;
    if (hotelIndex != null && !isNaN(hotelIndex)) {
      const step = steps.find(s => s.kind === 'hotel' && s.hotelIndex === Number(hotelIndex));
      const stopIdx = step ? navSteps.indexOf(step) : -1;
      state.nav.stopIndex = stopIdx >= 0 ? stopIdx : 0;
      startNavIdx = state.nav.stopIndex;
    } else if (startStopIndex != null && !isNaN(startStopIndex)) {
      const step = steps.find(s => s.kind === 'stop' && s.timelineIndex === Number(startStopIndex));
      const stopIdx = step ? navSteps.indexOf(step) : -1;
      state.nav.stopIndex = stopIdx >= 0 ? stopIdx : 0;
      startNavIdx = state.nav.stopIndex;
    } else {
      state.nav.stopIndex = 0;
    }

    closeModal();
    closeTripsPage();
    $('#popular-sheet').classList.add('hidden');
    state.activeGuideId = guideId;
    renderNavPanel(guideId);
    showStepPins(guide);
    hideGuidePins();
    // Collapse past steps after the nav panel HTML is in the DOM and painted.
    if (startNavIdx != null) {
      requestAnimationFrame(() => collapsePastSteps(guideId, startNavIdx));
    }
    setSplitView(true);
    els.navBanner.style.display = 'flex';
    updateNavBanner();
    showToast(t('toast.navStart') + ': ' + guide.title, 'success');
    try {
      armNavWatch();
    } catch (e) {
      onNavError(e);
    }

    // Center map to show both user location and target step.
    const stops = navStops(guide);
    const target = stops[state.nav.stopIndex];
    if (state.map) {
      if (startNavIdx != null && target && state.nav.userLngLat) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([state.nav.userLngLat[0], state.nav.userLngLat[1]]);
        bounds.extend([target.mapPin[1], target.mapPin[0]]);
        state.map.fitBounds(bounds, { padding: { top: 120, bottom: 160, left: 60, right: 60 }, maxZoom: 15, duration: 1.2 });
      } else if (stops.length > 0 && target) {
        state.map.flyTo({ center: [target.mapPin[1], target.mapPin[0]], zoom: 14, duration: 1.6 });
      } else if (startNavIdx != null) {
        showToast(t('nav.locating'), 'success');
      }
    }
  }

  function stopGuideNav(silent) {
    stopDriveMode();
    clearInterval(state.nav.watchTimer);
    state.nav.watchTimer = null;
    if (state.nav.watchId !== null && state.nav.watchId !== undefined) {
      try { navigator.geolocation.clearWatch(state.nav.watchId); } catch (e) {}
    }
    // Blue dot stays — passive tracking owns it now.
    clearNavRoute();
    clearNavPanel();
    setSplitView(false);
    if (state.nav.bookingMarker) {
      try { state.nav.bookingMarker.remove(); } catch (e) {}
      state.nav.bookingMarker = null;
    }
    resetNavState();
    if (els.navBanner) els.navBanner.style.display = 'none';
    // Clear collapsed/past state when nav ends.
    document.querySelectorAll('.timeline-item.past').forEach(el => el.classList.remove('past'));
    clearStepPins();
    showGuidePins();
    if (!silent) showToast(t('toast.navEnd'), 'success');
  }

  // A single destination pin for a booking.
  function showBookingPin(b) {
    if (!state.map) return;
    if (state.nav.bookingMarker) {
      try { state.nav.bookingMarker.remove(); } catch (e) {}
      state.nav.bookingMarker = null;
    }
    const el = document.createElement('div');
    el.className = 'booking-pin';
    el.innerHTML = '<svg width="24" height="32" viewBox="0 0 24 30" fill="#D32F2F" stroke="#fff" stroke-width="1.6"><path d="M12 1C6.5 1 2 5.5 2 11c0 7.5 10 18 10 18s10-10.5 10-18C22 5.5 17.5 1 12 1z"/><circle cx="12" cy="11" r="3.6" fill="#fff" stroke="none"/></svg>';
    state.nav.bookingMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([b.coordinates[1], b.coordinates[0]])
      .addTo(state.map);
  }

  // Navigate to a booking's location using the same routing, banner and drive
  // camera as guide navigation. Without coordinates we hand off to Google Maps.
  function bookingNav(b) {
    if (!b) return;
    if (!Array.isArray(b.coordinates) || b.coordinates.length !== 2) {
      const q = [b.title, b.location].filter(Boolean).join(', ');
      window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank', 'noopener');
      return;
    }
    stopGuideNav(true);
    state.nav = {
      watchId: null, guideId: null, bookingId: b.id, stopIndex: 0, mode: 'walking',
      userLngLat: null, dot: null, route: null, routeDrawn: false, routeOrigin: null,
      routeKey: null, lastFixAt: 0, watchTimer: null, bookingMarker: null
    };
    state.activeGuideId = null;
    hideGuidePins();
    clearStepPins();
    if (state.map) {
      try {
        state.map.flyTo({ center: [b.coordinates[1], b.coordinates[0]], zoom: 14, pitch: 0, bearing: 0, duration: 1200 });
      } catch (e) {}
    }
    showBookingPin(b);
    setSplitView(false);
    if (els.navBanner) els.navBanner.style.display = 'flex';
    updateNavBanner();
    armNavWatch();
    if (state.nav.userLngLat) updateNavRoute();
  }

  function travelIcon(text) {
    const t = (text || '').toLowerCase();
    if (/walk/.test(t)) return 'Walk';
    if (/train|line|station|subway|shinkansen/.test(t)) return 'Train';
    if (/bus/.test(t)) return 'Bus';
    if (/drive|car|taxi/.test(t)) return 'Car';
    if (/ferry|boat|ship/.test(t)) return 'Ferry';
    if (/bike|cycle/.test(t)) return 'Bike';
    return 'Time';
  }

  function shortStopName(title) {
    return (title || '').split(/[—\-(]/)[0].trim();
  }

  // Full day-by-day itinerary markup, shared by popup + Trips detail
  function timelineHtml(guide, guideId) {
    const items = (guide.timeline || []).map((item, i) => Object.assign({}, item, {
      _tTitle: tlText(guide, i, 'title'),
      _tDesc: tlText(guide, i, 'desc'),
    }));
    // One ordered list drives the badges, the map pins and the nav index, so
    // creator-added hotels are numbered exactly like guide stops.
    const steps = guideSteps(guide);
    const navSteps = steps.filter(s => s.mapPin);
    const stepByTimelineIndex = {};
    steps.forEach(s => { if (s.kind === 'stop') stepByTimelineIndex[s.timelineIndex] = s; });
    const hotelsAfter = idx => steps.filter(s => s.kind === 'hotel' && s.afterIndex === idx);

    const days = [];
    items.forEach((item, i) => {
      const day = item.day || 1;
      let group = days.find(d => d.day === day);
      if (!group) { group = { day, indexes: [] }; days.push(group); }
      group.indexes.push(i);
    });

    const renderStop = i => {
      const item = items[i];
      const step = stepByTimelineIndex[i];
      const stepNum = step ? step.num : (i + 1);
      const navIdx = step ? navSteps.indexOf(step) : -1;
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <span class="timeline-time">${item.time}</span>
          <div class="timeline-row">
            <div class="timeline-text">
              <div class="timeline-title-row">
                <span class="timeline-step-num">${stepNum}</span>
                <div class="timeline-title">${item._tTitle}</div>
                ${item.requiresBooking ? bookingStatusHtml('stop-' + i) : ''}
                <button class="timeline-start-btn"${item.mapPin ? ` data-pin='${JSON.stringify(item.mapPin)}'` : ''} data-tidx="${i}" data-navidx="${navIdx}" aria-label="Start navigation to ${item._tTitle}">
                  ${t('nav.startBtn')}
                </button>
              </div>
              <div class="timeline-desc">${item._tDesc}</div>
              <div class="timeline-meta">
                <span>${travelIcon(item.travelTime)} ${item.travelTime}</span>
                ${item.requiresBooking && item.bookingLink ? `<a class="timeline-meta-btn timeline-book-btn" href="${esc(item.bookingLink)}" target="_blank" rel="noopener noreferrer">${esc(t('booking.bookNow'))}</a>` : ''}
              </div>
              ${nearbyStripHtml(guide, i)}
            </div>
            ${item.image ? `<img class="timeline-thumb" src="${item.image}" alt="${item._tTitle}" loading="lazy" onerror="this.style.display='none'">` : ''}
          </div>
        </div>`;
    };

    const renderHotel = s => {
      const h = s.ref;
      const navIdx = navSteps.indexOf(s);
      const link = buildHotelStay22Link(h, guideId);
      return `
        <div class="timeline-item timeline-hotel">
          <div class="timeline-dot"></div>
          <span class="timeline-time"></span>
          <div class="timeline-row">
            <div class="timeline-text">
              <div class="timeline-title-row">
                <span class="timeline-step-num">${s.num}</span>
                <div class="timeline-title">${esc(h.name)}</div>
                ${h.requiresBooking === false ? '' : bookingStatusHtml('hotel-' + s.hotelIndex)}
                <button class="timeline-start-btn"${s.mapPin ? ` data-pin='${JSON.stringify(s.mapPin)}'` : ''} data-hotelidx="${s.hotelIndex}" data-navidx="${navIdx}" aria-label="Start navigation to ${esc(h.name)}">
                  ${t('nav.startBtn')}
                </button>
              </div>
              <div class="timeline-desc">${esc([h.address, h.city].filter(Boolean).join(' · '))}</div>
              <div class="timeline-meta">
                <a class="timeline-meta-btn timeline-book-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${t('hotelRec.checkAvailability')}</a>
                <a class="timeline-meta-btn timeline-search-btn" href="${esc(buildStay22SearchLink(h.name, h.city, guideId))}" target="_blank" rel="noopener noreferrer">${esc(t('hotelRec.searchNearby'))}</a>
              </div>
            </div>
            ${h.image ? `<img class="timeline-thumb" src="${esc(h.image)}" alt="${esc(h.name)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          </div>
        </div>`;
    };

    const html = days.map(group => {
      const route = group.indexes.map(i => shortStopName(items[i]._tTitle)).filter(Boolean).join(' → ');
      let out = `
      <div class="timeline-day"><span class="timeline-day-num">${dayLabel(group.day)}</span><span class="timeline-day-route">${route}</span></div>
      ` + group.indexes.map(i => renderStop(i) + hotelsAfter(i).map(renderHotel).join('')).join('');
      return out;
    }).join('');

    // Hotels with no position (or one past the last stop) close the guide.
    return html + hotelsAfter(items.length).map(renderHotel).join('');
  }

  function nearestTimelineIndex(subPin, timeline) {
    let best = -1, bestD = Infinity;
    (timeline || []).forEach((t, i) => {
      if (!Array.isArray(t.mapPin)) return;
      const d = haversineM(subPin[0], subPin[1], t.mapPin[0], t.mapPin[1]);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function nearbyStripHtml(guide, idx) {
    if (!guide.subDestinations) return '';
    const near = guide.subDestinations
      .map((d, i) => ({ d, i }))
      .filter(({ d, i }) => Array.isArray(d.pin) && nearestTimelineIndex(d.pin, guide.timeline) === idx);
    if (near.length === 0) return '';
    return `<div class="nearby-strip">` + near.map(({ d, i }) => `
      <button class="nearby-chip" data-pin='${JSON.stringify([d.pin[1], d.pin[0]])}' aria-label="Show ${subText(guide, i, 'name')} on map" title="${subText(guide, i, 'name')}">
        <img src="${d.image}" alt="${subText(guide, i, 'name')}" loading="lazy" onerror="this.style.display='none'">
        <span>${subText(guide, i, 'name')}</span>
      </button>`).join('') + `</div>`;
  }

  // -------- Modal: open guide --------
  // A hotel step, or a stop the creator flagged as ticketed, carries a small
  // badge: amber with an "Add booking" prompt until the traveller has a
  // matching booking, green once one is detected.
  function bookingStatusHtml(key) {
    const st = (state.guideBookingStatus || {})[key];
    if (st && st.booked) {
      return '<span class="step-booking-status is-booked" title="' +
        esc(t('bookStatus.booked') + (st.bookingTitle ? ': ' + st.bookingTitle : '')) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
        '<span class="sbs-label">' + esc(t('bookStatus.booked')) + '</span>' +
      '</span>';
    }
    return '<button type="button" class="step-booking-status is-missing" data-add-booking="' + esc(key) + '"' +
      ' title="' + esc(t('bookStatus.required')) + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>' +
      '<span class="sbs-label">' + esc(t('bookStatus.add')) + '</span>' +
    '</button>';
  }

  // Renders the modal timeline and wires its buttons. Called on open and again
  // when the booking-coverage fetch lands.
  function renderModalTimeline(guide, guideId) {
    const box = els.modalTimelineContent;
    if (!box) return;
    box.innerHTML = timelineHtml(guide, guideId);

    box.querySelectorAll('[data-pin]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pin = JSON.parse(btn.dataset.pin);
        state.map.flyTo({ center: [pin[1], pin[0]], zoom: 16, duration: 1.2 });
        retargetNavFromButton(guide, btn);
        toast(t('toast.flyingTo') + ' ' + btn.closest('.timeline-item').querySelector('.timeline-title').textContent);
      });
    });

    // Start navigation from a specific timeline step in the modal.
    box.querySelectorAll('.timeline-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.hotelidx != null) startGuideNav(guideId, null, parseInt(btn.dataset.hotelidx, 10));
        else startGuideNav(guideId, parseInt(btn.dataset.tidx, 10));
      });
    });
  }

  // Which hotel / ticketed steps the traveller already has a booking for.
  function loadGuideBookingStatus(guideId) {
    if (!guideId) return;
    fetch('/api/guides/' + encodeURIComponent(guideId) + '/booking-status', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        state.guideBookingStatus = (d && d.steps) || {};
        const g = guideById(guideId);
        if (!g) return;
        // Only repaint whatever is still on screen for this guide.
        if (state.activeGuideId === guideId && els.modalTimeline && els.modalTimeline.style.display !== 'none') {
          renderModalTimeline(g, guideId);
        }
        if (state.nav && state.nav.guideId === guideId && document.body.classList.contains('nav-split')) {
          renderNavPanel(guideId);
        }
      })
      .catch(() => { /* coverage is a nicety — never block the modal */ });
  }

  function openGuideModal(guideId) {
    console.log('[WTT] openGuideModal called with:', guideId);
    const guide = guideById(guideId);
    if (!guide) {
      console.warn('[WTT] openGuideModal abort: guide not found for', guideId);
      return;
    }

    // Clear any collapsed/past state from previous navigation.
    document.querySelectorAll('.timeline-item.past').forEach(el => el.classList.remove('past'));

    state.activeGuideId = guideId;
    const unlocked = isGuideUnlocked(guideId);

    els.modalLocation.textContent = gLocation(guide);
    els.modalDuration.textContent = gText(guide, 'duration');
    els.modalCurated.textContent = t('modal.curatedBy') + ' ' + ((creatorById(guide.creatorId) && creatorById(guide.creatorId).name) || 'Worth The Trip');

    els.modalTitle.textContent = gText(guide, 'title');
    els.modalPrice.textContent = formatPrice(guide.price);

    const paymentLink = CONFIG.stripePaymentLinks[guideId];
    if (paymentLink) {
      els.modalUnlockSub.textContent = '';
    } else {
      els.modalUnlockSub.textContent = t('modal.comingSoon') + ' — ' + formatPrice(guide.price);
    }

    // Update the hero in place rather than replacing its markup: the title and
    // meta line now live inside the hero, and rebuilding it would wipe them.
    let heroImg = els.modalHero.querySelector('img');
    if (!heroImg) {
      heroImg = document.createElement('img');
      heroImg.loading = 'lazy';
      heroImg.addEventListener('error', () => { heroImg.style.display = 'none'; });
      els.modalHero.insertBefore(heroImg, els.modalHero.firstChild);
    }
    heroImg.src = guide.heroImage;
    heroImg.alt = gText(guide, 'title');
    heroImg.style.display = '';
    const heroLoc = els.modalHero.querySelector('#modal-location');
    if (heroLoc) heroLoc.textContent = gLocation(guide);

    els.modalIncludes.innerHTML = gText(guide, 'includes').map(item => `
      <div class="includes-list-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${item}</span>
      </div>
    `).join('');

    if (unlocked && guide.timeline) {
      els.modalTimeline.style.display = 'block';
      renderModalTimeline(guide, guideId);
      loadGuideBookingStatus(guideId);
    } else {
      els.modalTimeline.style.display = 'none';
    }

    // Sub-destinations render inside the timeline as nearby strips.
    els.modalSubDests.style.display = 'none';
    els.modalSubDestGrid.style.display = 'none';

    if (unlocked && guide.youtubeRef) {
      els.modalYoutube.style.display = 'flex';
      els.modalYoutube.innerHTML = `
        <a href="${guide.youtubeRef.url}" target="_blank" rel="noopener noreferrer" class="youtube-ref">
          <div class="youtube-icon">
            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div class="youtube-text">
            <strong>${ytText(guide, 'title')}</strong>
            ${ytText(guide, 'description')}
          </div>
        </a>
      `;
    } else {
      els.modalYoutube.style.display = 'none';
    }

    // Creator signature box — always at the very bottom of the guide modal.
    const creator = creatorById(guide.creatorId);
    if (unlocked && creator) {
      els.modalCreator.style.display = 'flex';
      els.modalCreator.innerHTML = `
        <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name}" onerror="this.style.display='none'">
        <div class="creator-info">
          <div class="creator-name">${creator.name}</div>
          <div class="creator-handle">${creatorText(creator, 'role')} · ${creator.handle}</div>
        </div>
      `;
    } else {
      els.modalCreator.style.display = 'none';
    }

    // Hotel recommendation block is now rendered inside the timeline as a step.

    // Ratings and comments inform the purchase, so they show for locked guides too.
    renderGuideRatings(guide);
    renderGuideComments(guide);

    const isLocked = !unlocked;
    let lockedOverlay = els.modalHero.querySelector('.modal-locked-overlay');
    if (isLocked) {
      if (!lockedOverlay) {
        lockedOverlay = document.createElement('div');
        lockedOverlay.className = 'modal-locked-overlay';
        lockedOverlay.innerHTML = `
          <div class="modal-locked-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div class="modal-locked-text">${t('modal.lockedText')}</div>
        `;
        els.modalHero.appendChild(lockedOverlay);
      }
    } else {
      const existing = els.modalHero.querySelector('.modal-locked-overlay');
      if (existing) existing.remove();
    }

    if (isLocked) {
      const canFree = !unlocked && !state.freeUnlocked;
      els.modalUnlockBtn.disabled = false;
      els.modalUnlockBtn.style.opacity = '1';
      els.modalUnlockBtn.style.pointerEvents = 'auto';
      els.modalUnlockBtn.querySelector('.btn-label').textContent = canFree ? t('modal.unlockFree') : t('modal.unlock');
      els.modalUnlockBtn.querySelector('.btn-sub').textContent = '';
      els.modalStartBtn.style.display = 'none';
      els.modalPrice.closest('.modal-price-row').style.display = '';
      els.modalIncludesLabel.style.display = '';
      els.modalIncludes.style.display = '';
    } else {
      els.modalPrice.closest('.modal-price-row').style.display = 'none';
      els.modalIncludesLabel.style.display = 'none';
      els.modalIncludes.style.display = 'none';
      els.modalStartBtn.style.display = 'block';
    }

    // Subscribe (Unlock All Guides) button
    const unlockAllBtn = $('#modal-unlock-all');
    if (unlockAllBtn) {
      unlockAllBtn.querySelector('.btn-label').textContent = t('modal.subscribe');
      unlockAllBtn.querySelector('.btn-sub').textContent = '';
      unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));
    }

    // Per-guide: Unlock Guide button (guideId is in scope here — openGuideModal).
    els.modalUnlockBtn.addEventListener('click', () => {
      console.log('[WTT] modal unlock btn clicked for:', guideId);
      const result = attemptUnlock(guideId);
      console.log('[WTT] attemptUnlock returned:', result);
      if (result === true) {
        // Free unlock succeeded — refresh the modal to show the unlocked guide.
        console.log('[WTT] Refreshing modal after free unlock');
        openGuideModal(guideId);
      }
    });

    els.modalOverlay.classList.add('active');
    els.modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    refreshSaveHearts();
  }

  function closeModal() {
    els.modalOverlay.classList.remove('active');
    els.modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.activeGuideId = null;
    clearStepPins();
  }

  // -------- Guide ratings: creator's red stars + traveller yellow stars --------
  const RATING_STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5 7.3 14.03 2.6 9.45l6.5-.95z"/></svg>';

  function starRow(value) {
    let out = '';
    for (let i = 1; i <= 5; i++) {
      out += '<span class="star' + (i <= Math.round(value) ? ' on' : '') + '">' + RATING_STAR_SVG + '</span>';
    }
    return out;
  }

  function renderGuideRatings(guide) {
    const box = els.modalRatings;
    if (!box) return;
    const creator = Math.max(0, Math.min(5, Math.round(Number(guide.creatorRating) || 0)));
    box.style.display = 'block';
    box.innerHTML =
      '<div class="rating-row">' +
        '<div class="stars creator-stars">' + starRow(creator) + '</div>' +
        '<div class="rating-caption">' + esc(t('rating.creator')) + (creator ? ' · ' + creator + '/5' : '') + '</div>' +
      '</div>' +
      '<div class="rating-row">' +
        '<div class="stars traveller-stars" id="traveller-stars">' + starRow(0) + '</div>' +
        '<div class="rating-caption" id="traveller-caption">' + esc(t('rating.loading')) + '</div>' +
      '</div>';
    loadGuideRatings(guide);
  }

  async function loadGuideRatings(guide) {
    const starsEl = $('#traveller-stars');
    const capEl = $('#traveller-caption');
    if (!starsEl || !capEl) return;
    try {
      const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/ratings?_ts=' + Date.now(), { credentials: 'include' });
      if (!r.ok) throw new Error('bad');
      const d = await r.json();
      const avg = Number(d.average) || 0;
      const count = Number(d.count) || 0;
      const myStars = Math.round(Number(d.myStars) || 0);
      // Only travellers who own the guide may vote; everyone else just reads.
      const canVote = isGuideUnlocked(guide.id);
      starsEl.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        if (canVote) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'star-btn sm' + (i <= myStars ? ' on' : '');
          b.setAttribute('data-stars', String(i));
          b.setAttribute('aria-label', String(i));
          b.innerHTML = RATING_STAR_SVG;
          b.addEventListener('click', () => submitGuideRating(guide, i));
          starsEl.appendChild(b);
        } else {
          const s = document.createElement('span');
          s.className = 'star' + (i <= Math.round(avg) ? ' on' : '');
          s.innerHTML = RATING_STAR_SVG;
          starsEl.appendChild(s);
        }
      }
      starsEl.classList.toggle('votable', canVote);
      capEl.textContent = count
        ? (avg.toFixed(1) + ' / 5 · ' + count + (count === 1 ? ' ' + t('rating.review') : ' ' + t('rating.reviews')))
        : t('rating.noReviews');
    } catch (e) {
      capEl.textContent = t('rating.noReviews');
    }
  }

  async function submitGuideRating(guide, stars) {
    try {
      const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stars: stars })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not save your rating');
      showToast(t('rating.thanks'), 'success');
      await loadGuideRatings(guide);
    } catch (e) {
      showToast(e.message || 'Could not save your rating', true);
    }
  }

  // -------- Traveller comments --------
  function formatCommentDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  let commentsGuide = null;
  let commentsCtx = { isAdmin: false, myUserId: '' };

  // Flat oldest-first list -> nested tree. Anything whose parent is missing
  // (deleted, or not in the 500 most recent) is promoted to a top-level item
  // rather than dropped.
  function buildCommentTree(list) {
    const byId = {};
    list.forEach(c => { byId[c.id] = Object.assign({}, c, { children: [] }); });
    const roots = [];
    for (const c of list) {
      const node = byId[c.id];
      const pid = c.parentId || '';
      if (pid && byId[pid]) byId[pid].children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  function commentNodeHtml(c, depth) {
    const replies = c.children || [];
    const wrapId = 'comment-thread-' + c.id;
    const canDelete = commentsCtx.isAdmin
      || (!!commentsCtx.myUserId && c.userId === commentsCtx.myUserId);
    let h = '<div class="comment' + (depth ? ' comment-reply' : '') + '" data-comment-id="' + esc(c.id) + '">';
    h +=   '<div class="comment-head">';
    h +=     '<span class="comment-author">' + esc(c.userName || 'Traveller') + '</span>';
    h +=     '<span class="comment-date">' + esc(formatCommentDate(c.createdAt)) + '</span>';
    h +=   '</div>';
    h +=   '<div class="comment-body">' + esc(c.body) + '</div>';
    h +=   '<div class="comment-actions">';
    h +=     '<button type="button" class="comment-vote comment-up' + (c.myVote === 1 ? ' on' : '') + '" data-vote="1" data-cid="' + esc(c.id) + '" aria-label="' + esc(t('comments.upvote')) + '"><span class="arrow">▲</span><span class="count">' + (c.upvotes || 0) + '</span></button>';
    h +=     '<button type="button" class="comment-vote comment-down' + (c.myVote === -1 ? ' on' : '') + '" data-vote="-1" data-cid="' + esc(c.id) + '" aria-label="' + esc(t('comments.downvote')) + '"><span class="arrow">▼</span><span class="count">' + (c.downvotes || 0) + '</span></button>';
    h +=     '<button type="button" class="comment-action" data-reply="' + esc(c.id) + '">' + esc(t('comments.reply')) + '</button>';
    if (canDelete) {
      h +=   '<button type="button" class="comment-action comment-delete" data-del-comment="' + esc(c.id) + '">' + esc(t('comments.delete')) + '</button>';
    }
    h +=   '</div>';
    h +=   '<form class="comment-form comment-reply-form" id="reply-form-' + esc(c.id) + '" data-parent="' + esc(c.id) + '" style="display:none">' +
             '<textarea maxlength="1200" placeholder="' + esc(t('comments.placeholder')) + '"></textarea>' +
             '<div class="comment-form-row">' +
               '<button type="button" class="btn-ghost comment-cancel">' + esc(t('comments.cancel')) + '</button>' +
               '<button type="submit" class="btn-primary"><span class="btn-label">' + esc(t('comments.postReply')) + '</span></button>' +
             '</div>' +
           '</form>';
    if (replies.length) {
      h +=   '<button type="button" class="comment-thread-toggle" data-thread="' + wrapId + '">' +
               '<span class="twisty">▾</span><span class="label">' + replies.length + ' '
               + (replies.length === 1 ? t('comments.replyOne') : t('comments.replies')) + '</span>' +
             '</button>';
    }
    h +=   '<div class="comment-children" id="' + wrapId + '">';
    for (const r of replies) h += commentNodeHtml(r, depth + 1);
    h +=   '</div>';
    h += '</div>';
    return h;
  }

  // Delegated once on the comments container, so re-rendering the list does
  // not pile up listeners.
  function wireComments() {
    const box = els.modalComments;
    if (!box || box.__wttComments) return;
    box.__wttComments = true;

    box.addEventListener('submit', async (e) => {
      const form = e.target.closest && e.target.closest('.comment-form');
      if (!form || !box.contains(form)) return;
      e.preventDefault();
      const ta = form.querySelector('textarea');
      const body = ((ta && ta.value) || '').trim();
      if (!body) return;
      const guide = commentsGuide;
      if (!guide) return;
      const parentId = form.getAttribute('data-parent') || '';
      try {
        const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body: body, parentId: parentId })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Could not post your comment');
        showToast(t('comments.posted'), 'success');
        await renderGuideComments(guide);
      } catch (err) {
        showToast(err.message || 'Could not post your comment', true);
      }
    });

    box.addEventListener('click', async (e) => {
      const tgl = e.target.closest('[data-thread]');
      if (tgl) {
        const wrap = document.getElementById(tgl.getAttribute('data-thread'));
        if (!wrap) return;
        const collapsed = wrap.classList.toggle('collapsed');
        tgl.querySelector('.twisty').textContent = collapsed ? '▸' : '▾';
        return;
      }

      const cancel = e.target.closest('.comment-cancel');
      if (cancel) {
        const form = cancel.closest('.comment-reply-form');
        if (form) form.style.display = 'none';
        return;
      }

      const reply = e.target.closest('[data-reply]');
      if (reply) {
        const form = document.getElementById('reply-form-' + reply.getAttribute('data-reply'));
        if (form) {
          form.style.display = (form.style.display === 'none') ? '' : 'none';
          if (form.style.display !== 'none') {
            const ta = form.querySelector('textarea');
            if (ta) ta.focus();
          }
        }
        return;
      }

      const vote = e.target.closest('[data-vote]');
      if (vote) {
        const cid = vote.getAttribute('data-cid');
        const guide = commentsGuide;
        if (!guide || !cid) return;
        try {
          const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/comments/' + encodeURIComponent(cid) + '/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ value: Number(vote.getAttribute('data-vote')) })
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || 'Could not vote');
          // Update in place: a full re-render would collapse open threads.
          const node = box.querySelector('.comment[data-comment-id="' + cid + '"]');
          if (node) {
            const up = node.querySelector('.comment-up');
            const down = node.querySelector('.comment-down');
            if (up) { up.classList.toggle('on', d.myVote === 1); up.querySelector('.count').textContent = d.upvotes; }
            if (down) { down.classList.toggle('on', d.myVote === -1); down.querySelector('.count').textContent = d.downvotes; }
          }
        } catch (err) {
          showToast(err.message || 'Could not vote', true);
        }
        return;
      }

      const del = e.target.closest('[data-del-comment]');
      if (del) {
        const cid = del.getAttribute('data-del-comment');
        const guide = commentsGuide;
        if (!guide || !cid) return;
        if (!window.confirm(t('comments.deleteConfirm'))) return;
        try {
          const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/comments/' + encodeURIComponent(cid), {
            method: 'DELETE',
            credentials: 'include'
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || 'Could not delete');
          showToast(t('comments.deleted'), 'success');
          await renderGuideComments(guide);
        } catch (err) {
          showToast(err.message || 'Could not delete', true);
        }
      }
    });
  }

  async function renderGuideComments(guide) {
    const label = els.commentsLabel;
    const box = els.modalComments;
    if (!box) return;
    wireComments();
    if (label) label.style.display = 'block';
    box.style.display = 'block';
    box.innerHTML = '<p class="comments-empty">' + esc(t('comments.loading')) + '</p>';
    try {
      const r = await fetch('/api/guides/' + encodeURIComponent(guide.id) + '/comments?_ts=' + Date.now(), { credentials: 'include' });
      const d = r.ok ? await r.json() : { comments: [] };
      const list = d.comments || [];
      commentsGuide = guide;
      commentsCtx = { isAdmin: !!d.isAdmin, myUserId: d.myUserId || '' };
      const signedIn = !!localStorage.getItem(AUTH_KEY);
      const tree = buildCommentTree(list);
      let html = '<div class="comments-list">';
      if (!tree.length) html += '<p class="comments-empty">' + esc(t('comments.empty')) + '</p>';
      for (const node of tree) html += commentNodeHtml(node, 0);
      html += '</div>';
      if (signedIn) {
        html += '<form class="comment-form" id="comment-form" data-parent="">' +
          '<textarea id="comment-body" maxlength="1200" placeholder="' + esc(t('comments.placeholder')) + '"></textarea>' +
          '<button type="submit" class="btn-primary"><span class="btn-label">' + esc(t('comments.post')) + '</span></button>' +
        '</form>';
      } else {
        html += '<p class="comments-signin">' + esc(t('comments.signIn')) + '</p>';
      }
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<p class="comments-empty">' + esc(t('comments.empty')) + '</p>';
    }
  }

  // -------- Profile panel (local MVP — no backend yet) --------
  const PROFILE_KEY = 'wtt_profile';
  const AUTH_KEY = 'wtt_session';

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProfileData(data) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full / unavailable */ }
  }

  const DEFAULT_AVATAR = 'public/Branding/WTT profile.svg';

  // Push the current avatar to every place it is shown — the header profile
  // button (visible on all tabs) and the profile modal preview.
  function applyAvatar(url) {
    const src = url || DEFAULT_AVATAR;
    if (els.headerProfileIcon) {
      els.headerProfileIcon.onerror = function () { this.onerror = null; this.src = DEFAULT_AVATAR; };
      els.headerProfileIcon.src = src;
    }
    if (els.profileAvatarPreview) els.profileAvatarPreview.src = src;
  }

  // The avatar lives on the server once saved, so pull it on load — otherwise
  // the header would only show a photo uploaded in this same browser.
  async function syncAvatar() {
    let url = '';
    try {
      const r = await fetch('/api/me?_ts=' + Date.now(), { credentials: 'include' });
      if (r.ok) {
        const me = await r.json();
        url = (me && me.avatar) || '';
        if (url) {
          const p = loadProfile();
          if (p.avatar !== url) { p.avatar = url; saveProfileData(p); }
        }
      }
    } catch (e) { /* not signed in */ }
    if (!url) url = loadProfile().avatar || '';
    applyAvatar(url);
  }

  function renderProfile() {
    const p = loadProfile();
    els.profileEmail.value = p.email || '';
    els.profilePassword.value = '';
    els.profileUsername.value = p.username || '';
    els.profilePhone.value = p.phone || '';
    els.profileAddress.value = p.address || '';
    applyAvatar(p.avatar);
    const signedIn = !!p.email;
    els.profileSignin.style.display = signedIn ? 'none' : 'block';
    els.profileSignup.style.display = 'none';
    els.profileSignedin.style.display = signedIn ? 'block' : 'none';
    // Details live on the sign-up view; signed-in users keep them for editing.
    els.profileDetails.style.display = signedIn ? 'block' : 'none';
    if (signedIn) els.profileSignedinEmail.textContent = p.email;
  }

  // ---- email verification ----
  let verifyPopupEmail = '';

  function tVerify(key) {
    const en = {
      'verify.popupTitle': 'Check your email',
      'verify.popupBody': 'We just sent a verification link to {email}. Click it and you will be taken back to Worth The Trip.',
      'verify.popupResend': 'Resend verification email',
      'verify.popupResendError': "Couldn't resend the email — check your inbox, or try again in a moment.",
      'verify.sentTitle': 'Verification email sent',
      'verify.sentBody': 'We have sent a verification link to {email}.',
    };
    const ja = {
      'verify.popupTitle': 'メールを確認してください',
      'verify.popupBody': '確認用のメールを送信しました。メール内のリンクを開くと、アプリに戻ります。',
      'verify.popupResend': '確認メールを再送',
      'verify.popupResendError': 'メールを再送できませんでした — 受信箱を確認するか、しばらくしてから再試行してください。',
      'verify.sentTitle': '確認メールを送信しました',
      'verify.sentBody': '確認用リンクを {email} 宛に送信しました。',
    };
    const lang = document.documentElement.getAttribute('lang') === 'ja' ? 'ja' : 'en';
    const map = lang === 'ja' ? ja : en;
    return (map[key] || en[key] || key).replace(/{email}/g, verifyPopupEmail || '');
  }

  function showVerifyPopup(email) {
    verifyPopupEmail = email;
    $('#verify-popup-title').textContent = tVerify('verify.popupTitle');
    $('#verify-popup-body').textContent = tVerify('verify.popupBody');
    $('#verify-popup-resend').style.display = 'inline-flex';
    $('#verify-popup-resend').textContent = tVerify('verify.popupResend');
    $('#verify-popup-hint').textContent = '';
    $('#verify-popup').classList.add('active');
    $('#verify-popup').setAttribute('aria-hidden', 'false');
  }

  function hideVerifyPopup() {
    $('#verify-popup').classList.remove('active');
    $('#verify-popup').setAttribute('aria-hidden', 'true');
  }

  async function resendVerification() {
    const email = verifyPopupEmail;
    if (!email) return;
    $('#verify-popup-resend').disabled = true;
    $('#verify-popup-hint').textContent = 'Sending…';
    try {
      await api('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
      $('#verify-popup-hint').textContent = tVerify('verify.sentTitle') + ' ' + tVerify('verify.sentBody');
    } catch {
      $('#verify-popup-hint').textContent = tVerify('verify.popupResendError');
    } finally {
      $('#verify-popup-resend').disabled = false;
    }
  }

  if ($('#verify-popup-resend')) {
    $('#verify-popup-resend').addEventListener('click', resendVerification);
  }

  function showSignupView() {
    els.profileSignin.style.display = 'none';
    els.profileSignup.style.display = 'block';
    els.profileDetails.style.display = 'block';
  }

  function showSigninView() {
    els.profileSignup.style.display = 'none';
    els.profileSignin.style.display = 'block';
    els.profileDetails.style.display = 'none';
  }

  function openProfile() {
    renderProfile();
    els.profileModal.classList.add('active');
    els.profileModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeProfile() {
    els.profileModal.classList.remove('active');
    els.profileModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // -------- Unlock persistence --------
  // Unlocks belong to an EMAIL, not to a device. localStorage is only ever a
  // cache for the account currently signed in, and it is thrown away the moment
  // a different email signs in — otherwise one person's unlocks leak onto the
  // next account that uses the same browser.
  const UNLOCK_OWNER_KEY = 'wtt_unlocked_owner';

  function persistUnlocked() {
    try { localStorage.setItem('wtt_unlocked', JSON.stringify(Array.from(state.unlockedGuides))); } catch (e) {}
  }

  function unlockOwner() {
    try { return localStorage.getItem(UNLOCK_OWNER_KEY) || ''; } catch (e) { return ''; }
  }

  function setUnlockOwner(email) {
    try {
      if (email) localStorage.setItem(UNLOCK_OWNER_KEY, String(email).toLowerCase());
      else localStorage.removeItem(UNLOCK_OWNER_KEY);
    } catch (e) {}
  }

  function clearUnlocked() {
    state.unlockedGuides = new Set();
    try { localStorage.removeItem('wtt_unlocked'); } catch (e) {}
  }

  function loadFreeUnlocked() {
    try { return localStorage.getItem('wtt_free_unlocked') === '1'; } catch (e) { return false; }
  }

  function persistFreeUnlocked() {
    try { localStorage.setItem('wtt_free_unlocked', '1'); } catch (e) {}
  }

  function loadUnlocked() {
    try { return new Set(JSON.parse(localStorage.getItem('wtt_unlocked') || '[]')); } catch (e) { return new Set(); }
  }

  // Rebuild the unlock set from what the SERVER says this email owns.
  //
  // This replaces rather than merges: a guide is unlocked if and only if the
  // signed-in email paid for it (or claimed the free one, or holds the
  // unlock-all subscription). Anything left over from a previous account on
  // this device is discarded.
  async function syncAccountUnlocks() {
    let me = null;
    try {
      const r = await fetch('/api/me?_ts=' + Date.now(), { credentials: 'include' });
      if (r.ok) me = await r.json();
    } catch (e) { /* not signed in */ }

    if (!me || !me.email) {
      // Guest, or an account just signed out. A guest may keep local unlocks;
      // after a sign-out they must go, or the next person to use this browser
      // inherits them.
      if (unlockOwner()) {
        clearUnlocked();
        setUnlockOwner('');
        try { renderTripsPage(); } catch (e) { /* not rendered yet */ }
      }
      return;
    }

    const email = String(me.email).toLowerCase();
    const firstRunForThisAccount = unlockOwner() !== email;
    if (firstRunForThisAccount) {
      clearUnlocked();
      setUnlockOwner(email);
    }

    let list = [];
    try {
      const r = await fetch('/api/purchases/my?_ts=' + Date.now(), { credentials: 'include' });
      if (r.ok) {
        const body = await r.json();
        list = (body && body.purchases) || [];
      }
    } catch (e) { list = []; }

    const owned = new Set();
    let hasSubscription = false;
    list.forEach(function (p) {
      if (!p) return;
      if (p.type === 'subscription') { hasSubscription = true; return; }
      if (p.guideId && guideById(p.guideId)) owned.add(p.guideId);
    });
    // The unlock-all subscription opens every guide for that email.
    if (hasSubscription) WTT_GUIDES.forEach(function (g) { if (g && g.id) owned.add(g.id); });

    const changed = firstRunForThisAccount
      || owned.size !== state.unlockedGuides.size
      || Array.from(owned).some(function (id) { return !state.unlockedGuides.has(id); });

    if (changed) {
      state.unlockedGuides = owned;
      persistUnlocked();
      try { renderTripsPage(); } catch (e) { /* trips page not rendered yet */ }
      try { refreshMapMarkers(); } catch (e) { /* map not ready yet */ }
    }
  }

  // Resolves once the server's free-guide claim for this account is known, so
  // the welcome popup can be suppressed when the free guide is already used.
  let freeClaimReady = null;

  // The first free guide is claimed once per email and recorded on the server,
  // so the offer never reappears on another device or after clearing storage.
  // The server is the source of truth: if it says this email has NOT claimed,
  // any stale local flag is cleared so the offer becomes available again.
  async function syncFreeGuideClaim() {
    let claim = null;
    try {
      const r = await fetch('/api/free-guides/status?_ts=' + Date.now(), { credentials: 'include' });
      if (r.ok) claim = await r.json();
    } catch (e) { return; /* not signed in */ }

    if (!claim) return;   // could not determine — leave local state alone

    if (claim.claimed) {
      if (!state.freeUnlocked) {
        state.freeUnlocked = true;
        persistFreeUnlocked();
      }
      if (claim.guideId && guideById(claim.guideId) && !state.unlockedGuides.has(claim.guideId)) {
        state.unlockedGuides.add(claim.guideId);
        persistUnlocked();
      }
    } else if (state.freeUnlocked) {
      // Server says the free guide is still unused — re-offer it.
      state.freeUnlocked = false;
      try { localStorage.removeItem('wtt_free_unlocked'); } catch (e) {}
    }
    try { renderTripsPage(); } catch (e) { /* trips page not rendered yet */ }
  }

  function showWelcome() {
    const m = $('#welcome-modal');
    if (!m) return;
    applyStaticI18n();
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
  }

  function hideWelcome() {
    const m = $('#welcome-modal');
    if (!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem(WELCOMED_KEY, '1'); } catch (e) {}
  }

  function attemptUnlock(guideId, unlockAll) {
    console.log('[WTT] attemptUnlock:', guideId, 'unlockAll:', unlockAll, 'freeUnlocked:', state.freeUnlocked, 'alreadyHas:', state.unlockedGuides.has(guideId));
    const guide = guideById(guideId);
    if (!guide) {
      console.warn('[WTT] attemptUnlock abort: guide not found for', guideId);
      return;
    }

    if (unlockAll) {
      if (state.unlockedGuides.size === WTT_GUIDES.length) {
        showToast(t('toast.alreadyUnlocked'), 'success');
        return;
      }
      startUnlockAllCheckout();
      return;
    }

    if (!state.freeUnlocked) {
      console.log('[WTT] Free unlock for:', guideId);
      state.unlockedGuides.add(guideId);
      persistUnlocked();
      persistFreeUnlocked();
      state.freeUnlocked = true;
      showToast(t('toast.unlockedFreeGuide'), 'success');
      // Record the claim on the server so the offer never comes back —
      // the server allows only one free guide per email.
      fetch('/api/free-guides/claim', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideId })
      }).catch(() => { /* offline: localStorage still suppresses the offer */ });
      return true;
    }

    if (state.unlockedGuides.has(guideId)) {
      console.log('[WTT] Guide already unlocked:', guideId);
      showToast(t('toast.alreadyUnlocked'), 'success');
      return;
    }

    // A Checkout Session is single-use, so the link must be minted per click.
    startGuideCheckout(guideId);
  }

  // Mint a fresh Stripe Checkout Session for this guide, then hand off to it.
  async function startGuideCheckout(guideId) {
    showToast(t('toast.startingCheckout') || 'Opening checkout…', 'success');
    try {
      const r = await fetch('/api/checkout/guide', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.url) throw new Error(body.error || 'Could not start checkout');
      // Prefill the buyer's email when we know it.
      const link = new URL(body.url);
      try {
        const me = await fetch('/api/me?_ts=' + Date.now(), { credentials: 'include' });
        if (me.ok) {
          const u = await me.json();
          if (u && u.email) link.searchParams.set('prefilled_email', u.email);
        }
      } catch (e) { /* guest checkout */ }
      window.location.href = link.toString();
    } catch (e) {
      showToast(e.message || 'Could not start checkout', true);
    }
  }

  // Same single-use problem for the "unlock all" subscription.
  async function startUnlockAllCheckout() {
    showToast(t('toast.startingCheckout') || 'Opening checkout…', 'success');
    try {
      const r = await fetch('/api/checkout/unlock-all', { method: 'POST', credentials: 'include' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.url) throw new Error(body.error || 'Could not start checkout');
      window.location.href = body.url;
    } catch (e) {
      showToast(e.message || 'Could not start checkout', true);
    }
  }

  window.toast = showToast;

  // -------- Map diagnostic banner --------
  function showMapDiagnostic() {
    const oldBanner = document.getElementById('map-error-banner');
    if (oldBanner) oldBanner.remove();
    if (state.diagnosticShown) return;
    state.diagnosticShown = true;
    const isFileProtocol = window.location.protocol === 'file:';
    const msg = isFileProtocol
      ? 'Map tiles not loading — open this file through a local server (see README.md) for the full map.'
      : 'Map tiles not loading — check your internet connection.';
    const banner = document.createElement('div');
    banner.id = 'map-error-banner';
    banner.className = 'map-error-banner';
    banner.textContent = msg;
    document.getElementById('map-container').appendChild(banner);
    console.log('%c[WTT Map] ' + msg, 'color: #D32F2F; font-weight: bold;');
    console.log('%c→ Fix: run the local server (see README.md) and refresh with cache cleared', 'color: #8A8680;');
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    console.log('[WTT] build v6 — bookings full-card renderer active');
    // -------- Theme first (avoid flash) --------
    applyTheme(currentTheme(), false);
    applyStaticI18n();

    // -------- Brand logo --------
    const logoPath = 'public/Branding/WTT Logo 1.svg';
    els.brandLogo.src = logoPath;
    els.brandLogo.onerror = () => {
      els.brandLogo.src = 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <path d="M50 5 C25.1 5 5 25.1 5 50 C5 71.5 23 88.5 50 95 C77 88.5 95 71.5 95 50 C95 25.1 74.9 5 50 5 Z"
                fill="#D32F2F" stroke="white" stroke-width="2"/>
          <circle cx="50" cy="44" r="14" fill="white"/>
          <text x="50" y="54" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="22" fill="#D32F2F">W</text>
        </svg>`
      );
    };

    // -------- Map container dimensions --------
    const mapEl = els.map;
    if (mapEl.getBoundingClientRect().width === 0 || mapEl.getBoundingClientRect().height === 0) {
      mapEl.style.width = '100%';
      mapEl.style.height = '100%';
    }

    // -------- MapLibre GL JS Map --------
    state.map = new maplibregl.Map({
      container: 'map',
      style: currentTheme() === 'light' ? CONFIG.lightStyleUrl : CONFIG.vectorStyleUrl,
      center: CONFIG.defaultCenter,
      zoom: CONFIG.defaultZoom,
      attributionControl: false,
      fadeDuration: 150,
      scrollZoom: true,
    });

    // When the map style loads
    state.map.on('load', () => {
      console.log('[WTT] Map style loaded — setting up pin overlay');
      createMapOverlay();
      // Pin placement must never prevent the move listeners from being
      // attached — otherwise pins get drawn once and then freeze on screen.
      try { refreshMapMarkers(); } catch (e) { console.error('[WTT] refreshMapMarkers failed:', e); }
      state.map.on('move', onMapMove);
      state.map.on('moveend', onMapMove);
      // Pause the follow camera while the traveller pans or zooms by hand.
      ['dragstart', 'wheel', 'rotatestart', 'pitchstart'].forEach(ev => {
        state.map.on(ev, () => { state.drive.followPauseUntil = Date.now() + 8000; });
      });
      console.log('[WTT] Map move listeners attached for pin positioning');

      // -------- Compass (mobile true-north reset) --------
      const compassBtn = $('#compass-btn');
      const compassArrow = $('#compass-arrow');
      const updateCompass = () => {
        try {
          // Counter-rotate so the needle always points to true north on screen.
          const b = state.map.getBearing() || 0;
          compassArrow.style.transform = 'rotate(' + (-b) + 'deg)';
        } catch (e) {}
      };
      compassBtn.addEventListener('click', () => {
        try { state.map.resetNorth({ duration: 500 }); } catch (e) {}
      });
      state.map.on('rotate', updateCompass);
      state.map.on('moveend', updateCompass);
    });

    // Error handling
    state.map.on('error', (e) => {
      console.warn('[WTT Map] MapLibre error:', e.error?.message || e);
      if (e.error?.status === 401 || e.error?.status === 403 || e.error?.status === 404) {
        setTimeout(showMapDiagnostic, 2000);
      }
    });

    // Force resize after init
    setTimeout(() => {
      try {
        state.map.resize();
        console.log('[WTT Map] MapLibre initialized. Center: ' +
          state.map.getCenter().lat.toFixed(2) + '°N, ' + state.map.getCenter().lng.toFixed(2) + '°E' +
          ', zoom: ' + state.map.getZoom().toFixed(1));
      } catch (e) { console.warn('[WTT Map] resize failed:', e); }
    }, 150);

    // ============ PIN SCROLL ZOOM ============
    // MapLibre's scrollZoom listens on the canvas container. Pins live in
    // #pin-overlay, a sibling of the canvas container, so a wheel event that
    // starts on a pin never reaches it. When the pointer is over a pin we
    // forward an identical wheel event to the canvas container, so MapLibre
    // handles it exactly as if the pin weren't there — same zoom rate and
    // same zoom-towards-cursor behaviour. Everywhere else the event is left
    // untouched and MapLibre's native scrollZoom deals with it.
    state.map.scrollZoom.enable();

    const mapContainer = state.map.getContainer();
    const canvasContainer = (typeof state.map.getCanvasContainer === 'function')
      ? state.map.getCanvasContainer()
      : mapContainer.querySelector('.maplibregl-canvas-container');

    mapContainer.addEventListener('wheel', function (e) {
      // Is the pointer over a pin (the event target, or one of its ancestors)?
      let target = e.target;
      let overPin = false;
      while (target && target !== mapContainer) {
        if ((target.tagName === 'IMG' || target.tagName === 'svg') &&
            target.classList &&
            (target.classList.contains('wtt-pin') ||
             target.classList.contains('hotel-pin') ||
             target.classList.contains('step-pin') ||
             target.classList.contains('logo-pin'))) {
          overPin = true;
          break;
        }
        target = target.parentElement;
      }
      if (!overPin) return;

      e.preventDefault();
      e.stopPropagation();

      if (!canvasContainer) {
        // Fallback if the canvas container can't be found: zoom around the
        // cursor using MapLibre's public API.
        try {
          const rect = mapContainer.getBoundingClientRect();
          const around = state.map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
          const wheelDelta = (e.deltaMode === 1 ? 40 * e.deltaY : e.deltaY);
          state.map.jumpTo({ zoom: state.map.getZoom() + (wheelDelta > 0 ? -0.25 : 0.25), around });
        } catch (err) { /* ignore */ }
        return;
      }

      // Re-dispatch on the canvas container. No isTrusted guard in MapLibre,
      // and mousePos() reads clientX/clientY, which we copy across — so the
      // zoom lands under the cursor just like a native scroll.
      canvasContainer.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        view: window
      }));
    }, { passive: false, capture: true });

    // -------- Map click: close modal --------
    state.map.on('click', () => {
      if (els.modalOverlay.classList.contains('active')) {
        closeModal();
      }
    });

    // -------- Search (debounced: one refresh per pause in typing) --------
    let searchDebounce = null;
    els.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      $('#search-clear').hidden = e.target.value === '';
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(refreshMapMarkers, 250);
    });
    $('#search-clear').addEventListener('click', () => {
      els.searchInput.value = '';
      state.searchQuery = '';
      $('#search-clear').hidden = true;
      clearTimeout(searchDebounce);
      refreshMapMarkers();
      els.searchInput.focus();
    });

    // -------- Filter chips (tap active chip again to reset to All) --------
    els.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.classList.contains('active') && chip.dataset.filter !== 'all') {
          els.filterChips.forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
          state.activeFilter = 'all';
        } else {
          els.filterChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.activeFilter = chip.dataset.filter;
        }
        refreshMapMarkers();
      });
    });

    // -------- Filter button: toggle filter chips visibility --------
    els.filterBtn.addEventListener('click', () => {
      console.log('[WTT Filter] Click — current state.filter=' + state.activeFilter);
      const isOpen = els.searchBar.classList.toggle('filters-open');
      els.filterBtn.classList.toggle('collapsed', !isOpen);
      console.log('[WTT Filter] Toggle — filters-open=' + isOpen);
    });

    // -------- Modal close --------
    els.modalClose.addEventListener('click', closeModal);
    els.modalOverlay.addEventListener('click', (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.modalOverlay.classList.contains('active')) {
        closeModal();
      }
      if (e.key === 'Escape' && $('#booking-detail-modal').classList.contains('active')) {
        closeBookingDetail();
      }
      if (e.key === 'Escape' && $('#import-modal').classList.contains('active')) {
        closeImportModal();
      }
      if (e.key === 'Escape' && els.profileModal.classList.contains('active')) {
        closeProfile();
      }
      if (e.key === 'Escape' && $('#menu-page').classList.contains('active')) {
        closeMenuPage();
      }
      if (e.key === 'Escape' && $('#menu-overlay').classList.contains('open')) {
        closeMenu();
      }
      if (e.key === 'Escape' && $('#bookings-page').classList.contains('open')) {
        closeBookingsPage();
      }
      if (e.key === 'Escape' && $('#trips-page').classList.contains('open')) {
        closeTripsPage();
      }
    });

    // -------- Unlock button --------
    // Per-guide binding is wired inside openGuideModal() where `guideId` is in scope.
    // -------- Modal save heart --------
    els.modalSaveBtn.addEventListener('click', () => {
      if (state.activeGuideId) toggleSave(state.activeGuideId);
    });

    // -------- Live navigation controls --------
    els.modalStartBtn.addEventListener('click', () => {
      if (state.activeGuideId) startGuideNav(state.activeGuideId);
    });
    els.navEnd.addEventListener('click', () => stopGuideNav());
    // Immersive drive mode — "Navigate" drops into a Google-Maps-style follow view.
    els.navGmaps.addEventListener('click', (e) => {
      e.preventDefault();
      startDriveMode();
    });
    $('#drive-exit').addEventListener('click', stopDriveMode);
    $('#drive-split').addEventListener('click', stopDriveMode);
    $('#drive-end').addEventListener('click', () => stopGuideNav());
    $('#drive-gmaps').addEventListener('click', (e) => {
      const href = els.navGmaps && els.navGmaps.href;
      if (href && href.indexOf('#') !== 0) { e.preventDefault(); window.open(href, '_blank', 'noopener'); }
    });
    els.navMode.addEventListener('click', () => {
      state.nav.mode = state.nav.mode === 'transit' ? 'walking' : 'transit';
      updateNavBanner();
      showToast(state.nav.mode === 'transit' ? t('toast.transit') : t('toast.walking'), 'success');
    });

    // -------- Popular carousel "See all" + close --------
    $('#see-all').addEventListener('click', (e) => {
      e.preventDefault();
      $('#popular-sheet').classList.add('hidden');
      closeAllPages();
      $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'trips'));
      openTripsPage();
    });

    $('#popular-close').addEventListener('click', () => {
      $('#popular-sheet').classList.add('hidden');
    });

    // -------- Bottom nav --------
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        // Tapping the active tab again closes its page and returns to the map.
        if (item.classList.contains('active') && tab !== 'explore') {
          closeAllPages();
          setExploreActive();
          return;
        }
        if (tab === 'explore') {
          closeAllPages();
          setExploreActive();
          return;
        }
        // Mark active AFTER the closes: closeTripsPage() resets focus to Explore.
        closeAllPages();
        $$('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        if (tab === 'creators') {
          openCreatorsPage();
          return;
        }
        if (tab === 'saved') {
          openMenuPage('saved');
          return;
        }
        if (tab === 'trips') {
          openTripsPage();
          return;
        }
        if (tab === 'bookings') {
          openBookingsPage();
          return;
        }
        toast(t('nav.' + tab) + ' ' + t('toast.tabSoon'));
      });
    });

    // -------- Header buttons --------
    $('#menu-btn').addEventListener('click', openMenu);
    $('#profile-btn').addEventListener('click', () => { location.href = '/account'; });
    $('#theme-btn').addEventListener('click', toggleTheme);

    // -------- Profile panel events --------
    els.profileClose.addEventListener('click', closeProfile);
    els.profileModal.addEventListener('click', (e) => {
      if (e.target === els.profileModal) closeProfile();
    });

    els.profileSigninBtn.addEventListener('click', async () => {
      const email = els.profileEmail.value.trim();
      const password = els.profilePassword.value;
      if (!email || !password) {
        showToast(t('toast.needEmailPw'), 'success');
        return;
      }
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Wrong email or password');
        localStorage.setItem(AUTH_KEY, body.token);
        showToast(t('toast.signedIn') + ' ' + email, 'success');
        closeProfile();
        location.href = '/account';
      } catch (err) {
        showToast(err.message, 'success');
      }
    });

    els.profileShowSignup.addEventListener('click', (e) => {
      e.preventDefault();
      showSignupView();
    });

    els.profileShowSignin.addEventListener('click', (e) => {
      e.preventDefault();
      showSigninView();
    });

    els.profileSignupBtn.addEventListener('click', async () => {
      const username = els.profileSignupUsername.value.trim();
      const email = els.profileSignupEmail.value.trim();
      const password = els.profileSignupPassword.value;
      if (!username || !email || !password) {
        showToast(t('toast.needSignup'), 'error');
        return;
      }
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: username }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Signup failed');
        if (body.requiresVerification) {
          showVerifyPopup(email);
          return;
        }
        const lr = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const lrBody = await lr.json();
        if (!lr.ok) throw new Error(lrBody.error || 'Login failed');
        localStorage.setItem(AUTH_KEY, lrBody.token);
        showToast(t('toast.welcomeUser') + ' ' + username, 'success');
        closeProfile();
        location.href = '/account';
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    els.profileSignoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(PROFILE_KEY);
      renderProfile();
      showToast(t('toast.signedOut'), 'success');
    });

    els.profileAvatarInput.addEventListener('change', () => {
      const file = els.profileAvatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        els.profileAvatarPreview.src = reader.result;
        const p = loadProfile();
        p.avatar = reader.result;
        saveProfileData(p);
      };
      reader.readAsDataURL(file);
    });

    els.profileSaveBtn.addEventListener('click', async () => {
      const body = {
        name: els.profileUsername.value.trim(),
        phone: els.profilePhone.value.trim(),
        address: els.profileAddress.value.trim(),
      };
      const preview = els.profileAvatarPreview;
      if (preview.src && !preview.src.endsWith('WTT profile.svg')) {
        const dataUrl = preview.src;
        if (dataUrl.startsWith('data:')) body.avatarDataUrl = dataUrl;
      }
      if (Object.keys(body).length) {
        try {
          const up = await fetch('/api/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const res = await up.json();
          if (!up.ok) throw new Error(res.error || 'Could not save');
          localStorage.removeItem(PROFILE_KEY);
          // The server stores the photo; show it in the header straight away.
          applyAvatar(res.avatar);
          showToast(t('toast.profileSaved'), 'success');
        } catch (err) {
          showToast(err.message, 'success');
        }
      }
    });

    // -------- Menu drawer + page events --------
    $('#menu-close').addEventListener('click', closeMenu);
    $('#menu-overlay').addEventListener('click', (e) => {
      if (e.target === $('#menu-overlay')) closeMenu();
    });
    $$('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.page === 'creator-studio') {
          fetch('/api/creator/me').then(r => r.ok ? r.json() : null).then(me => {
            if (me && me.isCreator) { location.href = '/creator'; }
            else { openMenuPage('creator'); }
          }).catch(() => { openMenuPage('creator'); });
          return;
        }
        openMenuPage(item.dataset.page);
      });
    });
    $('#menu-travel-dates').addEventListener('click', () => {
      closeMenu();
      showDatesModal();
    });
    refreshCreatorMenu();
    $('#menu-page-close').addEventListener('click', closeMenuPage);
    $('#menu-page').addEventListener('click', (e) => {
      if (e.target === $('#menu-page')) closeMenuPage();
    });
    $('#trips-clear-filters').addEventListener('click', () => {
      resetTripFilters();
      state.tripSearch = '';
      const ts = $('#trips-search');
      if (ts) ts.value = '';
      $('#trips-search-clear').hidden = true;
      renderTripsFilters();
      renderTripsMain();
    });
    $('#trips-close').addEventListener('click', closeTripsPage);
    $('#bookings-close').addEventListener('click', closeBookingsPage);
    $('#bookings-import').addEventListener('click', openImportModal);
    $('#import-close').addEventListener('click', closeImportModal);
    $('#import-parse').addEventListener('click', parsePastedText);
    $('#import-ics-btn').addEventListener('click', () => $('#import-ics').click());
    $('#import-ics').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const d = parseIcs(String(reader.result || ''));
        if (!d.title && !d.dateStart) { showToast(t('import.icsEmpty'), true); return; }
        renderBookingPreview(d, 'ics');
      };
      reader.onerror = () => showToast(t('import.icsEmpty'), true);
      reader.readAsText(file);
    });
    $('#import-photo-btn').addEventListener('click', () => $('#import-photo').click());
    $('#import-photo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      handleImportPhoto(file);
    });
    $('#creators-close').addEventListener('click', closeCreatorsPage);
    // Mobile: filters start collapsed, toggle expands to 25vh
    const tripsSidebar = document.querySelector('.trips-sidebar');
    const filtersToggle = $('#trips-filters-toggle');
    if (window.innerWidth <= 700) tripsSidebar.classList.add('filters-collapsed');
    filtersToggle.addEventListener('click', () => {
      tripsSidebar.classList.toggle('filters-collapsed');
    });
    let tripsSearchTimer = null;
    $('#trips-search').addEventListener('input', (e) => {
      clearTimeout(tripsSearchTimer);
      $('#trips-search-clear').hidden = e.target.value === '';
      tripsSearchTimer = setTimeout(() => {
        state.tripSearch = e.target.value;
        renderTripsMain();
      }, 250);
    });
    $('#trips-search-clear').addEventListener('click', () => {
      const ts = $('#trips-search');
      ts.value = '';
      state.tripSearch = '';
      $('#trips-search-clear').hidden = true;
      clearTimeout(tripsSearchTimer);
      renderTripsMain();
      ts.focus();
    });
    let creatorsSearchTimer = null;
    $('#creators-search').addEventListener('input', (e) => {
      clearTimeout(creatorsSearchTimer);
      creatorsSearchTimer = setTimeout(() => {
        state.creatorSearch = e.target.value;
        renderCreatorsPage();
      }, 250);
    });

    // -------- Handle post-payment return --------
    handlePaymentReturn();

    // -------- Always-on location dot --------
    startPassiveTracking();

    // -------- Initial toast + one-time welcome --------
    setTimeout(async () => {
      showToast(t('toast.welcome'), 'success');
      let welcomed = false;
      try { welcomed = localStorage.getItem(WELCOMED_KEY) === '1'; } catch (e) {}
      if (freeClaimReady) {
        try {
          await Promise.race([freeClaimReady, new Promise((r) => setTimeout(r, 1500))]);
        } catch (e) {}
      }
      // Show dates picker first, then welcome modal after it's dismissed.
      const savedDates = loadTravelDates();
      if (!savedDates.start || !savedDates.end) {
        showDatesModal();
      } else {
        applyTravelDates(savedDates.start, savedDates.end);
        if (!welcomed && !state.freeUnlocked) showWelcome();
      }
    }, 600);

    $('#welcome-cta').addEventListener('click', () => {
      hideWelcome();
      closeAllPages();
      $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'trips'));
      openTripsPage();
    });
    $('#welcome-later').addEventListener('click', hideWelcome);

    // -------- Dates picker --------
    $('#dates-save').addEventListener('click', () => {
      const start = els.dateStart.value;
      const end = els.dateEnd.value;
      if (start && end && end >= start) {
        applyTravelDates(start, end);
        hideDatesModal();
        showToast(t('dates.saved'), 'success');
        refreshMapMarkers();
      } else if (start && end) {
        showToast('End date must be after start date', 'success');
      }
    });
    $('#dates-skip').addEventListener('click', () => {
      hideDatesModal();
      // After skipping, show welcome if still applicable.
      let welcomed = false;
      try { welcomed = localStorage.getItem(WELCOMED_KEY) === '1'; } catch (e) {}
      if (!welcomed && !state.freeUnlocked) showWelcome();
    });
    $('#dates-close').addEventListener('click', () => {
      hideDatesModal();
      let welcomed = false;
      try { welcomed = localStorage.getItem(WELCOMED_KEY) === '1'; } catch (e) {}
      if (!welcomed && !state.freeUnlocked) showWelcome();
    });
  }

  // -------- Menu drawer + pages --------
  // Approved creators get a "Creator Studio" entry instead of "Become a Creator".
  function refreshCreatorMenu() {
    var apply = function (me) {
      var isCreator = !!(me && me.isCreator);
      var studio = $('#menu-creator-studio');
      var applyBtn = $('#menu-creator-apply');
      if (studio) studio.style.display = isCreator ? '' : 'none';
      if (applyBtn) applyBtn.style.display = isCreator ? 'none' : '';
    };
    // _ts busts the proxy cache: it keys on the URL alone, so a plain
    // /api/creator/me would keep serving a stale body.
    fetch('/api/creator/me?_ts=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(apply)
      .catch(function () { apply(null); });
  }

  function openMenu() {
    refreshCreatorMenu();
    $('#menu-overlay').classList.add('open');
    $('#menu-overlay').setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    $('#menu-overlay').classList.remove('open');
    $('#menu-overlay').setAttribute('aria-hidden', 'true');
  }

  function guideRowHtml(g) {
    const unlocked = isGuideUnlocked(g.id);
    return `
      <button class="page-guide-row" data-guide-id="${g.id}">
        <img src="${g.heroImage}" alt="${gText(g, 'title')}" loading="lazy" onerror="this.style.display='none'">
        <div>
          <div class="page-guide-title">${gText(g, 'title')}</div>
          <div class="page-guide-meta">${gText(g, 'duration')} · ${formatPrice(g.price)}</div>
        </div>
        <span class="page-guide-status${unlocked ? ' unlocked' : ''}">${unlocked ? t('trips.unlocked') : t('trips.locked')}</span>
      </button>`;
  }

  function tripTileHtml(g) {
    const unlocked = isGuideUnlocked(g.id);
    const showFree = !unlocked && !state.freeUnlocked;
    return `
      <div class="trips-tile" data-guide-id="${g.id}" tabindex="0" role="button" aria-label="Open ${gText(g, 'title')}">
        <div class="trips-tile-imgwrap">
          <img src="${g.heroImage}" alt="${gText(g, 'title')}" loading="lazy" onerror="this.style.display='none'">
          <span class="trips-tile-badge${unlocked ? ' unlocked' : (showFree ? ' free' : '')}">${unlocked ? t('trips.unlocked') : (showFree ? t('modal.unlockFree') : formatPrice(g.price))}</span>
          ${showFree ? `<button class="btn-red tile-free-btn" data-guide-id="${g.id}" aria-label="${t('modal.unlockFree')}"><span class="btn-label">${t('modal.unlockFree')}</span></button>` : ''}
        </div>
        <div class="trips-tile-body">
          <div class="trips-tile-title">${gText(g, 'title')}</div>
          <div class="trips-tile-meta">${gText(g, 'duration')} · ${cityLabel(g.city || cityOf(g))}</div>
        </div>
      </div>`;
  }

  function tripsRowHtml(guides) {
    return `<div class="trips-row">` + guides.map(tripTileHtml).join('') + `</div>`;
  }

  function menuPageContent(key) {
    if (key === 'my-guides') {
      if (state.unlockedGuides.size === 0) {
        return {
          title: t('menu.myTrips'),
          html: `<p class="page-text">${t('myTrips.empty')}</p>`
        };
      }
      const rows = WTT_GUIDES.filter(g => state.unlockedGuides.has(g.id)).map(guideRowHtml).join('');
      return { title: t('menu.myTrips'), html: `<p class="page-text">${t('myTrips.intro')}</p>` + rows };
    }
    if (key === 'saved') {
      if (state.savedGuides.size === 0) {
        return {
          title: t('menu.saved'),
          html: `<div class="page-empty">${t('saved.empty')}</div>`
        };
      }
      const rows = WTT_GUIDES.filter(g => state.savedGuides.has(g.id)).map(guideRowHtml).join('');
      return { title: t('menu.saved'), html: `<p class="page-text">${t('saved.intro')}</p>` + rows };
    }
    if (key === 'translator') {
      return {
        title: t('translator.title'),
        html: `
          <div class="trans-lang-row">
            <select id="trans-from" class="field-input">
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            <button class="creator-btn" id="trans-swap"><span>${t('translator.swap')}</span></button>
            <select id="trans-to" class="field-input">
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
          <textarea id="trans-input" class="field-input trans-text" rows="3" placeholder="${t('translator.inputPh')}"></textarea>
          <div class="trans-btn-row">
            <button class="creator-btn" id="trans-listen">${t('translator.listen')}</button>
            <button class="creator-btn primary" id="trans-go">${t('translator.translate')}</button>
          </div>
          <div id="trans-status" class="trans-status" style="display:none"></div>
          <div id="trans-output-wrap" style="display:none">
            <div id="trans-output" class="trans-output"></div>
            <div class="trans-btn-row">
              <button class="creator-btn" id="trans-speak">${t('translator.speakOut')}</button>
              <button class="creator-btn" id="trans-copy">${t('translator.copy')}</button>
            </div>
          </div>`
      };
    }
    if (key === 'creator') {
      return {
        title: t('creator.title'),
        html: `
          <p class="page-text">${t('creator.leadIn')} <strong>Worth The Trip</strong> ${t('creator.p1')}</p>
          <p class="page-text">${t('creator.p2')}</p>
          <label class="field-label" for="creator-name">${t('creator.name')}</label>
          <input type="text" id="creator-name" class="field-input" placeholder="${t('creator.name')}">
          <label class="field-label" for="creator-email">${t('creator.email')}</label>
          <input type="email" id="creator-email" class="field-input" placeholder="you@example.com">
          <label class="field-label" for="creator-area">${t('creator.area')}</label>
          <input type="text" id="creator-area" class="field-input" placeholder="e.g. Osaka food scene, Hokkaido hiking">
          <label class="field-label" for="creator-youtube">${t('creator.youtube')}</label>
          <input type="url" id="creator-youtube" class="field-input" placeholder="https://youtube.com/@yourchannel" autocomplete="url">
          <label class="field-label" for="creator-instagram">${t('creator.instagram')}</label>
          <input type="text" id="creator-instagram" class="field-input" placeholder="@yourhandle" autocomplete="username">
          <label class="field-label" for="creator-password">${t('creator.password')}</label>
          <input type="password" id="creator-password" class="field-input" placeholder="6+ characters" autocomplete="new-password" minlength="6">
          <button class="btn-primary" id="creator-join-btn"><span class="btn-label">${t('creator.join')}</span></button>`
      };
    }
    if (key === 'help') {
      return {
        title: t('help.title'),
        html: `
          <div class="page-faq">
            <div class="page-faq-q">${t('help.q1')}</div>
            <div class="page-faq-a">${t('help.a1')}</div>
            <div class="page-faq-q">${t('help.q2')}</div>
            <div class="page-faq-a">${t('help.a2')}</div>
            <div class="page-faq-q">${t('help.q3')}</div>
            <div class="page-faq-a">${t('help.a3')}</div>
          </div>
          <div class="section-label">${t('help.messageUs')}</div>
          <label class="field-label" for="help-email">${t('creator.email')}</label>
          <input type="email" id="help-email" class="field-input" placeholder="you@example.com">
          <label class="field-label" for="help-message">${t('help.message')}</label>
          <input type="text" id="help-message" class="field-input" placeholder="${t('help.message')}">
          <button class="btn-primary" id="help-send-btn"><span class="btn-label">${t('help.send')}</span></button>`
      };
    }
    if (key === 'terms') {
      return {
        title: t('terms.title'),
        html: `<p class="page-text muted">${t('legal.updated')}</p>
          <p class="page-text">${t('terms.p1')}</p>
          <p class="page-text">${t('terms.p2')}</p>
          <p class="page-text">${t('terms.p3')}</p>
          <p class="page-text">${t('terms.p4')}</p>
          <p class="page-text">${t('terms.p5')}</p>
          <p class="page-text">${t('legal.contact')}</p>`
      };
    }
    if (key === 'privacy') {
      return {
        title: t('privacy.title'),
        html: `<p class="page-text muted">${t('legal.updated')}</p>
          <p class="page-text">${t('privacy.p1')}</p>
          <p class="page-text">${t('privacy.p2')}</p>
          <p class="page-text">${t('privacy.p3')}</p>
          <p class="page-text">${t('privacy.p4')}</p>
          <p class="page-text">${t('privacy.p5')}</p>
          <p class="page-text">${t('legal.contact')}</p>`
      };
    }
    if (key === 'refunds') {
      return {
        title: t('refunds.title'),
        html: `<p class="page-text muted">${t('legal.updated')}</p>
          <p class="page-text">${t('refunds.p1')}</p>
          <p class="page-text">${t('refunds.p2')}</p>
          <p class="page-text">${t('refunds.p3')}</p>
          <p class="page-text">${t('legal.contact')}</p>`
      };
    }
    if (key === 'settings') {
      const s = loadSettings();
      return {
        title: t('settings.title'),
        html: `
          <label class="field-label" for="settings-lang">${t('settings.lang')}</label>
          <select id="settings-lang" class="field-input">
            <option value="en"${s.lang === 'en' ? ' selected' : ''}>English</option>
            <option value="ja"${s.lang === 'ja' ? ' selected' : ''}>日本語</option>
          </select>
          <label class="field-label" for="settings-currency">${t('settings.currency')}</label>
          <select id="settings-currency" class="field-input">
            <option value="JPY"${s.currency === 'JPY' ? ' selected' : ''}>JPY (¥)</option>
            <option value="USD"${s.currency === 'USD' ? ' selected' : ''}>USD ($)</option>
          </select>
          <label class="field-label" for="settings-theme">${t('settings.theme')}</label>
          <select id="settings-theme" class="field-input">
            <option value="dark"${s.theme !== 'light' ? ' selected' : ''}>${t('settings.dark')}</option>
            <option value="light"${s.theme === 'light' ? ' selected' : ''}>${t('settings.light')}</option>
          </select>
          <button class="btn-primary" id="settings-save-btn"><span class="btn-label">${t('settings.save')}</span></button>`
      };
    }
    return {
      title: t('about.title'),
      html: `
        <p class="page-text"><strong>Worth The Trip</strong>${t('about.p1')}</p>
        <p class="page-text">${t('about.p2')}</p>
        <p class="page-text">${t('about.p3')}</p>`
    };
  }

  // -------- Translator (EN <-> JA, free endpoint + Web Speech) --------
  let transRecog = null;

  function transSetStatus(msg) {
    const el = $('#trans-status');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.style.display = 'block';
    el.textContent = msg;
  }

  function doTranslate() {
    const input = $('#trans-input');
    if (!input || !input.value.trim()) {
      showToast(t('translator.typeFirst'), 'success');
      return;
    }
    const sl = $('#trans-from').value;
    const tl = $('#trans-to').value;
    transSetStatus('…');
    fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(input.value.trim()) + '&langpair=' + sl + '|' + tl)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const text = data && data.responseData && data.responseData.translatedText;
        if (!text || /MYMEMORY WARNING|INVALID/i.test(text)) throw new Error('empty');
        $('#trans-output').textContent = text;
        $('#trans-output-wrap').style.display = 'block';
        transSetStatus('');
      })
      .catch(() => transSetStatus(t('translator.failed')));
  }

  function transSpeak() {
    const text = $('#trans-output').textContent;
    if (!text || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = $('#trans-to').value === 'ja' ? 'ja-JP' : 'en-US';
    speechSynthesis.speak(u);
  }

  function transListen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $('#trans-listen');
    if (!SR) {
      showToast(t('translator.micUnsupported'), 'success');
      return;
    }
    if (transRecog) {
      try { transRecog.stop(); } catch (e) {}
      transRecog = null;
      btn.innerHTML = t('translator.listen');
      transSetStatus('');
      return;
    }
    const rec = new SR();
    rec.lang = $('#trans-from').value === 'ja' ? 'ja-JP' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      $('#trans-input').value = ($('#trans-input').value ? $('#trans-input').value + ' ' : '') + said;
    };
    rec.onend = () => {
      transRecog = null;
      btn.innerHTML = t('translator.listen');
      transSetStatus('');
    };
    rec.onerror = () => {
      transRecog = null;
      btn.innerHTML = t('translator.listen');
      transSetStatus(t('translator.failed'));
    };
    try {
      rec.start();
      transRecog = rec;
      btn.innerHTML = t('translator.listening');
      transSetStatus(t('translator.listening'));
    } catch (e) {
      transRecog = null;
    }
  }

  function bindTranslator() {
    if (!$('#trans-go')) return;
    $('#trans-go').addEventListener('click', doTranslate);
    $('#trans-listen').addEventListener('click', transListen);
    $('#trans-swap').addEventListener('click', () => {
      const f = $('#trans-from');
      const to = $('#trans-to');
      const tmp = f.value;
      f.value = to.value;
      to.value = tmp;
    });
    $('#trans-speak').addEventListener('click', transSpeak);
    $('#trans-copy').addEventListener('click', () => {
      const text = $('#trans-output').textContent;
      if (!text) return;
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      showToast(t('translator.copied'), 'success');
    });
  }

  function openMenuPage(key) {
    if (key === 'explore') {
      closeMenu();
      return;
    }
    const page = menuPageContent(key);
    closeMenu();
    $('#menu-page-title').textContent = page.title;
    $('#menu-page-body').innerHTML = page.html;
    if (key === 'creator') {
      try {
        const saved = JSON.parse(sessionStorage.getItem('pendingCreatorApply') || 'null');
        if (saved) {
          if (saved.name) $('#creator-name').value = saved.name;
          if (saved.email) $('#creator-email').value = saved.email;
          if (saved.area) $('#creator-area').value = saved.area;
          if (saved.youtube) $('#creator-youtube').value = saved.youtube;
          if (saved.instagram) $('#creator-instagram').value = saved.instagram;
        }
      } catch (e) {}
    }
    $('#menu-page').classList.add('active');
    $('#menu-page').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    $('#menu-page-body').querySelectorAll('.page-guide-row').forEach(row => {
      row.addEventListener('click', () => {
        closeMenuPage();
        openGuideModal(row.dataset.guideId);
      });
    });

    const creatorBtn = $('#creator-join-btn');
    if (creatorBtn) creatorBtn.addEventListener('click', async () => {
      const name = $('#creator-name').value.trim();
      const email = $('#creator-email').value.trim();
      const password = $('#creator-password').value.trim();
      const area = $('#creator-area').value.trim();
      const youtube = $('#creator-youtube').value.trim();
      const instagram = $('#creator-instagram').value.trim();
      if (!name || !email) {
        showToast(t('toast.needNameEmail'), 'success');
        return;
      }
      // 1) make sure we have a logged-in session
      let isLoggedIn = false;
      try {
        const me = await api('/api/me');
        if (me && me.email) isLoggedIn = true;
      } catch (e) {
        isLoggedIn = false;
      }
      // 2) create account if needed
      if (!isLoggedIn) {
        if (!password || password.length < 6) {
          showToast(t('toast.needEmailPw'), 'success');
          return;
        }
        try {
          const signup = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
          if (signup && signup.requiresVerification) {
            console.log('[WTT creator] saving pending application for', email);
            try {
              await api('/api/creator/save-pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, area, youtube, instagram }) });
              console.log('[WTT creator] pending application saved');
            } catch (e) {
              console.error('[WTT creator] save-pending failed:', e);
            }
            $('#menu-page-body').innerHTML = `
              <div style="text-align:center; padding: 24px 0;">
                <h3 style="margin: 0 0 8px;">${t('creator.verifyTitle')}</h3>
                <p style="margin: 0 0 16px;">${t('creator.verifyBody').replace('{email}', escHtml(email))}</p>
                <p style="margin: 0 0 16px; color: var(--muted-foreground); font-size: 13px;">Click the link in the email — your creator application will be submitted automatically when you return.</p>
                <button class="btn-primary" id="creator-resend-btn"><span class="btn-label">${t('creator.resend')}</span></button>
                <p id="creator-resend-hint" style="margin-top:10px; min-height:18px;"></p>
              </div>`;
            const resendBtn = $('#creator-resend-btn');
            if (resendBtn) {
              resendBtn.addEventListener('click', async () => {
                resendBtn.disabled = true;
                $('#creator-resend-hint').textContent = 'Sending…';
                try {
                  await api('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
                  $('#creator-resend-hint').textContent = t('verify.sentTitle') + ' ' + t('verify.sentBody').replace('{email}', escHtml(email));
                } catch (e) {
                  $('#creator-resend-hint').textContent = t('verify.popupResendError');
                } finally {
                  resendBtn.disabled = false;
                }
              });
            }
            return;
          }
          isLoggedIn = true;
        } catch (e) {
          if (e.status === 409) {
            isLoggedIn = true;
          } else {
            showToast(e.message || t('toast.cantCreate'), 'success');
            return;
          }
        }
      }
      // 3) submit the creator application
      const payload = { name, email, area, youtube, instagram };
      try {
        await api('/api/creator/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (e) {
        showToast(e.message || t('errGeneric'), 'success');
        return;
      }
      try { sessionStorage.removeItem('pendingCreatorApply'); } catch (e) {}
      $('#menu-page-body').innerHTML = `
        <div style="text-align:center; padding: 24px 0;">
          <h3 style="margin: 0 0 8px;">${t('creator.submittedTitle')}</h3>
          <p style="margin: 0 0 16px;">${t('creator.submittedBody')}</p>
        </div>`;
      setTimeout(() => {
        closeMenuPage();
        showToast(t('toast.applicationSubmitted'), 'success');
      }, 1800);
    });

    const helpBtn = $('#help-send-btn');
    if (helpBtn) helpBtn.addEventListener('click', () => {
      if (!$('#help-email').value.trim() || !$('#help-message').value.trim()) {
        showToast(t('toast.needEmailMsg'), 'success');
        return;
      }
      closeMenuPage();
      showToast(t('toast.msgSent'), 'success');
    });

    bindTranslator();

    const settingsBtn = $('#settings-save-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      saveSettings({ lang: $('#settings-lang').value, currency: $('#settings-currency').value, theme: $('#settings-theme').value });
      applyTheme($('#settings-theme').value, false);
      applyStaticI18n();
      refreshMapMarkers();
      if (state.activeGuideId) openGuideModal(state.activeGuideId);
      if ($('#creators-page').classList.contains('open')) renderCreatorsPage();
      closeMenuPage();
      showToast(t('toast.settingsSaved'), 'success');
    });
  }

  function closeMenuPage() {
    $('#menu-page').classList.remove('active');
    $('#menu-page').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // -------- Trips browse page --------
  const CATEGORY_LABELS = {
    culture: 'Culture & History',
    food: 'Food & Drink',
    nature: 'Nature & Scenery',
    hiking: 'Hiking & Outdoors',
    luxury: 'Luxury & Splurge',
    temples: 'Temples & Shrines',
    nightlife: 'Nightlife & Bars',
    shopping: 'Shopping',
    onsen: 'Onsen & Hot Springs',
    family: 'Family & Kids',
    romance: 'Romance & Honeymoon',
    photography: 'Photography & Views',
    art: 'Art & Museums',
    festivals: 'Festivals & Events',
    wellness: 'Wellness & Relaxation',
    adventure: 'Adventure & Sports',
    budget: 'Budget & Backpacker',
    daytrips: 'Day Trips',
    seasonal: 'Seasonal & Cherry Blossom',
    local: 'Local Life & Hidden Gems',
  };
  const CATEGORY_ORDER = [
    'culture', 'food', 'nature', 'hiking', 'luxury',
    'temples', 'nightlife', 'shopping', 'onsen', 'family',
    'romance', 'photography', 'art', 'festivals', 'wellness',
    'adventure', 'budget', 'daytrips', 'seasonal', 'local',
  ];

  function cityOf(g) {
    // A guide without a location must not break the page — fall back to its
    // city, then to a neutral label.
    const loc = (g && g.location) || '';
    return (loc.split('·')[1] || loc || (g && g.city) || '').trim();
  }

  function renderTripsPageSidebar() {
    const mine = $('#trips-mine');
    const section = $('#trips-mine-section');
    if (!mine || !section) return;
    const unlocked = WTT_GUIDES.filter(g => state.unlockedGuides.has(g.id));
    section.style.display = unlocked.length > 0 ? 'block' : 'none';
    mine.innerHTML = tripsRowHtml(unlocked);
    mine.querySelectorAll('.trips-tile').forEach(row => {
      row.addEventListener('click', () => {
        openTripDetail(row.dataset.guideId);
      });
    });
  }

  // -------- Trips page deep filters --------
  const PRICE_TIER_LABELS = { 1: '$ · Budget', 2: '$$ · Mid-range', 3: '$$$ · Splurge' };
  const STAY_LABELS = { hotel: 'Hotel', ryokan: 'Ryokan', airbnb: 'Airbnb', guesthouse: 'Guesthouse' };

  function resetTripFilters() {
    state.tripFilters = { city: new Set(), prefecture: new Set(), category: new Set(), priceTier: new Set(), stay: new Set() };
  }
  resetTripFilters();

  function tripFiltersActive() {
    const f = state.tripFilters;
    return f.city.size > 0 || f.prefecture.size > 0 || f.category.size > 0 || f.priceTier.size > 0 || f.stay.size > 0 || state.tripSearch.trim() !== '';
  }

  function guidePassesTripFilters(g) {
    const f = state.tripFilters;
    if (f.city.size > 0 && !f.city.has(g.city || cityOf(g))) return false;
    if (f.prefecture.size > 0 && !f.prefecture.has(g.prefecture || '')) return false;
    if (f.category.size > 0 && !f.category.has(g.category)) return false;
    if (f.priceTier.size > 0 && !f.priceTier.has(String(g.priceTier || 2))) return false;
    if (f.stay.size > 0 && !(g.stay || []).some(s => f.stay.has(s))) return false;
    const q = state.tripSearch.trim().toLowerCase();
    if (q) {
      const raw = state.tripSearch.trim();
      const hay = (g.title + ' ' + g.location + ' ' + (g.city || '') + ' ' + (g.prefecture || '')).toLowerCase();
      const jaHay = ((g.ja && g.ja.title) || '') + ' ' + cityLabel(g.city || cityOf(g));
      if (!hay.includes(q) && !jaHay.includes(raw)) return false;
    }
    return true;
  }

  function renderTripsFilters() {
    const box = $('#trips-filters');
    if (!box) return;
    const groups = [
      { key: 'city', name: t('trips.city'), values: [...new Set(WTT_GUIDES.map(g => g.city || cityOf(g)))].sort(), label: (v) => cityLabel(v) },
      { key: 'prefecture', name: t('trips.prefecture'), values: [...new Set(WTT_GUIDES.map(g => g.prefecture || ''))].filter(Boolean).sort(), label: (v) => prefLabel(v) },
      { key: 'category', name: t('trips.activity'), values: [...new Set(WTT_GUIDES.map(g => g.category))], label: (v) => catLabel(v) },
      { key: 'priceTier', name: t('trips.price'), values: ['1', '2', '3'], label: (v) => priceTierLabel(v), count: (v) => WTT_GUIDES.filter(g => String(g.priceTier || 2) === v).length },
      { key: 'stay', name: t('trips.stay'), values: [...new Set(WTT_GUIDES.flatMap(g => g.stay || []))].sort(), label: (v) => stayLabel(v) },
    ];
    box.innerHTML = groups.map(gr => `
      <div class="trips-filter-group">
        <div class="trips-filter-name">${gr.name}</div>
        ${gr.values.map(v => {
          const label = gr.label ? gr.label(v) : v;
          const count = gr.count ? gr.count(v) : WTT_GUIDES.filter(g => facetValue(g, gr.key) === v || (gr.key !== 'priceTier' && Array.isArray(facetValue(g, gr.key)) && facetValue(g, gr.key).includes(v))).length;
          const checked = state.tripFilters[gr.key].has(v) ? ' checked' : '';
          return `<label class="trips-filter-opt"><input type="checkbox" data-facet="${gr.key}" value="${v}"${checked}>${label}<span class="trips-filter-count">${count}</span></label>`;
        }).join('')}
      </div>`).join('');

    box.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const set = state.tripFilters[cb.dataset.facet];
        if (cb.checked) set.add(cb.value); else set.delete(cb.value);
        renderTripsMain();
      });
    });
  }

  function facetValue(g, key) {
    if (key === 'city') return g.city || cityOf(g);
    if (key === 'prefecture') return g.prefecture || '';
    if (key === 'category') return g.category;
    if (key === 'priceTier') return String(g.priceTier || 2);
    if (key === 'stay') return g.stay || [];
    return '';
  }

  function renderTripsPage() {
    renderTripsPageSidebar();
    renderTripsFilters();
    renderTripsMain();
  }

  function renderTripsMain() {
    const all = $('#trips-all');
    if (!all) return;
    // Owned guides live in My Trips only — hide them from browse sections.
    const browseable = WTT_GUIDES.filter(g => !isGuideUnlocked(g.id));
    if (tripFiltersActive()) {
      const results = browseable.filter(guidePassesTripFilters);
      let html = `<div class="trips-section-title">${t('trips.results')} (${results.length})</div>`;
      html += results.length
        ? `<div class="trips-grid">` + results.map(tripTileHtml).join('') + `</div>`
        : `<div class="page-empty">${t('trips.noMatch')}</div>`;
      all.innerHTML = html;
    } else {
    let html = `<div class="trips-section-title">${t('trips.popular')}</div>`;
    html += tripsRowHtml(browseable.slice(0, 4));

    html += `<div class="trips-section-title">${t('trips.byCity')}</div>`;
    const cities = {};
    browseable.forEach(g => {
      const c = cityOf(g);
      (cities[c] = cities[c] || []).push(g);
    });
    Object.keys(cities).sort().forEach(c => {
      html += `<div class="trips-city-title">${cityLabel(c)}</div>`;
      html += tripsRowHtml(cities[c]);
    });

    html += `<div class="trips-section-title">${t('trips.byTheme')}</div>`;
    CATEGORY_ORDER.forEach(cat => {
      const inCat = browseable.filter(g => g.category === cat);
      html += `<div class="trips-city-title">${catLabel(cat)}</div>`;
      html += inCat.length > 0
        ? tripsRowHtml(inCat)
        : `<div class="page-empty">${catLabel(cat)}${t('trips.comingSoonCat')}</div>`;
    });
    all.innerHTML = html;
    }

    all.querySelectorAll('.trips-tile').forEach(row => {
      const freeBtn = row.querySelector('.tile-free-btn');
      if (freeBtn) {
        freeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          attemptUnlock(row.dataset.guideId);
          openTripDetail(row.dataset.guideId);
        });
      }
      row.addEventListener('click', () => {
        openTripDetail(row.dataset.guideId);
      });
    });
  }

  // -------- Trip detail, rendered inline (Trips page or guide side panel) --------
  function openTripDetail(guideId, containerSel, backLabel, onBack, closePageOnPin) {
    console.log('[WTT] openTripDetail called with:', guideId);
    containerSel = containerSel || '#trips-all';
    const guide = guideById(guideId);
    if (!guide) {
      console.warn('[WTT] openTripDetail abort: guide not found for', guideId);
      return;
    }
    state.activeGuideId = guideId;
    state.tripsDetailId = guideId;
    const all = $(containerSel);
    if (!all) return;
    all.innerHTML = tripDetailHtml(guide, guideId, backLabel === undefined ? t('trips.back') : backLabel);
    all.scrollTop = 0;
    bindTripDetail(all, guideId, onBack || (() => {
      state.tripsDetailId = null;
      renderTripsMain();
    }), closePageOnPin === undefined ? true : closePageOnPin);
  }

  function bindTripDetail(all, guideId, onBack, closePageOnPin) {
    const guide = guideById(guideId);
    console.log('[WTT] bindTripDetail:', guideId, 'found:', !!guide, 'title:', guide ? guide.title : 'N/A');
    const backBtn = all.querySelector('.trips-back');
    if (backBtn && onBack) backBtn.addEventListener('click', onBack);

    all.querySelectorAll('.trip-detail-save').forEach(btn => {
      btn.addEventListener('click', () => toggleSave(btn.dataset.guideId || guideId));
    });

    const unlockBtn = all.querySelector('.trip-detail-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockFreeBtn = all.querySelector('.trip-detail-unlock-free');
    if (unlockFreeBtn) unlockFreeBtn.addEventListener('click', () => {
      console.log('[WTT] trips page free unlock btn clicked for:', guideId);
      const result = attemptUnlock(guideId);
      console.log('[WTT] attemptUnlock returned:', result);
      if (result === true) {
        all.innerHTML = tripDetailHtml(guideById(guideId), guideId, undefined);
        bindTripDetail(all, guideId);
      }
    });
    const unlockAllBtn = all.querySelector('.trip-detail-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));

    const detailStartBtn = all.querySelector('.trip-detail-start');
    if (detailStartBtn) detailStartBtn.addEventListener('click', () => startGuideNav(guideId));

    all.querySelectorAll('[data-pin]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pin = JSON.parse(btn.dataset.pin);
        if (closePageOnPin) closeTripsPage();
        if (state.map) state.map.flyTo({ center: [pin[1], pin[0]], zoom: 16, duration: 1.2 });
        retargetNavFromButton(guideById(guideId), btn);
        const titleEl = btn.closest('.timeline-item')?.querySelector('.timeline-title') || btn.querySelector('.sub-dest-card-title');
        showToast(t('toast.flyingTo') + ' ' + (titleEl ? titleEl.textContent : 'location'), 'success');
      });
    });

    // Start navigation from a specific timeline step.
    all.querySelectorAll('.timeline-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const guide = guideById(guideId);
        if (!guide) return;

        if (btn.dataset.hotelidx != null) {
          // Start nav directly at this hotel step; map centers on user if GPS available.
          startGuideNav(guideId, null, parseInt(btn.dataset.hotelidx, 10));
        } else {
          // Start nav directly at this step; map centers on user if GPS available.
          startGuideNav(guideId, parseInt(btn.dataset.tidx, 10));
        }
      });
    });

    // Numbered step pins (stops + hotels) so the map matches the timeline
    // even before navigation starts.
    if (guide) showStepPins(guide);
  }

  // Same detail markup as the Trips view, reusable in the nav side panel
  function tripDetailHtml(guide, guideId, backLabel) {
    const unlocked = isGuideUnlocked(guideId);
    const creator = creatorById(guide.creatorId);

    let html = `
      ${backLabel ? `<button class="trips-back">${backLabel}</button>` : ''}
      <div class="trip-detail-hero">
        <img src="${guide.heroImage}" alt="${gText(guide, 'title')}" loading="lazy" onerror="this.style.display='none'">
        <div class="modal-hero-overlay"></div>
        <div class="modal-hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          ${guide.location}
        </div>
      </div>
      <div class="modal-meta" style="margin-top:var(--space-md)">
        <div class="modal-duration">${gText(guide, 'duration')}</div>
        <div class="modal-curated">${t('modal.curatedBy')} ${(creator && creator.name) || 'Worth The Trip'}</div>
      </div>
      <div class="modal-title-row">
        ${creator && creator.avatar ? `<img class="detail-creator-avatar" src="${creator.avatar}" alt="${creator.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <h2 class="modal-title">${gText(guide, 'title')}</h2>
        <button class="save-heart trip-detail-save${isGuideSaved(guideId) ? ' saved' : ''}" data-guide-id="${guideId}" aria-label="Save guide">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
      </div>
      ${unlocked ? '' : `
      <div class="modal-price-row">
        <div class="modal-price">${formatPrice(guide.price)}</div>
        ${!state.freeUnlocked
          ? `<button class="btn-primary btn-red trip-detail-unlock-free"><span class="btn-label">${t('modal.unlockFree')}</span></button>`
          : `<button class="btn-primary trip-detail-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>`}
        <button class="btn-orange-sub trip-detail-unlock-all"><span class="btn-label">${t('modal.subscribe')}</span></button>
      </div>`}
      ${unlocked ? `<button class="btn-primary trip-detail-start"><span class="btn-label">${t('modal.start')}</span></button>` : ''}
      ${unlocked ? '' : `
      <div class="section-label">${t('modal.includes')}</div>
      <div class="includes-list">${gText(guide, 'includes').map(item => `
        <div class="includes-list-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${item}</span>
        </div>`).join('')}
      </div>`}`;

    if (unlocked && guide.timeline) {
      html += `
        <div class="section-label">${t('modal.timeline')}</div>
        <div class="timeline">${timelineHtml(guide, guideId)}</div>`;
    }

    // Sub-destinations render inside the timeline as nearby strips (see above).

    if (unlocked && guide.youtubeRef) {
      html += `
        <div class="section-label">${t('modal.youtube')}</div>
        <a href="${guide.youtubeRef.url}" target="_blank" rel="noopener noreferrer" class="youtube-ref" style="display:flex">
          <div class="youtube-icon">
            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div class="youtube-text">
            <strong>${ytText(guide, 'title')}</strong>
            ${ytText(guide, 'description')}
          </div>
        </a>`;
    }

    // Creator signature box — always at the very bottom of the guide detail.
    if (unlocked && creator) {
      html += `
        <div class="section-label">${t('modal.curatedBy')}</div>
        <div class="creator-card" style="display:flex">
          <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name}" onerror="this.style.display='none'">
          <div class="creator-info">
            <div class="creator-name">${creator.name}</div>
            <div class="creator-handle">${creatorText(creator, 'role')} · ${creator.handle}</div>
          </div>
        </div>`;
    }

    return html;
  }

  // -------- Guide side panel (guided mode) --------
  function renderGuidePanel(guideId) {
    const guide = guideById(guideId);
    if (!guide) return;
    state.activeGuideId = guideId;
    state.panelGuideId = guideId;
    document.body.classList.add('guiding');
    const panel = $('#guide-panel-content');
    panel.innerHTML = tripDetailHtml(guide, guideId, '← End guide');
    panel.scrollTop = 0;
    bindTripDetail($('#guide-panel'), guideId, () => stopGuideNav(), false);
    $('#guide-panel').setAttribute('aria-hidden', 'false');
    if (state.map) {
      try { state.map.resize(); } catch (e) {}
      setTimeout(() => { try { state.map.resize(); } catch (e) {} }, 350);
    }
  }

  function closeGuidePanel() {
    state.panelGuideId = null;
    document.body.classList.remove('guiding');
    const panel = $('#guide-panel-content');
    if (panel) panel.innerHTML = '';
    $('#guide-panel').setAttribute('aria-hidden', 'true');
    clearStepPins();
    if (state.map) {
      try { state.map.resize(); } catch (e) {}
      setTimeout(() => { try { state.map.resize(); } catch (e) {} }, 350);
    }
  }
  function openTripsPage() {
    state.tripsDetailId = null;
    renderTripsPage();
    $('#trips-page').classList.add('open');
    $('#trips-page').setAttribute('aria-hidden', 'false');
  }

  // -------- Bookings page --------
  // A signed-in traveller's bookings live on the server (SQLite) so they follow
  // them across devices; signed-out visitors fall back to this browser.
  const USER_BOOKINGS_KEY = 'wtt_user_bookings';

  function localUserBookings() {
    try {
      return JSON.parse(localStorage.getItem(USER_BOOKINGS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  async function serverBookings() {
    try {
      const r = await fetch('/api/bookings?_ts=' + Date.now(), { credentials: 'include' });
      if (!r.ok) return null;
      const d = await r.json();
      return (d && d.bookings) || [];
    } catch (e) { return null; }
  }

  async function saveServerBooking(b) {
    const r = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(b)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not save that booking');
    return d.booking;
  }

  function loadBookings() {
    const staticList = Array.isArray(typeof WTT_BOOKINGS !== 'undefined' ? WTT_BOOKINGS : []) ? WTT_BOOKINGS : [];
    return staticList.concat(localUserBookings());
  }

  async function bookingsForPage() {
    const server = await serverBookings();
    const userList = server === null ? localUserBookings() : server;
    const staticList = Array.isArray(typeof WTT_BOOKINGS !== 'undefined' ? WTT_BOOKINGS : []) ? WTT_BOOKINGS : [];
    return staticList.concat(userList);
  }

  function bookingStatus(b) {
    const today = new Date().toISOString().slice(0, 10);
    const end = b.dateEnd || b.dateStart || '';
    if (end && end < today) return 'past';
    return 'upcoming';
  }

  function formatBookingDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(lang() === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Default artwork per booking type — used when no photo was uploaded.
  const BOOKING_ART = {
    hotel: 'public/Branding/booking-hotel.svg',
    event: 'public/Branding/booking-event.svg',
    transport: 'public/Branding/booking-flight.svg',
    experience: 'public/Branding/booking-experience.svg'
  };

  function bookingImage(b) {
    const uploaded = (b && b.image || '').trim();
    return uploaded || BOOKING_ART[(b && b.type) || 'hotel'] || BOOKING_ART.hotel;
  }

  function bookingCardHtml(b) {
    const status = bookingStatus(b);
    const dates = b.dateEnd && b.dateEnd !== b.dateStart
      ? `${formatBookingDate(b.dateStart)} → ${formatBookingDate(b.dateEnd)}`
      : `${formatBookingDate(b.dateStart)}`;
    return `
      <div class="booking-card${b.source && b.source !== 'manual' ? ' is-user' : ''}" data-booking-id="${esc(b.id)}"
           role="button" tabindex="0" aria-label="${esc(b.title)}">
        <div class="booking-card-imgwrap">
          <img src="${esc(bookingImage(b))}" alt="${esc(b.title)}" loading="lazy">
          <div class="booking-pills">
            <span class="booking-type">${t('bookings.type.' + b.type) !== 'bookings.type.' + b.type ? t('bookings.type.' + b.type) : b.type}</span>
            <span class="booking-status${status === 'past' ? ' past' : ''}">${status === 'past' ? t('bookings.past') : t('bookings.upcoming')}</span>
          </div>
        </div>
        <div class="booking-card-body">
          <div class="booking-title-row">
            <div class="booking-title">${esc(b.title)}</div>
            ${b.source && b.source !== 'manual' ? `<button class="booking-del" data-del-booking="${esc(b.id)}" aria-label="${esc(t('import.delete'))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
          </div>
          <div class="booking-location">${esc(b.location)}</div>
          <div class="booking-dates"><span>${dates}</span>${b.time ? `<span>${esc(b.time)}</span>` : ''}</div>
          ${b.reference ? `<div class="booking-ref">${t('bookings.ref')}: ${esc(b.reference)}</div>` : ''}
          ${b.notes ? `<div class="booking-notes">${esc(b.notes)}</div>` : ''}
        </div>
      </div>`;
  }

  function renderBookingsPage() {
    bookingsForPage().then(function (list) {
      // Kept for the detail page and for booking navigation.
      state.bookings = list;
      const upcoming = list.filter(b => bookingStatus(b) !== 'past');
      const past = list.filter(b => bookingStatus(b) === 'past');
      let html = '';
      if (upcoming.length > 0) {
        html += `<div class="trips-section-title">${t('bookings.upcoming')}</div>` + upcoming.map(bookingCardHtml).join('');
      }
      if (past.length > 0) {
        html += `<div class="trips-section-title">${t('bookings.past')}</div>` + past.map(bookingCardHtml).join('');
      }
      if (!html) {
        html = '<div class="page-empty bookings-empty">' + t('bookings.empty') +
          '<button type="button" class="btn-primary bookings-empty-cta" id="bookings-empty-import">' +
          esc(t('import.title')) + '</button></div>';
      }
      $('#bookings-list').innerHTML = html;
      const emptyBtn = $('#bookings-empty-import');
      if (emptyBtn) emptyBtn.addEventListener('click', openImportModal);
    });
  }

  let bookingDetailId = null;

  function bookingById(id) {
    return state.bookings.find(b => b.id === id) || null;
  }

  function openBookingDetail(id) {
    const b = bookingById(id);
    if (!b) return;
    bookingDetailId = id;
    const status = bookingStatus(b);
    const dates = b.dateEnd && b.dateEnd !== b.dateStart
      ? `${formatBookingDate(b.dateStart)} → ${formatBookingDate(b.dateEnd)}`
      : `${formatBookingDate(b.dateStart)}`;
    const img = $('#booking-detail-image');
    img.src = bookingImage(b);
    img.alt = b.title;
    $('#booking-detail-type').textContent = t('bookings.type.' + b.type) !== 'bookings.type.' + b.type
      ? t('bookings.type.' + b.type) : b.type;
    const st = $('#booking-detail-status');
    st.textContent = status === 'past' ? t('bookings.past') : t('bookings.upcoming');
    st.classList.toggle('past', status === 'past');
    $('#booking-detail-title').textContent = b.title;
    $('#booking-detail-location').textContent = b.location || '';
    $('#booking-detail-dates').textContent = dates;
    $('#booking-detail-time').textContent = b.time || '';
    $('#booking-detail-time-row').style.display = b.time ? '' : 'none';
    $('#booking-detail-ref').textContent = b.reference || '';
    $('#booking-detail-ref-row').style.display = b.reference ? '' : 'none';
    $('#booking-detail-notes').textContent = b.notes || '';
    $('#booking-detail-notes').style.display = b.notes ? '' : 'none';
    const hasCoords = Array.isArray(b.coordinates) && b.coordinates.length === 2;
    $('#booking-detail-navigate').disabled = !hasCoords;
    $('#booking-detail-navhint').textContent = hasCoords ? '' : t('bookingDetail.noCoords');
    // Static demo bookings are not stored on the account, so there is nothing
    // to delete.
    $('#booking-detail-delete').style.display = b.source ? '' : 'none';
    const m = $('#booking-detail-modal');
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeBookingDetail() {
    const m = $('#booking-detail-modal');
    if (!m || !m.classList.contains('active')) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    bookingDetailId = null;
  }

  function deleteBookingDetail() {
    if (!bookingDetailId) return;
    const id = bookingDetailId;
    closeBookingDetail();
    deleteBooking(id);
  }

  // Opening a booking, and the two buttons inside its detail page.
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-booking]');
    if (addBtn) {
      e.stopPropagation();
      openImportModal();
      return;
    }
    const delBtn = e.target.closest('[data-del-booking]');
    if (delBtn) {
      e.stopPropagation();
      deleteBooking(delBtn.getAttribute('data-del-booking'));
      return;
    }
    const card = e.target.closest('.booking-card[data-booking-id]');
    if (card) openBookingDetail(card.getAttribute('data-booking-id'));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest && e.target.closest('.booking-card[data-booking-id]');
    if (!card) return;
    e.preventDefault();
    openBookingDetail(card.getAttribute('data-booking-id'));
  });

  $('#booking-detail-close').addEventListener('click', closeBookingDetail);
  $('#booking-detail-delete').addEventListener('click', deleteBookingDetail);
  // Tap the dimmed backdrop to dismiss — standard sheet behaviour.
  $('#booking-detail-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBookingDetail();
  });
  $('#import-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeImportModal();
  });
  $('#booking-detail-navigate').addEventListener('click', () => {
    const b = bookingById(bookingDetailId);
    closeBookingDetail();
    if (b) bookingNav(b);
  });

  async function deleteBooking(id) {
    try {
      await fetch('/api/bookings/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'include' });
    } catch (e) { /* not signed in */ }
    renderBookingsPage();
  }

  function openBookingsPage() {
    renderBookingsPage();
    $('#bookings-page').classList.add('open');
    $('#bookings-page').setAttribute('aria-hidden', 'false');
  }

  function closeBookingsPage() {
    $('#bookings-page').classList.remove('open');
    $('#bookings-page').setAttribute('aria-hidden', 'true');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'explore'));
  }

  // -------- Import a booking (paste / forward / calendar / photo) --------
  let importDraft = null;

  function openImportModal() {
    const m = $('#import-modal');
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#import-text').value = '';
    $('#import-preview').innerHTML = '';
    importDraft = null;
  }

  function closeImportModal() {
    const m = $('#import-modal');
    if (!m || !m.classList.contains('active')) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // When an email carries no address (Booking.com "request approved" mails are
  // like that), fall back to a city/prefecture named anywhere in the draft.
  function guessLocation(draft) {
    if (draft.location && draft.location.trim()) return draft.location;
    if (typeof WTT_LOCATIONS === 'undefined') return '';
    const hay = [draft.title, draft.notes].join(' ');
    const cities = (WTT_LOCATIONS.cities || []).slice()
      .sort((a, b) => String(b.name || '').length - String(a.name || '').length);
    for (const c of cities) {
      if (c && c.name && hay.indexOf(c.name) !== -1) {
        return c.prefecture ? (c.name + ', ' + c.prefecture) : c.name;
      }
    }
    const prefs = WTT_LOCATIONS.prefectures || [];
    for (const p of prefs) {
      if (p && hay.indexOf(p) !== -1) return p;
    }
    return '';
  }

  function renderBookingPreview(draft, source) {
    draft.location = guessLocation(draft);
    importDraft = Object.assign({}, draft, { source: source });
    const row = (key, label, type, value) =>
      `<div class="import-field"><label>${esc(label)}</label><input type="${type || 'text'}" data-draft="${key}" value="${esc(value == null ? '' : value)}"></div>`;
    $('#import-preview').innerHTML = `
      <div class="import-preview-card">
        <div class="import-preview-title">${esc(t('import.previewTitle'))}</div>
        <div class="import-grid">
          ${row('title', t('import.fTitle'), 'text', draft.title)}
          ${row('location', t('import.fLocation'), 'text', draft.location)}
          ${row('dateStart', t('import.fStart'), 'date', draft.dateStart)}
          ${row('dateEnd', t('import.fEnd'), 'date', draft.dateEnd)}
          ${row('time', t('import.fTime'), 'time', draft.time)}
          ${row('reference', t('import.fRef'), 'text', draft.reference)}
        </div>
        <div class="import-preview-actions">
          <button class="btn-ghost" id="import-cancel"><span>${esc(t('import.cancel'))}</span></button>
          <button class="btn-primary" id="import-save"><span class="btn-label">${esc(t('import.save'))}</span></button>
        </div>
      </div>`;
    $('#import-preview').querySelectorAll('[data-draft]').forEach(inp => {
      inp.addEventListener('input', () => { importDraft[inp.getAttribute('data-draft')] = inp.value; });
    });
    $('#import-cancel').addEventListener('click', () => { $('#import-preview').innerHTML = ''; importDraft = null; });
    $('#import-save').addEventListener('click', saveImported);
    const first = $('#import-preview [data-draft="title"]');
    if (first) first.focus();
  }

  async function saveImported() {
    if (!importDraft) return;
    const d = importDraft;
    if (!d.title.trim() && !d.dateStart) {
      showToast(t('import.needMore'), true);
      return;
    }
    const payload = {
      id: d.id || ('user-' + Date.now()),
      type: d.type || 'hotel',
      title: d.title.trim(),
      location: (d.location || '').trim(),
      dateStart: d.dateStart || '',
      dateEnd: d.dateEnd || d.dateStart || '',
      time: d.time || '',
      reference: (d.reference || '').trim(),
      notes: (d.notes || '').trim(),
      image: d.image || '',
      source: d.source || 'paste'
    };
    try {
      await saveServerBooking(payload);
      showToast(t('import.saved'), 'success');
      closeImportModal();
      renderBookingsPage();
    } catch (e) {
      showToast(e.message || 'Could not save that booking', true);
    }
  }

  async function parsePastedText() {
    const text = $('#import-text').value.trim();
    if (!text) { showToast(t('import.pasteEmpty'), true); return; }
    try {
      const r = await fetch('/api/bookings/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: text })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not read that confirmation');
      renderBookingPreview(d.draft || {}, 'paste');
    } catch (e) {
      showToast(e.message || 'Could not read that confirmation', true);
    }
  }

  // Minimal .ics reader — unfold continuation lines, then read the first VEVENT.
  function parseIcs(text) {
    const raw = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const unfolded = raw.split('\n').reduce((acc, line) => {
      if (/^[ \t]/.test(line) && acc.length) acc[acc.length - 1] += line.slice(1);
      else acc.push(line);
      return acc;
    }, []);
    const out = { title: '', location: '', dateStart: '', dateEnd: '', time: '', notes: '' };
    let inEvent = false;
    for (const line of unfolded) {
      if (/^BEGIN:VEVENT/i.test(line)) { inEvent = true; continue; }
      if (/^END:VEVENT/i.test(line)) break;
      if (!inEvent) continue;
      const m = /^([A-Z-]+)(?:;[^:]*)?:(.*)$/.exec(line);
      if (!m) continue;
      const key = m[1].toUpperCase(), val = m[2].trim();
      if (key === 'SUMMARY') out.title = val;
      else if (key === 'LOCATION') out.location = val;
      else if (key === 'DESCRIPTION') out.notes = val.slice(0, 200);
      else if (key === 'DTSTART') {
        const d = /(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(val);
        if (d) {
          out.dateStart = d[1] + '-' + d[2] + '-' + d[3];
          if (d[4]) out.time = d[4] + ':' + d[5];
        }
      } else if (key === 'DTEND') {
        const d = /(\d{4})(\d{2})(\d{2})/.exec(val);
        if (d) out.dateEnd = d[1] + '-' + d[2] + '-' + d[3];
      }
    }
    return out;
  }

  function resizeForUpload(file, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, (maxW || 1600) / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve(cv.toDataURL('image/jpeg', 0.85)); }
        catch (e) { reject(new Error('Could not process that image')); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
      img.src = url;
    });
  }

  async function handleImportPhoto(file) {
    if (!file) return;
    try {
      const dataUrl = await resizeForUpload(file, 1600);
      const r = await fetch('/api/bookings/attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dataUrl: dataUrl })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not upload that photo');
      const draft = Object.assign({}, importDraft || {}, { image: d.path });
      renderBookingPreview(draft, (importDraft && importDraft.source) || 'photo');
      showToast(t('import.photoAttached'), 'success');
    } catch (e) {
      showToast(e.message || 'Could not upload that photo', true);
    }
  }

  function closeTripsPage() {
    state.tripsDetailId = null;
    $('#trips-page').classList.remove('open');
    $('#trips-page').setAttribute('aria-hidden', 'true');
    clearStepPins();
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'explore'));
  }

  function closeAllPages() {
    closeTripsPage();
    closeBookingsPage();
    closeCreatorsPage();
    closeModal();
    closeProfile();
    closeMenuPage();
    closeMenu();
    closeImportModal();
    const wm = $('#welcome-modal');
    if (wm) { wm.classList.remove('active'); wm.setAttribute('aria-hidden', 'true'); }
  }

  function setExploreActive() {
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'explore'));
  }

  // -------- Creators --------
  const CREATOR_PLATFORMS = ['youtube', 'instagram', 'tiktok', 'twitch'];
  const CREATOR_PLATFORM_LABELS = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', twitch: 'Twitch' };
  const CREATOR_PLATFORM_URLS = { youtube: 'youtubeUrl', instagram: 'instagramUrl', tiktok: 'tiktokUrl', twitch: 'twitchUrl' };
  const FOLLOWED_KEY = 'wtt_followed';

  function loadFollowed() {
    try { return new Set(JSON.parse(localStorage.getItem(FOLLOWED_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }

  const VISIBLE_KEY = 'wtt_visible_creators';

  function loadVisibleCreators() {
    try {
      const arr = JSON.parse(localStorage.getItem(VISIBLE_KEY) || '["wtt"]');
      const set = new Set(Array.isArray(arr) ? arr : ['wtt']);
      set.add('wtt'); // WTT guides are always on the map
      return set;
    } catch (e) { return new Set(['wtt']); }
  }

  function saveVisibleCreators() {
    try { localStorage.setItem(VISIBLE_KEY, JSON.stringify([...state.visibleCreators])); } catch (e) {}
  }

  function guidesByCreator(id) {
    const key = creatorKey(id);
    return WTT_GUIDES.filter(g => creatorKey(g.creatorId) === key);
  }

  function toggleFollowCreator(id) {
    const creator = creatorById(id);
    if (!creator) return;
    if (state.followedCreators.has(id)) {
      state.followedCreators.delete(id);
      state.visibleCreators.delete(id);
      saveVisibleCreators();
      refreshMapMarkers({ fit: false });
      showToast(t('creators.unfollowed') + creator.name, 'success');
    } else {
      state.followedCreators.add(id);
      state.visibleCreators.add(id);
      saveVisibleCreators();
      refreshMapMarkers({ fit: false });
      showToast(t('creators.followed') + creator.name + t('creators.followedEmail'), 'success');
    }
    try { localStorage.setItem(FOLLOWED_KEY, JSON.stringify([...state.followedCreators])); } catch (e) {}
    renderCreatorsPage();
  }

  function creatorMatches(c) {
    // Placeholders are invented by creator-guides.js for a guide whose creator
    // has no approved profile; aliases are the account-id view of a real
    // creator. Neither belongs in the public list.
    if (c.placeholder || c.alias) return false;
    if (state.creatorPlatform === 'following' && !state.followedCreators.has(c.id)) return false;
    if (state.creatorPlatform !== 'all' && state.creatorPlatform !== 'following' &&
        !(c.platforms || []).includes(state.creatorPlatform)) return false;
    const q = state.creatorSearch.trim().toLowerCase();
    if (q) {
      const hay = (c.name + ' ' + c.handle + ' ' + creatorText(c, 'role') + ' ' + creatorText(c, 'bio')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderCreatorChips() {
    const box = $('#creators-platform-chips');
    if (!box) return;
    const opts = [
      { key: 'all', label: t('creators.all') },
      ...CREATOR_PLATFORMS.map(p => ({ key: p, label: CREATOR_PLATFORM_LABELS[p] })),
      { key: 'following', label: t('creators.following') },
    ];
    box.innerHTML = opts.map(o =>
      `<button class="chip${state.creatorPlatform === o.key ? ' active' : ''}" data-cplat="${o.key}">${o.label}</button>`
    ).join('');
    box.querySelectorAll('[data-cplat]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.creatorPlatform = btn.dataset.cplat;
        renderCreatorsPage();
      });
    });
  }

  function creatorCardHtml(c) {
    const n = guidesByCreator(c.id).length;
    const following = state.followedCreators.has(c.id);
    const plats = (c.platforms || []).map(p => {
      const url = c[CREATOR_PLATFORM_URLS[p]];
      const label = CREATOR_PLATFORM_LABELS[p] || p;
      return url
        ? `<a class="creator-plat" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
        : `<span class="creator-plat">${label}</span>`;
    }).join('');
    // No uploaded photo: show their initial instead of an empty circle.
    const avatar = c.avatar
      ? `<img class="creator-avatar" src="${c.avatar}" alt="${escHtml(c.name)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;creator-avatar creator-avatar-fallback&quot;>${escHtml(initials(c.name))}</div>'">`
      : `<div class="creator-avatar creator-avatar-fallback">${escHtml(initials(c.name))}</div>`;
    // Join only the parts that exist, so a creator with no role/followers does
    // not render a dangling separator.
    const ownCount = Number(c.followersCount) || 0;
    // Followers belong in the grey line under the name — never in the red
    // badge, which carries the guide count only.
    const counts = c.counts || {};
    const liveFollowers = CREATOR_PLATFORMS
      .filter((p) => Number(counts[p]) > 0)
      .map((p) => escHtml((CREATOR_PLATFORM_LABELS[p] || p) + ' ' + fmtCount(counts[p])))
      .join(' · ');
    const followersText = liveFollowers || (ownCount > 0 ? escHtml(fmtCount(ownCount)) : '');
    // No role on the record (or none merged from seed data) -> a neutral label.
    const handleBits = [creatorText(c, 'role') || 'Creator', c.handle, followersText]
      .filter(Boolean).join(' · ');
    const metaBits = t('creators.guidesCount').replace('{n}', n);
    return `
      <div class="creator-card">
        ${avatar}
        <div class="creator-card-main">
          <div class="creator-card-toprow">
            <div>
              <div class="creator-card-name">${escHtml(c.name)}</div>
              <div class="creator-card-handle">${escHtml(handleBits)}${c.city ? ' · ' + escHtml(cityLabel(c.city)) : ''}</div>
            </div>
            <button class="creator-btn follow-pill${following ? ' following' : ''}" data-follow="${c.id}">${following ? t('creators.following') : t('creators.follow')}</button>
          </div>
          <div class="creator-card-bio">${creatorText(c, 'bio')}</div>
          <div class="creator-card-meta">
            <span class="creator-followers">${metaBits}</span>
            ${plats}
          </div>
          <div class="creator-card-actions">
            ${isCreatorVisible(c.id)
              ? `<button class="creator-btn onmap" data-hidemap="${c.id}">${t('creators.removeFromMap')}</button>`
              : `<button class="creator-btn primary" data-showmap="${c.id}">${t('creators.showOnMap')}</button>`}
          </div>
        </div>
      </div>`;
  }

  function renderCreatorsPage() {
    renderCreatorChips();
    const list = $('#creators-list');
    if (!list) return;
    const creators = Object.values(WTT_CREATORS).filter(creatorMatches).sort((a, b) => {
      const fa = state.followedCreators.has(a.id) ? 0 : 1;
      const fb = state.followedCreators.has(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return guidesByCreator(b.id).length - guidesByCreator(a.id).length;
    });
    list.innerHTML = creators.length
      ? creators.map(creatorCardHtml).join('')
      : `<div class="page-empty">${t('creators.noMatch')}</div>`;
    list.querySelectorAll('[data-follow]').forEach(btn => {
      btn.addEventListener('click', () => toggleFollowCreator(btn.dataset.follow));
    });
    list.querySelectorAll('[data-showmap]').forEach(btn => {
      btn.addEventListener('click', () => showCreatorOnMap(btn.dataset.showmap));
    });
    list.querySelectorAll('[data-hidemap]').forEach(btn => {
      btn.addEventListener('click', () => hideCreatorFromMap(btn.dataset.hidemap));
    });
  }

  function openCreatorsPage() {
    renderCreatorsPage();
    $('#creators-page').classList.add('open');
    $('#creators-page').setAttribute('aria-hidden', 'false');
  }

  function closeCreatorsPage() {
    $('#creators-page').classList.remove('open');
    $('#creators-page').setAttribute('aria-hidden', 'true');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'explore'));
  }

  function hideCreatorFromMap(id) {
    if (id === 'wtt') return;
    state.visibleCreators.delete(id);
    saveVisibleCreators();
    refreshMapMarkers({ fit: false });
    renderCreatorsPage();
  }

  function showCreatorOnMap(id) {
    const creator = creatorById(id);
    const guides = guidesByCreator(id);
    if (!creator || guides.length === 0) {
      showToast(t('creators.noGuides'), 'success');
      return;
    }
    // Stays on the Creators page so several creators can be added in a row.
    // Map position is left alone — new pins just appear where the user already is.
    state.visibleCreators.add(id);
    saveVisibleCreators();
    refreshMapMarkers({ fit: false });
    renderCreatorsPage();
    showToast(t('creators.addedToMap') + creator.name, 'success');
  }

  // -------- Detect payment return --------
  function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const guideId = params.get('guide_id');
    const unlockAll = params.get('unlock_all') === '1';

    if (unlockAll) {
      state.unlockedGuides = new Set(WTT_GUIDES.map(g => g.id));
      persistUnlocked();
      showToast(t('toast.unlockAll'), 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (guideId && WTT_GUIDES.some(g => g.id === guideId)) {
      if (!state.unlockedGuides.has(guideId)) {
        state.unlockedGuides.add(guideId);
        persistUnlocked();
        showToast(t('toast.paymentDone'), 'success');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      // Navigate to the unlocked guide
      renderGuidePanel(guideId);
    }
  }

  // -------- Start --------
  // Creator-published guides arrive from the API; wait for them so they get
  // pins and cards on the first render instead of appearing late.
  function start() {
    // Both creator payloads have to land before the first render, or approved
    // creators show up with the placeholder name and no avatar.
    const boot = async function () {
      try {
        // Published creator guides are live on the map, so their creators must
        // not be filtered out by the Creators visibility toggle (default: wtt only).
        (window.WTT_CREATOR_IDS || []).forEach(function (id) { if (id) state.visibleCreators.add(creatorKey(id)); });
      } catch (e) { /* ignore */ }
      // Settle this email's unlocks BEFORE the first render, so a brand-new
      // account can never be shown another account's guides.
      await syncAccountUnlocks();
      init();
      freeClaimReady = syncFreeGuideClaim();
      syncAvatar();
    };

    const waits = [window.WTT_CREATOR_GUIDES_READY, window.WTT_CREATOR_PROFILES_READY]
      .filter(function (p) { return p && typeof p.then === 'function'; });

    if (waits.length) {
      // A failing payload must not hold the app hostage — boot anyway.
      Promise.all(waits.map(function (p) {
        return p.then(function () { return 0; }, function () { return 0; });
      })).then(boot, boot);
    } else {
      boot();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
