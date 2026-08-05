/* ============================================================
   MijnSerenity Cloud 8.0.0 — Buienradar op actuele positie
   ============================================================ */

const MS710_RADAR_REFRESH_MS=5*60*1000;
const MS710_RADAR_LOCATION_MS=20*1000;
const MS710_RADAR_MOVE_KM=1.5;
const MS710_RADAR_MODE_KEY='mijnserenity_buienradar_mode';

let ms710RadarBusy=false;
let ms710RadarRefreshTimer=null;
let ms710RadarLocationTimer=null;
let ms710RadarLastRefresh=0;
let ms710RadarCoordinates=null;
let ms710RadarMode=localStorage.getItem(MS710_RADAR_MODE_KEY)==='past'
  ?'past'
  :'forecast';

function ms710RadarPageVisible(){
  const active=document.querySelector('.bottom-nav-item.active')?.dataset.target;
  if(active==='weather')return document.visibilityState==='visible';

  try{
    return typeof ms708CurrentPageId==='function'&&
      ms708CurrentPageId()==='weather'&&
      document.visibilityState==='visible';
  }catch{
    return false;
  }
}

function ms710RadarSetText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=value;
}

function ms710RadarSourceCoordinates(){
  const liveState=window.liveNavState;
  const livePoint=liveState?.points?.at?.(-1);

  if(
    livePoint&&
    Number.isFinite(Number(livePoint.lat))&&
    Number.isFinite(Number(livePoint.lon))
  ){
    return {
      lat:Number(livePoint.lat),
      lon:Number(livePoint.lon),
      accuracy:Number(liveState?.accuracy)||null,
      source:'Live GPS'
    };
  }

  if(
    typeof ms709WeatherCoordinates!=='undefined'&&
    ms709WeatherCoordinates&&
    Number.isFinite(Number(ms709WeatherCoordinates.lat))&&
    Number.isFinite(Number(ms709WeatherCoordinates.lon))
  ){
    return {
      lat:Number(ms709WeatherCoordinates.lat),
      lon:Number(ms709WeatherCoordinates.lon),
      accuracy:Number(ms709WeatherCoordinates.accuracy)||null,
      source:ms709WeatherCoordinates.source||'Weerlocatie'
    };
  }

  const cached=typeof ms709ReadWeatherCache==='function'
    ?ms709ReadWeatherCache()
    :null;
  const coords=cached?.coordinates;

  if(
    coords&&
    Number.isFinite(Number(coords.lat))&&
    Number.isFinite(Number(coords.lon))
  ){
    return {
      lat:Number(coords.lat),
      lon:Number(coords.lon),
      accuracy:Number(coords.accuracy)||null,
      source:'Laatste weerlocatie'
    };
  }

  return null;
}

function ms710RadarGetCurrentPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(new Error('GPS-locatie wordt niet ondersteund.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        lat:position.coords.latitude,
        lon:position.coords.longitude,
        accuracy:position.coords.accuracy,
        source:'Huidige GPS'
      }),
      reject,
      {
        enableHighAccuracy:true,
        maximumAge:30000,
        timeout:15000
      }
    );
  });
}

async function ms710RadarResolveCoordinates(forceGps=false){
  if(!forceGps){
    const known=ms710RadarSourceCoordinates();
    if(known)return known;
  }
  return ms710RadarGetCurrentPosition();
}

