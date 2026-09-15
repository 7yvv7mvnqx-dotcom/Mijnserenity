/* MijnSerenity 8.28.6 — Start 8.28.5 + globale dashboardnavigatie. */
(()=>{
'use strict';
if(window.__msStartDashboard8286)return;
window.__msStartDashboard8286=true;

const BASE_ID='ms8286StartBase';
const NAV_ID='ms8286GlobalDashboardNav';
const BUILD='8.28.6';

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

function loadNav(){
  if(window.__msGlobalDashboardNav8286){try{window.ms8286ApplyGlobalDashboardNav?.()}catch(_){};syncBuild();return}
  load('/global-dashboard-nav-8286.js?v=828600',NAV_ID,()=>{try{window.ms8286ApplyGlobalDashboardNav?.()}catch(_){};syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8285){loadNav();return}
  load('/start-dashboard-8285.js?v=828600',BASE_ID,()=>{loadNav();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadNav()},{passive:true});
})();
