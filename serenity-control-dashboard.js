/* MijnSerenity 8.20.2 — Serenity Control compatibiliteitsstub
   De oude laag bouwde een tweede dashboard en draaide verborgen 3s/30s pollers.
   Marine Glass en Techniek zijn nu de enige actieve dashboard-/systeemweergaven. */
(()=>{
  'use strict';
  if(window.__msSerenityControlCompat8202)return;
  window.__msSerenityControlCompat8202=true;

  function clean(){
    document.getElementById('msSerenityControl')?.remove();
    document.getElementById('dashboard')?.classList.remove('scd-active');
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      try{
        const path=new URL(link.href,location.href).pathname;
        if(path.endsWith('/serenity-control-dashboard.css')||path.endsWith('serenity-control-dashboard.css'))link.remove();
      }catch{}
    });
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Serenity Control cleanup:',error)}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
})();