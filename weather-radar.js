
/* ============================================================
   MijnSerenity Cloud 7.2.1 — live neerslagradar
   ============================================================ */

const MS710_RADAR_REFRESH_MS=5*60*1000;
const MS710_RADAR_ANIMATION_MS=650;

let ms710RadarMap=null;
let ms710RadarBaseLayer=null;
let ms710RadarLayer=null;
let ms710RadarMarker=null;
let ms710RadarAccuracyCircle=null;
let ms710RadarFrames=[];
let ms710RadarFrameIndex=0;
let ms710RadarMeta=null;
let ms710RadarBusy=false;
let ms710RadarAnimationTimer=null;
let ms710RadarRefreshTimer=null;
let ms710RadarLocationTimer=null;
let ms710RadarLastRefresh=0;
let ms710RadarCoordinates=null;
let ms710RadarResizeObserver=null;

function ms710RadarPageVisible(){
  const active=document.querySelector(
    '.bottom-nav-item.active'
  )?.dataset.target;

  if(active==='weather')return true;

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

function ms710RadarFrameDate(frame){
  const time=Number(frame?.time);
  return Number.isFinite(time)
    ?new Date(time*1000)
    :null;
}

function ms710RadarFormatTime(frame){
  const date=ms710RadarFrameDate(frame);
  if(!date)return '–';

  return date.toLocaleTimeString('nl-NL',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function ms710RadarAgeText(frame){
  const date=ms710RadarFrameDate(frame);
  if(!date)return 'Tijd onbekend';

  const minutes=Math.round(
    (Date.now()-date.getTime())/60000
  );

  if(frame?.forecast){
    const ahead=Math.max(0,-minutes);
    return ahead<=1
      ?'Verwachting nu'
      :`Verwachting +${ahead} min`;
  }

  if(minutes<=1)return 'Actueel beeld';
  if(minutes<60)return `${minutes} min geleden`;

  return `${Math.round(minutes/60)} uur geleden`;
}

function ms710RadarSourceCoordinates(){
  const livePoint=liveNavState?.points?.at?.(-1);

  if(
    livePoint&&
    Number.isFinite(Number(livePoint.lat))&&
    Number.isFinite(Number(livePoint.lon))
  ){
    return {
      lat:Number(livePoint.lat),
      lon:Number(livePoint.lon),
      accuracy:Number(liveNavState.accuracy)||null,
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

function ms710RadarInitMap(coordinates){
  const container=document.getElementById(
    'ms710RadarMap'
  );
  if(!container||typeof L==='undefined')return;

  if(!ms710RadarMap){
    ms710RadarMap=L.map(
      container,
      {
        zoomControl:true,
        attributionControl:true,
        preferCanvas:true,
        minZoom:4,
        maxZoom:17
      }
    );

    ms710RadarBaseLayer=L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom:19,
        attribution:
          '&copy; OpenStreetMap-bijdragers'
      }
    ).addTo(ms710RadarMap);

    ms710RadarMap.on(
      'movestart',
      ()=>{
        container.dataset.userMoved='true';
      }
    );

    ms710RadarResizeObserver=
      new ResizeObserver(()=>{
        requestAnimationFrame(()=>{
          ms710RadarMap?.invalidateSize({
            pan:false
          });
        });
      });

    ms710RadarResizeObserver.observe(container);
  }

  const latlng=[
    coordinates.lat,
    coordinates.lon
  ];

  if(!ms710RadarMarker){
    ms710RadarMarker=L.circleMarker(
      latlng,
      {
        radius:9,
        color:'#ffffff',
        weight:3,
        fillColor:'#42d5ff',
        fillOpacity:1
      }
    ).addTo(ms710RadarMap)
      .bindTooltip(
        'Serenity',
        {
          permanent:false,
          direction:'top'
        }
      );
  }else{
    ms710RadarMarker.setLatLng(latlng);
  }

  const accuracy=Number(coordinates.accuracy);

  if(Number.isFinite(accuracy)&&accuracy>0){
    if(!ms710RadarAccuracyCircle){
      ms710RadarAccuracyCircle=L.circle(
        latlng,
        {
          radius:accuracy,
          color:'#42d5ff',
          weight:1,
          opacity:.5,
          fillColor:'#42d5ff',
          fillOpacity:.08
        }
      ).addTo(ms710RadarMap);
    }else{
      ms710RadarAccuracyCircle
        .setLatLng(latlng)
        .setRadius(accuracy);
    }
  }

  if(
    !ms710RadarMap._loaded||
    container.dataset.userMoved!=='true'
  ){
    ms710RadarMap.setView(
      latlng,
      9,
      {
        animate:false
      }
    );
  }

  requestAnimationFrame(()=>{
    ms710RadarMap?.invalidateSize({
      pan:false
    });
  });
}

function ms710RadarTileUrl(frame){
  if(
    !ms710RadarMeta?.host||
    !frame?.path
  ){
    return '';
  }

  return (
    `${ms710RadarMeta.host}`+
    `${frame.path}`+
    '/256/{z}/{x}/{y}/2/1_1.png'
  );
}

function ms710RadarShowFrame(index){
  if(
    !ms710RadarMap||
    !ms710RadarFrames.length
  ){
    return;
  }

  const safeIndex=Math.max(
    0,
    Math.min(
      ms710RadarFrames.length-1,
      Number(index)||0
    )
  );
  const frame=ms710RadarFrames[safeIndex];
  const url=ms710RadarTileUrl(frame);

  if(!url)return;

  const nextLayer=L.tileLayer(
    url,
    {
      tileSize:256,
      opacity:.72,
      zIndex:300,
      maxNativeZoom:7,
      maxZoom:17,
      attribution:
        'Weather radar &copy; RainViewer'
    }
  );

  nextLayer.addTo(ms710RadarMap);

  const oldLayer=ms710RadarLayer;
  ms710RadarLayer=nextLayer;
  ms710RadarFrameIndex=safeIndex;

  nextLayer.once('load',()=>{
    if(
      oldLayer&&
      oldLayer!==nextLayer&&
      ms710RadarMap.hasLayer(oldLayer)
    ){
      ms710RadarMap.removeLayer(oldLayer);
    }
  });

  setTimeout(()=>{
    if(
      oldLayer&&
      oldLayer!==nextLayer&&
      ms710RadarMap?.hasLayer(oldLayer)
    ){
      ms710RadarMap.removeLayer(oldLayer);
    }
  },1800);

  const slider=document.getElementById(
    'ms710RadarSlider'
  );
  if(slider)slider.value=String(safeIndex);

  ms710RadarSetText(
    'ms710RadarFrameTime',
    ms710RadarFormatTime(frame)
  );
  ms710RadarSetText(
    'ms710RadarFrameAge',
    ms710RadarAgeText(frame)
  );
  ms710RadarSetText(
    'ms710RadarFrameType',
    frame.forecast?'Verwachting':'Radar'
  );
}

function ms710RadarPrepareFrames(payload){
  const past=(payload?.radar?.past||[])
    .map(frame=>({
      ...frame,
      forecast:false
    }));
  const nowcast=(payload?.radar?.nowcast||[])
    .map(frame=>({
      ...frame,
      forecast:true
    }));

  const all=[...past,...nowcast]
    .filter(frame=>
      Number.isFinite(Number(frame.time))&&
      typeof frame.path==='string'
    )
    .sort((a,b)=>
      Number(a.time)-Number(b.time)
    );

  ms710RadarFrames=all.slice(-18);

  const slider=document.getElementById(
    'ms710RadarSlider'
  );

  if(slider){
    slider.min='0';
    slider.max=String(
      Math.max(
        0,
        ms710RadarFrames.length-1
      )
    );
    slider.step='1';
  }

  ms710RadarSetText(
    'ms710RadarStartTime',
    ms710RadarFormatTime(
      ms710RadarFrames[0]
    )
  );
  ms710RadarSetText(
    'ms710RadarEndTime',
    ms710RadarFormatTime(
      ms710RadarFrames.at(-1)
    )
  );

  let latestPastIndex=-1;

  ms710RadarFrames.forEach((frame,index)=>{
    if(!frame.forecast){
      latestPastIndex=index;
    }
  });

  ms710RadarFrameIndex=
    latestPastIndex>=0
      ?latestPastIndex
      :Math.max(
          0,
          ms710RadarFrames.length-1
        );
}

async function ms710FetchRadarMetadata(){
  const response=await fetch(
    'https://api.rainviewer.com/public/weather-maps.json',
    {
      headers:{
        Accept:'application/json'
      },
      cache:'no-store'
    }
  );

  if(!response.ok){
    throw new Error(
      `Radardienst gaf fout ${response.status}`
    );
  }

  const payload=await response.json();

  if(
    !payload?.host||
    !payload?.radar?.past?.length
  ){
    throw new Error(
      'Geen radarbeelden ontvangen.'
    );
  }

  return payload;
}

async function ms710RefreshRadar(
  force=false,
  forceGps=false
){
  if(ms710RadarBusy)return;

  const age=
    Date.now()-
    Number(ms710RadarLastRefresh||0);

  if(
    !force&&
    ms710RadarFrames.length&&
    age<MS710_RADAR_REFRESH_MS
  ){
    ms710RadarShowFrame(
      ms710RadarFrameIndex
    );
    return;
  }

  ms710RadarBusy=true;
  ms710RadarSetText(
    'ms710RadarStatus',
    'Actuele radar en GPS-positie ophalen…'
  );

  const refreshButton=document.getElementById(
    'ms710RadarRefreshButton'
  );
  if(refreshButton){
    refreshButton.disabled=true;
    refreshButton.classList.add('loading');
  }

  try{
    const [
      coordinates,
      payload
    ]=await Promise.all([
      ms710RadarResolveCoordinates(forceGps),
      ms710FetchRadarMetadata()
    ]);

    ms710RadarCoordinates=coordinates;
    ms710RadarMeta=payload;
    ms710RadarLastRefresh=Date.now();

    ms710RadarInitMap(coordinates);
    ms710RadarPrepareFrames(payload);
    ms710RadarShowFrame(
      ms710RadarFrameIndex
    );

    ms710RadarSetText(
      'ms710RadarStatus',
      `${coordinates.source} · radarbeelden automatisch iedere 5 minuten vernieuwd`
    );
  }catch(error){
    console.error(
      'Radarbeelden ophalen mislukt:',
      error
    );

    ms710RadarSetText(
      'ms710RadarStatus',
      `Radar niet beschikbaar: ${error.message}`
    );
  }finally{
    ms710RadarBusy=false;

    if(refreshButton){
      refreshButton.disabled=false;
      refreshButton.classList.remove('loading');
    }
  }
}

function ms710RadarSliderChanged(value){
  ms710StopRadarAnimation();
  ms710RadarShowFrame(
    Number(value)
  );
}

function ms710ToggleRadarAnimation(){
  if(ms710RadarAnimationTimer){
    ms710StopRadarAnimation();
  }else{
    ms710StartRadarAnimation();
  }
}

function ms710StartRadarAnimation(){
  if(ms710RadarFrames.length<2)return;

  ms710StopRadarAnimation();

  const button=document.getElementById(
    'ms710RadarPlayButton'
  );

  if(button){
    button.textContent='Ⅱ';
    button.setAttribute(
      'aria-label',
      'Radaranimatie pauzeren'
    );
    button.title='Radaranimatie pauzeren';
  }

  let index=0;
  ms710RadarShowFrame(index);

  ms710RadarAnimationTimer=setInterval(()=>{
    index+=1;

    if(index>=ms710RadarFrames.length){
      index=0;
    }

    ms710RadarShowFrame(index);
  },MS710_RADAR_ANIMATION_MS);
}

function ms710StopRadarAnimation(){
  clearInterval(ms710RadarAnimationTimer);
  ms710RadarAnimationTimer=null;

  const button=document.getElementById(
    'ms710RadarPlayButton'
  );

  if(button){
    button.textContent='▶';
    button.setAttribute(
      'aria-label',
      'Radaranimatie starten'
    );
    button.title='Radaranimatie starten';
  }
}

async function ms710RadarLocate(){
  try{
    const coordinates=
      await ms710RadarResolveCoordinates(true);

    ms710RadarCoordinates=coordinates;
    ms710RadarInitMap(coordinates);

    const container=document.getElementById(
      'ms710RadarMap'
    );

    if(container){
      container.dataset.userMoved='false';
    }

    ms710RadarMap?.setView(
      [
        coordinates.lat,
        coordinates.lon
      ],
      Math.max(
        9,
        ms710RadarMap.getZoom()
      ),
      {
        animate:true
      }
    );

    ms710RadarSetText(
      'ms710RadarStatus',
      `${coordinates.source} · radar gecentreerd op Serenity`
    );
  }catch(error){
    ms710RadarSetText(
      'ms710RadarStatus',
      'Geef locatietoegang om op Serenity te centreren.'
    );
  }
}

function ms710RadarUpdateLiveLocation(){
  const coordinates=
    ms710RadarSourceCoordinates();

  if(!coordinates)return;

  const changed=
    !ms710RadarCoordinates||
    Math.abs(
      Number(ms710RadarCoordinates.lat)-
      Number(coordinates.lat)
    )>.00005||
    Math.abs(
      Number(ms710RadarCoordinates.lon)-
      Number(coordinates.lon)
    )>.00005;

  if(!changed)return;

  ms710RadarCoordinates=coordinates;
  ms710RadarInitMap(coordinates);
}

function initWeatherRadarPage(){
  const coordinates=
    ms710RadarSourceCoordinates();

  if(coordinates){
    ms710RadarCoordinates=coordinates;
    ms710RadarInitMap(coordinates);
  }

  ms710RefreshRadar(false);

  if(!ms710RadarRefreshTimer){
    ms710RadarRefreshTimer=setInterval(()=>{
      if(
        document.visibilityState==='visible'&&
        ms710RadarPageVisible()
      ){
        ms710RefreshRadar(false);
      }
    },60000);
  }

  if(!ms710RadarLocationTimer){
    ms710RadarLocationTimer=setInterval(()=>{
      if(
        document.visibilityState==='visible'&&
        ms710RadarPageVisible()
      ){
        ms710RadarUpdateLiveLocation();
      }
    },15000);
  }

  setTimeout(()=>{
    ms710RadarMap?.invalidateSize({
      pan:false
    });
  },250);
}

const ms710OriginalInitWeatherPage=
  initWeatherPage;

initWeatherPage=function(){
  const result=
    ms710OriginalInitWeatherPage();

  setTimeout(
    initWeatherRadarPage,
    80
  );

  return result;
};

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(
      !document.hidden&&
      ms710RadarPageVisible()
    ){
      initWeatherRadarPage();
    }else if(document.hidden){
      ms710StopRadarAnimation();
    }
  }
);

window.addEventListener(
  'online',
  ()=>{
    if(ms710RadarPageVisible()){
      ms710RefreshRadar(true);
    }
  },
  {passive:true}
);

window.addEventListener(
  'resize',
  ()=>{
    setTimeout(()=>{
      ms710RadarMap?.invalidateSize({
        pan:false
      });
    },150);
  },
  {passive:true}
);
