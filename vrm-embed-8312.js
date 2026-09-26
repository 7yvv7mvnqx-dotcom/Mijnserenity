/* MijnSerenity 8.31.3 - echte Victron VRM embed direct in Home-dashboard. */
(()=>{
'use strict';
if(window.__msVrmEmbed8313)return;
window.__msVrmEmbed8313=true;

const ROOT='ms8210Start';
const PANEL='ms8313VrmInline';
const STYLE='ms8313VrmInlineStyle';
const SRC='https://vrm.victronenergy.com/installation/1003203/embed/57c91764';
const $=id=>document.getElementById(id);

function installStyle(){
  if($(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=
  '#'+ROOT+'.ms8313-vrm-home .ms8263-main{grid-template-rows:clamp(142px,19vh,178px) minmax(0,1fr)!important;gap:.75vh!important;overflow:hidden!important}'+
  '#'+ROOT+'.ms8313-vrm-home .ms8263-main>.msr-row{display:none!important}'+
  '#'+ROOT+' #'+PANEL+'{min-height:0;height:100%;overflow:hidden;border:1px solid rgba(26,128,165,.70);border-radius:17px;background:#fff;box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 22px rgba(0,0,0,.10)}'+
  '#'+ROOT+' #'+PANEL+' iframe{display:block;width:100%;height:100%;min-height:0;border:0;background:#fff}'+
  '@media(max-height:760px) and (orientation:landscape){#'+ROOT+'.ms8313-vrm-home .ms8263-main{grid-template-rows:108px minmax(0,1fr)!important;gap:6px!important}}'+
  '@media(max-width:900px) and (orientation:portrait){#'+ROOT+'.ms8313-vrm-home .ms8263-main{display:block!important;overflow:visible!important}#'+ROOT+' #'+PANEL+'{height:800px;min-height:800px;margin-bottom:10px}}'+
  '@media(max-width:600px){#'+ROOT+' #'+PANEL+'{height:800px;min-height:800px;border-radius:14px}}'+
  '@media(max-width:950px) and (orientation:landscape) and (max-height:520px){#'+ROOT+'.ms8313-vrm-home .ms8263-main{display:block!important;overflow:visible!important}#'+ROOT+' #'+PANEL+'{height:620px;min-height:620px;margin-bottom:8px}}';
  document.head.appendChild(s);
}

function mount(){
  const root=$(ROOT);
  if(!root)return false;
  const main=root.querySelector('.ms8263-main');
  const quick=root.querySelector('.msr-quick');
  if(!main||!quick)return false;

  installStyle();
  root.classList.add('ms8313-vrm-home');

  let panel=$(PANEL);
  if(!panel){
    panel=document.createElement('section');
    panel.id=PANEL;
    panel.setAttribute('aria-label','Victron VRM live');
    panel.innerHTML='<iframe width="100%" height="800" title="Victron VRM Serenity" src="'+SRC+'" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe>';
    quick.insertAdjacentElement('afterend',panel);
  }else if(panel.previousElementSibling!==quick){
    quick.insertAdjacentElement('afterend',panel);
  }
  return true;
}

function start(){
  if(!mount())setTimeout(start,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(mount,40),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(mount,40),{passive:true});
window.addEventListener('hashchange',()=>setTimeout(mount,40),{passive:true});
new MutationObserver(()=>{if(location.hash===''||location.hash==='#dashboard')mount()}).observe(document.documentElement,{childList:true,subtree:true});
})();