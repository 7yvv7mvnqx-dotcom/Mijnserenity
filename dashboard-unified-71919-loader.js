/* MijnSerenity 8.28.0 — compatibiliteitsbrug voor de voormalige 7.19.19 dashboardloader.
   Deze URL blijft bestaan voor oudere bootstraps/caches, maar rendert zelf geen dashboard meer.
   De enige actuele Start-renderer is start-dashboard-71510.js. */
(()=>{
'use strict';
if(window.__msDashboardCompat8280)return;
window.__msDashboardCompat8280=true;

const CURRENT_PATH='/start-dashboard-71510.js';
const CURRENT_SRC=`${CURRENT_PATH}?v=828000`;

function currentPresent(){return !!window.__msApprovedHomeBootstrap8263}
function pathOf(value){try{return new URL(value,location.href).pathname}catch(_){return String(value||'')}}
function existingCurrent(){return [...document.scripts].find(script=>script.src&&pathOf(script.src)===CURRENT_PATH)}

function loadCurrent(){
  if(currentPresent())return;
  if(existingCurrent())return;
  const script=document.createElement('script');
  script.src=CURRENT_SRC;
  script.async=false;
  script.dataset.ms8280Compatibility='1';
  script.onerror=()=>console.warn('Actuele MijnSerenity Start-loader kon niet via de compatibiliteitsbrug worden geladen.');
  document.head.appendChild(script);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCurrent,{once:true});
else loadCurrent();
})();
