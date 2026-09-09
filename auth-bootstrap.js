/* MijnSerenity 8.31.0 — structurele bootstrap: één build, één Start, voorspelbare lazy loading. */
(()=>{
  'use strict';
  if(window.__msBootstrap8310)return;
  window.__msBootstrap8310=true;

  const BUILD='8.31.0';
  const VERSION='831000';
  const loaded=new Set();
  const pending=new Map();
  let bootDone=false;

  const SUPABASE_SOURCES=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  const CRITICAL=[
    `/mission-control.js?v=${VERSION}`,
    `/easy-auto.js?v=${VERSION}`,
    `/route-control.js?v=${VERSION}`
  ];
  const LIVE_CORE=[
    `/runtime-performance-71700.js?v=${VERSION}`,
    `/victron-diagnostics.js?v=${VERSION}`,
    `/ha-live-bridge.js?v=${VERSION}`,
    `/technical-live-sync.js?v=${VERSION}`
  ];
  const IDLE=[
    `/movement-presence.js?v=${VERSION}`,
    `/waterkaarten-route-receiver-71870.js?v=${VERSION}`,
    `/serenity-alarm-notifications-71826.js?v=${VERSION}`,
    `/serenity-background-push-71827.js?v=${VERSION}`
  ];
  const ROUTES={
    live:[`/live-split.js?v=${VERSION}`,`/live-cameras.js?v=${VERSION}`,`/route-control.js?v=${VERSION}`],
    map:[`/map-next-level-8220.js?v=${VERSION}`,`/waterkaarten-gpx-share-71700.js?v=${VERSION}`,`/marine-map-route-fit-71812.js?v=${VERSION}`],
    planner:[`/route-control.js?v=${VERSION}`,`/waterkaarten-gpx-share-71700.js?v=${VERSION}`,`/waterkaarten-route-enrichment-71811.js?v=${VERSION}`,`/marine-map-route-fit-71812.js?v=${VERSION}`],
    logbook:[`/logbook-route-assist-71828.js?v=${VERSION}`],
    costs:[`/receipt-reader-pro.js?v=${VERSION}`,`/receipt-ocr-fix-8234.js?v=${VERSION}`],
    weather:[`/weather-page.js?v=${VERSION}`,`/weather-radar.js?v=${VERSION}`,`/rws-nearby.js?v=${VERSION}`],
    rws:[`/rws-nearby.js?v=${VERSION}`],
    ais:[`/ais-page.js?v=${VERSION}`],
    entertainment:[`/entertainment-page.js?v=${VERSION}`]
  };

  function pathOf(value){try{return new URL(value,location.href).pathname}catch{return String(value||'')}}
  function setBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const v=document.getElementById('settingsAppVersion');if(v)v.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }
  function status(text,error=false){
    const el=document.getElementById('authMsg');if(!el)return;
    el.textContent=text;el.classList.toggle('error',error);
  }

  function installGuard(){
    document.documentElement.dataset.msBooting='true';
    if(document.getElementById('ms8310BootGuard'))return;
    const style=document.createElement('style');
    style.id='ms8310BootGuard';
    style.textContent=`
      #dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important;pointer-events:none!important}
      #msLegacyTelemetryBridge{display:none!important}
      html[data-ms-booting="true"] #appView:not(.hidden){visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      #ms8310BootCover{position:fixed;inset:0;z-index:2147483640;display:none;place-items:center;background:#061321;color:#f6fbff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #ms8310BootCover.show{display:grid}#ms8310BootCover>div{text-align:center;padding:24px}#ms8310BootCover strong{font-size:28px}#ms8310BootCover strong span{color:#39baff}#ms8310BootCover small{display:block;margin-top:8px;color:#9ab3c5}
    `;
    document.head.appendChild(style);
    const cover=document.createElement('div');cover.id='ms8310BootCover';cover.innerHTML='<div><strong>Mijn<span>Serenity</span></strong><small>Even aan boord komen…</small></div>';document.body?.appendChild(cover);
    const sync=()=>cover.classList.toggle('show',Boolean(document.getElementById('appView')&&!document.getElementById('appView').classList.contains('hidden')&&!document.getElementById('ms8210Start')));
    sync();new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }
  function finish(reason='ready'){
    if(bootDone)return;bootDone=true;
    document.documentElement.removeAttribute('data-ms-booting');document.getElementById('ms8310BootCover')?.remove();
    window.dispatchEvent(new CustomEvent('mijnserenity:boot-complete',{detail:{build:BUILD,reason}}));
  }

  function removeConflicts(){
    const blocked=[
      'page-swipe.css','simple-accessible.css','captain-experience.css','navigation-compact.css','futuristic-analog-7140.css',
      'dashboard-analog-7141.css','dashboard-premium-7143.css','start-cockpit-7144.css','serenity-ivms.css',
      'marine-glass-mobile-7182.css','marine-glass-polish-7185.css','serenity-control-dashboard.css','iphone-landscape-8301.css'
    ];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{const p=pathOf(link.href);if(blocked.some(name=>p.endsWith('/'+name)||p.endsWith(name)))link.remove();});
    document.querySelectorAll('#ms71510Dashboard,#serenityIvms,#msDashboardAnalog7141,#msDashboardPremium7143,#msStartCockpit7144,#msWelcomeCard7140,#msWelcomeCard7137').forEach(el=>el.remove());
  }
  function ensureStartCss(){
    let link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>pathOf(l.href)==='/start-dashboard-71510.css');
    if(!link){link=document.createElement('link');link.rel='stylesheet';document.head.appendChild(link);}
    link.href=`/start-dashboard-71510.css?v=${VERSION}`;
  }

  function existing(path){const p=pathOf(path);return [...document.scripts].find(s=>s.src&&pathOf(s.src)===p)}
  function loadScript(src,timeout=12000){
    const p=pathOf(src);if(loaded.has(p))return Promise.resolve(true);if(pending.has(p))return pending.get(p);
    const old=existing(src);if(old){loaded.add(p);return Promise.resolve(true)}
    const task=new Promise((resolve,reject)=>{
      const s=document.createElement('script');let done=false;
      const end=err=>{if(done)return;done=true;clearTimeout(timer);s.onload=s.onerror=null;if(err){s.remove();reject(err)}else{loaded.add(p);resolve(true)}};
      const timer=setTimeout(()=>end(new Error(`Time-out: ${p}`)),timeout);s.src=src;s.async=false;s.onload=()=>end();s.onerror=()=>end(new Error(`Laden mislukt: ${p}`));document.head.appendChild(s);
    }).finally(()=>pending.delete(p));pending.set(p,task);return task;
  }
  async function loadAll(list,label){for(const src of list){try{await loadScript(src)}catch(error){console.warn(`${label}:`,error)}}}
  async function loadRoute(route){const key=String(route||'').toLowerCase();const list=ROUTES[key];if(list?.length)await loadAll(list,`Route ${key}`);}
  window.ms719LoadRouteModules=loadRoute;

  async function startDashboard(){
    ensureStartCss();
    if(!window.__msStart8310)await loadScript(`/start-dashboard-core.js?v=${VERSION}`,5000);
    window.ms8300RefreshStart?.();
    return Boolean(document.getElementById('ms8210Start'));
  }
  async function ensureSupabase(){
    if(window.supabase?.createClient)return true;
    let last;
    for(const src of SUPABASE_SOURCES){try{await loadScript(src,9000);if(window.supabase?.createClient)return true}catch(e){last=e}}
    throw last||new Error('Supabase kon niet worden geladen.');
  }
  async function serviceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{const r=await navigator.serviceWorker.register(`/sw.js?v=${VERSION}`,{updateViaCache:'none'});r.update().catch(()=>{});if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'})}catch(error){console.warn('Service worker:',error)}
  }
  async function clearOldCaches(){
    let previous='';try{previous=localStorage.getItem('mijnserenity-runtime-build')||''}catch{}
    if(previous===BUILD)return;
    try{if('caches'in window){const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('mijnserenity-')).map(n=>caches.delete(n)))}}catch{}
    try{localStorage.setItem('mijnserenity-runtime-build',BUILD)}catch{}
  }

  function wrapNavigation(){
    if(window.__ms8310NavWrapped||typeof window.captainNavigate!=='function')return;
    window.__ms8310NavWrapped=true;const original=window.captainNavigate;
    window.captainNavigate=function(route,...args){
      const key=String(route||'').toLowerCase();
      return loadRoute(key).catch(error=>console.warn('Paginamodule:',key,error)).then(()=>original.call(this,route,...args));
    };
  }
  function installHooks(){
    wrapNavigation();
    document.addEventListener('pointerdown',event=>{const n=event.target instanceof Element?event.target.closest('[data-target],[data-route]'):null;const r=n?.dataset?.target||n?.dataset?.route;if(r)loadRoute(r).catch(()=>{})},{capture:true,passive:true});
    window.addEventListener('mijnserenity:routechange',event=>{const d=event.detail;const r=typeof d==='string'?d:(d?.route||d?.target||d?.id);if(r)loadRoute(r).catch(()=>{})},{passive:true});
  }
  function idle(task,delay=800){if('requestIdleCallback'in window)requestIdleCallback(task,{timeout:delay+1600});else setTimeout(task,delay)}

  async function boot(){
    installGuard();setBuild();removeConflicts();ensureStartCss();status('Beveiligde inlog wordt geladen…');
    const startTask=startDashboard().catch(error=>{console.error('Start:',error);return false});
    clearOldCaches();serviceWorker();
    try{
      await ensureSupabase();
      await loadScript(`/app.js?v=${VERSION}`,18000);
      await loadAll(CRITICAL,'Kernmodule');
      installHooks();wrapNavigation();
      await startTask;removeConflicts();setBuild();
      const signIn=document.getElementById('signInButton');if(signIn)signIn.disabled=false;
      loadScript(`/runtime-stability-8202.js?v=${VERSION}`,6000).catch(()=>{});
      Promise.allSettled(LIVE_CORE.map(src=>loadScript(src,9000))).then(()=>window.dispatchEvent(new CustomEvent('mijnserenity:live-core-ready',{detail:{build:BUILD}})));
      idle(()=>Promise.allSettled(IDLE.map(src=>loadScript(src,9000))),1000);
      const open=new URLSearchParams(location.search).get('open');if(open)loadRoute(open).catch(()=>{});
      const msg=document.getElementById('authMsg');if(msg&&/geladen|beveiligde inlog/i.test(msg.textContent||''))msg.textContent='Nog niet ingelogd.';
      finish('ready');console.info(`MijnSerenity ${BUILD}: stabiele bootstrap actief.`);
    }catch(error){
      console.error('MijnSerenity kon niet starten:',error);await startTask;finish('fallback');status('De beveiligde inlog kon niet volledig worden geladen. Controleer je verbinding en probeer opnieuw.',true);const button=document.getElementById('signInButton');if(button)button.disabled=true;
    }
  }

  window.addEventListener('mijnserenity:dashboard-ready',()=>{removeConflicts();setBuild();wrapNavigation();finish('dashboard-ready')},{passive:true});
  window.addEventListener('pageshow',()=>{removeConflicts();setBuild();wrapNavigation()},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();