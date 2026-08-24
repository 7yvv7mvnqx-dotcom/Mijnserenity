/* MijnSerenity — Marine Glass dashboardloader (huidige app-build volgen) */
(()=>{
  'use strict';
  if(window.__msDashboardLoaderCurrent)return;
  window.__msDashboardLoaderCurrent=true;

  const VERSION='718160';
  const currentBuild=()=>window.MIJSERENITY_BUILD||document.querySelector('meta[name="mijnserenity-build"]')?.content||'7.18.16';

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return script.src&&new URL(script.src,location.href).pathname===wanted}catch{return false}
    }))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.onload=()=>resolve();
      script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);resolve()};
      document.head.appendChild(script);
    });
  }

  function loadCss(href,id){
    let link=document.getElementById(id);
    if(link){
      if(link.getAttribute('href')!==href)link.setAttribute('href',href);
      return;
    }
    link=document.createElement('link');
    link.id=id;
    link.rel='stylesheet';
    link.href=href;
    document.head.appendChild(link);
  }

  function syncVersion(){
    const build=currentBuild();
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=build;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=build;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=build);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=build;
  }

  function hideLegacyVisuals(){
    window.__msDisableLegacyVisuals=true;
    ['ms71510Dashboard','serenityIvms','msMarineGlassMobile7182'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.setProperty('display','none','important');
    });
    document.body?.classList.remove('mg-mode');
  }

  async function start(){
    hideLegacyVisuals();
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');

    await load(`/dashboard-pro-71700.js?v=${VERSION}`,'marine-glass');
    await load(`/marine-glass-start-fix-71801.js?v=${VERSION}`,'marine-glass-start-fix');
    loadCss(`/marine-glass-mobile-7184.css?v=${VERSION}`,'msMarineGlassMobile7184');
    loadCss(`/marine-glass-polish-7185.css?v=${VERSION}`,'msMarineGlassPolish7185');
    await load(`/marine-glass-polish-7185.js?v=${VERSION}`,'marine-glass-polish');
    await load(`/marine-glass-waterkaarten-route-7188.js?v=${VERSION}`,'waterkaarten-route-info');

    hideLegacyVisuals();
    syncVersion();
    setTimeout(syncVersion,250);
    setTimeout(syncVersion,1200);

    if(!document.getElementById('msAiDestinationCss')){
      const link=document.createElement('link');
      link.id='msAiDestinationCss';
      link.rel='stylesheet';
      link.href=`/ai-destination-search.css?v=${VERSION}`;
      document.head.appendChild(link);
    }
    const loadDestination=()=>load(`/ai-destination-search.js?v=${VERSION}`,'destination');
    if('requestIdleCallback' in window)requestIdleCallback(loadDestination,{timeout:800});
    else setTimeout(loadDestination,120);
  }

  start().catch(error=>console.warn('Marine Glass loader:',error));
})();
