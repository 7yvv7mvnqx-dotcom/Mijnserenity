/* MijnSerenity 8.28.0 — stabiele Start + aangepaste Serenity hero. */
(()=>{
'use strict';
if(window.__msApprovedHomeBootstrap8263)return;
window.__msApprovedHomeBootstrap8263=true;

window.__msUnifiedDashboard8215=true;
window.__msSimpleStart8210=true;
window.__msDisableLegacyVisuals=true;

const BUILD='8.28.0',TOKEN='828000',ROOT='ms8210Start';
const APPROVED='ms8266ApprovedScript',PATCH='ms8266DashboardButtonsScript',LIVE='ms8266DashboardLiveScript',AI='ms8266QuickAskScript',VOICE='ms8271AiVoiceScript',IOSVOICE='ms8277IosVoiceFixScript',PERSIST='ms8272AiPersistScript',HERO='ms8280HeroCropScript';
const $=id=>document.getElementById(id);
let readyAnnounced=false;
function route(){try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}catch(_){return'dashboard'}}
function deepLink(){try{const q=new URLSearchParams(location.search);return q.has('alarm')||q.has('route')||q.has('page')}catch(_){return false}}
function syncBuild(){try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){};document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);const b=$('buildStamp');if(b)b.textContent='v'+BUILD;const s=$('settingsAppVersion');if(s)s.textContent=BUILD;document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD)}
function announceReady(){if(readyAnnounced)return;readyAnnounced=true;window.__msApprovedHomeReady8280=true;window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,approved:true,singleRenderer:true,source:'start-dashboard-8280'}}))}
function installStyle(){if($('ms8266StartGuardStyle'))return;const s=document.createElement('style');s.id='ms8266StartGuardStyle';s.textContent=`body.ms8263-home-active>.bottom-nav,body.ms8263-home-active #appView>.bottom-nav,body.ms8263-home-active .bottom-nav.ms8214-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}body.ms8263-home-active #dashboard>#ms71510Start,body.ms8263-home-active #dashboard>#serenityIvms,body.ms8263-home-active #dashboard>#ms71510Dashboard,body.ms8263-home-active #dashboard>#msMarineGlass{display:none!important}`;document.head.appendChild(s)}
function ensureRoot(){if(route()!=='dashboard')return null;const dashboard=$('dashboard');if(!dashboard)return null;let root=$(ROOT);if(!root){root=document.createElement('section');root.id=ROOT;dashboard.prepend(root)}dashboard.classList.add('ms8255-reference-dashboard');dashboard.classList.remove('mg-active','scd-active','mspro-active');[...dashboard.children].forEach(el=>{if(el!==root){el.dataset.ms8266Hidden='1';el.style.setProperty('display','none','important')}});root.style.setProperty('display','block','important');if(!root.innerHTML.trim())root.innerHTML='<div style="min-height:100dvh;background:#03131f"></div>';document.body?.classList.add('ms8263-home-active');return root}
function load(path,id,after){if($(id)){after?.();return}const script=document.createElement('script');script.id=id;script.src=`${path}?v=${TOKEN}`;script.async=false;script.addEventListener('load',()=>after?.(),{once:true});document.head.appendChild(script)}
function ensureHero(){if(window.__msSerenityHeroCrop8280)return;load('/serenity-hero-crop-8280.js',HERO)}
function ensurePatch(){if(typeof window.ms8265ApplyDashboardButtons==='function'){try{window.ms8265ApplyDashboardButtons()}catch(_){};return}load('/dashboard-buttons-8265.js',PATCH,()=>{try{window.ms8265ApplyDashboardButtons?.();syncBuild()}catch(_){}})}
function ensureLive(){if(window.__msApprovedDashboardLive8264)return;load('/approved-dashboard-live-8264.js',LIVE,()=>{syncBuild()})}
function ensurePersist(){if(window.__msSerenityAiPersist8272){try{window.ms8272KeepSerenityAnswer?.()}catch(_){};return}load('/serenity-ai-persist-8272.js',PERSIST,()=>{try{window.ms8272KeepSerenityAnswer?.()}catch(_){};})}
function ensureIosVoice(){if(window.__msSerenityAiIosVoiceFix8277)return;load('/serenity-ai-ios-voice-fix-8275.js',IOSVOICE)}
function ensureVoice(){if(window.__msSerenityAiVoice8271){try{window.ms8271EnhanceSerenityAI?.()}catch(_){};ensureIosVoice();ensurePersist();return}load('/serenity-ai-voice-8271.js',VOICE,()=>{try{window.ms8271EnhanceSerenityAI?.()}catch(_){};ensureIosVoice();ensurePersist()})}
function ensureAi(){if(window.__msQuickAsk8270||window.__msQuickAsk8267){try{window.ms8267MountQuickAsk?.()}catch(_){};ensureVoice();return}load('/ai-quick-command-8267.js',AI,()=>{try{window.ms8267MountQuickAsk?.()}catch(_){};ensureVoice()})}
function finish(){try{window.ms8263ApplyApprovedDashboard?.()}catch(_){};ensureHero();ensurePatch();ensureLive();ensureAi();syncBuild();announceReady()}
function apply(){installStyle();ensureHero();const root=ensureRoot();if(!root)return false;syncBuild();if(typeof window.ms8263ApplyApprovedDashboard==='function'){try{const ok=!!window.ms8263ApplyApprovedDashboard();ensureHero();ensurePatch();ensureLive();ensureAi();if(ok)announceReady();return ok}catch(e){console.warn('Approved Haven dashboard failed',e)}}load('/approved-dashboard-8263.js',APPROVED,finish);return false}
function showHome(){try{history.replaceState(null,'',location.pathname+location.search+'#dashboard')}catch(_){};setTimeout(apply,0)}
function boot(){syncBuild();installStyle();ensureHero();if(!deepLink())showHome();else if(route()==='dashboard')apply();[120,500,1400].forEach(ms=>setTimeout(()=>{ensureHero();if(route()==='dashboard')apply()},ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{syncBuild();ensureHero();if(route()==='dashboard')setTimeout(apply,0)},{passive:true});
window.addEventListener('hashchange',()=>{ensureHero();if(route()==='dashboard')setTimeout(apply,0);else document.body?.classList.remove('ms8263-home-active')},{passive:true});
document.addEventListener('click',e=>{const el=e.target.closest?.('[data-target="dashboard"],[data-route="dashboard"],[href="#dashboard"]');if(el&&!$(ROOT)?.contains(el))setTimeout(showHome,0)},true);
})();
