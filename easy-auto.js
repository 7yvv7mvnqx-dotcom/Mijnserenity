/* ============================================================
   MijnSerenity Cloud 7.18.14 — Vaarassistent met bevestiging
   Detecteert vertrek/aankomst, maar de schipper bevestigt start/stop.
   ============================================================ */

let ms701BootTimer=null;
let ms701Initialising=false;
let ms701CloudCheckBusy=false;
let ms701DepartureDetectionCall=false;
let ms701DepartureConfirmed=false;
let ms701DepartureSnoozeUntil=0;
let ms701PendingArrivalReminder=false;
let ms701AutomaticStopBypass=false;

const MS701_STOP_MINUTES=15;
const MS701_DEPARTURE_SNOOZE_MS=5*60*1000;
const MS701_CONFIRM_ABORT={code:'MS701_CONFIRM_ABORT'};

function ms701Key(name){
  return `mijnserenity-701-${name}-${currentBoat?.id||'boat'}`;
}

function ms701ReadBoolean(name,defaultValue=false){
  try{
    const value=localStorage.getItem(ms701Key(name));
    return value===null?defaultValue:value==='1';
  }catch{
    return defaultValue;
  }
}

function ms701WriteBoolean(name,value){
  try{
    localStorage.setItem(ms701Key(name),value?'1':'0');
  }catch{}
}

function ms701AutomaticEnabled(){
  return ms701ReadBoolean('automatic-ready',false);
}

function ms704DefaultOffKey(){
  return `mijnserenity-704-default-off-${currentBoat?.id||'boat'}`;
}

function ms704ApplyDefaultOffOnce(){
  if(!currentBoat)return;

  try{
    if(localStorage.getItem(ms704DefaultOffKey())==='1'){
      return;
    }

    ms701WriteBoolean('automatic-ready',false);
    localStorage.setItem(
      `mijnserenity-auto-departure-armed-${currentBoat.id}`,
      '0'
    );
    localStorage.setItem(ms704DefaultOffKey(),'1');
  }catch{}
}

function ms701SimpleEnabled(){
  return ms701ReadBoolean('simple-mode',true);
}

function ms701ApplySimpleMode(){
  const simple=ms701SimpleEnabled();
  document.body.classList.toggle('ms701-simple-mode',simple);

  const button=document.getElementById('ms701SimpleToggle');
  if(button){
    button.textContent=simple
      ?'Toon uitgebreid overzicht'
      :'Maak startscherm eenvoudig';
  }
}

function ms701ToggleSimpleMode(){
  ms701WriteBoolean('simple-mode',!ms701SimpleEnabled());
  ms701ApplySimpleMode();
  showAppToast(
    ms701SimpleEnabled()
      ?'Eenvoudig startscherm actief'
      :'Uitgebreid startscherm actief'
  );
}

function ms701SaveForcedAutomationSettings(){
  const current={
    ...(
      typeof readLiveAutomationSettings==='function'
        ?readLiveAutomationSettings()
        :{}
    ),
    autoStart:true,
    autoSave:true,
    autoStop:true,
    autoStopMinutes:MS701_STOP_MINUTES,
    startSpeedKmh:Number(
      document.getElementById('ms680StartSpeed')?.value||2
    ),
    startConfirmSeconds:Number(
      document.getElementById('ms680StartSeconds')?.value||15
    ),
    stopEventMinutes:Number(
      document.getElementById('ms680StopEventMinutes')?.value||3
    ),
    minDistanceKm:Number(
      document.getElementById('liveAutoMinDistance')?.value||.2
    ),
    minDurationMinutes:3
  };

  try{
    localStorage.setItem(
      liveAutomationStorageKey(),
      JSON.stringify(current)
    );
  }catch{}

  if(document.getElementById('ms680AutoStart')){
    document.getElementById('ms680AutoStart').checked=true;
  }
  if(document.getElementById('liveAutoSave')){
    document.getElementById('liveAutoSave').checked=true;
  }
  if(document.getElementById('liveAutoStop')){
    document.getElementById('liveAutoStop').checked=true;
  }
  if(document.getElementById('liveAutoStopMinutes')){
    document.getElementById('liveAutoStopMinutes').value=String(MS701_STOP_MINUTES);
  }

  if(typeof loadLiveAutomationSettings==='function'){
    loadLiveAutomationSettings();
  }
}

