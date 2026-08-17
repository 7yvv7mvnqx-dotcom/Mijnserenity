/* MijnSerenity 7.18.2 — dashboard rescue + mobile mode */
(()=>{
  'use strict';
  if(window.__msMarineGlassStartFix71802)return;
  window.__msMarineGlassStartFix71802=true;
  const BUILD='7.18.2';

  function ensureMobileCss(){
    if(document.getElementById('msMarineGlassMobile7182'))return;
    const link=document.createElement('link');
    link.id='msMarineGlassMobile7182';
    link.rel='stylesheet';
    link.href='/marine-glass-mobile-7182.css?v=718020';
    document.head.appendChild(link);
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

  function cleanNavigation(){
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
  }

  function cleanLiteralNewlines(root){
    if(!root||!document.createTreeWalker)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const remove=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(String(node.nodeValue||'').trim()==='\\n')remove.push(node);
    }
    remove.forEach(node=>{node.nodeValue=''});
  }

  function dashboardSelected(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;
    const navActive=document.querySelector('.bottom-nav [data-target].active, .tabs [data-target].active');
    if(navActive?.dataset?.target)return navActive.dataset.target==='dashboard';
    if(dashboard.classList.contains('active')&&!dashboard.hidden)return true;
    const visibleOther=[...document.querySelectorAll('#appView [data-page],#appView>.page,#appView>section')].some(el=>{
      if(el===dashboard||el.id==='dashboard'||el.id==='appView')return false;
      return el.classList.contains('active')&&!el.hidden&&getComputedStyle(el).display!=='none';
    });
    return !visibleOther;
  }

  function showDashboardIfNeeded(force=false){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;
    if(!force&&!dashboardSelected())return false;
    const glass=document.getElementById('msMarineGlass');
    dashboard.hidden=false;
    dashboard.classList.add('active');
    dashboard.style.removeProperty('display');
    dashboard.style.removeProperty('visibility');
    dashboard.style.removeProperty('opacity');
    if(glass){
      dashboard.classList.add('mg-active');
      glass.hidden=false;
      glass.style.setProperty('display','block','important');
      glass.style.setProperty('visibility','visible','important');
      glass.style.setProperty('opacity','1','important');
    }
    cleanLiteralNewlines(dashboard);
    return Boolean(glass);
  }

  function syncMode(){
    const dashboard=document.getElementById('dashboard');
    const glass=document.getElementById('msMarineGlass');
    if(!dashboard||!glass){document.body.classList.remove('mg-mode');return}
    const selected=dashboardSelected();
    const visible=selected&&!dashboard.hidden&&getComputedStyle(dashboard).display!=='none';
    document.body.classList.toggle('mg-mode',Boolean(visible));
    if(visible){
      dashboard.classList.add('mg-active');
      requestAnimationFrame(()=>{
        try{window.dispatchEvent(new Event('resize'))}catch{}
        try{window.L&&glass.querySelector('.leaflet-container')?._leaflet_map?.invalidateSize?.():null}catch{}
      });
    }
  }

  function repair(force=false){
    ensureMobileCss();
    cleanNavigation();
    syncVersion();
    showDashboardIfNeeded(force);
    syncMode();
  }

  function deferredRepair(){requestAnimationFrame(()=>repair(false))}

  function start(){
    ensureMobileCss();
    repair(true);
    setTimeout(()=>repair(true),120);
    setTimeout(()=>repair(false),500);
    setTimeout(()=>repair(false),1200);

    const dashboard=document.getElementById('dashboard');
    if(dashboard&&window.MutationObserver){
      const observer=new MutationObserver(deferredRepair);
      observer.observe(dashboard,{attributes:true,attributeFilter:['class','hidden','style']});
    }

    const nav=document.querySelector('.bottom-nav');
    nav?.addEventListener('click',()=>setTimeout(()=>{cleanNavigation();syncMode()},0),{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(syncMode,0),{passive:true});
    window.addEventListener('mijnserenity:modules-ready',()=>repair(false),{passive:true});
    window.addEventListener('pageshow',()=>repair(false),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair(false)},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
