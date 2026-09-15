/* MijnSerenity 8.28.3 — behoud donker Live aan boord-paneel met leesbare titel in dagmodus. */
(()=>{
'use strict';
if(window.__msDashboardDayTitleFix8283)return;
window.__msDashboardDayTitleFix8283=true;

const ROOT='ms8210Start';
const STYLE='ms8283DashboardDayTitleStyle';

function install(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=`
#${ROOT}[data-theme="day"] .ms8264-instruments{color:#fff!important}
#${ROOT}[data-theme="day"] .ms8264-head strong{color:#f5fbff!important}
#${ROOT}[data-theme="day"] .ms8264-head small{color:#27dcfa!important}
`;
  document.head.appendChild(s);
}

window.ms8283ApplyDayTitleFix=install;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('mijnserenity:dashboard-ready',install,{passive:true});
window.addEventListener('pageshow',install,{passive:true});
})();
