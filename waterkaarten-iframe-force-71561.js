/* MijnSerenity 7.15.61 — forceer Waterkaarten iframe, onafhankelijk van oude PWA-cache */
(()=>{
  'use strict';
  if(window.__msWaterkaartenForce71561)return;
  window.__msWaterkaartenForce71561=true;

  const URL='https://mijn.waterkaarten.app/';
  const OVERLAY='mswk71561Overlay';
  const FRAME='mswk71561Frame';
  const STYLE='mswk71561Style';

  function installStyle(){
    if(document.getElementById(STYLE))return;
    const style=document.createElement('style');
    style.id=STYLE;
    style.textContent=`
html.mswk71561-open,body.mswk71561-open{overflow:hidden!important;overscroll-behavior:none!important}
#${OVERLAY}{position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;background:#061525;color:#fff}
#${OVERLAY}.hidden{display:none!important}
#${OVERLAY} .mswk71561-toolbar{flex:0 0 auto;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) 8px max(8px,env(safe-area-inset-left));background:#071a2c;border-bottom:1px solid rgba(255,255,255,.12);box-shadow:0 5px 18px rgba(0,0,0,.28)}
#${OVERLAY} .mswk71561-toolbar button{min-height:42px;border:1px solid rgba(120,205,255,.28);border-radius:12px;background:rgba(255,255,255,.07);color:#fff;font:inherit;font-weight:750;padding:0 12px}
#${OVERLAY} .mswk71561-back{display:flex;align-items:center;gap:5px}
#${OVERLAY} .mswk71561-back span{font-size:28px;line-height:1}
#${OVERLAY} .mswk71561-title{text-align:center;min-width:0}
#${OVERLAY} .mswk71561-title strong,#${OVERLAY} .mswk71561-title small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${OVERLAY} .mswk71561-title small{font-size:10px;color:#a9bccb;margin-top:2px}
#${OVERLAY} .mswk71561-stage{position:relative;flex:1 1 auto;min-height:0;background:#fff;overflow:hidden}
#${OVERLAY} iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
#${OVERLAY} .mswk71561-loading{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;color:#163247;background:#f5f8fa;text-align:center}
#${OVERLAY} .mswk71561-loading.hidden{display:none!important}
#${OVERLAY} .mswk71561-spin{width:34px;height:34px;border:3px solid rgba(16,86,126,.18);border-top-color:#0b78b2;border-radius:50%;animation:mswk71561spin .8s linear infinite}
@keyframes mswk71561spin{to{transform:rotate(360deg)}}
#${OVERLAY} .mswk71561-hint{position:absolute;z-index:3;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));max-width:720px;margin:auto;padding:11px 40px 11px 13px;border:1px solid rgba(65,178,234,.4);border-radius:15px;background:rgba(4,22,43,.94);box-shadow:0 12px 36px rgba(0,0,0,.35);color:#eef7fc;font-size:.84rem;line-height:1.35}
#${OVERLAY} .mswk71561-hint.hidden{display:none!important}
#${OVERLAY} .mswk71561-hint button{position:absolute;right:7px;top:6px;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:19px}
@media(max-width:640px){#${OVERLAY} .mswk71561-toolbar{gap:5px;padding-left:max(5px,env(safe-area-inset-left));padding-right:max(5px,env(safe-area-inset-right))}#${OVERLAY} .mswk71561-toolbar button{min-height:40px;padding:0 9px}#${OVERLAY} .mswk71561-title strong{font-size:13px}#${OVERLAY} .mswk71561-title small{display:none}#${OVERLAY} .mswk71561-external b{display:none}}
`;
    document.head.appendChild(style);
  }

  function removeLegacyUi(){
    ['ms738WaterkaartenModal','ms738WaterkaartenBanner'].forEach(id=>document.getElementById(id)?.remove());
  }

  function ensureUi(){
    installStyle();
    if(document.getElementById(OVERLAY))return;
    removeLegacyUi();
    const el=document.createElement('div');
    el.id=OVERLAY;
    el.className='hidden';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','Waterkaarten in MijnSerenity');
    el.innerHTML=`
      <div class="mswk71561-toolbar">
        <button type="button" class="mswk71561-back" aria-label="Terug naar MijnSerenity"><span>‹</span><b>MijnSerenity</b></button>
        <div class="mswk71561-title"><strong>🗺️ Waterkaarten</strong><small>binnen MijnSerenity</small></div>
        <button type="button" class="mswk71561-external" aria-label="Waterkaarten apart openen"><span>↗</span> <b>Open apart</b></button>
      </div>
      <div class="mswk71561-stage">
        <div class="mswk71561-loading"><div class="mswk71561-spin"></div><strong>Waterkaarten laden…</strong><small>Je blijft in MijnSerenity.</small></div>
        <iframe id="${FRAME}" title="Waterkaarten" allow="geolocation; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        <div class="mswk71561-hint">Waterkaarten wordt nu rechtstreeks in MijnSerenity geopend. Als Waterkaarten zelf insluiten blokkeert, gebruik dan rechtsboven <b>Open apart</b>.<button type="button" aria-label="Melding sluiten">×</button></div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.mswk71561-back')?.addEventListener('click',closeEmbedded);
    el.querySelector('.mswk71561-external')?.addEventListener('click',openExternal);
    el.querySelector('.mswk71561-hint button')?.addEventListener('click',()=>el.querySelector('.mswk71561-hint')?.classList.add('hidden'));
    document.getElementById(FRAME)?.addEventListener('load',()=>el.querySelector('.mswk71561-loading')?.classList.add('hidden'));
  }

  function openEmbedded(){
    ensureUi();
    removeLegacyUi();
    const el=document.getElementById(OVERLAY);
    const frame=document.getElementById(FRAME);
    if(frame&&!frame.getAttribute('src'))frame.setAttribute('src',URL);
    el?.classList.remove('hidden');
    document.documentElement.classList.add('mswk71561-open');
    document.body.classList.add('mswk71561-open');
    return false;
  }

  function closeEmbedded(){
    document.getElementById(OVERLAY)?.classList.add('hidden');
    document.documentElement.classList.remove('mswk71561-open');
    document.body.classList.remove('mswk71561-open');
  }

  function openExternal(){
    const win=window.open(URL,'_blank','noopener,noreferrer');
    if(!win)window.location.assign(URL);
  }

  function forcePatch(){
    const wrapped=function(){return openEmbedded();};
    wrapped.__ms759RightPatched=true;
    wrapped.__msWaterkaartenIframePatched=true;
    wrapped.__msWaterkaartenForce71561=true;
    window.openWaterkaarten=wrapped;
    window.ms738ShowWaterkaartenPrompt=openEmbedded;
    window.ms738LaunchWaterkaarten=openEmbedded;
    window.ms738CloseWaterkaartenPrompt=closeEmbedded;
    window.ms759ConfirmWaterkaartenRight=()=>false;
    window.ms759ResetWaterkaartenRight=()=>false;
    window.msWaterkaartenOpenExternal=openExternal;
  }

  function start(){
    try{localStorage.setItem('mijnserenity-waterkaarten-right-window-ready','1')}catch{}
    ensureUi();
    forcePatch();
    setInterval(forcePatch,500);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeEmbedded()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
