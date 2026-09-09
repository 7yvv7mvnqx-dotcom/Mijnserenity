/* MijnSerenity 8.31.2 — snelle bootstrap: minimale critical path, route-assets on demand. */
(()=>{
  'use strict';
  if(window.__msBootstrap8312)return;
  window.__msBootstrap8312=true;

  const BUILD='8.31.2';
  const VERSION='831200';
  const RECOVERY_KEY='mijnserenity-launch-recovery-8312';
  const loadedScripts=new Set();
  const loadedStyles=new Set();
  const pendingScripts=new Map();
  const pendingStyles=new Map();
  const pendingRoutes=new Map();
  let bootDone=false;
  let bootObserver=null;
  let recoveryTimer=null;

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  const LIBRARIES={
    leaflet:{
      css:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      js:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      ready:()=>Boolean(window.L?.map)
    },
    jszip:{
      js:'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      ready:()=>Boolean(window.JSZip)
    }
  };

  const START_DATA=[
    `/vrm-runtime-8312.js?v=${VERSION}`,
    `/ruuvi-climate.js?v=${VERSION}`,
    `/victron-energy-71559.js?v=${VERSION}`,
    `/victron-diagnostics.js?v=${VERSION}`,
    `/ha-live-bridge.js?v=${VERSION}`,
    `/technical-live-sync.js?v=${VERSION}`
  ];
  const IDLE=[
    `/runtime-performance-71700.js?v=${VERSION}`,
    `/movement-presence.js?v=${VERSION}`,
    `/waterkaarten-route-receiver-71870.js?v=${VERSION}`,
    `/serenity-alarm-notifications-71826.js?v=${VERSION}`,
    `/serenity-background-push-71827.js?v=${VERSION}`
  ];

  const ROUTES={
    live:{
      libs:['leaflet'],
      styles:['live-cameras.css','mission-control.css','easy-auto.css','auto-track-reliability.css','gps-continuity-guard.css','waterkaarten-split-launch.css','live-split.css','route-control.css'],
      scripts:['mission-control.js','easy-auto.js','route-control.js','live-split.js','live-cameras.js']
    },
    map:{
      libs:['leaflet'],
      scripts:['map-next-level-8220.js','waterkaarten-gpx-share-71700.js','marine-map-route-fit-71812.js']
    },
    planner:{
      libs:['leaflet'],
      styles:['route-control.css','waterkaarten-split-launch.css'],
      scripts:['route-control.js','waterkaarten-gpx-share-71700.js','waterkaarten-route-enrichment-71811.js','marine-map-route-fit-71812.js']
    },
    pois:{
      libs:['leaflet'],
      styles:['poi-regio-filter-71511.css'],
      scripts:['poi-regio-filter-71511.js']
    },
    logbook:{
      libs:['jszip'],
      scripts:['logbook-route-assist-71828.js']
    },
    costs:{scripts:['receipt-reader-pro.js','receipt-ocr-fix-8234.js']},
    weather:{
      styles:['weather-page.css','weather-radar.css','rws-nearby.css','wind-direction-71512.css'],
      scripts:['weather-page.js','weather-radar.js','wind-direction-71512.js','rws-nearby.js','rws-compat-8233.js']
    },
    rws:{
      styles:['rws-nearby.css'],
      scripts:['rws-nearby.js','rws-compat-8233.js']
    },
    ais:{
      styles:['ais-page.css'],
      scripts:['ais-page.js','ais-gps-fix-8221.js']
    },
    entertainment:{
      styles:['entertainment-page.css','home-assistant-contrast.css'],
      scripts:['entertainment-page.js']
    },
    technical:{
      styles:['ha-live-bridge.css','technical-live-sync.css','ruuvi-climate.css','victron-energy-71559.css','victron-diagnostics.css','home-assistant-contrast.css'],
      scripts:['ha-live-bridge.js','technical-live-sync.js','ruuvi-climate.js','victron-energy-71559.js','victron-diagnostics.js']
    }
  };

  function assetKey(value){
    try{const u=new URL(value,location.href);return `${u.origin}${u.pathname}`}
    catch{return String(value||'').split('?')[0]}
  }
  function pathOf(value){try{return new URL(value,location.href).pathname}catch{return String(value||'')}}
  function slowFactor(){
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const t=String(c?.effectiveType||'').toLowerCase();
    if(c?.saveData)return 1.8;
    if(t==='slow-2g'||t==='2g')return 2.2;
    if(t==='3g')return 1.45;
    return 1;
  }
  function timeout(base){return Math.round(base*slowFactor())}
  function status(text,error=false){
    const el=document.getElementById('authMsg');if(!el)return;
    el.textContent=text;el.classList.toggle('error',error);
  }
  function setBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const v=document.getElementById('settingsAppVersion');if(v)v.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  function installGuard(){
    document.documentElement.dataset.msBooting='true';
    document.documentElement.dataset.msStartBoot='1';
    let cover=document.getElementById('ms8312BootCover');
    if(!cover){
      cover=document.createElement('div');cover.id='ms8312BootCover';
      cover.innerHTML='<div><strong>Mijn<span>Serenity</span></strong><small>Dashboard laden…</small></div>';
      const style=document.createElement('style');style.id='ms8312BootCoverStyle';style.textContent=`
        #ms8312BootCover{position:fixed;inset:0;z-index:2147483640;display:none;place-items:center;background:#061321;color:#f6fbff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        #ms8312BootCover.show{display:grid}#ms8312BootCover>div{text-align:center;padding:24px}#ms8312BootCover strong{font-size:28px}#ms8312BootCover strong span{color:#39baff}#ms8312BootCover small{display:block;margin-top:8px;color:#9ab3c5}`;
      document.head.appendChild(style);document.body?.appendChild(cover);
    }
    const sync=()=>cover.classList.toggle('show',Boolean(document.getElementById('appView')&&!document.getElementById('appView').classList.contains('hidden')&&!document.getElementById('ms8210Start')));
    sync();bootObserver?.disconnect();bootObserver=new MutationObserver(sync);bootObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }
  function finish(reason='ready'){
    if(bootDone)return;bootDone=true;
    bootObserver?.disconnect();bootObserver=null;
    document.documentElement.removeAttribute('data-ms-booting');
    document.documentElement.removeAttribute('data-ms-start-boot');
    document.getElementById('ms8312BootCover')?.remove();
    document.getElementById('ms8312BootCoverStyle')?.remove();
    window.dispatchEvent(new CustomEvent('mijnserenity:boot-complete',{detail:{build:BUILD,reason}}));
  }

  function isVisible(node){
    if(!node||!node.isConnected)return false;
    const style=getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
    const rect=node.getBoundingClientRect();
    return rect.width>1&&rect.height>1;
  }
  function showRecoveryFallback(){
    document.documentElement.removeAttribute('data-ms-booting');
    document.documentElement.removeAttribute('data-ms-start-boot');
    let cover=document.getElementById('ms8312BootCover');
    if(!cover){
      cover=document.createElement('div');cover.id='ms8312BootCover';document.body?.appendChild(cover);
    }
    Object.assign(cover.style,{display:'grid',position:'fixed',inset:'0',zIndex:'2147483640',placeItems:'center',background:'#061321',color:'#f6fbff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'});
    cover.innerHTML='<div style="text-align:center;padding:24px"><strong style="font-size:26px">MijnSerenity</strong><small style="display:block;margin:9px 0 18px;color:#9ab3c5">Opstarten duurde te lang.</small><button type="button" style="padding:12px 18px;border:0;border-radius:12px;font-weight:700" onclick="location.reload()">Opnieuw laden</button></div>';
  }
  function scheduleRecoveryCheck(reason='startup',delay=6500){
    clearTimeout(recoveryTimer);
    recoveryTimer=setTimeout(()=>{
      if(document.hidden)return;
      const auth=document.getElementById('authView');
      const approval=document.getElementById('approvalView');
      const app=document.getElementById('appView');
      const start=document.getElementById('ms8210Start');
      const usable=isVisible(auth)||isVisible(approval)||(isVisible(app)&&Boolean(start));
      if(usable){try{sessionStorage.removeItem(RECOVERY_KEY)}catch{};return}
      let attempts=0;try{attempts=Number(sessionStorage.getItem(RECOVERY_KEY)||0)}catch{}
      if(attempts<1){
        try{sessionStorage.setItem(RECOVERY_KEY,String(attempts+1))}catch{}
        const url=new URL(location.href);url.searchParams.set('herstelstart',Date.now().toString());location.replace(url.toString());return;
      }
      console.warn('MijnSerenity startwatchdog:',reason,'UI bleef onzichtbaar.');showRecoveryFallback();
    },timeout(delay));
  }

  function removeConflicts(){
    const blocked=['page-swipe.css','simple-accessible.css','captain-experience.css','navigation-compact.css','futuristic-analog-7140.css','dashboard-analog-7141.css','dashboard-premium-7143.css','start-cockpit-7144.css','serenity-ivms.css','marine-glass-mobile-7182.css','marine-glass-polish-7185.css','serenity-control-dashboard.css','iphone-landscape-8301.css'];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{const p=pathOf(link.href);if(blocked.some(name=>p.endsWith('/'+name)||p.endsWith(name)))link.remove()});
    document.querySelectorAll('#ms71510Dashboard,#serenityIvms,#msDashboardAnalog7141,#msDashboardPremium7143,#msStartCockpit7144,#msWelcomeCard7140,#msWelcomeCard7137').forEach(el=>el.remove());
  }
  function ensureStartCss(){
    const src=`/start-dashboard-71510.css?v=${VERSION}`;
    let link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>pathOf(l.href)==='/start-dashboard-71510.css');
    if(!link){link=document.createElement('link');link.rel='stylesheet';document.head.appendChild(link)}
    if(link.getAttribute('href')!==src)link.href=src;
    loadedStyles.add(assetKey(src));
  }

  function existingScript(src){const key=assetKey(src);return [...document.scripts].find(s=>s.src&&assetKey(s.src)===key)}
  function loadScript(src,baseTimeout=10000){
    const key=assetKey(src);if(loadedScripts.has(key))return Promise.resolve(true);if(pendingScripts.has(key))return pendingScripts.get(key);
    const old=existingScript(src);if(old){loadedScripts.add(key);return Promise.resolve(true)}
    const task=new Promise((resolve,reject)=>{
      const s=document.createElement('script');let done=false;
      const end=err=>{if(done)return;done=true;clearTimeout(timer);s.onload=s.onerror=null;if(err){s.remove();reject(err)}else{loadedScripts.add(key);resolve(true)}};
      const timer=setTimeout(()=>end(new Error(`Time-out: ${pathOf(src)}`)),timeout(baseTimeout));
      s.src=src;s.async=false;s.onload=()=>end();s.onerror=()=>end(new Error(`Laden mislukt: ${pathOf(src)}`));document.head.appendChild(s);
    }).finally(()=>pendingScripts.delete(key));pendingScripts.set(key,task);return task;
  }
  function loadStyle(src,baseTimeout=7000){
    const full=/^https?:/i.test(src)?src:`/${String(src).replace(/^\//,'')}?v=${VERSION}`;
    const key=assetKey(full);if(loadedStyles.has(key))return Promise.resolve(true);if(pendingStyles.has(key))return pendingStyles.get(key);
    const old=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>assetKey(l.href)===key);if(old){loadedStyles.add(key);return Promise.resolve(true)}
    const task=new Promise((resolve,reject)=>{
      const link=document.createElement('link');let done=false;
      const end=err=>{if(done)return;done=true;clearTimeout(timer);link.onload=link.onerror=null;if(err){link.remove();reject(err)}else{loadedStyles.add(key);resolve(true)}};
      const timer=setTimeout(()=>end(new Error(`CSS time-out: ${pathOf(full)}`)),timeout(baseTimeout));
      link.rel='stylesheet';link.href=full;link.onload=()=>end();link.onerror=()=>end(new Error(`CSS laden mislukt: ${pathOf(full)}`));document.head.appendChild(link);
    }).finally(()=>pendingStyles.delete(key));pendingStyles.set(key,task);return task;
  }
  async function loadAll(list,label){for(const src of list||[]){const full=/^https?:/i.test(src)||src.startsWith('/')?src:`/${src}?v=${VERSION}`;try{await loadScript(full)}catch(error){console.warn(`${label}:`,error)}}}
  async function loadStyles(list,label){await Promise.allSettled((list||[]).map(src=>loadStyle(src).catch(error=>{console.warn(`${label}:`,error);throw error})))}
  async function loadLibrary(name){
    const lib=LIBRARIES[name];if(!lib)return true;if(lib.ready?.())return true;
    if(lib.css)await loadStyle(lib.css,8000);
    if(lib.js)await loadScript(lib.js,11000);
    if(lib.ready&&!lib.ready())throw new Error(`${name} is niet beschikbaar na laden.`);
    return true;
  }
  async function loadRoute(route){
    const key=String(route||'').toLowerCase();const def=ROUTES[key];if(!def)return true;if(pendingRoutes.has(key))return pendingRoutes.get(key);
    const task=(async()=>{
      await Promise.all([Promise.all((def.libs||[]).map(loadLibrary)),loadStyles(def.styles,`Route ${key} CSS`)]);
      await loadAll(def.scripts,`Route ${key}`);return true;
    })().finally(()=>pendingRoutes.delete(key));pendingRoutes.set(key,task);return task;
  }
  window.ms719LoadRouteModules=loadRoute;

  async function startDashboard(){
    ensureStartCss();
    if(!window.__msStart8310)await loadScript(`/start-dashboard-core.js?v=${VERSION}`,4500);
    window.ms8300RefreshStart?.();
    return Boolean(document.getElementById('ms8210Start'));
  }
  async function ensureSupabase(){
    if(window.supabase?.createClient)return true;
    let last;
    for(const [i,src] of SUPABASE_SOURCES.entries()){
      try{await loadScript(src,i===0?6500:5500);if(window.supabase?.createClient)return true}catch(error){last=error}
    }
    throw last||new Error('Supabase kon niet worden geladen.');
  }
  async function serviceWorker(){
    if(!/^https?:$/.test(location.protocol)||!('serviceWorker' in navigator))return;
    try{await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'})}catch(error){console.warn('Service worker:',error)}
  }
  async function clearOldCaches(){
    let previous='';try{previous=localStorage.getItem('mijnserenity-runtime-build')||''}catch{}
    if(previous===BUILD)return;
    try{if('caches'in window){const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('mijnserenity-')).map(n=>caches.delete(n)))}}catch{}
    try{localStorage.setItem('mijnserenity-runtime-build',BUILD)}catch{}
  }
  function scheduleMaintenance(){
    idle(()=>clearOldCaches().then(serviceWorker).catch(error=>console.warn('Opstartonderhoud:',error)),1800);
  }

  function wrapNavigation(){
    if(window.__ms8312NavWrapped||typeof window.captainNavigate!=='function')return;
    window.__ms8312NavWrapped=true;const original=window.captainNavigate;
    window.captainNavigate=function(route,...args){const key=String(route||'').toLowerCase();return loadRoute(key).catch(error=>console.warn('Paginamodule:',key,error)).then(()=>original.call(this,route,...args))};
  }
  function installHooks(){
    wrapNavigation();
    document.addEventListener('pointerdown',event=>{const n=event.target instanceof Element?event.target.closest('[data-target],[data-route]'):null;const r=n?.dataset?.target||n?.dataset?.route;if(r)loadRoute(r).catch(()=>{})},{capture:true,passive:true});
    window.addEventListener('mijnserenity:routechange',event=>{const d=event.detail;const r=typeof d==='string'?d:(d?.route||d?.target||d?.id);if(r)loadRoute(r).catch(()=>{})},{passive:true});
  }
  function idle(task,delay=800){
    const c=navigator.connection||{};const extra=c.saveData?1200:0;
    if('requestIdleCallback'in window)requestIdleCallback(task,{timeout:delay+extra+1800});else setTimeout(task,delay+extra)
  }

  async function boot(){
    installGuard();setBuild();removeConflicts();ensureStartCss();status('Beveiligde inlog wordt geladen…');scheduleRecoveryCheck('boot');
    const startTask=startDashboard().catch(error=>{console.error('Start:',error);return false});
    const slowNotice=setTimeout(()=>status('Verbinding is wat trager; MijnSerenity blijft rustig doorladen…'),timeout(4200));
    try{
      await ensureSupabase();
      await loadScript(`/app.js?v=${VERSION}`,14500);
      installHooks();wrapNavigation();
      await startTask;removeConflicts();setBuild();
      const signIn=document.getElementById('signInButton');if(signIn)signIn.disabled=false;
      clearTimeout(slowNotice);finish('ready');scheduleRecoveryCheck('ready',2200);scheduleMaintenance();
      loadScript(`/runtime-stability-8202.js?v=${VERSION}`,6000).catch(()=>{});
      idle(()=>Promise.allSettled(START_DATA.map(src=>loadScript(src,8500))).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-core-ready',{detail:{build:BUILD}}))),250);
      idle(()=>Promise.allSettled(IDLE.map(src=>loadScript(src,8500))),1300);
      const open=new URLSearchParams(location.search).get('open');if(open)loadRoute(open).catch(()=>{});
      const msg=document.getElementById('authMsg');if(msg&&/geladen|beveiligde inlog|trager/i.test(msg.textContent||''))msg.textContent='Nog niet ingelogd.';
      console.info(`MijnSerenity ${BUILD}: snelle bootstrap actief.`);
    }catch(error){
      clearTimeout(slowNotice);console.error('MijnSerenity kon niet starten:',error);await startTask;finish('fallback');status('De beveiligde inlog kon niet volledig worden geladen. Controleer je verbinding en probeer opnieuw.',true);const button=document.getElementById('signInButton');if(button)button.disabled=true;scheduleRecoveryCheck('fallback',2200);
    }
  }

  window.addEventListener('mijnserenity:dashboard-ready',()=>{removeConflicts();setBuild();wrapNavigation();finish('dashboard-ready');scheduleRecoveryCheck('dashboard-ready',1200)},{passive:true});
  window.addEventListener('pageshow',()=>{removeConflicts();setBuild();wrapNavigation();scheduleRecoveryCheck('pageshow',2500)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRecoveryCheck('visible',2500)},{passive:true});
  if(document.body)queueMicrotask(boot);else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();