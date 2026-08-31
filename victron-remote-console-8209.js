/* MijnSerenity 8.20.9 — Victron Remote Console launcher.
   Biedt vanuit Techniek één duidelijke ingang naar de echte Cerbo GX Remote Console:
   lokaal via venus.local aan boord of op afstand via VRM. */
(()=>{
  'use strict';
  if(window.__msVictronRemoteConsole8209)return;
  window.__msVictronRemoteConsole8209=true;

  const BUILD='8.20.9';
  const INSTALLATION_ID='1003203';
  const LOCAL_URL='http://venus.local/';
  const VRM_URL=`https://vrm.victronenergy.com/installation/${INSTALLATION_ID}/dashboard`;
  const $=id=>document.getElementById(id);

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function ensureStyle(){
    if($('msVictronConsoleStyle8209'))return;
    const style=document.createElement('style');
    style.id='msVictronConsoleStyle8209';
    style.textContent=`
      #msVictronConsoleCard{margin:14px 0 18px;padding:0;border:1px solid rgba(66,170,255,.30);border-radius:20px;overflow:hidden;background:linear-gradient(145deg,#071b2c,#0b2539);box-shadow:0 12px 30px rgba(0,0,0,.20)}
      #msVictronConsoleCard .msvrc-head{display:flex;align-items:center;gap:13px;padding:16px 17px;border-bottom:1px solid rgba(255,255,255,.08)}
      #msVictronConsoleCard .msvrc-logo{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:#0d74bb;color:#fff;font-size:25px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
      #msVictronConsoleCard .msvrc-copy{min-width:0;flex:1}
      #msVictronConsoleCard .msvrc-copy small{display:block;color:#8fb5ce;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      #msVictronConsoleCard .msvrc-copy strong{display:block;margin-top:2px;color:#f5fbff;font-size:19px;line-height:1.15}
      #msVictronConsoleCard .msvrc-copy span{display:block;margin-top:4px;color:#b9d0df;font-size:12px;line-height:1.35}
      #msVictronConsoleCard .msvrc-open{margin:0;min-width:110px;min-height:44px;padding:0 14px;border:1px solid rgba(83,194,255,.45);border-radius:13px;background:#0b84cf;color:#fff;font-weight:900}
      #msVictronConsoleModal{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:flex-end;justify-content:center;padding:16px max(12px,env(safe-area-inset-right)) calc(76px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(0,8,15,.80);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
      #msVictronConsoleModal.hidden{display:none!important}
      #msVictronConsoleModal .msvrc-panel{width:min(720px,100%);max-height:min(82dvh,720px);overflow:auto;padding:18px;border:1px solid rgba(104,193,246,.28);border-radius:24px;background:#061a29;color:#edf8ff;box-shadow:0 30px 90px rgba(0,0,0,.55)}
      #msVictronConsoleModal .msvrc-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      #msVictronConsoleModal .msvrc-title h2{margin:0;font-size:24px;color:#fff}
      #msVictronConsoleModal .msvrc-close{width:44px;height:44px;min-height:44px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.10);color:#fff;font-size:28px}
      #msVictronConsoleModal .msvrc-intro{margin:0 0 15px;color:#b7cedd;line-height:1.45}
      #msVictronConsoleModal .msvrc-choice{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      #msVictronConsoleModal .msvrc-choice button{min-height:118px;padding:15px;border:1px solid rgba(94,189,245,.24);border-radius:18px;background:#0c2a40;color:#fff;text-align:left}
      #msVictronConsoleModal .msvrc-choice button b{display:block;font-size:17px;margin:3px 0 7px}
      #msVictronConsoleModal .msvrc-choice button span{display:block;color:#b9d0df;font-size:12px;line-height:1.4}
      #msVictronConsoleModal .msvrc-choice button i{display:block;font-style:normal;font-size:27px;line-height:1}
      #msVictronConsoleModal .msvrc-note{margin:14px 0 0;padding:12px 13px;border-radius:14px;background:rgba(255,255,255,.055);color:#abc5d6;font-size:12px;line-height:1.45}
      #msVictronConsoleModal .msvrc-note strong{color:#eaf7ff}
      @media(max-width:620px){
        #msVictronConsoleCard .msvrc-head{align-items:flex-start;flex-wrap:wrap}
        #msVictronConsoleCard .msvrc-open{width:100%}
        #msVictronConsoleModal .msvrc-choice{grid-template-columns:1fr}
        #msVictronConsoleModal .msvrc-choice button{min-height:100px}
      }
    `;
    document.head.appendChild(style);
  }

  function technicalSection(){
    return $('technical')||document.querySelector('[data-page="technical"],.technical-page,.technical-section');
  }

  function openExternal(url){
    const popup=window.open(url,'_blank','noopener,noreferrer');
    if(!popup){
      try{window.location.href=url}catch{}
    }
  }

  function ensureModal(){
    if($('msVictronConsoleModal'))return;
    const modal=document.createElement('div');
    modal.id='msVictronConsoleModal';
    modal.className='hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-hidden','true');
    modal.setAttribute('aria-label','Victron Remote Console');
    modal.innerHTML=`
      <div class="msvrc-panel" onclick="event.stopPropagation()">
        <div class="msvrc-title"><h2>Victron Live Console</h2><button type="button" class="msvrc-close" aria-label="Sluiten">×</button></div>
        <p class="msvrc-intro">Open de echte Remote Console van de Cerbo GX. Kies de juiste verbinding voor waar je bent.</p>
        <div class="msvrc-choice">
          <button type="button" id="msVictronConsoleLocal"><i>⚓</i><b>Aan boord · Cerbo lokaal</b><span>Gebruik dit wanneer je iPhone/iPad op hetzelfde netwerk als de Cerbo GX zit. Opent venus.local met de minste vertraging.</span></button>
          <button type="button" id="msVictronConsoleVrm"><i>☁️</i><b>Op afstand · Victron VRM</b><span>Gebruik dit buiten de boot. Opent Serenity in VRM; van daaruit kun je de Remote Console openen.</span></button>
        </div>
        <div class="msvrc-note"><strong>Eenmalig op de Cerbo:</strong> Remote Console moet zijn ingeschakeld voor LAN en/of VRM. De echte Victron-console opent buiten het MijnSerenity-frame omdat browserbeveiliging de lokale/VRM-console niet betrouwbaar in een iframe toestaat.</div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',close);
    modal.querySelector('.msvrc-close')?.addEventListener('click',close);
    $('msVictronConsoleLocal')?.addEventListener('click',()=>openExternal(LOCAL_URL));
    $('msVictronConsoleVrm')?.addEventListener('click',()=>openExternal(VRM_URL));
  }

  function mount(){
    syncBuild();
    ensureStyle();
    ensureModal();
    if($('msVictronConsoleCard'))return true;
    const section=technicalSection();
    if(!section)return false;
    const card=document.createElement('section');
    card.id='msVictronConsoleCard';
    card.innerHTML=`
      <div class="msvrc-head">
        <div class="msvrc-logo">V</div>
        <div class="msvrc-copy"><small>Victron · Cerbo GX</small><strong>Live Remote Console</strong><span>Echte Victron-console lokaal aan boord of op afstand via VRM.</span></div>
        <button type="button" class="msvrc-open">Open console</button>
      </div>`;
    const firstCard=section.querySelector('.card');
    if(firstCard)firstCard.insertAdjacentElement('afterend',card);
    else section.prepend(card);
    card.querySelector('.msvrc-open')?.addEventListener('click',open);
    return true;
  }

  function open(){
    mount();
    const modal=$('msVictronConsoleModal');
    if(!modal)return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>modal.querySelector('.msvrc-close')?.focus());
  }
  function close(){
    const modal=$('msVictronConsoleModal');
    if(!modal)return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }

  window.msOpenVictronRemoteConsole=open;
  window.msOpenVictronLocalConsole=()=>openExternal(LOCAL_URL);
  window.msOpenVictronVrmConsole=()=>openExternal(VRM_URL);

  function start(){
    syncBuild();
    let attempts=0;
    const tryMount=()=>{
      attempts+=1;
      if(mount()||attempts>=20)return;
      setTimeout(tryMount,400);
    };
    tryMount();
  }

  ['mijnserenity:modules-ready','mijnserenity:routechange','mijnserenity:dashboard-ready'].forEach(name=>window.addEventListener(name,()=>setTimeout(mount,80),{passive:true}));
  window.addEventListener('pageshow',()=>setTimeout(mount,80),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();