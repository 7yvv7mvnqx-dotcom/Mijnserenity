/* MijnSerenity 8.28.9 — 8.28.8 + herstel Start-knop routing. */
(()=>{
'use strict';
if(window.__msStartDashboard8289)return;
window.__msStartDashboard8289=true;

const BASE_ID='ms8289StartBase';
const FIX_ID='ms8289StartRouteFix';
const BUILD='8.28.9';

function syncBuild(){
  try{Object.defineProperty(window,'APP_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.APP_BUILD=BUILD}catch(__){}}
  try{Object.defineProperty(window,'MIJSERENITY_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.MIJSERENITY_BUILD=BUILD}catch(__){}}
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

function loadFix(){
  if(window.__msStartButtonRouteFix8289){try{window.ms8289ApplyStartButtonFix?.()}catch(_){};syncBuild();return}
  load('/start-button-route-fix-8289.js?v=828900',FIX_ID,()=>{try{window.ms8289ApplyStartButtonFix?.()}catch(_){};syncBuild()});
}

function start(){
  syncBuild();
  if(window.__msStartDashboard8288){loadFix();return}
  load('/start-dashboard-8288.js?v=828900',BASE_ID,()=>{loadFix();syncBuild()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();loadFix()},{passive:true});
setInterval(syncBuild,1000);
})();
