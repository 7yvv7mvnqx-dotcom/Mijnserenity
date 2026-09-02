/* MijnSerenity 8.21.7 — uniforme dashboardruntime met eenvoudige startpagina
   Eén dashboard en één navigatie-eigenaar op iPhone, iPad en Stage Manager.
   Start is het centrale menu; het oude Meer-paneel wordt niet meer opgebouwd. */
(()=>{
  'use strict';
  if(window.__msUnifiedDashboard8215)return;
  window.__msUnifiedDashboard8215=true;

  const BUILD='8.21.7';
  const VERSION='821700';
  const $=id=>document.getElementById(id);
  const pathOf=value=>{try{return new URL(value,location.href).pathname}catch{return String(value||'')}};

  function ensureStyle(){
    let style=$('msUnifiedDashboardStyle8215');
    if(style)return;
    $('msUnifiedDashboardStyle8214')?.remove();
    $('msUnifiedDashboardStyle8202')?.remove();
    $('msUnifiedDashboardStyle71919')?.remove();
    style=document.createElement('style');
    style.id='msUnifiedDashboardStyle8215';
    style.textContent=`
      #dashboard.mg-active>#ms71510Dashboard,
      #dashboard.mg-active>.ms750-simple-dashboard,
      #dashboard.mg-active>.captain-strip,
      #dashboard.mg-active>.dashboard-photo-card,
      #dashboard.mg-active>.captain-command-center,
      #dashboard.mg-active>.dashboard-actions,
      #dashboard.mg-active>#dashboardFinanceCard,
      #dashboard.mg-active>#latestRouteCard,
      #dashboard.mg-active>.compact-status{display:none!important}

      .bottom-nav.ms8214-nav{
        position:fixed!important;
        inset:auto 0 0 0!important;
        z-index:2147483000!important;
        display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        width:100%!important;
        max-width:none!important;
        height:calc(68px + env(safe-area-inset-bottom))!important;
        min-height:calc(68px + env(safe-area-inset-bottom))!important;
        padding:6px max(8px,env(safe-area-inset-right)) env(safe-area-inset-bottom) max(8px,env(safe-area-inset-left))!important;
        margin:0!important;
        gap:4px!important;
        overflow:hidden!important;
        background:rgba(2,11,19,.97)!important;
        border-top:1px solid rgba(113,220,255,.18)!important;
        box-shadow:0 -8px 24px rgba(0,0,0,.28)!important;
        backdrop-filter:blur(18px) saturate(130%);
        -webkit-backdrop-filter:blur(18px) saturate(130%);
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
        transform:none!important;
      }
      .bottom-nav.ms8214-nav .bottom-nav-item{
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:2px!important;
        width:100%!important;
        min-width:0!important;
        max-width:none!important;
        height:56px!important;
        min-height:56px!important;
        padding:3px 2px!important;
        margin:0!important;
        border:0!important;
        border-radius:14px!important;
        background:transparent!important;
        color:#c8d9e4!important;
      }
      .bottom-nav.ms8214-nav .bottom-nav-item span{display:block!important;font-size:23px!important;line-height:1!important;margin:0!important}
      .bottom-nav.ms8214-nav .bottom-nav-item small{display:block!important;font-size:10px!important;line-height:1!important;font-weight:800!important;color:inherit!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%!important}
      .bottom-nav.ms8214-nav .bottom-nav-item.active{background:rgba(57,186,255,.15)!important;color:#fff!important;box-shadow:inset 0 0 0 1px rgba(99,217,249,.25)!important}
      #ms8202More,#mgMore,#msIpadMore71917,#ms71919More{display:none!important}
      @media(max-width:700px){
        .bottom-nav.ms8214-nav{height:calc(64px + env(safe-area-inset-bottom))!important;min-height:calc(64px + env(safe-area-inset-bottom))!important}
        .bottom-nav.ms8214-nav .bottom-nav-item{height:52px!important;min-height:52px!important}
        .bottom-nav.ms8214-nav .bottom-nav-item span{font-size:21px!important}
        .bottom-nav.ms8214-nav .bottom-nav-item small{font-size:9px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCss(id,path){
    let link=$(id);
    if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link)}
    const href=`/${path}?v=${VERSION}`;
    if(link.getAttribute('href')!==href)link.setAttribute('href',href);
  }

  function removeConflicts(){
    const blocked=[
      'simple-accessible.css','captain-experience.css','victron-energy-71559.css',
      'marine-glass-mobile-7182.css','marine-glass-polish-7185.css','serenity-control-dashboard.css'
    ];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const p=pathOf(link.href);
      if(blocked.some(name=>p.endsWith('/'+name)||p.endsWith(name)))link.remove();
    });
    [
      'msOrientationLayout71835Style','msOrientationLayout71836Style','msMarineGlassPolish7185',
      'msSerenityControlCss','msSerenityControl','msMarineGlassStable71900'
    ].forEach(id=>$(id)?.remove());
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(node=>node.remove());
    const dashboard=$('dashboard');
    dashboard?.classList.remove('scd-active','mspro-active');
    document.body?.classList.remove('ms750-simple-ui','ms760-captain-experience','ms744-keyboard-open','ms744-nav-repositioning');
  }

  function load(src,timeoutMs=10000){
    const wanted=pathOf(src);
    const existing=[...document.scripts].find(script=>script.src&&pathOf(script.src)===wanted);
    if(existing)return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');
      let done=false;
      const finish=ok=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(!ok)script.remove();
        resolve(ok);
      };
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.src=src;
      script.async=false;
      script.dataset.ms8215Loaded='1';
      script.onload=()=>finish(true);
      script.onerror=()=>finish(false);
      document.head.appendChild(script);
    });
  }

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function navigate(route,button){
    if(route==='more')route='dashboard';
    closeMore(false);
    if(typeof window.captainNavigate==='function')window.captainNavigate(route,button);
    else if(typeof window.ms708GoToPage==='function')window.ms708GoToPage(route,true);
  }

  function activeRouteFromDom(){
    const visible=[...document.querySelectorAll('#appView>section[id], #appView main>section[id]')]
      .find(node=>!node.classList.contains('hidden')&&node.id!=='dashboard');
    return visible?.id||'dashboard';
  }

  function syncNav(route=activeRouteFromDom()){
    document.querySelectorAll('.bottom-nav.ms8214-nav .bottom-nav-item').forEach(button=>{
      const active=button.dataset.target===route;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }

  function navigationElement(){
    let nav=document.querySelector('.bottom-nav');
    if(!nav){
      nav=document.createElement('nav');
      nav.className='bottom-nav';
      document.body.appendChild(nav);
    }
    return nav;
  }

  function rebuildNavigation(){
    const nav=navigationElement();
    if(!nav)return;
    nav.className='bottom-nav ms8214-nav';
    nav.setAttribute('aria-label','Hoofdnavigatie');
    nav.setAttribute('aria-hidden','false');
    nav.dataset.autoHide='false';
    nav.innerHTML=`
      <button type="button" class="bottom-nav-item" data-target="dashboard" aria-label="Start"><span>🏠</span><small>Start</small></button>
      <button type="button" class="bottom-nav-item" data-target="live" aria-label="Varen"><span>⛵</span><small>Varen</small></button>
      <button type="button" class="bottom-nav-item" data-target="map" aria-label="Kaart"><span>🗺️</span><small>Kaart</small></button>
      <button type="button" class="bottom-nav-item" data-target="planner" aria-label="Reisplanner"><span>🧭</span><small>Route</small></button>
      <button type="button" class="bottom-nav-item" data-target="technical" aria-label="Techniek"><span>⚙️</span><small>Techniek</small></button>`;
    nav.onclick=event=>{
      const button=event.target.closest('.bottom-nav-item');
      if(button)navigate(button.dataset.target,button);
    };
    syncNav();
  }

  function ensureNavigation(){
    const nav=document.querySelector('.bottom-nav');
    const buttons=nav?.querySelectorAll(':scope > .bottom-nav-item');
    if(!nav||!nav.classList.contains('ms8214-nav')||buttons?.length!==5)rebuildNavigation();
  }

  function ensureMore(){
    $('mgMore')?.remove();
    $('msIpadMore71917')?.remove();
    $('ms71919More')?.remove();
    $('ms8202More')?.remove();
    window.ms797OpenMore=()=>navigate('dashboard');
  }

  function openMore(){navigate('dashboard')}

  function closeMore(sync=true){
    $('ms8202More')?.remove();
    if(sync)syncNav();
  }

  function startRootReady(){
    try{window.ms8210RefreshStart?.()}catch{}
    return Boolean($('ms8210Start'));
  }

  async function ensureSimpleStart(){
    if(startRootReady())return true;

    let ok=await load(`/simple-start-8210.js?v=${VERSION}`,10000);
    await new Promise(resolve=>setTimeout(resolve,0));
    if(startRootReady())return true;

    /* Een al aanwezige maar niet uitgevoerde/verouderde script-tag kon in 8.21.4
       als 'geladen' worden beschouwd. Als er nog geen Start-root is, één keer
       geforceerd opnieuw laden en de moduleguard resetten. */
    document.querySelectorAll('script[src]').forEach(script=>{
      if(pathOf(script.src)==='/simple-start-8210.js')script.remove();
    });
    window.__msSimpleStart8210=false;
    ok=await load(`/simple-start-8210.js?v=${VERSION}&retry=1`,10000);
    await new Promise(resolve=>setTimeout(resolve,0));
    if(startRootReady())return true;

    if(!ok)console.warn('Eenvoudige startpagina kon niet worden geladen.');
    else console.warn('Eenvoudige startpagina is geladen maar niet opgebouwd.');
    return false;
  }

  function enforceUnifiedUi(){
    ensureStyle();
    removeConflicts();
    syncVersion();
    ensureNavigation();
    ensureMore();
    if(!$('ms8210Start'))ensureSimpleStart();
  }
  window.ms8202RepairUnifiedUi=enforceUnifiedUi;
  window.ms8215RepairUnifiedUi=enforceUnifiedUi;

  function guardUnifiedUi(){
    if(window.__msUnifiedUiGuard8215)return;
    window.__msUnifiedUiGuard8215=true;
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enforceUnifiedUi()});
    };

    /* Alleen directe structuurwijzigingen bewaken; geen documentbrede subtree/class observer. */
    const bodyObserver=new MutationObserver(queue);
    bodyObserver.observe(document.body,{childList:true});
    const dashboard=$('dashboard');
    if(dashboard){
      const dashboardObserver=new MutationObserver(queue);
      dashboardObserver.observe(dashboard,{childList:true});
    }

    [100,350,900,1800,3500].forEach(ms=>setTimeout(queue,ms));
    window.addEventListener('resize',queue,{passive:true});
    window.addEventListener('orientationchange',queue,{passive:true});
    window.addEventListener('pageshow',queue,{passive:true});
    window.addEventListener('mijnserenity:routechange',event=>{
      const detail=event?.detail;
      const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);
      requestAnimationFrame(()=>{ensureNavigation();syncNav(route||activeRouteFromDom())});
    },{passive:true});
  }

  async function start(){
    ensureStyle();
    removeConflicts();
    syncVersion();
    ensureCss('msProfessionalUi71919','professional-ui-71700.css');
    ensureCss('msStableShell71919','marine-glass-mobile-7184.css');
    ensureCss('msMarineGlassFixes71919','marine-glass-fixes-7193.css');

    await load(`/mobile-viewport-guard-71911.js?v=${VERSION}`,6000);
    const dashboardOk=await load(`/dashboard-pro-71700.js?v=${VERSION}`,10000);
    if(!dashboardOk)console.warn('Marine Glass dashboard kon niet worden geladen.');
    await load(`/dashboard-live-values-fix-71914.js?v=${VERSION}`,7000);
    await load(`/dashboard-energy-bridge-8206.js?v=${VERSION}`,7000);
    await load(`/dashboard-collision-radar-8201.js?v=${VERSION}`,7000);

    removeConflicts();
    syncVersion();
    const dashboard=$('dashboard');
    if(dashboard&&$('msMarineGlass'))dashboard.classList.add('mg-active');
    await ensureSimpleStart();
    rebuildNavigation();
    ensureMore();
    guardUnifiedUi();
    requestAnimationFrame(()=>{
      syncVersion();
      syncNav();
      window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,unified:true,simpleStart:true}}));
    });
    console.info(`MijnSerenity ${BUILD}: uniforme runtime met eenvoudige startpagina actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();
