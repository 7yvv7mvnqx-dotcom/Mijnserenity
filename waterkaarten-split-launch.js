/* MijnSerenity 7.4.7 — Waterkaarten vertrekassistent */
(()=>{
  'use strict';

  const SHORTCUT_NAME='Open Waterkaarten';
  const SHORTCUT_URL='shortcuts://run-shortcut?name='+encodeURIComponent(SHORTCUT_NAME);
  const OPEN_MARKER_KEY='mijnserenity-waterkaarten-opened-at';
  const PROMPT_MARKER_KEY='mijnserenity-waterkaarten-last-trip';
  const RECENT_OPEN_MS=4*60*60*1000;

  let pendingReason='';
  let observedTripStart=0;
  let monitorTimer=null;

  function isAppleMobile(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  }

  function isIpad(){
    return /iPad/.test(navigator.userAgent)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  }

  function safeRead(key,fallback=''){
    try{return localStorage.getItem(key)||fallback}catch{return fallback}
  }

  function safeWrite(key,value){
    try{localStorage.setItem(key,String(value))}catch{}
  }

  function recentlyOpened(){
    return Date.now()-Number(safeRead(OPEN_MARKER_KEY,'0'))<RECENT_OPEN_MS;
  }

  function ensureUi(){
    if(document.getElementById('ms738WaterkaartenModal'))return;

    const banner=document.createElement('div');
    banner.id='ms738WaterkaartenBanner';
    banner.className='ms738-waterkaarten-banner hidden';
    banner.setAttribute('role','status');
    banner.innerHTML=`
      <div class="ms738-waterkaarten-banner-copy">
        <span>🗺️</span>
        <div>
          <b>Route in Waterkaarten kiezen</b>
          <small>De vaartregistratie loopt. Open Waterkaarten en zet beide vensters naast elkaar.</small>
        </div>
      </div>
      <button type="button" onclick="ms738ShowWaterkaartenPrompt('banner')">Openen</button>`;
    document.body.appendChild(banner);

    const modal=document.createElement('div');
    modal.id='ms738WaterkaartenModal';
    modal.className='ms738-waterkaarten-modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','ms738WaterkaartenTitle');
    modal.innerHTML=`
      <div class="ms738-waterkaarten-card" onclick="event.stopPropagation()">
        <div class="ms738-waterkaarten-head">
          <div>
            <div class="ms738-waterkaarten-icon">🗺️</div>
            <span class="eyebrow">WATERKAARTEN</span>
            <h2 id="ms738WaterkaartenTitle">Route maken of selecteren</h2>
          </div>
          <button type="button" class="secondary ms738-waterkaarten-close" aria-label="Sluiten" onclick="ms738CloseWaterkaartenPrompt()">×</button>
        </div>
        <p id="ms738WaterkaartenMessage">MijnSerenity is gereed voor de vaartregistratie. Tik één keer om Waterkaarten te openen.</p>
        <div id="ms738WaterkaartenSteps" class="ms738-waterkaarten-steps hidden">
          <b>Eenmalig naast elkaar zetten op de iPad</b>
          <ol>
            <li>Zet bij <b>Instellingen → Multitasking en gebaren</b> de optie <b>Apps in vensters</b> aan.</li>
            <li>Tik hieronder op <b>Open Waterkaarten</b>.</li>
            <li>Maak beide vensters kleiner en sleep MijnSerenity en Waterkaarten naast elkaar.</li>
            <li>Kies of maak daarna je route in Waterkaarten. Laat MijnSerenity zichtbaar voor de GPS-opname.</li>
          </ol>
        </div>
        <div class="ms738-waterkaarten-actions">
          <button type="button" onclick="ms738LaunchWaterkaarten()">🗺️ Open Waterkaarten</button>
          <button type="button" class="secondary" onclick="ms738ToggleWaterkaartenHelp()">↔ Hoe naast elkaar?</button>
          <button type="button" class="secondary" onclick="ms738CloseWaterkaartenPrompt()">Later</button>
        </div>
        <p class="ms738-waterkaarten-note">iPadOS laat een website niet zelfstandig twee apps rangschikken. Eén tik is daarom nodig; daarna plaats je de vensters eenmalig naast elkaar.</p>
      </div>`;
    modal.addEventListener('click',()=>window.ms738CloseWaterkaartenPrompt());
    document.body.appendChild(modal);
  }

  function setMessage(reason){
    const message=document.getElementById('ms738WaterkaartenMessage');
    if(!message)return;
    if(reason==='departure'){
      message.textContent='Vertrek gedetecteerd en de vaartregistratie loopt. Open Waterkaarten om een route te maken of een opgeslagen route te selecteren.';
    }else if(reason==='armed'){
      message.textContent='Automatisch varen staat klaar. Open Waterkaarten nu alvast en zet beide apps naast elkaar voordat je vertrekt.';
    }else{
      message.textContent='Tik één keer om Waterkaarten te openen en kies of maak daar je route.';
    }
  }

  function showPrompt(reason='manual'){
    ensureUi();
    pendingReason=reason;
    setMessage(reason);

    if(document.hidden){
      return;
    }

    document.getElementById('ms738WaterkaartenModal')?.classList.remove('hidden');
    document.getElementById('ms738WaterkaartenBanner')?.classList.remove('hidden');
  }

  function closePrompt(){
    document.getElementById('ms738WaterkaartenModal')?.classList.add('hidden');
  }

  function toggleHelp(){
    document.getElementById('ms738WaterkaartenSteps')?.classList.toggle('hidden');
  }

  function launch(){
    safeWrite(OPEN_MARKER_KEY,Date.now());
    closePrompt();
    document.getElementById('ms738WaterkaartenBanner')?.classList.add('hidden');

    if(typeof showAppToast==='function'){
      showAppToast(
        isIpad()
          ?'Waterkaarten openen · plaats beide vensters naast elkaar'
          :'Waterkaarten openen'
      );
    }

    if(isAppleMobile()){
      window.location.href=SHORTCUT_URL;
      return;
    }

    if(typeof openWaterkaarten==='function'){
      openWaterkaarten();
    }else{
      window.open('https://mijn.waterkaarten.app/','_blank','noopener,noreferrer');
    }
  }

  function detectAutomaticDeparture(){
    if(typeof liveNavState==='undefined'||!liveNavState)return;

    const startedAt=Number(liveNavState.startedAt||0);
    const active=liveNavState.status==='active';
    const automatic=Boolean(liveNavState.autoStarted);

    if(active&&automatic&&startedAt&&startedAt!==observedTripStart){
      observedTripStart=startedAt;
      safeWrite(PROMPT_MARKER_KEY,startedAt);
      document.getElementById('ms738WaterkaartenBanner')?.classList.remove('hidden');

      if(!recentlyOpened()){
        setTimeout(()=>showPrompt('departure'),1250);
      }
      return;
    }

    if(!active&&document.getElementById('ms738WaterkaartenBanner')){
      document.getElementById('ms738WaterkaartenBanner').classList.add('hidden');
    }
  }

  function patchAutomaticMode(){
    if(typeof ms701EnableAutomaticMode!=='function'||ms701EnableAutomaticMode.__ms738Patched)return;

    const original=ms701EnableAutomaticMode;
    const wrapped=async function(userGesture=false){
      const result=await original.apply(this,arguments);
      if(userGesture&&isIpad()){
        setTimeout(()=>showPrompt('armed'),150);
      }
      return result;
    };
    wrapped.__ms738Patched=true;
    ms701EnableAutomaticMode=wrapped;
  }

  function start(){
    ensureUi();
    patchAutomaticMode();
    monitorTimer=setInterval(()=>{
      patchAutomaticMode();
      detectAutomaticDeparture();
    },700);

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden&&pendingReason){
        setTimeout(()=>showPrompt(pendingReason),250);
      }
    });
  }

  window.ms738ShowWaterkaartenPrompt=showPrompt;
  window.ms738CloseWaterkaartenPrompt=closePrompt;
  window.ms738ToggleWaterkaartenHelp=toggleHelp;
  window.ms738LaunchWaterkaarten=launch;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
