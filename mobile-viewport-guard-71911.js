/* MijnSerenity 7.19.11 — iPhone viewport guard
   Voorkomt dat de vaste ondernavigatie of een dashboardkaart honderden pixels hoog wordt. */
(()=>{
  'use strict';
  if(window.__msMobileViewportGuard71911)return;
  window.__msMobileViewportGuard71911=true;

  const imp=(el,name,value)=>el?.style?.setProperty(name,value,'important');

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

  function apply(){
    if(window.innerWidth>760)return;

    const html=document.documentElement,body=document.body;
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

    if(app){
      imp(app,'padding-bottom','94px');
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

    const nav=document.querySelector('.bottom-nav');
    if(nav){
      imp(nav,'position','fixed');
      imp(nav,'left','0');imp(nav,'right','0');imp(nav,'bottom','0');imp(nav,'top','auto');
      imp(nav,'box-sizing','border-box');
      imp(nav,'width','100%');
      imp(nav,'height','86px');
      imp(nav,'min-height','86px');
      imp(nav,'max-height','86px');
      imp(nav,'padding','5px 6px 10px');
      imp(nav,'margin','0');
      imp(nav,'overflow','hidden');
      imp(nav,'display','grid');
      imp(nav,'grid-template-columns','repeat(5,minmax(0,1fr))');
      imp(nav,'align-items','center');
      imp(nav,'z-index','2147483000');
      nav.querySelectorAll('.bottom-nav-item').forEach(item=>{
        imp(item,'height','56px');imp(item,'min-height','56px');imp(item,'max-height','56px');
        imp(item,'margin','0');imp(item,'padding','4px 2px');
      });
    }
  }

  let frame=0;
  function queue(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;apply()})}
  ['mijnserenity:dashboard-ready','mijnserenity:modules-ready','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
  window.addEventListener('pageshow',queue,{passive:true});
  window.addEventListener('resize',queue,{passive:true});
  window.addEventListener('orientationchange',queue,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});

  const start=()=>{
    queue();
    [100,350,900,1800,3500].forEach(ms=>setTimeout(queue,ms));
    const observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
