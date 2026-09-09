// MijnSerenity 8.26.0 - 2026-09-09
// Stable start bootstrap + approved Serenity dashboard.
(function () {
  'use strict';

  const TOKEN = '826000';
  const BUILD = '8.26.0';
  const SCRIPT_ID = 'ms8210StartScript';
  const APPROVED_ID = 'ms8260ApprovedScript';

  function atHome() {
    try { return (location.hash || '#dashboard').slice(1) === 'dashboard'; } catch (_) { return true; }
  }

  function syncBuild() {
    try { window.APP_BUILD = BUILD; window.MIJSERENITY_BUILD = BUILD; } catch (_) {}
    try { document.documentElement.dataset.build = TOKEN; } catch (_) {}
    const badge = document.getElementById('buildStamp');
    if (badge) badge.textContent = 'v' + BUILD;
  }

  function applyApproved() {
    if (!atHome()) return false;
    if (typeof window.ms8260ApplyApprovedDashboard === 'function') {
      try { window.ms8260ApplyApprovedDashboard(); syncBuild(); return true; } catch (e) { console.warn('Approved dashboard apply failed', e); }
    }
    let script = document.getElementById(APPROVED_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = APPROVED_ID;
      script.src = 'approved-dashboard-8260.js?v=' + TOKEN;
      script.async = false;
      script.addEventListener('load', () => { try { window.ms8260ApplyApprovedDashboard?.(); syncBuild(); } catch (_) {} }, { once: true });
      document.head.appendChild(script);
    }
    return false;
  }

  function render() {
    if (!atHome()) return false;
    let rendered = false;
    if (typeof window.ms8255RenderStart === 'function') {
      try { window.ms8255RenderStart(); rendered = true; } catch (e) { console.warn('Start render failed', e); }
    }
    setTimeout(applyApproved, 0);
    syncBuild();
    return rendered;
  }

  function loadFresh() {
    const rendered = render();
    let script = document.getElementById(SCRIPT_ID);
    if (!rendered && !script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'start-dashboard-71510.js?v=' + TOKEN;
      script.async = false;
      script.addEventListener('load', () => { render(); setTimeout(applyApproved, 0); }, { once: true });
      document.head.appendChild(script);
    } else {
      try { script?.addEventListener('load', () => { render(); setTimeout(applyApproved, 0); }, { once: true }); } catch (_) {}
      applyApproved();
    }
  }

  function boot() {
    syncBuild();
    loadFresh();
    [100, 350, 900, 1600].forEach(ms => setTimeout(() => { render(); setTimeout(applyApproved, 15); }, ms));
    window.addEventListener('hashchange', () => setTimeout(loadFresh, 0));
    window.addEventListener('pageshow', () => setTimeout(loadFresh, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();