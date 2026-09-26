/* MijnSerenity 8.31.4 - Victron VRM fallback; voorkomt dubbele panelen. */
(()=>{
'use strict';
if(window.__msVrmEmbed8314)return;
window.__msVrmEmbed8314=true;
window.__msVrmEmbed8313=true;
const ROOT='ms8210Start';
const STYLE='ms8314VrmFallbackStyle';
const SRC='https://vrm.victronenergy.com/installation/1003203/embed/57c91764';
const $=id=>document.getElementById(id);
function style(){
  if($(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent='#'+ROOT+' .ms8263-main{grid-template-rows:clamp(142px,19vh,178px) minmax(0,1fr)!important;gap:.75vh!important;overflow:hidden!important}'+
    '#'+ROOT+' .ms8263-main>.msr-row{display:none!important}'+
    '#'+ROOT+' .msr-vrm-live{min-height:0;height:100%;overflow:hidden;border:1px solid rgba(26,128,165,.70);border-radius:17px;background:#fff}'+
    '#'+ROOT+' .msr-vrm-live iframe{display:block;width:100%!important;height:100%!important;min-height:0;border:0;background:#fff}'+
    '@media(max-width:900px) and (orientation:portrait){#'+ROOT+' .ms8263-main{display:block!important;overflow:visible!important}#'+ROOT+' .msr-vrm-live{height:800px;min-height:800px;margin-bottom:10px}}';
  document.head.appendChild(s);
}
function mount(){
  const root=$(ROOT); if(!root)return false;
  const main=root.querySelector('.ms8263-main');
  const quick=root.querySelector('.msr-quick');
  if(!main||!quick)return false;
  style();
  let panel=main.querySelector('.msr-vrm-live');
  if(!panel){
    panel=document.createElement('section');
    panel.className='msr-vrm-live';
    panel.id='ms8314VrmInline';
    panel.setAttribute('aria-label','Victron VRM live');
    panel.innerHTML='<iframe width="100%" height="800" title="Victron VRM Serenity" src="'+SRC+'" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe>';
    quick.insertAdjacentElement('afterend',panel);
  } else if(panel.previousElementSibling!==quick){
    quick.insertAdjacentElement('afterend',panel);
  }
  return true;
}
function start(){if(!mount())setTimeout(start,160)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(mount,30),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(mount,30),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(mount,30),{passive:true});
new MutationObserver(()=>{const h=location.hash||'#dashboard';if(h==='#dashboard')mount()}).observe(document.documentElement,{childList:true,subtree:true});
})();
