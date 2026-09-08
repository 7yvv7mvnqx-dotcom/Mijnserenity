/* MijnSerenity 8.29.0 — één releaseguard voor iPhone/iPad/PWA.
   Doel: oude dashboardlagen nooit meer tonen, één buildnummer afdwingen en
   na een release oude MijnSerenity-caches eenmalig opruimen. */
(()=>{
  'use strict';
  if(window.__msReleaseGuard8290)return;
  window.__msReleaseGuard8290=true;

  const BUILD='8.29.0';
  const RELEASE_KEY='mijnserenity-release-guard';
  const $=id=>document.getElementById(id);
  let queued=false;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    document.querySelectorAll('.ms8287-version,.ms8286-version,.ms8285-version').forEach(node=>node.textContent=`v${BUILD}`);
  }

  function installGuardStyle(){
    if($('ms8290LegacyGuardStyle'))return;
    const style=document.createElement('style');
    style.id='ms8290LegacyGuardStyle';
    style.textContent=`
      #dashboard>#msMarineGlass,
      #dashboard>#msDashboardPremium7143,
      #dashboard>#msStartCockpit7144,
      #dashboard>#serenityIvms{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function removeLegacy(){
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','mgMore','mgMoreNav'].forEach(id=>$(id)?.remove());
    const dashboard=$('dashboard');
    dashboard?.classList.remove('mg-active','scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');

    const canonical=$('ms8210Start');
    if(canonical&&dashboard){
      canonical.hidden=false;
      canonical.removeAttribute('aria-hidden');
      canonical.style.setProperty('display','block','important');
      [...dashboard.children].forEach(child=>{
        if(child===canonical)return;
        child.style.setProperty('display','none','important');
        child.setAttribute('aria-hidden','true');
      });
    }
  }

  function enforce(){
    syncBuild();
    installGuardStyle();
    removeLegacy();
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enforce()});
  }

  async function purgeOldReleaseCaches(){
    let previous='';
    try{previous=localStorage.getItem(RELEASE_KEY)||''}catch{}
    if(previous===BUILD)return;
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>key.startsWith('mijnserenity-')&&!key.includes('8.29.0')).map(key=>caches.delete(key)));
      }
    }catch(error){console.warn('MijnSerenity: oude cache niet volledig verwijderd.',error)}
    try{localStorage.setItem(RELEASE_KEY,BUILD)}catch{}
  }

  function watchDashboard(){
    const dashboard=$('dashboard');
    if(!dashboard||dashboard.dataset.ms8290Observed==='1')return;
    dashboard.dataset.ms8290Observed='1';
    new MutationObserver(queue).observe(dashboard,{childList:true});
  }

  function start(){
    enforce();
    watchDashboard();
    purgeOldReleaseCaches();
    [80,300,900,2200,5000].forEach(ms=>setTimeout(enforce,ms));
  }

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow','focus']
    .forEach(type=>window.addEventListener(type,queue,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
