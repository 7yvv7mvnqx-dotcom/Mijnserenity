/* MijnSerenity 8.28.4 — dagmodus voor volledig dashboard en alle vervolgpagina's. */
(()=>{
'use strict';
if(window.__msGlobalDayTheme8284)return;
window.__msGlobalDayTheme8284=true;

const ROOT='ms8210Start';
const STYLE='ms8284GlobalDayThemeStyle';
const STORAGE_KEY='mijnserenity-start-theme-v1';
const BUILD='8.28.4';
let rootObserver=null;

function syncBuild(){
  try{window.APP_BUILD=BUILD;window.MIJSERENITY_BUILD=BUILD}catch(_){}
  document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
  document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
  const stamp=document.getElementById('buildStamp');if(stamp)stamp.textContent='v'+BUILD;
  const version=document.getElementById('settingsAppVersion');if(version)version.textContent=BUILD;
  document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
}

function installStyle(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=`
body.ms8284-day{
  --bg:#eaf7fb!important;
  --dark:#d8edf4!important;
  --panel:#ffffff!important;
  --panel2:#dceff6!important;
  --text:#08293c!important;
  --muted:#607b89!important;
  --accent:#20c9ea!important;
  background:linear-gradient(180deg,#dceff6,#f7fbfd)!important;
  color:#08293c!important;
}
body.ms8284-day #appView{background:#eef8fb!important;color:#08293c!important}
body.ms8284-day #appView>.tabs{background:rgba(244,251,253,.96)!important;border-bottom:1px solid rgba(45,146,185,.20)!important}
body.ms8284-day #appView>.tabs .tab{background:#dceff6!important;color:#0b354a!important;border:1px solid rgba(45,146,185,.20)!important}
body.ms8284-day #appView>.tabs .tab.active{background:#20c9ea!important;color:#052f42!important}
body.ms8284-day #appView>section:not(#dashboard){background:linear-gradient(180deg,#eef8fb,#f9fcfd)!important;color:#08293c!important}
body.ms8284-day #appView>section:not(#dashboard) .card,
body.ms8284-day #appView>section:not(#dashboard) .collapsible-card,
body.ms8284-day #appView>section:not(#dashboard) .coordinate-card,
body.ms8284-day #appView>section:not(#dashboard) .trip-row{
  background:rgba(255,255,255,.96)!important;
  border-color:rgba(45,146,185,.22)!important;
  color:#08293c!important;
  box-shadow:0 10px 26px rgba(31,86,109,.07)!important;
}
body.ms8284-day #appView>section:not(#dashboard) h1,
body.ms8284-day #appView>section:not(#dashboard) h2,
body.ms8284-day #appView>section:not(#dashboard) h3,
body.ms8284-day #appView>section:not(#dashboard) h4,
body.ms8284-day #appView>section:not(#dashboard) strong,
body.ms8284-day #appView>section:not(#dashboard) .value{color:#08293c!important}
body.ms8284-day #appView>section:not(#dashboard) p,
body.ms8284-day #appView>section:not(#dashboard) .small,
body.ms8284-day #appView>section:not(#dashboard) .sub,
body.ms8284-day #appView>section:not(#dashboard) label,
body.ms8284-day #appView>section:not(#dashboard) .label{color:#607b89!important}
body.ms8284-day #appView>section:not(#dashboard) .eyebrow{color:#0a91af!important}
body.ms8284-day #appView>section:not(#dashboard) input,
body.ms8284-day #appView>section:not(#dashboard) textarea,
body.ms8284-day #appView>section:not(#dashboard) select{
  background:#fff!important;
  color:#08293c!important;
  border-color:rgba(45,146,185,.28)!important;
}
body.ms8284-day #appView>section:not(#dashboard) input::placeholder,
body.ms8284-day #appView>section:not(#dashboard) textarea::placeholder{color:#78909b!important}
body.ms8284-day #appView>section:not(#dashboard) .secondary,
body.ms8284-day #appView>section:not(#dashboard) .edit-button,
body.ms8284-day #appView>section:not(#dashboard) .section-toggle{
  background:#dceff6!important;
  color:#0a3449!important;
  border-color:rgba(45,146,185,.24)!important;
}
body.ms8284-day #appView>section:not(#dashboard) .stat,
body.ms8284-day #appView>section:not(#dashboard) .status,
body.ms8284-day #appView>section:not(#dashboard) .pill,
body.ms8284-day #appView>section:not(#dashboard) .trip-summary span{
  background:rgba(28,146,183,.08)!important;
  color:#31586a!important;
}
body.ms8284-day .bottom-nav{background:rgba(244,251,253,.97)!important;border-top-color:rgba(45,146,185,.20)!important}
body.ms8284-day .bottom-nav-item{color:#597685!important}
body.ms8284-day .bottom-nav-item.active{color:#067f9d!important;background:rgba(32,201,234,.12)!important}

/* Startnavigatie in dagmodus */
#${ROOT}[data-theme="day"] .ms8263-nav{background:rgba(245,251,253,.94)!important;border-color:rgba(45,146,185,.24)!important;box-shadow:0 -8px 24px rgba(31,86,109,.06)!important}
#${ROOT}[data-theme="day"] .ms8263-nav button{color:#234b5e!important}
#${ROOT}[data-theme="day"] .ms8263-nav button.active{color:#00a6c7!important}

/* Serenity AI volledig licht */
#${ROOT}[data-theme="day"] .msqa8267{background:linear-gradient(145deg,#ffffff,#e7f6fa)!important;border-color:rgba(45,146,185,.28)!important;color:#08293c!important;box-shadow:0 14px 32px rgba(31,86,109,.08)!important}
#${ROOT}[data-theme="day"] .msqa8267-label{color:#087f9a!important}
#${ROOT}[data-theme="day"] .msqa8267-result{background:#f9fcfd!important;color:#244d61!important;border-color:rgba(45,146,185,.24)!important}
#${ROOT}[data-theme="day"] .ms8271-tool,
#${ROOT}[data-theme="day"] .ms8271-speak{background:#eef8fb!important;color:#173f52!important;border-color:rgba(45,146,185,.24)!important}
#${ROOT}[data-theme="day"] .ms8271-tool.listening,
#${ROOT}[data-theme="day"] .ms8271-tool.wake{background:#d7f2f8!important;color:#075e75!important}
#${ROOT}[data-theme="day"] .ms8271-ai-note,
#${ROOT}[data-theme="day"] .ms8271-voice-status{color:#668391!important}

/* Live aan boord volledig licht */
#${ROOT}[data-theme="day"] .ms8264-instruments{background:linear-gradient(145deg,#ffffff,#e7f6fa)!important;border-color:rgba(45,146,185,.28)!important;color:#08293c!important;box-shadow:0 14px 32px rgba(31,86,109,.08)!important}
#${ROOT}[data-theme="day"] .ms8264-head strong{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8264-head small{color:#087f9a!important}
#${ROOT}[data-theme="day"] .ms8264-meter{background:linear-gradient(145deg,#ffffff,#eaf7fb)!important;border-color:rgba(45,146,185,.24)!important;color:#08293c!important;box-shadow:inset 0 1px rgba(255,255,255,.96),0 7px 18px rgba(31,86,109,.05)!important}
#${ROOT}[data-theme="day"] .ms8264-copy small{color:#5f7c8a!important}
#${ROOT}[data-theme="day"] .ms8264-copy strong{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8264-copy em{color:#668391!important}
#${ROOT}[data-theme="day"] .ms8264-icon{background:rgba(0,172,207,.10)!important}
#${ROOT}[data-theme="day"] .ms8264-bar{background:rgba(45,146,185,.12)!important}
#${ROOT}[data-theme="day"] .ms8264-badge{background:rgba(57,217,138,.10)!important;color:#176c50!important;border-color:rgba(57,180,120,.28)!important}
#${ROOT}[data-theme="day"] .ms8264-badge.stale{background:rgba(247,190,79,.12)!important;color:#7a5916!important;border-color:rgba(190,136,33,.28)!important}

/* Ook de overige tegels van Start licht */
#${ROOT}[data-theme="day"] .ms8263-feature{background:linear-gradient(145deg,#ffffff,#e8f6fa)!important;border-color:rgba(45,146,185,.24)!important;color:#08293c!important;box-shadow:0 10px 24px rgba(31,86,109,.06)!important}
#${ROOT}[data-theme="day"] .ms8263-feature .copy strong{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-feature .copy small{color:#607b89!important}
#${ROOT}[data-theme="day"] .ms8263-feature>svg,#${ROOT}[data-theme="day"] .ms8263-feature .chev{color:#14738b!important}

/* Kaarten en camerabeelden zelf blijven functioneel/ongemoeid */
body.ms8284-day .leaflet-container{color:#102a3d!important}
body.ms8284-day .lightbox{color:#fff!important}
`;
  document.head.appendChild(s);
}

function storedTheme(){
  try{const v=localStorage.getItem(STORAGE_KEY);return v==='day'||v==='night'?v:null}catch(_){return null}
}

function themeNow(){
  const stored=storedTheme();if(stored)return stored;
  const root=document.getElementById(ROOT);return root?.dataset?.theme==='day'?'day':'night';
}

function syncGlobalTheme(){
  syncBuild();installStyle();
  const theme=themeNow();
  const day=theme==='day';
  document.body?.classList.toggle('ms8284-day',day);
  document.body?.classList.toggle('ms8284-night',!day);
  const app=document.getElementById('appView');if(app)app.dataset.msTheme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',day?'#eaf7fb':'#061525');
}

function watchRoot(){
  const root=document.getElementById(ROOT);if(!root||root.dataset.ms8284Observed==='1')return;
  root.dataset.ms8284Observed='1';
  rootObserver?.disconnect();
  rootObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-theme'))setTimeout(syncGlobalTheme,0);
  });
  rootObserver.observe(root,{attributes:true,attributeFilter:['data-theme']});
}

function activate(){syncGlobalTheme();watchRoot()}
window.ms8284ApplyGlobalDayTheme=activate;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});else activate();
[80,220,650,1200,2200].forEach(ms=>setTimeout(activate,ms));
document.addEventListener('click',event=>{if(event.target.closest?.('#ms8263Theme'))setTimeout(activate,20)},true);
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(activate,0),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(activate,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(activate,20),{passive:true});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)setTimeout(activate,0)},{passive:true});
})();
