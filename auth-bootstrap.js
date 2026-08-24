/* MijnSerenity 7.18.23 — fail-safe opstart: dashboard blokkeert app nooit meer */
(()=>{
  'use strict';

  window.__msDisableLegacyVisuals=false;

  const BUILD='7.18.23';
  const VERSION='718230';
  const CORE_SCRIPT=`app.js?v=${VERSION}`;
  const DASHBOARD_SCRIPT=`dashboard-pro-71531-loader.js?v=${VERSION}`;
  const HARD_REVEAL_MS=6500;

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

  let startupResolved=false;
  let hardRevealTimer=null;

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

  function setStartupStatus(message){
    const target=document.getElementById('msStartupStatus');
    if(target)target.textContent=message;
  }

  function ensureOneViewVisible(){
    const ids=['authView','approvalView','appView'];
    const views=ids.map(id=>document.getElementById(id)).filter(Boolean);
    const visible=views.filter(view=>!view.classList.contains('hidden'));
    if(visible.length===0){
      document.getElementById('authView')?.classList.remove('hidden');
    }
  }

  function finishStartup(){
    if(startupResolved)return;
    startupResolved=true;
    if(hardRevealTimer){clearTimeout(hardRevealTimer);hardRevealTimer=null;}
    document.documentElement.classList.remove('ms-starting');
    document.body?.classList.remove('ms-starting');
    ensureOneViewVisible();
    const gate=document.getElementById('msStartupGate');
    if(gate){
      gate.style.opacity='0';
      gate.style.pointerEvents='none';
      setTimeout(()=>gate.remove(),180);
    }
  }

  function ensureStartupGate(){
    if(startupResolved||document.getElementById('msStartupGate'))return;
    if(!document.body){
      document.addEventListener('DOMContentLoaded',ensureStartupGate,{once:true});
      return;
    }

    document.documentElement.classList.add('ms-starting');

    if(!document.getElementById('msStartupGateStyle')){
      const style=document.createElement('style');
      style.id='msStartupGateStyle';
      style.textContent=`
        html.ms-starting body{overflow:hidden!important;background:#061525!important}
        html.ms-starting body>main{visibility:hidden!important;pointer-events:none!important}
        #msStartupGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#061525;color:#f5fbff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:opacity .16s ease}
        #msStartupGate .ms-startup-card{width:min(420px,100%);text-align:center}
        #msStartupGate .ms-startup-brand{font-size:30px;font-weight:800;letter-spacing:-1.3px;margin-bottom:22px}
        #msStartupGate .ms-startup-brand span{color:#28b9ec}
        #msStartupGate .ms-startup-spinner{width:38px;height:38px;margin:0 auto 18px;border:3px solid rgba(255,255,255,.16);border-top-color:#28b9ec;border-radius:50%;animation:msStartupSpin .8s linear infinite}
        #msStartupGate .ms-startup-status{font-size:15px;font-weight:650;line-height:1.45;color:#d8e8f3}
        #msStartupGate .ms-startup-version{margin-top:10px;font-size:12px;color:#7794a7}
        @keyframes msStartupSpin{to{transform:rotate(360deg)}}
      `;
      document.head.appendChild(style);
    }

    const gate=document.createElement('div');
    gate.id='msStartupGate';
    gate.setAttribute('role','status');
    gate.setAttribute('aria-live','polite');
    gate.innerHTML=`
      <div class="ms-startup-card">
        <div class="ms-startup-brand">Mijn<span>Serenity</span></div>
        <div class="ms-startup-spinner" aria-hidden="true"></div>
        <div id="msStartupStatus" class="ms-startup-status">MijnSerenity wordt gestart…</div>
        <div class="ms-startup-version">versie ${BUILD}</div>
      </div>`;
    document.body.appendChild(gate);

    // Absolute fail-safe: externe koppelingen of een dashboardmodule mogen de shell nooit vasthouden.
    hardRevealTimer=setTimeout(()=>{
      if(startupResolved)return;
      console.warn('MijnSerenity: fail-safe onthult de app-shell na opstart-time-out.');
      setAuthStatus('De app is geopend. Live koppelingen worden op de achtergrond verder geladen.');
      finishStartup();
    },HARD_REVEAL_MS);
  }

  function ensureProfessionalUi(){
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
    }catch{return false;}
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
        if(error){script.remove();reject(error);}else resolve();
      }
      script.src=src;
      script.async=false;
      script.dataset.ms71823='1';
      if(src.startsWith('http'))script.crossOrigin='anonymous';
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase(){
    if(window.supabase?.createClient)return true;
    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{
        setStartupStatus('Beveiligde sessie wordt gecontroleerd…');
        await loadScript(source,5000);
        if(window.supabase?.createClient)return true;
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
      try{await loadScript(src,12000);}catch(error){console.warn(`${label} module overgeslagen:`,src,error);}
    }
  }

  async function loadBackgroundModules(){
    await loadModuleQueue(EARLY_MODULES,'Vroege');
    await idle();
    await loadModuleQueue(LATE_MODULES,'Achtergrond');
    syncBuildVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}));
  }

  async function loadDashboardInBackground(){
    try{
      await idle();
      await loadScript(DASHBOARD_SCRIPT,12000);
      syncBuildVersion();
      console.info(`MijnSerenity ${BUILD}: actueel dashboard geladen.`);
    }catch(error){
      window.__msDisableLegacyVisuals=false;
      console.warn('Actueel dashboard overgeslagen; legacy dashboard blijft beschikbaar:',error);
    }
  }

  async function start(){
    ensureStartupGate();
    ensureProfessionalUi();
    addPreconnect('https://cdn.jsdelivr.net');
    addPreconnect('https://unpkg.com');
    syncBuildVersion();
    ensureServiceWorker(); // bewust niet awaiten

    try{
      setAuthStatus('Beveiligde inlog wordt geladen…');
      setStartupStatus('Nieuwe versie en sessie worden gecontroleerd…');
      await ensureSupabase();

      setStartupStatus('App wordt geopend…');
      await loadScript(CORE_SCRIPT,12000);
      syncBuildVersion();

      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      document.getElementById('signInButton')?.removeAttribute('disabled');

      // De app-shell is de kritieke kern. Vanaf hier mag dashboard/HA/VRM niet meer blokkeren.
      ensureOneViewVisible();
      finishStartup();

      setTimeout(()=>loadDashboardInBackground(),40);
      setTimeout(()=>loadBackgroundModules().catch(error=>console.warn('Achtergrondladen:',error)),120);
      console.info(`MijnSerenity ${BUILD}: kern gestart; live modules laden op de achtergrond.`);
    }catch(error){
      console.error('MijnSerenity kernstart gedeeltelijk mislukt:',error);
      window.__msDisableLegacyVisuals=false;
      ensureOneViewVisible();
      setAuthStatus('MijnSerenity is geopend, maar de beveiligde verbinding kon nog niet volledig laden. Probeer opnieuw of gebruik “App herstellen en vernieuwen”.',true);
      if(typeof window.signIn!=='function'){
        const button=document.getElementById('signInButton');
        if(button)button.disabled=true;
      }
      finishStartup();
    }
  }

  ensureStartupGate();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
