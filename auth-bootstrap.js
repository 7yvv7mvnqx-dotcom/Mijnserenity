/* MijnSerenity 7.18.21 — stabiele opstart, sessiegate en netwerkherstel */
(()=>{
  'use strict';
  window.__msDisableLegacyVisuals=true;
  const BUILD='7.18.21';
  const VERSION='718210';
  const CORE_SCRIPT=`app.js?v=${VERSION}`;
  const MEMBERSHIP_FIX=`membership-load-fix-71821.js?v=${VERSION}`;
  const STARTUP_TIMEOUT_MS=22000;

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
  let startupCoreReady=false;
  let startupViewTouched=false;
  let startupObserver=null;
  let startupTimer=null;
  let membershipAlertGuardActive=false;
  let membershipAlertOriginal=null;

  function syncBuildVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const cockpitBadge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(cockpitBadge)cockpitBadge.textContent=BUILD;
    const startup=document.querySelector('#msStartupGate .ms-startup-version');
    if(startup)startup.textContent=`versie ${BUILD}`;
  }

  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function installMembershipAlertGuard(){
    if(membershipAlertGuardActive)return;
    membershipAlertGuardActive=true;
    membershipAlertOriginal=window.alert.bind(window);
    window.alert=(message,...args)=>{
      const text=String(message??'');
      if(
        text.startsWith('Lidmaatschap laden mislukt:')&&
        /load failed|failed to fetch|networkerror|network request|timeout|fetch/i.test(text)
      ){
        console.warn('MijnSerenity: tijdelijke lidmaatschapsfout wordt automatisch hersteld:',text);
        setStartupStatus('Verbinding met Serenity wordt opnieuw geprobeerd…');
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
        #msStartupGate .ms-startup-actions{display:none;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap}
        #msStartupGate.ms-startup-error .ms-startup-spinner{display:none}
        #msStartupGate.ms-startup-error .ms-startup-actions{display:flex}
        #msStartupGate button{appearance:none;border:1px solid #2f6078;border-radius:12px;padding:11px 15px;background:#0d2a3c;color:#f5fbff;font:inherit;font-weight:700}
        #msStartupGate button:first-child{background:#0c87b8;border-color:#0c87b8}
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
        <div class="ms-startup-actions">
          <button id="msStartupRetry" type="button">Opnieuw proberen</button>
          <button id="msStartupRepair" type="button">App herstellen</button>
        </div>
      </div>`;
    document.body.appendChild(gate);

    document.getElementById('msStartupRetry')?.addEventListener('click',()=>location.reload());
    document.getElementById('msStartupRepair')?.addEventListener('click',()=>{
      if(typeof window.repairMijnSerenity==='function')window.repairMijnSerenity();
      else location.reload();
    });

    const views=['authView','approvalView','appView']
      .map(id=>document.getElementById(id))
      .filter(Boolean);

    startupObserver=new MutationObserver(mutations=>{
      if(mutations.some(item=>item.type==='attributes'&&item.attributeName==='class')){
        startupViewTouched=true;
        maybeFinishStartup();
      }
    });
    views.forEach(view=>startupObserver.observe(view,{attributes:true,attributeFilter:['class']}));

    startupTimer=setTimeout(()=>{
      showStartupError('Het starten duurt langer dan normaal. Probeer opnieuw; je gegevens blijven bewaard.');
    },STARTUP_TIMEOUT_MS);
  }

  function setStartupStatus(message){
    const target=document.getElementById('msStartupStatus');
    if(target)target.textContent=message;
  }

  function showStartupError(message){
    if(startupResolved)return;
    const gate=document.getElementById('msStartupGate');
    if(!gate)return;
    gate.classList.add('ms-startup-error');
    setStartupStatus(message);
  }

  function finishStartup(){
    if(startupResolved)return;
    startupResolved=true;
    if(startupTimer){clearTimeout(startupTimer);startupTimer=null}
    startupObserver?.disconnect();
    startupObserver=null;
    document.documentElement.classList.remove('ms-starting');
    const gate=document.getElementById('msStartupGate');
    if(gate){
      gate.style.opacity='0';
      setTimeout(()=>gate.remove(),180);
    }
  }

  function maybeFinishStartup(){
    if(startupResolved||!startupCoreReady||!startupViewTouched)return;
    const visible=['authView','approvalView','appView']
      .map(id=>document.getElementById(id))
      .filter(view=>view&&!view.classList.contains('hidden'));
    if(visible.length===1)requestAnimationFrame(finishStartup);
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

  function loadScript(src,timeoutMs=16000){
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
        setStartupStatus('Beveiligde sessie wordt gecontroleerd…');
        await loadScript(source,8000);
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
      ensureStartupGate();
      ensureProfessionalUi();
      addPreconnect('https://cdn.jsdelivr.net');
      addPreconnect('https://unpkg.com');
      syncBuildVersion();
      setAuthStatus('Beveiligde inlog wordt geladen…');
      setStartupStatus('Nieuwe versie en sessie worden gecontroleerd…');
      ensureServiceWorker();
      await ensureSupabase();
      installMembershipAlertGuard();
      setStartupStatus('Dashboard wordt klaargezet…');
      startupViewTouched=false;
      await loadScript(CORE_SCRIPT,15000);
      try{
        await loadScript(MEMBERSHIP_FIX,8000);
      }catch(error){
        console.warn('Lidmaatschapsherstel kon niet laden:',error);
        window.__msRestoreMembershipAlertGuard?.();
      }
      startupCoreReady=true;
      syncBuildVersion();
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      const button=document.getElementById('signInButton');
      if(button)button.disabled=false;
      maybeFinishStartup();
      setTimeout(()=>loadBackgroundModules().catch(error=>console.warn('Achtergrondladen:',error)),40);
      console.info(`MijnSerenity ${BUILD}: kern gestart.`);
    }catch(error){
      window.__msRestoreMembershipAlertGuard?.();
      console.error('MijnSerenity kon niet starten:',error);
      setAuthStatus('De beveiligde inlog kon niet worden geladen. Tik op “App herstellen en vernieuwen” en probeer opnieuw.',true);
      const button=document.getElementById('signInButton');
      if(button)button.disabled=true;
      showStartupError('MijnSerenity kon niet volledig starten. Controleer de verbinding en probeer opnieuw.');
    }
  }

  ensureStartupGate();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
