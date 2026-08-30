/* MijnSerenity 7.19.10 — stabiliteitsbootstrap
   Dashboard en Victron eerst zichtbaar; aanvullende modules mogen de pagina niet blokkeren. */
(()=>{
  'use strict';
  if(window.__msBootstrap719100)return;
  window.__msBootstrap719100=true;
  window.__msDisableLegacyVisuals=true;
  window.__msVictronEnergy71950=true;

  const BUILD='7.19.10';
  const VERSION='719100';
  const CORE_SCRIPT=`/app.js?v=${VERSION}`;
  const loaded=new Set();
  const routeLoads=new Map();

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];

  const ESSENTIAL_BACKGROUND=[
    `/runtime-performance-71700.js?v=${VERSION}`,
    `/orientation-layout-71835.js?v=${VERSION}`,
    `/victron-diagnostics.js?v=${VERSION}`,
    `/ha-live-bridge.js?v=${VERSION}`,
    `/movement-presence.js?v=${VERSION}`,
    `/technical-live-sync.js?v=${VERSION}`,
    `/waterkaarten-route-receiver-71870.js?v=${VERSION}`
  ];

  const SAFE_BACKGROUND=[
    `/serenity-alarm-notifications-71826.js?v=${VERSION}`,
    `/serenity-background-push-71827.js?v=${VERSION}`
  ];

  const ROUTE_MODULES={
    live:[`/live-split.js?v=${VERSION}`,`/live-cameras.js?v=${VERSION}`],
    map:[`/waterkaarten-gpx-share-71700.js?v=${VERSION}`,`/marine-map-route-fit-71812.js?v=${VERSION}`],
    planner:[`/route-control.js?v=${VERSION}`,`/waterkaarten-gpx-share-71700.js?v=${VERSION}`,`/waterkaarten-route-enrichment-71811.js?v=${VERSION}`,`/marine-map-route-fit-71812.js?v=${VERSION}`],
    logbook:[`/logbook-route-assist-71828.js?v=${VERSION}`],
    weather:[`/weather-page.js?v=${VERSION}`,`/weather-radar.js?v=${VERSION}`,`/rws-nearby.js?v=${VERSION}`],
    rws:[`/weather-page.js?v=${VERSION}`,`/rws-nearby.js?v=${VERSION}`],
    ais:[`/ais-page.js?v=${VERSION}`],
    entertainment:[`/entertainment-page.js?v=${VERSION}`]
  };

  function pathOf(value){try{return new URL(value,location.href).pathname}catch{return String(value||'')}}
  function setAuthStatus(message,isError=false){const target=document.getElementById('authMsg');if(!target)return;target.textContent=message;target.classList.toggle('error',Boolean(isError))}
  function syncBuildVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');if(badge)badge.textContent=BUILD;
  }
  function removeLegacyLayoutLayers(){
    const blocked=['page-swipe.css','simple-accessible.css','captain-experience.css','navigation-compact.css','marine-glass-mobile-7182.css','marine-glass-polish-7185.css','serenity-control-dashboard.css','victron-energy-71559.css'];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{const path=pathOf(link.href);if(blocked.some(name=>path.endsWith('/'+name)||path.endsWith(name)))link.remove()});
    ['msMobileFlowGuard71836','msOrientationLayout71835Style','msOrientationLayout71836Style','msSerenityControlCss','msMarineGlassPolish7185','mgNav718Style','msMarineGlassStable71900'].forEach(id=>document.getElementById(id)?.remove());
    document.getElementById('msSerenityControl')?.remove();document.getElementById('mgMoreNav')?.remove();
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(panel=>panel.remove());
    document.body?.classList.remove('ms750-simple-ui','ms760-captain-experience','ms744-keyboard-open','ms744-nav-repositioning');
    document.getElementById('dashboard')?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav','bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden');
  }
  function ensureCss(path,id){const href=`/${path}?v=${VERSION}`;let link=document.getElementById(id);if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link)}link.href=href}
  function existingScript(path){const wanted=pathOf(path);return [...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted)}
  function loadScript(src,timeoutMs=12000){
    const pathname=pathOf(src);if(loaded.has(pathname))return Promise.resolve();if(existingScript(src)){loaded.add(pathname);return Promise.resolve()}
    return new Promise((resolve,reject)=>{const script=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error(`Time-out bij ${src}`)),timeoutMs);const finish=error=>{if(done)return;done=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(error){script.remove();reject(error)}else{loaded.add(pathname);resolve()}};script.src=src;script.async=false;script.dataset.ms719Loaded='1';if(src.startsWith('http'))script.crossOrigin='anonymous';script.onload=()=>finish();script.onerror=()=>finish(new Error(`Laden mislukt: ${src}`));document.head.appendChild(script)})
  }
  async function ensureSupabase(){
    if(window.supabase?.createClient)return;let lastError=null;
    for(const source of SUPABASE_SOURCES){try{await loadScript(source,10000);if(window.supabase?.createClient)return}catch(error){lastError=error}}
    try{const module=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');if(typeof module?.createClient==='function'){window.supabase={...(window.supabase||{}),createClient:module.createClient};return}}catch(error){lastError=error}
    throw lastError||new Error('Supabase kon niet worden geladen.');
  }
  async function loadQueue(list,label){for(const src of list){try{await loadScript(src)}catch(error){console.warn(`${label} module overgeslagen:`,src,error)}}}
  function normaliseRoute(route){const value=String(route||'').trim().toLowerCase();return value==='technical'?'technical':value}
  function loadRouteModules(route){const key=normaliseRoute(route);const modules=ROUTE_MODULES[key];if(!modules?.length)return Promise.resolve();if(routeLoads.has(key))return routeLoads.get(key);const task=loadQueue(modules,`Pagina ${key}`).finally(()=>routeLoads.delete(key));routeLoads.set(key,task);return task}
  window.ms719LoadRouteModules=loadRouteModules;
  function wrapNavigation(){if(window.__ms719NavigationWrapped||typeof window.captainNavigate!=='function')return;window.__ms719NavigationWrapped=true;const original=window.captainNavigate;window.captainNavigate=function(route,...args){loadRouteModules(route).catch(error=>console.warn('Lazy paginalaad:',route,error));return original.call(this,route,...args)}}
  function installLazyRouteHooks(){
    wrapNavigation();
    document.addEventListener('click',event=>{const node=event.target instanceof Element?event.target.closest('[data-target],[data-go]'):null;const route=node?.dataset?.target||node?.dataset?.go;if(route)loadRouteModules(route).catch(()=>{})},{capture:true,passive:true});
    window.addEventListener('mijnserenity:routechange',event=>{const detail=event?.detail;const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);if(route)loadRouteModules(route).catch(()=>{})},{passive:true});
  }
  async function start(){
    try{
      syncBuildVersion();removeLegacyLayoutLayers();
      ensureCss('professional-ui-71700.css','msProfessionalUi71900');
      ensureCss('marine-glass-mobile-7184.css','msStableShell71900');
      ensureCss('marine-glass-fixes-7193.css','msMarineGlassFixes7193');
      setAuthStatus('Beveiligde inlog wordt geladen…');

      await ensureSupabase();
      await loadScript(CORE_SCRIPT,20000);
      if(typeof window.signIn!=='function')throw new Error('De inlogfunctie is niet beschikbaar.');
      const button=document.getElementById('signInButton');if(button)button.disabled=false;
      installLazyRouteHooks();

      /* Dashboard eerst: geen wachten op diagnostiek, HA of andere aanvullende modules. */
      try{await loadScript(`/dashboard-pro-71531-loader.js?v=${VERSION}`,10000)}catch(error){console.warn('Dashboardloader:',error)}
      wrapNavigation();removeLegacyLayoutLayers();syncBuildVersion();

      /* Aanvullende live modules parallel op de achtergrond. */
      Promise.allSettled(ESSENTIAL_BACKGROUND.map(src=>loadScript(src,9000))).then(()=>{removeLegacyLayoutLayers();syncBuildVersion()});
      setTimeout(()=>{Promise.allSettled(SAFE_BACKGROUND.map(src=>loadScript(src,9000))).then(()=>{syncBuildVersion();window.dispatchEvent(new CustomEvent('mijnserenity:modules-ready',{detail:{build:BUILD}}))})},1200);

      const openRoute=new URLSearchParams(location.search).get('open');if(openRoute)loadRouteModules(openRoute).catch(()=>{});
      const target=document.getElementById('authMsg');if(target&&/geladen|beveiligde inlog/i.test(target.textContent||''))target.textContent='Nog niet ingelogd.';
      console.info(`MijnSerenity ${BUILD}: dashboard-first bootstrap gestart.`);
    }catch(error){console.error('MijnSerenity kon niet starten:',error);setAuthStatus('De beveiligde inlog kon niet worden geladen. Probeer de app opnieuw te openen.',true);const button=document.getElementById('signInButton');if(button)button.disabled=true}
  }
  window.addEventListener('mijnserenity:dashboard-ready',()=>{removeLegacyLayoutLayers();syncBuildVersion();wrapNavigation()},{passive:true});
  window.addEventListener('pageshow',()=>{removeLegacyLayoutLayers();syncBuildVersion();wrapNavigation()},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
