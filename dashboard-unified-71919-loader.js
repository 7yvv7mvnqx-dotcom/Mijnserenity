/* MijnSerenity 8.26.14 — approved Haven dashboard + Serenity AI search.
   Keeps the approved Start renderer and mounts the ChatGPT-powered search/ask field. */
(()=>{
'use strict';
if(window.__msApprovedUnified82614)return;
window.__msApprovedUnified82614=true;

const BUILD='8.26.14';
const TOKEN='826914';
const ROOT='ms8210Start';
const $=id=>document.getElementById(id);

/* Block the superseded renderers if an older bootstrap tries to start them later. */
window.__msUnifiedDashboard8215=true;
window.__msSimpleStart8210=true;
window.__msDisableLegacyVisuals=true;

function route(){
  try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}
  catch(_){return'dashboard'}
}

function syncBuild(){
  try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=$('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
  const settings=$('settingsAppVersion');if(settings)settings.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  const badge=document.querySelector('#msMarineGlass .mg-brand sup');if(badge)badge.textContent=BUILD;
}

function installGuardStyle(){
  if($('ms82614SingleStartStyle'))return;
  const style=document.createElement('style');
  style.id='ms82614SingleStartStyle';
  style.textContent=`
    body.ms8263-home-active>.bottom-nav,
    body.ms8263-home-active #appView>.bottom-nav,
    body.ms8263-home-active .bottom-nav.ms8214-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}
    body.ms8263-home-active #dashboard>#ms71510Start,
    body.ms8263-home-active #dashboard>#serenityIvms,
    body.ms8263-home-active #dashboard>#ms71510Dashboard,
    body.ms8263-home-active #dashboard>#msMarineGlass{display:none!important}
  `;
  document.head.appendChild(style);
}

function removeLegacyStart(){
  ['msUnifiedDashboardStyle8215','msUnifiedDashboardStyle8214','msUnifiedDashboardStyle8202','msUnifiedDashboardStyle71919'].forEach(id=>$(id)?.remove());
  const dashboard=$('dashboard');
  if(!dashboard)return null;
  let root=$(ROOT);
  if(!root){
    root=document.createElement('section');
    root.id=ROOT;
    dashboard.prepend(root);
  }
  dashboard.classList.add('ms8255-reference-dashboard');
  dashboard.classList.remove('mg-active','scd-active','mspro-active');
  [...dashboard.children].forEach(el=>{
    if(el!==root){
      el.dataset.ms8266Legacy='1';
      el.style.setProperty('display','none','important');
    }
  });
  root.style.setProperty('display','block','important');
  if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';
  return root;
}

function pathOf(value){try{return new URL(value,location.href).pathname}catch(_){return String(value||'')}}
function removeScript(path){
  [...document.scripts].forEach(script=>{if(script.src&&pathOf(script.src)===path)script.remove()});
}
function loadFresh(path,id){
  return new Promise(resolve=>{
    if(id&&$(id)){resolve(true);return}
    removeScript(path);
    const script=document.createElement('script');
    if(id)script.id=id;
    script.src=`${path}?v=${TOKEN}&fresh=${Date.now()}`;
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>{script.remove();resolve(false)};
    document.head.appendChild(script);
  });
}

async function applyApproved(){
  syncBuild();installGuardStyle();
  if(route()!=='dashboard')return true;
  removeLegacyStart();
  document.body?.classList.add('ms8263-home-active');

  if(typeof window.ms8263ApplyApprovedDashboard!=='function'){
    const ok=await loadFresh('/approved-dashboard-8263.js','ms82614ApprovedDashboard');
    if(!ok)return false;
  }
  try{window.ms8263ApplyApprovedDashboard?.()}catch(error){console.warn('Approved Haven renderer:',error);return false}

  if(typeof window.ms8265ApplyDashboardButtons!=='function')await loadFresh('/dashboard-buttons-8265.js','ms82614DashboardButtons');
  try{window.ms8265ApplyDashboardButtons?.()}catch(_){}

  if(!window.__msApprovedDashboardLive8264)await loadFresh('/approved-dashboard-live-8264.js','ms82614LiveDashboard');
  try{window.ms8264MountLiveInstruments?.()}catch(_){}

  /* Mount the existing server-side OpenAI quick-search after the approved dashboard exists.
     It receives curated MijnSerenity context and keeps deterministic/local navigation as fallback. */
  if(!window.__msQuickAsk8270){
    await loadFresh('/ai-quick-command-8267.js','ms82614SerenityAiSearch');
  }

  syncBuild();
  return true;
}

let repairing=false;
async function repair(){
  if(repairing)return;
  repairing=true;
  try{await applyApproved()}finally{repairing=false}
}
window.ms8202RepairUnifiedUi=repair;
window.ms8215RepairUnifiedUi=repair;
window.ms8266RepairApprovedUi=repair;
window.ms82614RepairApprovedUi=repair;

function boot(){
  repair();
  [120,500,1500].forEach(ms=>setTimeout(()=>{if(route()==='dashboard')repair()},ms));
  window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,approved:true,singleRenderer:true,serenityAi:true}}));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{syncBuild();if(route()==='dashboard')repair()},{passive:true});
window.addEventListener('hashchange',()=>{
  if(route()==='dashboard')repair();
  else document.body?.classList.remove('ms8263-home-active');
},{passive:true});
})();
