/* MijnSerenity 8.31.7 - desktop failsafe: nooit meer een leeg startscherm. */
(()=>{
'use strict';
if(window.__msDashboardRecovery8317)return;
window.__msDashboardRecovery8317=true;
const ROOT='ms8210Start';
function recover(){
  const root=document.getElementById(ROOT);
  const shell=root?.querySelector('.msr-shell');
  if(shell)return true;
  try{if(typeof window.ms8263ApplyApprovedDashboard==='function'&&window.ms8263ApplyApprovedDashboard())return true}catch(e){}
  document.body?.classList.remove('ms8263-home-active');
  if(root)root.style.setProperty('display','none','important');
  const dashboard=document.getElementById('dashboard');
  if(dashboard){
    dashboard.style.setProperty('display','block','important');
    dashboard.classList.remove('hidden');
    [...dashboard.children].forEach(el=>{
      el.style.removeProperty('display');
      delete el.dataset.ms8266Hidden;
    });
  }
  const app=document.getElementById('appView');
  if(app)app.style.removeProperty('display');
  return false;
}
function check(){
  if((location.hash||'#dashboard').startsWith('#dashboard'))recover();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,3500),{once:true});
else setTimeout(check,3500);
window.addEventListener('pageshow',()=>setTimeout(check,1800),{passive:true});
})();