/* MijnSerenity 8.28.8 — VriJon Contessa als Start-icoon in alle navigatiebalken. */
(()=>{
'use strict';
if(window.__msContessaStartIcon8288)return;
window.__msContessaStartIcon8288=true;

const BUILD='8.28.8';
const BOAT='<svg class="ms8288-contessa" viewBox="0 0 32 24" aria-hidden="true"><path d="M2.2 16.2h26.6l-2.8 3.2H7.2l-5-3.2Z"/><path d="M6.2 16.2v-4.3h8.4l2.2-3.8h5.6l3.5 8.1"/><path d="M9.1 11.9h14.1"/><path d="M12.6 8.1V5.3h4.8"/><path d="M18.1 8.1V6.3h3.4"/><path d="M15.2 9.4h2.5M19.3 9.4h2.4"/><path d="M4.5 20.5c2 .9 3.8.9 5.8 0 2-.9 3.8-.9 5.8 0 2 .9 3.8.9 5.8 0 2-.9 3.8-.9 5.8 0"/></svg>';

function lockBuild(){
  try{Object.defineProperty(window,'APP_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.APP_BUILD=BUILD}catch(__){}}
  try{Object.defineProperty(window,'MIJSERENITY_BUILD',{configurable:true,get:()=>BUILD,set:()=>{}})}catch(_){try{window.MIJSERENITY_BUILD=BUILD}catch(__){}}
}

function syncBuildDom(){
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp&&stamp.textContent!=='v'+BUILD)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version&&version.textContent!==BUILD)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>{if(el.textContent!==BUILD)el.textContent=BUILD});
}

function patchButton(button){
  if(!button)return;
  if(button.dataset.msContessa8288==='1')return;
  button.innerHTML=BOAT+'<span>Start</span>';
  button.dataset.msContessa8288='1';
  button.setAttribute('aria-label','Start · Serenity VriJon Contessa');
  button.setAttribute('title','Start');
}

function apply(){
  lockBuild();syncBuildDom();
  patchButton(document.querySelector('#ms8287GlobalNav [data-ms8287-go="dashboard"]'));
  patchButton(document.querySelector('#ms8210Start .ms8263-nav [data-ms8263-go="dashboard"]'));
}

function installStyle(){
  if(document.getElementById('ms8288ContessaIconStyle'))return;
  const s=document.createElement('style');s.id='ms8288ContessaIconStyle';
  s.textContent=`
#ms8287GlobalNav .ms8288-contessa,
#ms8210Start .ms8263-nav .ms8288-contessa{width:31px!important;height:25px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible}
@media(max-width:430px){#ms8287GlobalNav .ms8288-contessa,#ms8210Start .ms8263-nav .ms8288-contessa{width:28px!important;height:23px!important}}
`;
  document.head.appendChild(s);
}

function start(){installStyle();apply();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(apply,20),{passive:true});
document.addEventListener('click',()=>setTimeout(apply,80),true);
setInterval(apply,400);
})();
