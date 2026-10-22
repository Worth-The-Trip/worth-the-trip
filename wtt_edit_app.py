def repl(path, old, new):
    s = open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, f"{path}: pattern found {n} times"
    open(path, 'w', encoding='utf-8').write(s.replace(old, new))
    print("ok", path)


# ---------- app.js ----------
repl('src/js/app.js',
"""  const state = {
    map: null,
    mapOverlay: null,
    pinElements: [],
    activeGuideId: null,
    tripsDetailId: null,
    unlockedGuides: loadUnlocked(),
    savedGuides: loadSavedGuides(),""",
"""  const state = {
    map: null,
    mapOverlay: null,
    pinElements: [],
    activeGuideId: null,
    tripsDetailId: null,
    unlockedGuides: loadUnlocked(),
    freeUnlocked: loadFreeUnlocked(),
    savedGuides: loadSavedGuides(),""")

repl('src/js/app.js',
"""  function persistUnlocked() {
    try { localStorage.setItem('wtt_unlocked', JSON.stringify(Array.from(state.unlockedGuides))); } catch (e) {}
  }""",
"""  function persistUnlocked() {
    try { localStorage.setItem('wtt_unlocked', JSON.stringify(Array.from(state.unlockedGuides))); } catch (e) {}
  }

  function persistFreeUnlocked() {
    try { localStorage.setItem('wtt_free_unlocked', '1'); } catch (e) {}
  }""")

repl('src/js/app.js',
"""    $('#welcome-cta').addEventListener('click', () => {
      const firstGuide = WTT_GUIDES[0];
      if (firstGuide && !state.unlockedGuides.has(firstGuide.id)) {
        state.unlockedGuides.add(firstGuide.id);
        persistUnlocked();
        persistFreeUnlocked();
        showToast(t('toast.unlockedFreeGuide'), 'success');
      }
      hideWelcome();
      closeAllPages();
      $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'trips'));
      openTripsPage();
    });""",
"""    $('#welcome-cta').addEventListener('click', () => {
      hideWelcome();
      closeAllPages();
      $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === 'trips'));
      openTripsPage();
    });""")

repl('src/js/app.js',
"""  function attemptUnlock(guideId, unlockAll) {
    const guide = guideById(guideId);
    if (!guide) return;

    if (unlockAll) {
      if (state.unlockedGuides.size === WTT_GUIDES.length) {
        showToast(t('toast.alreadyUnlocked'), 'success');
        return;
      }
      openCheckout(CONFIG.stripeUnlockAllCheckoutUrl);
      return;
    }

    if (state.unlockedGuides.has(guideId)) {
      showToast(t('toast.alreadyUnlocked'), 'success');
      return;
    }

    if (!CONFIG.stripePaymentLinks[guideId]) {
      showToast(t('toast.noPaymentLink'), 'success');
      return;
    }
    openCheckout(CONFIG.stripePaymentLinks[guideId]);
  }""",
"""  function attemptUnlock(guideId, unlockAll) {
    const guide = guideById(guideId);
    if (!guide) return;

    if (unlockAll) {
      if (state.unlockedGuides.size === WTT_GUIDES.length) {
        showToast(t('toast.alreadyUnlocked'), 'success');
        return;
      }
      openCheckout(CONFIG.stripeUnlockAllCheckoutUrl);
      return;
    }

    if (state.unlockedGuides.has(guideId)) {
      showToast(t('toast.alreadyUnlocked'), 'success');
      return;
    }

    // Free offer still available: pick any guide for one free unlock.
    if (!state.freeUnlocked) {
      state.unlockedGuides.add(guideId);
      persistUnlocked();
      persistFreeUnlocked();
      showToast(t('toast.unlockedFreeGuide'), 'success');
      return;
    }

    // Free offer used: charge per guide via Stripe.
    if (!CONFIG.stripePaymentLinks[guideId]) {
      showToast(t('toast.noPaymentLink'), 'success');
      return;
    }
    openCheckout(CONFIG.stripePaymentLinks[guideId]);
  }""")

