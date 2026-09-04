/* MijnSerenity 8.23.5 — snelle uniforme stabiliteitsbootstrap
   Eén runtime voor iPhone, iPad en Stage Manager. Start en live kernwaarden
   krijgen voorrang; zware paginamodules worden pas geladen wanneer nodig. */
(()=>{
  'use strict';
  if(window.__msBootstrap823500)return;
  window.__msBootstrap823500=true;
  window.__msDisableLegacyVisuals=true;
  window.__msVictronEnergy71950=true;
  window.__msVictronEnergy71960=true;

  const BUILD='8.23.5';
  const VERSION='823500';
  const CORE_SCRIPT=`/app.js?v=${VERSION}`;
  const loaded=new Set();
  const routeLoads=new Map();
  let bootFinished=false;
  let bootFailSafe=0;

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  const LEGACY_VRM_ENDPOINT='https://wufslczbtguvtgmfufid.supabase.co/functions/v1/vrm-ruuvi';
  const RWS_API_ORIGIN='https://ddapi20-waterwebservices.rijkswaterstaat.nl';

  /* Deze modules voeden o.a. accu-, temperatuur- en technische live waarden.
     Ze laden direct ná de zichtbare Start, maar blokkeren de Start niet. */
  const LIVE_BACKGROUND=[
    `/runtime-performance-71700.js?v=${VERSION}`,
    `/victron-diagnostics.js?v=${VERSION}`,
    `/ha-live-bridge.js?v=${VERSION}`,
    `/technical-live-sync.js?v=${VERSION}`
  ];

  const IDLE_BACKGROUND=[
    `/orientation-layout-71835.js?v=${VERSION}`,
    `/movement-presence.js?v=${VERSION}`,
    `/waterkaarten-route-receiver-71870.js?v=${VERSION}`
  ];

  const SAFE_BACKGROUND=[
    `/serenity-alarm-notifications-71826.js?v=${VERSION}`,
    `/serenity-background-push-71827.js?v=${VERSION}`
  ];

  const ROUTE_MODULES={
    live:[`/live-split.js?v=${VERSION}`,`/live-cameras.js?v=${VERSION}`],
    map:[
      `/map-next-level-8220.js?v=${VERSION}`,
      `/waterkaarten-gpx-share-71700.js?v=${VERSION}`,
      `/marine-map-route-fit-71812.js?v=${VERSION}`
    ],
    planner:[
      `/route-control.js?v=${VERSION}`,`/waterkaarten-gpx-share-71700.js?v=${VERSION}`,
      `/waterkaarten-route-enrichment-71811.js?v=${VERSION}`,`/marine-map-route-fit-71812.js?v=${VERSION}`
    ],
    logbook:[`/logbook-route-assist-71828.js?v=${VERSION}`],
    costs:[`/receipt-reader-pro.js?v=${VERSION}`,`/receipt-ocr-fix-8234.js?v=${VERSION}`],
    weather:[`/weather-page.js?v=${VERSION}`,`/weather-radar.js?v=${VERSION}`,`/rws-nearby.js?v=${VERSION}`],
    rws:[`/weather-page.js?v=${VERSION}`,`/rws-nearby.js?v=${VERSION}`],
    ais:[`/ais-page.js?v=${VERSION}`],
    entertainment:[`/entertainment-page.js?v=${VERSION}`]
  };

  function installBoundedExternalFetch(){
    if(window.__msBoundedExternalFetch8202||typeof window.fetch!=='function')return;
    window.__msBoundedExternalFetch8202=true;
    const nativeFetch=window.fetch.bind(window);
    const sharedVrm=new Map();

    window.fetch=function(input,init={}){
      let url='';
      try{url=typeof input==='string'?input:input?.url||String(input||'')}catch{}
      if(!url)return nativeFetch(input,init);

      let parsed=null;
      try{parsed=new URL(url,location.href)}catch{}
      const isVrm=parsed?.href===LEGACY_VRM_ENDPOINT;
      const isRws=parsed?.origin===RWS_API_ORIGIN;
      if((!isVrm&&!isRws)||init?.signal)return nativeFetch(input,init);

      let headers=null;
      try{
        const requestHeaders=typeof Request!=='undefined'&&input instanceof Request?input.headers:undefined;
        headers=new Headers(init?.headers||requestHeaders||undefined);
      }catch{}

      const controller=new AbortController();
      const timeoutMs=isVrm?12000:15000;
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      const options={...(init||{}),signal:controller.signal};

      if(isVrm){
        const token=String(headers?.get('x-vrm-token')||headers?.get('X-VRM-Token')||'').trim();
        const key=token||'default';
        const existing=sharedVrm.get(key);
        if(existing){
          clearTimeout(timer);
          return existing.then(response=>response.clone());
        }
        const shared=nativeFetch(input,options).finally(()=>{
          clearTimeout(timer);
          sharedVrm.delete(key);
        });
        sharedVrm.set(key,shared);
        return shared.then(response=>response.clone());
      }

      return nativeFetch(input,options).finally(()=>clearTimeout(timer));
    };
  }
  installBoundedExternalFetch();

  function pathOf(value){
    try{return new URL(value,location.href).pathname}catch{return String(value||'')}
  }
  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');
    if(!target)return;
    target.textContent=message;
    target.classList.toggle('error',Boolean(isError));
  }

  function installBootGate(){
    document.documentElement.dataset.msBooting='true';
    if(!document.getElementById('msBootGate8202')){
      document.getElementById('msBootGate71919')?.remove();
      const style=document.createElement('style');
      style.id='msBootGate8202';
      style.textContent=`
        html[data-ms-booting="true"] #appView:not(.hidden){visibility:hidden!important;opacity:0!important;pointer-events:none!important}
        #msBootCover8202{position:fixed;inset:0;z-index:2147483640;display:none;place-items:center;background:#061321;color:#f6fbff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
        #msBootCover8202.is-visible{display:grid}
        #msBootCover8202>div{display:grid;gap:8px;text-align:center;padding:24px}
        #msBootCover8202 strong{font-size:28px;letter-spacing:-.04em}
        #msBootCover8202 strong span{color:#39baff;font-weight:500}
        #msBootCover8202 small{color:#9ab3c5;font-size:13px}
      `;
      document.head.appendChild(style);
    }
    if(!document.getElementById('msBootCover8202')&&document.body){
      document.getElementById('msBootCover71919')?.remove();
      const cover=document.createElement('div');
      cover.id='msBootCover8202';
      cover.innerHTML='<div><strong>Mijn<span>Serenity</span></strong><small>MijnSerenity wordt geladen…</small></div>';
      document.body.appendChild(cover);
    }
    const syncCover=()=>{
      if(bootFinished)return;
      const app=document.getElementById('appView');
      const cover=document.getElementById('msBootCover8202');
      cover?.classList.toggle('is-visible',Boolean(app&&!app.classList.contains('hidden')));
    };
    syncCover();
    const app=document.getElementById('appView');
    if(app&&!app.dataset.ms8202BootObserved){
      app.dataset.ms8202BootObserved='1';
      new MutationObserver(syncCover).observe(app,{attributes:true,attributeFilter:['class']});
    }
    clearTimeout(bootFailSafe);
    bootFailSafe=setTimeout(()=>finishBoot('failsafe'),10000);
  }

  function finishBoot(reason='ready'){
    if(bootFinished)return;
    bootFinished=true;
    clearTimeout(bootFailSafe);
    document.documentElement.removeAttribute('data-ms-booting');
    document.getElementById('msBootCover8202')?.remove();
    document.getElementById('msBootCover71919')?.remove();
    requestAnimationFrame(()=>{
      window.dispatchEvent(new CustomEvent('mijnserenity:boot-complete',{detail:{build:BUILD,reason}}));
    });
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

  function removeLegacyLayoutLayers(){
    const blocked=[
      'page-swipe.css','simple-accessible.css','captain-experience.css','navigation-compact.css',
      'marine-glass-mobile-7182.css','marine-glass-polish-7185.css','serenity-control-dashboard.css',
      'victron-energy-71559.css'
    ];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const path=pathOf(link.href);
      if(blocked.some(name=>path.endsWith('/'+name)||path.endsWith(name)))link.remove();
    });
    [
      'msMobileFlowGuard71836','msOrientationLayout71835Style','msOrientationLayout71836Style',
      'msSerenityControlCss','msMarineGlassPolish7185','mgNav718Style','msMarineGlassStable71900'
    ].forEach(id=>document.getElementById(id)?.remove());
    document.getElementById('msSerenityControl')?.remove();
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(panel=>panel.remove());
    document.body?.classList.remove(
      'ms750-simple-ui','ms760-captain-experience','ms744-keyboard-open','ms744-nav-repositioning'
    );
    document.getElementById('dashboard')?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('bottom-nav-viewport-fixed','bottom-nav-auto-hidden');
    document.documentElement.removeAttribute('data-ms-ipad-safe');
  }

  function ensureCss(path,id){
    const href=`/${path}?v=${VERSION}`;
    let link=document.getElementById(id);
    if(!link){
      link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      document.head.appendChild(link);
    }
    link.href=href;
  }

  function existingScript(path){
    const wanted=pathOf(path);
    return [...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted);
  }

  function loadScript(src,timeoutMs=12000){
    const pathname=pathOf(src);
    if(loaded.has(pathname))return Promise.resolve();
    if(existingScript(src)){
      loaded.add(pathname);
      return Promise.resolve();
    }
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      let done=false;
      const finish=error=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){
          script.remove();
          reject(error);
        }else{
          loaded.add(pathname);
          resolve();
        }
      };
      const timer=setTimeout(()=>finish(new Error(`Time-out bij ${src}`)),timeoutMs);
      script.src=src;
      script.async=false;
      script.dataset.ms8202Loaded='1';
      if(src.startsWith('http'))script.crossOrigin='anonymous';
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureFreshServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register(`/sw.js?v=${VERSION}`,{updateViaCache:'none'});
      await registration.update();
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){
      console.warn('Service worker kon niet direct worden vernieuwd:',error);
    }
  }

  async function purgeStaleRuntimeCaches(){
    let previous='';
    try{previous=localStorage.getItem('mijnserenity-runtime-build')||''}catch{}
    if(previous===BUILD)return;
    try{
      if('caches' in window){
        const names=await caches.keys();
        await Promise.all(
          names.filter(name=>name.startsWith('mijnserenity-')).map(name=>caches.delete(name))
        );
      }
    }catch(error){
      console.warn('Oude MijnSerenity-cache kon niet volledig worden verwijderd:',error);
    }
    try{localStorage.setItem('mijnserenity-runtime-build',BUILD)}catch{}
  }

  async function ensureSupabase(){
    if(window.supabase?.createClient)return;
    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{
        await loadScript(source,10000);
        if(window.supabase?.createClient)return;
      }catch(error){lastError=error}
    }
    try{
      const module=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      if(typeof module?.createClient==='function'){
        window.supabase={...(window.supabase||{}),createClient:module.createClient};
        return;
      }
    }catch(error){lastError=error}
    throw lastError||new Error('Supabase kon niet worden geladen.');
  }

  async function loadQueue(list,label){
    for(const src of list){
      try{await loadScript(src)}catch(error){console.warn(`${label} module overgeslagen:`,src,error)}
    }
  }
  function normaliseRoute(route){return String(route||'').trim().toLowerCase()}
  function loadRouteModules(route){
    const key=normaliseRoute(route);
    const modules=ROUTE_MODULES[key];
    if(!modules?.length)return Promise.resolve();
    if(routeLoads.has(key))return routeLoads.get(key);
    const task=loadQueue(modules,`Pagina ${key}`).finally(()=>routeLoads.delete(key));
    routeLoads.set(key,task);
    return task;
  }
  window.ms719LoadRouteModules=loadRouteModules;

  function wrapNavigation(){
    if(window.__ms8202NavigationWrapped||typeof window.captainNavigate!=='function')return;
    window.__ms8202NavigationWrapped=true;
    const original=window.captainNavigate;
    window.captainNavigate=function(route,...args){
      loadRouteModules(route).catch(error=>console.warn('Lazy paginalaad:',route,error));
      return original.call(this,route,...args);
    };
  }

  function installLazyRouteHooks(){
    wrapNavigation();
    document.addEventListener('click',event=>{
      const node=event.target instanceof Element
        ?event.target.closest('[data-target],[data-go],[data-route]')
        :null;
      const route=node?.dataset?.target||node?.dataset?.go||node?.dataset?.route;
      if(route&&route!=='more')loadRouteModules(route).catch(()=>{});
    },{capture:true,passive:true});
    window.addEventListener('mijnserenity:routechange',event=>{
      const detail=event?.detail;
      const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);
      if(route)loadRouteModules(route).catch(()=>{});
    },{passive:true});
  }

  function runIdle(task,delay=1200){
    if('requestIdleCallback' in window){
      window.requestIdleCallback(()=>task(),{timeout:delay+1800});
    }else{
      setTimeout(task,delay);
    }
  }

  async function start(){
    try{
      installBootGate();
      syncBuildVersion();
      removeLegacyLayoutLayers();
      ensureCss('professional-ui-71700.css','msProfessionalUi71919');
      ensureCss('marine-glass-mobile-7184.css','msStableShell71919');
      ensureCss('marine-glass-fixes-7193.css','msMarineGlassFixes71919');
      ensureCss('map-next-level-8220.css','msMapNextLevel8220');
      setAuthStatus('Beveiligde inlog wordt geladen…');

      /* Updatecontrole blokkeert de zichtbare app nooit. */
      ensureFreshServiceWorker();
      await ensureSupabase();
      await loadScript(CORE_SCRIPT,20000);
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      const button=document.getElementById('signInButton');
      if(button)button.disabled=false;

      installLazyRouteHooks();

      /* Bouw eerst de Start. OCR, kaart, entertainment en andere zware functies
         worden pas geladen wanneer de gebruiker die pagina opent. */
      try{await loadScript(`/dashboard-unified-71919-loader.js?v=${VERSION}`,12000)}catch(error){
        console.warn('Uniforme dashboardloader:',error);
      }
      wrapNavigation();
      removeLegacyLayoutLayers();
      syncBuildVersion();

      loadScript(`/runtime-stability-8202.js?v=${VERSION}`,6000).catch(error=>{
        console.warn('Runtime health guard:',error);
      });

      Promise.allSettled(LIVE_BACKGROUND.map(src=>loadScript(src,9000))).then(()=>{
        removeLegacyLayoutLayers();
        syncBuildVersion();
        window.dispatchEvent(new CustomEvent('mijnserenity:live-core-ready',{detail:{build:BUILD}}));
      });

      runIdle(()=>{
        Promise.allSettled(IDLE_BACKGROUND.map(src=>loadScript(src,9000))).then(()=>{
          syncBuildVersion();
        });
      },1000);

      runIdle(()=>{
        Promise.allSettled(SAFE_BACKGROUND.map(src=>loadScript(src,9000))).then(()=>{
          syncBuildVersion();
          window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}));
        });
      },2200);

      const openRoute=new URLSearchParams(location.search).get('open');
      if(openRoute)loadRouteModules(openRoute).catch(()=>{});
      const target=document.getElementById('authMsg');
      if(target&&/geladen|beveiligde inlog/i.test(target.textContent||''))target.textContent='Nog niet ingelogd.';
      console.info(`MijnSerenity ${BUILD}: snelle bootstrap gestart; live kernwaarden blijven actief.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);
      finishBoot('error');
      setAuthStatus('De beveiligde inlog kon niet worden geladen. Probeer de app opnieuw te openen.',true);
      const button=document.getElementById('signInButton');
      if(button)button.disabled=true;
    }
  }

  window.addEventListener('mijnserenity:dashboard-ready',()=>{
    removeLegacyLayoutLayers();
    syncBuildVersion();
    wrapNavigation();
    finishBoot('dashboard-ready');
  },{passive:true});
  window.addEventListener('pageshow',()=>{
    removeLegacyLayoutLayers();
    syncBuildVersion();
    wrapNavigation();
  },{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
