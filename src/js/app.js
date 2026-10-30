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
    activeGuideId: null,
    tripsDetailId: null,
    unlockedGuides: loadUnlocked(),
    savedGuides: loadSavedGuides(),
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
    unlockAllPriceId: "price_1UPk8UGlWwt59oq4nOxRuzT5",    postPaymentUrl: '/guide',






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
    toast: $('#toast'),
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
    return WTT_GUIDES.find(g => g.id === id);
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
    svg.style.width = '40px';
    svg.style.height = '40px';
    svg.style.display = 'block';
    svg.style.position = 'absolute';
    svg.style.transform = 'translate(-20px, -20px)';
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
    img.style.transform = 'translate(-20px, -20px)';
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
    svg.style.width = '40px';
    svg.style.height = '40px';
    svg.style.display = 'block';
    svg.style.position = 'absolute';
    svg.style.transform = 'translate(-20px, -20px)';
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

  function positionPin(svg, lngLat) {
    if (!state.map || !state.mapOverlay) return;
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
    const offsetX = pt.x - 20;
    const offsetY = pt.y - 20;
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
      state.pinElements.push({ svg, guide, lngLat: [guide.coordinates[1], guide.coordinates[0]] });
      state.mapOverlay.appendChild(svg);
      positionPin(svg, [guide.coordinates[1], guide.coordinates[0]]);

      svg.addEventListener('click', (e) => {
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
      positionPin(p.svg, p.lngLat);
    });
    positionNavDot();
  }

  // -------- Live navigation (GPS follow + check-in + Maps handoff) --------
  const NAV_CHECKIN_M = 50;

  function resetNavState() {
    const prev = state.nav || {};
    // Keep the blue dot + last known position: passive tracking owns them.
    state.nav = { watchId: null, guideId: null, stopIndex: 0, mode: 'walking', userLngLat: prev.userLngLat || null, dot: prev.dot || null, routeKey: null };
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

  function navStops(guide) {
    return (guide.timeline || []).filter(t => Array.isArray(t.mapPin));
  }

  function navTargetTitle() {
    const target = navTarget();
    if (!target) return '';
    const guide = guideById(state.nav.guideId);
    const idx = guide && guide.timeline ? guide.timeline.indexOf(target) : -1;
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
    const item = (guide.timeline || [])[timelineIdx];
    const stopIdx = navStops(guide).indexOf(item);
    if (stopIdx < 0) return;
    state.nav.stopIndex = stopIdx;
    updateNavBanner();
    updateNavRoute();
  }

  function navTarget() {
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
    els.navMode.textContent = state.nav.mode === 'transit' ? '🚃' : '🚶';
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
    if (state.nav) state.nav.routeKey = null;
  }

  function updateNavRoute() {
    const target = navTarget();
    if (!target || !state.nav.userLngLat || !state.map) return;
    const [uLng, uLat] = state.nav.userLngLat;
    const [tLat, tLng] = target.mapPin;
    // Refetch only when the target changed or the user moved ~30m+
    const key = state.nav.guideId + ':' + state.nav.stopIndex + ':' + uLat.toFixed(4) + ',' + uLng.toFixed(4);
    if (state.nav.routeKey === key) return;
    state.nav.routeKey = key;
    const fallback = () => setRouteLine([[uLng, uLat], [tLng, tLat]]);
    fetch('https://router.project-osrm.org/route/v1/foot/' + uLng + ',' + uLat + ';' + tLng + ',' + tLat + '?overview=full&geometries=geojson')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const coords = data && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates;
        if (coords && coords.length > 1) setRouteLine(coords);
        else fallback();
      })
      .catch(fallback);
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
        <div class="timeline">${timelineHtml(guide)}</div>`;
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
        retargetNavToStop(guide, parseInt(btn.dataset.tidx, 10));
      });
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
    ensureNavDot();
    positionNavDot();
    const target = navTarget();
    if (!target) return;
    const d = haversineM(pos.coords.latitude, pos.coords.longitude, target.mapPin[0], target.mapPin[1]);
    if (d <= NAV_CHECKIN_M) {
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
  }

  function onNavError(err) {
    const msg = err && err.code === 1 ? t('toast.locBlocked') : t('toast.noLoc');
    showToast(t('toast.navFailed'), 'success');
    try { navigator.geolocation.clearWatch(state.nav.watchId); } catch (e) {}
    // Keep the guide open — do NOT stop navigation or close the split view.
  }

  function startGuideNav(guideId) {
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
    state.nav.stopIndex = 0;
    closeModal();
    closeTripsPage();
    $('#popular-sheet').classList.add('hidden');
    state.activeGuideId = guideId;
    renderNavPanel(guideId);
    setSplitView(true);
    els.navBanner.style.display = 'flex';
    updateNavBanner();
    showToast('▶ ' + t('toast.navStart') + ': ' + guide.title, 'success');
    try {
      state.nav.watchId = navigator.geolocation.watchPosition(onNavPosition, onNavError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      });
    } catch (e) {
      onNavError(e);
    }
    // Center on the user once the first fix arrives; for now fly to stop 1
    const stops = navStops(guide);
    if (stops.length > 0 && state.map) {
      state.map.flyTo({ center: [stops[0].mapPin[1], stops[0].mapPin[0]], zoom: 14, duration: 1.6 });
    }
  }

  function stopGuideNav(silent) {
    if (state.nav.watchId !== null && state.nav.watchId !== undefined) {
      try { navigator.geolocation.clearWatch(state.nav.watchId); } catch (e) {}
    }
    // Blue dot stays — passive tracking owns it now.
    clearNavRoute();
    clearNavPanel();
    setSplitView(false);
    resetNavState();
    if (els.navBanner) els.navBanner.style.display = 'none';
    if (!silent) showToast(t('toast.navEnd'), 'success');
  }

  function travelIcon(text) {
    const t = (text || '').toLowerCase();
    if (/walk/.test(t)) return '🚶';
    if (/train|line|station|subway|shinkansen/.test(t)) return '🚃';
    if (/bus/.test(t)) return '🚌';
    if (/drive|car|taxi/.test(t)) return '🚗';
    if (/ferry|boat|ship/.test(t)) return '⛴';
    if (/bike|cycle/.test(t)) return '🚲';
    return '🕐';
  }

  function shortStopName(title) {
    return (title || '').split(/[—\-(]/)[0].trim();
  }

  // Full day-by-day itinerary markup, shared by popup + Trips detail
  function timelineHtml(guide) {
    const items = (guide.timeline || []).map((item, i) => Object.assign({}, item, {
      _tTitle: tlText(guide, i, 'title'),
      _tDesc: tlText(guide, i, 'desc'),
    }));
    const days = [];
    items.forEach((item, i) => {
      const day = item.day || 1;
      let group = days.find(d => d.day === day);
      if (!group) { group = { day, indexes: [] }; days.push(group); }
      group.indexes.push(i);
    });
    return days.map(group => {
      const route = group.indexes.map(i => shortStopName(items[i]._tTitle)).filter(Boolean).join(' → ');
      return `
      <div class="timeline-day"><span class="timeline-day-num">${dayLabel(group.day)}</span><span class="timeline-day-route">${route}</span></div>
      ` + group.indexes.map(i => {
        const item = items[i];
        return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <span class="timeline-time">${item.time}</span>
          <div class="timeline-row">
            <div class="timeline-text">
              <div class="timeline-title">${item._tTitle}</div>
              <div class="timeline-desc">${item._tDesc}</div>
              <div class="timeline-meta">
                <span>${travelIcon(item.travelTime)} ${item.travelTime}</span>
                <button class="timeline-meta-btn" data-pin='${JSON.stringify(item.mapPin)}' data-tidx="${i}" aria-label="Show on map">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.5 12 12 16.5 7.5 12 12 7.5"/></svg>
                  ${t('nav.mapBtn')}
                </button>
              </div>
              ${nearbyStripHtml(guide, i)}
            </div>
            ${item.image ? `<img class="timeline-thumb" src="${item.image}" alt="${item._tTitle}" loading="lazy" onerror="this.style.display='none'">` : ''}
          </div>
        </div>`;
      }).join('');
    }).join('');
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
  function openGuideModal(guideId) {
    const guide = guideById(guideId);
    if (!guide) return;

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

    els.modalHero.innerHTML = `
      <img src="${guide.heroImage}" alt="${gText(guide, 'title')}" loading="lazy" onerror="this.style.display='none'">
      <div class="modal-hero-overlay"></div>
      <div class="modal-hero-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
        ${gLocation(guide)}
      </div>
    `;

    els.modalIncludes.innerHTML = gText(guide, 'includes').map(item => `
      <div class="includes-list-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${item}</span>
      </div>
    `).join('');

    if (unlocked && guide.timeline) {
      els.modalTimeline.style.display = 'block';
      els.modalTimelineContent.innerHTML = timelineHtml(guide);

      els.modalTimelineContent.querySelectorAll('[data-pin]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pin = JSON.parse(btn.dataset.pin);
          state.map.flyTo({ center: [pin[1], pin[0]], zoom: 16, duration: 1.2 });
          retargetNavToStop(guide, parseInt(btn.dataset.tidx, 10));
          toast(t('toast.flyingTo') + ' ' + btn.closest('.timeline-item').querySelector('.timeline-title').textContent);
        });
      });
    } else {
      els.modalTimeline.style.display = 'none';
    }

    // Sub-destinations render inside the timeline as nearby strips.
    els.modalSubDests.style.display = 'none';
    els.modalSubDestGrid.style.display = 'none';

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

    if (unlocked && guide.youtubeRef) {
      els.modalYoutube.style.display = 'flex';
      els.modalYoutube.innerHTML = `
        <a href="${guide.youtubeRef.url}" target="_blank" rel="noopener noreferrer" class="youtube-ref">
          <div class="youtube-icon">
            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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
    els.modalUnlockBtn.addEventListener('click', () => attemptUnlock(guideId));

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
    const guide = guideById(guideId);
    if (!guide) return;

    if (unlockAll) {
      if (state.unlockedGuides.size === WTT_GUIDES.length) {
        showToast(t('toast.alreadyUnlocked'), 'success');
        return;
      }
      startUnlockAllCheckout();
      return;
    }

    if (!state.freeUnlocked) {
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
      ? '🗺️ Map tiles not loading — open this file through a local server (see README.md) for the full map.'
      : '🗺️ Map tiles not loading — check your internet connection.';
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
    });

    // When the map style loads
    state.map.on('load', () => {
      console.log('[WTT] Map style loaded — setting up pin overlay');
      createMapOverlay();
      console.log('[WTT] About to call refreshMapMarkers()...');
      refreshMapMarkers();
      console.log('[WTT] refreshMapMarkers() completed');
      state.map.on('move', onMapMove);
      state.map.on('moveend', onMapMove);
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
        toast('📱 ' + t('nav.' + tab) + ' ' + t('toast.tabSoon'));
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
        if (item.dataset.page === 'creator-studio') { location.href = '/creator'; return; }
        openMenuPage(item.dataset.page);
      });
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
      // If the account already claimed its free guide on the server, the offer
      // is spent — don't show the popup again on this device either.
      if (freeClaimReady) {
        try {
          await Promise.race([freeClaimReady, new Promise((r) => setTimeout(r, 1500))]);
        } catch (e) {}
      }
      if (!welcomed && !state.freeUnlocked) showWelcome();
    }, 600);

    $('#welcome-cta').addEventListener('click', () => {
      hideWelcome();
      closeAllPages();
      $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'trips'));
      openTripsPage();
    });
    $('#welcome-later').addEventListener('click', hideWelcome);
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
        const saved = JSON.parse(sessionStorage.getItem('creatorForm') || 'null');
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
            try { sessionStorage.setItem('creatorForm', JSON.stringify({ name, email, area, youtube, instagram })); } catch (e) {}
            $('#menu-page-body').innerHTML = `
              <div style="text-align:center; padding: 24px 0;">
                <h3 style="margin: 0 0 8px;">${t('creator.verifyTitle')}</h3>
                <p style="margin: 0 0 16px;">${t('creator.verifyBody').replace('{email}', escHtml(email))}</p>
                <p style="margin: 0 0 16px; color: var(--muted-foreground); font-size: 13px;">After verifying, open <strong>Become a Creator</strong> again and tap <strong>Join Waitlist</strong> to finish your application.</p>
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
      try { sessionStorage.removeItem('creatorForm'); } catch (e) {}
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
    containerSel = containerSel || '#trips-all';
    const guide = guideById(guideId);
    if (!guide) return;
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
    const backBtn = all.querySelector('.trips-back');
    if (backBtn && onBack) backBtn.addEventListener('click', onBack);

    all.querySelectorAll('.trip-detail-save').forEach(btn => {
      btn.addEventListener('click', () => toggleSave(btn.dataset.guideId || guideId));
    });

    const unlockBtn = all.querySelector('.trip-detail-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockFreeBtn = all.querySelector('.trip-detail-unlock-free');
    if (unlockFreeBtn) unlockFreeBtn.addEventListener('click', () => {
      if (attemptUnlock(guideId)) {
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
        retargetNavToStop(guideById(guideId), parseInt(btn.dataset.tidx, 10));
        const titleEl = btn.closest('.timeline-item')?.querySelector('.timeline-title') || btn.querySelector('.sub-dest-card-title');
        showToast(t('toast.flyingTo') + ' ' + (titleEl ? titleEl.textContent : 'location'), 'success');
      });
    });
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
        <div class="timeline">${timelineHtml(guide)}</div>`;
    }

    // Sub-destinations render inside the timeline as nearby strips (see above).

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
  // Data lives in src/js/data/bookings.js. Future: swap WTT_BOOKINGS for an
  // API fetch; loadBookings/saveUserBooking are the only functions the UI calls.
  const USER_BOOKINGS_KEY = 'wtt_user_bookings';

  function loadUserBookings() {
    try {
      return JSON.parse(localStorage.getItem(USER_BOOKINGS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function loadBookings() {
    const staticList = Array.isArray(typeof WTT_BOOKINGS !== 'undefined' ? WTT_BOOKINGS : []) ? WTT_BOOKINGS : [];
    return staticList.concat(loadUserBookings());
  }

  function saveUserBooking(b) {
    const list = loadUserBookings();
    list.push(Object.assign({ id: 'user-' + Date.now() }, b));
    try {
      localStorage.setItem(USER_BOOKINGS_KEY, JSON.stringify(list));
    } catch (e) { /* unavailable */ }
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

  function bookingCardHtml(b) {
    const status = bookingStatus(b);
    const dates = b.dateEnd && b.dateEnd !== b.dateStart
      ? `📅 ${formatBookingDate(b.dateStart)} → ${formatBookingDate(b.dateEnd)}`
      : `📅 ${formatBookingDate(b.dateStart)}`;
    return `
      <div class="booking-card">
        <div class="booking-card-imgwrap">
          <img src="${b.image}" alt="${b.title}" loading="lazy" onerror="this.style.display='none'">
          <div class="booking-pills">
            <span class="booking-type">${t('bookings.type.' + b.type) !== 'bookings.type.' + b.type ? t('bookings.type.' + b.type) : b.type}</span>
            <span class="booking-status${status === 'past' ? ' past' : ''}">${status === 'past' ? t('bookings.past') : t('bookings.upcoming')}</span>
          </div>
        </div>
        <div class="booking-card-body">
          <div class="booking-title">${b.title}</div>
          <div class="booking-location">${b.location}</div>
          <div class="booking-dates"><span>${dates}</span>${b.time ? `<span>🕐 ${b.time}</span>` : ''}</div>
          ${b.reference ? `<div class="booking-ref">${t('bookings.ref')}: ${b.reference}</div>` : ''}
          ${b.notes ? `<div class="booking-notes">${b.notes}</div>` : ''}
        </div>
      </div>`;
  }

  function renderBookingsPage() {
    const list = loadBookings();
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
      html = `<div class="page-empty">${t('bookings.empty')}</div>`;
    }
    $('#bookings-list').innerHTML = html;
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

  function closeTripsPage() {
    state.tripsDetailId = null;
    $('#trips-page').classList.remove('open');
    $('#trips-page').setAttribute('aria-hidden', 'true');
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
      { key: 'following', label: '♥ ' + t('creators.following') },
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
            <button class="creator-btn follow-pill${following ? ' following' : ''}" data-follow="${c.id}">${following ? '♥ ' + t('creators.following') : t('creators.follow')}</button>
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
