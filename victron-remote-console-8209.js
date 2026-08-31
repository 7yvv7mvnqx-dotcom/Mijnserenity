/* MijnSerenity 8.21.0 — echte Victron Cerbo GX Remote Console IN MijnSerenity.
   Geen snelkoppeling naar een andere site: de lokale GUI-v2 van de Cerbo wordt
   rechtstreeks als interactieve console in de Techniek-pagina weergegeven. */
(()=>{
  'use strict';
  if(window.__msVictronRemoteConsole8210)return;
  window.__msVictronRemoteConsole8210=true;

  const BUILD='8.21.0';
  const CONSOLE_URL='https://venus.local/gui-v2/?fullscreen&noframe&download=vrm';
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
    if($('msVictronConsoleStyle8210'))return;
    $('msVictronConsoleStyle8209')?.remove();
    const style=document.createElement('style');
    style.id='msVictronConsoleStyle8210';
    style.textContent=`
      #msVictronConsoleCard{margin:14px 0 18px;border:1px solid rgba(66,170,255,.32);border-radius:22px;overflow:hidden;background:#061725;box-shadow:0 14px 34px rgba(0,0,0,.24)}
      #msVictronConsoleCard .msvrc-head{display:flex;align-items:center;gap:12px;padding:13px 14px;background:linear-gradient(145deg,#071b2c,#0b2539);border-bottom:1px solid rgba(255,255,255,.08)}
      #msVictronConsoleCard .msvrc-logo{display:grid;place-items:center;width:43px;height:43px;flex:0 0 43px;border-radius:13px;background:#0d74bb;color:#fff;font-size:23px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
      #msVictronConsoleCard .msvrc-copy{min-width:0;flex:1}
      #msVictronConsoleCard .msvrc-copy small{display:block;color:#8fb5ce;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #msVictronConsoleCard .msvrc-copy strong{display:block;margin-top:2px;color:#f5fbff;font-size:18px;line-height:1.15}
      #msVictronConsoleCard .msvrc-copy span{display:block;margin-top:3px;color:#b9d0df;font-size:11px;line-height:1.35}
      #msVictronConsoleCard .msvrc-tools{display:flex;gap:7px}
      #msVictronConsoleCard .msvrc-tools button{width:40px;height:40px;min-height:40px;padding:0;border:1px solid rgba(83,194,255,.34);border-radius:12px;background:#0a3550;color:#fff;font-size:19px}
      #msVictronConsoleCard .msvrc-view{position:relative;width:100%;height:clamp(520px,72dvh,820px);background:#000;overflow:hidden}
      #msVictronConsoleFrame{display:block;width:100%;height:100%;border:0;background:#000}
      #msVictronConsoleLoading{position:absolute;inset:0;z-index:2;display:grid;place-items:center;padding:24px;background:#02080d;color:#c8dce9;text-align:center;font-size:13px;line-height:1.45;pointer-events:none;transition:opacity .25s ease}
      #msVictronConsoleLoading.hidden{opacity:0}
      #msVictronConsoleCard .msvrc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;background:#071a29;color:#9eb9ca;font-size:10px;line-height:1.35}
      #msVictronConsoleCard .msvrc-status{display:flex;align-items:center;gap:7px}
      #msVictronConsoleCard .msvrc-dot{width:8px;height:8px;border-radius:50%;background:#f2bd42;box-shadow:0 0 0 3px rgba(242,189,66,.12)}
      #msVictronConsoleCard.loaded .msvrc-dot{background:#36d98b;box-shadow:0 0 0 3px rgba(54,217,139,.12)}
      body.msvrc-fullscreen{overflow:hidden!important}
      body.msvrc-fullscreen #msVictronConsoleCard{position:fixed!important;inset:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) calc(70px + env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important;z-index:2147483400!important;margin:0!important;border-radius:18px!important;display:flex!important;flex-direction:column!important;background:#02080d!important}
      body.msvrc-fullscreen #msVictronConsoleCard .msvrc-view{height:auto!important;min-height:0!important;flex:1 1 auto!important}
      body.msvrc-fullscreen #msVictronConsoleCard .msvrc-foot{display:none}
      @media(max-width:620px){
        #msVictronConsoleCard .msvrc-copy span{display:none}
        #msVictronConsoleCard .msvrc-view{height:68dvh;min-height:500px}
        #msVictronConsoleCard .msvrc-foot{align-items:flex-start;flex-direction:column}
      }
    `;
    document.head.appendChild(style);
  }

  function technicalSection(){
    return $('technical')||document.querySelector('[data-page="technical"],.technical-page,.technical-section');
  }

  function reloadFrame(){
    const frame=$('msVictronConsoleFrame');
    const loading=$('msVictronConsoleLoading');
    const card=$('msVictronConsoleCard');
    if(!frame)return;
    card?.classList.remove('loaded');
    loading?.classList.remove('hidden');
    frame.src='about:blank';
    requestAnimationFrame(()=>{frame.src=CONSOLE_URL});
  }

  function toggleFullscreen(){
    const active=document.body.classList.toggle('msvrc-fullscreen');
    const button=$('msVictronConsoleExpand');
    if(button){button.textContent=active?'↙':'↗';button.setAttribute('aria-label',active?'Verklein Victron console':'Victron console schermvullend')}
  }

  function mount(){
    syncBuild();
    ensureStyle();
    if($('msVictronConsoleCard'))return true;
    const section=technicalSection();
    if(!section)return false;

    const card=document.createElement('section');
    card.id='msVictronConsoleCard';
    card.innerHTML=`
      <div class="msvrc-head">
        <div class="msvrc-logo">V</div>
        <div class="msvrc-copy">
          <small>Victron · Cerbo GX</small>
          <strong>Remote Console Live</strong>
          <span>De echte Cerbo GUI-v2, rechtstreeks in MijnSerenity.</span>
        </div>
        <div class="msvrc-tools">
          <button id="msVictronConsoleReload" type="button" aria-label="Victron console vernieuwen" title="Vernieuwen">↻</button>
          <button id="msVictronConsoleExpand" type="button" aria-label="Victron console schermvullend" title="Schermvullend">↗</button>
        </div>
      </div>
      <div class="msvrc-view">
        <div id="msVictronConsoleLoading">Cerbo GX Remote Console wordt rechtstreeks in MijnSerenity geladen…</div>
        <iframe id="msVictronConsoleFrame" src="${CONSOLE_URL}" allow="fullscreen; clipboard-read; clipboard-write" referrerpolicy="no-referrer" title="Victron Cerbo GX Remote Console"></iframe>
      </div>
      <div class="msvrc-foot">
        <span class="msvrc-status"><i class="msvrc-dot"></i><b id="msVictronConsoleStatus">Verbinden met Cerbo GX…</b></span>
        <span>Werkt wanneer dit apparaat toegang heeft tot het netwerk van de Cerbo GX.</span>
      </div>`;

    const firstCard=section.querySelector('.card');
    if(firstCard)firstCard.insertAdjacentElement('afterend',card);
    else section.prepend(card);

    const frame=$('msVictronConsoleFrame');
    frame?.addEventListener('load',()=>{
      card.classList.add('loaded');
      $('msVictronConsoleLoading')?.classList.add('hidden');
      const status=$('msVictronConsoleStatus');
      if(status)status.textContent='Cerbo-console in MijnSerenity geladen';
    });
    $('msVictronConsoleReload')?.addEventListener('click',reloadFrame);
    $('msVictronConsoleExpand')?.addEventListener('click',toggleFullscreen);
    return true;
  }

  function start(){
    syncBuild();
    let attempts=0;
    const tryMount=()=>{
      attempts+=1;
      if(mount()||attempts>=24)return;
      setTimeout(tryMount,350);
    };
    tryMount();
  }

  window.msOpenVictronRemoteConsole=()=>{
    mount();
    $('msVictronConsoleCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.msVictronConsoleReload=reloadFrame;
  window.msVictronConsoleFullscreen=toggleFullscreen;

  ['mijnserenity:modules-ready','mijnserenity:routechange','mijnserenity:dashboard-ready']
    .forEach(name=>window.addEventListener(name,()=>setTimeout(mount,80),{passive:true}));
  window.addEventListener('pageshow',()=>setTimeout(mount,80),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();