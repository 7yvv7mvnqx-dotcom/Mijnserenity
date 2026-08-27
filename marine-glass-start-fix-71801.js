/* MijnSerenity 7.19.0 — oude Start force-repair uitgeschakeld.
   De actuele dashboardloader bepaalt éénmalig welk dashboard zichtbaar is. */
(()=>{
  'use strict';
  if(window.__msStartFixCleanup71900)return;
  window.__msStartFixCleanup71900=true;

  function clean(){
    document.getElementById('msMarineGlassMobile7182')?.remove();
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.body?.classList.remove('mg-mode');
    const dashboard=document.getElementById('dashboard');
    if(dashboard){
      dashboard.style.removeProperty('display');
      dashboard.style.removeProperty('visibility');
      dashboard.style.removeProperty('opacity');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
})();
