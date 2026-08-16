/* MijnSerenity — Waterkaarten ingebed in fullscreen iframe */
(()=>{
  'use strict';

  const WATERKAARTEN_URL='https://mijn.waterkaarten.app/';
  const FRAME_ID='msWaterkaartenFrame';
  const OVERLAY_ID='ms738WaterkaartenModal';
  const BANNER_ID='ms738WaterkaartenBanner';
  const OPEN_CLASS='ms-waterkaarten-open';
  const FIRST_INFO_KEY='mijnserenity-waterkaarten-iframe-info-seen';

  let originalOpenWaterkaarten=null;
  let observedTripStart=0;
  let patchTimer=null;
  let departureTimer=null;

  function safeRead(key,fallback=''){
    try{return localStorage.getItem(key)||fallback}catch{return fallback}
  }

  function safeWrite(key,value){
    try{localStorage.setItem(key,String(value))}catch{}
  }

  function toast(message){
    if(typeof window.showAppToast==='function'){
      window.showAppToast(message);
    }
  }

  function ensureUi(){
    if(document.getElementById(OVERLAY_ID))return;

    const overlay=document.createElement('div');
    overlay.id=OVERLAY_ID;
    overlay.className='mswk-overlay hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Waterkaarten in MijnSerenity');
    overlay.innerHTML=`
      <div class="mswk-shell">
        <header class="mswk-toolbar">
          <button type="button" class="mswk-back" onclick="ms738CloseWaterkaartenPrompt()" aria-label="Terug naar MijnSerenity">
            <span aria-hidden="true">‹</span><b>MijnSerenity</b>
          </button>
          <div class="mswk-title">
            <span class="mswk-title-icon" aria-hidden="true">🗺️</span>
            <div><strong>Waterkaarten</strong><small>ingebed in MijnSerenity</small></div>
          </div>
          <button type="button" class="mswk-external" onclick="msWaterkaartenOpenExternal()" title="Open Waterkaarten apart">
            <span aria-hidden="true">↗</span><b>Open apart</b>
          </button>
        </header>

        <div class="mswk-frame-stage">
          <div id="msWaterkaartenLoading" class="mswk-loading">
            <div class="mswk-spinner" aria-hidden="true"></div>
            <strong>Waterkaarten laden…</strong>
            <small>Je blijft in MijnSerenity.</small>
          </div>
          <iframe id="${FRAME_ID}"
            class="mswk-frame"
            title="Waterkaarten"
            allow="geolocation; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"></iframe>

          <div id="msWaterkaartenInfo" class="mswk-info hidden">
            <button type="button" class="mswk-info-close" onclick="msWaterkaartenDismissInfo()" aria-label="Melding sluiten">×</button>
            <b>Waterkaarten blijft binnen MijnSerenity</b>
            <span>Log zo nodig één keer in. Blijft het vlak leeg of meldt Waterkaarten dat insluiten niet is toegestaan, gebruik dan <b>Open apart</b>.</span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const frame=document.getElementById(FRAME_ID);
    frame?.addEventListener('load',()=>{
      document.getElementById('msWaterkaartenLoading')?.classList.add('hidden');
    });

    const banner=document.createElement('div');
    banner.id=BANNER_ID;
    banner.className='mswk-departure-banner hidden';
    banner.setAttribute('role','status');
    banner.innerHTML=`
      <div class="mswk-departure-copy">
        <span aria-hidden="true">🗺️</span>
        <div><b>Waterkaarten</b><small>Open de kaart in MijnSerenity tijdens het varen.</small></div>
      </div>
      <div class="mswk-departure-actions">
        <button type="button" onclick="ms738LaunchWaterkaarten()">Open kaart</button>
        <button type="button" class="secondary" onclick="msWaterkaartenHideDepartureBanner()" aria-label="Melding sluiten">×</button>
      </div>`;
    document.body.appendChild(banner);
  }

  function setOpenState(open){
    document.documentElement.classList.toggle(OPEN_CLASS,open);
    document.body.classList.toggle(OPEN_CLASS,open);
  }

  function loadFrame(){
    const frame=document.getElementById(FRAME_ID);
    if(!frame)return;
    if(!frame.getAttribute('src')){
      document.getElementById('msWaterkaartenLoading')?.classList.remove('hidden');
      frame.setAttribute('src',WATERKAARTEN_URL);
    }
  }

  function showInfoOnce(){
    if(safeRead(FIRST_INFO_KEY,'0')==='1')return;
    const info=document.getElementById('msWaterkaartenInfo');
    if(info)info.classList.remove('hidden');
  }

  function openEmbedded(){
    ensureUi();
    loadFrame();
    document.getElementById(BANNER_ID)?.classList.add('hidden');
    document.getElementById(OVERLAY_ID)?.classList.remove('hidden');
    setOpenState(true);
    showInfoOnce();
    return false;
  }

  function closeEmbedded(){
    document.getElementById(OVERLAY_ID)?.classList.add('hidden');
    setOpenState(false);
  }

  function dismissInfo(){
    safeWrite(FIRST_INFO_KEY,'1');
    document.getElementById('msWaterkaartenInfo')?.classList.add('hidden');
  }

  function openExternal(){
    const win=window.open(WATERKAARTEN_URL,'_blank','noopener,noreferrer');
    if(!win){
      window.location.assign(WATERKAARTEN_URL);
    }
  }

  function hideDepartureBanner(){
    document.getElementById(BANNER_ID)?.classList.add('hidden');
  }

  function patchOpenWaterkaarten(){
    const current=window.openWaterkaarten;
    if(typeof current!=='function'||current.__msWaterkaartenIframePatched)return;

    if(!originalOpenWaterkaarten)originalOpenWaterkaarten=current;

    const wrapped=function(){
      return openEmbedded();
    };
    wrapped.__msWaterkaartenIframePatched=true;
    wrapped.__msWaterkaartenOriginal=current;
    window.openWaterkaarten=wrapped;
  }

  function detectAutomaticDeparture(){
    try{
      if(typeof liveNavState==='undefined'||!liveNavState)return;
      const startedAt=Number(liveNavState.startedAt||0);
      const active=liveNavState.status==='active';
      const automatic=Boolean(liveNavState.autoStarted);

      if(active&&automatic&&startedAt&&startedAt!==observedTripStart){
        observedTripStart=startedAt;
        document.getElementById(BANNER_ID)?.classList.remove('hidden');
      }else if(!active){
        document.getElementById(BANNER_ID)?.classList.add('hidden');
      }
    }catch{}
  }

  function handleKeydown(event){
    if(event.key!=='Escape')return;
    const overlay=document.getElementById(OVERLAY_ID);
    if(overlay&&!overlay.classList.contains('hidden'))closeEmbedded();
  }

  function start(){
    ensureUi();
    patchOpenWaterkaarten();

    patchTimer=setInterval(patchOpenWaterkaarten,700);
    departureTimer=setInterval(detectAutomaticDeparture,1200);
    document.addEventListener('keydown',handleKeydown);
  }

  /* Bestaande MijnSerenity-functienamen blijven bewust beschikbaar. */
  window.ms738ShowWaterkaartenPrompt=openEmbedded;
  window.ms738CloseWaterkaartenPrompt=closeEmbedded;
  window.ms738LaunchWaterkaarten=openEmbedded;
  window.ms738ToggleWaterkaartenHelp=showInfoOnce;
  window.ms759ConfirmWaterkaartenRight=()=>{
    dismissInfo();
    toast('Waterkaarten opent voortaan in MijnSerenity ✓');
  };
  window.ms759ResetWaterkaartenRight=()=>{
    safeWrite(FIRST_INFO_KEY,'0');
    showInfoOnce();
  };
  window.msWaterkaartenOpenExternal=openExternal;
  window.msWaterkaartenDismissInfo=dismissInfo;
  window.msWaterkaartenHideDepartureBanner=hideDepartureBanner;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();