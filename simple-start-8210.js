// MijnSerenity 8.26.1 - 2026-09-09
// Stable start bootstrap: approved Serenity dashboard is always the initial Haven view.
(function () {
  'use strict';
  if (window.__msSimpleStart8261) return;
  window.__msSimpleStart8261 = true;

  const TOKEN = '826100';
  const BUILD = '8.26.1';
  const SCRIPT_ID = 'ms8210StartScript';
  const APPROVED_ID = 'ms8260ApprovedScript';
  const ROOT_ID = 'ms8210Start';
  const BOOT_LOCK_MS = 4500;
  const bootStarted = Date.now();
  let approvedLoading = false;

  function route() {
    try {
      return ((location.hash || '#dashboard').replace(/^#/, '').split(/[?&/]/)[0] || 'dashboard').toLowerCase();
    } catch (_) { return 'dashboard'; }
  }

  function hasDeepLink() {
    try {
      const q = new URLSearchParams(location.search);
      return q.has('alarm') || q.has('route') || q.has('page');
    } catch (_) { return false; }
  }

  function withinBootLock() {
    return Date.now() - bootStarted < BOOT_LOCK_MS && !hasDeepLink();
  }

  function shouldShowHome() {
    return route() === 'dashboard' || withinBootLock();
  }

  function syncBuild() {
    try { window.APP_BUILD = BUILD; window.MIJSERENITY_BUILD = BUILD; } catch (_) {}
    try { document.documentElement.dataset.build = TOKEN; } catch (_) {}
    document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content', BUILD);
    document.querySelector('meta[name="ms-build"]')?.setAttribute('content', BUILD);
    const badge = document.getElementById('buildStamp');
    if (badge) badge.textContent = 'v' + BUILD;
    const settings = document.getElementById('settingsAppVersion');
    if (settings) settings.textContent = BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el => { el.textContent = BUILD; });
  }

  function forceInitialHome() {
    if (!withinBootLock() || route() === 'dashboard') return;
    try {
      history.replaceState(null, '', location.pathname + location.search + '#dashboard');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (_) {
      try { location.hash = 'dashboard'; } catch (_) {}
    }
  }

  function revealDashboard() {
    const app = document.getElementById('appView');
    const dashboard = document.getElementById('dashboard');
    if (app) { app.classList.remove('hidden'); app.removeAttribute('aria-hidden'); }
    if (dashboard) { dashboard.classList.remove('hidden'); dashboard.removeAttribute('aria-hidden'); }
    return dashboard;
  }

  function prepareRoot() {
    const dashboard = revealDashboard();
    if (!dashboard) return null;
    dashboard.classList.add('ms8255-reference-dashboard');
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('section');
      root.id = ROOT_ID;
      dashboard.prepend(root);
    }
    root.hidden = false;
    root.removeAttribute('aria-hidden');
    root.removeAttribute('data-ms8255-hidden');
    [...dashboard.children].forEach(child => {
      if (child === root) return;
      child.setAttribute('data-ms8255-hidden', '1');
      child.setAttribute('aria-hidden', 'true');
    });
    return root;
  }

  function applyApproved() {
    if (!shouldShowHome()) return false;
    prepareRoot();
    if (typeof window.ms8260ApplyApprovedDashboard === 'function') {
      try {
        window.ms8260ApplyApprovedDashboard();
        syncBuild();
        return true;
      } catch (e) { console.warn('Approved dashboard apply failed', e); }
    }
    if (approvedLoading) return false;
    let script = document.getElementById(APPROVED_ID);
    if (!script) {
      approvedLoading = true;
      script = document.createElement('script');
      script.id = APPROVED_ID;
      script.src = '/approved-dashboard-8260.js?v=' + TOKEN;
      script.async = false;
      script.addEventListener('load', () => {
        approvedLoading = false;
        try { window.ms8260ApplyApprovedDashboard?.(); syncBuild(); } catch (_) {}
      }, { once: true });
      script.addEventListener('error', () => { approvedLoading = false; }, { once: true });
      document.head.appendChild(script);
    } else {
      try { window.ms8260ApplyApprovedDashboard?.(); syncBuild(); } catch (_) {}
    }
    return false;
  }

  function renderBase() {
    if (!shouldShowHome()) return false;
    prepareRoot();
    let rendered = false;
    if (typeof window.ms8255RenderStart === 'function') {
      try { window.ms8255RenderStart(); rendered = true; } catch (e) { console.warn('Start render failed', e); }
    }
    setTimeout(applyApproved, 0);
    syncBuild();
    return rendered;
  }

  function loadFresh() {
    syncBuild();
    if (!shouldShowHome()) return;
    forceInitialHome();
    prepareRoot();
    const rendered = renderBase();
    let script = document.getElementById(SCRIPT_ID);
    if (!rendered && !script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = '/start-dashboard-71510.js?v=' + TOKEN;
      script.async = false;
      script.addEventListener('load', () => { renderBase(); setTimeout(applyApproved, 0); }, { once: true });
      document.head.appendChild(script);
    } else {
      applyApproved();
    }
  }

  function boot() {
    syncBuild();
    forceInitialHome();
    loadFresh();
    [80, 220, 500, 900, 1500, 2400, 3400, 4400].forEach(ms => setTimeout(() => {
      if (!shouldShowHome()) return;
      forceInitialHome();
      loadFresh();
    }, ms));
    window.addEventListener('hashchange', () => {
      if (route() === 'dashboard' || withinBootLock()) setTimeout(loadFresh, 0);
    }, { passive: true });
    window.addEventListener('pageshow', () => {
      if (route() === 'dashboard' || withinBootLock()) setTimeout(loadFresh, 0);
    }, { passive: true });
    window.addEventListener('mijnserenity:boot-complete', () => {
      if (shouldShowHome()) setTimeout(loadFresh, 0);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();