/* MijnSerenity 7.18.22 — geïntegreerd startdashboard zonder legacy Marine Glass conflict */
(()=>{
  'use strict';
  if(window.__msDashboardLoaderCurrent)return;
  window.__msDashboardLoaderCurrent=true;

  const BUILD='7.18.22';
  const VERSION='718220';
  const LEGACY_IDS=['ms71510Dashboard','serenityIvms','msMarineGlass','msMarineGlassMobile7182'];
  let guardInstalled=false;

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

  function neutralizeLegacyMode(){
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('mg-active');
    document.body?.classList.remove('mg-mode');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgNav718Style')?.remove();
  }

  function forceIntegratedVisible(){
    const dashboard=document.getElementById('dashboard');
    const root=document.getElementById('msIntegratedDashboard');
    if(!dashboard||!root)return false;

    neutralizeLegacyMode();
    dashboard.classList.add('msi-active');
    root.classList.remove('hidden');
    root.style.setProperty('display','block','important');
    root.style.setProperty('visibility','visible','important');
    root.style.setProperty('opacity','1','important');
    root.style.setProperty('position','relative','important');

    LEGACY_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.style.setProperty('display','none','important');
    });
    window.__msDisableLegacyVisuals=true;
    return true;
  }

  function hideLegacyVisuals(){
    neutralizeLegacyMode();
    forceIntegratedVisible();
  }

  function showLegacyFallback(reason){
    window.__msDisableLegacyVisuals=false;
    neutralizeLegacyMode();
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('msi-active');
    document.getElementById('msIntegratedDashboard')?.remove();
    const fallback=LEGACY_IDS.map(id=>document.getElementById(id)).find(Boolean);
    if(fallback){
      fallback.classList.remove('hidden');
      fallback.style.setProperty('display','block','important');
      fallback.style.setProperty('visibility','visible','important');
      fallback.style.setProperty('opacity','1','important');
    }
    console.warn('Geïntegreerd dashboard niet actief; veilige fallback gebruikt.',reason||'onbekende oorzaak');
  }

  function integratedReady(){
    const root=document.getElementById('msIntegratedDashboard');
    return Boolean(root&&root.isConnected&&root.childElementCount>0);
  }

  function cleanStrayText(){
    const roots=[document.getElementById('dashboard'),document.body].filter(Boolean);
    roots.forEach(root=>{
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
    cleanStrayText();
    syncVersion();
    if(integratedReady()){
      forceIntegratedVisible();
      return true;
    }
    return false;
  }

  function installVisibilityGuard(){
    if(guardInstalled)return;
    guardInstalled=true;

    const dashboard=document.getElementById('dashboard');
    if(dashboard){
      new MutationObserver(()=>{
        if(integratedReady())forceIntegratedVisible();
      }).observe(dashboard,{attributes:true,attributeFilter:['class'],childList:true});
    }

    document.addEventListener('click',event=>{
      const target=event.target.closest?.('[data-target="dashboard"],[onclick*="dashboard"]');
      if(!target)return;
      setTimeout(()=>{
        document.getElementById('dashboard')?.classList.remove('mg-active');
        ensureDashboardVisible();
      },0);
      setTimeout(ensureDashboardVisible,120);
    },true);

    ['mijnserenity:modules-ready','mijnserenity-ha-state-updated','mijnserenity-ha-connected']
      .forEach(name=>window.addEventListener(name,()=>setTimeout(ensureDashboardVisible,0),{passive:true}));

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)setTimeout(ensureDashboardVisible,0);
    },{passive:true});

    setInterval(()=>{
      if(!document.hidden&&integratedReady())forceIntegratedVisible();
    },1500);
  }

  async function start(){
    syncVersion();
    cleanStrayText();
    neutralizeLegacyMode();
    loadCss(`/dashboard-integrated-71820.css?v=${VERSION}`,'msIntegratedDashboardCss71820');
    const loaded=await load(`/dashboard-integrated-71820.js?v=${VERSION}`,'integrated-dashboard-71820');

    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(loaded&&integratedReady()){
      hideLegacyVisuals();
      cleanStrayText();
    }else{
      showLegacyFallback(loaded?'dashboard is niet opgebouwd':'script kon niet laden');
    }

    installVisibilityGuard();

    setTimeout(()=>{
      if(!ensureDashboardVisible()&&!integratedReady())showLegacyFallback('controle na 250 ms');
    },250);
    setTimeout(()=>{
      if(!ensureDashboardVisible()&&!integratedReady())showLegacyFallback('controle na 1500 ms');
    },1500);

    const background=()=>{
      load(`/marine-glass-waterkaarten-route-7188.js?v=${VERSION}`,'waterkaarten-route-info');
      if(!document.getElementById('msAiDestinationCss'))loadCss(`/ai-destination-search.css?v=${VERSION}`,'msAiDestinationCss');
      load(`/ai-destination-search.js?v=${VERSION}`,'destination');
      setTimeout(ensureDashboardVisible,250);
    };
    if('requestIdleCallback' in window)requestIdleCallback(background,{timeout:900});
    else setTimeout(background,160);
    console.info(`MijnSerenity ${BUILD}: startdashboard zichtbaar en legacy conflict uitgeschakeld.`);
  }

  start().catch(error=>{
    console.warn('Geïntegreerde dashboardloader:',error);
    showLegacyFallback(error?.message||String(error));
  });
})();
