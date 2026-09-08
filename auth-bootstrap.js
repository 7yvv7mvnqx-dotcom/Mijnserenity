/* MijnSerenity 8.31.1 — deterministische bootstrap.
   Start direct lokaal; Supabase/app en pagina-modules laden daarna in vaste volgorde. */
(()=>{
  'use strict';
  if(window.__msBootstrap8311)return;
  window.__msBootstrap8311=true;
  window.__msBootstrap830400=true;
  window.__msDisableLegacyVisuals=true;

  const BUILD='8.31.1';
  const TOKEN='831100';
  const CORE_SCRIPT=`/app.js?v=${TOKEN}`;
  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  const loaded=new Set();
  const pending=new Map();
  const routeLoads=new Map();
  let appReady=false;

  const CRITICAL_AFTER_APP=[
    `/mission-control.js?v=${TOKEN}`,
    `/route-control.js?v=${TOKEN}`,
    `/easy-auto.js?v=${TOKEN}`,
    `/ruuvi-climate.js?v=${TOKEN}`,
    `/victron-energy-71559.js?v=${TOKEN}`,
    `/rws-compat-8233.js?v=${TOKEN}`
  ];
  const BACKGROUND_LIVE=[
    `/runtime-performance-71700.js?v=${TOKEN}`,
    `/runtime-stability-8202.js?v=${TOKEN}`,
    `/victron-diagnostics.js?v=${TOKEN}`,
    `/ha-live-bridge.js?v=${TOKEN}`,
    `/technical-live-sync.js?v=${TOKEN}`
  ];
  const BACKGROUND_IDLE=[
    `/movement-presence.js?v=${TOKEN}`,
    `/serenity-alarm-notifications-71826.js?v=${TOKEN}`,
    `/serenity-background-push-71827.js?v=${TOKEN}`,
    `/waterkaarten-route-receiver-71870.js?v=${TOKEN}`
  ];
  const ROUTE_MODULES={
    live:[`/live-cameras.js?v=${TOKEN}`,`/live-split.js?v=${TOKEN}`],
    map:[`/map-next-level-8220.js?v=${TOKEN}`,`/waterkaarten-gpx-share-71700.js?v=${TOKEN}`,`/marine-map-route-fit-71812.js?v=${TOKEN}`],
    planner:[`/waterkaarten-gpx-share-71700.js?v=${TOKEN}`,`/waterkaarten-route-enrichment-71811.js?v=${TOKEN}`,`/marine-map-route-fit-71812.js?v=${TOKEN}`],
    logbook:[`/logbook-route-assist-71828.js?v=${TOKEN}`],
    costs:[`/receipt-reader-pro.js?v=${TOKEN}`,`/receipt-ocr-fix-8234.js?v=${TOKEN}`],
    weather:[`/weather-page.js?v=${TOKEN}`,`/weather-radar.js?v=${TOKEN}`,`/rws-nearby.js?v=${TOKEN}`],
    rws:[`/rws-nearby.js?v=${TOKEN}`],
    ais:[`/ais-page.js?v=${TOKEN}`,`/ais-gps-fix-8221.js?v=${TOKEN}`],
    entertainment:[`/entertainment-page.js?v=${TOKEN}`]
  };

  function pathOf(value){try{return new URL(String(value||''),location.href).pathname}catch{return String(value||'')}}
  function setAuthStatus(message,isError=false){
    const target=document.getElementById('authMsg');if(!target)return;
    target.textContent=message;target.classList.toggle('error',Boolean(isError));
  }
  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }
  function removeLegacyVisuals(){
    ['msMarineGlass','msDashboardPremium7143','msStartCockpit7144','serenityIvms','ms71510Dashboard','msDashboardAnalog7141','msWelcomeCard7140','msWelcomeCard7137']
      .forEach(id=>document.getElementById(id)?.remove());
    const dashboard=document.getElementById('dashboard');
    if(dashboard){
      [...dashboard.children].forEach(child=>{
        if(child.id==='ms8210Start'||child.id==='msLegacyTelemetryBridge')return;
        if(/(?:dashboard|start|welcome|ivms|marine)/i.test(`${child.id} ${child.className}`))child.remove();
      });
    }
  }

  function existingScript(src){
    const wanted=pathOf(src);
    return [...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted);
  }
  function loadScript(src,timeoutMs=12000){
    const path=pathOf(src);
    if(loaded.has(path))return Promise.resolve(true);
    if(pending.has(path))return pending.get(path);
    const existing=existingScript(src);
    if(existing&&existing.dataset.ms8311Ready==='1'){loaded.add(path);return Promise.resolve(true);}
    const task=new Promise((resolve,reject)=>{
      const script=existing||document.createElement('script');
      let done=false;
      const finish=(ok,error)=>{
        if(done)return;done=true;clearTimeout(timer);pending.delete(path);
        if(ok){script.dataset.ms8311Ready='1';loaded.add(path);resolve(true)}else{if(!existing)script.remove();reject(error||new Error(`Laden mislukt: ${src}`))}
      };
      const timer=setTimeout(()=>finish(false,new Error(`Time-out bij ${src}`)),timeoutMs);
      script.addEventListener('load',()=>finish(true),{once:true});
      script.addEventListener('error',()=>finish(false,new Error(`Laden mislukt: ${src}`)),{once:true});
      if(!existing){script.src=src;script.async=false;script.dataset.ms8311Loaded='1';(document.head||document.documentElement).appendChild(script);}
    });
    pending.set(path,task);return task;
  }
  async function loadQueue(list,label){
    for(const src of list){
      try{await loadScript(src,10000)}catch(error){console.warn(`${label}: ${src}`,error)}
    }
  }
  function runIdle(task,delay=1000){
    if('requestIdleCallback' in window)window.requestIdleCallback(()=>task(),{timeout:delay+1600});else setTimeout(task,delay);
  }

  async function ensureCanonicalVisuals(){
    const css=document.querySelector('link[href*="serenity-theme-8311.css"]');
    if(!css){const link=document.createElement('link');link.rel='stylesheet';link.href=`/serenity-theme-8311.css?v=${TOKEN}`;document.head.appendChild(link);}
    await Promise.allSettled([
      window.__msSerenityTheme8311?Promise.resolve():loadScript(`/serenity-theme-8311.js?v=${TOKEN}`,5000),
      window.__msStart8311?Promise.resolve():loadScript(`/start-dashboard-core-8311.js?v=${TOKEN}`,5000)
    ]);
    removeLegacyVisuals();
    window.ms8300RefreshStart?.();
  }

  async function ensureSupabase(){
    if(window.supabase?.createClient)return true;
    let lastError=null;
    for(const source of SUPABASE_SOURCES){
      try{await loadScript(source,9000);if(window.supabase?.createClient)return true}catch(error){lastError=error}
    }
    throw lastError||new Error('Supabase kon niet worden geladen.');
  }

  function normaliseRoute(route){return String(route||'').trim().toLowerCase()}
  function loadRouteModules(route){
    const key=normaliseRoute(route),modules=ROUTE_MODULES[key];
    if(!modules?.length)return Promise.resolve();
    if(routeLoads.has(key))return routeLoads.get(key);
    const task=loadQueue(modules,`Pagina ${key}`).finally(()=>routeLoads.delete(key));
    routeLoads.set(key,task);return task;
  }
  window.ms719LoadRouteModules=loadRouteModules;

  function wrapNavigation(){
    if(window.__ms8311NavigationWrapped||typeof window.captainNavigate!=='function')return;
    window.__ms8311NavigationWrapped=true;
    const original=window.captainNavigate;
    window.captainNavigate=function(route,...args){
      loadRouteModules(route).catch(error=>console.warn('Lazy paginalaad:',route,error));
      const result=original.call(this,route,...args);
      window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{detail:{route:normaliseRoute(route),source:'navigation-8311'}}));
      return result;
    };
  }
  function installRouteHooks(){
    wrapNavigation();
    window.addEventListener('mijnserenity:route-requested',event=>{
      const route=event?.detail?.route;if(!route)return;
      loadRouteModules(route).finally(()=>{if(typeof window.captainNavigate==='function')window.captainNavigate(route)});
    });
    document.addEventListener('click',event=>{
      const node=event.target instanceof Element?event.target.closest('[data-target],[data-route]'):null;
      const route=node?.dataset?.target||node?.dataset?.route;
      if(route&&route!=='dashboard')loadRouteModules(route).catch(()=>{});
    },{capture:true,passive:true});
  }

  async function clearObsoleteCaches(){
    let previous='';try{previous=localStorage.getItem('mijnserenity-runtime-build')||''}catch{}
    if(previous===BUILD)return;
    try{
      if('caches' in window){
        const names=await caches.keys();
        await Promise.all(names.filter(name=>name.startsWith('mijnserenity-')&&!name.includes('8311')).map(name=>caches.delete(name)));
      }
    }catch(error){console.warn('Oude cache kon niet volledig worden verwijderd:',error)}
    try{localStorage.setItem('mijnserenity-runtime-build',BUILD)}catch{}
  }
  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register(`/sw.js?v=${TOKEN}`,{updateViaCache:'none'});
      await registration.update();
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){console.warn('Service worker niet beschikbaar:',error)}
  }

  async function start(){
    syncBuild();removeLegacyVisuals();setAuthStatus('Beveiligde inlog wordt geladen…');
    /* Visueel gedeelte start zonder netwerkdependency. */
    const visualTask=ensureCanonicalVisuals();
    await clearObsoleteCaches();
    try{
      await ensureSupabase();
      await loadScript(CORE_SCRIPT,20000);
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      await loadQueue(CRITICAL_AFTER_APP,'Kernmodule');
      installRouteHooks();wrapNavigation();appReady=true;
      await visualTask;
      removeLegacyVisuals();syncBuild();
      window.dispatchEvent(new CustomEvent('mijnserenity:app-ready',{detail:{build:BUILD}}));
      const pendingRoute=window.MIJSERENITY_PENDING_ROUTE;
      if(pendingRoute){window.MIJSERENITY_PENDING_ROUTE='';loadRouteModules(pendingRoute).finally(()=>window.captainNavigate?.(pendingRoute));}
      Promise.allSettled(BACKGROUND_LIVE.map(src=>loadScript(src,9000))).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-core-ready',{detail:{build:BUILD}})));
      runIdle(()=>Promise.allSettled(BACKGROUND_IDLE.map(src=>loadScript(src,9000))),1400);
      const openRoute=new URLSearchParams(location.search).get('open');if(openRoute)loadRouteModules(openRoute).catch(()=>{});
      registerServiceWorker();
      const target=document.getElementById('authMsg');if(target&&/geladen|beveiligde inlog/i.test(target.textContent||''))target.textContent='Nog niet ingelogd.';
      console.info(`MijnSerenity ${BUILD}: deterministische bootstrap gereed.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);
      await visualTask.catch(()=>{});
      setAuthStatus('De beveiligde inlog kon niet volledig worden geladen. Controleer de verbinding en probeer opnieuw.',true);
      const button=document.getElementById('signInButton');if(button)button.disabled=true;
    }
  }

  window.ms8311AppReady=()=>appReady;
  window.addEventListener('pageshow',()=>{removeLegacyVisuals();syncBuild();wrapNavigation()},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();