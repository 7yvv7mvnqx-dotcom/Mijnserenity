/* MijnSerenity 7.18.36 — één bootstrap, één service-worker eigenaar */
(()=>{
  'use strict';
  window.__msDisableLegacyVisuals=true;
  const BUILD='7.18.36';
  const VERSION='718360';
  const CORE_SCRIPT=`app.js?v=${VERSION}`;

  const EARLY_MODULES=[
    `runtime-performance-71700.js?v=${VERSION}`,
    `orientation-layout-71835.js?v=${VERSION}`,
    `dashboard-pro-71531-loader.js?v=${VERSION}`,
    `multiplus-control-71830.js?v=${VERSION}`,
    `victron-diagnostics.js?v=${VERSION}`,
    `ha-live-bridge.js?v=${VERSION}`,
    `ruuvi-climate.js?v=${VERSION}`,
    `movement-presence.js?v=${VERSION}`,
    `technical-live-sync.js?v=${VERSION}`,
    `waterkaarten-gpx-share-71700.js?v=${VERSION}`,
    `waterkaarten-route-receiver-71870.js?v=${VERSION}`,
    `waterkaarten-route-enrichment-71811.js?v=${VERSION}`,
    `marine-map-route-fit-71812.js?v=${VERSION}`,
    `easy-auto.js?v=${VERSION}`,
    `auto-track-reliability.js?v=${VERSION}`,
    `gps-continuity-guard.js?v=${VERSION}`,
    `serenity-alarm-notifications-71826.js?v=${VERSION}`,
    `serenity-background-push-71827.js?v=${VERSION}`,
    `navigation-compact.js?v=${VERSION}`,
    `serenity-ivms.js?v=${VERSION}`
  ];

  const LATE_MODULES=[
    `receipt-reader-pro.js?v=${VERSION}`,
    `mission-control.js?v=${VERSION}`,
    `live-split.js?v=${VERSION}`,
    `route-control.js?v=${VERSION}`,
    `logbook-route-assist-71828.js?v=${VERSION}`,
    `ai-destination-search.js?v=${VERSION}`,
    `weather-page.js?v=${VERSION}`,
    `weather-radar.js?v=${VERSION}`,
    `rws-nearby.js?v=${VERSION}`,
    `ais-page.js?v=${VERSION}`,
    `entertainment-page.js?v=${VERSION}`,
    `entertainment-pro-802.js?v=715310`,
    `live-cameras.js?v=${VERSION}`,
    `simple-accessible.js?v=${VERSION}`,
    `device-sync-guard.js?v=${VERSION}`,
    `captain-experience.js?v=${VERSION}`,
    `captain-ai-71814.js?v=${VERSION}`,
    `captain-ux-711.js?v=${VERSION}`
  ];

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
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
    if(cockpitBadge&&cockpitBadge.textContent!==BUILD)cockpitBadge.textContent=BUILD;
  }

  function guardBuildVersion(){
    let ticks=0;
    syncBuildVersion();
    const timer=setInterval(()=>{
      syncBuildVersion();
      ticks++;
      if(ticks>=120)clearInterval(timer);
    },250);
    window.addEventListener('mijnserenity:dashboard-ready',syncBuildVersion,{passive:true});
    window.addEventListener('mijnserenity:modules-ready',syncBuildVersion,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncBuildVersion()},{passive:true});
  }

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function ensureCss(path,id){
    const href=`/${path}?v=${VERSION}`;
    const wanted=new URL(href,location.href).pathname;
    let link=document.getElementById(id)||[...document.querySelectorAll('link[rel="stylesheet"]')].find(item=>{
      try{return new URL(item.href,location.href).pathname===wanted}catch{return false}
    });
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      document.head.appendChild(link);
    }
    link.id=id;
    if(link.getAttribute('href')!==href)link.setAttribute('href',href);
    return link;
  }

  function ensureProfessionalUi(){
    document.getElementById('msProfessionalUi717')?.remove();
    ensureCss('professional-ui-71700.css','msProfessionalUi718');
    ensureCss('page-swipe.css','msPageSwipe71836');
    ensureCss('simple-accessible.css','msSimpleAccessible71836');
    ensureCss('captain-experience.css','msCaptainExperience71836');
    ensureCss('ai-destination-search.css','msAiDestinationStyle71814');
    document.querySelectorAll('link[href*="waterkaarten-split-launch.css"]').forEach(link=>link.remove());
  }

  function ensureMobileFlowGuard(){
    document.getElementById('msMobileFlowGuard71836')?.remove();
    const style=document.createElement('style');
    style.id='msMobileFlowGuard71836';
    style.textContent=`
@media (max-width:760px), (orientation:landscape) and (max-height:700px) and (pointer:coarse){
  html,body{
    min-height:100%!important;
    height:auto!important;
    max-height:none!important;
    overflow-x:hidden!important;
    overflow-y:auto!important;
  }
  body>main,
  body #appView,
  body .ms708-native-pager,
  body .ms708-native-pager>.ms708-native-page,
  body #dashboard,
  body #dashboard.mg-active,
  body #msMarineGlass,
  body #msMarineGlass>main.mg-grid{
    height:auto!important;
    max-height:none!important;
    overflow-y:visible!important;
  }
  body>main,
  body #appView,
  body #dashboard,
  body #dashboard.mg-active,
  body #msMarineGlass{
    position:relative!important;
    top:auto!important;
    bottom:auto!important;
    transform:none!important;
  }
  body #msMarineGlass>main.mg-grid{
    display:flex!important;
    flex-direction:column!important;
    align-items:stretch!important;
    justify-content:flex-start!important;
    width:100%!important;
    min-height:0!important;
    grid-template-columns:none!important;
    grid-template-rows:none!important;
    grid-auto-rows:auto!important;
    overflow:visible!important;
  }
  body #msMarineGlass>main.mg-grid>.mg-card{
    flex:0 0 auto!important;
    grid-column:auto!important;
    grid-row:auto!important;
    width:100%!important;
    min-width:0!important;
    max-height:none!important;
  }
}`;
    document.head.appendChild(style);
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
        await loadScript(source,12000);
        if(window.supabase?.createClient)return;
        throw new Error('Supabase-bibliotheek is niet gestart.');
      }catch(error){
        lastError=error;
        console.warn('Supabase-bron niet beschikbaar:',source,error);
      }
    }

    try{
      const module=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      if(typeof module?.createClient==='function'){
        window.supabase={...(window.supabase||{}),createClient:module.createClient};
        return;
      }
    }catch(error){
      lastError=error;
      console.warn('Supabase ESM-fallback niet beschikbaar:',error);
    }

    throw lastError||new Error('Geen beveiligde inlogverbinding beschikbaar.');
  }

  function idle(){
    return new Promise(resolve=>{
      if('requestIdleCallback' in window)requestIdleCallback(()=>resolve(),{timeout:350});
      else setTimeout(resolve,20);
    });
  }

  async function loadModuleQueue(modules,label){
    for(const src of modules){
      await idle();
      try{await loadScript(src,20000)}catch(error){console.warn(`${label} module overgeslagen:`,src,error)}
      syncBuildVersion();
    }
  }

  async function loadBackgroundModules(){
    await loadModuleQueue(EARLY_MODULES,'Vroege');
    ensureMobileFlowGuard();
    await idle();
    await loadModuleQueue(LATE_MODULES,'Achtergrond');
    ensureMobileFlowGuard();
    syncBuildVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}));
    console.info(`MijnSerenity ${BUILD}: achtergrondmodules gereed.`);
  }

  async function start(){
    try{
      ensureProfessionalUi();
      ensureMobileFlowGuard();
      guardBuildVersion();
      addPreconnect('https://cdn.jsdelivr.net');
      addPreconnect('https://unpkg.com');
      syncBuildVersion();
      setAuthStatus('Beveiligde inlog wordt geladen…');

      /* De service worker wordt bewust alleen door app.js geregistreerd. */
      await ensureSupabase();
      await loadScript(CORE_SCRIPT,25000);
      syncBuildVersion();
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      const button=document.getElementById('signInButton');
      if(button)button.disabled=false;
      const target=document.getElementById('authMsg');
      if(target&&/geladen|beveiligde inlog/i.test(target.textContent||''))target.textContent='Nog niet ingelogd.';
      setTimeout(()=>loadBackgroundModules().catch(error=>console.warn('Achtergrondladen:',error)),20);
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