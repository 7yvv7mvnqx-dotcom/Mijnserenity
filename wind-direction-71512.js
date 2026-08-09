
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  let deviceHeading=null;
  let orientationListening=false;
  let permissionGranted=false;

  function norm360(v){
    const n=Number(v);
    if(!Number.isFinite(n)) return null;
    return ((n%360)+360)%360;
  }

  function directionName(deg){
    deg=norm360(deg);
    if(deg===null)return '–';
    const names=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return names[Math.round(deg/22.5)%16];
  }

  function weatherDirection(){
    try{
      if(typeof liveNavState!=='undefined'){
        const d=Number(liveNavState?.weather?.windDirection);
        if(Number.isFinite(d))return norm360(d);
      }
    }catch(e){}

    // Open-Meteo/weerdata kunnen ook elders in de pagina beschikbaar zijn.
    const weatherText=$('ivmsWeatherWind')?.textContent||'';
    const compassMatch=weatherText.match(/\b(NNO|ONO|OZO|ZZO|ZZW|WZW|WNW|NNW|NO|ZO|ZW|NW|N|O|Z|W)\b/i);
    if(compassMatch){
      const map={N:0,NNO:22.5,NO:45,ONO:67.5,O:90,OZO:112.5,ZO:135,ZZO:157.5,Z:180,ZZW:202.5,ZW:225,WZW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
      return map[compassMatch[1].toUpperCase()] ?? null;
    }
    return null;
  }

  function screenAngle(){
    try{
      if(screen.orientation && Number.isFinite(Number(screen.orientation.angle))){
        return Number(screen.orientation.angle);
      }
    }catch(e){}
    return Number(window.orientation)||0;
  }

  function handleOrientation(event){
    let heading=null;

    // iOS Safari geeft de absolute kompasrichting hier.
    if(Number.isFinite(Number(event.webkitCompassHeading))){
      heading=Number(event.webkitCompassHeading);
    }else if(event.absolute && Number.isFinite(Number(event.alpha))){
      // Bij absolute DeviceOrientation is alpha rotatie t.o.v. geografisch noord.
      heading=360-Number(event.alpha);
    }else if(Number.isFinite(Number(event.alpha))){
      // Beste fallback; niet op elk toestel magnetisch noord.
      heading=360-Number(event.alpha);
    }

    if(heading!==null){
      heading=norm360(heading + screenAngle());
      deviceHeading=heading;
      permissionGranted=true;
      update();
    }
  }

  function startListening(){
    if(orientationListening)return;
    orientationListening=true;
    window.addEventListener('deviceorientationabsolute',handleOrientation,true);
    window.addEventListener('deviceorientation',handleOrientation,true);
  }

  window.ms71512EnableCompass=async function(event){
    event?.stopPropagation?.();
    const btn=$('ms71512CompassPermission');
    try{
      if(typeof DeviceOrientationEvent!=='undefined' &&
         typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          if(btn)btn.textContent='🧭 Toestemming nodig';
          return;
        }
      }
      permissionGranted=true;
      try{ localStorage.setItem('ms71512_compass_enabled','1'); }catch(e){}
      startListening();
      if(btn){
        btn.textContent='🧭 Kompas actief';
        btn.classList.add('active');
      }
      setTimeout(()=>btn?.classList.add('hidden'),1800);
    }catch(err){
      console.warn('Kompas kon niet worden geactiveerd',err);
      if(btn)btn.textContent='🧭 Probeer opnieuw';
    }
  };

  function update(){
    const wind=weatherDirection();
    const dir=$('ms71512WindDirection');
    const arrow=$('ms71512WindArrow');
    if(wind===null){
      if(dir)dir.textContent='richting –';
      return;
    }

    if(dir)dir.textContent=`${directionName(wind)} · ${Math.round(wind)}°`;

    // De tekst blijft de meteorologische windrichting (waar de wind vandaan komt).
    // Alleen de pijl wijst 180 graden omgekeerd: waar de wind naartoe waait.
    const displayRotation=deviceHeading===null ? norm360(wind+180) : norm360(wind+180-deviceHeading);
    if(arrow)arrow.style.transform=`translate(-50%,-100%) rotate(${displayRotation}deg)`;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('ms71512CompassPermission');
    let enabled=false;
    try{enabled=localStorage.getItem('ms71512_compass_enabled')==='1'}catch(e){}
    if(enabled){
      // Op Android/veel browsers mag dit direct; op iOS kan alsnog een tik nodig zijn
      // wanneer Safari de toestemming niet heeft behouden.
      startListening();
      if(btn)btn.textContent='🧭 Kompas actief';
    }
    update();
    setInterval(update,800);
  },{once:true});

  window.addEventListener('orientationchange',()=>setTimeout(update,150));
})();

