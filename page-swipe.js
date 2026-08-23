/* ============================================================
   MijnSerenity 7.18.30 — harde iPhone document-flow zonder geneste main/pager
   ============================================================ */
(()=>{
  'use strict';
  if(window.__msStableNavigation71830)return;
  window.__msStableNavigation71830=true;
  window.__msStableNavigation71829=true;
  window.__msStableNavigation71828=true;

  const BUILD='7.18.30';
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

  function installHardMobileFlow(){
    if(document.getElementById('ms71830HardMobileFlow'))return;
    const style=document.createElement('style');
    style.id='ms71830HardMobileFlow';
    style.textContent=`
      @media(max-width:760px){
        html.ms71830-document-scroll,
        html.ms71830-document-scroll body{
          width:100%!important;
          height:auto!important;
          min-height:100%!important;
          max-height:none!important;
          overflow-x:hidden!important;
          overflow-y:auto!important;
        }
        html.ms71830-document-scroll body>main,
        body.ms71830-document-scroll #appView,
        body.ms71830-document-scroll #dashboard,
        body.ms71830-document-scroll #msMarineGlass,
        body.ms71830-document-scroll #msMarineGlass>.mg-grid{
          position:relative!important;
          inset:auto!important;
          top:auto!important;
          right:auto!important;
          bottom:auto!important;
          left:auto!important;
          width:100%!important;
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
          overflow:visible!important;
          contain:none!important;
          transform:none!important;
          translate:none!important;
          will-change:auto!important;
        }
        body.ms71830-document-scroll #msMarineGlass{
          min-height:100dvh!important;
        }
        body.ms71830-document-scroll #msMarineGlass>.mg-grid{
          display:grid!important;
          grid-template-columns:minmax(0,1fr)!important;
          grid-auto-rows:auto!important;
          align-items:start!important;
          gap:8px!important;
          padding:7px 0 0!important;
          margin:0!important;
        }
        body.ms71830-document-scroll #msMarineGlass .mg-card{
          width:100%!important;
          height:auto!important;
          max-height:none!important;
          grid-column:1!important;
          grid-row:auto!important;
        }
        body.ms71830-document-scroll #msMarineGlass .mg-energy,
        body.ms71830-document-scroll #msMarineGlass .mg-energy-grid{
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
          overflow:visible!important;
        }
        body.ms71830-document-scroll #msMarineGlass .mg-energy-grid{
          display:grid!important;
          grid-template-columns:minmax(0,1fr)!important;
          grid-auto-rows:auto!important;
        }
        body.ms71830-document-scroll #msMarineGlass .mg-systems,
        body.ms71830-document-scroll #msMarineGlass .mg-route,
        body.ms71830-document-scroll #msMarineGlass .mg-poi,
        body.ms71830-document-scroll #msMarineGlass .mg-weather,
        body.ms71830-document-scroll #msMarineGlass .mg-tide{
          visibility:visible!important;
          opacity:1!important;
        }
      }
    `;
    document.head.appendChild(style);
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
    ['height','min-height','max-height','overflow','overflow-x','overflow-y','position','inset','top','right','bottom','left','transform','translate','contain','will-change']
      .forEach(name=>element.style.removeProperty(name));
  }

  function demoteNestedDashboardMain(){
    const nested=document.querySelector('#msMarineGlass > main.mg-grid');
    if(!nested)return document.querySelector('#msMarineGlass > .mg-grid');

    const grid=document.createElement('div');
    [...nested.attributes].forEach(attribute=>grid.setAttribute(attribute.name,attribute.value));
    while(nested.firstChild)grid.appendChild(nested.firstChild);
    nested.replaceWith(grid);
    return grid;
  }

  function restoreNormalDocumentFlow(){
    const app=document.getElementById('appView');
    if(!app)return;

    installHardMobileFlow();

    const pager=document.getElementById('ms708NativePager');
    const active=activePageId(pager);

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

    const grid=demoteNestedDashboardMain();

    clearScrollLocks(app);
    clearScrollLocks(document.querySelector('body > main'));
    clearScrollLocks(document.getElementById('dashboard'));
    clearScrollLocks(document.getElementById('msMarineGlass'));
    clearScrollLocks(grid);
    clearScrollLocks(document.querySelector('#msMarineGlass .mg-energy'));
    clearScrollLocks(document.querySelector('#msMarineGlass .mg-energy-grid'));

    document.documentElement.style.removeProperty('height');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('max-height');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('position');

    document.body.classList.remove('ms708-native-pages-active','ms755-single-page-nav');
    document.documentElement.classList.remove('ms71829-document-scroll');
    document.body.classList.remove('ms71829-document-scroll');
    document.documentElement.classList.add('ms71830-document-scroll');
    document.body.classList.toggle('ms71830-document-scroll',appVisible());
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

  const timer=setInterval(()=>{
    if(document.hidden)return;
    syncVersion();
    if(document.getElementById('ms708NativePager')||
       document.body.classList.contains('ms708-native-pages-active')||
       document.querySelector('#msMarineGlass > main.mg-grid')){
      restoreNormalDocumentFlow();
    }
  },600);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();