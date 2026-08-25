/* MijnSerenity 7.18.24 — snelle, gefaseerde bootstrap */
(()=>{
  'use strict';
  window.__msDisableLegacyVisuals=true;
  const BUILD='7.18.24';
  const VERSION='718240';
  const CORE_SCRIPT=`app.js?v=${VERSION}`;

  const EARLY_MODULES=[
    `runtime-performance-71700.js?v=${VERSION}`,
    `waterkaarten-gpx-share-71700.js?v=${VERSION}`,
    `waterkaarten-route-receiver-71870.js?v=${VERSION}`,
    `waterkaarten-route-enrichment-71811.js?v=${VERSION}`,
    `marine-map-route-fit-71812.js?v=${VERSION}`,
    `dashboard-pro-71531-loader.js?v=${VERSION}`,
    `easy-auto.js?v=${VERSION}`,
    `auto-track-reliability.js?v=${VERSION}`,
    `gps-continuity-guard.js?v=${VERSION}`,
    `ha-live-bridge.js?v=${VERSION}`,
    `ruuvi-climate.js?v=${VERSION}`,
    `movement-presence.js?v=${VERSION}`,
    `technical-live-sync.js?v=${VERSION}`,
    `victron-diagnostics.js?v=${VERSION}`,
    `navigation-compact.js?v=${VERSION}`,
    `serenity-ivms.js?v=${VERSION}`
  ];

  const LATE_MODULES=[
    `receipt-reader-pro.js?v=${VERSION}`,
    `mission-control.js?v=${VERSION}`,
    `live-split.js?v=${VERSION}`,
    `route-control.js?v=${VERSION}`,
    `ai-destination-search.js?v=${VERSION}`,
    `weather-page.js?v=${VERSION}`,
    `weather-radar.js?v=${VERSION}`,
    `rws-nearby.js?v=${VERSION}`,
    `ais-page.js?v=${VERSION}`,
    `entertainment-page.js?v=${VERSION}`,
    `entertainment-pro-802.js?v=715310`,
    `live-cameras.js?v=${VERSION}`,
    `page-swipe.js?v=${VERSION}`,
    `simple-accessible.js?v=${VERSION}`,
    `device-sync-guard.js?v=${VERSION}`,
    `captain-experience.js?v=${VERSION}`,
    `captain-ai-71814.js?v=${VERSION}`,
    `captain-ux-711.js?v=${VERSION}`
  ];

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

  function syncBuildVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const cockpitBadge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(cockpitBadge)cockpitBadge.textContent=BUILD;
  }

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function ensureProfessionalUi(){
    if(!document.getElementById('msProfessionalUi718')){
      const old=document.getElementById('msProfessionalUi717');
      if(old)old.remove();
      const link=document.createElement('link');
      link.id='msProfessionalUi718';
      link.rel='stylesheet';
      link.href=`/professional-ui-71700.css?v=${VERSION}`;
      document.head.appendChild(link);
    }
    if(!document.getElementById('msAiDestinationStyle71814')){
      const link=document.createElement('link');
      link.id='msAiDestinationStyle71814';
      link.rel='stylesheet';
      link.href=`/ai-destination-search.css?v=${VERSION}`;
      document.head.appendChild(link);
    }
    document.querySelectorAll('link[href*="waterkaarten-split-launch.css"]').forEach(link=>link.remove());
  }

  function addPreconnect(href){
    if(document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;
    const link=document.createElement('link');
    link.rel='preconnect';
    link.href=href;
    link.crossOrigin='anonymous';
    document.head.appendChild(link);
  }

  function scriptExists(src){
    try{
      const wanted=new URL(src,location.href);
      return [...document.scripts].some(script=>{
        if(!script.src)return false;
        const current=new URL(script.src,location.href);
        return current.origin===wanted.origin&&current.pathname===wanted.pathname;
      });
    }catch{return false}
  }

  function loadScript(src,timeoutMs=18000){
    if(scriptExists(src))return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      let finished=false;
      const timer=setTimeout(()=>finish(new Error(`Time-out bij laden van ${src}`)),timeoutMs);
      function finish(error){
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){script.remove();reject(error)}else resolve();
      }
      script.src=src;
      script.async=false;
      script.dataset.ms718='1';
      if(src.startsWith('http'))script.crossOrigin='anonymous';
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase(){
    if(window.supabase?.createClient)return;
    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{
        await loadScript(source,15000);
        if(window.supabase?.createClient)return;
        throw new Error('Supabase-bibliotheek is niet gestart.');
      }catch(error){lastError=error;console.warn('Supabase-bron niet beschikbaar:',source,error)}
    }
    throw lastError||new Error('Geen beveiligde inlogverbinding beschikbaar.');
  }

  async function ensureServiceWorker(){
    if(!('serviceWorker' in navigator))return null;
    if(location.protocol!=='https:'&&location.hostname!=='localhost')return null;
    try{
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      registration.update().catch(()=>{});
      return registration;
    }catch(error){console.warn('Service worker kon niet worden geregistreerd:',error);return null}
  }

  function idle(){
    return new Promise(resolve=>{
      if('requestIdleCallback' in window)requestIdleCallback(()=>resolve(),{timeout:500});
      else setTimeout(resolve,35);
    });
  }

  async function loadModuleQueue(modules,label){
    for(const src of modules){
      await idle();
      try{await loadScript(src,20000)}catch(error){console.warn(`${label} module overgeslagen:`,src,error)}
    }
  }

  async function loadBackgroundModules(){
    await loadModuleQueue(EARLY_MODULES,'Vroege');
    await idle();
    await loadModuleQueue(LATE_MODULES,'Achtergrond');
    syncBuildVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}));
    console.info(`MijnSerenity ${BUILD}: achtergrondmodules gereed.`);
  }

  async function start(){
    try{
      ensureProfessionalUi();
      addPreconnect('https://cdn.jsdelivr.net');
      addPreconnect('https://unpkg.com');
      syncBuildVersion();
      setAuthStatus('Beveiligde inlog wordt geladen…');
      ensureServiceWorker();
      await ensureSupabase();
      await loadScript(CORE_SCRIPT,25000);
      syncBuildVersion();
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      const button=document.getElementById('signInButton');
      if(button)button.disabled=false;
      const target=document.getElementById('authMsg');
      if(target&&/geladen|beveiligde inlog/i.test(target.textContent||''))target.textContent='Nog niet ingelogd.';
      setTimeout(()=>loadBackgroundModules().catch(error=>console.warn('Achtergrondladen:',error)),40);
      console.info(`MijnSerenity ${BUILD}: kern gestart.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);
      setAuthStatus('De beveiligde inlog kon niet worden geladen. Tik op “App herstellen en vernieuwen” en probeer opnieuw.',true);
      const button=document.getElementById('signInButton');
      if(button)button.disabled=true;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
