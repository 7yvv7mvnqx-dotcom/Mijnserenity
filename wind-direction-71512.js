/* MijnSerenity 8.20.2 — windrichting + RWS watertemperatuur
   Event-driven, geen documentbrede MutationObserver en geen snelle intervalpolling. */

(()=>{
  'use strict';
  if(window.__msWindDirection8202)return;
  window.__msWindDirection8202=true;

  const $=id=>document.getElementById(id);
  let deviceHeading=null;
  let orientationListening=false;

  function norm360(value){
    const number=Number(value);
    if(!Number.isFinite(number))return null;
    return ((number%360)+360)%360;
  }

  function directionName(value){
    const deg=norm360(value);
    if(deg===null)return '–';
    const names=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return names[Math.round(deg/22.5)%16];
  }

  function weatherDirection(){
    try{
      const value=Number(window.liveNavState?.weather?.windDirection);
      if(Number.isFinite(value))return norm360(value);
    }catch{}
    const text=$('ms709WeatherDirection')?.textContent||$('ms71512WindDirection')?.textContent||'';
    const degrees=text.match(/(-?\d+(?:[.,]\d+)?)\s*°/);
    if(degrees)return norm360(String(degrees[1]).replace(',','.'));
    return null;
  }

  function screenRotationClockwise(){
    try{
      if(screen.orientation&&Number.isFinite(Number(screen.orientation.angle)))return Number(screen.orientation.angle);
    }catch{}
    const legacy=Number(window.orientation);
    return Number.isFinite(legacy)?-legacy:0;
  }

  function update(){
    const wind=weatherDirection();
    const direction=$('ms71512WindDirection');
    const arrow=$('ms71512WindArrow');
    if(wind===null){
      if(direction)direction.textContent='richting –';
      return;
    }
    if(direction)direction.textContent=`${directionName(wind)} · ${Math.round(wind)}°`;
    const windTo=norm360(wind+180);
    const rotation=deviceHeading===null?windTo:norm360(windTo-deviceHeading);
    if(arrow&&rotation!==null)arrow.style.transform=`translate(-50%,-100%) rotate(${rotation}deg)`;
  }

  function handleOrientation(event){
    let heading=null;
    if(Number.isFinite(Number(event.webkitCompassHeading)))heading=Number(event.webkitCompassHeading);
    else if(Number.isFinite(Number(event.alpha)))heading=360-Number(event.alpha);
    if(heading===null)return;
    deviceHeading=norm360(heading-screenRotationClockwise());
    update();
  }

  function startListening(){
    if(orientationListening)return;
    orientationListening=true;
    window.addEventListener('deviceorientationabsolute',handleOrientation,true);
    window.addEventListener('deviceorientation',handleOrientation,true);
  }

  window.ms71512EnableCompass=async function(event){
    event?.stopPropagation?.();
    const button=$('ms71512CompassPermission');
    try{
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          if(button)button.textContent='🧭 Toestemming nodig';
          return false;
        }
      }
      try{localStorage.setItem('ms71512_compass_enabled','1')}catch{}
      startListening();
      if(button){
        button.textContent='🧭 Kompas actief';
        button.classList.add('active');
        setTimeout(()=>button.classList.add('hidden'),1800);
      }
      update();
      return true;
    }catch(error){
      console.warn('Kompas kon niet worden geactiveerd:',error);
      if(button)button.textContent='🧭 Probeer opnieuw';
      return false;
    }
  };

  function start(){
    let enabled=false;
    try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch{}
    if(enabled){
      startListening();
      const button=$('ms71512CompassPermission');
      if(button)button.textContent='🧭 Kompas actief';
    }
    update();
  }

  ['mijnserenity-weather-updated','mijnserenity:dashboard-ready','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,update,{passive:true}));
  window.addEventListener('pageshow',update,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(update,120),{passive:true});
  try{screen.orientation?.addEventListener?.('change',()=>setTimeout(update,80))}catch{}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

(()=>{
  'use strict';
  if(window.__msRwsWaterTemperature8202)return;
  window.__msRwsWaterTemperature8202=true;

  const API='https://ddapi20-waterwebservices.rijkswaterstaat.nl';
  const CATALOG_URL=`${API}/METADATASERVICES/OphalenCatalogus`;
  const LATEST_URL=`${API}/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen`;
  const CACHE_KEY='mijnserenity-rws-waterstations-v1';
  const CACHE_MAX_AGE=24*60*60*1000;
  const REFRESH_MS=5*60*1000;
  const REQUEST_TIMEOUT_MS=15000;

  const $=id=>document.getElementById(id);
  let busy=false;
  let lastRun=0;
  let map=null;
  let mapLayer=null;
  let lastResult=null;

  function finite(value){
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function weatherVisible(){
    if(document.hidden)return false;
    const page=$('weather');
    if(!page)return false;
    if(!page.classList.contains('hidden'))return true;
    try{return typeof window.ms708CurrentPageId==='function'&&window.ms708CurrentPageId()==='weather'}catch{return false}
  }

  async function postJson(url,body){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(url,{
        method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,
        headers:{Accept:'application/json','Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if(!response.ok)throw new Error(`RWS HTTP ${response.status}`);
      return await response.json();
    }catch(error){
      if(error?.name==='AbortError')throw new Error('Rijkswaterstaat reageert te langzaam');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  function distanceKm(lat1,lon1,lat2,lon2){
    const values=[lat1,lon1,lat2,lon2].map(finite);
    if(values.some(value=>value===null))return Infinity;
    const [aLat,aLon,bLat,bLon]=values;
    const rad=value=>value*Math.PI/180;
    const dLat=rad(bLat-aLat),dLon=rad(bLon-aLon);
    const a=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function ownMessageId(item){
    if(!item||typeof item!=='object')return null;
    for(const [key,value] of Object.entries(item))if(/^messageid$/i.test(key))return String(value);
    for(const [key,value] of Object.entries(item)){
      if(/message.?id/i.test(key)&&!/(locatie|aquo)/i.test(key))return String(value);
    }
    return null;
  }

  function linkedMessageId(item,kind){
    if(!item||typeof item!=='object')return null;
    const regex=kind==='location'?/locatie.*message.?id/i:/aquo.*message.?id/i;
    for(const [key,value] of Object.entries(item))if(regex.test(key))return String(value);
    return null;
  }

  function metadataRoot(meta){
    return meta?.AquoMetadata||meta?.AquoPlusWaarnemingMetadata?.AquoMetadata||meta||{};
  }

  function isWaterTemperature(meta){
    const root=metadataRoot(meta);
    return String(root?.Compartiment?.Code||'').toUpperCase()==='OW'&&
      String(root?.Grootheid?.Code||'').toUpperCase()==='T'&&
      (!root?.ProcesType||String(root.ProcesType).toLowerCase()==='meting');
  }

  function normalizeLocation(item){
    if(!item||typeof item!=='object')return null;
    const code=String(item.Code||item.code||'').trim();
    const lat=finite(item.Y??item.Latitude??item.latitude??item.Lat??item.lat);
    const lon=finite(item.X??item.Longitude??item.longitude??item.Lon??item.lon);
    if(!code||lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {code,name:String(item.Naam||item.Name||item.name||code),lat,lon,messageId:ownMessageId(item)};
  }

  function catalogToStations(data){
    const locations=(data?.LocatieLijst||data?.locations||[]).map(normalizeLocation).filter(Boolean);
    const metadata=data?.AquoMetadataLijst||data?.aquoMetadataLijst||[];
    const links=data?.AquoMetadataLocatieLijst||data?.aquoMetadataLocatieLijst||[];
    const tempMetaIds=new Set(metadata.filter(isWaterTemperature).map(ownMessageId).filter(Boolean));
    if(!tempMetaIds.size||!Array.isArray(links)||!links.length)return locations;
    const locationIds=new Set();
    links.forEach(link=>{
      const metadataId=linkedMessageId(link,'aquo');
      const locationId=linkedMessageId(link,'location');
      if(metadataId&&locationId&&tempMetaIds.has(metadataId))locationIds.add(locationId);
    });
    return locationIds.size?locations.filter(location=>location.messageId&&locationIds.has(location.messageId)):locations;
  }

  function readStationCache(){
    try{
      const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(cached&&Date.now()-Number(cached.savedAt)<CACHE_MAX_AGE&&Array.isArray(cached.stations))return cached.stations;
    }catch{}
    return null;
  }

  async function getStations(){
    const cached=readStationCache();
    if(cached?.length)return cached;
    const data=await postJson(CATALOG_URL,{CatalogusFilter:{Compartimenten:true,Grootheden:true,ProcesTypes:true}});
    const stations=catalogToStations(data);
    if(!stations.length)throw new Error('Geen RWS temperatuurmeetlocaties gevonden');
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),stations}))}catch{}
    return stations;
  }

  function currentCoordinates(){
    try{
      const point=window.liveNavState?.points?.at?.(-1);
      if(finite(point?.lat)!==null&&finite(point?.lon)!==null)return {lat:Number(point.lat),lon:Number(point.lon),source:'Live GPS'};
    }catch{}
    try{
      const key=`mijnserenity-weather-793-${window.currentBoat?.id||'serenity'}`;
      const cached=JSON.parse(localStorage.getItem(key)||'null');
      if(finite(cached?.coordinates?.lat)!==null&&finite(cached?.coordinates?.lon)!==null){
        return {lat:Number(cached.coordinates.lat),lon:Number(cached.coordinates.lon),source:'Laatste positie'};
      }
    }catch{}
    return null;
  }

  function getGps(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet beschikbaar'));
      navigator.geolocation.getCurrentPosition(
        position=>resolve({lat:position.coords.latitude,lon:position.coords.longitude,source:'Huidige GPS'}),
        reject,
        {enableHighAccuracy:true,maximumAge:60000,timeout:12000}
      );
    });
  }

  function findLocationObject(object,inherited=null){
    if(!object||typeof object!=='object')return inherited;
    const candidate=object.Locatie||object.locatie||object.Location||object.location;
    if(!candidate||typeof candidate!=='object')return inherited;
    const code=String(candidate.Code||candidate.code||'').trim();
    if(!code)return inherited;
    return {
      code,name:String(candidate.Naam||candidate.Name||candidate.name||code),
      lat:finite(candidate.Y??candidate.Latitude??candidate.latitude),
      lon:finite(candidate.X??candidate.Longitude??candidate.longitude)
    };
  }

  function extractReadings(data){
    const readings=[];
    const seen=new Set();
    const visit=(node,location=null)=>{
      if(!node||typeof node!=='object')return;
      if(Array.isArray(node)){node.forEach(item=>visit(item,location));return}
      const local=findLocationObject(node,location);
      const measure=node.Meetwaarde||node.meetwaarde||node.MeasurementValue||node.measurementValue;
      if(measure&&local?.code){
        const value=finite(measure.Waarde_Numeriek??measure.WaardeNumeriek??measure.value??measure.Value);
        const time=node.Tijdstip||node.tijdstip||node.Datumtijd||node.dateTime||node.time||null;
        if(value!==null&&value>-5&&value<45){
          const key=`${local.code}|${time||''}|${value}`;
          if(!seen.has(key)){seen.add(key);readings.push({...local,value,time})}
        }
      }
      Object.values(node).forEach(value=>{if(value&&typeof value==='object')visit(value,local)});
    };
    visit(data,null);
    return readings;
  }

  async function latestForStations(stations){
    const candidates=stations.slice(0,12);
    const data=await postJson(LATEST_URL,{
      LocatieLijst:candidates.map(station=>({Code:station.code})),
      AquoPlusWaarnemingMetadataLijst:[{
        AquoMetadata:{Compartiment:{Code:'OW'},Grootheid:{Code:'T'},ProcesType:'meting'},
        WaarnemingMetadata:{KwaliteitswaardecodeLijst:['00','10','20','25','30','40']}
      }]
    });
    return extractReadings(data);
  }

  function chooseReading(readings,stations,coords){
    const stationMap=new Map(stations.map(station=>[station.code,station]));
    let best=null;
    readings.forEach(reading=>{
      const station=stationMap.get(reading.code)||reading;
      const lat=finite(reading.lat)??finite(station?.lat);
      const lon=finite(reading.lon)??finite(station?.lon);
      if(lat===null||lon===null)return;
      const distance=distanceKm(coords.lat,coords.lon,lat,lon);
      const timestamp=reading.time?new Date(reading.time).getTime():0;
      if(!best||distance<best.distanceKm-.01||(Math.abs(distance-best.distanceKm)<.01&&timestamp>best.timestamp)){
        best={value:reading.value,time:reading.time||null,timestamp:Number.isFinite(timestamp)?timestamp:0,
          code:reading.code,name:reading.name&&reading.name!==reading.code?reading.name:(station?.name||reading.code),
          lat,lon,distanceKm:distance};
      }
    });
    return best;
  }

  const formatTemp=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  const formatDistance=value=>value<1?`${Math.round(value*1000)} m`:`${value.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km`;
  function formatDateTime(value){
    if(!value)return 'tijdstip onbekend';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'tijdstip onbekend';
    return date.toLocaleString('nl-NL',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }

  function ensurePanel(){
    const weather=$('weather');
    const existing=$('ms71515RwsWaterPanel');
    if(existing)return existing;
    if(!weather)return null;
    const panel=document.createElement('section');
    panel.id='ms71515RwsWaterPanel';
    panel.className='ms71515-rws-water-panel';
    panel.innerHTML=`
      <div class="ms71515-rws-head"><div><span>🌡️ RIJKSWATERSTAAT · GEMETEN WATERTEMPERATUUR</span><strong id="ms71515RwsWaterValue">Meetwaarde zoeken…</strong><small id="ms71515RwsWaterMeta">Dichtstbijzijnde actuele meetlocatie wordt bepaald.</small></div><button type="button" id="ms71515RwsRefresh" aria-label="Watertemperatuur vernieuwen">↻</button></div>
      <div id="ms71515RwsWaterMap" class="ms71515-rws-water-map" aria-label="Kaart met Serenity en het dichtstbijzijnde meetpunt"></div>
      <div class="ms71515-rws-detail"><div><small>MEETPUNT</small><strong id="ms71515RwsStation">–</strong></div><div><small>AFSTAND</small><strong id="ms71515RwsDistance">–</strong></div><div><small>GEMETEN</small><strong id="ms71515RwsTime">–</strong></div></div>
      <p id="ms71515RwsWaterNote">Bron: Rijkswaterstaat WaterWebservices. Dichtstbijzijnde beschikbare gemeten waarde; lokaal kan de temperatuur afwijken.</p>`;
    const article=$('ms793WeatherWaterTemp')?.closest('article');
    const container=article?.parentElement;
    if(container)container.insertAdjacentElement('afterend',panel);
    else weather.prepend(panel);
    $('ms71515RwsRefresh')?.addEventListener('click',()=>refresh(true,true));
    return panel;
  }

  function renderMap(coords,result){
    const host=$('ms71515RwsWaterMap');
    if(!host||!window.L||!result)return;
    try{
      if(!map){
        map=L.map(host,{zoomControl:true,attributionControl:true});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
        mapLayer=L.layerGroup().addTo(map);
      }
      mapLayer.clearLayers();
      const serenity=L.circleMarker([coords.lat,coords.lon],{radius:8,weight:3,fillOpacity:.9}).bindPopup('🚤 Serenity');
      const station=L.circleMarker([result.lat,result.lon],{radius:8,weight:3,fillOpacity:.9}).bindPopup(`🌡️ ${result.name}<br>${formatTemp(result.value)}`);
      const line=L.polyline([[coords.lat,coords.lon],[result.lat,result.lon]],{weight:3,dashArray:'7 7'});
      [serenity,station,line].forEach(layer=>mapLayer.addLayer(layer));
      map.fitBounds(line.getBounds().pad(.35),{maxZoom:12});
      setTimeout(()=>map?.invalidateSize(),150);
    }catch(error){console.warn('RWS watertemperatuurkaart kon niet worden getekend:',error)}
  }

  function renderResult(coords,result){
    ensurePanel();
    lastResult={coords,result};
    const temperature=formatTemp(result.value),distance=formatDistance(result.distanceKm),time=formatDateTime(result.time);
    if($('ms793WeatherWaterTemp'))$('ms793WeatherWaterTemp').textContent=temperature;
    if($('ms793WeatherWaterSource'))$('ms793WeatherWaterSource').textContent=`RWS ${result.name} · ${distance} van Serenity`;
    if($('ms71510WaterTemp'))$('ms71510WaterTemp').textContent=temperature;
    if($('ms71515RwsWaterValue'))$('ms71515RwsWaterValue').textContent=temperature;
    if($('ms71515RwsWaterMeta'))$('ms71515RwsWaterMeta').textContent=`Dichtstbijzijnde gemeten waarde · ${result.name}`;
    if($('ms71515RwsStation'))$('ms71515RwsStation').textContent=result.name;
    if($('ms71515RwsDistance'))$('ms71515RwsDistance').textContent=distance;
    if($('ms71515RwsTime'))$('ms71515RwsTime').textContent=time;
    try{
      window.liveNavState=window.liveNavState||{};
      window.liveNavState.weather=window.liveNavState.weather||{};
      Object.assign(window.liveNavState.weather,{
        waterTemperature:result.value,waterTemperatureSource:'Rijkswaterstaat',
        waterTemperatureStation:result.name,waterTemperatureDistanceKm:result.distanceKm
      });
    }catch{}
    renderMap(coords,result);
  }

  function renderError(message){
    ensurePanel();
    if($('ms71515RwsWaterValue'))$('ms71515RwsWaterValue').textContent='Geen RWS-meting gevonden';
    if($('ms71515RwsWaterMeta'))$('ms71515RwsWaterMeta').textContent=message;
    ['ms71515RwsStation','ms71515RwsDistance','ms71515RwsTime'].forEach(id=>{if($(id))$(id).textContent='–'});
  }

  async function refresh(force=false,forceGps=false){
    if(busy)return false;
    if(!force&&!weatherVisible())return false;
    if(!force&&Date.now()-lastRun<REFRESH_MS)return false;
    busy=true;
    lastRun=Date.now();
    ensurePanel();
    try{
      let coords=forceGps?null:currentCoordinates();
      if(!coords)coords=await getGps();
      const stations=await getStations();
      const nearest=stations.map(station=>({...station,distanceKm:distanceKm(coords.lat,coords.lon,station.lat,station.lon)})).sort((a,b)=>a.distanceKm-b.distanceKm);
      let readings=[];
      for(const count of [6,12]){
        readings=await latestForStations(nearest.slice(0,count));
        if(readings.length)break;
      }
      const result=chooseReading(readings,nearest,coords);
      if(!result)throw new Error('Geen recente geldige RWS-watertemperatuur beschikbaar');
      renderResult(coords,result);
      return true;
    }catch(error){
      console.warn('RWS watertemperatuur ophalen mislukt:',error);
      renderError(error?.message||'Rijkswaterstaat is tijdelijk niet bereikbaar.');
      return false;
    }finally{
      busy=false;
    }
  }

  function openWaterTemperature(){
    try{window.captainNavigate?.('weather')}catch{}
    setTimeout(()=>{
      ensurePanel()?.scrollIntoView({behavior:'smooth',block:'start'});
      if(lastResult)renderMap(lastResult.coords,lastResult.result);
      refresh(true,false);
    },300);
  }

  function bindStartTile(){
    const button=$('ms71510WaterTemp')?.closest('button');
    if(!button||button.dataset.rwsWaterBound==='1')return;
    button.dataset.rwsWaterBound='1';
    button.addEventListener('click',()=>setTimeout(openWaterTemperature,30));
  }

  function hookWeatherRefresh(){
    const original=window.ms709RefreshWeather;
    if(typeof original!=='function'||original.__rwsWater8202Wrapped)return;
    const wrapped=async function(...args){
      const result=await original.apply(this,args);
      setTimeout(()=>refresh(Boolean(args[0]),Boolean(args[1])),60);
      return result;
    };
    wrapped.__rwsWater8202Wrapped=true;
    window.ms709RefreshWeather=wrapped;
  }

  function routeChanged(event){
    const detail=event?.detail;
    const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target);
    bindStartTile();
    hookWeatherRefresh();
    if(route==='weather')setTimeout(()=>refresh(false,false),120);
  }

  function start(){
    bindStartTile();
    hookWeatherRefresh();
    if(weatherVisible())setTimeout(()=>refresh(false,false),500);
  }

  window.ms71515RefreshRwsWaterTemperature=refresh;
  window.ms71515OpenWaterTemperature=openWaterTemperature;
  window.addEventListener('mijnserenity:dashboard-ready',start,{passive:true});
  window.addEventListener('mijnserenity:routechange',routeChanged,{passive:true});
  window.addEventListener('pageshow',()=>{bindStartTile();hookWeatherRefresh();if(weatherVisible())refresh(false,false)},{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();