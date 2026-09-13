/* MijnSerenity 8.28.1 — herstelbrug voor oude dashboardcaches.
   Deze compatibiliteits-URL forceert altijd de actuele Start-loader wanneer
   8.28.1 nog niet actief is, ook als een oude start-dashboard script-tag al bestaat. */
(()=>{
'use strict';
if(window.__msDashboardCompat8281)return;
window.__msDashboardCompat8281=true;
window.__msDisableLegacyVisuals=true;

const CURRENT_PATH='/start-dashboard-71510.js';
const CURRENT_SRC=`${CURRENT_PATH}?v=828100&recovery=1`;

function retireLegacy(){
  document.body?.classList.remove('ivms-dashboard-active');
  document.querySelector('.bottom-nav')?.classList.remove('ivms-dashboard-hidden');
  ['serenityIvms','ms71510Dashboard','ms71510Start','msMarineGlass','msStartCockpit7144','msDashboardAnalog7141','msWelcomeCard7140'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important')}
  });
}

function loadCurrent(){
  retireLegacy();
  if(window.__msApprovedHomeBootstrap8281)return;
  const stale=[...document.scripts].filter(script=>{
    try{return script.src&&new URL(script.src,location.href).pathname===CURRENT_PATH}catch(_){return false}
  });
  stale.forEach(script=>script.dataset.ms8281Superseded='1');
  const script=document.createElement('script');
  script.src=CURRENT_SRC;
  script.async=false;
  script.dataset.ms8281Recovery='1';
  script.onerror=()=>console.warn('MijnSerenity 8.28.1 herstel-dashboard kon niet worden geladen.');
  document.head.appendChild(script);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCurrent,{once:true});
else loadCurrent();
window.addEventListener('pageshow',()=>{retireLegacy();if(!window.__msApprovedHomeBootstrap8281)loadCurrent()},{passive:true});
})();
