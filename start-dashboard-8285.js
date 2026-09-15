/* MijnSerenity 8.28.5 — Start 8.28.4 + cascadefix volledige dagmodus. */
(()=>{
'use strict';
if(window.__msStartDashboard8285)return;
window.__msStartDashboard8285=true;

const BASE_ID='ms8285StartBase';
const PATCH_ID='ms8285GlobalDayThemeFix';
const BUILD='8.28.5';

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
  const script=document.createElement('script');
  script.id=id;script.src=src;script.async=false;
  script.addEventListener('load',()=>done?.(),{once:true});
  document.head.appendChild(script);
}

function loadPatch(){
  if(window.__msGlobalDayThemeFix8285){try{window.ms8285ApplyGlobalDayThemeFix?.()}catch(_){};syncBuild();return}
  load('/global-day-theme-fix-8285.js?v=828500',PATCH_ID,()=>{try{window.ms8285ApplyGlobalDayThemeFix?.()}catch(_){};syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8284){loadPatch();return}
  load('/start-dashboard-8284.js?v=828500',BASE_ID,()=>{loadPatch();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadPatch()},{passive:true});
})();
