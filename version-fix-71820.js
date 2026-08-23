/* MijnSerenity 7.18.27 — dwing overal dezelfde zichtbare appversie af */
(()=>{
  'use strict';
  if(window.__msVersionFix71827)return;
  window.__msVersionFix71827=true;
  window.__msVersionFix71825=true;
  const BUILD='7.18.27';

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
  [100,500,1200,3000,7000,15000].forEach(delay=>setTimeout(sync,delay));
})();
