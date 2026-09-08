/* MijnSerenity 8.29.0 — legacy Marine Glass startdashboard uitgefaseerd.
   Dit bestand blijft tijdelijk als compatibiliteitsstub bestaan omdat oudere
   bootstraps de bestandsnaam nog kunnen opvragen. Er wordt bewust geen oud
   dashboard, kaart, radar of navigatielaag meer opgebouwd. */
(()=>{
  'use strict';
  window.__msMarine718=1;
  window.__msDisableLegacyVisuals=true;

  function removeLegacyDashboard(){
    document.getElementById('msMarineGlass')?.remove();
    document.getElementById('mgMore')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.getElementById('dashboard')?.classList.remove('mg-active');
  }

  removeLegacyDashboard();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',removeLegacyDashboard,{once:true});
  }
  window.addEventListener('pageshow',removeLegacyDashboard,{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',removeLegacyDashboard,{passive:true});
})();
