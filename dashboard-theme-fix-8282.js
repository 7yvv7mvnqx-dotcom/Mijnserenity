/* MijnSerenity 8.28.2 — stabiele Dag/Nacht-schakelaar voor Start. */
(()=>{
'use strict';
if(window.__msDashboardThemeFix8282)return;
window.__msDashboardThemeFix8282=true;

const ROOT='ms8210Start';
const STYLE='ms8282DashboardThemeStyle';
const STORAGE_KEY='mijnserenity-start-theme-v1';
const BUILD='8.28.2';
const DAY='day';
const NIGHT='night';
const SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.7 8.7 0 1 0 11.2 11.2Z"/></svg>';

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
  const s=document.createElement('style');s.id=STYLE;
  s.textContent=`
#${ROOT}{transition:background .22s ease,color .22s ease}
#${ROOT} .ms8263-shell,#${ROOT} .ms8263-main,#${ROOT} .ms8263-status-card,#${ROOT} .ms8263-welcome,#${ROOT} .ms8263-live,#${ROOT} .ms8263-theme{transition:background .22s ease,border-color .22s ease,color .22s ease,box-shadow .22s ease,filter .22s ease}
#${ROOT}[data-theme="day"]{background:#dff2f8!important;color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-shell{background:linear-gradient(180deg,#d9eff7 0%,#eef8fb 55%,#f7fbfd 100%)!important;box-shadow:0 0 70px rgba(26,77,99,.13)!important}
#${ROOT}[data-theme="day"] .ms8263-main{background:linear-gradient(180deg,rgba(234,248,253,.985),#f8fcfd 94%)!important;filter:none!important;color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-greet b{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-date{color:#557486!important}
#${ROOT}[data-theme="day"] .ms8263-theme{background:rgba(255,255,255,.92)!important;border-color:rgba(43,144,183,.35)!important;color:#082f45!important;box-shadow:0 8px 20px rgba(25,83,108,.08),inset 0 1px rgba(255,255,255,.9)!important}
#${ROOT}[data-theme="day"] .ms8263-theme svg{color:#00aaca!important;stroke:#00aaca!important;fill:none!important}
#${ROOT}[data-theme="day"] .ms8263-status-card{background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(225,244,251,.96))!important;border-color:rgba(45,146,185,.27)!important;color:#08293c!important;box-shadow:0 10px 26px rgba(31,86,109,.08),inset 0 1px rgba(255,255,255,.96)!important}
#${ROOT}[data-theme="day"] .ms8263-status-card>svg{color:#17607b!important}
#${ROOT}[data-theme="day"] .ms8263-status-card>small{color:#567789!important}
#${ROOT}[data-theme="day"] .ms8263-status-card>strong{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-status-card>em{color:#698796!important}
#${ROOT}[data-theme="day"] .ms8263-welcome{background:radial-gradient(circle at 88% 23%,rgba(28,180,218,.12),transparent 34%),linear-gradient(145deg,#fff,#e8f7fb)!important;border-color:rgba(45,154,192,.28)!important;box-shadow:0 16px 38px rgba(28,82,103,.09)!important}
#${ROOT}[data-theme="day"] .ms8263-welcome:before{border-color:rgba(23,141,179,.12)!important;box-shadow:inset 0 0 0 18px rgba(23,141,179,.025),inset 0 0 0 41px rgba(23,141,179,.025)!important}
#${ROOT}[data-theme="day"] .ms8263-welcome:after{color:rgba(16,138,178,.08)!important}
#${ROOT}[data-theme="day"] .ms8263-kicker{color:#078eae!important}
#${ROOT}[data-theme="day"] .ms8263-welcome h2{color:#062b42!important}
#${ROOT}[data-theme="day"] .ms8263-welcome p{color:#375a6c!important}
#${ROOT}[data-theme="day"] .ms8263-live{background:rgba(255,255,255,.74)!important;border-color:rgba(45,146,185,.24)!important}
#${ROOT}[data-theme="day"] .ms8263-metric strong{color:#08293c!important}
#${ROOT}[data-theme="day"] .ms8263-metric small{color:#648290!important}
#${ROOT}[data-theme="day"] .ms8263-metric svg{color:#17607b!important}
#${ROOT}[data-theme="day"] .ms8263-metric+.ms8263-metric{border-left-color:rgba(51,123,151,.16)!important}
#${ROOT}[data-theme="day"] .msqa8267-label{color:#0c728b!important}
#${ROOT}[data-theme="day"] .msqa8270-badge{background:rgba(0,166,199,.09)!important;border-color:rgba(0,147,180,.20)!important;color:#0c7188!important}
#${ROOT}[data-theme="day"] .msqa8267-row{background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(225,244,250,.97))!important;border-color:rgba(45,146,185,.30)!important;box-shadow:0 10px 24px rgba(31,86,109,.07),inset 0 1px rgba(255,255,255,.96)!important}
#${ROOT}[data-theme="day"] .msqa8267-spark{background:rgba(0,174,207,.10)!important;color:#008eac!important}
#${ROOT}[data-theme="day"] .msqa8267 input{color:#08293c!important}
#${ROOT}[data-theme="day"] .msqa8267 input::placeholder{color:#698592!important}
#${ROOT}[data-theme="day"] .msqa8267-examples{color:#698592!important}
#${ROOT}[data-theme="day"] .msqa8267-result{background:rgba(255,255,255,.90)!important;border-color:rgba(45,146,185,.25)!important;color:#244d61!important}
@media(prefers-reduced-motion:reduce){#${ROOT},#${ROOT} .ms8263-shell,#${ROOT} .ms8263-main,#${ROOT} .ms8263-status-card,#${ROOT} .ms8263-welcome,#${ROOT} .ms8263-live,#${ROOT} .ms8263-theme{transition:none!important}}
`;
  document.head.appendChild(s);
}

function storedTheme(){try{const v=localStorage.getItem(STORAGE_KEY);return v===DAY||v===NIGHT?v:null}catch(_){return null}}
function saveTheme(theme){try{localStorage.setItem(STORAGE_KEY,theme)}catch(_){}}
function syncThemeColor(theme){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme===DAY?'#eaf8fc':'#061525')}

