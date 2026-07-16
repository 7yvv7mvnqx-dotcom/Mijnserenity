
/* ============================================================
   MijnSerenity Cloud 7.0.8 — Eenvoudig automatisch varen
   ============================================================ */

let ms701BootTimer=null;
let ms701Initialising=false;
let ms701CloudCheckBusy=false;

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
    localStorage.setItem(
      ms704DefaultOffKey(),
      '1'
    );
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
      ?'Toon uitgebreid dashboard'
      :'Maak dashboard eenvoudig';
  }
}

function ms701ToggleSimpleMode(){
  ms701WriteBoolean('simple-mode',!ms701SimpleEnabled());
  ms701ApplySimpleMode();
  showAppToast(
    ms701SimpleEnabled()
      ?'Eenvoudig dashboard actief'
      :'Uitgebreid dashboard actief'
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
    autoStopMinutes:Number(
      document.getElementById('liveAutoStopMinutes')?.value||10
    ),
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

  if(typeof loadLiveAutomationSettings==='function'){
    loadLiveAutomationSettings();
  }
}

async function ms701EnsureCloudSharing(){
  if(
    ms701CloudCheckBusy||
    !currentBoat||
    !currentUser
  ){
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
    console.warn(
      'Automatisch live delen kon niet worden voorbereid:',
      error
    );
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

  const title=document.getElementById('ms701AutoTitle');
  const card=document.getElementById('ms701AutoCard');

  card?.classList.toggle('disabled',!enabled);
  card?.classList.toggle('expanded',enabled);
  card?.classList.toggle('collapsed',!enabled);
  card?.setAttribute('aria-expanded',enabled?'true':'false');

  if(!enabled){
    ms701SetText('ms701AutoTitle','Eenvoudig automatisch varen');
    ms701SetText(
      'ms701AutoDetail',
      'Zet de schakelaar aan om de instellingen en actuele status te openen.'
    );
    ms701SetText('ms701DepartureStatus','Uitgeschakeld');
    ms701SetText('ms701ShareStatus','Uitgeschakeld');
    ms701SetText('ms701LogStatus','Handmatig');
    ms701SetText(
      'ms701AutoMessage',
      'Automatisch varen is uitgeschakeld.'
    );
    return;
  }

  const status=liveNavState?.status||'idle';
  const cloudReady=Boolean(
    typeof ms640CloudReady!=='undefined'&&
    ms640CloudReady
  );
  const controller=Boolean(
    typeof ms640IsController==='function'&&
    ms640IsController()
  );

  if(status==='active'){
    ms701SetText('ms701AutoTitle','Serenity vaart · opname actief');
    ms701SetText(
      'ms701AutoDetail',
      'Route, positie en vaargegevens worden automatisch vastgelegd en live gedeeld.'
    );
    ms701SetText('ms701DepartureStatus','Vaart gedetecteerd');
    ms701SetText(
      'ms701ShareStatus',
      cloudReady&&controller
        ?'Live delen actief'
        :'Live delen verbinden…'
    );
    ms701SetText('ms701LogStatus','Wordt opgebouwd');
    ms701SetText(
      'ms701AutoMessage',
      `${Number(liveNavState.distanceKm||0).toFixed(2)} km vastgelegd · na afmeren wordt automatisch afgerond.`
    );
  }else if(status==='paused'){
    ms701SetText('ms701AutoTitle','Opname is gepauzeerd');
    ms701SetText('ms701DepartureStatus','Gepauzeerd');
    ms701SetText('ms701ShareStatus',cloudReady?'Verbonden':'Controleren…');
    ms701SetText('ms701LogStatus','Nog niet opgeslagen');
    ms701SetText(
      'ms701AutoMessage',
      'Hervat de opname om automatisch varen voort te zetten.'
    );
  }else if(status==='stopped'){
    ms701SetText('ms701AutoTitle','Aankomst wordt verwerkt');
    ms701SetText('ms701DepartureStatus','Aangekomen');
    ms701SetText('ms701ShareStatus',cloudReady?'Laatste positie gedeeld':'Controleren…');
    ms701SetText('ms701LogStatus','Automatisch opslaan…');
    ms701SetText(
      'ms701AutoMessage',
      'Vertrek, aankomst, route en foto’s worden in het logboek opgeslagen.'
    );
  }else if(typeof ms680DepartureArmed!=='undefined'&&ms680DepartureArmed){
    ms701SetText('ms701AutoTitle','Automatisch varen staat klaar');
    ms701SetText(
      'ms701AutoDetail',
      'MijnSerenity bewaakt de beweging van Serenity en start vanzelf bij vertrek.'
    );
    ms701SetText('ms701DepartureStatus','Wacht op vertrek');
    ms701SetText(
      'ms701ShareStatus',
      cloudReady
        ?'Automatisch bij vertrek'
        :'Cloud verbinden…'
    );
    ms701SetText('ms701LogStatus','Automatisch');
    ms701SetText(
      'ms701AutoMessage',
      'Laat MijnSerenity geopend. Waterkaarten kun je daarnaast openen via de knop.'
    );
  }else{
    ms701SetText('ms701AutoTitle','Automatisch varen wordt gereedgemaakt');
    ms701SetText('ms701DepartureStatus','GPS voorbereiden…');
    ms701SetText('ms701ShareStatus',cloudReady?'Cloud gereed':'Cloud verbinden…');
    ms701SetText('ms701LogStatus','Automatisch');
    ms701SetText(
      'ms701AutoMessage',
      'Geef locatietoegang wanneer Safari daarom vraagt.'
    );
  }
}

async function ms701EnableAutomaticMode(userGesture=false){
  ms701WriteBoolean('automatic-ready',true);
  ms701SaveForcedAutomationSettings();
  ms701Render();

  if(
    !currentBoat||
    !currentUser||
    ms701Initialising
  ){
    if(userGesture){
      showAppToast('Automatisch varen wordt voorbereid…');
    }
    return;
  }

  ms701Initialising=true;

  try{
    if(typeof initLiveMode==='function'){
      await initLiveMode();
    }

    await ms701EnsureCloudSharing();

    try{
      localStorage.setItem(
        `mijnserenity-auto-departure-armed-${currentBoat.id}`,
        '1'
      );
    }catch{}

    if(
      liveNavState.status==='idle'&&
      typeof ms680DepartureArmed!=='undefined'&&
      !ms680DepartureArmed&&
      typeof ms680ArmDepartureWatch==='function'
    ){
      ms680ArmDepartureWatch();
    }

    if(userGesture){
      showAppToast(
        'Automatisch varen, live delen en opslaan staan aan ✅'
      );
    }
  }finally{
    ms701Initialising=false;
    ms701Render();
  }
}

function ms701DisableAutomaticMode(){
  ms701WriteBoolean('automatic-ready',false);

  try{
    localStorage.setItem(
      `mijnserenity-auto-departure-armed-${currentBoat?.id||'boat'}`,
      '0'
    );
  }catch{}

  if(
    typeof ms680DisarmDepartureWatch==='function'
  ){
    ms680DisarmDepartureWatch({
      silent:true
    });
  }

  ms701Render();
  showAppToast('Automatisch varen staat uit');
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

/* Bij starten altijd direct cloud delen activeren. */
const ms701OriginalStartLiveNavigation=
  startLiveNavigation;

startLiveNavigation=function(){
  const result=
    ms701OriginalStartLiveNavigation();

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

/* Na een opgeslagen of gewiste vaart automatisch klaarzetten voor de volgende. */
const ms701OriginalClearLiveTrip=
  clearLiveTrip;

clearLiveTrip=function(options={}){
  const result=
    ms701OriginalClearLiveTrip(options);

  if(ms701AutomaticEnabled()){
    setTimeout(
      ()=>ms701EnableAutomaticMode(false),
      1400
    );
  }

  ms701Render();
  return result;
};

/* Handmatige wijzigingen van Auto Logbook volgen de hoofdschakelaar. */
const ms701OriginalSaveLiveAutomationSettings=
  saveLiveAutomationSettings;

saveLiveAutomationSettings=function(){
  const result=
    ms701OriginalSaveLiveAutomationSettings();

  const autoStart=Boolean(
    document.getElementById('ms680AutoStart')?.checked
  );

  ms701WriteBoolean(
    'automatic-ready',
    autoStart
  );

  if(autoStart){
    ms701EnableAutomaticMode(false);
  }else{
    ms701DisableAutomaticMode();
  }

  return result;
};

/* Status op dashboard en livepagina synchroon houden. */
const ms701OriginalRenderLiveState=
  renderLiveState;

renderLiveState=function(){
  const result=
    ms701OriginalRenderLiveState();

  ms701Render();
  return result;
};

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
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

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    ms701ApplySimpleMode();
    ms704ApplyDefaultOffOnce();
    ms701Render();

    clearInterval(ms701BootTimer);
    ms701BootTimer=setInterval(
      ms701AutoBoot,
      6000
    );

    setTimeout(ms701AutoBoot,1200);
    setTimeout(ms701AutoBoot,3500);
  }
);
