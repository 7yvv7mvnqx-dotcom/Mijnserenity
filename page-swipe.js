/* MijnSerenity 7.18.33 — iOS pager compatibility
   Horizontale pager uitgeschakeld: op iPhone kon de pager het dashboard
   afkappen en bij hervatten een oude DOM-versie terugbrengen. Navigatie
   blijft via captainNavigate / de vaste onderbalk werken. */
(()=>{
  'use strict';
  if(window.__ms71833NoPager)return;
  window.__ms71833NoPager=true;

  function currentRoute(){
    const active=document.querySelector('.tab.active[data-target],.bottom-nav-item.active[data-target]');
    const route=active?.dataset?.target;
    return route&&route!=='more'?route:'dashboard';
  }

  function restoreNormalDocument(){
    document.body?.classList.remove('ms708-native-pages-active');

    document.querySelectorAll('.ms708-native-pager').forEach(pager=>{
      const parent=pager.parentNode;
      if(!parent)return;
      const children=[...pager.children];
      children.forEach(child=>{
        child.classList.remove('ms708-native-page','ms755-route-active');
        child.removeAttribute('aria-hidden');
        parent.insertBefore(child,pager);
      });
      pager.remove();
    });

    document.querySelectorAll('.ms708-native-page').forEach(page=>{
      page.classList.remove('ms708-native-page','ms755-route-active');
      page.removeAttribute('aria-hidden');
    });

    const main=document.querySelector('main');
    const app=document.getElementById('appView');
    if(main){
      main.style.removeProperty('overflow');
      main.style.removeProperty('height');
      main.style.removeProperty('max-height');
    }
    if(app){
      app.style.removeProperty('overflow');
      app.style.removeProperty('height');
      app.style.removeProperty('max-height');
    }
  }

  function go(id,showToast=false){
    restoreNormalDocument();
    const target=String(id||'dashboard');
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate(target);
      }else if(typeof window.showTab==='function'){
        window.showTab(target);
      }
    }catch(error){
      console.warn('Navigatie kon niet worden uitgevoerd:',target,error);
    }
    if(showToast){
      try{window.showAppToast?.(target==='dashboard'?'Start':target)}catch{}
    }
    return target;
  }

  window.ms708GoToPage=go;
  window.ms708ScrollToPage=go;
  window.ms708CurrentPageId=currentRoute;
  window.ms708SinglePageMode=()=>true;
  window.ms708SetSingleActive=()=>{};
  window.ms708InitNativePager=restoreNormalDocument;

  const repair=()=>{
    restoreNormalDocument();
    requestAnimationFrame(restoreNormalDocument);
    setTimeout(restoreNormalDocument,120);
    setTimeout(restoreNormalDocument,700);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',repair,{once:true});
  }else{
    repair();
  }
  window.addEventListener('pageshow',repair,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)repair();
  },{passive:true});
})();
