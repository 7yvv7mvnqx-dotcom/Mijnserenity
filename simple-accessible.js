/* MijnSerenity 8.20.2 — Simple UI compatibiliteitsstub
   De oude Simple UI bouwde een tweede dashboard, paginabalk, Meer-menu en
   navigatie. De uniforme Marine Glass-runtime is nu de enige actieve UI-laag. */
(()=>{
  'use strict';
  if(window.__msSimpleAccessibleCompat8202)return;
  window.__msSimpleAccessibleCompat8202=true;

  function clean(){
    document.body?.classList.remove(
      'ms750-simple-ui','ms750-more-open','ms755-search-open','ms755-single-page-nav'
    );
    [
      'ms750PageBar','ms750SimpleDashboard','ms750MoreLayer','ms755SearchLayer',
      'ms755ExpandedCaptainSlot'
    ].forEach(id=>document.getElementById(id)?.remove());
    document.querySelector('.ms750-skip-link')?.remove();
  }

  function route(route){
    const target=String(route||'dashboard');
    if(typeof window.captainNavigate==='function')return window.captainNavigate(target);
    if(typeof window.ms708GoToPage==='function')return window.ms708GoToPage(target,true);
    return false;
  }

  function repair(){
    clean();
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Simple UI cleanup:',error)}
    }
  }

  /* Alleen oude publieke hulpfuncties compatibel houden; geen eigen UI meer. */
  window.ms753Navigate=route;
  window.ms753SyncRoute=()=>{};
  window.ms753RefreshSimpleAutomaticUi=()=>{};
  if(typeof window.ms755OpenSearch!=='function')window.ms755OpenSearch=()=>route('dashboard');
  if(typeof window.ms755OpenRadio!=='function')window.ms755OpenRadio=()=>route('entertainment');

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});
  else repair();
  window.addEventListener('mijnserenity:dashboard-ready',repair,{passive:true});
})();