async function ms701EnsureCloudSharing(){
  if(ms701CloudCheckBusy||!currentBoat||!currentUser){
    return false;
  }

  ms701CloudCheckBusy=true;

  try{
    if(typeof ms640EnsureCloud==='function'){
      const ready=await ms640EnsureCloud();

      if(
        ready&&
        typeof ms640IsController==='function'&&
        ms640IsController()&&
        typeof ms640ScheduleSync==='function'
      ){
        ms640ScheduleSync(true);
      }

      return Boolean(ready);
    }

    return false;
  }catch(error){
    console.warn('Live delen kon niet worden voorbereid:',error);
    return false;
  }finally{
    ms701CloudCheckBusy=false;
  }
}

function ms701SetText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=value;
}

function ms701Render(){
  const enabled=ms701AutomaticEnabled();
  const toggle=document.getElementById('ms701AutoToggle');

  if(toggle)toggle.checked=enabled;

  const card=document.getElementById('ms701AutoCard');
  card?.classList.toggle('disabled',!enabled);
  card?.classList.toggle('expanded',enabled);
  card?.classList.toggle('collapsed',!enabled);
  card?.setAttribute('aria-expanded',enabled?'true':'false');

  if(!enabled){
    ms701SetText('ms701AutoTitle','Vaarassistent');
    ms701SetText(
      'ms701AutoDetail',
      'Zet de schakelaar aan om vertrek en aankomst automatisch te laten herkennen.'
    );
    ms701SetText('ms701DepartureStatus','Uitgeschakeld');
    ms701SetText('ms701ShareStatus','Uitgeschakeld');
    ms701SetText('ms701LogStatus','Handmatig');
    ms701SetText('ms701AutoMessage','Vaarassistent is uitgeschakeld.');
    return;
  }

  const status=liveNavState?.status||'idle';
  const cloudReady=Boolean(
    typeof ms640CloudReady!=='undefined'&&ms640CloudReady
  );
  const controller=Boolean(
    typeof ms640IsController==='function'&&ms640IsController()
  );
  const snoozed=Date.now()<ms701DepartureSnoozeUntil;

  if(status==='active'){
    ms701SetText('ms701AutoTitle','Serenity vaart · opname actief');
    ms701SetText(
      'ms701AutoDetail',
      'Route, positie en vaargegevens worden vastgelegd. Bij langdurige stilstand vraagt MijnSerenity eerst om bevestiging.'
    );
    ms701SetText('ms701DepartureStatus','Vaart actief');
    ms701SetText(
      'ms701ShareStatus',
      cloudReady&&controller?'Live delen actief':'Live delen verbinden…'
    );
    ms701SetText('ms701LogStatus','Wordt opgebouwd');
    ms701SetText(
      'ms701AutoMessage',
      `${Number(liveNavState.distanceKm||0).toFixed(2)} km vastgelegd · na ${MS701_STOP_MINUTES} min stilstand vraag ik of de route mag worden beëindigd.`
    );
  }else if(status==='paused'){
    ms701SetText('ms701AutoTitle','Opname is gepauzeerd');
    ms701SetText('ms701DepartureStatus','Gepauzeerd');
    ms701SetText('ms701ShareStatus',cloudReady?'Verbonden':'Controleren…');
    ms701SetText('ms701LogStatus','Nog niet opgeslagen');
    ms701SetText('ms701AutoMessage','Hervat de opname om verder te registreren.');
  }else if(status==='stopped'){
    ms701SetText('ms701AutoTitle','Aankomst bevestigd');
    ms701SetText('ms701DepartureStatus','Aangekomen');
    ms701SetText('ms701ShareStatus',cloudReady?'Laatste positie gedeeld':'Controleren…');
    ms701SetText('ms701LogStatus','Opslaan…');
    ms701SetText('ms701AutoMessage','De bevestigde vaart wordt afgerond en opgeslagen.');
  }else if(snoozed){
    const minutes=Math.max(1,Math.ceil((ms701DepartureSnoozeUntil-Date.now())/60000));
    ms701SetText('ms701AutoTitle','Vertrekherinnering uitgesteld');
    ms701SetText('ms701DepartureStatus',`Opnieuw over ${minutes} min`);
    ms701SetText('ms701ShareStatus',cloudReady?'Cloud gereed':'Cloud verbinden…');
    ms701SetText('ms701LogStatus','Wacht op bevestiging');
    ms701SetText(
      'ms701AutoMessage',
      'Je koos Niet nu. MijnSerenity vraagt straks opnieuw als de route nog niet is gestart.'
    );
  }else if(typeof ms680DepartureArmed!=='undefined'&&ms680DepartureArmed){
    ms701SetText('ms701AutoTitle','Vaarassistent staat klaar');
    ms701SetText(
      'ms701AutoDetail',
      'MijnSerenity bewaakt de beweging van Serenity en vraagt bij vertrek of de route-opname gestart moet worden.'
    );
    ms701SetText('ms701DepartureStatus','Wacht op vertrek');
    ms701SetText('ms701ShareStatus',cloudReady?'Gereed':'Cloud verbinden…');
    ms701SetText('ms701LogStatus','Bevestiging gevraagd');
    ms701SetText(
      'ms701AutoMessage',
      'Laat MijnSerenity geopend en zichtbaar; bij gedetecteerd vertrek verschijnt een bevestiging.'
    );
  }else{
    ms701SetText('ms701AutoTitle','Vaarassistent wordt gereedgemaakt');
    ms701SetText('ms701DepartureStatus','GPS voorbereiden…');
    ms701SetText('ms701ShareStatus',cloudReady?'Cloud gereed':'Cloud verbinden…');
    ms701SetText('ms701LogStatus','Bevestiging gevraagd');
    ms701SetText('ms701AutoMessage','Geef locatietoegang wanneer Safari daarom vraagt.');
  }
}

