/* MijnSerenity 7.15.62 — zichtbare Waterkaarten-knop + dynamisch versienummer */
(()=>{
  'use strict';
  if(window.__msWaterkaartenDashboard71562)return;
  window.__msWaterkaartenDashboard71562=true;

  const BUILD='7.15.62';
  const STYLE_ID='msWaterkaartenDashboard71562Style';
  const BUTTON_ID='msnWaterkaarten';

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
.msn-head-tools{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;min-width:0}
#${BUTTON_ID}{min-height:38px;padding:0 13px;border:1px solid rgba(74,190,238,.55);border-radius:11px;background:linear-gradient(180deg,rgba(20,126,178,.96),rgba(8,72,110,.98));box-shadow:0 7px 20px rgba(0,0,0,.18);color:#fff;font:inherit;font-size:11px;font-weight:850;letter-spacing:.03em;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;-webkit-tap-highlight-color:transparent;cursor:pointer}
#${BUTTON_ID}:active{transform:scale(.98)}
#${BUTTON_ID} span{font-size:16px;line-height:1}
@media(max-width:760px){.msn-head{align-items:flex-start!important;flex-wrap:wrap}.msn-head-tools{width:100%;justify-content:space-between}.msn-head-tools .msn-legend{margin-left:auto}#${BUTTON_ID}{min-height:42px;padding:0 14px}}
`;
    document.head.appendChild(style);
  }

  function openWaterkaarten(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if(typeof window.ms738LaunchWaterkaarten==='function'){
      return window.ms738LaunchWaterkaarten();
    }
    if(typeof window.openWaterkaarten==='function'){
      return window.openWaterkaarten();
    }
    const win=window.open('https://mijn.waterkaarten.app/','_blank','noopener,noreferrer');
    if(!win)window.location.assign('https://mijn.waterkaarten.app/');
    return false;
  }

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const cockpitBadge=document.querySelector('#msProDashboard .msc-brand>b');
    if(cockpitBadge&&cockpitBadge.textContent!==BUILD)cockpitBadge.textContent=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
  }

  function ensureButton(){
    installStyle();
    syncVersion();
    const head=document.querySelector('#msCaptainNavPanel .msn-head');
    if(!head)return;

    let tools=head.querySelector('.msn-head-tools');
    const legend=head.querySelector('.msn-legend');
    if(!tools){
      tools=document.createElement('div');
      tools.className='msn-head-tools';
      if(legend){
        head.insertBefore(tools,legend);
        tools.appendChild(legend);
      }else{
        head.appendChild(tools);
      }
    }else if(legend&&legend.parentElement!==tools){
      tools.appendChild(legend);
    }

    let button=document.getElementById(BUTTON_ID);
    if(!button){
      button=document.createElement('button');
      button.id=BUTTON_ID;
      button.type='button';
      button.setAttribute('aria-label','Open Waterkaarten in MijnSerenity');
      button.innerHTML='<span aria-hidden="true">🗺️</span><b>Waterkaarten</b>';
      button.addEventListener('click',openWaterkaarten);
      tools.insertBefore(button,tools.firstChild);
    }
  }

  function start(){
    ensureButton();
    const observer=new MutationObserver(()=>requestAnimationFrame(ensureButton));
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('mijnserenity:routechange',ensureButton,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureButton()},{passive:true});
    setInterval(()=>{if(!document.hidden)ensureButton()},1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
