/* MijnSerenity 7.18.31 — één gezaghebbende zichtbare appversie */
(()=>{
  'use strict';
  if(window.__msVersionFix71831)return;
  window.__msVersionFix71831=true;
  window.__msVersionFix71830=true;
  window.__msVersionFix71829=true;
  window.__msVersionFix71828=true;
  window.__msVersionFix71827=true;
  window.__msVersionFix71825=true;
  const BUILD='7.18.31';

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

  const timer=setInterval(()=>{if(!document.hidden)sync()},500);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  [20,80,180,400,900,1800,3500,7000].forEach(delay=>setTimeout(sync,delay));
})();