async function ms701EnableAutomaticMode(userGesture=false){
  ms701WriteBoolean('automatic-ready',true);
  ms701SaveForcedAutomationSettings();
  ms701Render();

  if(!currentBoat||!currentUser||ms701Initialising){
    if(userGesture){
      showAppToast('Vaarassistent wordt voorbereid…');
    }
    return;
  }

  ms701Initialising=true;

  try{
    if(typeof initLiveMode==='function'){
      await initLiveMode();
    }

    await ms701EnsureCloudSharing();

    const snoozed=Date.now()<ms701DepartureSnoozeUntil;
    try{
      localStorage.setItem(
        `mijnserenity-auto-departure-armed-${currentBoat.id}`,
        snoozed?'0':'1'
      );
    }catch{}

    if(
      !snoozed&&
      liveNavState.status==='idle'&&
      typeof ms680DepartureArmed!=='undefined'&&
      !ms680DepartureArmed&&
      typeof ms680ArmDepartureWatch==='function'
    ){
      ms680ArmDepartureWatch();
    }

    if(userGesture){
      showAppToast('Vaarassistent en live delen staan aan ✅');
    }
  }finally{
    ms701Initialising=false;
    ms701Render();
  }
}

function ms701DisableAutomaticMode(){
  ms701WriteBoolean('automatic-ready',false);
  ms701DepartureSnoozeUntil=0;
  ms701PendingArrivalReminder=false;

  try{
    localStorage.setItem(
      `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`,
      '0'
    );
  }catch{}

  if(typeof ms680DisarmDepartureWatch==='function'){
    ms680DisarmDepartureWatch({silent:true});
  }

  ms701Render();
  showAppToast('Vaarassistent staat uit');
}

function ms704HeaderClicked(event){
  if(
    event.target.closest('.ms701-switch')||
    event.target.closest('button')||
    event.target.closest('a')
  ){
    return;
  }

  document.getElementById('ms701AutoToggle')?.focus();
}

function ms701AutoToggleChanged(input){
  if(input.checked){
    ms701EnableAutomaticMode(true);
  }else{
    ms701DisableAutomaticMode();
  }
}

