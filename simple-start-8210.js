/* MijnSerenity 8.26.3 — stable approved Haven bootstrap */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8263)return;
window.__msApprovedHomeBootstrap8263=true;
const BUILD='8.26.3',TOKEN='826300',ROOT='ms8210Start',APPROVED='ms8263ApprovedScript';
const $=id=>document.getElementById(id);
function route(){try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}catch(_){return'dashboard'}}
function deepLink(){try{const q=new URLSearchParams(location.search);return q.has('alarm')||q.has('route')||q.has('page')}catch(_){return false}}
function syncBuild(){try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){};document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);const b=$('buildStamp');if(b)b.textContent='v'+BUILD;const s=$('settingsAppVersion');if(s)s.textContent=BUILD;document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD)}
function ensureRoot(){if(route()!=='dashboard')return null;const dashboard=$('dashboard');if(!dashboard)return null;let root=$(ROOT);if(!root){root=document.createElement('section');root.id=ROOT;dashboard.prepend(root)}dashboard.classList.add('ms8255-reference-dashboard');[...dashboard.children].forEach(el=>{if(el!==root){el.dataset.ms8263Hidden='1';el.style.setProperty('display','none','important')}});root.style.setProperty('display','block','important');if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';return root}
function apply(){const root=ensureRoot();if(!root)return false;syncBuild();if(typeof window.ms8263ApplyApprovedDashboard==='function'){try{return!!window.ms8263ApplyApprovedDashboard()}catch(e){console.warn('Approved Haven dashboard failed',e)}}let script=$(APPROVED);if(!script){script=document.createElement('script');script.id=APPROVED;script.src='/approved-dashboard-8263.js?v='+TOKEN;script.async=false;script.addEventListener('load',()=>{try{window.ms8263ApplyApprovedDashboard?.();syncBuild()}catch(_){}},{once:true});document.head.appendChild(script)}return false}
function showHome(){try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){};setTimeout(apply,0)}
function boot(){syncBuild();if(!deepLink())showHome();else if(route()==='dashboard')apply();[40,140,400,900,1800].forEach(ms=>setTimeout(()=>{if(route()==='dashboard')apply()},ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(route()==='dashboard')setTimeout(apply,0)},{passive:true});
window.addEventListener('hashchange',()=>{if(route()==='dashboard')setTimeout(apply,0)},{passive:true});
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-target="dashboard"],[data-route="dashboard"],[href="#dashboard"]');if(el&&!$(ROOT)?.contains(el))setTimeout(showHome,0)},true);
let queued=false;new MutationObserver(()=>{if(queued||route()!=='dashboard')return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}).observe(document.documentElement,{childList:true,subtree:true});
})();

/* 8.26.4 live instruments: loaded separately so the approved layout stays untouched. */
(()=>{
  const id='ms8264DashboardLiveScript';
  const load=()=>{
    if(window.__msApprovedDashboardLive8264||document.getElementById(id))return;
    const script=document.createElement('script');
    script.id=id;
    script.src='/approved-dashboard-live-8264.js?v=826400';
    script.async=false;
    document.head.appendChild(script);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();