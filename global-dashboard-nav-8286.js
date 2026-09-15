/* MijnSerenity 8.28.6 — dashboardnavigatie als enige globale navigatie. */
(()=>{
'use strict';
if(window.__msGlobalDashboardNav8286)return;
window.__msGlobalDashboardNav8286=true;

const BUILD='8.28.6';
const NAV_ID='ms8286GlobalNav';
const STYLE_ID='ms8286GlobalNavStyle';
const MORE_ID='ms8286MoreSheet';

const icon={
  home:'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
  route:'<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>',
  radar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M4.2 19.8a11 11 0 0 1 15.6-15.6M7 17a7 7 0 0 1 10-10M12 12l7-7"/></svg>',
  sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  more:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};

function syncBuild(){
  try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
}

function route(){
  try{return((location.hash||'#dashboard').replace(/^#/,'').split(/[?&/]/)[0]||'dashboard').toLowerCase()}
  catch(_){return'dashboard'}
}

function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
/* Oude navigatie volledig vervangen */
body.ms8286-global-nav-active .bottom-nav,
body.ms8286-global-nav-active #appView>.bottom-nav,
body.ms8286-global-nav-active .bottom-nav.ms8214-nav,
body.ms8286-global-nav-active #appView>.tabs{display:none!important;visibility:hidden!important;pointer-events:none!important}

body.ms8286-global-nav-active{padding-bottom:calc(104px + env(safe-area-inset-bottom))!important}

#${NAV_ID}{position:fixed;left:50%;bottom:0;z-index:1300;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));width:min(920px,100%);min-height:91px;padding:9px 8px max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(2,27,42,.94);border:1px solid rgba(98,207,246,.29);border-left:0;border-right:0;border-bottom:0;border-radius:29px 29px 0 0;backdrop-filter:blur(17px);-webkit-backdrop-filter:blur(17px);box-shadow:0 -12px 34px rgba(0,0,0,.18)}
#${NAV_ID}[hidden]{display:none!important}
#${NAV_ID} button{position:relative;min-width:0;min-height:68px;padding:4px 2px;border:0!important;background:transparent!important;color:#eff7fa!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font:650 12px/1.1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;box-shadow:none!important;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#${NAV_ID} button svg{display:block;width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2.05;stroke-linecap:round;stroke-linejoin:round}
#${NAV_ID} button.active{color:#22d8ff!important}
#${NAV_ID} button.active:after{content:"";position:absolute;left:12%;right:12%;bottom:-8px;height:2px;border-radius:9px;background:#22d8ff;box-shadow:0 0 10px rgba(34,216,255,.45)}

body.ms8284-day #${NAV_ID}{background:rgba(245,251,253,.97);border-color:rgba(45,146,185,.24);box-shadow:0 -10px 28px rgba(31,86,109,.08)}
body.ms8284-day #${NAV_ID} button{color:#234b5e!important}
body.ms8284-day #${NAV_ID} button.active{color:#00a6c7!important}
body.ms8284-day #${NAV_ID} button.active:after{background:#00a6c7;box-shadow:0 0 10px rgba(0,166,199,.30)}

#${MORE_ID}{position:fixed;inset:0;z-index:1500;display:none;align-items:flex-end;justify-content:center;padding:18px 18px calc(112px + env(safe-area-inset-bottom));background:rgba(0,9,16,.50);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#${MORE_ID}.open{display:flex}
#${MORE_ID} .ms8286-more-card{width:min(560px,100%);padding:18px;border:1px solid rgba(92,204,244,.30);border-radius:25px;background:#062234;box-shadow:0 24px 80px rgba(0,0,0,.42)}
#${MORE_ID} .ms8286-more-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;color:#fff;font:800 20px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#${MORE_ID} .ms8286-more-close{width:46px;height:46px;display:grid;place-items:center;border:1px solid rgba(119,210,244,.22);border-radius:50%;background:#082c42;color:#fff;padding:0}
#${MORE_ID} .ms8286-more-close svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2}
#${MORE_ID} .ms8286-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#${MORE_ID} .ms8286-more-grid button{min-height:54px;padding:10px 12px;border:1px solid rgba(93,203,241,.24);border-radius:15px;background:#0a344b;color:#fff;font-weight:800}
body.ms8284-day #${MORE_ID} .ms8286-more-card{background:#f7fcfd;border-color:rgba(45,146,185,.24)}
body.ms8284-day #${MORE_ID} .ms8286-more-head{color:#08293c}
body.ms8284-day #${MORE_ID} .ms8286-more-close{background:#e4f4f8;color:#0a5168;border-color:rgba(45,146,185,.24)}
body.ms8284-day #${MORE_ID} .ms8286-more-grid button{background:#e9f6fa;color:#0a3449;border-color:rgba(45,146,185,.24)}

@media(max-width:430px){
  #${NAV_ID}{min-height:86px;padding-left:4px;padding-right:4px;border-radius:25px 25px 0 0}
  #${NAV_ID} button{min-height:62px;font-size:10.5px;gap:5px}
  #${NAV_ID} button svg{width:25px;height:25px}
}
`;
  document.head.appendChild(s);
}

function navHtml(){
  return `<nav id="${NAV_ID}" aria-label="Hoofdnavigatie">
    <button data-ms8286-go="dashboard">${icon.home}<span>Haven</span></button>
    <button data-ms8286-go="map">${icon.map}<span>Kaart</span></button>
    <button data-ms8286-go="planner">${icon.route}<span>Reisplanner</span></button>
    <button data-ms8286-go="ais">${icon.radar}<span>AIS</span></button>
    <button data-ms8286-go="weather">${icon.sun}<span>Weer</span></button>
    <button data-ms8286-go="more">${icon.more}<span>Meer</span></button>
  </nav>`;
}

function moreHtml(){
  return `<div id="${MORE_ID}" aria-hidden="true"><div class="ms8286-more-card">
    <div class="ms8286-more-head"><strong>Meer</strong><button class="ms8286-more-close" aria-label="Sluiten">${icon.close}</button></div>
    <div class="ms8286-more-grid">
      <button data-ms8286-go="live">Live varen</button>
      <button data-ms8286-go="technical">Techniek</button>
      <button data-ms8286-go="logbook">Logboek</button>
      <button data-ms8286-go="entertainment">Entertainment</button>
      <button data-ms8286-go="pois">POI's</button>
      <button data-ms8286-go="costs">Kosten</button>
      <button data-ms8286-go="finance">Financieel</button>
      <button data-ms8286-go="settings">Instellingen</button>
    </div>
  </div></div>`;
}

function mount(){
  installStyle();syncBuild();
  if(!document.getElementById(NAV_ID))document.body.insertAdjacentHTML('beforeend',navHtml());
  if(!document.getElementById(MORE_ID))document.body.insertAdjacentHTML('beforeend',moreHtml());
  bind();syncVisibility();
}

function bind(){
  const nav=document.getElementById(NAV_ID);
  const sheet=document.getElementById(MORE_ID);
  if(nav&&nav.dataset.bound!=='1'){
    nav.dataset.bound='1';
    nav.addEventListener('click',event=>{
      const button=event.target.closest('[data-ms8286-go]');if(button)go(button.dataset.ms8286Go);
    });
  }
  if(sheet&&sheet.dataset.bound!=='1'){
    sheet.dataset.bound='1';
    sheet.addEventListener('click',event=>{
      if(event.target===sheet||event.target.closest('.ms8286-more-close')){closeMore();return}
      const button=event.target.closest('[data-ms8286-go]');if(button)go(button.dataset.ms8286Go);
    });
  }
}

function openMore(){
  const sheet=document.getElementById(MORE_ID);if(!sheet)return;
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');
}
function closeMore(){
  const sheet=document.getElementById(MORE_ID);if(!sheet)return;
  sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');
}

function go(target){
  if(!target)return;
  if(target==='more'){openMore();return}
  closeMore();
  if(target==='dashboard'){
    try{if(typeof window.ms8263Navigate==='function'){window.ms8263Navigate('dashboard');return}}catch(_){}
  }
  try{if(typeof window.captainNavigate==='function'){window.captainNavigate(target);setTimeout(syncVisibility,30);return}}catch(_){}
  try{history.replaceState(null,'',location.pathname+location.search+'#'+target)}catch(_){}
  try{if(typeof window.navigateTo==='function'){window.navigateTo(target);return}}catch(_){}
  try{if(typeof window.showPage==='function'){window.showPage(target);return}}catch(_){}
}

function activeGroup(current){
  if(current==='dashboard')return'dashboard';
  if(current==='map')return'map';
  if(current==='planner'||current==='route')return'planner';
  if(current==='ais')return'ais';
  if(current==='weather')return'weather';
  return'more';
}

function syncVisibility(){
  syncBuild();
  const current=route();
  const nav=document.getElementById(NAV_ID);if(!nav)return;
  const onDashboard=current==='dashboard';
  nav.hidden=onDashboard;
  document.body.classList.toggle('ms8286-global-nav-active',!onDashboard);
  const active=activeGroup(current);
  nav.querySelectorAll('[data-ms8286-go]').forEach(button=>button.classList.toggle('active',button.dataset.ms8286Go===active));
  if(onDashboard)closeMore();
}

window.ms8286ApplyGlobalDashboardNav=()=>{mount();syncVisibility()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.addEventListener('hashchange',()=>setTimeout(syncVisibility,0),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(()=>{mount();syncVisibility()},20),{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(syncVisibility,0),{passive:true});
document.addEventListener('click',()=>setTimeout(syncVisibility,40),true);
})();
