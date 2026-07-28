/* MijnSerenity 7.8.2 — Waterkaarten rechts en bevestiging na terugkeer */
(()=>{
  'use strict';

  const SHORTCUT_NAME='Open Waterkaarten';
  const SHORTCUT_URL='shortcuts://run-shortcut?name='+encodeURIComponent(SHORTCUT_NAME);
  const OPEN_MARKER_KEY='mijnserenity-waterkaarten-opened-at';
  const SPLIT_READY_KEY='mijnserenity-waterkaarten-right-window-ready';
  const RECENT_OPEN_MS=4*60*60*1000;

  let pendingReason='';
  let observedTripStart=0;
  let monitorTimer=null;
  let originalOpenWaterkaarten=null;

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

  function splitReady(){
    return safeRead(SPLIT_READY_KEY,'0')==='1';
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
          <b>Waterkaarten rechts openen</b>
          <small>MijnSerenity blijft links zichtbaar voor de GPS-opname.</small>
        </div>
      </div>
      <div class="ms759-banner-actions">
        <button type="button" onclick="ms738LaunchWaterkaarten()">Open rechts</button>
        <button id="ms7510BannerConfirm" type="button" class="secondary" onclick="ms759ConfirmWaterkaartenRight()">✓ Indeling staat goed</button>
      </div>`;
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
            <div class="ms738-waterkaarten-icon">↔️</div>
            <span class="eyebrow">IPAD SPLITVIEW</span>
            <h2 id="ms738WaterkaartenTitle">Waterkaarten altijd rechts</h2>
          </div>
          <button type="button" class="secondary ms738-waterkaarten-close" aria-label="Sluiten" onclick="ms738CloseWaterkaartenPrompt()">×</button>
        </div>
        <p id="ms738WaterkaartenMessage">Waterkaarten wordt via de iPad-opdracht geopend. De laatst gebruikte vensterpositie wordt daarbij hergebruikt.</p>
        <div id="ms738WaterkaartenReady" class="ms759-split-ready hidden">
          <b>✓ Rechter venster onthouden</b>
          <span>Waterkaarten wordt zonder fullscreen-webfallback geopend.</span>
        </div>
        <div id="ms738WaterkaartenSteps" class="ms738-waterkaarten-steps">
          <b>Eenmalig goed neerzetten</b>
          <ol>
            <li>Zet bij <b>Instellingen → Multitasking en gebaren</b> de optie <b>Apps in vensters</b> aan.</li>
            <li>Tik op <b>Open Waterkaarten rechts</b>.</li>
            <li>Maak MijnSerenity kleiner en plaats het links.</li>
            <li>Plaats Waterkaarten rechts en laat beide vensters open.</li>
            <li>Ga terug naar MijnSerenity en tik op <b>Indeling staat goed</b>.</li>
          </ol>
        </div>
        <div class="ms738-waterkaarten-actions">
          <button type="button" onclick="ms738LaunchWaterkaarten()">🗺️ Open Waterkaarten rechts</button>
          <button id="ms759ConfirmSplit" type="button" class="secondary" onclick="ms759ConfirmWaterkaartenRight()">✓ Indeling staat goed</button>
          <button type="button" class="secondary" onclick="ms759ResetWaterkaartenRight()">↺ Opnieuw indelen</button>
          <button type="button" class="secondary" onclick="ms738CloseWaterkaartenPrompt()">Sluiten</button>
        </div>
        <p class="ms738-waterkaarten-note">iPadOS bepaalt de vensterpositie. MijnSerenity opent daarom uitsluitend de Waterkaarten-app en gebruikt geen fullscreen webpagina als reserve. Na één keer rechts plaatsen onthoudt iPadOS normaal de vensterindeling.</p>
      </div>`;
    modal.addEventListener('click',()=>window.ms738CloseWaterkaartenPrompt());
    document.body.appendChild(modal);
    renderSplitState();
  }

  function renderSplitState(){
    const ready=splitReady();
    document.getElementById('ms738WaterkaartenReady')?.classList.toggle('hidden',!ready);
    document.getElementById('ms738WaterkaartenSteps')?.classList.toggle('hidden',ready);
    const confirm=document.getElementById('ms759ConfirmSplit');
    if(confirm)confirm.classList.toggle('hidden',ready);
    const bannerConfirm=document.getElementById('ms7510BannerConfirm');
    if(bannerConfirm)bannerConfirm.classList.toggle('hidden',ready);
  }

  function setMessage(reason){
    const message=document.getElementById('ms738WaterkaartenMessage');
    if(!message)return;
    if(reason==='return'){
      message.textContent='Waterkaarten staat nu rechts? Tik op Indeling staat goed. Daarna gebruikt MijnSerenity deze werkwijze voortaan.';
    }else if(reason==='departure'){
      message.textContent='Vertrek gedetecteerd. Open Waterkaarten rechts terwijl MijnSerenity links de vaart blijft registreren.';
    }else if(reason==='armed'){
      message.textContent='Automatisch varen staat klaar. Open Waterkaarten rechts voordat je vertrekt.';
    }else if(splitReady()){
      message.textContent='Tik op Open Waterkaarten rechts. De eerder ingestelde rechter vensterpositie wordt hergebruikt.';
    }else{
      message.textContent='Zet de twee apps één keer naast elkaar: MijnSerenity links en Waterkaarten rechts.';
    }
  }

  function showPrompt(reason='manual'){
    ensureUi();
    pendingReason=reason;
    setMessage(reason);
    renderSplitState();
    if(document.hidden)return;
    document.getElementById('ms738WaterkaartenModal')?.classList.remove('hidden');
    document.getElementById('ms738WaterkaartenBanner')?.classList.remove('hidden');
  }

  function closePrompt(){
    document.getElementById('ms738WaterkaartenModal')?.classList.add('hidden');
  }

  function confirmRight(){
    safeWrite(SPLIT_READY_KEY,'1');
    renderSplitState();
    setMessage('manual');
    if(typeof showAppToast==='function')showAppToast('Waterkaarten rechts is onthouden ✓');
  }

  function resetRight(){
    safeWrite(SPLIT_READY_KEY,'0');
    renderSplitState();
    setMessage('manual');
    if(typeof showAppToast==='function')showAppToast('Zet MijnSerenity links en Waterkaarten rechts');
  }

  function launch(){
    safeWrite(OPEN_MARKER_KEY,Date.now());
    pendingReason='return';
    closePrompt();
    document.getElementById('ms738WaterkaartenBanner')?.classList.add('hidden');

    if(typeof showAppToast==='function'){
      showAppToast(
        isIpad()
          ?(splitReady()?'Waterkaarten rechts openen…':'Waterkaarten openen · plaats het venster rechts')
          :'Waterkaarten openen…'
      );
    }

    if(isIpad()){
      // Bewust geen webfallback: die kan Safari of Waterkaarten fullscreen openen.
      window.location.assign(SHORTCUT_URL);
      return;
    }

    if(isAppleMobile()){
      window.location.assign(SHORTCUT_URL);
      return;
    }

    if(typeof originalOpenWaterkaarten==='function'){
      originalOpenWaterkaarten();
    }else{
      window.open('https://mijn.waterkaarten.app/','_blank','noopener,noreferrer');
    }
  }

  function patchAllWaterkaartenButtons(){
    if(typeof window.openWaterkaarten!=='function'||window.openWaterkaarten.__ms759RightPatched)return;
    originalOpenWaterkaarten=window.openWaterkaarten;
    const wrapped=function(){
      if(isIpad())return launch();
      return originalOpenWaterkaarten.apply(this,arguments);
    };
    wrapped.__ms759RightPatched=true;
    window.openWaterkaarten=wrapped;
  }

  function detectAutomaticDeparture(){
    if(typeof liveNavState==='undefined'||!liveNavState)return;
    const startedAt=Number(liveNavState.startedAt||0);
    const active=liveNavState.status==='active';
    const automatic=Boolean(liveNavState.autoStarted);

    if(active&&automatic&&startedAt&&startedAt!==observedTripStart){
      observedTripStart=startedAt;
      document.getElementById('ms738WaterkaartenBanner')?.classList.remove('hidden');
      if(!recentlyOpened())setTimeout(()=>showPrompt('departure'),1250);
      return;
    }

    if(!active){
      document.getElementById('ms738WaterkaartenBanner')?.classList.add('hidden');
    }
  }

  function patchAutomaticMode(){
    if(typeof ms701EnableAutomaticMode!=='function'||ms701EnableAutomaticMode.__ms759Patched)return;
    const original=ms701EnableAutomaticMode;
    const wrapped=async function(userGesture=false){
      const result=await original.apply(this,arguments);
      if(userGesture&&isIpad())setTimeout(()=>showPrompt('armed'),150);
      return result;
    };
    wrapped.__ms759Patched=true;
    ms701EnableAutomaticMode=wrapped;
  }

  function start(){
    ensureUi();
    patchAllWaterkaartenButtons();
    patchAutomaticMode();
    monitorTimer=setInterval(()=>{
      patchAllWaterkaartenButtons();
      patchAutomaticMode();
      detectAutomaticDeparture();
    },700);

    const showConfirmationAfterReturn=()=>{
      if(document.hidden||splitReady())return;
      if(recentlyOpened()){
        pendingReason='return';
        setTimeout(()=>showPrompt('return'),180);
      }
    };

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        renderSplitState();
        showConfirmationAfterReturn();
      }
    });
    window.addEventListener('focus',showConfirmationAfterReturn);
    window.addEventListener('pageshow',showConfirmationAfterReturn);

    // Ook na een terugkeer via Opdrachten, waarbij iPadOS geen visibility-event geeft.
    setInterval(showConfirmationAfterReturn,1200);
  }

  window.ms738ShowWaterkaartenPrompt=showPrompt;
  window.ms738CloseWaterkaartenPrompt=closePrompt;
  window.ms738ToggleWaterkaartenHelp=()=>document.getElementById('ms738WaterkaartenSteps')?.classList.toggle('hidden');
  window.ms738LaunchWaterkaarten=launch;
  window.ms759ConfirmWaterkaartenRight=confirmRight;
  window.ms759ResetWaterkaartenRight=resetRight;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
