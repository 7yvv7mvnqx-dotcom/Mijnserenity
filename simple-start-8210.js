/* MijnSerenity 8.25.5 — stabiele lokale Start-loader; geen oud kaart/gauge-dashboard meer */
(()=>{
  'use strict';
  if(window.__msSimpleStart8255)return;
  window.__msSimpleStart8255=true;
  window.__msSimpleStart8210=true;

  const BUILD='8.25.5';
  const TOKEN='825500';

  /* Stop oude, via CDN doorgeluste dashboardlagen als die nog onderweg zijn. */
  window.__msReferenceDashboard8254=true;
  window.__msPersonalWelcome8253=true;
  window.__msDayNightChoice8252=true;
  window.__msDayNight8250=true;
  window.__msDashboardLoader8234=true;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
    document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
  }

  function render(){
    syncBuild();
    try{
      if(typeof window.ms8255RenderStart==='function'){
        window.ms8255RenderStart();
        return true;
      }
    }catch(error){console.warn('Serenity Start render:',error)}
    return false;
  }

  function loadFresh(){
    if(render())return;
    if(document.querySelector('script[data-ms-start-8255]'))return;
    const script=document.createElement('script');
    script.src=`/start-dashboard-71510.js?v=${TOKEN}`;
    script.async=false;
    script.dataset.msStart8255='1';
    script.onload=()=>{render();setTimeout(render,120)};
    script.onerror=()=>console.warn('Serenity Start kon niet lokaal worden geladen.');
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadFresh,{once:true});
  else loadFresh();
  [120,500,1400].forEach(ms=>setTimeout(loadFresh,ms));
  window.addEventListener('pageshow',render,{passive:true});
})();