function ms710RadarDistanceKm(a,b){
  if(!a||!b)return Infinity;
  const toRad=value=>value*Math.PI/180;
  const dLat=toRad(Number(b.lat)-Number(a.lat));
  const dLon=toRad(Number(b.lon)-Number(a.lon));
  const lat1=toRad(Number(a.lat));
  const lat2=toRad(Number(b.lat));
  const h=Math.sin(dLat/2)**2+
    Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

function ms710RadarWidgetSize(){
  if(window.innerWidth<=390)return '2b';
  if(window.innerWidth<=720)return '3';
  return '3';
}

function ms710RadarZoom(){
  if(window.innerWidth<=430)return '8';
  return '7';
}

function ms710RadarWidgetUrl(coordinates){
  const params=new URLSearchParams({
    lat:Number(coordinates.lat).toFixed(5),
    lng:Number(coordinates.lon).toFixed(5),
    overname:'2',
    zoom:ms710RadarZoom(),
    naam:'Serenity',
    size:ms710RadarWidgetSize(),
    voor:ms710RadarMode==='forecast'?'1':'0',
    t:String(Date.now())
  });

  return `https://gadgets.buienradar.nl/gadget/zoommap/?${params.toString()}`;
}

function ms710RadarUpdateModeButtons(){
  const past=document.getElementById('ms710RadarPastButton');
  const forecast=document.getElementById('ms710RadarForecastButton');
  past?.classList.toggle('active',ms710RadarMode==='past');
  forecast?.classList.toggle('active',ms710RadarMode==='forecast');
  ms710RadarSetText(
    'ms710RadarFrameType',
    ms710RadarMode==='forecast'?'3 uur vooruit':'Afgelopen uur'
  );
}

function ms710RadarSetLoading(active){
  const loading=document.getElementById('ms710RadarLoading');
  loading?.classList.toggle('hidden',!active);

  const button=document.getElementById('ms710RadarRefreshButton');
  if(button){
    button.disabled=active;
    button.classList.toggle('loading',active);
  }
}

function ms710RadarFormatRefreshTime(){
  return new Date().toLocaleTimeString('nl-NL',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function ms710RadarRender(coordinates){
  const frame=document.getElementById('ms710RadarMap');
  if(!frame)throw new Error('Buienradar-venster ontbreekt.');

  ms710RadarUpdateModeButtons();
  ms710RadarSetLoading(true);

  let settled=false;
  const finish=()=>{
    if(settled)return;
    settled=true;
    ms710RadarSetLoading(false);
    ms710RadarSetText('ms710RadarFrameTime',ms710RadarFormatRefreshTime());
    ms710RadarSetText('ms710RadarFrameAge','Laatste verversing');
  };

  frame.onload=finish;
  frame.src=ms710RadarWidgetUrl(coordinates);
  window.setTimeout(finish,7000);
}

async function ms710RefreshRadar(force=false,forceGps=false){
  if(ms710RadarBusy)return;

  const age=Date.now()-Number(ms710RadarLastRefresh||0);
  if(!force&&ms710RadarLastRefresh&&age<MS710_RADAR_REFRESH_MS)return;

  ms710RadarBusy=true;
  ms710RadarSetText('ms710RadarStatus','Buienradar en GPS-positie ophalen…');
  ms710RadarSetLoading(true);

  try{
    const coordinates=await ms710RadarResolveCoordinates(forceGps);
    ms710RadarCoordinates=coordinates;
    ms710RadarLastRefresh=Date.now();
    ms710RadarRender(coordinates);

    const modeText=ms710RadarMode==='forecast'
      ?'verwachting voor de komende 3 uur'
      :'beelden van het afgelopen uur';
    ms710RadarSetText(
      'ms710RadarStatus',
      `${coordinates.source} · ${modeText} · automatisch elke 5 minuten vernieuwd`
    );
  }catch(error){
    console.error('Buienradar laden mislukt:',error);
    ms710RadarSetLoading(false);
    ms710RadarSetText(
      'ms710RadarStatus',
      `Buienradar niet beschikbaar: ${error.message||'onbekende fout'}`
    );
  }finally{
    ms710RadarBusy=false;
  }
}

async function ms710RadarLocate(){
  try{
    const coordinates=await ms710RadarResolveCoordinates(true);
    ms710RadarCoordinates=coordinates;
    ms710RadarLastRefresh=0;
    await ms710RefreshRadar(true,true);
  }catch{
    ms710RadarSetText(
      'ms710RadarStatus',
      'Geef locatietoegang om Buienradar op Serenity te centreren.'
    );
  }
}

function ms710SetRadarMode(mode){
  const next=mode==='past'?'past':'forecast';
  if(ms710RadarMode===next){
    ms710RadarUpdateModeButtons();
    return;
  }
  ms710RadarMode=next;
  localStorage.setItem(MS710_RADAR_MODE_KEY,next);
  ms710RadarLastRefresh=0;
  ms710RadarUpdateModeButtons();
  ms710RefreshRadar(true);
}

function ms710OpenBuienradar(){
  window.open(
    'https://www.buienradar.nl/nederland/neerslag/buienradar',
    '_blank',
    'noopener,noreferrer'
  );
}

function ms710RadarUpdateLiveLocation(){
  const coordinates=ms710RadarSourceCoordinates();
  if(!coordinates)return;

  const moved=ms710RadarDistanceKm(ms710RadarCoordinates,coordinates);
  if(moved<MS710_RADAR_MOVE_KM)return;

  ms710RadarCoordinates=coordinates;
  ms710RadarLastRefresh=0;
  ms710RefreshRadar(true);
}

function initWeatherRadarPage(){
  ms710RadarUpdateModeButtons();
  const coordinates=ms710RadarSourceCoordinates();
  if(coordinates)ms710RadarCoordinates=coordinates;
  ms710RefreshRadar(false);

  if(!ms710RadarRefreshTimer){
    ms710RadarRefreshTimer=setInterval(()=>{
      if(ms710RadarPageVisible())ms710RefreshRadar(false);
    },60000);
  }

  if(!ms710RadarLocationTimer){
    ms710RadarLocationTimer=setInterval(()=>{
      if(ms710RadarPageVisible())ms710RadarUpdateLiveLocation();
    },MS710_RADAR_LOCATION_MS);
  }
}

const ms710OriginalInitWeatherPage=initWeatherPage;
initWeatherPage=function(){
  const result=ms710OriginalInitWeatherPage();
  setTimeout(initWeatherRadarPage,80);
  return result;
};

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&ms710RadarPageVisible())initWeatherRadarPage();
});

window.addEventListener('online',()=>{
  if(ms710RadarPageVisible())ms710RefreshRadar(true);
},{passive:true});

window.addEventListener('resize',()=>{
  if(!ms710RadarCoordinates||!ms710RadarPageVisible())return;
  clearTimeout(window.__ms710RadarResizeTimer);
  window.__ms710RadarResizeTimer=setTimeout(()=>{
    ms710RadarLastRefresh=0;
    ms710RefreshRadar(true);
  },400);
},{passive:true});
