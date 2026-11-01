(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const AUTH_KEY = 'wtt_session';

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function api(path, options) {
    const token = localStorage.getItem(AUTH_KEY) || '';
    options = options || {};
    if ((options.method || 'GET').toUpperCase() === 'GET') {
      path += (path.indexOf('?') === -1 ? '?' : '&') + '_ts=' + Date.now();
    }
    return fetch(path, {
      ...options,
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

  const isVerifying = location.search.includes('verified=1');
  function isLoggedIn() { return !!localStorage.getItem(AUTH_KEY); }

  function loadCurrentUser() {
    return api('/api/me');
  }

  async function boot() {
    if (isVerifying) return;
    try {
      const u = await loadCurrentUser();
      showDashboard(u);
      loadPurchases().catch(() => {});
      loadCreatorAccess();
    } catch (e) {
      showAuth();
    }
  }

  function loadCreatorAccess() {
    api('/api/creator/me')
      .then((me) => {
        if (me && me.isCreator) $('#creator-card').style.display = 'block';
      })
      .catch(() => {});
  }

  function showAuth() {
    $('#auth-view').style.display = 'block';
    $('#dashboard-view').style.display = 'none';
    $('#auth-error').textContent = '';
  }

  function clearAuthForms() {
    $('#signin-form').reset();
    $('#signup-form').reset();
  }

  function showDashboard(user) {
    $('#auth-view').style.display = 'none';
    $('#dashboard-view').style.display = 'block';
    $('#avatar-preview').src = user.avatar || '/public/Branding/WTT profile.svg';
    $('#dash-name').textContent = user.name || 'Hello there';
    $('#dash-email').textContent = user.email;
    const handle = [user.handle, user.area].filter(Boolean).join(' · ');
    $('#dash-handle').textContent = handle;
    $('#dash-handle').style.display = handle ? '' : 'none';
    $('#dash-bio').textContent = user.bio || '';
    $('#dash-bio').style.display = user.bio ? '' : 'none';
  }

  function enterDashboard(user) {
    clearAuthForms();
    showDashboard(user);
    loadPurchases().catch(() => {});
    loadCreatorAccess();
  }

  $('#signin-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#si-email').value.trim();
    const password = $('#si-password').value;
    $('#auth-error').textContent = '';
    api('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      .then((res) => {
        localStorage.setItem(AUTH_KEY, res.token);
        return loadCurrentUser();
      })
      .then(enterDashboard)
      .catch((err) => { $('#auth-error').textContent = err.message; });
  });

  $('#signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#su-email').value.trim();
    const password = $('#su-password').value;
    const name = $('#su-name').value.trim();
    $('#auth-error').textContent = '';
    api('/api/users', { method: 'POST', body: JSON.stringify({ email, password, name }) })
      .then((res) => {
        if (res.requiresVerification) {
          $('#auth-error').textContent = 'Verification email sent to your address, please click the link provided.';
          $('#auth-error').className = 'success';
          const resendBtn = $('#signup-resend');
          if (resendBtn) resendBtn.style.display = 'inline-flex';
          if (typeof showVerifyPopup === 'function') showVerifyPopup(email);
          return;
        }
        return api('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })
          .then((lr) => {
            localStorage.setItem(AUTH_KEY, lr.token);
            return loadCurrentUser();
          });
      })
      .then((user) => { if (user) enterDashboard(user); })
      .catch((err) => {
        $('#auth-error').textContent = err.message || 'Signup failed';
        $('#auth-error').className = 'error';
      });
  });

  const signupToggle = $('#signup-toggle');
  const signupPanel = $('#signup-panel');
  const signupChevron = $('#signup-chevron');
  if (signupToggle && signupPanel) {
    signupToggle.addEventListener('click', () => {
      const open = signupPanel.style.maxHeight !== '0px' && signupPanel.style.maxHeight !== '';
      if (open) {
        signupPanel.style.maxHeight = '0px';
        signupPanel.style.opacity = '0';
        if (signupChevron) signupChevron.style.transform = 'rotate(0deg)';
      } else {
        signupPanel.style.maxHeight = signupPanel.scrollHeight + 'px';
        signupPanel.style.opacity = '1';
        if (signupChevron) signupChevron.style.transform = 'rotate(180deg)';
      }
    });
  }

  const resendBtn = $('#signup-resend');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = $('#su-email').value.trim();
      if (!email) return;
      resendBtn.disabled = true;
      try {
        await api('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
        toast('Verification email resent');
      } catch (err) {
        toast(err.message || 'Could not resend email');
      } finally {
        resendBtn.disabled = false;
      }
    });
  }

  const profileModal = $('#profile-modal');
  const pwModal = $('#pw-modal');

  function openModal(el) { el.classList.add('open'); }
  function closeModal(el) { el.classList.remove('open'); }

  function fillProfileForm(u) {
    $('#pf-name').value = u.name || '';
    $('#pf-handle').value = u.handle || '';
    $('#pf-area').value = u.area || '';
    $('#pf-bio').value = u.bio || '';
    $('#pf-youtube').value = u.youtubeUrl || '';
    $('#pf-instagram').value = u.instagramUrl || '';
    $('#pf-tiktok').value = u.tiktokUrl || '';
    $('#pf-twitch').value = u.twitchUrl || '';
    $('#pf-followers').value = u.followersCount || '';
    $('#pf-error').classList.remove('show');
  }

  $('#edit-profile-btn').addEventListener('click', async () => {
    const user = await loadCurrentUser();
    fillProfileForm(user);
    openModal(profileModal);
    $('#pf-name').focus();
  });

  $('#pf-cancel').addEventListener('click', () => closeModal(profileModal));
  profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeModal(profileModal); });

  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#pf-error');
    const name = $('#pf-name').value.trim();
    if (!name) { err.textContent = 'Please enter a display name.'; err.classList.add('show'); return; }
    const btn = $('#pf-save');
    btn.disabled = true;
    try {
      const up = await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name,
          handle: $('#pf-handle').value.trim(),
          area: $('#pf-area').value.trim(),
          bio: $('#pf-bio').value.trim(),
          youtubeUrl: $('#pf-youtube').value.trim(),
          instagramUrl: $('#pf-instagram').value.trim(),
          tiktokUrl: $('#pf-tiktok').value.trim(),
          twitchUrl: $('#pf-twitch').value.trim(),
          followersCount: Number(String($('#pf-followers').value).replace(/[^0-9]/g, '')) || 0,
        }),
      });
      closeModal(profileModal);
      showDashboard(up);
      toast('Profile saved');
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.add('show');
    } finally {
      btn.disabled = false;
    }
  });

  $('#change-pw-btn').addEventListener('click', () => {
    $('#pw-current').value = '';
    $('#pw-new').value = '';
    $('#pw-confirm').value = '';
    $('#pw-error').classList.remove('show');
    openModal(pwModal);
    $('#pw-current').focus();
  });

  $('#pw-cancel').addEventListener('click', () => closeModal(pwModal));
  pwModal.addEventListener('click', (e) => { if (e.target === pwModal) closeModal(pwModal); });

  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#pw-error');
    const cur = $('#pw-current').value;
    const next = $('#pw-new').value;
    const again = $('#pw-confirm').value;
    if (next.length < 6) { err.textContent = 'New password must be at least 6 characters.'; err.classList.add('show'); return; }
    if (next !== again) { err.textContent = 'Passwords do not match.'; err.classList.add('show'); return; }
    const btn = $('#pw-save');
    btn.disabled = true;
    try {
      await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ oldPassword: cur, password: next }),
      });
      closeModal(pwModal);
      toast('Password changed');
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.add('show');
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    [profileModal, pwModal].forEach(closeModal);
  });

  $('#pick-avatar').addEventListener('click', () => { $('#avatar-input').click(); });
  $('#avatar-input').addEventListener('change', async () => {
    const file = $('#avatar-input').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const up = await api('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ avatarDataUrl: reader.result }),
        });
        showDashboard(up);
        toast('Photo updated');
      } catch (err) { toast(err.message); }
    };
    reader.readAsDataURL(file);
    $('#avatar-input').value = '';
  });

  $('#logout-btn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    localStorage.removeItem(AUTH_KEY);
    clearAuthForms();
    showAuth();
    toast('Signed out');
  });

  function fmtTs(ts) {
    const n = Number(ts);
    if (!n) return '—';
    return new Date(n > 1e12 ? n : n * 1000).toLocaleDateString();
  }

  async function loadPurchases() {
    const el = $('#purchases-list');
    try {
      const user = await loadCurrentUser();
      const res = await api('/api/purchases/my');
      const list = res.purchases || [];
      if (!list.length) {
        el.innerHTML = '<p class="empty">No purchases yet.</p>';
        return;
      }
      let html = '<table class="list"><thead><tr>' +
        '<th>Guide</th><th>Price</th><th>Date</th><th>Status</th>' +
        '</thead><tbody>';
      list.forEach((p) => {
        const isFree = p.type === 'free';
        const pill = isFree
          ? '<span class="pill yellow">Free unlock</span>'
          : p.type === 'subscription'
            ? '<span class="pill orange">Subscription</span>'
            : '<span class="pill green">Purchased</span>';
        const amount = isFree
          ? 'Free'
          : (p.amount != null ? (p.currency === 'jpy' ? '¥' : '$' ) + Number(p.amount).toFixed(2) : '—');
        html += '<tr>' +
          `<td><strong>${p.guideTitle || p.guideId || '—'}</strong></td>` +
          `<td>${amount}</td>` +
          `<td>${fmtTs(p.purchasedAt)}</td>` +
          `<td>${pill}</td>` +
          '</tr>';
      });
      html += '</tbody></table>';
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = '<p class="empty">Could not load your purchases. Refresh the page — ' +
        'if you have bought guides, make sure you are signed in.</p>';
    }
  }

  function bindToggle(btn, panelId) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.panel').forEach((p) => { p.classList.remove('open'); });
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.toggle('open');
    });
  }

  const verifyPopup = $('#verify-popup');
  let verifyPopupEmail = '';

  function lang() { return document.documentElement.getAttribute('lang') === 'ja' ? 'ja' : 'en'; }

  function tVerify(key) {
    const en = {
      'verify.popupTitle': 'Check your email',
      'verify.popupBody': 'We just sent a verification link to {email}. Click it and you will be taken back to Worth The Trip.',
      'verify.popupResend': 'Resend verification email',
      'verify.popupResendError': "Couldn't resend the email — check your inbox, or try again in a moment.",
      'verify.sentTitle': 'Verification email sent',
      'verify.sentBody': 'We have sent a verification link to {email}.',
      'verify.successTitle': 'Account created',
      'verify.successBody': 'Your account is verified and ready — welcome to Worth The Trip!',
      'verify.emailVerifiedTitle': 'Email Verified',
      'verify.emailVerifiedBody': 'Your account is now active. You can sign in below.',
      'verify.linkInvalid': 'The verification link is invalid or has expired.',
      'verify.linkUsed': 'This verification link was already used.',
      'verify.linkExpired': 'This verification link has expired.',
    };
    const ja = {
      'verify.popupTitle': 'メールを確認してください',
      'verify.popupBody': '確認用のメールを送信しました。メール内のリンクを開くと、アプリに戻ります。',
      'verify.popupResend': '確認メールを再送',
      'verify.popupResendError': 'メールを再送できませんでした — 受信箱を確認するか、しばらくしてから再試行してください。',
      'verify.sentTitle': '確認メールを送信しました',
      'verify.sentBody': '確認用リンクを {email} 宛に送信しました。',
      'verify.successTitle': 'アカウント作成',
      'verify.successBody': 'アカウントが確認できました。Worth The Tripへようこそ！',
      'verify.emailVerifiedTitle': 'メール確認完了',
      'verify.emailVerifiedBody': 'アカウントが有効になりました。サインインしてください。',
      'verify.linkInvalid': '確認リンクが無効または期限切れです。',
      'verify.linkUsed': 'この確認リンクは既に使用されています。',
      'verify.linkExpired': 'この確認リンクの有効期限が切れています。',
    };
    const keyMap = lang() === 'ja' ? ja : en;
    return (keyMap[key] || en[key] || key).replace(/{email}/g, verifyPopupEmail || '');
  }

  function showVerifyPopup(email) {
    verifyPopupEmail = email;
    $('#verify-popup-title').textContent = tVerify('verify.popupTitle');
    $('#verify-popup-body').textContent = tVerify('verify.popupBody');
    $('#verify-popup-resend').style.display = 'inline-flex';
    $('#verify-popup-resend').textContent = tVerify('verify.popupResend');
    $('#verify-popup-hint').textContent = '';
    verifyPopup.classList.add('open');
  }

  function showVerifySuccessPopup(email) {
    verifyPopupEmail = email;
    $('#verify-popup-title').textContent = tVerify('verify.emailVerifiedTitle');
    $('#verify-popup-title').style.color = '#0f7b3f';
    $('#verify-popup-body').textContent = tVerify('verify.emailVerifiedBody');
    $('#verify-popup-resend').style.display = 'none';
    $('#verify-popup-hint').textContent = '';
    verifyPopup.classList.add('open');
    if (email) {
      $('#si-email').value = email;
    }
  }

  function resendVerification() {
    const email = verifyPopupEmail;
    if (!email) return;
    $('#verify-popup-resend').disabled = true;
    $('#verify-popup-hint').textContent = 'Sending…';
    api('/api/resend-verification', { method: 'POST', body: JSON.stringify({ email }) })
      .then(() => {
        $('#verify-popup-hint').textContent = tVerify('verify.sentTitle') + ' ' + tVerify('verify.sentBody', email);
      })
      .catch(() => {
        $('#verify-popup-hint').textContent = tVerify('verify.popupResendError');
      })
      .finally(() => { $('#verify-popup-resend').disabled = false; });
  }

  $('#verify-popup-resend').addEventListener('click', resendVerification);

  $('#signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#su-email').value.trim();
    const password = $('#su-password').value;
    const name = $('#su-name').value.trim();
    $('#auth-error').textContent = '';
    $('#auth-error').className = 'error';
    api('/api/users', { method: 'POST', body: JSON.stringify({ email, password, name }) })
      .then((res) => {
        if (res.requiresVerification) {
          showVerifyPopup(email);
          $('#auth-error').textContent = 'Verification Email sent to your address, please click the link provided.';
          $('#auth-error').className = 'success';
          return;
        }
        localStorage.setItem(AUTH_KEY, res.token);
        return loadCurrentUser().then(enterDashboard);
      })
      .catch((err) => {
        $('#auth-error').textContent = err.message;
        $('#auth-error').className = 'error';
      });
  });

  if (location.search.includes('verified=1')) {
    const afterVerify = (user) => {
      const email = (user && user.email) ? user.email : '';
      if (email) {
        enterDashboard(user);
        showVerifySuccessPopup(email);
      } else {
        showVerifySuccessPopup('');
      }
      (async () => {
        try {
          console.log('[WTT creator] applying pending creator application');
          const r = await api('/api/creator/apply-pending', { method: 'POST' });
          console.log('[WTT creator] apply-pending result:', r);
          if (r && r.submitted) {
            toast('Creator application submitted');
          } else {
            toast('No pending creator application found');
          }
        } catch (e) {
          console.error('Auto creator apply failed:', e);
          toast('Creator application auto-submit failed: ' + (e.message || 'unknown error'));
        }
      })();
    };
    if (isLoggedIn()) {
      loadCurrentUser().then(afterVerify).catch(() => afterVerify({}));
    } else {
      loadCurrentUser().then(afterVerify).catch(() => afterVerify({}));
    }
  }

  if (location.search.includes('verify=error') || location.search.includes('verify=not_found') || location.search.includes('verify=already_used') || location.search.includes('verify=expired')) {
    const toast = () => {
      const t = (k) => tVerify(k);
      const el = $('#toast');
      if (location.search.includes('verify=already_used')) {
        el.textContent = t('verify.linkUsed');
      } else if (location.search.includes('verify=expired')) {
        el.textContent = t('verify.linkExpired');
      } else if (location.search.includes('verify=not_found')) {
        el.textContent = t('verify.linkInvalid');
      } else {
        const msg = new URLSearchParams(location.search).get('msg');
        el.textContent = msg ? ('Verification error: ' + msg) : t('verify.linkInvalid');
      }
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show'), 4000);
    };
    toast();
  }

  const closeVerifyPopup = () => {
    $('#verify-popup-title').style.color = '';
  };
  if ($('#verify-popup')) {
    $('#verify-popup').addEventListener('click', (e) => {
      if (e.target === $('#verify-popup')) {
        verifyPopup.classList.remove('open');
        $('#verify-popup').setAttribute('aria-hidden', 'true');
        closeVerifyPopup();
      }
    });
  }

  boot();

  $('#page-back-btn').addEventListener('click', () => { location.href = '/'; });
})();
