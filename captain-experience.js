/* MijnSerenity 8.20.2 — Captain Experience compatibiliteitsstub
   De oude Captain-laag bouwde een tweede dashboard en draaide iedere 5 seconden
   een UI-update. Marine Glass is nu de enige dashboardlaag. */
(()=>{
  'use strict';
  if(window.__msCaptainExperienceCompat8202)return;
  window.__msCaptainExperienceCompat8202=true;

  function clean(){
    document.body?.classList.remove('ms760-captain-experience','ms760-radio-visible','ms760-replay-open');
    document.body?.removeAttribute('data-ms760-theme');
    [
      'ms760CaptainDashboard','ms760ReplayLayer','ms760RadioPlayer','ms760HaGroups','ms760ThemeSetting'
    ].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('.ms760-trip-replay-inline').forEach(node=>node.remove());
  }

  function repair(){
    clean();
    if(typeof window.ms8202RepairUnifiedUi==='function'){
      try{window.ms8202RepairUnifiedUi()}catch(error){console.debug('Captain cleanup:',error)}
    }
  }

  /* Compatibele routehelper voor eventueel achtergebleven aanroepen. */
  window.ms760Navigate=route=>{
    if(typeof window.captainNavigate==='function')return window.captainNavigate(String(route||'dashboard'));
    return window.ms708GoToPage?.(String(route||'dashboard'),true);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});
  else repair();
  window.addEventListener('mijnserenity:dashboard-ready',repair,{passive:true});
})();