function syncButton(theme){
  const button=document.getElementById('ms8263Theme');if(!button)return false;
  const isDay=theme===DAY;
  button.innerHTML=`${isDay?SUN:MOON}<span id="ms8263ThemeLabel">${isDay?'Dag':'Nacht'}</span><span>⌄</span>`;
  button.setAttribute('aria-label',isDay?'Dagmodus actief. Tik voor nachtmodus.':'Nachtmodus actief. Tik voor dagmodus.');
  if(button.dataset.ms8282ThemeBound!=='1'){
    button.dataset.ms8282ThemeBound='1';
    button.addEventListener('click',()=>setTimeout(()=>{
      const root=document.getElementById(ROOT);if(!root)return;
      const next=root.dataset.theme===DAY?DAY:NIGHT;
      saveTheme(next);syncButton(next);syncThemeColor(next);
    },0));
  }
  return true;
}

function applyTheme(){
  installStyle();syncBuild();
  const root=document.getElementById(ROOT);if(!root)return false;
  const theme=storedTheme()||(root.dataset.theme===DAY?DAY:NIGHT);
  root.dataset.theme=theme;syncButton(theme);syncThemeColor(theme);
  return true;
}

function wrapRenderer(){
  const current=window.ms8263ApplyApprovedDashboard;
  if(typeof current!=='function')return false;
  if(current.__ms8282ThemeWrapped)return true;
  const wrapped=function(...args){const result=current.apply(this,args);setTimeout(applyTheme,0);return result};
  wrapped.__ms8282ThemeWrapped=true;wrapped.__ms8282Original=current;
  window.ms8263ApplyApprovedDashboard=wrapped;
  if(window.ms8260ApplyApprovedDashboard===current)window.ms8260ApplyApprovedDashboard=wrapped;
  return true;
}

function activate(){syncBuild();installStyle();wrapRenderer();applyTheme()}
window.ms8282ApplyTheme=activate;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});else activate();
[80,220,620,1100,1700,2600].forEach(ms=>setTimeout(activate,ms));
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(activate,0),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(activate,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(activate,20),{passive:true});
})();
