/* MijnSerenity 8.28.5 — cascadefix voor volledige dagmodus op Start en vervolgpagina's. */
(()=>{
'use strict';
if(window.__msGlobalDayThemeFix8285)return;
window.__msGlobalDayThemeFix8285=true;

const ROOT='ms8210Start';
const STYLE='ms8285GlobalDayThemeFixStyle';
const STORAGE_KEY='mijnserenity-start-theme-v1';

function install(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=`
/* Oude donkere dashboardachtergrond mag in dagmodus nergens doorheen komen. */
html:has(body.ms8284-day),
body.ms8284-day,
body.ms8284-day.ms8263-home-active,
body.ms8284-day main,
body.ms8284-day #appView,
body.ms8284-day #dashboard.ms8255-reference-dashboard{
  background:#eef8fb!important;
  color:#08293c!important;
}

/* Het volledige Start-oppervlak blijft licht tot onderaan het scherm. */
body.ms8284-day #${ROOT}[data-theme="day"],
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-shell,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-main{
  background:linear-gradient(180deg,#eaf7fb 0%,#f8fcfd 100%)!important;
  color:#08293c!important;
}

/* 8.26.5 gaf Logboek en Energie later opnieuw een donkere eigen kleur. In dagmodus expliciet overrulen. */
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.ms8265-logbook,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.ms8265-energy,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.blue,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.purple,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.green,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature.gold{
  background:linear-gradient(145deg,#ffffff,#e8f6fa)!important;
  border-color:rgba(45,146,185,.24)!important;
  color:#08293c!important;
  box-shadow:0 10px 24px rgba(31,86,109,.06)!important;
}
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature .copy strong{color:#08293c!important}
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature .copy small{color:#607b89!important}
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature>svg,
body.ms8284-day #${ROOT}[data-theme="day"] .ms8263-features .ms8263-feature .chev{color:#14738b!important}

/* Live aan boord hoort in dagmodus eveneens licht te zijn. */
body.ms8284-day #${ROOT}[data-theme="day"] #ms8264LiveInstruments.ms8264-instruments{
  background:linear-gradient(145deg,#ffffff,#e7f6fa)!important;
  border-color:rgba(45,146,185,.28)!important;
  color:#08293c!important;
}
body.ms8284-day #${ROOT}[data-theme="day"] #ms8264LiveInstruments .ms8264-head strong,
body.ms8284-day #${ROOT}[data-theme="day"] #ms8264LiveInstruments .ms8264-copy strong{color:#08293c!important}
body.ms8284-day #${ROOT}[data-theme="day"] #ms8264LiveInstruments .ms8264-head small{color:#087f9a!important}
body.ms8284-day #${ROOT}[data-theme="day"] #ms8264LiveInstruments .ms8264-meter{
  background:linear-gradient(145deg,#ffffff,#eaf7fb)!important;
  color:#08293c!important;
  border-color:rgba(45,146,185,.24)!important;
}

/* Alle hoofd-pagina's krijgen in dagmodus een echt lichte ondergrond. */
body.ms8284-day #appView>#live,
body.ms8284-day #appView>#ais,
body.ms8284-day #appView>#weather,
body.ms8284-day #appView>#map,
body.ms8284-day #appView>#planner,
body.ms8284-day #appView>#entertainment,
body.ms8284-day #appView>#technical,
body.ms8284-day #appView>#pois,
body.ms8284-day #appView>#logbook,
body.ms8284-day #appView>#costs,
body.ms8284-day #appView>#finance,
body.ms8284-day #appView>#settings,
body.ms8284-day #appView>#boat{
  background:linear-gradient(180deg,#eef8fb,#f9fcfd)!important;
  color:#08293c!important;
}
`;
  document.head.appendChild(s);
}

function isDay(){
  try{if(localStorage.getItem(STORAGE_KEY)==='day')return true}catch(_){}
  return document.getElementById(ROOT)?.dataset?.theme==='day';
}
function apply(){
  install();
  const day=isDay();
  document.body?.classList.toggle('ms8284-day',!!day);
  document.body?.classList.toggle('ms8284-night',!day);
}

window.ms8285ApplyGlobalDayThemeFix=apply;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
[80,250,700,1400,2600].forEach(ms=>setTimeout(apply,ms));
document.addEventListener('click',e=>{if(e.target.closest?.('#ms8263Theme'))setTimeout(apply,30)},true);
window.addEventListener('pageshow',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(apply,20),{passive:true});
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(apply,20),{passive:true});
})();
