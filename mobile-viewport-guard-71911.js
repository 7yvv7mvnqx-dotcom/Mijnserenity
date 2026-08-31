/* MijnSerenity 8.20.2 — iPhone viewport guard zonder navigatie-eigenaarschap
   De uniforme dashboardloader is de enige eigenaar van de onderste navigatie.
   Deze guard corrigeert alleen contenthoogte en ruimt oude inline nav-hotfixes op. */
(()=>{
  'use strict';
  if(window.__msMobileViewportGuard8202)return;
  window.__msMobileViewportGuard8202=true;

  const imp=(el,name,value)=>el?.style?.setProperty(name,value,'important');
  const clear=(el,name)=>el?.style?.removeProperty(name);

  function autoBox(el,overflow='visible'){
    if(!el)return;
    imp(el,'height','auto');
    imp(el,'min-height','0');
    imp(el,'max-height','none');
    imp(el,'min-block-size','0');
    imp(el,'block-size','auto');
    imp(el,'max-block-size','none');
    imp(el,'overflow-y',overflow);
  }

  function releaseNavigation(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    [
      'position','left','right','bottom','top','inset','box-sizing','width','max-width',
      'height','min-height','max-height','padding','margin','overflow','display',
      'grid-template-columns','grid-template-rows','align-items','z-index','transform'
    ].forEach(name=>clear(nav,name));
    nav.querySelectorAll('.bottom-nav-item').forEach(item=>{
      [
        'width','min-width','max-width','height','min-height','max-height','margin',
        'padding','display','position','left','right','bottom','top','transform'
      ].forEach(name=>clear(item,name));
    });
  }

  function apply(){
    /* Alleen telefoonbreedtes. iPad/Stage Manager krijgt geen inline viewportcorrecties. */
    if(window.innerWidth>600){
      releaseNavigation();
      return;
    }

    const html=document.documentElement;
    const body=document.body;
    autoBox(html,'visible');
    autoBox(body,'visible');
    imp(html,'overflow-x','hidden');
    imp(body,'overflow-x','hidden');
    imp(body,'padding-bottom','0');

    const main=document.querySelector('body>main');
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    const glass=document.getElementById('msMarineGlass');
    const grid=glass?.querySelector(':scope > main.mg-grid');
    [main,app,dashboard,glass,grid].forEach(el=>autoBox(el,'visible'));

    /* Ruimte voor de vaste uniforme navigatie, maar geen nav-layout vanuit JS. */
    if(app){
      imp(app,'padding-bottom','calc(76px + env(safe-area-inset-bottom))');
      imp(app,'margin-bottom','0');
    }
    if(dashboard){
      imp(dashboard,'padding-bottom','0');
      imp(dashboard,'margin-bottom','0');
    }

    grid?.querySelectorAll(':scope > .mg-card').forEach(card=>{
      if(card.classList.contains('mg-map'))return;
      autoBox(card,'visible');
      imp(card,'flex','0 0 auto');
      imp(card,'display',card.classList.contains('mg-gauges')?'grid':'block');
    });

    const energy=glass?.querySelector('.mg-energy');
    const energyGrid=glass?.querySelector('.mg-energy-grid');
    autoBox(energy,'visible');
    autoBox(energyGrid,'visible');
    if(energyGrid){
      imp(energyGrid,'display','grid');
      imp(energyGrid,'grid-template-columns','1fr');
      imp(energyGrid,'grid-template-rows','none');
      imp(energyGrid,'grid-auto-rows','auto');
    }

    releaseNavigation();
  }

  let frame=0;
  function queue(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;apply()});
  }

  ['mijnserenity:dashboard-ready','mijnserenity:routechange','mijnserenity:boot-complete']
    .forEach(name=>window.addEventListener(name,queue,{passive:true}));
  window.addEventListener('pageshow',queue,{passive:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('orientationchange',queue,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});

  const start=()=>{
    queue();
    [120,450,1200,2600].forEach(ms=>setTimeout(queue,ms));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();