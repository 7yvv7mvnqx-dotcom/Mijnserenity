/* ============================================================
   MijnSerenity 7.18.29 — harde iPhone scrollherstel zonder pager
   ============================================================ */
(()=>{
  'use strict';
  if(window.__msStableNavigation71829)return;
  window.__msStableNavigation71829=true;
  window.__msStableNavigation71828=true;

  const BUILD='7.18.29';
  const PAGE_IDS=[
    'dashboard','live','ais','weather','rws','map','planner','entertainment',
    'presence','technical','logbook','pois','costs','finance','settings','boat'
  ];

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
    const startup=document.querySelector('#msStartupGate .ms-startup-version');
    if(startup)startup.textContent=`versie ${BUILD}`;
  }

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function activePageId(pager=null){
    const pagerActive=pager?.querySelector('.ms755-route-active[id]')?.id;
    if(PAGE_IDS.includes(pagerActive))return pagerActive;
    const navActive=document.querySelector('.bottom-nav .bottom-nav-item.active[data-target]')?.dataset?.target;
    if(PAGE_IDS.includes(navActive))return navActive;
    const visible=PAGE_IDS.find(id=>{
      const page=document.getElementById(id);
      return page&&!page.classList.contains('hidden');
    });
    return visible||'dashboard';
  }

  function clearScrollLocks(element){
    if(!element)return;
    ['height','max-height','overflow','overflow-y','position','inset','top','bottom','transform','contain']
      .forEach(name=>element.style.removeProperty(name));
  }

  function restoreNormalDocumentFlow(){
    const app=document.getElementById('appView');
    if(!app)return;

    const pager=document.getElementById('ms708NativePager');
    const active=activePageId(pager);

    /* Een oudere 7.18.x-pager maakte alle pagina's zichtbaar en stopte ze in
       een eigen viewport. Pak dat volledig terug en herstel meteen één actieve
       pagina. Dit is bewust destructief voor de oude swipefunctie. */
    if(pager){
      [...pager.children].forEach(page=>{
        if(!(page instanceof HTMLElement))return;
        page.classList.remove('ms708-native-page','ms755-route-active');
        page.removeAttribute('data-ms708-index');
        page.removeAttribute('aria-hidden');
        clearScrollLocks(page);
        app.insertBefore(page,pager);
      });
      pager.remove();
    }

    PAGE_IDS.forEach(id=>{
      const page=document.getElementById(id);
      if(!page)return;
      page.classList.remove('ms708-native-page','ms755-route-active');
      page.removeAttribute('data-ms708-index');
      page.removeAttribute('aria-hidden');
      clearScrollLocks(page);
      page.classList.toggle('hidden',id!==active);
    });

    clearScrollLocks(app);
    clearScrollLocks(document.querySelector('body > main'));
    clearScrollLocks(document.getElementById('dashboard'));
    clearScrollLocks(document.getElementById('msMarineGlass'));
    clearScrollLocks(document.querySelector('#msMarineGlass > main.mg-grid'));
    document.documentElement.style.removeProperty('height');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('position');

    document.body.classList.remove('ms708-native-pages-active','ms755-single-page-nav');
    document.documentElement.classList.add('ms71829-document-scroll');
    document.body.classList.toggle('ms71829-document-scroll',appVisible());
    document.getElementById('ms706SwipeHint')?.classList.add('hidden');
  }

  function navigate(id,sourceButton=null){
    restoreNormalDocumentFlow();
    if(!PAGE_IDS.includes(id))return false;

    if(typeof window.captainNavigate==='function'){
      window.captainNavigate(id,sourceButton);
    }else if(typeof window.showTab==='function'){
      window.showTab(id,sourceButton);
    }else{
      PAGE_IDS.forEach(pageId=>{
        document.getElementById(pageId)?.classList.toggle('hidden',pageId!==id);
      });
    }

    requestAnimationFrame(()=>{
      restoreNormalDocumentFlow();
      window.scrollTo({top:0,left:0,behavior:'auto'});
    });
    return true;
  }

  /* Compatibiliteit: oude modules mogen deze API nog aanroepen, maar er wordt
     nooit meer een eigen pager of berekende viewporthoogte opgebouwd. */
  window.ms708GoToPage=navigate;
  window.ms708ScrollToPage=navigate;
  window.ms708SetSingleActive=()=>{};
  window.ms708ResizePager=restoreNormalDocumentFlow;

  function settle(){
    syncVersion();
    restoreNormalDocumentFlow();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else settle();

  ['pageshow','focus','mijnserenity:modules-ready','mijnserenity:dashboard-ready','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(settle),{passive:true}));
  window.addEventListener('resize',()=>setTimeout(settle,40),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(settle,150),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>setTimeout(settle,40),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle()},{passive:true});

  /* iOS kan een bevroren PWA-snapshot hervatten zonder volledige reload. Daarom
     repareren we gedurende de sessie ook een pager/hoogteslot dat later door een
     oud gecachet script teruggezet zou worden. */
  const timer=setInterval(()=>{
    if(document.hidden)return;
    syncVersion();
    if(document.getElementById('ms708NativePager')||
       document.body.classList.contains('ms708-native-pages-active')){
      restoreNormalDocumentFlow();
    }
  },750);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
