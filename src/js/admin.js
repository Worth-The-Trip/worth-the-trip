(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const TOAST_KEY = 'wtt_admin_token';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let guidesCache = [];
  let guideFilter = 'submitted';
  let currentTab = 'users';

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function api(path, options) {
    const token = localStorage.getItem(TOAST_KEY) || '';
    options = options || {};
    if ((options.method || 'GET').toUpperCase() === 'GET') {
      path += (path.indexOf('?') === -1 ? '?' : '&') + '_ts=' + Date.now();
    }
    return fetch(path, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error(body.error || 'Request failed');
        e.status = r.status;
        throw e;
      }
      return body;
    });
  }

  function show(el, hide) {
    const hideList = Array.isArray(hide) ? hide : (hide ? [hide] : []);
    el.forEach((e) => { e.style.display = hideList.indexOf(e) !== -1 ? 'none' : 'block'; });
  }

  function loadToken() { return localStorage.getItem(TOAST_KEY); }

  async function login(password) {
    const res = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    localStorage.setItem(TOAST_KEY, res.token);
    try {
      await loadAll();
    } catch (e) {
      toast('Admin load failed: ' + (e.message || 'unknown error'));
    }
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem(TOAST_KEY);
    location.reload();
  }

  async function loadAll() {
    const u = await api('/api/users');
    renderUsers(u.users);
    const p = await api('/api/purchases');
    renderPurchases(p.purchases);
    const f = await api('/api/free-guides');
    renderFreeGuides(f.claims);
    const c = await api('/api/creators');
    renderCreators(c.creators);
    updateCreatorTabBadge(c.creators);
    const g = await api('/api/admin/guides');
    renderGuides(g.guides);
    updateGuideTabBadge(g.guides);
    show([$('#login-view'), $('#admin-view')], null);
    $('#login-view').style.display = 'none';
    $('#admin-view').style.display = 'block';
    showTabs(currentTab);
  }

  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    showTabs(tab.dataset.tab);
  });

  function showTabs(name) {
    currentTab = name;
    document.querySelectorAll('#tabs .tab').forEach((t) => {
      const panel = document.getElementById('panel-' + t.dataset.tab);
      if (panel) panel.style.display = (t.dataset.tab === name) ? 'block' : 'none';
    });
  }

  function renderUsers(users) {
    const el = $('#panel-users');
    if (!users || !users.length) { el.innerHTML = '<p class="empty">No users.</p>'; return; }
    let html = '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Name</th><th>Email</th><th>Phone</th><th>Created</th><th>Purchases</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>';
    users.forEach((u) => {
      const banned = !!u.banned;
      html += '<tr>' +
        `<td><strong>${esc(u.name || '—')}</strong></td>` +
        `<td>${esc(u.email)}</td>` +
        `<td>${esc(u.phone || '—')}</td>` +
        `<td>${esc(new Date(u.createdAt).toLocaleDateString())}</td>` +
        `<td>${u.purchaseCount ?? 0}</td>` +
        `<td>${banned ? '<span class="pill orange">Banned</span>' : '<span class="pill green">Active</span>'}</td>` +
        '<td style="white-space:nowrap">' +
          `<button class="btn btn-sm btn-primary" data-edit-id="${esc(u.id)}">Edit</button> ` +
          `<button class="btn btn-sm ${banned ? 'btn-ghost' : 'btn-danger'}" data-ban-id="${esc(u.id)}" data-banned="${banned ? 0 : 1}">${banned ? 'Unban' : 'Ban'}</button> ` +
          `<button class="btn btn-sm btn-danger" data-del-id="${esc(u.id)}">Delete</button>` +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;

    el.querySelectorAll('[data-edit-id]').forEach((b) => {
      b.addEventListener('click', () => openUserModal(b.dataset.editId));
    });

    el.querySelectorAll('[data-ban-id]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.banId;
        const ban = b.dataset.banned === '1';
        const msg = ban
          ? 'Ban this user? They will be logged out immediately and will not be able to sign in.'
          : 'Lift the ban on this user? They will be able to sign in again.';
        if (!confirm(msg)) return;
        try {
          await api('/api/users/' + id, { method: 'PATCH', body: JSON.stringify({ banned: ban }) });
          toast(ban ? 'User banned' : 'Ban lifted');
          loadAll();
        } catch (e) { toast(e.message); }
      });
    });

    el.querySelectorAll('[data-del-id]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.delId;
        if (!confirm('Delete this user? Their account, sessions and purchase history will be removed. This cannot be undone.')) return;
        try {
          await api('/api/users/' + id, { method: 'DELETE' });
          toast('User deleted');
          loadAll();
        } catch (e) { toast(e.message); }
      });
    });
  }

  async function openUserModal(id) {
    let u;
    try {
      const r = await api('/api/users/' + id);
      u = r.user;
    } catch (e) { toast(e.message); return; }
    $('#um-id').value = u.id;
    $('#um-name').value = u.name || '';
    $('#um-email').value = u.email || '';
    $('#um-phone').value = u.phone || '';
    $('#um-address').value = u.address || '';
    $('#um-password').value = '';
    $('#user-modal-title').textContent = 'Edit ' + (u.name || u.email);
    $('#user-modal').classList.add('active');
  }

  function closeUserModal() { $('#user-modal').classList.remove('active'); }

  $('#um-promote-creator').addEventListener('click', async () => {
    const id = $('#um-id').value;
    if (!id) return;
    if (!confirm('Promote this user to Creator? They will get immediate access to the creator studio.')) return;
    try {
      await api('/api/admin/users/' + id + '/promote-creator', { method: 'POST' });
      toast('User promoted to Creator');
      closeUserModal();
      loadAll();
    } catch (e) { toast(e.message); }
  });

  $('#user-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#um-id').value;
    const body = {
      name: $('#um-name').value.trim(),
      email: $('#um-email').value.trim(),
      phone: $('#um-phone').value.trim(),
      address: $('#um-address').value.trim(),
    };
    const pw = $('#um-password').value;
    if (pw) body.password = pw;
    try {
      await api('/api/users/' + id, { method: 'PATCH', body: JSON.stringify(body) });
      closeUserModal();
      toast('User updated');
      loadAll();
    } catch (err) { toast(err.message); }
  });

  $('#um-cancel').addEventListener('click', closeUserModal);
  $('#user-modal').addEventListener('click', (e) => { if (e.target.id === 'user-modal') closeUserModal(); });

  function renderPurchases(purchases) {
    const el = $('#panel-purchases');
    let html = '<div class="btn-row" style="margin-bottom:14px;align-items:center">' +
      '<button class="btn btn-primary btn-sm" id="sync-stripe-btn" type="button">Sync from Stripe</button>' +
      '<span class="sub" id="sync-stripe-msg">Record completed payments Stripe holds that the site never captured (e.g. taken before the webhook existed). Needs a current STRIPE_SECRET_KEY.</span>' +
      '</div>';
    if (!purchases || !purchases.length) {
      html += '<p class="empty">No purchases.</p>';
      el.innerHTML = html;
      wireStripeSync();
      return;
    }
    html += '<div class="field"><label style="display:flex;gap:8px;flex-wrap:wrap">Email <input id="f-email" type="text" placeholder="filter by e-mail"></label>' +
      '<label style="display:flex;gap:8px;flex-wrap:wrap">Guide <input id="f-guide" type="text" placeholder="filter by guide"></label></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Guide</th><th>Buyer email</th><th>Amount</th><th>Currency</th><th>Date</th><th>Type</th>' +
      '</tr></thead><tbody>';
    purchases.forEach((p) => {
      const type = p.type === 'subscription' ? 'Subscription' : 'Purchased';
      const sign = p.currency === 'jpy' ? '¥' : (p.currency === 'usd' ? '$' : p.currency);
      html += '<tr>' +
        `<td><strong>${p.guideTitle || p.guideId || '—'}</strong></td>` +
        `<td>${p.buyerEmail || '—'}</td>` +
        `<td>${p.amount != null ? sign + Number(p.amount).toFixed(2) : '—'}</td>` +
        `<td>${p.currency}</td>` +
        `<td>${new Date(p.purchasedAt * 1000).toLocaleString()}</td>` +
        `<td><span class="pill ${p.type === 'subscription' ? 'orange' : 'green'}">${type}</span></td>` +
        '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    wireStripeSync();
  }

  function wireStripeSync() {
    const btn = $('#sync-stripe-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const msg = $('#sync-stripe-msg');
      btn.disabled = true;
      if (msg) msg.textContent = 'Contacting Stripe…';
      try {
        const r = await api('/api/admin/purchases/sync', { method: 'POST', body: '{}' });
        if (msg) msg.textContent = 'Added ' + r.added + ', skipped ' + r.skipped + ' — ' + r.total + ' recorded.';
        loadAll();
      } catch (e) {
        if (msg) msg.textContent = 'Sync failed: ' + e.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function renderFreeGuides(claims) {
    const el = $('#panel-freeguides');
    const list = claims || [];
    let html = '<p class="sub">The first guide a customer unlocks is free, limited to <strong>one per email</strong>. ' +
      'The claim is recorded on the server, so the offer never reappears for that account on any device.</p>' +
      '<p class="sub"><strong>' + list.length + '</strong> free guide' + (list.length === 1 ? '' : 's') + ' claimed.</p>';
    if (!list.length) { el.innerHTML = html + '<p class="empty">No free guides claimed yet.</p>'; return; }

    html += '<div class="field"><label style="display:flex;gap:8px;flex-wrap:wrap">Email ' +
      '<input id="fg-email" type="text" placeholder="filter by e-mail"></label></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Email</th><th>Guide</th><th>Claimed</th>' +
      '</tr></thead><tbody>';
    list.forEach((c) => {
      html += '<tr>' +
        `<td><strong>${esc(c.email || '—')}</strong></td>` +
        `<td>${esc(c.guideId || '—')}</td>` +
        `<td>${c.claimedAt ? new Date(c.claimedAt).toLocaleString() : '—'}</td>` +
        '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;

    const box = $('#fg-email');
    if (box) box.addEventListener('input', () => {
      const q = box.value.trim().toLowerCase();
      el.querySelectorAll('tbody tr').forEach((tr) => {
        tr.style.display = (!q || tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
      });
    });
  }

  function renderCreators(creators) {
    const el = $('#panel-creators');
    const head = '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn btn-ghost btn-sm" id="refresh-followers">Refresh follower counts</button>' +
      '<span class="hint" id="followers-status"></span></div>';
    if (!creators || !creators.length) { el.innerHTML = head + '<p class="empty">No creator applications.</p>'; }
    let html = head + '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Name</th><th>Email</th><th>Area</th><th>Status</th><th>Guides</th><th>Applied</th><th></th>' +
      '</tr></thead><tbody>';
    creators.forEach((c) => {
      const pill = c.status === 'accepted' ? '<span class="pill green">Accepted</span>' :
                   c.status === 'rejected' ? '<span class="pill orange">Rejected</span>' :
                   '<span class="pill yellow">Pending</span>';
      html += '<tr>' +
        `<td><strong>${c.name || '—'}</strong></td>` +
        `<td>${c.email || '—'}</td>` +
        `<td>${c.area || '—'}</td>` +
        `<td>${pill}</td>` +
        `<td>${c.guidesCount ?? 0}</td>` +
        `<td>${c.appliedAt ? new Date(c.appliedAt).toLocaleDateString() : '—'}</td>` +
        '<td style="white-space:nowrap">' +
        `<button class="btn btn-sm ${c.status === 'accepted' ? 'btn-ghost' : 'btn-primary'}` + (c.status === 'accepted' ? '' : ' glass') + `" data-set="${c.id}" data-status="accepted">Approve</button> ` +
        `<button class="btn btn-sm ${c.status === 'rejected' ? 'btn-ghost' : 'btn-danger'}" data-set="${c.id}" data-status="rejected">Reject</button> ` +
        `<button class="btn btn-sm btn-danger" data-del="${c.id}">Delete</button>` +
        `</td>` +
        '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;

    el.querySelectorAll('[data-set]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.set;
        const status = b.dataset.status;
        await api('/api/creators/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
        loadAll();
      });
    });

    el.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.del;
        if (!confirm('Delete this creator application? This cannot be undone.')) return;
        try {
          await api('/api/creators/' + id, { method: 'DELETE' });
          toast('Creator application deleted');
          loadAll();
        } catch (e) { toast(e.message); }
      });
    });

    const rf = el.querySelector('#refresh-followers');
    if (rf) {
      rf.addEventListener('click', async () => {
        const status = el.querySelector('#followers-status');
        rf.disabled = true;
        if (status) status.textContent = 'Refreshing…';
        try {
          const res = await api('/api/admin/followers/refresh', { method: 'POST' });
          const n = (res && res.creators) ? res.creators.length : 0;
          if (status) status.textContent = n ? 'Updated ' + n + ' creator(s).' : 'No approved creators yet.';
        } catch (err) {
          if (status) status.textContent = err.message;
        } finally {
          rf.disabled = false;
        }
      });
    }
  }

  function gStatusPill(status) {
    const label = { draft: 'Draft', submitted: 'In review', published: 'Published', rejected: 'Rejected' }[status] || status;
    const cls = { submitted: 'yellow', published: 'green', rejected: 'orange' }[status] || '';
    return '<span class="pill ' + cls + '">' + esc(label) + '</span>';
  }

  function updateGuideTabBadge(guides) {
    const n = (guides || []).filter((g) => g.status === 'submitted').length;
    const tab = document.querySelector('[data-tab="guides"]');
    if (tab) tab.textContent = n ? 'Guides (' + n + ')' : 'Guides';
  }

  function updateCreatorTabBadge(creators) {
    const n = (creators || []).filter((c) => c.status === 'pending').length;
    const tab = document.querySelector('[data-tab="creators"]');
    if (tab) tab.textContent = n ? 'Creators (' + n + ')' : 'Creators';
  }

  function guideDetailHtml(g) {
    const stops = (g.timeline || []);
    let h = '<div style="padding:14px 4px">';
    if (g.heroImage) h += '<img src="' + esc(g.heroImage) + '" alt="" style="max-width:260px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px" onerror="this.style.display=\'none\'">';
    h += '<div><strong>' + esc(g.title || '') + '</strong> — ' + esc(g.tagline || '') + '</div>';
    h += '<div class="sub" style="margin:8px 0">' +
      esc([g.city, g.prefecture, g.duration, g.category].filter(Boolean).join(' · ')) +
      ' · ¥' + Number(g.price || 0).toLocaleString() +
      ((g.season || []).length ? ' · season: ' + esc(g.season.join(', ').toUpperCase()) : '') + '</div>';
    h += '<div class="sub">Explore pin: ' + (g.coordinates ? esc(g.coordinates[0].toFixed(5) + ', ' + g.coordinates[1].toFixed(5)) : '<strong>missing</strong>') +
      ' · zoom ' + esc(String(g.zoomLevel || '')) + '</div>';
    h += '<div class="sub">Source video: ' + (g.video && g.video.url ? '<a href="' + esc(g.video.url) + '" target="_blank" rel="noopener">' + esc(g.video.url) + '</a>' : '<strong>missing</strong>') + '</div>';
    if ((g.includes || []).length) {
      h += '<div style="margin-top:10px"><strong>Includes</strong><ul style="margin:6px 0 0 18px">' +
        g.includes.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    }
    h += '<div style="margin-top:10px"><strong>Stops (' + stops.length + ')</strong>';
    if (!stops.length) h += ' <span class="sub">none</span>';
    h += stops.map((s, i) => '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">' +
      '<div><strong>' + (i + 1) + '. ' + esc(s.title || '') + '</strong>' + (s.time ? ' <span class="sub">' + esc(s.time) + '</span>' : '') + '</div>' +
      '<div class="sub">' + esc(s.desc || '') + '</div>' +
      '<div class="sub">' + (s.mapPin ? 'pin ' + esc(s.mapPin[0].toFixed(5) + ', ' + s.mapPin[1].toFixed(5)) : '<strong>no pin</strong>') +
      (s.travelTime ? ' · ' + esc(s.travelTime) + ' by ' + esc(s.travelMode || '') : '') + '</div>' +
      (s.image ? '<img src="' + esc(s.image) + '" alt="" style="max-width:160px;border-radius:6px;margin-top:6px" onerror="this.style.display=\'none\'">' : '') +
      '</div>').join('');
    h += '</div>';
    if (g.reviewNote) h += '<div class="sub" style="margin-top:10px">Last review note: ' + esc(g.reviewNote) + '</div>';
    h += '</div>';
    return h;
  }

  function renderGuides(guides) {
    guidesCache = guides || [];
    const el = $('#panel-guides');
    const counts = {};
    guidesCache.forEach((g) => { counts[g.status] = (counts[g.status] || 0) + 1; });
    const filters = ['submitted', 'published', 'draft', 'rejected', 'all'];
    const tabsHtml = filters.map((s) =>
      '<button class="btn btn-sm ' + (guideFilter === s ? 'btn-primary' : 'btn-ghost') + '" data-gfilter="' + s + '">' +
      (s === 'all' ? 'All' : gStatusPill(s)) + ' (' + (s === 'all' ? guidesCache.length : (counts[s] || 0)) + ')</button>').join(' ');

    let html = '<div class="card"><div class="btn-row" style="margin-bottom:14px">' + tabsHtml + '</div>';
    const list = guidesCache.filter((g) => guideFilter === 'all' || g.status === guideFilter);
    if (!list.length) {
      html += '<p class="empty">Nothing in this bucket.</p></div>';
      el.innerHTML = html;
      wireGuideFilters();
      return;
    }
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Guide</th><th>Creator</th><th>Status</th><th>Price</th><th>Stops</th><th>Updated</th><th></th>' +
      '</tr></thead><tbody>';
    list.forEach((g) => {
      html += '<tr>' +
        '<td><strong>' + esc(g.title || '(untitled)') + '</strong><br><span class="sub">' + esc(g.city || '') + '</span></td>' +
        '<td>' + esc(g.creatorName || g.creatorHandle || '—') + '</td>' +
        '<td>' + gStatusPill(g.status) + '</td>' +
        '<td>¥' + Number(g.price || 0).toLocaleString() + '</td>' +
        '<td>' + (g.timeline || []).length + '</td>' +
        '<td>' + esc(String(g.updatedAt || '').slice(0, 10)) + '</td>' +
        '<td style="white-space:nowrap">' +
        '<button class="btn btn-sm btn-ghost" data-gview="' + esc(g.id) + '">View</button> ' +
        '<a class="btn btn-sm btn-ghost" href="/creator?guide=' + esc(encodeURIComponent(g.id)) + '" target="_blank" rel="noopener">Edit</a> ' +
        (g.status !== 'published' ? '<button class="btn btn-sm btn-primary" data-gpub="' + esc(g.id) + '">Publish</button> ' : '') +
        (g.status !== 'rejected' ? '<button class="btn btn-sm btn-danger" data-grej="' + esc(g.id) + '">Reject</button> ' : '') +
        '<button class="btn btn-sm btn-danger" data-gdel="' + esc(g.id) + '">Delete</button>' +
        '</td></tr>' +
        '<tr id="gdetail-' + esc(g.id) + '" style="display:none"><td colspan="7"></td></tr>';
    });
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
    wireGuideFilters();
    wireGuideActions();
  }

  function wireGuideFilters() {
    document.querySelectorAll('#panel-guides [data-gfilter]').forEach((b) => {
      b.addEventListener('click', () => { guideFilter = b.dataset.gfilter; renderGuides(guidesCache); });
    });
  }

  function wireGuideActions() {
    document.querySelectorAll('#panel-guides [data-gview]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.gview;
        const row = document.getElementById('gdetail-' + id);
        if (!row) return;
        const g = guidesCache.find((x) => x.id === id);
        if (row.style.display === 'none') {
          row.querySelector('td').innerHTML = guideDetailHtml(g || {});
          row.style.display = '';
          b.textContent = 'Hide';
        } else {
          row.style.display = 'none';
          b.textContent = 'View';
        }
      });
    });
    document.querySelectorAll('#panel-guides [data-gpub]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.gpub;
        if (!confirm('Publish this guide? It goes live on the Explore page immediately.')) return;
        try {
          await api('/api/admin/guides/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) });
          toast('Published');
          loadAll();
        } catch (e) {
          toast(e.message + (e.problems ? ' — ' + e.problems.join(', ') : ''));
        }
      });
    });
    document.querySelectorAll('#panel-guides [data-grej]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.grej;
        const note = prompt('What needs changing? (sent to the creator)');
        if (note === null) return;
        try {
          await api('/api/admin/guides/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', reviewNote: note }) });
          toast('Sent back to the creator');
          loadAll();
        } catch (e) { toast(e.message); }
      });
    });
    document.querySelectorAll('#panel-guides [data-gdel]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.gdel;
        const g = guidesCache.find((x) => x.id === id);
        const label = (g && (g.title || g.id)) || 'this guide';
        if (!confirm('Delete "' + label + '" permanently?\n\nIt disappears from the site immediately and cannot be undone. The creator is not notified.')) return;
        try {
          await api('/api/admin/guides/' + id, { method: 'DELETE' });
          toast('Guide deleted');
          loadAll();
        } catch (e) { toast(e.message); }
      });
    });
  }

  async function init() {
    const token = loadToken();
    if (!token) {
      show([$('#login-view'), $('#admin-view')], [$('#admin-view')]);
      return;
    }
    try {
      await api('/api/users');
      loadAll();
    } catch (e) {
      localStorage.removeItem(TOAST_KEY);
      show([$('#login-view'), $('#admin-view')], [$('#admin-view')]);
      toast('Session expired or invalid — please log in again.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  $('#admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#admin-password').value;
    try { await login(pw); } catch (err) { toast(err.message); }
  });

  $('#logout-btn').addEventListener('click', async () => {
    await logout();
  });

  $('#page-back-btn').addEventListener('click', () => { location.href = '/'; });
})();
