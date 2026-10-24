/* Worth The Trip — Creator studio
 * Guide builder for approved creators: basics, price, locations (Google Maps
 * link -> pin), travel legs, photos, explore pin, source video, EN + JA.
 * Talks to the /api/creator/* endpoints in server.js.
 */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var AUTH_KEY = 'wtt_session';
  var SETTINGS_KEY = 'wtt_settings';
  var DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=cb1_2yub_1_2c7e35648b4432f09a02221';
  var LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json?key=cb1_2yub_1_2c7e35648b4432f09a02221';
  var CATEGORIES = ['culture', 'food', 'nature', 'hiking', 'luxury'];
  var MODES = ['walk', 'train', 'bus', 'taxi', 'car', 'ferry', 'bike'];
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // ---------------------------------------------------------------- i18n
  var STR = {
    en: {
      title: 'Creator studio', back: 'Back',
      signinTitle: 'Creator studio', signinSub: 'Sign in to build and manage your guides.',
      signin: 'Sign in', signup: 'Create account', email: 'Email', password: 'Password', password6: 'Password (6+ chars)', name: 'Name',
      applyTitle: 'Apply to become a creator', applySub: 'Tell us where you post. WTT reviews every application by hand.',
      handle: 'Social handle (e.g. @yourname)', area: 'Where you cover', bio: 'Short bio', youtube: 'YouTube link', instagram: 'Instagram link',
      apply: 'Send application', applying: 'Application sent',
      pendingTitle: 'Application under review', pendingSub: 'Thanks — WTT will review your application and unlock the studio once approved.',
      rejectedTitle: 'Application not approved', rejectedSub: 'You can update your details and apply again.', reapply: 'Apply again',
      yourGuides: 'Your guides', newGuide: 'New guide', noGuides: 'No guides yet. Create your first one.',
      colGuide: 'Guide', colStatus: 'Status', colPrice: 'Price', colUpdated: 'Updated', colActions: '',
      edit: 'Edit', del: 'Delete', confirmDel: 'Delete this guide? This cannot be undone.',
      stDraft: 'Draft', stSubmitted: 'In review', stPublished: 'Published', stRejected: 'Needs changes',
      newGuidePrompt: 'What is the guide called?', create: 'Create',
      saveDraft: 'Save draft', preview: 'Preview', submit: 'Submit for review', submitting: 'Submitting…', saved: 'Saved',
      autosaveOn: 'Changes save automatically.', myGuides: '← My guides',
      missingTitle: 'Still needed before you can submit:',
      readyToSubmit: 'Everything is filled in — ready to submit.',
      reviewNote: 'Reviewer note',
      basics: 'Basics', titleF: 'Guide title', tagline: 'Tagline (one line)', city: 'City', prefecture: 'Prefecture',
      category: 'Category', season: 'Best season', duration: 'Duration (e.g. 3 Days)', cover: 'Cover image',
      coverHint: 'Landscape works best. Large images are resized automatically (max 5 MB).',
      chooseImage: 'Choose image', replacing: 'Replace image',
      pricing: 'Price', priceHint: 'Between ¥100 and ¥2,000. This is what the traveller pays.',
      explorePin: 'Explore map pin', pinHint: 'Click the map to drop the pin travellers will see on the Explore page. Drag to fine-tune.',
      pinZoom: 'Zoom level', pinSet: 'Pin set', pinNotSet: 'No pin yet',
      locations: 'Locations & route', addStop: 'Add location',
      locHint: 'Paste a Google Maps link and the pin is found for you — short share links work too.',
      stopTitle: 'Location name', stopDesc: 'What happens here', day: 'Day', time: 'Time',
      mapsLink: 'Google Maps link', findPin: 'Find & fill', finding: 'Finding…', pinFound: 'Pin found',
      pinMissing: 'No pin yet — paste a Maps link and press Find & fill', clearPin: 'Clear',
      stopName: 'Location name', travelHere: 'Getting here from the previous stop',
      travelTime: 'Travel time (e.g. 15 min)', travelMode: 'How you get there',
      liveNote: 'This guide is live. Saving changes sends it back to WTT for review before it goes live again.',
      stopPhoto: 'Photo of this stop', moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove',
      noStops: 'No locations yet. Add your first one.',
      video: 'Source video', videoHint: 'The video this guide came from, so travellers can watch it.',
      platform: 'Platform', videoUrl: 'Video link', videoHandle: 'Your handle on that platform',
      includes: 'What is included', addInclude: 'Add another item',
      previewTitle: 'Preview', closePreview: 'Close',
      mustSignIn: 'Please sign in first', errGeneric: 'Something went wrong',
      youEarn: 'You set the price', perGuide: 'per traveller',
      unsaved: 'Unsaved changes', saving: 'Saving…',
      allGuides: '← All guides', publish: 'Publish', publishedNow: 'Published — live on the Explore page',
      adminEditing: 'Editing as WTT admin', adminPick: 'Pick a guide to edit'
    },
    ja: {
      title: 'クリエイタースタジオ', back: '戻る',
      signinTitle: 'クリエイタースタジオ', signinSub: 'サインインしてガイドを作成・管理します。',
      signin: 'サインイン', signup: 'アカウント作成', email: 'メール', password: 'パスワード', password6: 'パスワード（6文字以上）', name: '名前',
      applyTitle: 'クリエイター申請', applySub: '投稿しているSNSを教えてください。WTTが一件ずつ確認します。',
      handle: 'SNSハンドル（例：@yourname）', area: '担当エリア', bio: '自己紹介', youtube: 'YouTubeリンク', instagram: 'Instagramリンク',
      apply: '申請を送る', applying: '申請済み',
      pendingTitle: '申請を確認中', pendingSub: 'ありがとうございます。承認されるとスタジオが使えるようになります。',
      rejectedTitle: '申請は承認されませんでした', rejectedSub: '内容を更新して再申請できます。', reapply: '再申請する',
      yourGuides: 'あなたのガイド', newGuide: '新しいガイド', noGuides: 'まだガイドがありません。最初のガイドを作成しましょう。',
      colGuide: 'ガイド', colStatus: '状態', colPrice: '価格', colUpdated: '更新', colActions: '',
      edit: '編集', del: '削除', confirmDel: 'このガイドを削除しますか？元に戻せません。',
      stDraft: '下書き', stSubmitted: '審査中', stPublished: '公開中', stRejected: '修正が必要',
      newGuidePrompt: 'ガイドの名前は？', create: '作成',
      saveDraft: '下書きを保存', preview: 'プレビュー', submit: '審査に提出', submitting: '送信中…', saved: '保存しました',
      autosaveOn: '変更は自動保存されます。', myGuides: '← ガイド一覧',
      missingTitle: '提出前に必要な項目：',
      readyToSubmit: 'すべて入力済みです。提出できます。',
      reviewNote: 'レビューコメント',
      basics: '基本情報', titleF: 'ガイドタイトル', tagline: 'キャッチコピー（1行）', city: '市', prefecture: '都道府県',
      category: 'カテゴリ', season: 'おすすめの季節', duration: '所要時間（例：3日間）', cover: 'カバー画像',
      coverHint: '横長がおすすめです。大きい画像は自動で縮小されます（最大5MB）。',
      chooseImage: '画像を選ぶ', replacing: '画像を変更',
      pricing: '価格', priceHint: '¥100〜¥2,000の範囲です。旅行者が支払う金額です。',
      explorePin: '探索マップのピン', pinHint: '地図をクリックして、探索ページに表示されるピンを配置します。ドラッグで微調整できます。',
      pinZoom: 'ズームレベル', pinSet: 'ピン設定済み', pinNotSet: 'ピン未設定',
      locations: 'スポットとルート', addStop: 'スポットを追加',
      locHint: 'Googleマップのリンクを貼ると、ピンを自動で見つけます。短縮リンクも使えます。',
      stopTitle: 'スポット名', stopDesc: 'ここでの内容', day: '日', time: '時刻',
      mapsLink: 'Googleマップのリンク', findPin: '検索して入力', finding: '検索中…', pinFound: 'ピンが見つかりました',
      pinMissing: 'ピン未設定 — リンクを貼って「検索して入力」を押してください', clearPin: 'クリア',
      stopName: 'スポット名', travelHere: '前のスポットからの移動',
      travelTime: '移動時間（例：15分）', travelMode: '移動手段',
      liveNote: 'このガイドは公開中です。変更を保存すると、再公開前にWTTの審査に戻ります。',
      stopPhoto: 'このスポットの写真', moveUp: '上へ', moveDown: '下へ', remove: '削除',
      noStops: 'スポットがありません。最初の1件を追加しましょう。',
      video: '元の動画', videoHint: 'このガイドの元になった動画です。旅行者が視聴できます。',
      platform: 'プラットフォーム', videoUrl: '動画リンク', videoHandle: 'そのプラットフォームでのハンドル',
      includes: '含まれるもの', addInclude: '項目を追加',
      previewTitle: 'プレビュー', closePreview: '閉じる',
      mustSignIn: '先にサインインしてください', errGeneric: '問題が発生しました',
      youEarn: '設定した価格', perGuide: '旅行者1人あたり',
      unsaved: '未保存の変更', saving: '保存中…',
      allGuides: '← すべてのガイド', publish: '公開する', publishedNow: '公開しました — 探索ページに表示されます',
      adminEditing: 'WTT管理者として編集中', adminPick: '編集するガイドを選んでください'
    }
  };
  var lang = 'en';
  function t(k) { return (STR[lang] && STR[lang][k]) || STR.en[k] || k; }

  // ---------------------------------------------------------------- utils
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function loadSettings() {
    try { return Object.assign({ lang: 'en', currency: 'JPY', theme: 'dark' }, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); }
    catch (e) { return { lang: 'en', currency: 'JPY', theme: 'dark' }; }
  }
  function saveSettings(patch) {
    var s = Object.assign(loadSettings(), patch);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function theme() { return loadSettings().theme === 'light' ? 'light' : 'dark'; }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme());
    var b = $('#theme-btn');
    if (b) { b.textContent = theme() === 'light' ? '☀️' : '🌙'; b.setAttribute('aria-label', theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'); }
  }

  function toast(msg, isErr) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    el.classList.toggle('err', !!isErr);
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 3400);
  }

  function api(path, options) {
    options = options || {};
    // Bust any cached copy of a GET — the proxy caches on the URL alone.
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

  // Pull lat/lng out of a Maps URL or a raw "lat, lng" string.
  function extractLatLng(text) {
    var s = String(text || '');
    var pats = [/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
      /[?&](?:q|query|ll|destination|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
      /^(-?\d{1,3}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})$/];
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].exec(s);
      if (m) {
        var lat = Number(m[1]), lng = Number(m[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
      }
    }
    return null;
  }
  function fmtCoords(c) { return c ? (Number(c[0]).toFixed(5) + ', ' + Number(c[1]).toFixed(5)) : ''; }
  function yen(n) { return '¥' + Number(n || 0).toLocaleString('en-US'); }

  // ---------------------------------------------------------------- state
  var state = { me: null, guides: [], guide: null, problems: [], dirty: false, timer: null, map: null, marker: null, view: 'boot' };

  // ---------------------------------------------------------------- views
  function showView(name) {
    state.view = name;
    ['gate', 'list', 'editor'].forEach(function (v) {
      var el = $('#' + v + '-view');
      if (el) el.style.display = (v === name) ? 'block' : 'none';
    });
    var pt = $('#page-title');
    if (pt) pt.textContent = t('title');
  }

  // ---- gate ----
  function renderGate() {
    var m = state.me;
    var app = m.application;
    var html = '';
    if (!m.signedIn) {
      html += '<div class="card">' +
        '<h1>' + esc(t('signinTitle')) + '</h1><p class="sub">' + esc(t('signinSub')) + '</p>' +
        '<div class="error" id="gate-error"></div>' +
        '<div class="section-title">' + esc(t('signin')) + '</div>' +
        '<form id="signin-form"><div class="field"><label>' + esc(t('email')) + '</label><input id="si-email" type="email" required autocomplete="email"></div>' +
        '<div class="field"><label>' + esc(t('password')) + '</label><input id="si-password" type="password" required autocomplete="current-password"></div>' +
        '<div class="btn-row"><button class="btn btn-primary" type="submit">' + esc(t('signin')) + '</button></div></form>' +
        '<div class="section-title" style="margin-top:22px">' + esc(t('signup')) + '</div>' +
        '<form id="signup-form"><div class="field"><label>' + esc(t('email')) + '</label><input id="su-email" type="email" required autocomplete="email"></div>' +
        '<div class="field"><label>' + esc(t('password6')) + '</label><input id="su-password" type="password" required minlength="6" autocomplete="new-password"></div>' +
        '<div class="field"><label>' + esc(t('name')) + '</label><input id="su-name" type="text" required autocomplete="name"></div>' +
        '<div class="btn-row"><button class="btn btn-primary" type="submit">' + esc(t('signup')) + '</button></div></form></div>';
    } else if (!app || app.status === 'pending') {
      var pending = !!app;
      html += '<div class="card"><h1>' + esc(pending ? t('pendingTitle') : t('applyTitle')) + '</h1>' +
        '<p class="sub">' + esc(pending ? t('pendingSub') : t('applySub')) + '</p>' +
        '<div class="error" id="gate-error"></div>' +
        (pending ? '<p class="sub">' + esc(t('applying')) + ' · ' + esc(m.user.email) + '</p>' : applyForm()) + '</div>';
    } else if (app.status === 'rejected') {
      html += '<div class="card"><h1>' + esc(t('rejectedTitle')) + '</h1><p class="sub">' + esc(t('rejectedSub')) + '</p>' +
        (app.reviewNote ? '<div class="problems"><strong>' + esc(t('reviewNote')) + '</strong><div style="margin-top:6px">' + esc(app.reviewNote) + '</div></div>' : '') +
        '<div class="error" id="gate-error" style="margin-top:14px"></div>' +
        '<div class="section-title" style="margin-top:18px">' + esc(t('reapply')) + '</div>' + applyForm() + '</div>';
    }
    $('#gate-view').innerHTML = html;
    showView('gate');
    wireGate();
  }

  function applyForm() {
    var a = (state.me.application || {});
    return '<form id="apply-form">' +
      '<div class="row2">' +
      '<div class="field"><label>' + esc(t('name')) + '</label><input id="ap-name" required value="' + esc(a.name || state.me.user.name || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('handle')) + '</label><input id="ap-handle" required value="' + esc(a.handle || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label>' + esc(t('area')) + '</label><input id="ap-area" value="' + esc(a.area || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('bio')) + '</label><textarea id="ap-bio">' + esc(a.bio || '') + '</textarea></div>' +
      '<div class="row2">' +
      '<div class="field"><label>' + esc(t('youtube')) + '</label><input id="ap-youtube" value="' + esc(a.youtubeUrl || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('instagram')) + '</label><input id="ap-instagram" value="' + esc(a.instagramUrl || '') + '"></div>' +
      '</div>' +
      '<div class="btn-row"><button class="btn btn-primary" type="submit">' + esc(t('apply')) + '</button></div></form>';
  }

  function wireGate() {
    var sf = $('#signin-form');
    if (sf) sf.addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/login', { method: 'POST', body: JSON.stringify({ email: $('#si-email').value.trim(), password: $('#si-password').value }) })
        .then(function (res) { try { localStorage.setItem(AUTH_KEY, res.token); } catch (x) {} return loadMe(); })
        .then(route).catch(function (err) { $('#gate-error').textContent = err.message; });
    });
    var uf = $('#signup-form');
    if (uf) uf.addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/users', { method: 'POST', body: JSON.stringify({ email: $('#su-email').value.trim(), password: $('#su-password').value, name: $('#su-name').value.trim() }) })
        .then(function (res) { try { localStorage.setItem(AUTH_KEY, res.token); } catch (x) {} return loadMe(); })
        .then(route).catch(function (err) { $('#gate-error').textContent = err.message; });
    });
    var af = $('#apply-form');
    if (af) af.addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/creator/apply', {
        method: 'POST', body: JSON.stringify({
          name: $('#ap-name').value, handle: $('#ap-handle').value, area: $('#ap-area').value,
          bio: $('#ap-bio').value, youtubeUrl: $('#ap-youtube').value, instagramUrl: $('#ap-instagram').value
        })
      }).then(loadMe).then(route).catch(function (err) { $('#gate-error').textContent = err.message; });
    });
  }

  // ---- list ----
  function renderList() {
    var rows = state.guides.map(function (g) {
      return '<tr>' +
        '<td><strong>' + esc(g.title || '(untitled)') + '</strong><br><span class="hint">' + esc(g.city || '') + '</span></td>' +
        '<td>' + statusPill(g.status) + '</td>' +
        '<td>' + yen(g.price) + '</td>' +
        '<td>' + esc((g.updatedAt || '').slice(0, 10)) + '</td>' +
        '<td style="white-space:nowrap">' +
        '<button class="btn btn-ghost btn-sm" data-edit="' + esc(g.id) + '">' + esc(t('edit')) + '</button> ' +
        '<button class="btn btn-danger btn-sm" data-del="' + esc(g.id) + '">' + esc(t('del')) + '</button>' +
        '</td></tr>';
    }).join('');
    $('#list-view').innerHTML =
      '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div><h1>' + esc(t('yourGuides')) + '</h1><p class="sub" style="margin:0">' + esc(state.me.user.name || '') + ' · ' + esc(state.me.user.email) + '</p></div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="new-guide">+ ' + esc(t('newGuide')) + '</button>' +
      '<button class="btn btn-ghost" id="signout">' + esc(lang === 'ja' ? 'サインアウト' : 'Sign out') + '</button></div></div></div>' +
      (state.guides.length
        ? '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>' + esc(t('colGuide')) + '</th><th>' + esc(t('colStatus')) + '</th><th>' + esc(t('colPrice')) + '</th><th>' + esc(t('colUpdated')) + '</th><th></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div></div>'
        : '<div class="card"><p class="empty">' + esc(t('noGuides')) + '</p></div>');
    showView('list');

    // No browser prompt() — create the draft and open the studio editor, where
    // the creator titles the guide in the Basics section.
    $('#new-guide').addEventListener('click', function () {
      api('/api/creator/guides', { method: 'POST', body: JSON.stringify({}) })
        .then(function (res) {
          state.guide = res.guide;
          renderEditor();
          var f = $('#f-title');
          if (f) { f.focus(); f.select(); }
        })
        .catch(function (e) { toast(e.message, true); });
    });
    $('#signout').addEventListener('click', function () {
      api('/api/logout', { method: 'POST' }).catch(function () {}).then(function () {
        try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
        state.me = null; boot();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#list-view [data-edit]'), function (b) {
      b.addEventListener('click', function () { openGuide(b.getAttribute('data-edit')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#list-view [data-del]'), function (b) {
      b.addEventListener('click', function () {
        if (!confirm(t('confirmDel'))) return;
        api('/api/creator/guides/' + b.getAttribute('data-del'), { method: 'DELETE' })
          .then(loadGuides).catch(function (e) { toast(e.message, true); });
      });
    });
  }

  function statusPill(s) {
    var map = { draft: ['', 'stDraft'], submitted: ['yellow', 'stSubmitted'], published: ['green', 'stPublished'], rejected: ['red', 'stRejected'] };
    var m = map[s] || ['', 'stDraft'];
    return '<span class="pill ' + m[0] + '">' + esc(t(m[1])) + '</span>';
  }

  // ---- editor ----
  function renderEditor() {
    var g = state.guide;
    var asAdmin = !!(state.me && state.me.isAdmin);
    var stops = (g.timeline || []).map(function (s) {
      return { day: s.day || 1, time: s.time || '', title: s.title || '', desc: s.desc || '', travelTime: s.travelTime || '', travelMode: s.travelMode || 'walk', image: s.image || '', googleMapsUrl: s.googleMapsUrl || '', mapPin: s.mapPin || null };
    });
    var incs = (g.includes && g.includes.length ? g.includes : ['']);

    var html =
      '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div style="min-width:220px"><h1>' + esc(g.title || '(untitled)') + '</h1><p class="sub" style="margin:0"><span id="ed-status">' + statusPill(g.status) + '</span> <span class="hint" id="save-state"></span></p></div>' +
      '<div class="btn-row">' +
      '<button class="btn btn-ghost btn-sm" id="ed-back">' + esc(asAdmin ? t('allGuides') : t('myGuides')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="ed-preview">' + esc(t('preview')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="ed-save">' + esc(t('saveDraft')) + '</button>' +
      (asAdmin
        ? (g.status === 'published' ? '' : '<button class="btn btn-primary btn-sm" id="ed-publish">' + esc(t('publish')) + '</button>')
        : '<button class="btn btn-primary btn-sm" id="ed-submit">' + esc(t('submit')) + '</button>') +
      '</div></div>' +
      (asAdmin ? '<div class="ok-note">' + esc(t('adminEditing')) + ' · ' + esc(g.creatorName || g.creatorHandle || '') + ' · ' + esc(g.status) + '</div>' : '') +
      (g.status === 'published' && !asAdmin ? '<div class="ok-note"><strong>' + esc(t('liveNote')) + '</strong></div>' : '') +
      (g.status === 'rejected' && g.reviewNote ? '<div class="problems"><strong>' + esc(t('reviewNote')) + '</strong><div style="margin-top:6px">' + esc(g.reviewNote) + '</div></div>' : '') +
      '<div id="ed-problems"></div>' +
      '<p class="hint" style="margin-top:12px">' + esc(t('autosaveOn')) + '</p>' +
      '</div>' +

      '<div class="card"><div class="section-title">' + esc(t('basics')) + '</div>' +
      '<div class="field"><label>' + esc(t('titleF')) + '</label><input id="f-title" maxlength="120" value="' + esc(g.title || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('tagline')) + '</label><input id="f-tagline" maxlength="200" value="' + esc(g.tagline || '') + '"></div>' +
      '<div class="row3">' +
      '<div class="field"><label>' + esc(t('city')) + '</label><input id="f-city" value="' + esc(g.city || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('prefecture')) + '</label><input id="f-prefecture" value="' + esc(g.prefecture || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('duration')) + '</label><input id="f-duration" value="' + esc(g.duration || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label>' + esc(t('category')) + '</label><select id="f-category">' +
      '<option value="">—</option>' + CATEGORIES.map(function (c) {
        return '<option value="' + c + '"' + (g.category === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>' + esc(t('season')) + '</label><div class="months">' +
      MONTHS.map(function (m) {
        var on = (g.season || []).indexOf(m) !== -1;
        return '<label class="month"><input type="checkbox" name="season" value="' + m + '"' + (on ? ' checked' : '') + '><span>' + m.toUpperCase() + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>' + esc(t('cover')) + '</label>' +
      '<div id="cover-preview">' + (g.heroImage ? '<img class="thumb" src="' + esc(g.heroImage) + '" alt="">' : '<div class="thumb-empty">' + esc(t('cover')) + '</div>') + '</div>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn btn-ghost btn-sm" id="pick-cover">' + esc(g.heroImage ? t('replacing') : t('chooseImage')) + '</button>' +
      '<input type="file" id="cover-input" accept="image/*" style="display:none"></div>' +
      '<p class="hint">' + esc(t('coverHint')) + '</p></div>' +
      '</div>' +

      '<div class="card"><div class="section-title">' + esc(t('pricing')) + '</div>' +
      '<div class="price-row"><div class="price-val" id="price-val">' + yen(g.price) + '</div>' +
      '<input type="range" id="f-price-range" min="100" max="2000" step="50" value="' + Number(g.price || 100) + '">' +
      '<input type="number" id="f-price" min="100" max="2000" step="50" value="' + Number(g.price || 100) + '" style="width:120px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--field-bg);color:var(--foreground);font-family:inherit;font-size:15px">' +
      '</div><p class="hint">' + esc(t('priceHint')) + '</p></div>' +

      '<div class="card"><div class="section-title">' + esc(t('explorePin')) + '</div>' +
      '<p class="hint" style="margin-top:-6px;margin-bottom:12px">' + esc(t('pinHint')) + '</p>' +
      '<div id="pin-map"></div>' +
      '<div class="coords-readout" id="pin-readout">' + (g.coordinates ? esc(t('pinSet')) + ' · ' + esc(fmtCoords(g.coordinates)) : esc(t('pinNotSet'))) + '</div>' +
      '<div class="field" style="margin-top:12px;max-width:280px"><label>' + esc(t('pinZoom')) + ' · <span id="zoom-val">' + Number(g.zoomLevel || 11) + '</span></label>' +
      '<input type="range" id="f-zoom" min="6" max="16" step="1" value="' + Number(g.zoomLevel || 11) + '" style="width:100%;accent-color:var(--accent)"></div>' +
      '</div>' +

      '<div class="card"><div class="section-title">' + esc(t('locations')) + '</div>' +
      '<p class="hint" style="margin-top:-6px;margin-bottom:14px">' + esc(t('locHint')) + '</p>' +
      '<div id="stops"></div>' +
      '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="add-stop">+ ' + esc(t('addStop')) + '</button></div>' +
      '</div>' +

      '<div class="card"><div class="section-title">' + esc(t('video')) + '</div>' +
      '<p class="hint" style="margin-top:-6px;margin-bottom:12px">' + esc(t('videoHint')) + '</p>' +
      '<div class="row3">' +
      '<div class="field"><label>' + esc(t('platform')) + '</label><select id="f-video-platform">' +
      ['youtube', 'instagram', 'tiktok', 'twitch', 'other'].map(function (p) {
        return '<option value="' + p + '"' + ((g.video || {}).platform === p ? ' selected' : '') + '>' + p.charAt(0).toUpperCase() + p.slice(1) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>' + esc(t('videoUrl')) + '</label><input id="f-video-url" value="' + esc((g.video || {}).url || '') + '"></div>' +
      '<div class="field"><label>' + esc(t('videoHandle')) + '</label><input id="f-video-handle" value="' + esc((g.video || {}).handle || '') + '"></div>' +
      '</div></div>' +

      '<div class="card"><div class="section-title">' + esc(t('includes')) + '</div>' +
      '<div id="incs">' + incs.map(function (v) { return incRow(v, 'inc-input'); }).join('') + '</div>' +
      '<div class="btn-row"><button class="btn btn-ghost btn-sm" id="add-inc">+ ' + esc(t('addInclude')) + '</button></div>' +
      '</div>' +

      '';

    $('#editor-view').innerHTML = html;
    showView('editor');
    wireEditor();
    renderStops();
    renderProblems();
    initPinMap();
  }

  function incRow(v, cls) {
    return '<div class="inc-row"><input class="' + cls + '" value="' + esc(v || '') + '" placeholder="' + esc(t('includes')) + '">' +
      '<button class="btn btn-ghost btn-sm" data-rm-inc="1">✕</button></div>';
  }

  function legText(leg) {
    if (!leg) return '';
    if (leg.distanceM < 20) return 'same spot as the previous stop';
    var d = leg.distanceM >= 1000 ? (leg.distanceM / 1000).toFixed(1) + ' km' : leg.distanceM + ' m';
    return d + ' · about ' + leg.durationMin + ' min on foot';
  }

  function stopReadout(i) {
    var s = (state.guide.timeline || [])[i];
    if (!s || !s.mapPin) return esc(t('pinMissing'));
    var parts = [esc(t('pinFound'))];
    if (s.title) parts.push(esc(s.title));
    parts.push(esc(fmtCoords(s.mapPin)));
    if (s.travelTime) parts.push(esc(s.travelTime));
    return parts.join(' · ') +
      ' <button class="btn btn-ghost btn-sm" data-clearpin="' + i + '">' + esc(t('clearPin')) + '</button>';
  }

  // ---- stops ----
  // Each stop STARTS from a Google Maps link. Pressing "Find & fill" pulls the
  // place name, the pin, and the distance from the previous stop. Every field
  // stays editable so the creator can correct anything it gets wrong.
  function renderStops() {
    var stops = state.guide.timeline || [];
    var el = $('#stops');
    if (!el) return;
    if (!stops.length) { el.innerHTML = '<p class="empty">' + esc(t('noStops')) + '</p>'; return; }
    el.innerHTML = stops.map(function (s, i) {
      return '<div class="stop" data-stop="' + i + '">' +
        '<div class="stop-head"><div class="stop-num">' + (i + 1) + '</div>' +
        '<div class="stop-name">' + esc(s.title || '(' + t('stopName') + ')') + '</div>' +
        '<button class="btn btn-ghost btn-sm" data-move="-1" data-i="' + i + '" title="' + esc(t('moveUp')) + '">↑</button>' +
        '<button class="btn btn-ghost btn-sm" data-move="1" data-i="' + i + '" title="' + esc(t('moveDown')) + '">↓</button>' +
        '<button class="btn btn-danger btn-sm" data-rmstop="' + i + '" title="' + esc(t('remove')) + '">✕</button>' +
        '</div>' +

        '<div class="field"><label>' + esc(t('mapsLink')) + '</label>' +
        '<div class="link-row"><input data-f="googleMapsUrl" value="' + esc(s.googleMapsUrl || '') + '" placeholder="https://maps.google.com/… or your Share link">' +
        '<button class="btn btn-primary btn-sm" data-findpin="' + i + '">' + esc(t('findPin')) + '</button></div>' +
        '<div class="coords-readout" data-pinreadout="' + i + '">' + stopReadout(i) + '</div>' +
        '</div>' +

        '<div class="field"><label>' + esc(t('stopName')) + '</label><input data-f="title" value="' + esc(s.title || '') + '"></div>' +

        '<div class="row3">' +
        '<div class="field"><label>' + esc(t('day')) + '</label><input data-f="day" type="number" min="1" value="' + Number(s.day || 1) + '"></div>' +
        '<div class="field"><label>' + esc(t('time')) + '</label><input data-f="time" type="time" value="' + esc(s.time || '') + '"></div>' +
        '<div class="field"><label>' + esc(t('travelMode')) + '</label><select data-f="travelMode">' +
        MODES.map(function (m) { return '<option value="' + m + '"' + (s.travelMode === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
        '</select></div></div>' +

        '<div class="field"><label>' + esc(t('stopDesc')) + '</label><textarea data-f="desc">' + esc(s.desc || '') + '</textarea></div>' +

        '<div class="field"><label>' + esc(t('travelHere')) + '</label><input data-f="travelTime" value="' + esc(s.travelTime || '') + '" placeholder="' + esc(t('travelTime')) + '"></div>' +

        '<div class="field"><label>' + esc(t('stopPhoto')) + '</label>' +
        '<div data-stopphoto="' + i + '">' + (s.image ? '<img class="thumb" src="' + esc(s.image) + '" alt="">' : '<div class="thumb-empty">' + esc(t('stopPhoto')) + '</div>') + '</div>' +
        '<div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-pickstop="' + i + '">' + esc(s.image ? t('replacing') : t('chooseImage')) + '</button></div>' +
        '</div></div>';
    }).join('');
  }

  function syncStopsFromDOM() {
    var stops = state.guide.timeline || [];
    Array.prototype.forEach.call(document.querySelectorAll('#stops .stop'), function (box) {
      var i = Number(box.getAttribute('data-stop'));
      if (!stops[i]) return;
      Array.prototype.forEach.call(box.querySelectorAll('[data-f]'), function (inp) {
        var f = inp.getAttribute('data-f');
        if (f === 'day') stops[i].day = Math.max(1, Number(inp.value) || 1);
        else if (f !== 'googleMapsUrl') stops[i][f] = inp.value;
        else stops[i].googleMapsUrl = inp.value;
      });
    });
  }
  function collectInputs(sel) {
    return Array.prototype.map.call(document.querySelectorAll(sel), function (i) { return i.value; })
      .filter(function (v) { return String(v).trim(); });
  }

  function collect() {
    syncStopsFromDOM();
    return {
      title: ($('#f-title') || {}).value || '',
      tagline: ($('#f-tagline') || {}).value || '',
      city: ($('#f-city') || {}).value || '',
      prefecture: ($('#f-prefecture') || {}).value || '',
      category: ($('#f-category') || {}).value || '',
      duration: ($('#f-duration') || {}).value || '',
      season: Array.prototype.filter.call(document.querySelectorAll('input[name=season]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      price: Number(($('#f-price') || {}).value || 100),
      zoomLevel: Number(($('#f-zoom') || {}).value || 11),
      // Set by the map click and the upload handler, not by a form field —
      // collect() must still send them or the pin/cover never persist.
      heroImage: state.guide.heroImage || '',
      coordinates: state.guide.coordinates || null,
      video: {
        platform: ($('#f-video-platform') || {}).value || 'youtube',
        url: ($('#f-video-url') || {}).value || '',
        handle: ($('#f-video-handle') || {}).value || ''
      },
      includes: collectInputs('.inc-input'),
      timeline: state.guide.timeline || []
    };
  }

  // ---- save ----
  function markDirty() {
    state.dirty = true;
    var el = $('#save-state');
    if (el) el.textContent = '· ' + t('unsaved');
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { save(true); }, 1500);
  }

  function save(auto) {
    if (!state.guide) return Promise.resolve();
    var patch = collect();
    var el = $('#save-state');
    if (el) el.textContent = '· ' + t('saving');
    return api('/api/creator/guides/' + state.guide.id, { method: 'PATCH', body: JSON.stringify(patch) })
      .then(function (res) {
        state.guide = res.guide;
        state.problems = res.problems || [];
        state.dirty = false;
        var pill = $('#ed-status');
        if (pill) pill.innerHTML = statusPill(state.guide.status);
        if (el) el.textContent = '· ' + t('saved');
        renderProblems();
        if (!auto) toast(t('saved'));
        return res;
      })
      .catch(function (e) { toast(e.message, true); throw e; });
  }

  function renderProblems() {
    var el = $('#ed-problems');
    if (!el || !state.guide) return;
    if (state.guide.status === 'published') { el.innerHTML = ''; return; }
    var p = state.problems || [];
    if (!p.length) { el.innerHTML = '<div class="ok-note">' + esc(t('readyToSubmit')) + '</div>'; return; }
    el.innerHTML = '<div class="problems"><strong>' + esc(t('missingTitle')) + '</strong><ul>' +
      p.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }

  // ---- map pin picker ----
  function initPinMap() {
    var el = $('#pin-map');
    if (!el || typeof maplibregl === 'undefined') return;
    if (state.map) { try { state.map.remove(); } catch (e) {} state.map = null; }
    var c = state.guide.coordinates;
    state.map = new maplibregl.Map({
      container: 'pin-map',
      style: theme() === 'light' ? LIGHT_STYLE : DARK_STYLE,
      center: c ? [Number(c[1]), Number(c[0])] : [138.5, 35.5],
      zoom: c ? Number(state.guide.zoomLevel || 11) : 5
    });
    state.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    var marker = new maplibregl.Marker({ color: '#D32F2F', draggable: true });
    state.marker = marker;
    if (c) marker.setLngLat([Number(c[1]), Number(c[0])]).addTo(state.map);
    marker.on('dragend', function () { setPin(marker.getLngLat()); });
    state.map.on('click', function (e) {
      marker.setLngLat(e.lngLat).addTo(state.map);
      setPin(e.lngLat);
    });
  }
  function setPin(lngLat) {
    if (!state.guide) return;
    state.guide.coordinates = [Number(lngLat.lat.toFixed(6)), Number(lngLat.lng.toFixed(6))];
    var el = $('#pin-readout');
    if (el) el.textContent = t('pinSet') + ' · ' + fmtCoords(state.guide.coordinates);
    markDirty();
  }

  // ---- images ----
  function resizeToJpeg(file, maxW) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, (maxW || 1600) / img.width);
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve(cv.toDataURL('image/jpeg', 0.85)); } catch (e) { reject(new Error('Could not process that image')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
      img.src = url;
    });
  }
  function uploadImage(file, maxW) {
    return resizeToJpeg(file, maxW).then(function (dataUrl) {
      return api('/api/creator/images', { method: 'POST', body: JSON.stringify({ guideId: state.guide.id, dataUrl: dataUrl }) });
    }).then(function (res) { return res.path; });
  }

  // ---- wiring ----
  function wireEditor() {
    var asAdmin = !!(state.me && state.me.isAdmin);
    var back = $('#ed-back');
    if (back) back.addEventListener('click', function () {
      save(true).catch(function () {}).then(function () {
        if (asAdmin) { try { history.replaceState({}, '', '/creator'); } catch (e) {} renderAdminList(); }
        else loadGuides();
      });
    });

    $('#ed-save').addEventListener('click', function () { save(false).catch(function () {}); });

    var pubBtn = $('#ed-publish');
    if (pubBtn) pubBtn.addEventListener('click', function () {
      pubBtn.disabled = true;
      save(true).then(function () {
        return api('/api/admin/guides/' + state.guide.id, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) });
      }).then(function (res) {
        state.guide = res.guide;
        toast(t('publishedNow'));
        renderEditor();
      }).catch(function (e) {
        if (e.problems) { state.problems = e.problems; renderProblems(); }
        toast(e.message, true);
      }).then(function () { pubBtn.disabled = false; });
    });

    $('#ed-submit').addEventListener('click', function () {
      var b = $('#ed-submit');
      b.disabled = true; b.textContent = t('submitting');
      save(true).then(function () {
        return api('/api/creator/guides/' + state.guide.id + '/submit', { method: 'POST' });
      }).then(function (res) {
        state.guide = res.guide;
        toast(lang === 'ja' ? '審査に提出しました' : 'Submitted for review');
        renderEditor();
      }).catch(function (e) {
        if (e.problems) { state.problems = e.problems; renderProblems(); }
        toast(e.message, true);
      }).then(function () { b.disabled = false; b.textContent = t('submit'); });
    });

    $('#ed-preview').addEventListener('click', showPreview);

    $('#pick-cover').addEventListener('click', function () { $('#cover-input').click(); });
    $('#cover-input').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      this.value = '';
      toast(lang === 'ja' ? 'アップロード中…' : 'Uploading…');
      uploadImage(f, 1600).then(function (path) {
        state.guide.heroImage = path;
        $('#cover-preview').innerHTML = '<img class="thumb" src="' + esc(path) + '" alt="">';
        $('#pick-cover').textContent = t('replacing');
        markDirty();
        toast(t('saved'));
      }).catch(function (e) { toast(e.message, true); });
    });

    var price = $('#f-price'), range = $('#f-price-range'), val = $('#price-val');
    function setPrice(v) {
      v = Math.max(100, Math.min(2000, Math.round(Number(v) || 100)));
      price.value = v; range.value = v; val.textContent = yen(v);
      markDirty();
    }
    range.addEventListener('input', function () { setPrice(this.value); });
    price.addEventListener('change', function () { setPrice(this.value); });

    $('#f-zoom').addEventListener('input', function () {
      $('#zoom-val').textContent = this.value;
      markDirty();
    });

    $('#add-stop').addEventListener('click', function () {
      syncStopsFromDOM();
      state.guide.timeline = (state.guide.timeline || []).concat([{ day: 1, time: '', title: '', desc: '', travelTime: '', travelMode: 'walk', image: '', googleMapsUrl: '', mapPin: null }]);
      renderStops(); markDirty();
    });

    $('#add-inc').addEventListener('click', function () { $('#incs').insertAdjacentHTML('beforeend', incRow('', 'inc-input')); markDirty(); });

    var view = $('#editor-view');
    view.addEventListener('input', function (e) {
      if (e.target && (e.target.id === 'f-price' || e.target.id === 'f-price-range' || e.target.id === 'f-zoom')) return;
      if (e.target && e.target.closest && e.target.closest('.stop')) {
        var box = e.target.closest('.stop');
        var i = Number(box.getAttribute('data-stop'));
        if (e.target.getAttribute('data-f') === 'title') {
          var name = box.querySelector('.stop-name');
          if (name) name.textContent = e.target.value || '(' + t('stopTitle') + ')';
        }
      }
      markDirty();
    });
    view.addEventListener('change', function (e) {
      if (e.target && e.target.closest && e.target.closest('.stop') && e.target.getAttribute('data-f') === 'title') {
        syncStopsFromDOM();
      }
      markDirty();
    });

    view.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var rmInc = btn.getAttribute('data-rm-inc');
      if (rmInc) { var row = btn.closest('.inc-row'); if (row) row.remove(); markDirty(); return; }
      var mv = btn.getAttribute('data-move');
      if (mv) {
        var i = Number(btn.getAttribute('data-i'));
        syncStopsFromDOM();
        var arr = state.guide.timeline;
        var j = i + Number(mv);
        if (j < 0 || j >= arr.length) return;
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        renderStops(); markDirty();
        return;
      }
      var rm = btn.getAttribute('data-rmstop');
      if (rm) {
        syncStopsFromDOM();
        var k = Number(rm);
        state.guide.timeline.splice(k, 1);
        renderStops(); markDirty();
        return;
      }
      var clr = btn.getAttribute('data-clearpin');
      if (clr) {
        syncStopsFromDOM();
        state.guide.timeline[Number(clr)].mapPin = null;
        renderStops(); markDirty();
        return;
      }
      var pick = btn.getAttribute('data-pickstop');
      if (pick) {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.addEventListener('change', function () {
          var f = inp.files[0]; if (!f) return;
          toast(lang === 'ja' ? 'アップロード中…' : 'Uploading…');
          uploadImage(f, 1400).then(function (path) {
            syncStopsFromDOM();
            state.guide.timeline[Number(pick)].image = path;
            renderStops(); markDirty();
            toast(t('saved'));
          }).catch(function (err) { toast(err.message, true); });
        });
        inp.click();
        return;
      }
      var fp = btn.getAttribute('data-findpin');
      if (fp) {
        var idx = Number(fp);
        var box = document.querySelector('#stops .stop[data-stop="' + idx + '"]');
        var url = box ? box.querySelector('[data-f="googleMapsUrl"]').value.trim() : '';
        var out = document.querySelector('[data-pinreadout="' + idx + '"]');
        if (!url) { toast(t('pinMissing'), true); return; }
        // The distance is measured from the previous stop's pin, if it has one.
        var prev = idx > 0 ? ((state.guide.timeline[idx - 1] || {}).mapPin || null) : null;
        btn.disabled = true; btn.textContent = t('finding');
        api('/api/creator/resolve-step', { method: 'POST', body: JSON.stringify({ url: url, fromPin: prev }) })
          .then(function (res) {
            syncStopsFromDOM();
            var st = state.guide.timeline[idx] || {};
            if (!st.title && res.name) st.title = res.name;
            st.mapPin = res.coordinates;
            st.googleMapsUrl = url;
            if (!st.travelTime && res.leg) st.travelTime = legText(res.leg);
            if (!st.travelMode) st.travelMode = 'walk';
            state.guide.timeline[idx] = st;
            renderStops(); markDirty();
            toast(t('pinFound') + ' · ' + (res.name || fmtCoords(res.coordinates)));
          })
          .catch(function (err) {
            if (out) out.textContent = err.message;
            toast(err.message, true);
          })
          .then(function () { btn.disabled = false; btn.textContent = t('findPin'); });
      }
    });
  }

  // ---- preview ----
  function showPreview() {
    syncStopsFromDOM();
    var g = Object.assign({}, state.guide, collect());
    var html = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px">' +
      '<div class="section-title" style="margin:0">' + esc(t('previewTitle')) + '</div>' +
      '<button class="btn btn-ghost btn-sm" id="close-preview">' + esc(t('closePreview')) + '</button></div>' +
      '<div class="preview-box" style="margin-top:14px">' +
      (g.heroImage ? '<img src="' + esc(g.heroImage) + '" alt="">' : '') +
      '<h2 style="margin-top:14px">' + esc(g.title || '') + '</h2>' +
      '<p class="sub">' + esc(g.tagline || '') + '</p>' +
      '<p class="hint">' + esc([g.city, g.prefecture, g.duration, g.category].filter(Boolean).join(' · ')) + ' · ' + yen(g.price) + '</p>' +
      ((g.season || []).length ? '<p class="hint">' + esc(t('season')) + ': ' + esc(g.season.join(', ').toUpperCase()) + '</p>' : '') +
      ((g.includes || []).length ? '<div style="margin-top:14px"><strong>' + esc(t('includes')) + '</strong><ul>' +
        g.includes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
      ((g.timeline || []).length ? '<div style="margin-top:14px"><strong>' + esc(t('locations')) + '</strong>' +
        g.timeline.map(function (s, i) {
          return '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">' +
            '<div><strong>' + (i + 1) + '. ' + esc(s.title || '') + '</strong>' +
            (s.time ? ' <span class="hint">' + esc(s.time) + '</span>' : '') + '</div>' +
            '<div class="hint">' + esc(s.desc || '') + '</div>' +
            (s.mapPin ? '<div class="coords-readout">' + esc(fmtCoords(s.mapPin)) + '</div>' : '<div class="coords-readout" style="color:var(--danger)">' + esc(t('pinMissing')) + '</div>') +
            '</div>';
        }).join('') + '</div>' : '') +
      (g.video && g.video.url ? '<p class="hint" style="margin-top:14px">' + esc(t('video')) + ': <a href="' + esc(g.video.url) + '" target="_blank" rel="noopener">' + esc(g.video.url) + '</a></p>' : '') +
      '</div></div>';
    $('#editor-view').insertAdjacentHTML('afterbegin', '<div id="preview-host">' + html + '</div>');
    $('#close-preview').addEventListener('click', function () {
      var host = document.getElementById('preview-host');
      if (host) host.remove();
    });
  }

  // ---------------------------------------------------------------- boot
  function loadMe() { return api('/api/creator/me').then(function (res) { state.me = Object.assign({ signedIn: true }, res); return res; }); }
  function loadGuides() {
    return api('/api/creator/guides').then(function (res) { state.guides = res.guides || []; renderList(); return res; });
  }
  function openGuide(id) {
    return api('/api/creator/guides/' + id).then(function (res) {
      state.guide = res.guide; state.problems = res.problems || []; renderEditor(); return res;
    }).catch(function (e) { toast(e.message, true); });
  }
  function guideIdFromUrl() {
    try { return new URLSearchParams(location.search).get('guide') || ''; } catch (e) { return ''; }
  }

  // Admins get the same editor, but for every guide in any status.
  function renderAdminList() {
    api('/api/admin/guides').then(function (res) {
      var list = res.guides || [];
      var rows = list.map(function (g) {
        return '<tr>' +
          '<td><strong>' + esc(g.title || '(untitled)') + '</strong><br><span class="hint">' + esc(g.city || '') + '</span></td>' +
          '<td>' + esc(g.creatorName || g.creatorHandle || '—') + '</td>' +
          '<td>' + statusPill(g.status) + '</td>' +
          '<td>' + yen(g.price) + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-edit="' + esc(g.id) + '">' + esc(t('edit')) + '</button></td>' +
          '</tr>';
      }).join('');
      $('#list-view').innerHTML =
        '<div class="card"><h1>' + esc(t('adminPick')) + '</h1><p class="sub">' + esc(t('adminEditing')) + '</p>' +
        (list.length
          ? '<div class="table-wrap"><table class="table"><thead><tr>' +
            '<th>' + esc(t('colGuide')) + '</th><th>Creator</th><th>' + esc(t('colStatus')) + '</th><th>' + esc(t('colPrice')) + '</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<p class="empty">' + esc(t('noGuides')) + '</p>') +
        '</div>';
      showView('list');
      Array.prototype.forEach.call(document.querySelectorAll('#list-view [data-edit]'), function (b) {
        b.addEventListener('click', function () { openGuide(b.getAttribute('data-edit')); });
      });
    }).catch(function (e) { toast(e.message, true); });
  }

  function route() {
    if (!state.me || !state.me.signedIn) return renderGate();
    if (state.me.isAdmin) {
      var want = guideIdFromUrl();
      if (want) return openGuide(want);
      return renderAdminList();
    }
    if (!state.me.isCreator) return renderGate();
    return loadGuides();
  }
  function boot() {
    lang = loadSettings().lang === 'ja' ? 'ja' : 'en';
    var ls = $('#lang-select'); if (ls) ls.value = lang;
    applyTheme();
    loadMe().then(route).catch(function () {
      state.me = { signedIn: false };
      renderGate();
    });
  }

  // ---------------------------------------------------------------- init
  document.addEventListener('DOMContentLoaded', function () {
    $('#page-back-btn').addEventListener('click', function () { location.href = '/'; });
    $('#theme-btn').addEventListener('click', function () {
      saveSettings({ theme: theme() === 'light' ? 'dark' : 'light' });
      applyTheme();
      if (state.view === 'editor' && state.guide) { syncStopsFromDOM(); renderEditor(); }
    });
    $('#lang-select').addEventListener('change', function () {
      lang = this.value;
      saveSettings({ lang: lang });
      if (state.view === 'editor' && state.guide) { syncStopsFromDOM(); renderEditor(); }
      else if (state.view === 'list') renderList();
      else renderGate();
      var pt = $('#page-title'); if (pt) pt.textContent = t('title');
    });
    boot();
  });
})();