repl('src/js/app.js',
"""        ${unlocked
          ? `<button class="btn-primary" disabled style="opacity:0.5;pointer-events:none"><span class="btn-label">${t('modal.unlocked')}</span><span class="btn-sub">${t('modal.followBelow')}</span></button>`
          : `<button class="btn-primary" id="nav-panel-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>`}
        <button class="btn-secondary" id="nav-panel-unlock-all"><span class="btn-label">${t('modal.unlockAll')}</span><span class="btn-sub">${t('modal.unlockAllSub')}</span></button>""",
"""        ${unlocked
          ? `<button class="btn-primary" disabled style="opacity:0.5;pointer-events:none"><span class="btn-label">${t('modal.unlocked')}</span><span class="btn-sub">${t('modal.followBelow')}</span></button>`
          : (!state.freeUnlocked
              ? `<button class="btn-primary btn-green" id="nav-panel-unlock-free"><span class="btn-label">${t('modal.unlockFree')}</span></button>`
              : `<button class="btn-primary" id="nav-panel-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>`)}
        <button class="btn-secondary" id="nav-panel-unlock-all"><span class="btn-label">${t('modal.unlockAll')}</span><span class="btn-sub">${t('modal.unlockAllSub')}</span></button>""")

repl('src/js/app.js',
"""    const unlockBtn = $('#nav-panel-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockAllBtn = $('#nav-panel-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));""",
"""    const unlockBtn = $('#nav-panel-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockFreeBtn = $('#nav-panel-unlock-free');
    if (unlockFreeBtn) unlockFreeBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockAllBtn = $('#nav-panel-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));""")

repl('src/js/app.js',
"""  function tripTileHtml(g) {
    const unlocked = isGuideUnlocked(g.id);
    return `
      <button class="trips-tile" data-guide-id="${g.id}">
        <div class="trips-tile-imgwrap">
          <img src="${g.heroImage}" alt="${gText(g, 'title')}" loading="lazy" onerror="this.style.display='none'">
          <span class="trips-tile-badge${unlocked ? ' unlocked' : ''}">${unlocked ? t('trips.unlocked') : formatPrice(g.price)}</span>
        </div>
        <div class="trips-tile-body">
          <div class="trips-tile-title">${gText(g, 'title')}</div>
          <div class="trips-tile-meta">${gText(g, 'duration')} · ${cityLabel(g.city || cityOf(g))}</div>
        </div>
      </button>`;
  }""",
"""  function tripTileHtml(g) {
    const unlocked = isGuideUnlocked(g.id);
    const showFree = !unlocked && !state.freeUnlocked;
    return `
      <div class="trips-tile" data-guide-id="${g.id}" tabindex="0" role="button" aria-label="Open ${gText(g, 'title')}">
        <div class="trips-tile-imgwrap">
          <img src="${g.heroImage}" alt="${gText(g, 'title')}" loading="lazy" onerror="this.style.display='none'">
          <span class="trips-tile-badge${unlocked ? ' unlocked' : (showFree ? ' free' : '')}">${unlocked ? t('trips.unlocked') : (showFree ? t('modal.unlockFree') : formatPrice(g.price))}</span>
          ${showFree ? `<button class="btn-green tile-free-btn" data-guide-id="${g.id}" aria-label="${t('modal.unlockFree')}"><span class="btn-label">${t('modal.unlockFree')}</span></button>` : ''}
        </div>
        <div class="trips-tile-body">
          <div class="trips-tile-title">${gText(g, 'title')}</div>
          <div class="trips-tile-meta">${gText(g, 'duration')} · ${cityLabel(g.city || cityOf(g))}</div>
        </div>
        ${showFree ? `<button class="btn-green tile-free-btn" data-guide-id="${g.id}" aria-label="${t('modal.unlockFree')}"><span class="btn-label">${t('modal.unlockFree')}</span></button>` : ''}
      </div>`;
  }""")

