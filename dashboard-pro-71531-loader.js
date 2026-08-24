/* MijnSerenity 7.18.21 — veilige geïntegreerde startdashboard-loader met fallback */
(()=>{
  'use strict';
  if(window.__msDashboardLoaderCurrent)return;
  window.__msDashboardLoaderCurrent=true;

  const BUILD='7.18.21';
  const VERSION='718210';
  const LEGACY_IDS=['ms71510Dashboard','serenityIvms','msMarineGlass','msMarineGlassMobile7182'];

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return script.src&&new URL(script.src,location.href).pathname===wanted}catch{return false}
    }))return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.async=false;
      script.onload=()=>resolve(true);
      script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);resolve(false)};
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
    LEGACY_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.setProperty('display','none','important');
    });
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgNav718Style')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.body?.classList.remove('mg-mode');
  }

  function showLegacyFallback(reason){
    window.__msDisableLegacyVisuals=false;
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('msi-active');
    document.getElementById('msIntegratedDashboard')?.remove();
    const fallback=LEGACY_IDS.map(id=>document.getElementById(id)).find(Boolean);
    if(fallback)fallback.style.removeProperty('display');
    console.warn('Geïntegreerd dashboard niet actief; veilige fallback gebruikt.',reason||'onbekende oorzaak');
  }

  function integratedReady(){
    const root=document.getElementById('msIntegratedDashboard');
    return Boolean(root&&root.isConnected&&root.childElementCount>0);
  }

  function cleanStrayText(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return;
    [...dashboard.childNodes].forEach(node=>{
      if(node.nodeType!==Node.TEXT_NODE)return;
      const value=(node.textContent||'').trim();
      if(value==='\\n'||value==='\\n\\n'||value==='n')node.remove();
    });
  }

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  async function start(){
    syncVersion();
    cleanStrayText();
    loadCss(`/dashboard-integrated-71820.css?v=${VERSION}`,'msIntegratedDashboardCss71820');
    const loaded=await load(`/dashboard-integrated-71820.js?v=${VERSION}`,'integrated-dashboard-71820');

    // Verberg het bestaande dashboard pas nadat het nieuwe dashboard aantoonbaar is opgebouwd.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(loaded&&integratedReady()){
      hideLegacyVisuals();
      cleanStrayText();
    }else{
      showLegacyFallback(loaded?'dashboard is niet opgebouwd':'script kon niet laden');
    }

    setTimeout(()=>{
      syncVersion();
      cleanStrayText();
      if(integratedReady())hideLegacyVisuals();
      else showLegacyFallback('controle na 250 ms');
    },250);
    setTimeout(()=>{
      syncVersion();
      cleanStrayText();
      if(integratedReady())hideLegacyVisuals();
      else showLegacyFallback('controle na 1500 ms');
    },1500);

    const background=()=>{
      load(`/marine-glass-waterkaarten-route-7188.js?v=${VERSION}`,'waterkaarten-route-info');
      if(!document.getElementById('msAiDestinationCss'))loadCss(`/ai-destination-search.css?v=${VERSION}`,'msAiDestinationCss');
      load(`/ai-destination-search.js?v=${VERSION}`,'destination');
    };
    if('requestIdleCallback' in window)requestIdleCallback(background,{timeout:900});
    else setTimeout(background,160);
    console.info(`MijnSerenity ${BUILD}: veilige geïntegreerde startdashboard-loader geladen.`);
  }

  start().catch(error=>{
    console.warn('Geïntegreerde dashboardloader:',error);
    showLegacyFallback(error?.message||String(error));
  });
})();
