/* MijnSerenity 7.18.24 — één primaire Marine Glass cockpit, legacy dashboards uitgeschakeld */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71824)return;
  window.__msDashboardLoader71824=true;
  window.__msDashboardLoader71823=true;

  const V='718240';
  const BUILD='7.18.24';

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return new URL(script.src,location.href).pathname===wanted}catch{return false}
    }))return Promise.resolve();

    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.onload=()=>resolve();
      script.onerror=()=>{
        console.warn('Dashboardmodule kon niet laden:',src);
        resolve();
      };
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

  function removeLegacyVisuals(){
    window.__msDisableLegacyVisuals=true;
    document.documentElement.classList.add('ms-modern-dashboard-only');
    [
      'msStartCockpit7144',
      'msDashboardPremium7143',
      'msMarineGlassMobile7182'
    ].forEach(id=>document.getElementById(id)?.remove());
  }

  function syncVersion(){
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

  async function start(){
    removeLegacyVisuals();
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgMore')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');

    loadCss(`/marine-glass-mobile-7184.css?v=${V}`,'msMarineGlassMobile7184');
    loadCss(`/marine-glass-polish-7185.css?v=${V}`,'msMarineGlassPolish7185');

    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');

    if(!document.getElementById('msMarineGlass')){
      throw new Error('Marine Glass hoofdmodule is geladen, maar de cockpit is niet opgebouwd.');
    }

    await Promise.all([
      load(`/marine-glass-start-fix-71801.js?v=${V}`,'marine-glass-start-fix'),
      load(`/marine-glass-polish-7185.js?v=${V}`,'marine-glass-polish'),
      load(`/marine-glass-waterkaarten-route-7188.js?v=${V}`,'waterkaarten-route-info'),
      load(`/energy-flow-fix-71819.js?v=${V}`,'energy-flow-fix'),
      load(`/version-fix-71820.js?v=${V}`,'version-fix')
    ]);

    removeLegacyVisuals();
    syncVersion();
    setTimeout(syncVersion,250);
    setTimeout(syncVersion,1200);
    setTimeout(syncVersion,3500);

    if(!document.getElementById('msAiDestinationCss')){
      const link=document.createElement('link');
      link.id='msAiDestinationCss';
      link.rel='stylesheet';
      link.href=`/ai-destination-search.css?v=${V}`;
      document.head.appendChild(link);
    }

    const loadDestination=()=>load(`/ai-destination-search.js?v=${V}`,'destination');
    if('requestIdleCallback' in window)requestIdleCallback(loadDestination,{timeout:800});
    else setTimeout(loadDestination,120);

    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD}}));
    return true;
  }

  const ready=start().catch(error=>{
    console.warn('Marine Glass loader:',error);
    throw error;
  });
  window.__msDashboardReady71824=ready;
  window.__msDashboardReady71823=ready;
})();
