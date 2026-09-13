/* MijnSerenity 8.28.0 — compatibiliteitsfallback voor oudere dashboardcaches. */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8263)return;
if(window.__msDashboardFallback8280)return;
window.__msDashboardFallback8280=true;
const PATH='/start-dashboard-71510.js';
function pathOf(value){try{return new URL(value,location.href).pathname}catch(_){return String(value||'')}}
function load(){
  if(window.__msApprovedHomeBootstrap8263)return;
  if([...document.scripts].some(script=>script.src&&pathOf(script.src)===PATH))return;
  const script=document.createElement('script');
  script.src=`${PATH}?v=828000`;
  script.async=false;
  script.dataset.ms8280Fallback='1';
  script.onerror=()=>console.warn('MijnSerenity 8.28.0 dashboardloader kon niet via de fallback worden geladen.');
  document.head.appendChild(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
