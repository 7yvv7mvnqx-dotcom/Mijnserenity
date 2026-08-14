/* MijnSerenity 7.15.43 — windpijl blijft geografisch naar de windrichting wijzen */
(()=>{
  'use strict';
  if(window.__msWindDirectionFix71543)return;
  window.__msWindDirectionFix71543=true;

  const $=id=>document.getElementById(id);
  const norm=value=>{
    const n=Number(value);
    return Number.isFinite(n)?((n%360)+360)%360:null;
  };

  const CARDINAL={
    N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,
    Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5
  };

  let deviceHeading=null;
  let orientationListening=false;
  let compassEnabled=false;

  function text(id){
    return ($(id)?.textContent||'').trim();
  }

  function directionFromText(source){
    const value=String(source||'').trim();
    if(!value)return null;

    const degreeMatch=value.match(/(-?\d{1,3}(?:[.,]\d+)?)\s*°/);
    if(degreeMatch)return norm(String(degreeMatch[1]).replace(',','.'));

    const compassMatch=value.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    return compassMatch ? CARDINAL[compassMatch[1].toUpperCase()] ?? null : null;
  }

  function windFrom(){
    const candidates=[
      window.liveNavState?.weather?.windDirection,
      window.liveNavState?.weather?.wind_direction,
      window.liveNavState?.weather?.windDir,
      window.liveNavState?.weather?.windDirectionDegrees
    ];
    for(const candidate of candidates){
      const direct=norm(candidate);
      if(direct!==null)return direct;
      const parsed=directionFromText(candidate);
      if(parsed!==null)return parsed;
    }

    const sources=[
      text('ivmsWeatherWind'),
      text('ms71512WindDirection'),
      text('weatherWindDirection'),
      text('ms793WeatherWindDirection')
    ];
    for(const source of sources){
      const parsed=directionFromText(source);
      if(parsed!==null)return parsed;
    }
    return null;
  }

  function compassLabel(deg){
    if(deg===null)return '';
    const labels=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return labels[Math.round(deg/22.5)%16];
  }

  function screenRotationClockwise(){
    try{
      if(screen.orientation && Number.isFinite(Number(screen.orientation.angle))){
        return Number(screen.orientation.angle);
      }
    }catch{}
    const legacy=Number(window.orientation);
    return Number.isFinite(legacy)?-legacy:0;
  }

  function handleOrientation(event){
    let heading=null;

    if(Number.isFinite(Number(event.webkitCompassHeading))){
      heading=Number(event.webkitCompassHeading);
    }else if(event.absolute && Number.isFinite(Number(event.alpha))){
      heading=360-Number(event.alpha);
    }else if(Number.isFinite(Number(event.alpha))){
      heading=360-Number(event.alpha);
    }

    if(heading===null)return;

    heading=norm(heading-screenRotationClockwise());
    if(heading===null)return;

    deviceHeading=heading;
    window.__msWindDeviceHeading=heading;
    compassEnabled=true;
    updateCompassButton();
    sync();
  }

  function startListening(){
    if(orientationListening)return;
    orientationListening=true;
    window.addEventListener('deviceorientationabsolute',handleOrientation,true);
    window.addEventListener('deviceorientation',handleOrientation,true);
  }

  function ensureCompassButton(){
    const card=document.querySelector('.msc-wind');
    if(!card||$('mscWindCompassEnable'))return;

    const button=document.createElement('button');
    button.id='mscWindCompassEnable';
    button.type='button';
    button.textContent='🧭 Richting activeren';
    button.setAttribute('aria-label','Activeer iPhone kompas voor geografische windpijl');
    button.style.cssText='position:absolute;right:14px;top:48px;z-index:5;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:7px 10px;background:rgba(3,20,34,.82);color:#eef6ff;font:700 11px/1 system-ui;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    card.style.position='relative';
    button.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await enableCompass();
    },true);
    card.appendChild(button);
    updateCompassButton();
  }

  function updateCompassButton(){
    const button=$('mscWindCompassEnable');
    if(!button)return;
    if(deviceHeading!==null){
      button.textContent='🧭 Kompas actief';
      button.style.opacity='.72';
      window.setTimeout(()=>{if(button&&deviceHeading!==null)button.style.display='none';},1600);
    }else{
      button.style.display='block';
      button.style.opacity='1';
      button.textContent=compassEnabled?'🧭 Wachten op richting':'🧭 Richting activeren';
    }
  }

  async function enableCompass(){
    const button=$('mscWindCompassEnable');
    try{
      if(typeof DeviceOrientationEvent!=='undefined' &&
         typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          if(button)button.textContent='🧭 Toestemming nodig';
          return false;
        }
      }
      compassEnabled=true;
      try{localStorage.setItem('ms71543_world_wind_compass','1')}catch{}
      startListening();
      if(button)button.textContent='🧭 Kompas starten…';
      return true;
    }catch(error){
      console.warn('Windkompas kon niet worden geactiveerd:',error);
      if(button)button.textContent='🧭 Probeer opnieuw';
      return false;
    }
  }

  function sync(){
    ensureCompassButton();

    const topLabel=document.querySelector('.msc-wind-top small');
    if(topLabel)topLabel.textContent=deviceHeading===null?'Wind waait naar · kompas nodig':'Wind waait naar';

    const from=windFrom();
    if(from===null){
      const deg=$('mscWindDeg');
      if(deg)deg.textContent='richting –';
      return;
    }

    // Weerbron = waarVANDAAN de wind komt. MijnSerenity toont waarHEEN hij waait.
    const to=norm(from+180);
    if(to===null)return;

    const rounded=Math.round(to)%360;
    const degrees=String(rounded).padStart(3,'0')+'°';
    const label=compassLabel(to);

    const deg=$('mscWindDeg');
    if(deg)deg.textContent=degrees+(label?' '+label:'');

    const awa=$('mscAwa');
    if(awa)awa.textContent=degrees;

    const arrow=$('mscWindArrow');
    if(arrow){
      // Met kompas: corrigeer voor de richting waarin de bovenkant van het scherm wijst.
      // Zo blijft de pijlpunt fysiek dezelfde geografische windrichting aanwijzen.
      // Zonder kompas valt hij tijdelijk terug op noord-boven.
      const displayRotation=deviceHeading===null?to:norm(to-deviceHeading);
      arrow.style.transform=`translate(-50%,-100%) rotate(${displayRotation}deg)`;
      arrow.dataset.windTo=String(to);
      arrow.dataset.deviceHeading=deviceHeading===null?'':String(deviceHeading);
    }
  }

  function install(){
    ensureCompassButton();
    let enabled=false;
    try{enabled=localStorage.getItem('ms71543_world_wind_compass')==='1'}catch{}
    if(enabled){
      compassEnabled=true;
      // Werkt direct wanneer de browser de eerder gegeven toestemming bewaart.
      startListening();
    }

    sync();
    [
      'mijnserenity-ha-state-updated',
      'mijnserenity-ha-connected',
      'mijnserenity:weather-updated',
      'mijnserenity-weather-updated'
    ].forEach(name=>window.addEventListener(name,sync,{passive:true}));

    window.addEventListener('orientationchange',()=>setTimeout(sync,150),{passive:true});
    try{screen.orientation?.addEventListener?.('change',()=>setTimeout(sync,100));}catch{}

    setInterval(()=>{if(!document.hidden)sync()},500);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')sync();
    });
  }

  window.ms71543EnableWorldWindCompass=enableCompass;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
