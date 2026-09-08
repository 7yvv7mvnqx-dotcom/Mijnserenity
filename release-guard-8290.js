/* MijnSerenity 8.30.0 — tijdelijke 8.29 migratiebrug voor bestaande iOS/PWA-clients.
   Nieuwe clients gebruiken de guard in start-dashboard-71510.css en de 8.30 service worker. */
(()=>{
  'use strict';
  if(window.__msReleaseGuard8300)return;
  window.__msReleaseGuard8300=true;
  window.__msReleaseGuard8290=true;
  const BUILD='8.30.0';
  const $=id=>document.getElementById(id);

  function apply(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','mgMore','mgMoreNav'].forEach(id=>$(id)?.remove());
    const dashboard=$('dashboard');
    dashboard?.classList.remove('mg-active','scd-active','mspro-active');
    if(window.__msStart8300)window.ms8300RefreshStart?.();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  ['pageshow','mijnserenity:dashboard-ready','mijnserenity:boot-complete'].forEach(type=>window.addEventListener(type,apply,{passive:true}));
})();