async function ms701AutoBoot(){
  ms701ApplySimpleMode();
  ms704ApplyDefaultOffOnce();

  if(
    !ms701AutomaticEnabled()||
    document.hidden||
    !currentBoat||
    !currentUser
  ){
    ms701Render();
    return;
  }

  ms701SaveForcedAutomationSettings();

  if(Date.now()<ms701DepartureSnoozeUntil){
    await ms701EnsureCloudSharing();
    ms701Render();
    return;
  }

  if(ms701DepartureSnoozeUntil){
    ms701DepartureSnoozeUntil=0;
  }

  if(
    liveNavState?.status==='idle'&&
    (
      typeof ms680DepartureArmed==='undefined'||
      !ms680DepartureArmed
    )
  ){
    await ms701EnableAutomaticMode(false);
  }else{
    await ms701EnsureCloudSharing();
    ms701Render();
  }
}

function ms701AskStartConfirmation(){
  return window.confirm(
    '🛥️ Vertrek gedetecteerd\n\n'+
    'Het lijkt erop dat Serenity is vertrokken.\n\n'+
    'Wil je de route-opname nu starten?'
  );
}

function ms701AskStopConfirmation(){
  return window.confirm(
    `⚓ Stilstand gedetecteerd\n\nSerenity ligt al ongeveer ${MS701_STOP_MINUTES} minuten stil.\n\nWil je de route beëindigen en opslaan?`
  );
}

/* Bij starten altijd direct cloud delen activeren. Vertrekdetectie vraagt eerst bevestiging. */
const ms701OriginalStartLiveNavigation=startLiveNavigation;

startLiveNavigation=function(...args){
  if(ms701DepartureDetectionCall&&!ms701DepartureConfirmed){
    if(!ms701AskStartConfirmation()){
      ms701DepartureSnoozeUntil=Date.now()+MS701_DEPARTURE_SNOOZE_MS;
      try{
        localStorage.setItem(
          `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`,
          '0'
        );
      }catch{}
      throw MS701_CONFIRM_ABORT;
    }
    ms701DepartureConfirmed=true;
  }

  const result=ms701OriginalStartLiveNavigation.apply(this,args);

  setTimeout(async()=>{
    await ms701EnsureCloudSharing();

    if(
      typeof ms640ScheduleSync==='function'&&
      typeof ms640IsController==='function'&&
      ms640IsController()
    ){
      ms640ScheduleSync(true);
    }

    ms701Render();
  },120);

  return result;
};

/* De bestaande vertrekdetectie blijft intact; alleen het daadwerkelijk starten vereist bevestiging. */
if(typeof ms680HandleDepartureWatch==='function'){
  const ms701OriginalHandleDepartureWatch=ms680HandleDepartureWatch;

  ms680HandleDepartureWatch=async function(position){
    if(Date.now()<ms701DepartureSnoozeUntil)return;

    ms701DepartureDetectionCall=true;
    ms701DepartureConfirmed=false;

    try{
      const result=await ms701OriginalHandleDepartureWatch(position);

      if(ms701DepartureConfirmed&&liveNavState?.status==='active'){
        liveNavState.autoStarted=false;
        liveNavState.startConfirmedAt=Date.now();

        if(Array.isArray(liveNavState.autoEvents)){
          for(let i=liveNavState.autoEvents.length-1;i>=0;i--){
            const event=liveNavState.autoEvents[i];
            if(event?.type==='departure'){
              event.details='Vertrek gedetecteerd · route gestart na bevestiging';
              break;
            }
          }
        }

        if(typeof persistLiveState==='function')persistLiveState();
        if(typeof renderLiveState==='function')renderLiveState();
        if(typeof renderLiveRoute==='function')renderLiveRoute();
        showAppToast('Route gestart na jouw bevestiging ✅');
      }

      return result;
    }catch(error){
      if(error===MS701_CONFIRM_ABORT||error?.code==='MS701_CONFIRM_ABORT'){
        if(typeof setLiveAutoLogStatus==='function'){
          setLiveAutoLogStatus(
            'Vertrek gezien · herinnering 5 minuten uitgesteld.',
            'warning'
          );
        }
        ms701Render();
        return;
      }
      throw error;
    }finally{
      ms701DepartureDetectionCall=false;
      ms701DepartureConfirmed=false;
    }
  };
}

/* Iedere automatische stoproute (ook herstel na GPS-onderbreking) vraagt eerst toestemming. */
const ms701OriginalStopLiveNavigation=stopLiveNavigation;

