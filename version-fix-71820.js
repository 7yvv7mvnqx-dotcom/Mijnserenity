/* MijnSerenity 7.18.28 — één gezaghebbende zichtbare appversie */
(()=>{
  'use strict';
  if(window.__msVersionFix71828)return;
  window.__msVersionFix71828=true;
  window.__msVersionFix71827=true;
  window.__msVersionFix71825=true;
  const BUILD='7.18.28';

  function sync(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
    const startup=document.querySelector('#msStartupGate .ms-startup-version');
    if(startup)startup.textContent=`versie ${BUILD}`;
  }

  sync();
  ['mijnserenity:modules-ready','mijnserenity:dashboard-ready','mijnserenity:routechange','focus','pageshow']
    .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(sync),{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()},{passive:true});

  /* Een oude cockpit-polish uit 7.18.12 schreef het versienummer iedere vijf
     seconden terug. Dit interval houdt de werkelijke build daarom leidend. */
  const timer=setInterval(()=>{if(!document.hidden)sync()},750);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  [50,150,400,900,1800,3500,7000].forEach(delay=>setTimeout(sync,delay));
})();
