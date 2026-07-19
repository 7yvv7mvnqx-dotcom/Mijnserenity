/* ============================================================
   MijnSerenity Cloud 7.4.1 — Automatische beste GPS-bron
   Eén recorder, GPS-watchdog, herstel na onderbreking en diagnose
   ============================================================ */
(()=>{
  'use strict';

  const BUILD='7.4.1';
  const CLAIM_TTL_MS=120000;
  const CLAIM_RENEW_MS=30000;
  const GPS_STALE_MS=18000;
  const MAX_ACCEPTED_ACCURACY_M=75;
  const MAX_TRACKING_SPEED_KMH=180;
  const GPS_METRIC_WINDOW_MS=30000;

  let watchdogTimer=null;
  let claimTimer=null;
  let claimGranted=false;
  let claimOwner='';
  let hiddenAt=0;
  let lastRawPoint=null;
  let recentSpeeds=[];
  let gpsTestWatchId=null;
  let gpsTestTimer=null;
  let gpsTestPoints=[];
  let restartingGps=false;
  let gpsFixHistory=[];
  let gpsAccuracyHistory=[];
  let lastSourceAssessment='GPS-bron bepalen';

  function el(id){return document.getElementById(id);}
  function now(){return Date.now();}
  function deviceId(){
    return typeof ms640DeviceId==='function'
      ?ms640DeviceId()
      :'unknown-device';
  }
  function boatId(){return currentBoat?.id||'geen-boot';}
  function cleanMetricHistory(timestamp=now()){
    gpsFixHistory=gpsFixHistory.filter(value=>timestamp-value<=GPS_METRIC_WINDOW_MS);
    gpsAccuracyHistory=gpsAccuracyHistory.slice(-30);
  }
  function recordGpsMetric(position){
    const timestamp=Number(position?.timestamp)||now();
    gpsFixHistory.push(timestamp);
    const accuracy=Number(position?.coords?.accuracy);
    if(Number.isFinite(accuracy))gpsAccuracyHistory.push(accuracy);
    cleanMetricHistory(timestamp);
  }
  function gpsRateHz(){
    if(gpsFixHistory.length<2)return 0;
    const span=(gpsFixHistory.at(-1)-gpsFixHistory[0])/1000;
    return span>0?(gpsFixHistory.length-1)/span:0;
  }
  function medianAccuracy(){return median(gpsAccuracyHistory);}
  function externalGpsLikely(){
    const rate=gpsRateHz();
    const accuracy=medianAccuracy();
    // Safari benoemt de hardwarebron niet. iPadOS/iOS kiest zelf de best
    // beschikbare locatiebron. Een hoge updatefrequentie gecombineerd met
    // goede nauwkeurigheid is een aanwijzing voor Garmin/externe GPS.
    return (rate>=0.75&&accuracy>0&&accuracy<=15)||(rate>=0.35&&accuracy>0&&accuracy<=8);
  }
  function gpsSourceAssessment(){
    const accuracy=medianAccuracy();
    if(externalGpsLikely())return 'Beste bron: Garmin / externe GPS waarschijnlijk';
    if(accuracy>0&&accuracy<=25)return 'Beste bron: iOS GPS / locatie actief';
    return 'Automatisch beste GPS-bron bepalen';
  }
  function updateGpsSourceUi(){
    const rate=gpsRateHz();
    const accuracy=medianAccuracy();
    const external=externalGpsLikely();
    lastSourceAssessment=gpsSourceAssessment();
    const detail=[
      lastSourceAssessment,
      rate>0?`${rate.toFixed(1)} meting/sec`:'updatefrequentie nog onbekend',
      accuracy>0?`mediaan ${Math.round(accuracy)} m`:'nauwkeurigheid nog onbekend'
    ].join(' · ');
    setText('ms736GpsMetrics',detail);
    setText('ms736LiveGpsSource',detail);
    setBadge(
      'ms736SourceBadge',
      external?'Garmin/externe GPS waarschijnlijk':'Automatische GPS-keuze',
      external?'success':'muted'
    );
    window.ms736GpsMetrics={
      rateHz:rate,
      medianAccuracy:accuracy,
      source:lastSourceAssessment,
      externalGpsLikely:external,
      automaticSelection:true
    };
  }
  // Achterwaartse compatibiliteit met een eventueel oud gecachet scherm.
  window.ms736SetGarminPreferred=function(){
    recentSpeeds=[];
    lastRawPoint=null;
    updateGpsSourceUi();
    showAppToast('Automatische GPS-bronselectie is altijd actief.');
  };
  function automaticEnabled(){
    return typeof ms701AutomaticEnabled==='function'&&ms701AutomaticEnabled();
  }
  function isController(){
    return typeof ms640IsController==='function'&&ms640IsController();
  }
  function lastPoint(){return liveNavState?.points?.at?.(-1)||null;}
  function lastFixAt(){
    return Number(
      liveNavState?.lastGpsAt||
      lastPoint()?.time||
      0
    );
  }
  function formatAge(timestamp){
    if(!timestamp)return 'nog geen GPS-punt';
    const seconds=Math.max(0,Math.round((now()-timestamp)/1000));
    if(seconds<60)return `${seconds} sec geleden`;
    return `${Math.floor(seconds/60)} min geleden`;
  }
  function median(values){
    const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!sorted.length)return 0;
    const middle=Math.floor(sorted.length/2);
    return sorted.length%2
      ?sorted[middle]
      :(sorted[middle-1]+sorted[middle])/2;
  }
  function setText(id,value){
    const node=el(id);
    if(node)node.textContent=String(value??'');
  }
  function setBadge(id,text,state='ready'){
    const node=el(id);
    if(!node)return;
    node.textContent=text;
    node.className=`ms735-badge ${state}`;
  }
  function statusState(){
    const status=liveNavState?.status||'idle';
    const age=lastFixAt()?now()-lastFixAt():Infinity;
    if(document.hidden)return 'background';
    if(status==='active'&&age>GPS_STALE_MS)return 'error';
    if(status==='active')return 'live';
    if(typeof ms680DepartureArmed!=='undefined'&&ms680DepartureArmed)return 'armed';
    if(automaticEnabled())return 'ready';
    return 'off';
  }
  function renderReliability(){
    const state=statusState();
    const status=liveNavState?.status||'idle';
    const age=lastFixAt()?now()-lastFixAt():Infinity;
    const accuracy=Number(liveNavState?.accuracy);
    const points=Number(liveNavState?.points?.length||0);

    const titles={
      background:'Registratie kan zijn onderbroken',
      error:'GPS-signaal wordt hersteld',
      live:'GPS-opname werkt',
      armed:'Wacht op vertrek',
      ready:'Automatisch varen is gereed',
      off:'Automatisch varen staat uit'
    };
    const details={
      background:'MijnSerenity stond niet op het scherm. Open de app; de route wordt vanaf de nieuwste GPS-positie hervat.',
      error:`Laatste GPS-punt ${formatAge(lastFixAt())}. MijnSerenity start de GPS-watch opnieuw.`,
      live:`${points} routepunten · laatste GPS-punt ${formatAge(lastFixAt())}${Number.isFinite(accuracy)?` · nauwkeurigheid ${Math.round(accuracy)} m`:''}.`,
      armed:'Dit apparaat bewaakt de beweging. Laat MijnSerenity zichtbaar; het scherm wordt zo veel mogelijk wakker gehouden.',
      ready:claimGranted?'Dit apparaat is aangewezen als GPS-recorder.':'Recorder wordt gecontroleerd…',
      off:'Schakel automatisch varen in op één iPhone of iPad. Andere apparaten kijken daarna live mee.'
    };

    setText('ms735ReliabilityTitle',titles[state]);
    setText('ms735ReliabilityDetail',details[state]);
    setText('ms735LiveReliability',details[state]);

    setBadge(
      'ms735GpsBadge',
      status==='active'
        ?(age<=GPS_STALE_MS?'GPS actief':'GPS herstellen')
        :(typeof ms680DepartureArmed!=='undefined'&&ms680DepartureArmed?'GPS wacht':'GPS gereed'),
      status==='active'&&age<=GPS_STALE_MS?'success':
        status==='active'?'error':
          automaticEnabled()?'warning':'muted'
    );
    setBadge(
      'ms735DeviceBadge',
      claimGranted?'Dit apparaat registreert':claimOwner?`${claimOwner} registreert`:'Recorder kiezen',
      claimGranted?'success':claimOwner?'warning':'muted'
    );
    setBadge(
      'ms735CloudBadge',
      typeof ms640CloudReady!=='undefined'&&ms640CloudReady?'Delen verbonden':'Delen controleren',
      typeof ms640CloudReady!=='undefined'&&ms640CloudReady?'success':'warning'
    );

    updateGpsSourceUi();
    document.body.classList.toggle('ms735-tracking-warning',state==='background'||state==='error');
  }

  function claimFromRow(row){
    return row?.state?.autoRecorderClaim||null;
  }
  function claimIsFresh(claim){
    return Boolean(
      claim?.deviceId&&
      Number(claim.expiresAt)>now()
    );
  }
  async function readCloudRow(){
    if(!currentBoat||!currentUser||typeof sb==='undefined')return null;
    const {data,error}=await sb
      .from('live_navigation_state')
      .select('*')
      .eq('boat_id',currentBoat.id)
      .maybeSingle();
    if(error)throw error;
    return data||null;
  }
  async function writeClaim(row,claim){
    const baseState={
      ...createEmptyLiveState(),
      ...(row?.state||{}),
      autoRecorderClaim:claim
    };
    const status=['active','paused'].includes(row?.status)
      ?row.status
      :'idle';
    const controllerDeviceId=['active','paused'].includes(status)
      ?row?.controller_device_id
      :claim?.deviceId||row?.controller_device_id||null;
    const controllerName=['active','paused'].includes(status)
      ?row?.controller_name
      :claim?.name||row?.controller_name||null;

    const {error}=await sb
      .from('live_navigation_state')
      .upsert({
        boat_id:currentBoat.id,
        session_id:row?.session_id||null,
        status,
        controller_user_id:row?.controller_user_id||currentUser.id,
        controller_device_id:controllerDeviceId,
        controller_name:controllerName,
        state:baseState,
        updated_at:new Date().toISOString()
      },{onConflict:'boat_id'});
    if(error)throw error;
  }
  async function claimRecorder(options={}){
    if(!currentBoat||!currentUser)return false;
    try{
      const row=await readCloudRow();
      const existing=claimFromRow(row);
      const otherActive=
        ['active','paused'].includes(row?.status)&&
        row?.controller_device_id&&
        row.controller_device_id!==deviceId();
      const otherClaim=
        claimIsFresh(existing)&&
        existing.deviceId!==deviceId();

      if(otherActive||otherClaim){
        claimGranted=false;
        claimOwner=String(
          row?.controller_name||
          existing?.name||
          'Ander apparaat'
        );
        renderReliability();
        if(!options.silent){
          showAppToast(`${claimOwner} registreert. Dit apparaat kijkt live mee.`);
        }
        return false;
      }

      const claim={
        deviceId:deviceId(),
        userId:currentUser.id,
        name:typeof getLoggedInFirstName==='function'
          ?getLoggedInFirstName()
          :'Schipper',
        claimedAt:existing?.deviceId===deviceId()
          ?Number(existing.claimedAt||now())
          :now(),
        expiresAt:now()+CLAIM_TTL_MS,
        build:BUILD
      };
      await writeClaim(row,claim);

      const verify=await readCloudRow();
      const verified=claimFromRow(verify);
      claimGranted=verified?.deviceId===deviceId();
      claimOwner=claimGranted?'':String(verified?.name||'Ander apparaat');
      if(claimGranted){
        liveNavState.autoRecorderClaim=claim;
        liveNavState.gpsSource=lastSourceAssessment;
        liveNavState.gpsRateHz=Number(gpsRateHz().toFixed(2));
        liveNavState.externalGpsLikely=externalGpsLikely();
        liveNavState.gpsSelectionMode='automatic';
        persistLiveState();
      }
      renderReliability();
      return claimGranted;
    }catch(error){
      console.warn('Recorderclaim controleren mislukt:',error);
      // Bij een tijdelijke netwerkstoring mag de lokale opname doorgaan.
      claimGranted=true;
      claimOwner='';
      renderReliability();
      return true;
    }
  }
  async function renewClaim(){
    if(!automaticEnabled()||document.hidden||!claimGranted)return;
    await claimRecorder({silent:true});
  }
  async function releaseClaim(){
    if(!currentBoat||!currentUser||!claimGranted)return;
    try{
      const row=await readCloudRow();
      const existing=claimFromRow(row);
      if(existing?.deviceId===deviceId()){
        await writeClaim(row,null);
      }
    }catch(error){
      console.warn('Recorderclaim vrijgeven mislukt:',error);
    }finally{
      claimGranted=false;
      claimOwner='';
      renderReliability();
    }
  }

  function requestRecorderWakeLock(){
    if(typeof requestLiveWakeLock==='function'&&!document.hidden){
      requestLiveWakeLock();
    }
  }
  function stopGpsTest(){
    if(gpsTestWatchId!==null&&navigator.geolocation){
      navigator.geolocation.clearWatch(gpsTestWatchId);
    }
    gpsTestWatchId=null;
    clearTimeout(gpsTestTimer);
    gpsTestTimer=null;
  }
  window.ms735RunGpsTest=function(){
    if(!navigator.geolocation){
      showAppToast('Dit apparaat ondersteunt geen GPS.');
      return;
    }
    stopGpsTest();
    gpsTestPoints=[];
    gpsFixHistory=[];
    gpsAccuracyHistory=[];
    setText('ms735ReliabilityTitle','GPS-brontest loopt…');
    setText('ms735ReliabilityDetail','Beweeg enkele meters en laat MijnSerenity op het scherm staan.');
    gpsTestWatchId=navigator.geolocation.watchPosition(position=>{
      recordGpsMetric(position);
      gpsTestPoints.push({
        lat:Number(position.coords.latitude),
        lon:Number(position.coords.longitude),
        accuracy:Number(position.coords.accuracy),
        speed:Number.isFinite(position.coords.speed)
          ?Math.max(0,position.coords.speed*3.6)
          :0,
        time:Number(position.timestamp)||now()
      });
      const first=gpsTestPoints[0];
      const last=gpsTestPoints.at(-1);
      const distance=first&&last&&typeof haversineKm==='function'
        ?haversineKm(first,last)
        :0;
      updateGpsSourceUi();
      setText(
        'ms735ReliabilityDetail',
        `${gpsTestPoints.length} GPS-metingen · ${gpsRateHz().toFixed(1)} per sec · nauwkeurigheid ${Math.round(last.accuracy||0)} m · verplaatsing ${(distance*1000).toFixed(0)} m.`
      );
    },error=>{
      stopGpsTest();
      setText('ms735ReliabilityTitle','GPS-test mislukt');
      setText('ms735ReliabilityDetail',error?.message||'Controleer de locatietoegang.');
    },{
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:15000
    });
    gpsTestTimer=setTimeout(()=>{
      stopGpsTest();
      const acceptable=gpsTestPoints.some(point=>point.accuracy<=MAX_ACCEPTED_ACCURACY_M);
      const externalLikely=gpsRateHz()>=0.75&&medianAccuracy()>0&&medianAccuracy()<=15;
      updateGpsSourceUi();
      setText('ms735ReliabilityTitle',acceptable?'GPS-brontest geslaagd':'GPS-signaal onvoldoende');
      setText(
        'ms735ReliabilityDetail',
        acceptable
          ?`${gpsTestPoints.length} metingen ontvangen · ${gpsRateHz().toFixed(1)} per sec. ${externalLikely?'Garmin/externe GPS lijkt automatisch actief.':'iOS gebruikt de beste beschikbare GPS-bron; Garmin wordt automatisch overgenomen zodra deze gekoppeld en bruikbaar is.'}`
          :'Ga naar buiten, controleer Locatievoorzieningen en de Bluetooth-koppeling en probeer opnieuw.'
      );
    },30000);
  };

  function enhancedPosition(position){
    recordGpsMetric(position);
    updateGpsSourceUi();
    const coords=position?.coords;
    if(!coords)return position;
    const point={
      lat:Number(coords.latitude),
      lon:Number(coords.longitude),
      time:Number(position.timestamp)||now(),
      accuracy:Number(coords.accuracy)||999,
      deviceSpeed:Number.isFinite(coords.speed)
        ?Math.max(0,coords.speed*3.6)
        :0
    };
    let calculated=0;
    if(lastRawPoint&&Number.isFinite(point.lat)&&Number.isFinite(point.lon)){
      const seconds=Math.max(1,(point.time-lastRawPoint.time)/1000);
      calculated=haversineKm(lastRawPoint,point)/(seconds/3600);
    }
    lastRawPoint=point;
    const calculatedSpeed=Number.isFinite(calculated)?calculated:0;
    let selectedSpeed;
    const accurateFix=point.accuracy<=40;
    const usableDeviceSpeed=Number.isFinite(coords.speed)&&accurateFix;
    // iOS kiest automatisch Garmin wanneer die gekoppeld en bruikbaar is.
    // MijnSerenity gebruikt de door iOS geleverde Doppler-snelheid wanneer
    // die betrouwbaar is en valt bij een tijdelijke nulmeting terug op de
    // snelheid die uit opeenvolgende posities is berekend.
    if(usableDeviceSpeed&&point.deviceSpeed>=0.3){
      selectedSpeed=point.deviceSpeed;
    }else if(calculatedSpeed>=1.2){
      selectedSpeed=calculatedSpeed;
    }else{
      selectedSpeed=0;
    }
    const candidate=Math.min(MAX_TRACKING_SPEED_KMH,Math.max(0,selectedSpeed));
    recentSpeeds.push(candidate);
    recentSpeeds=recentSpeeds.slice(-3);
    // Garmin/iOS Doppler-snelheid is bij een nauwkeurige fix de beste bron.
    // Alleen de uit positieverschil berekende reservesnelheid wordt licht gefilterd.
    const smoothed=usableDeviceSpeed&&point.deviceSpeed>=0.3
      ?candidate
      :median(recentSpeeds);
    return {
      timestamp:point.time,
      coords:{
        latitude:point.lat,
        longitude:point.lon,
        accuracy:point.accuracy,
        altitude:coords.altitude,
        altitudeAccuracy:coords.altitudeAccuracy,
        heading:coords.heading,
        speed:smoothed/3.6
      }
    };
  }

  async function restartGps(reason='GPS-watchdog'){
    if(restartingGps||document.hidden)return;
    restartingGps=true;
    try{
      if(liveNavState?.status==='active'){
        stopLiveGpsWatch();
        startLiveGpsWatch();
      }else if(typeof ms680DepartureArmed!=='undefined'&&ms680DepartureArmed){
        ms680StopDepartureWatch?.();
        ms680ArmDepartureWatch?.();
      }
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
          position=>{
            if(liveNavState?.status==='active')handleLivePosition(position);
          },
          ()=>{},
          {enableHighAccuracy:true,maximumAge:0,timeout:12000}
        );
      }
      setText('ms735ReliabilityDetail',`${reason}: GPS opnieuw gestart.`);
    }finally{
      setTimeout(()=>{restartingGps=false;},2500);
    }
  }

  async function resumeAfterBackground(){
    const gapMs=hiddenAt?now()-hiddenAt:0;
    hiddenAt=0;
    requestRecorderWakeLock();

    if(liveNavState?.status==='active'){
      await restartGps('Terug op het scherm');
      navigator.geolocation?.getCurrentPosition(async position=>{
        const speed=Number.isFinite(position.coords.speed)
          ?Math.max(0,position.coords.speed*3.6)
          :0;
        handleLivePosition(position);

        const settings=readLiveAutomationSettings();
        const longEnough=gapMs>=Number(settings.autoStopMinutes||10)*60000;
        const qualifies=typeof liveTripQualifiesForAutoSave==='function'&&liveTripQualifiesForAutoSave();
        if(longEnough&&speed<1.5&&liveNavState.movingDetected&&qualifies){
          liveNavState.backgroundRecovery=true;
          liveNavState.backgroundGapMinutes=Math.round(gapMs/60000);
          if(typeof ms680AddEvent==='function'){
            ms680AddEvent(
              'arrival',
              `Na ${Math.round(gapMs/60000)} minuten achtergrond automatisch afgerond`,
              lastPoint(),
              {dedupe:false}
            );
          }
          persistLiveState();
          await stopLiveNavigation({automatic:true,recovered:true});
        }
      },()=>{}, {enableHighAccuracy:true,maximumAge:0,timeout:15000});
    }else if(automaticEnabled()&&liveNavState?.status==='idle'){
      const claimed=await claimRecorder({silent:true});
      if(claimed&&typeof ms680ArmDepartureWatch==='function'){
        ms680ArmDepartureWatch();
      }
    }
  }

  function watchdog(){
    renderReliability();
    if(document.hidden||!automaticEnabled())return;
    requestRecorderWakeLock();

    if(liveNavState?.status==='active'){
      const age=lastFixAt()?now()-lastFixAt():Infinity;
      if(age>GPS_STALE_MS)restartGps('Geen nieuwe GPS-punten');
    }else if(
      liveNavState?.status==='idle'&&
      claimGranted&&
      typeof ms680DepartureArmed!=='undefined'&&
      !ms680DepartureArmed
    ){
      ms680ArmDepartureWatch?.();
    }
  }

  // Nieuwe velden in iedere live-status.
  if(typeof createEmptyLiveState==='function'){
    const originalCreateEmptyLiveState=createEmptyLiveState;
    createEmptyLiveState=function(){
      return {
        ...originalCreateEmptyLiveState(),
        lastGpsAt:null,
        gpsGapCount:0,
        backgroundRecovery:false,
        backgroundGapMinutes:0,
        autoRecorderClaim:null,
        gpsSource:'',
        gpsRateHz:0,
        externalGpsLikely:false,
        gpsSelectionMode:'automatic'
      };
    };
  }

  // Eén recorder claimen voordat automatische vertrekdetectie wordt gestart.
  if(typeof ms701EnableAutomaticMode==='function'){
    const originalEnableAutomaticMode=ms701EnableAutomaticMode;
    ms701EnableAutomaticMode=async function(userGesture=false){
      if(userGesture){
        requestRecorderWakeLock();
        try{
          await new Promise(resolve=>{
            navigator.geolocation?.getCurrentPosition(
              ()=>resolve(),
              ()=>resolve(),
              {enableHighAccuracy:true,maximumAge:0,timeout:10000}
            );
          });
        }catch{}
      }
      const claimed=await claimRecorder({silent:!userGesture});
      if(!claimed){
        if(typeof ms701WriteBoolean==='function')ms701WriteBoolean('automatic-ready',false);
        const toggle=el('ms701AutoToggle');
        if(toggle)toggle.checked=false;
        renderReliability();
        return false;
      }
      requestRecorderWakeLock();
      const result=await originalEnableAutomaticMode(userGesture);
      renderReliability();
      return result;
    };
  }

  if(typeof ms701DisableAutomaticMode==='function'){
    const originalDisableAutomaticMode=ms701DisableAutomaticMode;
    ms701DisableAutomaticMode=function(){
      const result=originalDisableAutomaticMode();
      releaseLiveWakeLock?.();
      releaseClaim();
      renderReliability();
      return result;
    };
  }

  if(typeof ms680ArmDepartureWatch==='function'){
    const originalArmDepartureWatch=ms680ArmDepartureWatch;
    ms680ArmDepartureWatch=function(){
      if(!claimGranted){
        claimRecorder({silent:true}).then(granted=>{
          if(granted){
            requestRecorderWakeLock();
            originalArmDepartureWatch();
            renderReliability();
          }
        });
        return;
      }
      requestRecorderWakeLock();
      const result=originalArmDepartureWatch();
      renderReliability();
      return result;
    };
  }

  if(typeof startLiveNavigation==='function'){
    const originalStartLiveNavigation=startLiveNavigation;
    startLiveNavigation=function(){
      const result=originalStartLiveNavigation();
      liveNavState.lastGpsAt=now();
      liveNavState.autoRecorderClaim={
        deviceId:deviceId(),
        name:typeof getLoggedInFirstName==='function'?getLoggedInFirstName():'Schipper',
        expiresAt:now()+CLAIM_TTL_MS,
        build:BUILD
      };
      claimGranted=true;
      requestRecorderWakeLock();
      persistLiveState();
      renderReliability();
      return result;
    };
  }

  // Verbeterde snelheid en GPS-gezondheid; afstand blijft alleen uit geldige punten komen.
  if(typeof handleLivePosition==='function'){
    const originalHandleLivePosition=handleLivePosition;
    handleLivePosition=function(position){
      const accuracy=Number(position?.coords?.accuracy)||999;
      const statusBefore=liveNavState?.status;
      if(statusBefore==='active'&&accuracy>MAX_ACCEPTED_ACCURACY_M){
        liveNavState.accuracy=accuracy;
        setText('liveGpsStatus',`GPS-signaal te onnauwkeurig (${Math.round(accuracy)} m). Wachten op beter punt…`);
        renderReliability();
        return;
      }
      const beforeDistance=Number(liveNavState?.distanceKm||0);
      const beforePoints=Number(liveNavState?.points?.length||0);
      const result=originalHandleLivePosition(enhancedPosition(position));
      if(statusBefore==='active'){
        liveNavState.lastGpsAt=Number(position?.timestamp)||now();
        const afterPoints=Number(liveNavState?.points?.length||0);
        const previous=afterPoints>beforePoints
          ?liveNavState.points.at(-2)
          :null;
        const current=afterPoints>beforePoints
          ?liveNavState.points.at(-1)
          :null;
        if(previous&&current){
          const segmentM=haversineKm(previous,current)*1000;
          const noiseFloor=externalGpsLikely()
            ?Math.max(2,Math.min(10,(Number(current.accuracy)||0)*.18))
            :Math.max(3,Math.min(18,(Number(current.accuracy)||0)*.25));
          if(segmentM<noiseFloor&&Number(liveNavState.speedKmh||0)<1.2){
            liveNavState.distanceKm=beforeDistance;
          }
        }
        persistLiveState();
      }
      renderReliability();
      return result;
    };
  }

  if(typeof handleLivePositionError==='function'){
    const originalPositionError=handleLivePositionError;
    handleLivePositionError=function(error){
      const result=originalPositionError(error);
      setText('ms735ReliabilityTitle','GPS-fout');
      setText('ms735ReliabilityDetail',error?.message||'Controleer de locatietoegang.');
      renderReliability();
      return result;
    };
  }

  // Een actieve automatische opname na een korte herstart automatisch hervatten.
  if(typeof restoreLiveState==='function'){
    const originalRestoreLiveState=restoreLiveState;
    restoreLiveState=function(){
      let saved=null;
      try{saved=JSON.parse(localStorage.getItem(liveStorageKey())||'null');}catch{}
      const result=originalRestoreLiveState();
      const savedLast=Number(saved?.lastGpsAt||saved?.points?.at?.(-1)?.time||0);
      const recoverable=
        saved?.status==='active'&&
        automaticEnabled()&&
        savedLast&&
        now()-savedLast<12*60*60*1000;
      if(recoverable){
        const elapsedAtLastFix=
          Number(saved.accumulatedMs||0)+
          Math.max(0,savedLast-Number(saved.segmentStartedAt||savedLast));
        liveNavState.accumulatedMs=elapsedAtLastFix;
        liveNavState.segmentStartedAt=now();
        liveNavState.status='active';
        liveNavState.gpsGapCount=Number(liveNavState.gpsGapCount||0)+1;
        liveNavState.lastGpsAt=savedLast;
        persistLiveState();
        setTimeout(()=>{
          requestRecorderWakeLock();
          startLiveGpsWatch();
          renderLiveState();
          renderReliability();
        },500);
      }
      return result;
    };
  }

  if(typeof stopLiveNavigation==='function'){
    const originalStopLiveNavigation=stopLiveNavigation;
    stopLiveNavigation=async function(options={}){
      const result=await originalStopLiveNavigation(options);
      renderReliability();
      return result;
    };
  }

  if(typeof saveLiveTrip==='function'){
    const originalSaveLiveTrip=saveLiveTrip;
    saveLiveTrip=async function(options={}){
      const result=await originalSaveLiveTrip(options);
      if(typeof ms640ScheduleSync==='function')ms640ScheduleSync(true);
      renderReliability();
      return result;
    };
  }

  if(typeof buildAutomaticLiveNotes==='function'){
    const originalBuildNotes=buildAutomaticLiveNotes;
    buildAutomaticLiveNotes=function(){
      const extras=[];
      if(Number(liveNavState?.gpsGapCount||0)>0){
        extras.push(`GPS-opname ${liveNavState.gpsGapCount} keer automatisch hervat.`);
      }
      if(liveNavState?.backgroundRecovery){
        extras.push(`Aankomst na een achtergrondonderbreking van circa ${Number(liveNavState.backgroundGapMinutes||0)} minuten automatisch hersteld. Het onderbroken routedeel kan als rechte verbinding zijn weergegeven.`);
      }
      return [originalBuildNotes(),...extras].filter(Boolean).join('\n');
    };
  }

  if(typeof renderLiveState==='function'){
    const originalRenderLiveState=renderLiveState;
    renderLiveState=function(){
      const result=originalRenderLiveState();
      renderReliability();
      return result;
    };
  }

  window.addEventListener('mijnserenity:boat-ready',updateGpsSourceUi);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      hiddenAt=now();
      renderReliability();
    }else{
      resumeAfterBackground();
    }
  });
  window.addEventListener('online',()=>{
    claimRecorder({silent:true});
    watchdog();
  },{passive:true});
  window.addEventListener('beforeunload',()=>{
    stopGpsTest();
  });

  function initialiseReliability(){
    renderReliability();
    clearInterval(watchdogTimer);
    watchdogTimer=setInterval(watchdog,8000);
    clearInterval(claimTimer);
    claimTimer=setInterval(renewClaim,CLAIM_RENEW_MS);
    setTimeout(async()=>{
      if(automaticEnabled()){
        claimGranted=await claimRecorder({silent:true});
        if(claimGranted)requestRecorderWakeLock();
      }
      watchdog();
    },1800);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialiseReliability,{once:true});
  }else{
    initialiseReliability();
  }

  window.ms735ClaimRecorder=claimRecorder;
  window.ms735RenderReliability=renderReliability;
})();
