/* MijnSerenity 7.18.20 — één geïntegreerd startdashboard, zonder oude cockpit-flits */
(()=>{
  'use strict';
  if(window.__msDashboardLoaderCurrent)return;
  window.__msDashboardLoaderCurrent=true;

  const BUILD='7.18.20';
  const VERSION='718200';

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return script.src&&new URL(script.src,location.href).pathname===wanted}catch{return false}
    }))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.async=false;
      script.onload=()=>resolve();
      script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);resolve()};
      document.head.appendChild(script);
    });
  }

  function loadCss(href,id){
    let link=document.getElementById(id);
    if(!link){
      link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      document.head.appendChild(link);
    }
    link.href=href;
  }

  function hideLegacyVisuals(){
    window.__msDisableLegacyVisuals=true;
    ['ms71510Dashboard','serenityIvms','msMarineGlass','msMarineGlassMobile7182'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.setProperty('display','none','important');
    });
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgNav718Style')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.body?.classList.remove('mg-mode');
  }

  function syncVersion(){
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  async function start(){
    hideLegacyVisuals();
    loadCss(`/dashboard-integrated-71820.css?v=${VERSION}`,'msIntegratedDashboardCss71820');
    await load(`/dashboard-integrated-71820.js?v=${VERSION}`,'integrated-dashboard-71820');
    hideLegacyVisuals();
    syncVersion();
    setTimeout(()=>{hideLegacyVisuals();syncVersion()},250);
    setTimeout(()=>{hideLegacyVisuals();syncVersion()},1500);

    const background=()=>{
      load(`/marine-glass-waterkaarten-route-7188.js?v=${VERSION}`,'waterkaarten-route-info');
      if(!document.getElementById('msAiDestinationCss'))loadCss(`/ai-destination-search.css?v=${VERSION}`,'msAiDestinationCss');
      load(`/ai-destination-search.js?v=${VERSION}`,'destination');
    };
    if('requestIdleCallback' in window)requestIdleCallback(background,{timeout:900});
    else setTimeout(background,160);
    console.info(`MijnSerenity ${BUILD}: geïntegreerd startdashboard geladen.`);
  }

  start().catch(error=>console.warn('Geïntegreerde dashboardloader:',error));
})();
