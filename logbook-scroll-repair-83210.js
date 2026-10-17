/* MijnSerenity 8.32.10 — toegankelijk scrollen in logboek / gepland vaarplan.
 * Zorgt voor een zelfstandig scrollvlak onder de vaste navigatie.
 * Laat bestaande velden, gegevens en opslagcode ongemoeid.
 */
(() => {
  'use strict';
  if (window.__msLogbookScroll83210) return;
  window.__msLogbookScroll83210 = true;

  const STYLE_ID = 'msLogbookScroll83210Style';
  const PAGE_ID = 'logbook';
  let scheduled = false;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const node = document.createElement('style');
    node.id = STYLE_ID;
    node.textContent = [
      'body #appView > #logbook.ms83210-scrollable:not(.hidden){',
      'display:block!important;box-sizing:border-box!important;',
      'position:relative!important;inset:auto!important;',
      'width:100%!important;min-width:0!important;max-width:none!important;',
      'min-height:0!important;',
      'height:var(--ms83210-scroll-height,calc(100dvh - 116px))!important;',
      'max-height:var(--ms83210-scroll-height,calc(100dvh - 116px))!important;',
      'overflow-x:hidden!important;overflow-y:auto!important;',
      '-webkit-overflow-scrolling:touch!important;',
      'overscroll-behavior-y:contain!important;touch-action:pan-y pinch-zoom!important;',
      'scroll-padding-bottom:125px!important;',
      'padding-bottom:calc(145px + env(safe-area-inset-bottom,0px))!important;',
      '}',
      'body #logbook.ms83210-scrollable > .card,',
      'body #logbook.ms83210-scrollable #tripFormWrap,',
      'body #logbook.ms83210-scrollable .collapsible-content{',
      'height:auto!important;max-height:none!important;min-height:0!important;',
      '}',
      'body #logbook.ms83210-scrollable #tripSaveButton,',
      'body #logbook.ms83210-scrollable #tripProgress,',
      'body #logbook.ms83210-scrollable #tripNotes,',
      'body #logbook.ms83210-scrollable #tripPhotos{',
      'scroll-margin-bottom:125px;',
      '}',
      '@supports not (height:100dvh){',
      'body #appView > #logbook.ms83210-scrollable:not(.hidden){',
      'height:var(--ms83210-scroll-height,calc(100vh - 116px))!important;',
      'max-height:var(--ms83210-scroll-height,calc(100vh - 116px))!important;',
      '}}'
    ].join('\n');
    document.head.appendChild(node);
  }

  function isVisible(el) {
    if (!el || el.hidden || el.classList.contains('hidden')) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }

  function navigationTop() {
    const navs = [
      document.getElementById('ms8290GlobalNav'),
      ...document.querySelectorAll('.bottom-nav')
    ];
    for (const nav of navs) {
      if (!isVisible(nav)) continue;
      const rect = nav.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 30) return rect.top;
    }
    return null;
  }

  function sync() {
    const page = document.getElementById(PAGE_ID);
    const app = document.getElementById('appView');
    if (!page || !app) return;

    const active = isVisible(app) && isVisible(page);
    page.classList.toggle('ms83210-scrollable', active);
    if (!active) {
      page.style.removeProperty('--ms83210-scroll-height');
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportBottom = visualViewport
      ? visualViewport.offsetTop + visualViewport.height
      : window.innerHeight;
    const nav = navigationTop();
    const bottom = nav == null ? viewportBottom - 100 : Math.min(viewportBottom, nav);
    const top = Math.max(0, page.getBoundingClientRect().top);
    const available = Math.max(210, Math.floor(bottom - top - 12));
    page.style.setProperty('--ms83210-scroll-height', available + 'px');

    // Niet automatisch naar boven of naar een knop springen:
    // bij het hervatten blijven reeds ingevulde gegevens en scrollpositie staan.
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  function start() {
    addStyle();
    schedule();
    const page = document.getElementById(PAGE_ID);
    if (page) new MutationObserver(schedule).observe(page, {
      attributes: true, attributeFilter: ['class']
    });
    document.body && new MutationObserver(schedule).observe(document.body, {
      attributes: true, attributeFilter: ['class']
    });

    const nav = document.getElementById('ms8290GlobalNav');
    if (nav) new MutationObserver(schedule).observe(nav, {
      attributes: true, attributeFilter: ['hidden', 'style']
    });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('pageshow', schedule, { passive: true });
    window.addEventListener('mijnserenity:routechange', schedule, { passive: true });
    window.visualViewport?.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('focusin', e => {
      if (e.target.closest?.('#logbook')) schedule();
    }, { passive: true });
    document.addEventListener('click', () => setTimeout(schedule, 80), { passive: true });
    setTimeout(schedule, 250);
    setTimeout(schedule, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