/* ============================================================
   MijnSerenity 7.15.15 — Rijkswaterstaat watertemperatuur
   Dichtstbijzijnde actuele gemeten waarde + kaart op Weer.
   ============================================================ */
(function(){
  'use strict';

  const API='https://ddapi20-waterwebservices.rijkswaterstaat.nl';
  const CATALOG_URL=`${API}/METADATASERVICES/OphalenCatalogus`;
  const LATEST_URL=`${API}/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen`;
  const CACHE_KEY='mijnserenity-rws-waterstations-v1';
  const CACHE_MAX_AGE=24*60*60*1000;
  const REFRESH_MS=5*60*1000;
  let busy=false;
  let lastRun=0;
  let map=null;
  let mapLayer=null;
  let lastResult=null;

  const $=id=>document.getElementById(id);

  function finite(value){
    if(value===null||value===''||typeof value==='boolean')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function distanceKm(lat1,lon1,lat2,lon2){
    const values=[lat1,lon1,lat2,lon2].map(finite);
    if(values.some(v=>v===null))return Infinity;
    const [aLat,aLon,bLat,bLon]=values;
    const rad=v=>v*Math.PI/180;
    const dLat=rad(bLat-aLat);
    const dLon=rad(bLon-aLon);
    const a=Math.sin(dLat/2)**2+
      Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  async function postJson(url,body){
    const response=await fetch(url,{
      method:'POST',
      mode:'cors',
      cache:'no-store',
      headers:{
        'Accept':'application/json',
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    });
    if(!response.ok)throw new Error(`RWS HTTP ${response.status}`);
    return response.json();
  }

  function ownMessageId(item){
    if(!item||typeof item!=='object')return null;
    for(const [key,value] of Object.entries(item)){
      if(/^messageid$/i.test(key))return String(value);
    }
    for(const [key,value] of Object.entries(item)){
      if(/message.?id/i.test(key)&&!/(locatie|aquo)/i.test(key))return String(value);
    }
    return null;
  }

  function linkedMessageId(item,kind){
    if(!item||typeof item!=='object')return null;
    const re=kind==='location'?/locatie.*message.?id/i:/aquo.*message.?id/i;
    for(const [key,value] of Object.entries(item)){
      if(re.test(key))return String(value);
    }
    return null;
  }

  function metadataRoot(meta){
    return meta?.AquoMetadata||meta?.AquoPlusWaarnemingMetadata?.AquoMetadata||meta||{};
  }

  function isWaterTemperature(meta){
    const root=metadataRoot(meta);
    return String(root?.Compartiment?.Code||'').toUpperCase()==='OW' &&
      String(root?.Grootheid?.Code||'').toUpperCase()==='T' &&
      (!root?.ProcesType||String(root.ProcesType).toLowerCase()==='meting');
  }

  function normalizeLocation(item){
    if(!item||typeof item!=='object')return null;
    const code=String(item.Code||item.code||'').trim();
    if(!code)return null;
    const lat=finite(item.Y??item.Latitude??item.latitude??item.Lat??item.lat);
    const lon=finite(item.X??item.Longitude??item.longitude??item.Lon??item.lon);
    if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {
      code,
      name:String(item.Naam||item.Name||item.name||code),
      lat,
      lon,
      messageId:ownMessageId(item)
    };
  }

  function catalogToStations(data){
    const locations=(data?.LocatieLijst||data?.locations||[])
      .map(normalizeLocation)
      .filter(Boolean);
    const metas=data?.AquoMetadataLijst||data?.aquoMetadataLijst||[];
    const links=data?.AquoMetadataLocatieLijst||data?.aquoMetadataLocatieLijst||[];
    const tempMetaIds=new Set(
      metas.filter(isWaterTemperature).map(ownMessageId).filter(Boolean)
    );

    // Bij afwijkende catalogusstructuur: als er geen koppeltabel bruikbaar is,
    // nemen we alle locaties en laat de laatste-waarnemingenservice bepalen
    // waar daadwerkelijk temperatuurmetingen aanwezig zijn.
    if(!tempMetaIds.size||!Array.isArray(links)||!links.length)return locations;

    const locationIds=new Set();
    links.forEach(link=>{
      const metaId=linkedMessageId(link,'aquo');
      const locationId=linkedMessageId(link,'location');
      if(metaId&&locationId&&tempMetaIds.has(metaId))locationIds.add(locationId);
    });
    return locationIds.size
      ?locations.filter(location=>location.messageId&&locationIds.has(location.messageId))
      :locations;
  }

  function readStationCache(){
    try{
      const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(cache&&Date.now()-Number(cache.savedAt)<CACHE_MAX_AGE&&Array.isArray(cache.stations)){
        return cache.stations;
      }
    }catch(e){}
    return null;
  }

  async function getStations(){
    const cached=readStationCache();
    if(cached?.length)return cached;
    const data=await postJson(CATALOG_URL,{
      CatalogusFilter:{Compartimenten:true,Grootheden:true,ProcesTypes:true}
    });
    const stations=catalogToStations(data);
    if(!stations.length)throw new Error('Geen RWS temperatuurmeetlocaties gevonden');
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),stations}));
    }catch(e){}
    return stations;
  }

  function currentCoordinates(){
    try{
      const point=window.liveNavState?.points?.at?.(-1);
      if(finite(point?.lat)!==null&&finite(point?.lon)!==null){
        return {lat:Number(point.lat),lon:Number(point.lon),source:'Live GPS'};
      }
    }catch(e){}
    try{
      const raw=localStorage.getItem(`mijnserenity-weather-793-${window.currentBoat?.id||'serenity'}`);
      const cached=JSON.parse(raw||'null');
      if(finite(cached?.coordinates?.lat)!==null&&finite(cached?.coordinates?.lon)!==null){
        return {lat:Number(cached.coordinates.lat),lon:Number(cached.coordinates.lon),source:'Laatste positie'};
      }
    }catch(e){}
    return null;
  }

  function getGps(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet beschikbaar'));
      navigator.geolocation.getCurrentPosition(
        p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,source:'Huidige GPS'}),
        reject,
        {enableHighAccuracy:true,maximumAge:60000,timeout:12000}
      );
    });
  }

  function findLocationObject(obj,inherited=null){
    if(!obj||typeof obj!=='object')return inherited;
    const candidate=obj.Locatie||obj.locatie||obj.Location||obj.location;
    if(candidate&&typeof candidate==='object'){
      const code=String(candidate.Code||candidate.code||'').trim();
      if(code){
        return {
          code,
          name:String(candidate.Naam||candidate.Name||candidate.name||code),
          lat:finite(candidate.Y??candidate.Latitude??candidate.latitude),
          lon:finite(candidate.X??candidate.Longitude??candidate.longitude)
        };
      }
    }
    return inherited;
  }

  function extractReadings(data){
    const readings=[];
    const seen=new Set();

    function visit(node,location=null){
      if(!node||typeof node!=='object')return;
      if(Array.isArray(node)){
        node.forEach(item=>visit(item,location));
        return;
      }
      const local=findLocationObject(node,location);
      const measure=node.Meetwaarde||node.meetwaarde||node.MeasurementValue||node.measurementValue;
      if(measure&&local?.code){
        const value=finite(
          measure.Waarde_Numeriek??measure.WaardeNumeriek??measure.value??measure.Value
        );
        const time=node.Tijdstip||node.tijdstip||node.Datumtijd||node.dateTime||node.time||null;
        if(value!==null&&value>-5&&value<45){
          const key=`${local.code}|${time||''}|${value}`;
          if(!seen.has(key)){
            seen.add(key);
            readings.push({...local,value,time});
          }
        }
      }
      Object.values(node).forEach(value=>{
        if(value&&typeof value==='object')visit(value,local);
      });
    }

    visit(data,null);
    return readings;
  }

  async function latestForStations(stations){
    const candidates=stations.slice(0,12);
    const data=await postJson(LATEST_URL,{
      LocatieLijst:candidates.map(station=>({Code:station.code})),
      AquoPlusWaarnemingMetadataLijst:[{
        AquoMetadata:{
          Compartiment:{Code:'OW'},
          Grootheid:{Code:'T'},
          ProcesType:'meting'
        },
        WaarnemingMetadata:{
          KwaliteitswaardecodeLijst:['00','10','20','25','30','40']
        }
      }]
    });
    return extractReadings(data);
  }

  function chooseReading(readings,stations,coords){
    const stationMap=new Map(stations.map(s=>[s.code,s]));
    let best=null;
    readings.forEach(reading=>{
      const station=stationMap.get(reading.code)||reading;
      const lat=finite(reading.lat)??finite(station?.lat);
      const lon=finite(reading.lon)??finite(station?.lon);
      if(lat===null||lon===null)return;
      const d=distanceKm(coords.lat,coords.lon,lat,lon);
      const timestamp=reading.time?new Date(reading.time).getTime():0;
      if(!best||d<best.distanceKm-0.01||
        (Math.abs(d-best.distanceKm)<0.01&&timestamp>best.timestamp)){
        best={
          value:reading.value,
          time:reading.time||null,
          timestamp:Number.isFinite(timestamp)?timestamp:0,
          code:reading.code,
          name:reading.name&&reading.name!==reading.code?reading.name:(station?.name||reading.code),
          lat,lon,distanceKm:d
        };
      }
    });
    return best;
  }

  function formatTemp(value){
    return `${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  }

  function formatDistance(value){
    if(value<1)return `${Math.round(value*1000)} m`;
    return `${value.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km`;
  }

  function formatDateTime(value){
    if(!value)return 'tijdstip onbekend';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'tijdstip onbekend';
    return date.toLocaleString('nl-NL',{
      weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'
    });
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
      <div class="ms71515-rws-head">
        <div>
          <span>🌡️ RIJKSWATERSTAAT · GEMETEN WATERTEMPERATUUR</span>
          <strong id="ms71515RwsWaterValue">Meetwaarde zoeken…</strong>
          <small id="ms71515RwsWaterMeta">Dichtstbijzijnde actuele meetlocatie wordt bepaald.</small>
        </div>
        <button type="button" id="ms71515RwsRefresh" aria-label="Watertemperatuur vernieuwen">↻</button>
      </div>
      <div id="ms71515RwsWaterMap" class="ms71515-rws-water-map" aria-label="Kaart met Serenity en het dichtstbijzijnde meetpunt"></div>
      <div class="ms71515-rws-detail">
        <div><small>MEETPUNT</small><strong id="ms71515RwsStation">–</strong></div>
        <div><small>AFSTAND</small><strong id="ms71515RwsDistance">–</strong></div>
        <div><small>GEMETEN</small><strong id="ms71515RwsTime">–</strong></div>
      </div>
      <p id="ms71515RwsWaterNote">Bron: Rijkswaterstaat WaterWebservices. Dit is de dichtstbijzijnde beschikbare gemeten waarde; de temperatuur op de exacte positie van Serenity kan iets afwijken.</p>
    `;

    const waterArticle=$('ms793WeatherWaterTemp')?.closest('article');
    const host=waterArticle?.parentElement?.parentElement||waterArticle?.parentElement||weather;
    if(waterArticle&&host){
      const container=waterArticle.parentElement;
      container?.insertAdjacentElement('afterend',panel);
    }else{
      weather.prepend(panel);
    }
    $('ms71515RwsRefresh')?.addEventListener('click',()=>refresh(true,true));
    return panel;
  }

  function renderMap(coords,result){
    const mapEl=$('ms71515RwsWaterMap');
    if(!mapEl||!window.L||!result)return;
    try{
      if(!map){
        map=L.map(mapEl,{zoomControl:true,attributionControl:true});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,
          attribution:'© OpenStreetMap'
        }).addTo(map);
        mapLayer=L.layerGroup().addTo(map);
      }
      mapLayer.clearLayers();
      const serenity=L.circleMarker([coords.lat,coords.lon],{
        radius:8,weight:3,fillOpacity:.9
      }).bindPopup('🚤 Serenity');
      const station=L.circleMarker([result.lat,result.lon],{
        radius:8,weight:3,fillOpacity:.9
      }).bindPopup(`🌡️ ${result.name}<br>${formatTemp(result.value)}`);
      const line=L.polyline([[coords.lat,coords.lon],[result.lat,result.lon]],{weight:3,dashArray:'7 7'});
      mapLayer.addLayer(serenity);
      mapLayer.addLayer(station);
      mapLayer.addLayer(line);
      map.fitBounds(line.getBounds().pad(.35),{maxZoom:12});
      setTimeout(()=>map?.invalidateSize(),150);
    }catch(error){
      console.warn('RWS watertemperatuurkaart kon niet worden getekend',error);
    }
  }

  function renderResult(coords,result){
    ensurePanel();
    lastResult={coords,result};
    const temp=formatTemp(result.value);
    const distance=formatDistance(result.distanceKm);
    const time=formatDateTime(result.time);

    if($('ms793WeatherWaterTemp'))$('ms793WeatherWaterTemp').textContent=temp;
    if($('ms793WeatherWaterSource')){
      $('ms793WeatherWaterSource').textContent=`RWS ${result.name} · ${distance} van Serenity`;
    }
    if($('ms71510WaterTemp'))$('ms71510WaterTemp').textContent=temp;

    if($('ms71515RwsWaterValue'))$('ms71515RwsWaterValue').textContent=temp;
    if($('ms71515RwsWaterMeta'))$('ms71515RwsWaterMeta').textContent=`Dichtstbijzijnde gemeten waarde · ${result.name}`;
    if($('ms71515RwsStation'))$('ms71515RwsStation').textContent=result.name;
    if($('ms71515RwsDistance'))$('ms71515RwsDistance').textContent=distance;
    if($('ms71515RwsTime'))$('ms71515RwsTime').textContent=time;

    try{
      window.liveNavState=window.liveNavState||{};
      window.liveNavState.weather=window.liveNavState.weather||{};
      window.liveNavState.weather.waterTemperature=result.value;
      window.liveNavState.weather.waterTemperatureSource='Rijkswaterstaat';
      window.liveNavState.weather.waterTemperatureStation=result.name;
      window.liveNavState.weather.waterTemperatureDistanceKm=result.distanceKm;
    }catch(e){}
    renderMap(coords,result);
  }

  function renderError(message){
    ensurePanel();
    if($('ms71515RwsWaterValue'))$('ms71515RwsWaterValue').textContent='Geen RWS-meting gevonden';
    if($('ms71515RwsWaterMeta'))$('ms71515RwsWaterMeta').textContent=message;
    if($('ms71515RwsStation'))$('ms71515RwsStation').textContent='–';
    if($('ms71515RwsDistance'))$('ms71515RwsDistance').textContent='–';
    if($('ms71515RwsTime'))$('ms71515RwsTime').textContent='–';
  }

  async function refresh(force=false,forceGps=false){
    if(busy)return;
    if(!force&&Date.now()-lastRun<REFRESH_MS)return;
    busy=true;
    lastRun=Date.now();
    ensurePanel();
    try{
      let coords=forceGps?null:currentCoordinates();
      if(!coords)coords=await getGps();
      const stations=await getStations();
      const nearest=stations
        .map(station=>({...station,distanceKm:distanceKm(coords.lat,coords.lon,station.lat,station.lon)}))
        .sort((a,b)=>a.distanceKm-b.distanceKm);
      let readings=[];
      // Begin dichtbij. Als een station tijdelijk geen geldige meting heeft,
      // vraag een bredere groep op.
      for(const count of [6,12]){
        readings=await latestForStations(nearest.slice(0,count));
        if(readings.length)break;
      }
      const result=chooseReading(readings,nearest,coords);
      if(!result)throw new Error('Geen recente geldige RWS-watertemperatuur beschikbaar');
      renderResult(coords,result);
    }catch(error){
      console.warn('RWS watertemperatuur ophalen mislukt:',error);
      renderError(error?.message||'Rijkswaterstaat is tijdelijk niet bereikbaar.');
    }finally{
      busy=false;
    }
  }

  function openWaterTemperature(){
    try{window.captainNavigate?.('weather');}catch(e){}
    setTimeout(()=>{
      ensurePanel()?.scrollIntoView({behavior:'smooth',block:'start'});
      if(lastResult)renderMap(lastResult.coords,lastResult.result);
      refresh(false,false);
    },350);
  }

  function bindStartTile(){
    const value=$('ms71510WaterTemp');
    const button=value?.closest('button');
    if(!button||button.dataset.rwsWaterBound==='1')return;
    button.dataset.rwsWaterBound='1';
    button.addEventListener('click',()=>setTimeout(openWaterTemperature,30));
  }

  function hookWeatherRefresh(){
    const original=window.ms709RefreshWeather;
    if(typeof original!=='function'||original.__rwsWaterWrapped)return;
    const wrapped=async function(...args){
      const result=await original.apply(this,args);
      setTimeout(()=>refresh(Boolean(args[0]),Boolean(args[1])),50);
      return result;
    };
    wrapped.__rwsWaterWrapped=true;
    window.ms709RefreshWeather=wrapped;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    ensurePanel();
    bindStartTile();
    hookWeatherRefresh();
    setTimeout(()=>refresh(false,false),1200);
    setInterval(()=>refresh(false,false),REFRESH_MS);
    const observer=new MutationObserver(()=>{
      bindStartTile();
      if(!$('ms71515RwsWaterPanel'))ensurePanel();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  },{once:true});

  window.ms71515RefreshRwsWaterTemperature=refresh;
  window.ms71515OpenWaterTemperature=openWaterTemperature;
})();
