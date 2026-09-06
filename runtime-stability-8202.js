/* MijnSerenity 8.25.7 — runtime health + live GPS/route reliability */
(()=>{
  'use strict';
  if(window.__msRuntimeStability8202)return;
  window.__msRuntimeStability8202=true;

  const BUILD='8.25.7';
  const STORAGE_KEY='mijnserenity-runtime-errors-8202';
  const MAX_ERRORS=20;
  let checking=false;
  let errors=[];

  try{
    const saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'[]');
    if(Array.isArray(saved))errors=saved.slice(-MAX_ERRORS);
  }catch{}

  function safePath(value){
    try{
      const url=new URL(String(value||''),location.href);
      return url.origin===location.origin?url.pathname:String(url.hostname||'extern');
    }catch{return ''}
  }
  function saveErrors(){
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(errors.slice(-MAX_ERRORS)))}catch{}
  }
  function record(type,message,source='',line=0){
    const text=String(message||'Onbekende runtimefout').slice(0,300);
    const item={at:new Date().toISOString(),type:String(type||'error'),message:text,source:safePath(source),line:Number(line)||0};
    const previous=errors[errors.length-1];
    if(previous&&previous.type===item.type&&previous.message===item.message&&previous.source===item.source){
      previous.at=item.at;
    }else{
      errors.push(item);
      if(errors.length>MAX_ERRORS)errors=errors.slice(-MAX_ERRORS);
    }
    saveErrors();
    window.MIJSERENITY_RUNTIME_ERRORS=[...errors];
  }

  window.addEventListener('error',event=>record('error',event?.message||event?.error?.message,event?.filename,event?.lineno));
  window.addEventListener('unhandledrejection',event=>{
    const reason=event?.reason;
    record('promise',reason?.message||String(reason||'Onbehandelde Promise-fout'));
  });

  function snapshot(){
    const nav=document.querySelector('.bottom-nav');
    const navButtons=nav?.querySelectorAll(':scope > .bottom-nav-item').length||0;
    const homeButton=nav?.querySelector(':scope > .bottom-nav-item[data-target="dashboard"]')||null;
    const marineGlass=[...document.querySelectorAll('#msMarineGlass')];
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    const subPage=Boolean(document.body?.classList.contains('ms8256-sub-page')||document.body?.classList.contains('ms8219-sub-page'));
    return {
      build:String(window.MIJSERENITY_BUILD||BUILD),online:navigator.onLine,visible:!document.hidden,
      appOpen:Boolean(app&&!app.classList.contains('hidden')),dashboardPresent:Boolean(dashboard),marineGlassCount:marineGlass.length,
      navPresent:Boolean(nav),navButtons,homePresent:Boolean(homeButton),subPage,navUnified:Boolean(nav?.classList.contains('ms8202-nav')),
      recentErrors:errors.slice(-5),checkedAt:new Date().toISOString()
    };
  }
  function navigationIsBroken(health){
    if(!health.appOpen)return false;
    if(!health.navPresent)return true;
    if(health.subPage&&!health.homePresent)return true;
    return health.navButtons<1;
  }
  function check(reason='manual'){
    if(checking)return window.MIJSERENITY_RUNTIME_HEALTH||snapshot();
    checking=true;
    try{
      let health=snapshot();
      const navBroken=navigationIsBroken(health);
      if(navBroken&&typeof window.ms8202RepairUnifiedUi==='function'){
        try{window.ms8202RepairUnifiedUi()}catch(error){record('repair',error?.message||error)}
        health=snapshot();
      }
      health.navigationBroken=navigationIsBroken(health);
      health.reason=reason;
      window.MIJSERENITY_RUNTIME_HEALTH=health;
      window.dispatchEvent(new CustomEvent('mijnserenity:runtime-health',{detail:health}));
      return health;
    }finally{checking=false}
  }

  window.msMijnSerenityHealth=()=>check('manual');
  window.msMijnSerenityRuntimeErrors=()=>[...errors];
  window.msMijnSerenityClearRuntimeErrors=()=>{
    errors=[];saveErrors();window.MIJSERENITY_RUNTIME_ERRORS=[];return check('errors-cleared');
  };
  ['mijnserenity:boot-complete','mijnserenity:dashboard-ready','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,()=>setTimeout(()=>check(name),50),{passive:true}));
  window.addEventListener('pageshow',()=>setTimeout(()=>check('pageshow'),50),{passive:true});
  window.addEventListener('online',()=>check('online'),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check('visible')},{passive:true});
  setInterval(()=>{if(!document.hidden)check('periodic')},60000);
  setTimeout(()=>check('startup'),1500);
})();

