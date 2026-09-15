/* MijnSerenity 8.28.9 — herstel Start-knop: activeer eerst de echte dashboardroute. */
(()=>{
'use strict';
if(window.__msStartButtonRouteFix8289)return;
window.__msStartButtonRouteFix8289=true;

const BUILD='8.28.9';
const NAV_ID='ms8287GlobalNav';

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

function legacyStartButton(){
  const selectors=[
    '#appView > .bottom-nav .bottom-nav-item[data-target="dashboard"]',
    '.bottom-nav.bottom-nav-always-visible .bottom-nav-item[data-target="dashboard"]',
    '.bottom-nav-item[data-target="dashboard"]'
  ];
  for(const selector of selectors){
    const button=[...document.querySelectorAll(selector)].find(el=>!el.closest('#'+NAV_ID)&&!el.closest('#ms8210Start'));
    if(button)return button;
  }
  return null;
}

function showDashboard(){
  syncBuild();
  let routed=false;

  /* Gebruik de originele navigatiehandler van MijnSerenity. De oude balk is visueel
     verborgen, maar de knop en zijn captainNavigate-handler bestaan nog steeds. */
  const legacy=legacyStartButton();
  if(legacy){
    try{legacy.click();routed=true}catch(_){}
  }

  if(!routed){
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate('dashboard',legacy||undefined);
        routed=true;
      }
    }catch(_){}
  }
  if(!routed){
    try{if(typeof window.navigateTo==='function'){window.navigateTo('dashboard');routed=true}}catch(_){}
  }
  if(!routed){
    try{if(typeof window.showPage==='function'){window.showPage('dashboard');routed=true}}catch(_){}
  }

  try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){}

  /* Pas daarna de goedgekeurde Serenity-startpagina toe. */
  const finish=()=>{
    try{window.ms8263Navigate?.('dashboard')}catch(_){}
    try{window.ms8263ApplyApprovedDashboard?.()}catch(_){}
    try{window.ms8287ApplyGlobalDashboardNav?.()}catch(_){}
    try{window.ms8288ApplyContessaStartIcon?.()}catch(_){}
    syncBuild();
  };
  setTimeout(finish,30);
  setTimeout(finish,160);
  setTimeout(finish,420);
}

function bind(){
  const button=document.querySelector('#'+NAV_ID+' [data-ms8287-go="dashboard"]');
  if(!button||button.dataset.msStartRoute8289==='1')return;
  button.dataset.msStartRoute8289='1';
  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    showDashboard();
  },true);
}

window.ms8289ShowDashboard=showDashboard;
window.ms8289ApplyStartButtonFix=()=>{syncBuild();bind()};

function start(){syncBuild();bind()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>setTimeout(start,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(start,20),{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(start,20),{passive:true});
setInterval(()=>{if(!document.hidden){syncBuild();bind()}},400);
})();
