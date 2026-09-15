/* MijnSerenity 8.28.3 — Start 8.28.2 + contrastfix voor Live aan boord in dagmodus. */
(()=>{
'use strict';
if(window.__msStartDashboard8283)return;
window.__msStartDashboard8283=true;

const BASE_ID='ms8283StartBase';
const PATCH_ID='ms8283DayTitleFix';
const BUILD='8.28.3';

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
  if(window.__msDashboardDayTitleFix8283){try{window.ms8283ApplyDayTitleFix?.()}catch(_){};syncBuild();return}
  load('/dashboard-day-title-fix-8283.js?v=828300',PATCH_ID,()=>{try{window.ms8283ApplyDayTitleFix?.()}catch(_){};syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8282){loadPatch();return}
  load('/start-dashboard-8282.js?v=828300',BASE_ID,()=>{loadPatch();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadPatch()},{passive:true});
})();
