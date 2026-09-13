/* MijnSerenity 8.28.1 — compatibiliteitsfallback voor oudere dashboardcaches. */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8281)return;
if(window.__msDashboardFallback8281)return;
window.__msDashboardFallback8281=true;
window.__msDisableLegacyVisuals=true;
const PATH='/start-dashboard-71510.js';
function load(){
  if(window.__msApprovedHomeBootstrap8281)return;
  const script=document.createElement('script');
  script.src=`${PATH}?v=828100&fallback=1`;
  script.async=false;
  script.dataset.ms8281Fallback='1';
  script.onerror=()=>console.warn('MijnSerenity 8.28.1 dashboardloader kon niet via de fallback worden geladen.');
  document.head.appendChild(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
window.addEventListener('pageshow',()=>{if(!window.__msApprovedHomeBootstrap8281)load()},{passive:true});
})();
