/* ============================================================
   MijnSerenity 7.18.28 — stabiele iPhone navigatie zonder pager
   ============================================================ */
(()=>{
  'use strict';
  if(window.__msStableNavigation71828)return;
  window.__msStableNavigation71828=true;

  const PAGE_IDS=[
    'dashboard','live','ais','weather','rws','map','planner','entertainment',
    'presence','technical','logbook','pois','costs','finance','settings','boat'
  ];

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function restoreNormalDocumentFlow(){
    const app=document.getElementById('appView');
    if(!app)return;

    /* Herstel een eventueel door een oudere 7.18.x-pager verplaatste DOM. */
    const pager=document.getElementById('ms708NativePager');
    if(pager){
      [...pager.children].forEach(page=>{
        if(page instanceof HTMLElement){
          page.classList.remove('ms708-native-page','ms755-route-active');
          page.removeAttribute('data-ms708-index');
          page.removeAttribute('aria-hidden');
          page.style.removeProperty('height');
          page.style.removeProperty('max-height');
          page.style.removeProperty('overflow');
          app.insertBefore(page,pager);
        }
      });
      pager.remove();
    }

    PAGE_IDS.forEach(id=>{
      const page=document.getElementById(id);
      if(!page)return;
      page.classList.remove('ms708-native-page','ms755-route-active');
      page.removeAttribute('data-ms708-index');
      page.removeAttribute('aria-hidden');
      page.style.removeProperty('height');
      page.style.removeProperty('max-height');
      page.style.removeProperty('overflow');
      page.style.removeProperty('transform');
      page.style.removeProperty('position');
      page.style.removeProperty('inset');
    });

    app.style.removeProperty('height');
    app.style.removeProperty('max-height');
    app.style.removeProperty('overflow');
    app.style.removeProperty('position');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('height');

    document.body.classList.remove(
      'ms708-native-pages-active',
      'ms755-single-page-nav'
    );
  }

  function navigate(id,sourceButton=null){
    restoreNormalDocumentFlow();
    if(!PAGE_IDS.includes(id))return false;

    /* Gebruik uitsluitend de oorspronkelijke app-router. Die zet zelf de juiste
       section zichtbaar en voorkomt zo geneste iOS-scrollcontainers. */
    if(typeof window.captainNavigate==='function'){
      window.captainNavigate(id,sourceButton);
    }else if(typeof window.showTab==='function'){
      window.showTab(id,sourceButton);
    }

    requestAnimationFrame(()=>{
      restoreNormalDocumentFlow();
      window.scrollTo({top:0,left:0,behavior:'auto'});
    });
    return true;
  }

  /* Compatibiliteit voor modules die de oude pager-API aanroepen. */
  window.ms708GoToPage=navigate;
  window.ms708ScrollToPage=navigate;
  window.ms708SetSingleActive=()=>{};
  window.ms708ResizePager=restoreNormalDocumentFlow;

  const settle=()=>{
    restoreNormalDocumentFlow();
    if(appVisible())document.body.classList.add('ms71828-document-scroll');
    else document.body.classList.remove('ms71828-document-scroll');
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',settle,{once:true});
  }else settle();

  window.addEventListener('pageshow',settle,{passive:true});
  window.addEventListener('resize',settle,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(settle,120),{passive:true});
  window.visualViewport?.addEventListener('resize',settle,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle()},{passive:true});

  const observer=new MutationObserver(settle);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
