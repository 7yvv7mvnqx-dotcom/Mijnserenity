/* MijnSerenity 8.26.6 — single approved Haven bootstrap; legacy Start is disabled */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8263)return;
window.__msApprovedHomeBootstrap8263=true;

/* Critical: old 8.23.5 dashboard loader must never regain control of Start. */
window.__msUnifiedDashboard8215=true;
window.__msSimpleStart8210=true;
window.__msDisableLegacyVisuals=true;

const BUILD='8.26.6',TOKEN='826600',ROOT='ms8210Start';
const APPROVED='ms8266ApprovedScript',PATCH='ms8266DashboardButtonsScript',LIVE='ms8266DashboardLiveScript';
const $=id=>document.getElementById(id);
function route(){try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}catch(_){return'dashboard'}}
function deepLink(){try{const q=new URLSearchParams(location.search);return q.has('alarm')||q.has('route')||q.has('page')}catch(_){return false}}
function syncBuild(){try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){};document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);const b=$('buildStamp');if(b)b.textContent='v'+BUILD;const s=$('settingsAppVersion');if(s)s.textContent=BUILD;document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD)}
function installStyle(){if($('ms8266StartGuardStyle'))return;const s=document.createElement('style');s.id='ms8266StartGuardStyle';s.textContent=`body.ms8263-home-active>.bottom-nav,body.ms8263-home-active #appView>.bottom-nav,body.ms8263-home-active .bottom-nav.ms8214-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}body.ms8263-home-active #dashboard>#ms71510Start,body.ms8263-home-active #dashboard>#serenityIvms,body.ms8263-home-active #dashboard>#ms71510Dashboard,body.ms8263-home-active #dashboard>#msMarineGlass{display:none!important}`;document.head.appendChild(s)}
function ensureRoot(){if(route()!=='dashboard')return null;const dashboard=$('dashboard');if(!dashboard)return null;let root=$(ROOT);if(!root){root=document.createElement('section');root.id=ROOT;dashboard.prepend(root)}dashboard.classList.add('ms8255-reference-dashboard');dashboard.classList.remove('mg-active','scd-active','mspro-active');[...dashboard.children].forEach(el=>{if(el!==root){el.dataset.ms8266Hidden='1';el.style.setProperty('display','none','important')}});root.style.setProperty('display','block','important');if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';document.body?.classList.add('ms8263-home-active');return root}
function load(path,id,after){if($(id)){after?.();return}const script=document.createElement('script');script.id=id;script.src=`${path}?v=${TOKEN}`;script.async=false;script.addEventListener('load',()=>after?.(),{once:true});document.head.appendChild(script)}
function ensurePatch(){if(typeof window.ms8265ApplyDashboardButtons==='function'){try{window.ms8265ApplyDashboardButtons()}catch(_){};return}load('/dashboard-buttons-8265.js',PATCH,()=>{try{window.ms8265ApplyDashboardButtons?.();syncBuild()}catch(_){}})}
function ensureLive(){if(window.__msApprovedDashboardLive8264)return;load('/approved-dashboard-live-8264.js',LIVE,()=>{syncBuild()})}
function finish(){try{window.ms8263ApplyApprovedDashboard?.()}catch(_){};ensurePatch();ensureLive();syncBuild()}
function apply(){installStyle();const root=ensureRoot();if(!root)return false;syncBuild();if(typeof window.ms8263ApplyApprovedDashboard==='function'){try{const ok=!!window.ms8263ApplyApprovedDashboard();ensurePatch();ensureLive();return ok}catch(e){console.warn('Approved Haven dashboard failed',e)}}load('/approved-dashboard-8263.js',APPROVED,finish);return false}
function showHome(){try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){};setTimeout(apply,0)}
function boot(){syncBuild();installStyle();if(!deepLink())showHome();else if(route()==='dashboard')apply();[120,500,1400].forEach(ms=>setTimeout(()=>{if(route()==='dashboard')apply()},ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{syncBuild();if(route()==='dashboard')setTimeout(apply,0)},{passive:true});
window.addEventListener('hashchange',()=>{if(route()==='dashboard')setTimeout(apply,0);else document.body?.classList.remove('ms8263-home-active')},{passive:true});
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-target="dashboard"],[data-route="dashboard"],[href="#dashboard"]');if(el&&!$(ROOT)?.contains(el))setTimeout(showHome,0)},true);
})();