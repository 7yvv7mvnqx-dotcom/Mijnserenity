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

  function installStartLayoutFix(){
    let style=$('ms8290StartLayoutFix');
    if(!style){
      style=document.createElement('style');
      style.id='ms8290StartLayoutFix';
      (document.head||document.documentElement).appendChild(style);
    }
    style.textContent=`
      /* De startpagina moet op iPad/desktop de volledige beschikbare breedte gebruiken.
         De oude premium laag hield #ms8210Start nog op 860px, waardoor rechts een groot
         leeg vlak ontstond en de hero onnodig werd samengedrukt. */
      #dashboard,
      #ms8210Start,
      #ms8210Start .ms8210-shell{
        box-sizing:border-box!important;
        width:100%!important;
        max-width:none!important;
        margin-left:0!important;
        margin-right:0!important;
      }
      #ms8210Start{
        padding:clamp(10px,1.2vw,18px) clamp(10px,1.4vw,22px) max(26px,env(safe-area-inset-bottom))!important;
      }
      #ms8210Start .ms8280-header{
        width:100%!important;
        max-width:none!important;
        min-height:clamp(500px,58vh,680px)!important;
      }
      #ms8210Start .ms8280-photo{
        image-rendering:auto!important;
        object-position:58% 52%!important;
      }
      #ms8210Start .ms8280-topbar{
        grid-template-columns:minmax(0,1fr) auto!important;
        gap:18px!important;
      }
      #ms8210Start .ms8280-actions{
        display:flex!important;
        flex-wrap:wrap!important;
        align-items:flex-start!important;
        justify-content:flex-end!important;
        gap:9px!important;
        width:auto!important;
        max-width:min(620px,52vw)!important;
      }
      #ms8210Start .ms8280-content{
        width:min(760px,56%)!important;
        max-width:760px!important;
        margin-top:clamp(26px,4vh,52px)!important;
      }
      #ms8210Start .ms8280-title{
        max-width:720px!important;
        font-size:clamp(46px,4.25vw,66px)!important;
        line-height:.96!important;
      }
      #ms8210Start .ms8280-subtitle{max-width:650px!important}

      /* Meer hoort bij de header en mag niet meer als zwevend element over
         Aandachtspunten heen liggen. */
      #ms8210Start .ms8280-actions>#ms8287ReleaseControls{
        position:static!important;
        inset:auto!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:8px!important;
        width:auto!important;
        margin:0!important;
        transform:none!important;
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
        order:-1!important;
      }
      #ms8210Start .ms8280-actions>#ms8287ReleaseControls .ms8287-version,
      #ms8210Start .ms8280-actions>#ms8287ReleaseControls .ms8287-more{
        position:static!important;
        margin:0!important;
      }

      @media (min-width:900px) and (orientation:landscape){
        #ms8210Start{padding-top:12px!important}
        #ms8210Start .ms8280-header{
          min-height:min(680px,calc(100dvh - 46px))!important;
          border-radius:28px!important;
        }
        #ms8210Start .ms8280-content{
          width:min(760px,52%)!important;
          margin-top:clamp(20px,3.5vh,44px)!important;
        }
        #ms8210Start .ms8280-metrics,
        #ms8210Start .ms8280-metrics.ms8234-live-metrics{max-width:620px!important}
        #ms8210Start .ms8280-live-button{width:min(540px,100%)!important}
      }

      @media (max-width:899px){
        #ms8210Start .ms8280-header{min-height:470px!important}
        #ms8210Start .ms8280-content{width:min(690px,72%)!important}
        #ms8210Start .ms8280-actions{max-width:min(430px,48vw)!important}
      }

      @media (max-width:760px){
        #ms8210Start{padding-left:10px!important;padding-right:10px!important}
        #ms8210Start .ms8280-header{min-height:470px!important}
        #ms8210Start .ms8280-content{width:100%!important;max-width:none!important}
        #ms8210Start .ms8280-actions{max-width:none!important;width:100%!important}
        #ms8210Start .ms8280-actions>#ms8287ReleaseControls{width:100%!important}
        #ms8210Start .ms8280-actions>#ms8287ReleaseControls .ms8287-version{display:none!important}
      }
    `;
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

  function placeHeaderControls(){
    const controls=$('ms8287ReleaseControls');
    const actions=document.querySelector('#ms8210Start .ms8280-actions');
    if(!controls||!actions)return;
    if(controls.parentElement!==actions)actions.prepend(controls);
    controls.classList.add('is-visible');
    controls.removeAttribute('aria-hidden');
  }

  function enforce(){
    syncBuild();
    installGuardStyle();
    installStartLayoutFix();
    removeLegacy();
    placeHeaderControls();
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
    new MutationObserver(queue).observe(dashboard,{childList:true,subtree:true});
  }

  function start(){
    enforce();
    watchDashboard();
    purgeOldReleaseCaches();
    [80,300,900,2200,5000].forEach(ms=>setTimeout(enforce,ms));
  }

  ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','mijnserenity:routechange','pageshow','focus','resize','orientationchange']
    .forEach(type=>window.addEventListener(type,queue,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
