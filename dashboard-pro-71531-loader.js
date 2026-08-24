/* MijnSerenity 7.18.26 — Marine Glass zichtlaag met geïntegreerde live fallback */
(()=>{
  'use strict';
  if(window.__msDashboardLoaderCurrent)return;
  window.__msDashboardLoaderCurrent=true;

  const BUILD='7.18.26';
  const VERSION='718260';
  const LEGACY_IDS=['ms71510Dashboard','serenityIvms','msMarineGlass','msMarineGlassMobile7182'];
  let guardInstalled=false;
  let marineAttempted=false;

  function load(src,key,timeoutMs=10000){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return script.src&&new URL(script.src,location.href).pathname===wanted;}catch{return false;}
    }))return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');
      let done=false;
      const timer=setTimeout(()=>finish(false),timeoutMs);
      function finish(ok){
        if(done)return;
        done=true;
        clearTimeout(timer);
        script.onload=null;script.onerror=null;
        if(!ok)script.remove();
        resolve(ok);
      }
      script.dataset.msDashboard=key;
      script.src=src;
      script.async=false;
      script.onload=()=>finish(true);
      script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);finish(false);};
      document.head.appendChild(script);
    });
  }

  function loadCss(href,id){
    let link=document.getElementById(id);
    if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link);}
    link.href=href;
  }

  function neutralizeLegacyMode(){
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('mg-active');
    document.body?.classList.remove('mg-mode');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgNav718Style')?.remove();
  }

  function integratedReady(){
    const root=document.getElementById('msIntegratedDashboard');
    return Boolean(root&&root.isConnected&&root.childElementCount>0);
  }

  function marineReady(){
    const root=document.getElementById('msMarineDashboard');
    return Boolean(root&&root.isConnected&&root.childElementCount>0);
  }

  function hideIntegrated(){
    const root=document.getElementById('msIntegratedDashboard');
    if(!root)return false;
    root.setAttribute('aria-hidden','true');
    root.style.setProperty('display','none','important');
    root.style.setProperty('visibility','hidden','important');
    root.style.setProperty('opacity','0','important');
    return true;
  }

  function forceMarineVisible(){
    const dashboard=document.getElementById('dashboard');
    const marine=document.getElementById('msMarineDashboard');
    if(!dashboard||!marine)return false;
    neutralizeLegacyMode();
    dashboard.classList.add('msi-active','mg-71825-active');
    hideIntegrated();
    marine.removeAttribute('aria-hidden');
    marine.style.setProperty('display','block','important');
    marine.style.setProperty('visibility','visible','important');
    marine.style.setProperty('opacity','1','important');
    marine.style.setProperty('position','relative','important');
    LEGACY_IDS.forEach(id=>document.getElementById(id)?.style.setProperty('display','none','important'));
    window.__msDisableLegacyVisuals=true;
    return true;
  }

  function showIntegratedFallback(reason){
    const dashboard=document.getElementById('dashboard');
    const root=document.getElementById('msIntegratedDashboard');
    if(!dashboard||!root)return showLegacyFallback(reason);
    neutralizeLegacyMode();
    dashboard.classList.add('msi-active');
    dashboard.classList.remove('mg-71825-active');
    document.getElementById('msMarineDashboard')?.style.setProperty('display','none','important');
    root.removeAttribute('aria-hidden');
    root.classList.remove('hidden');
    root.style.setProperty('display','block','important');
    root.style.setProperty('visibility','visible','important');
    root.style.setProperty('opacity','1','important');
    root.style.setProperty('position','relative','important');
    LEGACY_IDS.forEach(id=>document.getElementById(id)?.style.setProperty('display','none','important'));
    window.__msDisableLegacyVisuals=true;
    console.warn('Marine Glass niet actief; geïntegreerd dashboard als veilige fallback gebruikt.',reason||'onbekende oorzaak');
    return true;
  }

  function showLegacyFallback(reason){
    window.__msDisableLegacyVisuals=false;
    neutralizeLegacyMode();
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('msi-active','mg-71825-active');
    document.getElementById('msMarineDashboard')?.remove();
    document.getElementById('msIntegratedDashboard')?.remove();
    const fallback=LEGACY_IDS.map(id=>document.getElementById(id)).find(Boolean);
    if(fallback){
      fallback.classList.remove('hidden');
      fallback.style.setProperty('display','block','important');
      fallback.style.setProperty('visibility','visible','important');
      fallback.style.setProperty('opacity','1','important');
    }
    console.warn('Dashboard niet actief; veilige legacy fallback gebruikt.',reason||'onbekende oorzaak');
    return Boolean(fallback);
  }

  function cleanStrayText(){
    [document.getElementById('dashboard'),document.body].filter(Boolean).forEach(root=>{
      [...root.childNodes].forEach(node=>{
        if(node.nodeType!==Node.TEXT_NODE)return;
        const value=(node.textContent||'').trim();
        if(value==='\\n'||value==='\\n\\n'||value==='n')node.remove();
      });
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

  function ensureDashboardVisible(){
    cleanStrayText();syncVersion();
    if(marineReady())return forceMarineVisible();
    if(marineAttempted&&integratedReady())return showIntegratedFallback('Marine Glass zichtlaag ontbreekt');
    return false;
  }

  function installVisibilityGuard(){
    if(guardInstalled)return;
    guardInstalled=true;
    const dashboard=document.getElementById('dashboard');
    if(dashboard){
      new MutationObserver(()=>{
        if(marineReady())forceMarineVisible();
        else if(marineAttempted&&integratedReady())showIntegratedFallback('zichtbaarheidscontrole');
      }).observe(dashboard,{attributes:true,attributeFilter:['class'],childList:true});
    }
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(ensureDashboardVisible,0);},{passive:true});
    window.addEventListener('mijnserenity:modules-ready',()=>setTimeout(ensureDashboardVisible,0),{passive:true});
    window.addEventListener('mijnserenity:marine-glass-ready',()=>setTimeout(forceMarineVisible,0),{passive:true});
  }

  async function start(){
    syncVersion();cleanStrayText();neutralizeLegacyMode();
    loadCss(`/dashboard-integrated-71820.css?v=${VERSION}`,'msIntegratedDashboardCss71820');
    loadCss(`/dashboard-marine-glass-71825.css?v=${VERSION}`,'msMarineGlassCss71825');

    const integratedLoaded=await load(`/dashboard-integrated-71820.js?v=${VERSION}`,'integrated-dashboard-71820',10000);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(integratedLoaded&&integratedReady())hideIntegrated();

    marineAttempted=true;
    const marineLoaded=await load(`/dashboard-marine-glass-71825.js?v=${VERSION}`,'marine-glass-71825',10000);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

    if(marineLoaded&&marineReady())forceMarineVisible();
    else if(integratedLoaded&&integratedReady())showIntegratedFallback(marineLoaded?'Marine Glass is niet opgebouwd':'Marine Glass script kon niet laden');
    else showLegacyFallback('dashboardmodules konden niet worden opgebouwd');

    installVisibilityGuard();
    setTimeout(ensureDashboardVisible,1200);
    console.info(`MijnSerenity ${BUILD}: Marine Glass dashboardloader gereed.`);
  }

  start().catch(error=>{
    console.warn('Marine Glass dashboardloader:',error);
    marineAttempted=true;
    if(integratedReady())showIntegratedFallback(error?.message||String(error));
    else showLegacyFallback(error?.message||String(error));
  });
})();
