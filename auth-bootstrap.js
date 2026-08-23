/* MijnSerenity 7.18.32 — niet-blokkerende opstart: login/app blijft altijd zichtbaar */
(()=>{
  'use strict';

  const BUILD='7.18.32';
  const VERSION='718320';
  const CORE_SCRIPT=`app.js?v=${VERSION}`;
  const MEMBERSHIP_FIX=`membership-load-fix-71821.js?v=${VERSION}`;
  const DASHBOARD_SCRIPT=`dashboard-pro-71531-loader.js?v=${VERSION}`;

  const EARLY_MODULES=[
    `runtime-performance-71700.js?v=${VERSION}`,
    `waterkaarten-gpx-share-71700.js?v=${VERSION}`,
    `waterkaarten-route-receiver-71870.js?v=${VERSION}`,
    `waterkaarten-route-enrichment-71811.js?v=${VERSION}`,
    `marine-map-route-fit-71812.js?v=${VERSION}`,
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
    `cost-form-hotfix-71815.js?v=${VERSION}`,
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

  let membershipAlertGuardActive=false;
  let membershipAlertOriginal=null;

  window.__msDisableLegacyVisuals=true;
  document.documentElement.classList.remove('ms-modern-dashboard-only','ms-starting');
  document.getElementById('msStartupGate')?.remove();
  document.getElementById('msStartupGateStyle')?.remove();

  function installDashboardGuard(){
    document.getElementById('msModernDashboardGuard71825')?.remove();
    if(document.getElementById('msModernDashboardGuard71832'))return;
    const style=document.createElement('style');
    style.id='msModernDashboardGuard71832';
    style.textContent=`
      html.ms-marine-glass-ready #dashboard> :not(#msMarineGlass){display:none!important}
      html.ms-marine-glass-ready #dashboard #msMarineGlass{display:block!important}
    `;
    document.head.appendChild(style);
  }

  function syncBuildVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function setSignInReady(ready){
    const button=document.getElementById('signInButton');
    if(button)button.disabled=!ready;
  }

  function ensureAtLeastOneView(){
    const ids=['authView','approvalView','appView'];
    const visible=ids.some(id=>{
      const view=document.getElementById(id);
      return Boolean(view&&!view.classList.contains('hidden'));
    });
    if(visible)return;
    document.getElementById('authView')?.classList.remove('hidden');
  }

  function installMembershipAlertGuard(){
    if(membershipAlertGuardActive)return;
    membershipAlertGuardActive=true;
    membershipAlertOriginal=window.alert.bind(window);
    window.alert=(message,...args)=>{
      const text=String(message??'');
      if(
        text.startsWith('Lidmaatschap laden mislukt:')&&
        /load failed|failed to fetch|networkerror|network request|timeout|time-out|fetch/i.test(text)
      ){
        console.warn('MijnSerenity: tijdelijke lidmaatschapsfout wordt op de achtergrond hersteld:',text);
        return;
      }
      return membershipAlertOriginal(message,...args);
    };
    window.__msRestoreMembershipAlertGuard=()=>{
      if(!membershipAlertGuardActive)return;
      window.alert=membershipAlertOriginal||window.alert;
      membershipAlertGuardActive=false;
      membershipAlertOriginal=null;
    };
  }

  function ensureProfessionalUi(){
    installDashboardGuard();
    if(!document.getElementById('msProfessionalUi718')){
      document.getElementById('msProfessionalUi717')?.remove();
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

  function loadScript(src,timeoutMs=12000){
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
        setAuthStatus('Beveiligde sessie wordt gecontroleerd…');
        await loadScript(source,5000);
        if(window.supabase?.createClient)return;
        throw new Error('Supabase-bibliotheek is niet gestart.');
      }catch(error){
        lastError=error;
        console.warn('Supabase-bron niet beschikbaar:',source,error);
      }
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
    }catch(error){
      console.warn('Service worker kon niet worden geregistreerd:',error);
      return null;
    }
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
      try{await loadScript(src,12000)}
      catch(error){console.warn(`${label} module overgeslagen:`,src,error)}
    }
  }

  async function loadBackgroundModules(){
    await loadModuleQueue(EARLY_MODULES,'Vroege');
    await idle();
    await loadModuleQueue(LATE_MODULES,'Achtergrond');
    syncBuildVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}));
  }

  async function loadModernDashboardInBackground(){
    try{
      await loadScript(DASHBOARD_SCRIPT,10000);
      const ready=
        window.__msDashboardReady71832||
        window.__msDashboardReady71831||
        window.__msDashboardReady71830||
        window.__msDashboardReady71829||
        window.__msDashboardReady71828||
        window.__msDashboardReady71825||
        window.__msDashboardReady71824||
        window.__msDashboardReady71823;
      if(ready&&typeof ready.then==='function'){
        await Promise.race([
          ready,
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('Marine Glass time-out')),9000))
        ]);
      }
      if(!document.getElementById('msMarineGlass'))throw new Error('Marine Glass is niet opgebouwd.');
      document.documentElement.classList.add('ms-marine-glass-ready');
      syncBuildVersion();
    }catch(error){
      document.documentElement.classList.remove('ms-marine-glass-ready');
      console.warn('Marine Glass overgeslagen; basisdashboard blijft beschikbaar:',error);
    }
  }

  async function start(){
    document.documentElement.classList.remove('ms-starting');
    document.getElementById('msStartupGate')?.remove();
    document.getElementById('msStartupGateStyle')?.remove();
    ensureProfessionalUi();
    addPreconnect('https://cdn.jsdelivr.net');
    addPreconnect('https://unpkg.com');
    syncBuildVersion();
    setSignInReady(false);
    setAuthStatus('Beveiligde inlog wordt geladen…');
    ensureAtLeastOneView();
    ensureServiceWorker();

    try{
      await ensureSupabase();
      installMembershipAlertGuard();
      setAuthStatus('Sessie wordt geopend…');
      await loadScript(CORE_SCRIPT,12000);
      syncBuildVersion();
      setSignInReady(typeof window.signIn==='function');

      loadScript(MEMBERSHIP_FIX,6000)
        .catch(error=>console.warn('Lidmaatschapsherstel kon niet laden:',error));

      setTimeout(()=>loadModernDashboardInBackground(),30);
      setTimeout(()=>loadBackgroundModules().catch(error=>console.warn('Achtergrondladen:',error)),250);

      setTimeout(ensureAtLeastOneView,1200);
      console.info(`MijnSerenity ${BUILD}: basisapp gestart zonder blokkerende opstartgate.`);
    }catch(error){
      window.__msRestoreMembershipAlertGuard?.();
      console.error('MijnSerenity kon niet starten:',error);
      document.documentElement.classList.remove('ms-starting');
      document.getElementById('msStartupGate')?.remove();
      setSignInReady(false);
      ensureAtLeastOneView();
      setAuthStatus('MijnSerenity kon de beveiligde basisapp niet laden. Controleer de verbinding en probeer opnieuw.',true);
    }
  }

  installDashboardGuard();
  document.documentElement.classList.remove('ms-starting');
  document.getElementById('msStartupGate')?.remove();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();