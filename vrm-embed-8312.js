/* MijnSerenity 8.31.2 - officiele Victron VRM embed als veilige dashboard-overlay. */
(()=>{
'use strict';
if(window.__msVrmEmbed8312)return;
window.__msVrmEmbed8312=true;

const ROOT='ms8210Start';
const MODAL='ms8312VrmModal';
const STYLE='ms8312VrmStyle';
const SRC='https://vrm.victronenergy.com/installation/1003203/embed/57c91764';
const $=id=>document.getElementById(id);

function installStyle(){
  if($(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=
  '#'+MODAL+'{position:fixed;inset:0;z-index:2147483000;display:none;align-items:stretch;justify-content:stretch;padding:18px;background:rgba(1,13,22,.78);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px)}'+
  '#'+MODAL+'.open{display:flex}'+
  '#'+MODAL+' .ms8312-shell{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr);width:100%;height:100%;overflow:hidden;border:1px solid rgba(42,190,236,.72);border-radius:20px;background:#031b2a;box-shadow:0 24px 80px rgba(0,0,0,.48)}'+
  '#'+MODAL+' .ms8312-head{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:58px;padding:9px 12px 9px 17px;border-bottom:1px solid rgba(42,190,236,.35);background:linear-gradient(90deg,#05293d,#062033);color:#fff}'+
  '#'+MODAL+' .ms8312-title{display:flex;align-items:center;gap:11px;min-width:0}'+
  '#'+MODAL+' .ms8312-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:linear-gradient(145deg,#138fe1,#075f9f);font-size:19px}'+
  '#'+MODAL+' .ms8312-title strong{display:block;font-size:16px;line-height:1.05}'+
  '#'+MODAL+' .ms8312-title small{display:block;margin-top:3px;color:#9ec0cf;font-size:10px}'+
  '#'+MODAL+' .ms8312-actions{display:flex;align-items:center;gap:8px}'+
  '#'+MODAL+' .ms8312-actions a,#'+MODAL+' .ms8312-actions button{min-height:38px;padding:0 13px;border:1px solid rgba(93,204,240,.38);border-radius:10px;background:#0b5577;color:#fff;text-decoration:none;font:700 11px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}'+
  '#'+MODAL+' .ms8312-actions button{width:40px;padding:0;font-size:22px;background:#14384c}'+
  '#'+MODAL+' .ms8312-frame{position:relative;min-height:0;background:#fff}'+
  '#'+MODAL+' iframe{display:block;width:100%;height:100%;min-height:0;border:0;background:#fff}'+
  '#'+ROOT+' .msr-energy-card .msr-action[data-ms8263-go="technical"]{font-size:0}'+
  '#'+ROOT+' .msr-energy-card .msr-action[data-ms8263-go="technical"]:before{content:"Open VRM live";font-size:11px}'+
  '#'+ROOT+' .msr-energy-card .msr-action[data-ms8263-go="technical"] span{font-size:14px}'+
  '@media(max-width:700px){#'+MODAL+'{padding:0}#'+MODAL+' .ms8312-shell{border-radius:0;border-left:0;border-right:0}#'+MODAL+' .ms8312-actions a{display:none}}';
  document.head.appendChild(s);
}

function ensureModal(){
  let m=$(MODAL);
  if(m)return m;
  m=document.createElement('div');
  m.id=MODAL;
  m.setAttribute('role','dialog');
  m.setAttribute('aria-modal','true');
  m.setAttribute('aria-label','Victron VRM live');
  m.innerHTML='<div class="ms8312-shell">'+
    '<header class="ms8312-head">'+
      '<div class="ms8312-title"><span class="ms8312-icon">V</span><span><strong>Victron VRM live</strong><small>Serenity - installatie 1003203</small></span></div>'+
      '<div class="ms8312-actions"><a href="'+SRC+'" target="_blank" rel="noopener">Open apart</a><button type="button" data-ms8312-close aria-label="Sluiten">x</button></div>'+
    '</header>'+
    '<div class="ms8312-frame"><iframe title="Victron VRM Serenity" src="'+SRC+'" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe></div>'+
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click',e=>{
    if(e.target===m||e.target.closest('[data-ms8312-close]'))close();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.classList.contains('open'))close()});
  return m;
}

function open(){
  installStyle();
  const m=ensureModal();
  m.classList.add('open');
}
function close(){
  const m=$(MODAL);
  if(m)m.classList.remove('open');
}

function bind(){
  installStyle();
  ensureModal();
  const root=$(ROOT);
  if(!root)return false;

  const energyFeature=[...root.querySelectorAll('.ms8263-feature')].find(b=>
    /energie/i.test(b.querySelector('.copy strong')?.textContent||'')
  );
  if(energyFeature&&!energyFeature.dataset.ms8312Bound){
    energyFeature.dataset.ms8312Bound='1';
    energyFeature.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    },true);
  }

  const energyCard=[...root.querySelectorAll('.msr-panel')].find(card=>
    /ACCU'S\s*&\s*ENERGIE/i.test(card.textContent||'')
  );
  if(energyCard){
    energyCard.classList.add('msr-energy-card');
    const btn=energyCard.querySelector('.msr-action');
    if(btn&&!btn.dataset.ms8312Bound){
      btn.dataset.ms8312Bound='1';
      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        open();
      },true);
    }
  }
  return true;
}

window.ms8312OpenVrm=open;
window.ms8312CloseVrm=close;

function start(){
  if(!bind())setTimeout(start,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(bind,40),{passive:true});
window.addEventListener('pageshow',()=>setTimeout(bind,40),{passive:true});
new MutationObserver(()=>{if(location.hash===''||location.hash==='#dashboard')bind()}).observe(document.documentElement,{childList:true,subtree:true});
})();