repl('src/js/app.js',
"""${unlocked ? '' : `
      <div class="modal-price-row">
        <div class="modal-price">${formatPrice(guide.price)}</div>
        <button class="btn-primary trip-detail-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>
        <button class="btn-orange-sub trip-detail-unlock-all"><span class="btn-label">${t('modal.subscribe')}</span></button>
      </div>`}""",
"""${unlocked ? '' : `
      <div class="modal-price-row">
        <div class="modal-price">${formatPrice(guide.price)}</div>
        ${!state.freeUnlocked
          ? `<button class="btn-primary btn-green trip-detail-unlock-free"><span class="btn-label">${t('modal.unlockFree')}</span></button>`
          : `<button class="btn-primary trip-detail-unlock"><span class="btn-label">${t('modal.unlock')}</span></button>`}
        <button class="btn-secondary trip-detail-unlock-all"><span class="btn-label">${t('modal.unlockAll')}</span><span class="btn-sub">${t('modal.unlockAllSub')}</span></button>
      </div>`}""")

repl('src/js/app.js',
"""    const unlockBtn = all.querySelector('.trip-detail-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockAllBtn = all.querySelector('.trip-detail-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));""",
"""    const unlockBtn = all.querySelector('.trip-detail-unlock');
    if (unlockBtn) unlockBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockFreeBtn = all.querySelector('.trip-detail-unlock-free');
    if (unlockFreeBtn) unlockFreeBtn.addEventListener('click', () => attemptUnlock(guideId));
    const unlockAllBtn = all.querySelector('.trip-detail-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => attemptUnlock(guideId, true));""")

repl('src/js/app.js',
"""    if (isLocked) {
      els.modalUnlockBtn.disabled = false;
      els.modalUnlockBtn.style.opacity = '1';
      els.modalUnlockBtn.style.pointerEvents = 'auto';
      els.modalUnlockBtn.querySelector('.btn-label').textContent = t('modal.unlock');
      els.modalStartBtn.style.display = 'none';
      els.modalPrice.closest('.modal-price-row').style.display = '';
      els.modalIncludesLabel.style.display = '';
      els.modalIncludes.style.display = '';
    } else {""",
"""    if (isLocked) {
      const canFree = !unlocked && !state.freeUnlocked;
      els.modalUnlockBtn.disabled = false;
      els.modalUnlockBtn.style.opacity = '1';
      els.modalUnlockBtn.style.pointerEvents = 'auto';
      els.modalUnlockBtn.querySelector('.btn-label').textContent = canFree ? t('modal.unlockFree') : t('modal.unlock');
      els.modalUnlockBtn.querySelector('.btn-sub').textContent = canFree ? '' : ((CONFIG.stripePaymentLinks[guideId] ? t('modal.payMethods') : t('modal.comingSoon')) + ' — ' + formatPrice(guide.price));
      els.modalStartBtn.style.display = 'none';
      els.modalPrice.closest('.modal-price-row').style.display = '';
      els.modalIncludesLabel.style.display = '';
      els.modalIncludes.style.display = '';
    } else {""")

repl('src/js/app.js',
"""    const paymentLink = CONFIG.stripePaymentLinks[guideId];
    if (paymentLink) {
      els.modalUnlockSub.textContent = '';
    } else {
      els.modalUnlockSub.textContent = t('modal.comingSoon') + ' — ' + formatPrice(guide.price);
    }""",
"""    const paymentLink = CONFIG.stripePaymentLinks[guideId];
    const canFree = !unlocked && !state.freeUnlocked;
    if (canFree) {
      els.modalUnlockSub.textContent = '';
    } else if (paymentLink) {
      els.modalUnlockSub.textContent = t('modal.payMethods');
    } else {
      els.modalUnlockSub.textContent = t('modal.comingSoon') + ' — ' + formatPrice(guide.price);
    }""")