/* MijnSerenity 8.25.7 — Live varen: betrouwbare snelheid, GPS-watchdog en crash-safe autosave. */
(()=>{
  'use strict';
  if(window.__msLiveNavReliability8257)return;
  window.__msLiveNavReliability8257=true;

  const POLL_STALE_MS=6500;
  const RESTART_STALE_MS=14000;
  const AUTO_STOP_FRESH_MS=16000;
  const MAX_RELIABLE_ACCURACY_M=80;
  const MAX_BOAT_SPEED_KMH=45;
  const CHECK_INTERVAL_MS=3000;
  const CHECKPOINT_INTERVAL_MS=5000;
  const BACKUP_MAX_AGE_MS=24*60*60*1000;

  let installed=false;
  let lastReliableFixAt=0;
  let lastAcceptedTimestamp=0;
  let pollBusy=false;
  let lastRestartAt=0;
  let hiddenAt=0;
  let watchdogTimer=null;
  let checkpointTimer=null;
  let rawPoints=[];
  let recentSelectedSpeeds=[];

  const now=()=>Date.now();
  const finite=value=>Number.isFinite(Number(value));
  const median=values=>{
    const list=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!list.length)return 0;
    const middle=Math.floor(list.length/2);
    return list.length%2?list[middle]:(list[middle-1]+list[middle])/2;
  };
  const distanceKm=(a,b)=>{
    const R=6371;
    const rad=value=>Number(value)*Math.PI/180;
    const dLat=rad(Number(b.lat)-Number(a.lat));
    const dLon=rad(Number(b.lon)-Number(a.lon));
    const lat1=rad(a.lat),lat2=rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  };

  function isController(){
    try{return typeof ms640IsController!=='function'||ms640IsController()}catch{return true}
  }
  function isActive(){
    try{return typeof liveNavState!=='undefined'&&liveNavState?.status==='active'&&isController()}catch{return false}
  }
  function lastPointTime(){
    try{return Number(liveNavState?.lastGpsAt||liveNavState?.points?.at?.(-1)?.time||lastReliableFixAt||0)}catch{return lastReliableFixAt}
  }
  function backupKey(){
    let boat='serenity';
    try{boat=currentBoat?.id||boat}catch{}
    return `mijnserenity-live-emergency-${boat}`;
  }
  function saveEmergencyCheckpoint(){
    if(!isActive())return;
    try{
      persistLiveState?.();
      localStorage.setItem(backupKey(),JSON.stringify({savedAt:now(),state:liveNavState}));
    }catch(error){console.warn('Live checkpoint bewaren mislukt:',error)}
  }
  function clearEmergencyCheckpoint(){
    try{localStorage.removeItem(backupKey())}catch{}
  }
  function restoreEmergencyCheckpointIfNeeded(){
    try{
      if(typeof liveStorageKey!=='function')return;
      const primary=localStorage.getItem(liveStorageKey());
      if(primary)return;
      const backup=JSON.parse(localStorage.getItem(backupKey())||'null');
      if(!backup?.state||backup.state.status!=='active')return;
      if(now()-Number(backup.savedAt||0)>BACKUP_MAX_AGE_MS)return;
      localStorage.setItem(liveStorageKey(),JSON.stringify(backup.state));
    }catch{}
  }

  function reliablePosition(position){
    const coords=position?.coords;
    if(!coords)return position;
    const point={
      lat:Number(coords.latitude),lon:Number(coords.longitude),time:Number(position.timestamp)||now(),
      accuracy:Number(coords.accuracy)||999,
      deviceSpeed:Number.isFinite(coords.speed)?Math.max(0,Number(coords.speed)*3.6):null
    };
    if(!finite(point.lat)||!finite(point.lon))return position;

    rawPoints=rawPoints.filter(item=>point.time-item.time<=15000).slice(-10);
    let previous=null;
    for(let i=rawPoints.length-1;i>=0;i--){
      const age=point.time-rawPoints[i].time;
      if(age>=2000&&age<=12000){previous=rawPoints[i];break}
    }
    if(!previous)previous=rawPoints.at(-1)||null;

    let fallbackSpeed=null;
    if(previous&&point.time>previous.time){
      const seconds=(point.time-previous.time)/1000;
      if(seconds>=1&&seconds<=15){
        const metres=distanceKm(previous,point)*1000;
        const noise=Math.max(3,Math.min(20,(Number(previous.accuracy||0)+point.accuracy)*0.22));
        fallbackSpeed=metres>noise?(metres/seconds)*3.6:0;
        if(!Number.isFinite(fallbackSpeed)||fallbackSpeed>MAX_BOAT_SPEED_KMH*1.8)fallbackSpeed=null;
      }
    }
    rawPoints.push(point);

    const deviceUsable=Number.isFinite(point.deviceSpeed)&&point.accuracy<=50&&point.deviceSpeed<=MAX_BOAT_SPEED_KMH*1.35;
    const fallbackUsable=Number.isFinite(fallbackSpeed)&&point.accuracy<=MAX_RELIABLE_ACCURACY_M;
    let selected=0;

    if(deviceUsable&&point.deviceSpeed>=0.3&&fallbackUsable&&fallbackSpeed>=0.3){
      const difference=Math.abs(point.deviceSpeed-fallbackSpeed);
      const mismatch=difference>Math.max(3.5,fallbackSpeed*.55);
      selected=mismatch?fallbackSpeed:(point.deviceSpeed*.72+fallbackSpeed*.28);
    }else if(deviceUsable&&point.deviceSpeed>=0.3){
      selected=point.deviceSpeed;
    }else if(fallbackUsable&&fallbackSpeed>=0.5){
      selected=fallbackSpeed;
    }

    selected=Math.max(0,Math.min(MAX_BOAT_SPEED_KMH,selected));
    recentSelectedSpeeds.push(selected);
    recentSelectedSpeeds=recentSelectedSpeeds.slice(-5);
    if(recentSelectedSpeeds.length>=3&&selected>1){
      const baseline=median(recentSelectedSpeeds.slice(-3));
      if(selected-baseline>5&&selected>baseline*1.7)selected=baseline;
    }

    return {
      timestamp:point.time,
      coords:{
        latitude:point.lat,longitude:point.lon,accuracy:point.accuracy,
        altitude:coords.altitude,altitudeAccuracy:coords.altitudeAccuracy,
        heading:coords.heading,speed:selected/3.6
      }
    };
  }

  function markFresh(position){
    const timestamp=Number(position?.timestamp)||now();
    const accuracy=Number(position?.coords?.accuracy)||999;
    if(accuracy<=MAX_RELIABLE_ACCURACY_M){
      lastReliableFixAt=Math.max(lastReliableFixAt,timestamp);
      lastAcceptedTimestamp=Math.max(lastAcceptedTimestamp,timestamp);
    }
  }

  function cancelFalseArrivalOnGpsGap(){
    try{
      clearLiveAutoStopTimer?.();
      if(liveNavState){
        liveNavState.stationarySince=null;
        liveNavState.autoStopTriggered=false;
      }
    }catch{}
  }

  function restartGps(reason='GPS herstellen'){
    if(!isActive()||document.hidden)return;
    if(now()-lastRestartAt<6000)return;
    lastRestartAt=now();
    cancelFalseArrivalOnGpsGap();
    try{stopLiveGpsWatch?.()}catch{}
    try{startLiveGpsWatch?.()}catch(error){console.warn('GPS-watch herstart mislukt:',error)}
    try{requestLiveWakeLock?.()}catch{}
    const target=document.getElementById('liveGpsStatus');
    if(target)target.textContent=`${reason}… route-opname blijft actief.`;
  }

  function pollFreshPosition(){
    if(pollBusy||!isActive()||document.hidden||!navigator.geolocation)return;
    pollBusy=true;
    navigator.geolocation.getCurrentPosition(
      position=>{
        pollBusy=false;
        try{handleLivePosition(position)}catch(error){console.warn('GPS-herstelpunt verwerken mislukt:',error)}
      },
      ()=>{pollBusy=false},
      {enableHighAccuracy:true,maximumAge:0,timeout:8000}
    );
  }

  function watchdog(){
    if(!isActive()||document.hidden)return;
    const fix=lastPointTime();
    const age=fix?now()-fix:Infinity;
    if(age>POLL_STALE_MS){
      cancelFalseArrivalOnGpsGap();
      pollFreshPosition();
    }
    if(age>RESTART_STALE_MS)restartGps('Geen nieuwe GPS-positie');
    saveEmergencyCheckpoint();
  }

  async function resumeAfterBackground(){
    const gapMs=hiddenAt?now()-hiddenAt:0;
    hiddenAt=0;
    if(!isActive())return;
    restartGps('Terug op het scherm');
    if(!navigator.geolocation)return;

    navigator.geolocation.getCurrentPosition(async position=>{
      try{
        handleLivePosition(position);

        const speed=Number(liveNavState?.speedKmh||0);
        const settings=typeof readLiveAutomationSettings==='function'?readLiveAutomationSettings():null;
        const stopMinutes=Number(settings?.autoStopMinutes||10);
        const longEnough=gapMs>=stopMinutes*60000;
        const qualifies=typeof liveTripQualifiesForAutoSave==='function'?liveTripQualifiesForAutoSave():true;
        const moved=Boolean(liveNavState?.movingDetected||Number(liveNavState?.distanceKm||0)>=0.2);

        if(settings?.autoStop&&longEnough&&Number.isFinite(speed)&&speed<1.5&&moved&&qualifies){
          liveNavState.backgroundRecovery=true;
          liveNavState.backgroundGapMinutes=Math.round(gapMs/60000);
          persistLiveState?.();
          await stopLiveNavigation({automatic:true,recovered:true});
        }
      }catch(error){console.warn('Live opname hervatten na achtergrond mislukt:',error)}
    },()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:12000});
  }

  function install(){
    if(installed)return true;
    if(typeof handleLivePosition!=='function'||typeof startLiveGpsWatch!=='function'||typeof persistLiveState!=='function')return false;
    installed=true;

    if(typeof restoreLiveState==='function'){
      const originalRestore=restoreLiveState;
      restoreLiveState=function(){
        restoreEmergencyCheckpointIfNeeded();
        return originalRestore.apply(this,arguments);
      };
    }

    const originalHandle=handleLivePosition;
    handleLivePosition=function(position){
      const timestamp=Number(position?.timestamp)||now();
      const accuracy=Number(position?.coords?.accuracy)||999;
      if(lastAcceptedTimestamp&&timestamp<=lastAcceptedTimestamp&&accuracy<=MAX_RELIABLE_ACCURACY_M)return;
      const normal=reliablePosition(position);
      markFresh(normal);
      const result=originalHandle(normal);
      saveEmergencyCheckpoint();
      return result;
    };

    if(typeof stopLiveNavigation==='function'){
      const originalStop=stopLiveNavigation;
      stopLiveNavigation=async function(options={}){
        if(Boolean(options?.automatic)&&isActive()){
          const age=now()-Math.max(lastReliableFixAt,lastPointTime());
          if(!Number.isFinite(age)||age>AUTO_STOP_FRESH_MS){
            cancelFalseArrivalOnGpsGap();
            restartGps('Automatisch stoppen uitgesteld: GPS controleren');
            pollFreshPosition();
            saveEmergencyCheckpoint();
            return false;
          }
        }
        return originalStop.apply(this,arguments);
      };
    }

    if(typeof saveLiveTrip==='function'){
      const originalSave=saveLiveTrip;
      saveLiveTrip=async function(){
        const result=await originalSave.apply(this,arguments);
        if(result)clearEmergencyCheckpoint();
        else saveEmergencyCheckpoint();
        return result;
      };
    }

    if(typeof clearLiveTrip==='function'){
      const originalClear=clearLiveTrip;
      clearLiveTrip=function(){
        const result=originalClear.apply(this,arguments);
        clearEmergencyCheckpoint();
        return result;
      };
    }

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){hiddenAt=now();saveEmergencyCheckpoint()}
      else resumeAfterBackground();
    },{passive:true});
    window.addEventListener('pagehide',saveEmergencyCheckpoint,{passive:true});
    window.addEventListener('pageshow',()=>{if(isActive())resumeAfterBackground()},{passive:true});
    window.addEventListener('online',()=>{if(isActive()){restartGps('Verbinding hersteld');pollFreshPosition()}},{passive:true});

    watchdogTimer=setInterval(watchdog,CHECK_INTERVAL_MS);
    checkpointTimer=setInterval(saveEmergencyCheckpoint,CHECKPOINT_INTERVAL_MS);
    window.ms8257LiveNavStatus=()=>({
      active:isActive(),lastFixAt:lastPointTime(),ageMs:lastPointTime()?now()-lastPointTime():null,
      lastReliableFixAt,backupKey:backupKey(),build:'8.25.7'
    });
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=80)clearInterval(timer);
    },250);
  }
})();

/* Captain AI Pro 8.20.3 — laad alleen als verrijking van de bestaande Captain. */
(()=>{
  'use strict';
  if(window.__msCaptainAiProLoader8203)return;
  window.__msCaptainAiProLoader8203=true;
  function load(){
    if(window.__msCaptainAiPro8203||document.querySelector('script[data-ms-captain-pro]'))return;
    const script=document.createElement('script');
    script.src='/captain-ai-pro-8203.js?v=820300';
    script.async=true;
    script.dataset.msCaptainPro='1';
    script.onerror=()=>console.warn('Captain AI Pro kon niet worden geladen.');
    document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
