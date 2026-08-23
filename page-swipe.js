/* ============================================================
   MijnSerenity 7.18.31 — veilige iPhone navigatie zonder DOM-verbouwing
   ============================================================ */
(()=>{
  'use strict';
  if(window.__msStableNavigation71831)return;
  window.__msStableNavigation71831=true;
  window.__msStableNavigation71830=true;
  window.__msStableNavigation71829=true;

  const BUILD='7.18.31';
  const PAGE_IDS=[
    'dashboard','live','ais','weather','rws','map','planner','entertainment',
    'presence','technical','logbook','pois','costs','finance','settings','boat'
  ];
  let routing=false;

  function appVisible(){
    const app=document.getElementById('appView');
    return Boolean(app&&!app.classList.contains('hidden'));
  }

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function clearLegacySizing(element){
    if(!element)return;
    [
      'height','min-height','max-height','overflow','overflow-x','overflow-y',
      'position','inset','top','right','bottom','left','transform','translate',
      'contain','will-change'
    ].forEach(name=>element.style.removeProperty(name));
  }

  function currentRoute(pager=null){
    const pagerRoute=pager?.querySelector('.ms755-route-active[id]')?.id;
    if(PAGE_IDS.includes(pagerRoute))return pagerRoute;

    const navRoute=document.querySelector('.bottom-nav .bottom-nav-item.active[data-target]')?.dataset?.target;
    if(PAGE_IDS.includes(navRoute))return navRoute;

    const visible=PAGE_IDS.find(id=>{
      const page=document.getElementById(id);
      return page&&!page.classList.contains('hidden');
    });
    return visible||'dashboard';
  }

  function unwrapLegacyPager(){
    const app=document.getElementById('appView');
    const pager=document.getElementById('ms708NativePager');
    if(!app||!pager)return false;

    const route=currentRoute(pager);
    [...pager.children].forEach(page=>{
      if(!(page instanceof HTMLElement))return;
      page.classList.remove('ms708-native-page','ms755-route-active');
      page.removeAttribute('data-ms708-index');
      page.removeAttribute('aria-hidden');
      clearLegacySizing(page);
      app.insertBefore(page,pager);
    });
    pager.remove();

    /* Alleen bij het daadwerkelijk terugbouwen van een OUDE pager herstellen we
       één actieve route. Daarna beheert de oorspronkelijke app-router dit weer. */
    PAGE_IDS.forEach(id=>{
      const page=document.getElementById(id);
      if(page)page.classList.toggle('hidden',id!==route);
    });
    return true;
  }

  function ensureCurrentPageVisible(){
    if(!appVisible())return;
    const route=currentRoute();
    const page=document.getElementById(route);
    if(!page)return;

    /* De actieve knop is leidend. We tonen alleen die route opnieuw wanneer een
       oude PWA-snapshot hem ten onrechte verborgen heeft gelaten. */
    page.classList.remove('hidden');

    if(route==='dashboard'){
      const dashboard=document.getElementById('dashboard');
      if(dashboard){
        dashboard.hidden=false;
        ['display','visibility','opacity'].forEach(name=>dashboard.style.removeProperty(name));
        const glass=document.getElementById('msMarineGlass');
        if(glass){
          glass.hidden=false;
          ['display','visibility','opacity'].forEach(name=>glass.style.removeProperty(name));
        }
      }
    }
  }

  function normalize(){
    unwrapLegacyPager();

    document.body.classList.remove(
      'ms708-native-pages-active',
      'ms755-single-page-nav',
      'ms71829-document-scroll',
      'ms71830-document-scroll'
    );
    document.documentElement.classList.remove(
      'ms71829-document-scroll',
      'ms71830-document-scroll'
    );
    document.documentElement.classList.add('ms71831-document-scroll');

    clearLegacySizing(document.querySelector('body > main'));
    clearLegacySizing(document.getElementById('appView'));
    clearLegacySizing(document.getElementById('dashboard'));
    clearLegacySizing(document.getElementById('msMarineGlass'));
    clearLegacySizing(document.querySelector('#msMarineGlass > .mg-grid'));

    document.documentElement.style.removeProperty('height');
    document.documentElement.style.removeProperty('overflow-y');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('max-height');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('position');

    document.getElementById('ms706SwipeHint')?.classList.add('hidden');
    ensureCurrentPageVisible();
    syncVersion();
  }

  function navigate(id,sourceButton=null){
    if(!PAGE_IDS.includes(id)||routing)return false;
    routing=true;
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate(id,sourceButton);
      }else if(typeof window.showTab==='function'){
        window.showTab(id,sourceButton);
      }else{
        PAGE_IDS.forEach(pageId=>{
          document.getElementById(pageId)?.classList.toggle('hidden',pageId!==id);
        });
      }
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
      return true;
    }finally{
      setTimeout(()=>{routing=false},0);
    }
  }

  /* Alleen compatibiliteit voor oudere modules; er wordt geen pager meer gebouwd. */
  window.ms708GoToPage=navigate;
  window.ms708ScrollToPage=navigate;
  window.ms708SetSingleActive=()=>{};
  window.ms708ResizePager=normalize;

  function settle({scrollTop=false}={}){
    normalize();
    if(scrollTop&&appVisible())requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>settle({scrollTop:true}),{once:true});
  }else settle({scrollTop:true});

  window.addEventListener('pageshow',()=>settle({scrollTop:true}),{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',()=>requestAnimationFrame(()=>settle()),{passive:true});
  window.addEventListener('mijnserenity:modules-ready',()=>requestAnimationFrame(()=>settle()),{passive:true});
  window.addEventListener('mijnserenity:routechange',()=>requestAnimationFrame(()=>settle()),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle()},{passive:true});
})();
