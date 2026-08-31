/* MijnSerenity 8.20.2 — IVMS compatibiliteitsstub
   De oude IVMS-startlaag ververste elke 1/3 seconde en verborg de navigatie.
   Marine Glass en de technische pagina zijn nu de enige actieve weergaven. */
(()=>{
  'use strict';
  if(window.__msSerenityIvmsCompat8202)return;
  window.__msSerenityIvmsCompat8202=true;

  function clean(){
    document.body?.classList.remove('ivms-dashboard-active');
    document.querySelector('.bottom-nav')?.classList.remove('ivms-dashboard-hidden');
    document.getElementById('serenityIvms')?.remove();
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      try{
        const path=new URL(link.href,location.href).pathname;
        if(path.endsWith('/serenity-ivms.css')||path.endsWith('serenity-ivms.css'))link.remove();
      }catch{}
    });
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('IVMS cleanup:',error)}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
})();