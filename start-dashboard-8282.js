/* MijnSerenity 8.28.2 — Start 8.28.1 + stabiele Dag/Nacht-fix. */
(()=>{
'use strict';
if(window.__msStartDashboard8282)return;
window.__msStartDashboard8282=true;

const BASE_ID='ms8282StartBase';
const THEME_ID='ms8282ThemeFix';
const BUILD='8.28.2';

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

function loadTheme(){
  if(window.__msDashboardThemeFix8282){try{window.ms8282ApplyTheme?.()}catch(_){};syncBuild();return}
  load('/dashboard-theme-fix-8282.js?v=828200',THEME_ID,()=>{syncBuild();try{window.ms8282ApplyTheme?.()}catch(_){}});
}

function start(){
  syncBuild();
  if(window.__msApprovedHomeBootstrap8263){loadTheme();return}
  load('/start-dashboard-8281.js?v=828200',BASE_ID,()=>{loadTheme();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadTheme()},{passive:true});
})();
