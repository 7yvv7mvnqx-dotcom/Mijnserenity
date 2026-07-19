/* ============================================================
   MijnSerenity Cloud 7.4.0 — GPS Continuity Guard
   Voorkomt stille GPS-uitval, foutieve aankomstdetectie en
   houdt Garmin/iOS-locatie actief met watch + zichtbare polling.
   ============================================================ */
(()=>{
  'use strict';

  const BUILD='7.4.0';
  const GPS_STALE_MS=12000;
  const GPS_GAP_MS=20000;
  const MAX_POSITION_AGE_MS=20000;
  const RECOVERY_GRACE_MS=30000;
  const HEALTH_FIX_COUNT=4;
  const HEALTH_FIX_SPAN_MS=10000;
  const POLL_INTERVAL_MS=5000;
  const POLL_TIMEOUT_MS=9000;

  let pollTimer=null;
  let uiTimer=null;
  let pollBusy=false;
  let lastHandledTimestamp=0;
  let freshFixTimes=[];
  let pendingGap=null;

  const $id=id=>document.getElementById(id);
  const now=()=>Date.now();

  function isController(){
    return typeof ms640IsController!=='function'||ms640IsController();
  }

  function recordingHere(){
    return liveNavState?.status==='active'&&isController()&&!globalThis.ms640Viewing;
  }

  function lastFixTimestamp(){
    return Number(
      liveNavState?.lastGpsAt||
      liveNavState?.points?.at?.(-1)?.time||
      lastHandledTimestamp||
      0
    );
  }

  function ensureState(){
    if(!liveNavState)return;
    if(!Number.isFinite(Number(liveNavState.gpsTotalInterruptedMs))){
      liveNavState.gpsTotalInterruptedMs=0;
    }
    if(!Number.isFinite(Number(liveNavState.gpsInterruptedAt))){
      liveNavState.gpsInterruptedAt=null;
    }
    if(!Number.isFinite(Number(liveNavState.gpsRecoveryUntil))){
      liveNavState.gpsRecoveryUntil=0;
    }
    if(typeof liveNavState.gpsContinuityHealthy!=='boolean'){
      liveNavState.gpsContinuityHealthy=false;
    }
    if(typeof liveNavState.routeHasGpsGaps!=='boolean'){
      liveNavState.routeHasGpsGaps=false;
    }
    if(!Array.isArray(liveNavState.gpsGapLog)){
      liveNavState.gpsGapLog=[];
    }
  }

  function formatDuration(milliseconds){
    const totalSeconds=Math.max(0,Math.round(Number(milliseconds||0)/1000));
    if(totalSeconds<60)return `${totalSeconds} sec`;
    const minutes=Math.floor(totalSeconds/60);
    const seconds=totalSeconds%60;
    return seconds?`${minutes} min ${seconds} sec`:`${minutes} min`;
  }

  function clearArrivalDetection(){
    try{clearLiveAutoStopTimer?.();}catch{}
    if(!liveNavState)return;
    liveNavState.stationarySince=null;
    liveNavState.autoStopTriggered=false;
  }

  function markInterrupted(reason='Geen nieuwe GPS-metingen'){
    if(!recordingHere())return;
    ensureState();

    if(!liveNavState.gpsInterruptedAt){
      liveNavState.gpsInterruptedAt=now();
      liveNavState.gpsContinuityHealthy=false;
      liveNavState.routeHasGpsGaps=true;
      pendingGap={startedAt:liveNavState.gpsInterruptedAt,reason};
    }

    liveNavState.speedKmh=0;
    clearArrivalDetection();
    document.body.classList.add('ms739-gps-interrupted');

    const message=`GPS tijdelijk onderbroken · ${reason}. Automatisch stoppen is geblokkeerd; de route hervat zodra Garmin of iOS weer posities levert.`;
    const gps=$id('liveGpsStatus');
    if(gps)gps.textContent=message;
    if(typeof setLiveAutoLogStatus==='function'){
      setLiveAutoLogStatus(message,'error');
    }
    try{persistLiveState?.();}catch{}
    renderGuardUi();
  }

  function closeInterruption(fixTimestamp){
    ensureState();
    const startedAt=Number(liveNavState.gpsInterruptedAt||pendingGap?.startedAt||0);
    if(!startedAt)return;

    const endedAt=Math.max(now(),Number(fixTimestamp)||0);
    const durationMs=Math.max(0,endedAt-startedAt);
    liveNavState.gpsInterruptedAt=null;
    liveNavState.gpsTotalInterruptedMs=Number(liveNavState.gpsTotalInterruptedMs||0)+durationMs;
    liveNavState.gpsGapCount=Number(liveNavState.gpsGapCount||0)+1;
    liveNavState.gpsRecoveryUntil=now()+RECOVERY_GRACE_MS;
    liveNavState.gpsContinuityHealthy=false;
    liveNavState.routeHasGpsGaps=true;
    liveNavState.gpsGapLog=[
      ...(liveNavState.gpsGapLog||[]),
      {
        startedAt,
        endedAt,
        durationMs,
        reason:pendingGap?.reason||'GPS-onderbreking'
      }
    ].slice(-50);

    pendingGap={
      startedAt,
      endedAt,
      durationMs,
      reason:pendingGap?.reason||'GPS-onderbreking',
      attachToNextPoint:true
    };
    freshFixTimes=[];
    clearArrivalDetection();
    try{persistLiveState?.();}catch{}
  }

  function rememberFreshFix(timestamp){
    const time=Number(timestamp)||now();
    freshFixTimes.push(time);
    freshFixTimes=freshFixTimes
      .filter(value=>time-value<=60000)
      .slice(-30);

    const span=freshFixTimes.length>1
      ?freshFixTimes.at(-1)-freshFixTimes[0]
      :0;
    const recovered=
      freshFixTimes.length>=HEALTH_FIX_COUNT&&
      span>=HEALTH_FIX_SPAN_MS&&
      now()>=Number(liveNavState?.gpsRecoveryUntil||0);

    if(liveNavState){
      liveNavState.gpsContinuityHealthy=Boolean(recovered);
    }
  }

  function gpsHealthyForArrival(){
    if(!recordingHere())return false;
    ensureState();
    const age=lastFixTimestamp()?now()-lastFixTimestamp():Infinity;
    return Boolean(
      !liveNavState.gpsInterruptedAt&&
      age<=GPS_STALE_MS&&
      liveNavState.gpsContinuityHealthy&&
      now()>=Number(liveNavState.gpsRecoveryUntil||0)
    );
  }

  function insertGuardUi(){
    if($id('ms739GpsContinuity'))return;
    const anchor=$id('ms735LiveReliability')||$id('liveGpsStatus');
    if(!anchor)return;
    const node=document.createElement('div');
    node.id='ms739GpsContinuity';
    node.className='ms739-gps-guard checking';
    node.innerHTML='<strong>GPS-continuïteit controleren…</strong><small>Garmin en iOS-locatie worden bewaakt.</small>';
    anchor.insertAdjacentElement('afterend',node);
  }

  function renderGuardUi(){
    insertGuardUi();
    const node=$id('ms739GpsContinuity');
    if(!node||!liveNavState)return;
    ensureState();

    const status=liveNavState.status||'idle';
    const age=lastFixTimestamp()?now()-lastFixTimestamp():Infinity;
    const interrupted=Boolean(liveNavState.gpsInterruptedAt)||(
      status==='active'&&age>GPS_STALE_MS
    );
    const recovering=
      status==='active'&&
      !interrupted&&
      !gpsHealthyForArrival();

    node.className='ms739-gps-guard '+(
      interrupted?'error':
      recovering?'warning':
      status==='active'?'success':'checking'
    );

    const title=node.querySelector('strong');
    const detail=node.querySelector('small');

    if(interrupted){
      const started=Number(liveNavState.gpsInterruptedAt||lastFixTimestamp()||now());
      if(title)title.textContent='GPS-route is tijdelijk onderbroken';
      if(detail)detail.textContent=`Onderbreking ${formatDuration(now()-started)} · vaartijd loopt door, maar afstand en route niet · automatische aankomst geblokkeerd.`;
    }else if(recovering){
      const remaining=Math.max(0,Number(liveNavState.gpsRecoveryUntil||0)-now());
      if(title)title.textContent='GPS is terug en wordt gecontroleerd';
      if(detail)detail.textContent=`Nog ${Math.max(1,Math.ceil(remaining/1000))} sec stabiliseren · aankomstdetectie blijft tijdelijk uit.`;
    }else if(status==='active'){
      if(title)title.textContent='GPS-route loopt door';
      if(detail)detail.textContent=`Laatste positie ${Math.max(0,Math.round(age/1000))} sec geleden · Garmin heeft automatisch voorrang wanneer iOS die gebruikt.`;
    }else{
      if(title)title.textContent='GPS-continuïteit gereed';
      if(detail)detail.textContent='Tijdens automatisch varen worden GPS-uitval en foutieve aankomstdetectie bewaakt.';
    }

    document.body.classList.toggle('ms739-gps-interrupted',interrupted);
  }

  async function pollCurrentPosition(reason='controle'){
    if(pollBusy||document.hidden||!recordingHere()||!navigator.geolocation)return;
    pollBusy=true;
    try{
      await new Promise(resolve=>{
        navigator.geolocation.getCurrentPosition(
          position=>{
            try{handleLivePosition(position);}catch(error){console.warn('GPS-poll verwerken mislukt:',error);}
            resolve();
          },
          error=>{
            if(error?.code!==3)markInterrupted(`GPS-${reason} niet beschikbaar`);
            resolve();
          },
          {
            enableHighAccuracy:true,
            maximumAge:0,
            timeout:POLL_TIMEOUT_MS
          }
        );
      });
    }finally{
      pollBusy=false;
    }
  }

  function continuityWatchdog(){
    if(!recordingHere()){
      renderGuardUi();
      return;
    }
    const age=lastFixTimestamp()?now()-lastFixTimestamp():Infinity;
    if(age>GPS_STALE_MS){
      markInterrupted('geen verse positie ontvangen');
      pollCurrentPosition('herstel');
    }
    renderGuardUi();
  }

  // Zorg dat nieuwe opnames altijd met continuïteitsvelden starten.
  if(typeof createEmptyLiveState==='function'){
    const originalCreateEmptyLiveState=createEmptyLiveState;
    createEmptyLiveState=function(){
      return {
        ...originalCreateEmptyLiveState(),
        gpsInterruptedAt:null,
        gpsTotalInterruptedMs:0,
        gpsRecoveryUntil:0,
        gpsContinuityHealthy:false,
        routeHasGpsGaps:false,
        gpsGapLog:[]
      };
    };
  }

  // Verwerk alleen verse posities. Een oude of dubbele Garmin/iOS-fix mag
  // geen afstand, snelheid of stilstandtimer beïnvloeden.
  if(typeof handleLivePosition==='function'){
    const originalHandleLivePosition=handleLivePosition;
    handleLivePosition=function(position){
      if(liveNavState?.status!=='active')return originalHandleLivePosition(position);
      ensureState();

      const timestamp=Number(position?.timestamp)||now();
      const positionAge=now()-timestamp;
      const latitude=Number(position?.coords?.latitude);
      const longitude=Number(position?.coords?.longitude);

      if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return;
      if(positionAge>MAX_POSITION_AGE_MS){
        markInterrupted('verouderde GPS-meting ontvangen');
        return;
      }
      if(lastHandledTimestamp&&timestamp<=lastHandledTimestamp){
        return;
      }

      const previousTimestamp=lastHandledTimestamp||lastFixTimestamp();
      const gapMs=previousTimestamp?timestamp-previousTimestamp:0;
      if(gapMs>GPS_GAP_MS||liveNavState.gpsInterruptedAt){
        if(!liveNavState.gpsInterruptedAt){
          liveNavState.gpsInterruptedAt=previousTimestamp||now();
          pendingGap={startedAt:liveNavState.gpsInterruptedAt,reason:'geen doorlopende GPS-metingen'};
        }
        closeInterruption(timestamp);
      }

      const beforePoints=Number(liveNavState.points?.length||0);
      const result=originalHandleLivePosition(position);
      const afterPoints=Number(liveNavState.points?.length||0);

      lastHandledTimestamp=timestamp;
      liveNavState.lastGpsAt=timestamp;
      rememberFreshFix(timestamp);

      if(pendingGap?.attachToNextPoint&&afterPoints>beforePoints){
        const point=liveNavState.points.at(-1);
        if(point){
          point.gapBefore=true;
          point.gapDurationMs=Number(pendingGap.durationMs||0);
          point.gapReason=pendingGap.reason||'GPS-onderbreking';
        }
        pendingGap=null;
      }

      try{persistLiveState?.();}catch{}
      renderGuardUi();
      return result;
    };
  }

  // Zonder stabiele, verse GPS mag stilstand nooit als aankomst gelden.
  if(typeof updateLiveAutoStopDetection==='function'){
    const originalUpdateLiveAutoStopDetection=updateLiveAutoStopDetection;
    updateLiveAutoStopDetection=function(point){
      if(liveNavState?.status==='active'&&!gpsHealthyForArrival()){
        clearArrivalDetection();
        if(typeof setLiveAutoLogStatus==='function'){
          setLiveAutoLogStatus(
            liveNavState.gpsInterruptedAt
              ?'GPS onderbroken · automatisch stoppen is tijdelijk geblokkeerd.'
              :'GPS wordt gestabiliseerd · aankomstdetectie wacht op meerdere verse posities.',
            liveNavState.gpsInterruptedAt?'error':'warning'
          );
        }
        renderGuardUi();
        return;
      }
      return originalUpdateLiveAutoStopDetection(point);
    };
  }

  // Extra vangnet tegen een oude achtergrondtimer die alsnog wil stoppen.
  if(typeof stopLiveNavigation==='function'){
    const originalStopLiveNavigation=stopLiveNavigation;
    stopLiveNavigation=async function(options={}){
      const automatic=Boolean(options?.automatic);
      const manualArrival=Boolean(options?.manualArrival);
      if(automatic&&!manualArrival&&!gpsHealthyForArrival()){
        clearArrivalDetection();
        liveNavState.backgroundRecovery=false;
        if(Array.isArray(liveNavState.autoEvents)){
          const last=liveNavState.autoEvents.at(-1);
          if(last?.type==='arrival')liveNavState.autoEvents.pop();
        }
        try{persistLiveState?.();}catch{}
        if(typeof setLiveAutoLogStatus==='function'){
          setLiveAutoLogStatus('Automatisch stoppen geannuleerd: GPS was niet stabiel genoeg. De opname blijft actief.','error');
        }
        renderGuardUi();
        return false;
      }
      return originalStopLiveNavigation(options);
    };
  }

  // Toon routeonderbrekingen als een aparte stippellijn, zodat een ontbrekend
  // routedeel niet wordt voorgesteld als werkelijk gevaren traject.
  if(typeof renderLiveRoute==='function'){
    renderLiveRoute=function(){
      if(!liveMap)return;

      if(liveRouteLine){liveRouteLine.remove();liveRouteLine=null;}
      if(liveStartMarker){liveStartMarker.remove();liveStartMarker=null;}
      if(livePositionMarker){livePositionMarker.remove();livePositionMarker=null;}

      const points=(liveNavState?.points||[]).filter(point=>
        Number.isFinite(Number(point?.lat))&&Number.isFinite(Number(point?.lon))
      );
      if(!points.length)return;

      const group=L.featureGroup().addTo(liveMap);
      let segment=[];
      let previous=null;

      const addSegment=()=>{
        if(segment.length>=2){
          L.polyline(segment,{weight:6,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(group);
        }
        segment=[];
      };

      points.forEach(point=>{
        const current=[Number(point.lat),Number(point.lon)];
        if(point.gapBefore&&previous){
          addSegment();
          L.polyline([previous,current],{
            weight:4,
            opacity:.55,
            dashArray:'8 10',
            lineCap:'round'
          }).addTo(group).bindTooltip(`GPS-onderbreking ${formatDuration(point.gapDurationMs||0)}`);
        }
        segment.push(current);
        previous=current;
      });
      addSegment();
      liveRouteLine=group;

      const first=[Number(points[0].lat),Number(points[0].lon)];
      const current=[Number(points.at(-1).lat),Number(points.at(-1).lon)];
      liveStartMarker=L.circleMarker(first,{radius:7,weight:3,fillOpacity:1}).addTo(liveMap).bindTooltip('Start');
      livePositionMarker=L.circleMarker(current,{radius:10,weight:4,fillOpacity:1}).addTo(liveMap).bindTooltip('Serenity');

      if(liveNavState.follow){
        liveMap.setView(current,Math.max(liveMap.getZoom(),15),{animate:true});
      }else if(group.getLayers().length&&group.getBounds().isValid()){
        liveMap.fitBounds(group.getBounds(),{padding:[28,28],maxZoom:16});
      }
    };
  }

  // Voeg diagnose toe aan het automatische logboek.
  if(typeof buildAutomaticLiveNotes==='function'){
    const originalBuildAutomaticLiveNotes=buildAutomaticLiveNotes;
    buildAutomaticLiveNotes=function(){
      const extras=[];
      const totalGap=Number(liveNavState?.gpsTotalInterruptedMs||0);
      if(totalGap>0){
        extras.push(`GPS-onderbrekingen totaal: ${formatDuration(totalGap)}. Onderbroken stukken zijn op de kaart als stippellijn gemarkeerd.`);
      }
      return [originalBuildAutomaticLiveNotes(),...extras].filter(Boolean).join('\n');
    };
  }

  if(typeof startLiveNavigation==='function'){
    const originalStartLiveNavigation=startLiveNavigation;
    startLiveNavigation=function(){
      lastHandledTimestamp=0;
      freshFixTimes=[];
      pendingGap=null;
      const result=originalStartLiveNavigation();
      ensureState();
      liveNavState.gpsContinuityHealthy=false;
      liveNavState.gpsRecoveryUntil=now()+HEALTH_FIX_SPAN_MS;
      try{persistLiveState?.();}catch{}
      setTimeout(()=>pollCurrentPosition('start'),300);
      renderGuardUi();
      return result;
    };
  }

  if(typeof restoreLiveState==='function'){
    const originalRestoreLiveState=restoreLiveState;
    restoreLiveState=function(){
      const result=originalRestoreLiveState();
      ensureState();
      lastHandledTimestamp=Number(liveNavState?.lastGpsAt||liveNavState?.points?.at?.(-1)?.time||0);
      if(liveNavState?.status==='active'){
        liveNavState.gpsContinuityHealthy=false;
        liveNavState.gpsRecoveryUntil=now()+RECOVERY_GRACE_MS;
        setTimeout(()=>pollCurrentPosition('herstart'),500);
      }
      renderGuardUi();
      return result;
    };
  }

  if(typeof renderLiveState==='function'){
    const originalRenderLiveState=renderLiveState;
    renderLiveState=function(){
      const result=originalRenderLiveState();
      renderGuardUi();
      return result;
    };
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      if(recordingHere())markInterrupted('MijnSerenity is niet volledig zichtbaar');
    }else{
      setTimeout(()=>pollCurrentPosition('terugkeer'),150);
    }
  });

  window.addEventListener('pageshow',event=>{
    if(event.persisted&&recordingHere()){
      markInterrupted('MijnSerenity is opnieuw geactiveerd');
    }
    setTimeout(()=>pollCurrentPosition('pageshow'),250);
  });

  window.addEventListener('focus',()=>setTimeout(()=>pollCurrentPosition('focus'),200));
  window.addEventListener('online',()=>setTimeout(()=>pollCurrentPosition('online'),200));

  function initialiseContinuityGuard(){
    insertGuardUi();
    ensureState();
    lastHandledTimestamp=Number(liveNavState?.lastGpsAt||liveNavState?.points?.at?.(-1)?.time||0);
    clearInterval(pollTimer);
    pollTimer=setInterval(()=>pollCurrentPosition('5-secondencontrole'),POLL_INTERVAL_MS);
    clearInterval(uiTimer);
    uiTimer=setInterval(continuityWatchdog,2000);
    setTimeout(()=>{
      continuityWatchdog();
      pollCurrentPosition('opstart');
    },1200);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialiseContinuityGuard,{once:true});
  }else{
    initialiseContinuityGuard();
  }

  window.ms739GpsHealthyForArrival=gpsHealthyForArrival;
  window.ms739PollGps=()=>pollCurrentPosition('handmatig');
  window.ms739RenderGpsContinuity=renderGuardUi;
  console.info(`MijnSerenity ${BUILD} GPS Continuity Guard actief.`);
})();
