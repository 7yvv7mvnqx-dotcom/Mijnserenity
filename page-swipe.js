/* MijnSerenity 7.19.0 — pagercompatibiliteit zonder repair-loops.
   Horizontaal swipen/pager is uit; navigatie gebruikt de centrale routefunctie. */
(()=>{
  'use strict';
  if(window.__msPagerCompat71900)return;
  window.__msPagerCompat71900=true;

  function go(id,showToast=false){
    const target=String(id||'dashboard');
    try{
      if(typeof window.captainNavigate==='function')window.captainNavigate(target);
      else if(typeof window.showTab==='function')window.showTab(target);
    }catch(error){console.warn('Navigatie kon niet worden uitgevoerd:',target,error)}
    if(showToast)try{window.showAppToast?.(target==='dashboard'?'Start':target)}catch{}
    return target;
  }

  window.ms708GoToPage=go;
  window.ms708ScrollToPage=go;
  window.ms708CurrentPageId=()=>document.querySelector('.tab.active[data-target],.bottom-nav-item.active[data-target]')?.dataset?.target||'dashboard';
  window.ms708SinglePageMode=()=>true;
  window.ms708SetSingleActive=()=>{};
  window.ms708InitNativePager=()=>{};
  window.ms708ResizePager=()=>{};
})();
