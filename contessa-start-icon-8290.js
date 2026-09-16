/* MijnSerenity 8.29.0 — VriJon Contessa als Start-icoon met publieke herstelfunctie. */
(()=>{
'use strict';
if(window.__msContessaStartIcon8290)return;
window.__msContessaStartIcon8290=true;

const BUILD='8.29.0';
const BOAT='<svg class="ms8290-contessa" viewBox="0 0 32 24" aria-hidden="true"><path d="M2.2 16.2h26.6l-2.8 3.2H7.2l-5-3.2Z"/><path d="M6.2 16.2v-4.3h8.4l2.2-3.8h5.6l3.5 8.1"/><path d="M9.1 11.9h14.1"/><path d="M12.6 8.1V5.3h4.8"/><path d="M18.1 8.1V6.3h3.4"/><path d="M15.2 9.4h2.5M19.3 9.4h2.4"/><path d="M4.5 20.5c2 .9 3.8.9 5.8 0 2-.9 3.8-.9 5.8 0 2 .9 3.8.9 5.8 0 2-.9 3.8-.9 5.8 0"/></svg>';
function lockBuild(){
  try{Object.defineProperty(window,'APP_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.APP_BUILD=BUILD}catch(__){}}
  try{Object.defineProperty(window,'MIJSERENITY_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.MIJSERENITY_BUILD=BUILD}catch(__){}}
}
function syncBuildDom(){
  lockBuild();
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp&&stamp.textContent!=='v'+BUILD)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version&&version.textContent!==BUILD)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>{if(el.textContent!==BUILD)el.textContent=BUILD});
}
function patchButton(button){
  if(!button)return;
  if(button.dataset.msContessa8290==='1')return;
  button.innerHTML=BOAT+'<span>Start</span>';
  button.dataset.msContessa8290='1';
  button.setAttribute('aria-label','Start · Serenity VriJon Contessa');
  button.setAttribute('title','Start');
}
function apply(){
  syncBuildDom();
  patchButton(document.querySelector('#ms8290GlobalNav [data-ms8290-go="dashboard"]'));
  patchButton(document.querySelector('#ms8210Start .ms8263-nav [data-ms8263-go="dashboard"]'));
}
function installStyle(){
  if(document.getElementById('ms8290ContessaIconStyle'))return;
  const s=document.createElement('style');s.id='ms8290ContessaIconStyle';
  s.textContent=`
#ms8290GlobalNav .ms8290-contessa,
#ms8210Start .ms8263-nav .ms8290-contessa{width:31px!important;height:25px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible}
@media(max-width:430px){#ms8290GlobalNav .ms8290-contessa,#ms8210Start .ms8263-nav .ms8290-contessa{width:28px!important;height:23px!important}}
`;
  document.head.appendChild(s);
}
window.ms8290ApplyContessaStartIcon=apply;
function start(){installStyle();apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(apply,20),{passive:true});
document.addEventListener('click',()=>setTimeout(apply,80),true);
setInterval(()=>{if(!document.hidden)apply()},1500);
})();
