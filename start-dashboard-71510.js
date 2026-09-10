/* MijnSerenity 8.26.5 — stable approved Haven bootstrap + complete navigation */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8263)return;
window.__msApprovedHomeBootstrap8263=true;
const BUILD='8.26.5',TOKEN='826500',ROOT='ms8210Start',APPROVED='ms8263ApprovedScript',PATCH='ms8265DashboardButtonsScript';
const $=id=>document.getElementById(id);
function route(){try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}catch(_){return'dashboard'}}
function deepLink(){try{const q=new URLSearchParams(location.search);return q.has('alarm')||q.has('route')||q.has('page')}catch(_){return false}}
function syncBuild(){try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){};document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);const b=$('buildStamp');if(b)b.textContent='v'+BUILD;const s=$('settingsAppVersion');if(s)s.textContent=BUILD;document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD)}
function ensureRoot(){if(route()!=='dashboard')return null;const dashboard=$('dashboard');if(!dashboard)return null;let root=$(ROOT);if(!root){root=document.createElement('section');root.id=ROOT;dashboard.prepend(root)}dashboard.classList.add('ms8255-reference-dashboard');[...dashboard.children].forEach(el=>{if(el!==root){el.dataset.ms8263Hidden='1';el.style.setProperty('display','none','important')}});root.style.setProperty('display','block','important');if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';return root}
function ensurePatch(){
  if(typeof window.ms8265ApplyDashboardButtons==='function'){try{window.ms8265ApplyDashboardButtons()}catch(_){};return}
  let script=$(PATCH);
  if(script)return;
  script=document.createElement('script');
  script.id=PATCH;
  script.src='/dashboard-buttons-8265.js?v='+TOKEN;
  script.async=false;
  script.addEventListener('load',()=>{try{window.ms8265ApplyDashboardButtons?.();syncBuild()}catch(_){}},{once:true});
  document.head.appendChild(script);
}
function apply(){
  const root=ensureRoot();if(!root)return false;
  syncBuild();
  if(typeof window.ms8263ApplyApprovedDashboard==='function'){
    try{const ok=!!window.ms8263ApplyApprovedDashboard();ensurePatch();return ok}catch(e){console.warn('Approved Haven dashboard failed',e)}
  }
  let script=$(APPROVED);
  if(!script){
    script=document.createElement('script');script.id=APPROVED;script.src='/approved-dashboard-8263.js?v='+TOKEN;script.async=false;
    script.addEventListener('load',()=>{try{window.ms8263ApplyApprovedDashboard?.();ensurePatch();syncBuild()}catch(_){}},{once:true});
    document.head.appendChild(script);
  }
  return false;
}
function showHome(){try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){};setTimeout(apply,0)}
function boot(){
  syncBuild();
  if(!deepLink())showHome();else if(route()==='dashboard')apply();
  setTimeout(()=>{if(route()!=='dashboard')return;const root=$(ROOT);if(!root?.querySelector('.ms8263-nav'))apply();else ensurePatch()},650);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(route()==='dashboard')setTimeout(()=>{const root=$(ROOT);if(!root?.querySelector('.ms8263-nav'))apply();else ensurePatch()},0)},{passive:true});
window.addEventListener('hashchange',()=>{if(route()==='dashboard')setTimeout(()=>{const root=$(ROOT);if(!root?.querySelector('.ms8263-nav'))apply();else ensurePatch()},0)},{passive:true});
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-target="dashboard"],[data-route="dashboard"],[href="#dashboard"]');if(el&&!$(ROOT)?.contains(el))setTimeout(showHome,0)},true);
let queued=false;
new MutationObserver(()=>{
  if(queued||route()!=='dashboard')return;
  const dashboard=$('dashboard'),root=$(ROOT);
  if(root?.isConnected&&dashboard?.contains(root))return;
  queued=true;requestAnimationFrame(()=>{queued=false;apply()});
}).observe(document.documentElement,{childList:true,subtree:true});
})();