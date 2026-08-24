/* ============================================================
   MijnSerenity 7.18.31 — vaste documentflow voor iPhone
   ============================================================ */
(()=>{
  'use strict';

  if(window.__msStableNavigation71831)return;
  window.__msStableNavigation71831=true;

  const ms708PageOrder=[
    'dashboard',
    'live',
    'ais',
    'weather',
    'rws',
    'map',
    'planner',
    'entertainment',
    'presence',
    'technical',
    'logbook',
    'pois',
    'costs',
    'finance',
    'settings',
    'boat'
  ];

  function resolveRoute(id){
    let route=String(id||'dashboard');
    if(route==='boat'&&typeof window.isAppAdmin==='function'&&!window.isAppAdmin()){
      route='settings';
    }
    return ms708PageOrder.includes(route)?route:null;
  }

  function activeRoute(){
    const routeActive=document.querySelector('#appView > section.ms755-route-active, #ms708NativePager > section.ms755-route-active');
    if(routeActive&&ms708PageOrder.includes(routeActive.id))return routeActive.id;

    const bottom=document.querySelector('.bottom-nav-item.active[data-target]');
    if(bottom&&ms708PageOrder.includes(bottom.dataset.target))return bottom.dataset.target;

    const tab=document.querySelector('#appView > .tabs .tab.active[data-target], #appView > .tabs [data-target].active');
    if(tab&&ms708PageOrder.includes(tab.dataset.target))return tab.dataset.target;

    return 'dashboard';
  }

  function forceNaturalFlow(element,{resetInnerMain=false}={}){
    if(!element)return;
    element.style.setProperty('height','auto','important');
    element.style.setProperty('max-height','none','important');
    element.style.setProperty('overflow','visible','important');
    element.style.setProperty('overflow-y','visible','important');
    if(resetInnerMain){
      element.style.setProperty('min-height','0','important');
      element.style.setProperty('width','100%','important');
      element.style.setProperty('max-width','none','important');
      element.style.setProperty('margin','0','important');
      element.style.setProperty('padding','0','important');
      element.style.setProperty('position','relative','important');
    }
  }

  function enforceNaturalDocumentFlow(){
    document.documentElement.style.setProperty('height','auto','important');
    document.documentElement.style.setProperty('max-height','none','important');
    document.documentElement.style.setProperty('overflow-y','auto','important');

    if(document.body){
      document.body.style.setProperty('height','auto','important');
      document.body.style.setProperty('max-height','none','important');
      document.body.style.setProperty('overflow-y','auto','important');
    }

    forceNaturalFlow(document.querySelector('body > main'));
    forceNaturalFlow(document.getElementById('appView'));
    forceNaturalFlow(document.getElementById('dashboard'));
    forceNaturalFlow(document.getElementById('msMarineDashboard'));

    const marineInnerMain=document.querySelector('#msMarineDashboard > main');
    forceNaturalFlow(marineInnerMain,{resetInnerMain:true});

    const legacyPager=document.getElementById('ms708NativePager');
    forceNaturalFlow(legacyPager);
  }

  function clearPagerClasses(page){
    if(!page)return;
    page.classList.remove('ms708-native-page','ms755-route-active');
    page.removeAttribute('aria-hidden');
    delete page.dataset.ms708Index;
    delete page.dataset.ms708Prepared;

    [
      'height','min-height','max-height','width','min-width','max-width',
      'overflow','overflow-x','overflow-y','position','transform','display'
    ].forEach(property=>page.style.removeProperty(property));
  }

  function cleanupLegacyPager(){
    const appView=document.getElementById('appView');
    const pager=document.getElementById('ms708NativePager');
    const keepRoute=activeRoute();

    if(pager&&appView){
      const pages=[...pager.children].filter(element=>
        element instanceof HTMLElement&&ms708PageOrder.includes(element.id)
      );

      pages.forEach(page=>{
        clearPagerClasses(page);
        appView.insertBefore(page,pager);
      });

      pager.remove();
    }

    ms708PageOrder.forEach(id=>clearPagerClasses(document.getElementById(id)));

    document.body?.classList.remove('ms708-native-pages-active','ms755-single-page-nav');
    document.documentElement?.classList.remove('ms708-native-pages-active','ms755-single-page-nav');

    const app=document.getElementById('appView');
    if(app){
      app.style.removeProperty('height');
      app.style.removeProperty('max-height');
      app.style.removeProperty('overflow');
      app.style.removeProperty('overflow-y');
    }

    enforceNaturalDocumentFlow();
    return keepRoute;
  }

  function setNavigationState(id){
    document.querySelectorAll('.bottom-nav-item').forEach(button=>{
      const target=button.dataset.target;
      const active=target===id||(
        !document.querySelector(`.bottom-nav-item[data-target="${CSS.escape(id)}"]`)&&target==='more'
      );
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });

    document.querySelectorAll('#appView > .tabs [data-target]').forEach(tab=>{
      tab.classList.toggle('active',tab.dataset.target===id);
    });
  }

  function fallbackShow(id){
    const route=resolveRoute(id);
    if(!route)return false;

    ms708PageOrder.forEach(pageId=>{
      const page=document.getElementById(pageId);
      if(page)page.classList.toggle('hidden',pageId!==route);
    });

    setNavigationState(route);
    enforceNaturalDocumentFlow();
    return Boolean(document.getElementById(route));
  }

  function navigate(id,runPageActions=true){
    const route=resolveRoute(id);
    if(!route)return false;

    cleanupLegacyPager();

    let handled=false;

    if(runPageActions&&typeof window.captainNavigate==='function'){
      try{
        window.captainNavigate(route);
        handled=true;
      }catch(error){
        console.warn('Stabiele navigatie: captainNavigate mislukt',error);
      }
    }

    if(!handled&&typeof window.showTab==='function'){
      try{
        const button=document.querySelector(`#appView > .tabs [data-target="${CSS.escape(route)}"]`);
        window.showTab(route,button||null);
        handled=true;
      }catch(error){
        console.warn('Stabiele navigatie: showTab mislukt',error);
      }
    }

    if(!handled)handled=fallbackShow(route);

    setNavigationState(route);
    enforceNaturalDocumentFlow();

    const page=document.getElementById(route);
    if(page){
      page.scrollTop=0;
      page.scrollLeft=0;
    }
    try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch{window.scrollTo(0,0);}

    window.ms753SyncRoute?.(route);
    window.dispatchEvent(new CustomEvent('mijnserenity:routechange',{
      detail:{route,source:'stable-navigation'}
    }));

    return handled;
  }

  function initialise(){
    const route=cleanupLegacyPager();
    document.documentElement.classList.add('ms-stable-navigation');
    document.body?.classList.add('ms-stable-navigation');
    enforceNaturalDocumentFlow();

    /*
       Laat de bestaande MijnSerenity-navigatie leidend. Alleen wanneer
       geen route zichtbaar is, herstellen we een veilige startpagina.
    */
    const visible=ms708PageOrder.some(id=>{
      const page=document.getElementById(id);
      return page&&!page.classList.contains('hidden');
    });
    if(!visible&&document.getElementById(route))fallbackShow(route);

    requestAnimationFrame(enforceNaturalDocumentFlow);
    setTimeout(enforceNaturalDocumentFlow,250);
    setTimeout(enforceNaturalDocumentFlow,1200);
  }

  /* Compatibiliteit voor oudere modules die nog ms708-functies aanroepen. */
  window.ms708PageOrder=ms708PageOrder.slice();
  window.ms708GoToPage=(id,runPageActions=true)=>navigate(id,runPageActions);
  window.ms708ScrollToPage=(id)=>navigate(id,true);
  window.ms708SetSingleActive=(id)=>navigate(id,false);
  window.ms708ResizePager=()=>{cleanupLegacyPager();enforceNaturalDocumentFlow();};
  window.ms708CleanupLegacyPager=cleanupLegacyPager;
  window.ms71831EnforceNaturalDocumentFlow=enforceNaturalDocumentFlow;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }

  window.addEventListener('pageshow',initialise,{passive:true});
  window.addEventListener('resize',enforceNaturalDocumentFlow,{passive:true});
  window.visualViewport?.addEventListener('resize',enforceNaturalDocumentFlow,{passive:true});
  window.addEventListener('mijnserenity:marine-glass-ready',enforceNaturalDocumentFlow,{passive:true});
  window.addEventListener('mijnserenity:modules-ready',enforceNaturalDocumentFlow,{passive:true});
  window.addEventListener('mijnserenity:routechange',enforceNaturalDocumentFlow,{passive:true});
})();
