/* MijnSerenity 8.28.8 — 8.28.7 + VriJon Contessa Start-icoon. */
(()=>{
'use strict';
if(window.__msStartDashboard8288)return;
window.__msStartDashboard8288=true;

const BASE_ID='ms8288StartBase';
const PATCH_ID='ms8288ContessaStartIcon';
const BUILD='8.28.8';

function syncBuild(){
  try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
}

function load(src,id,done){
  if(document.getElementById(id)){done?.();return}
  const script=document.createElement('script');script.id=id;script.src=src;script.async=false;
  script.addEventListener('load',()=>done?.(),{once:true});document.head.appendChild(script);
}

function loadPatch(){
  if(window.__msContessaStartIcon8288){syncBuild();return}
  load('/contessa-start-icon-8288.js?v=828800',PATCH_ID,()=>{syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8287){loadPatch();return}
  load('/start-dashboard-8287.js?v=828800',BASE_ID,()=>{loadPatch();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadPatch()},{passive:true});
})();