function ms701ResetAutomaticStopAfterDecline(){
  if(!liveNavState)return;

  liveNavState.autoStopTriggered=false;

  if(typeof ms680CancelArrivalDetection==='function'){
    ms680CancelArrivalDetection();
  }else{
    liveNavState.arrivalIgnoredUntilMove=true;
    liveNavState.stationarySince=null;
    if(typeof clearLiveAutoStopTimer==='function')clearLiveAutoStopTimer();
    if(typeof persistLiveState==='function')persistLiveState();
    if(typeof renderLiveState==='function')renderLiveState();
  }

  if(typeof setLiveAutoLogStatus==='function'){
    setLiveAutoLogStatus(
      'Stilstand gezien · route blijft doorlopen. Na nieuwe beweging wordt aankomst opnieuw bewaakt.',
      'warning'
    );
  }
}

function ms701HandleAutomaticStopRequest(options={}){
  if(document.hidden){
    ms701PendingArrivalReminder=true;
    if(liveNavState)liveNavState.autoStopTriggered=false;
    if(typeof clearLiveAutoStopTimer==='function')clearLiveAutoStopTimer();
    if(typeof persistLiveState==='function')persistLiveState();
    return false;
  }

  ms701PendingArrivalReminder=false;

  if(!ms701AskStopConfirmation()){
    ms701ResetAutomaticStopAfterDecline();
    showAppToast('Route blijft actief · aankomst niet bevestigd');
    ms701Render();
    return false;
  }

  ms701AutomaticStopBypass=true;
  try{
    const result=ms701OriginalStopLiveNavigation.call(
      this,
      {...options,automatic:true,confirmedByUser:true}
    );
    showAppToast('Aankomst bevestigd · route wordt opgeslagen ✅');
    return result;
  }finally{
    ms701AutomaticStopBypass=false;
  }
}

stopLiveNavigation=function(options={}){
  if(options?.automatic&&!ms701AutomaticStopBypass){
    return ms701HandleAutomaticStopRequest(options);
  }
  return ms701OriginalStopLiveNavigation.apply(this,arguments);
};

/* Na een opgeslagen of gewiste vaart de assistent opnieuw klaarzetten. */
const ms701OriginalClearLiveTrip=clearLiveTrip;

clearLiveTrip=function(options={}){
  const result=ms701OriginalClearLiveTrip(options);

  if(ms701AutomaticEnabled()){
    setTimeout(()=>ms701EnableAutomaticMode(false),1400);
  }

  ms701Render();
  return result;
};

/* Handmatige wijzigingen van Auto Logbook volgen de hoofdschakelaar. */
const ms701OriginalSaveLiveAutomationSettings=saveLiveAutomationSettings;

saveLiveAutomationSettings=function(){
  const result=ms701OriginalSaveLiveAutomationSettings();

  const autoStart=Boolean(
    document.getElementById('ms680AutoStart')?.checked
  );

  ms701WriteBoolean('automatic-ready',autoStart);

  if(autoStart){
    ms701SaveForcedAutomationSettings();
    ms701EnableAutomaticMode(false);
  }else{
    ms701DisableAutomaticMode();
  }

  return result;
};

/* Status op dashboard en livepagina synchroon houden. */
const ms701OriginalRenderLiveState=renderLiveState;

renderLiveState=function(){
  const result=ms701OriginalRenderLiveState();
  ms701Render();
  return result;
};

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
      if(
        ms701PendingArrivalReminder&&
        liveNavState?.status==='active'
      ){
        setTimeout(
          ()=>ms701HandleAutomaticStopRequest({automatic:true,recovered:true}),
          350
        );
      }
      ms701AutoBoot();
    }
  }
);

window.addEventListener(
  'online',
  ()=>{
    ms701EnsureCloudSharing();
    ms701Render();
  },
  {passive:true}
);

function ms739InitialiseEasyAuto(){
  ms701ApplySimpleMode();
  ms704ApplyDefaultOffOnce();
  ms701Render();

  clearInterval(ms701BootTimer);
  ms701BootTimer=setInterval(ms701AutoBoot,6000);

  setTimeout(ms701AutoBoot,1200);
  setTimeout(ms701AutoBoot,3500);
}

if(document.readyState==='loading'){
  document.addEventListener(
    'DOMContentLoaded',
    ms739InitialiseEasyAuto,
    {once:true}
  );
}else{
  ms739InitialiseEasyAuto();
}
