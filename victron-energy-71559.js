/* MijnSerenity 8.20.2 — Victron legacy compatibiliteitsstub
   Live energie wordt beheerd door dashboard-live-values-fix; diagnose en bediening
   staan onder Techniek. Deze oude module mag geen tweede nav, pagina of poller bouwen. */
(()=>{
  'use strict';
  if(window.__msVictronEnergyCompat8202)return;
  window.__msVictronEnergyCompat8202=true;

  function clean(){
    document.getElementById('ms7201UiStyle')?.remove();
    document.getElementById('ms7201MoreSheet')?.remove();
    document.getElementById('msVictronPage')?.remove();
    document.querySelectorAll('.ms7201-more-nav').forEach(node=>node.remove());
    if(document.body?.style?.overflow==='hidden')document.body.style.removeProperty('overflow');
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Victron legacy cleanup:',error)}
    }
  }

  function openTechnical(){
    clean();
    if(typeof window.captainNavigate==='function')return window.captainNavigate('technical');
    return window.ms708GoToPage?.('technical',true);
  }

  window.msOpenVictronPage=openTechnical;
  window.msCloseVictronPage=()=>true;
  window.ms7201OpenMore=()=>{
    if(typeof window.ms797OpenMore==='function')return window.ms797OpenMore();
    return false;
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});
  else clean();
  window.addEventListener('mijnserenity:dashboard-ready',clean,{passive:true});
})();