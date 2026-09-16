/* MijnSerenity 8.29.0 — Fase 5 navigatie/UI-herstel met echte teruggeschiedenis. */
(()=>{
'use strict';
if(window.__msStartDashboard8290)return;
window.__msStartDashboard8290=true;

const BASE_ID='ms8290StartBase';
const NAV_ID='ms8290GlobalDashboardNav';
const ICON_ID='ms8290ContessaStartIcon';
const BUILD='8.29.0';
const TOKEN='829000';

function lockBuild(){
  try{Object.defineProperty(window,'APP_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.APP_BUILD=BUILD}catch(__){}}
  try{Object.defineProperty(window,'MIJSERENITY_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.MIJSERENITY_BUILD=BUILD}catch(__){}}
}
function syncBuild(){
  lockBuild();
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
}
function load(src,id){
  return new Promise((resolve,reject)=>{
    if(document.getElementById(id)){resolve();return}
    const script=document.createElement('script');script.id=id;script.src=src;script.async=false;
    script.addEventListener('load',resolve,{once:true});
    script.addEventListener('error',()=>reject(new Error('Laden mislukt: '+src)),{once:true});
    document.head.appendChild(script);
  });
}
async function start(){
  syncBuild();
  try{
    if(!window.__msStartDashboard8285)await load(`/start-dashboard-8285.js?v=${TOKEN}`,BASE_ID);
    syncBuild();
    if(!window.__msGlobalDashboardNav8290)await load(`/global-dashboard-nav-8290.js?v=${TOKEN}`,NAV_ID);
    syncBuild();
    if(!window.__msContessaStartIcon8290)await load(`/contessa-start-icon-8290.js?v=${TOKEN}`,ICON_ID);
    try{window.ms8290ApplyGlobalDashboardNav?.()}catch(_){}
    try{window.ms8290ApplyContessaStartIcon?.()}catch(_){}
    syncBuild();
  }catch(error){console.error('MijnSerenity 8.29.0 startlaag kon niet volledig laden:',error)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>{syncBuild();start()},{passive:true});
setInterval(syncBuild,1500);
})();
