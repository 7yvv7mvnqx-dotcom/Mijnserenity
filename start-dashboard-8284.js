/* MijnSerenity 8.28.4 — volledige dagmodus voor Start en alle vervolgpagina's. */
(()=>{
'use strict';
if(window.__msStartDashboard8284)return;
window.__msStartDashboard8284=true;

const BASE_ID='ms8284StartBase';
const GLOBAL_THEME_ID='ms8284GlobalDayTheme';
const BUILD='8.28.4';

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

function loadGlobalTheme(){
  if(window.__msGlobalDayTheme8284){try{window.ms8284ApplyGlobalDayTheme?.()}catch(_){};syncBuild();return}
  load('/global-day-theme-8284.js?v=828400',GLOBAL_THEME_ID,()=>{try{window.ms8284ApplyGlobalDayTheme?.()}catch(_){};syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8283){loadGlobalTheme();return}
  load('/start-dashboard-8283.js?v=828400',BASE_ID,()=>{loadGlobalTheme();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadGlobalTheme()},{passive:true});
})();
