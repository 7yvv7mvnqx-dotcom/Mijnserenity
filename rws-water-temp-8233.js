/* MijnSerenity 8.23.4 — robuuste RWS-watertemperatuur voor binnenwater.
   Gebruikt de officiële actuele RWS-temperatuurmeting via de bestaande
   same-origin Netlify-proxy en houdt de zichtbare weerkaart leidend.
   Tik op de gemeten temperatuur voor de exacte RWS-meetlocatie. */
(()=>{
  'use strict';
  if(window.__msRwsWaterTemp8233)return;
  window.__msRwsWaterTemp8233=true;

  const CATALOG_URL='/api/rws-water-catalogus';
  const LATEST_URL='/api/rws-water-latest';
  const CACHE_KEY='mijnserenity-rws-waterstations-v2';
  const CACHE_MAX_AGE=24*60*60*1000;
  const REFRESH_MS=5*60*1000;
  const REQUEST_TIMEOUT_MS=15000;
  const $=id=>document.getElementById(id);

  let busy=false;
  let lastAttempt=0;
  let lastReading=null;
  let locationMap=null;

  function finite(value){
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function codeOf(value){
    if(value===null||value===undefined)return '';
    if(typeof value==='object')return String(value.Code??value.code??value.Waarde??value.value??'').trim();
    return String(value).trim();
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
    const compartment=codeOf(root?.Compartiment).toUpperCase();
    const quantity=codeOf(root?.Grootheid).toUpperCase();
    const process=codeOf(root?.ProcesType).toLowerCase();
    return compartment==='OW'&&quantity==='T'&&(!process||process==='meting');
  }

  function normalizeLocation(item){
    if(!item||typeof item!=='object')return null;
    const stationCode=String(item.Code??item.code??'').trim();
    const lat=finite(item.Y??item.Latitude??item.latitude??item.Lat??item.lat);
    const lon=finite(item.X??item.Longitude??item.longitude??item.Lon??item.lon??item.Lng??item.lng);
    if(!stationCode||lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {
      code:stationCode,
      name:String(item.Naam??item.Name??item.name??stationCode).trim()||stationCode,
      lat,lon,messageId:ownMessageId(item)
    };
  }

  function catalogToStations(data){
    const locations=(data?.LocatieLijst||data?.locations||[]).map(normalizeLocation).filter(Boolean);
    const metadata=data?.AquoMetadataLijst||data?.aquoMetadataLijst||[];
    const links=data?.AquoMetadataLocatieLijst||data?.aquoMetadataLocatieLijst||[];
    const tempMetaIds=new Set(metadata.filter(isWaterTemperature).map(ownMessageId).filter(Boolean));

    if(tempMetaIds.size&&Array.isArray(links)&&links.length){
      const locationIds=new Set();
      links.forEach(link=>{
        const metadataId=linkedMessageId(link,'aquo');
        const locationId=linkedMessageId(link,'location');
        if(metadataId&&locationId&&tempMetaIds.has(metadataId))locationIds.add(locationId);
      });
      const filtered=locations.filter(location=>location.messageId&&locationIds.has(location.messageId));
      if(filtered.length)return filtered;
    }

    /* Als de koppeltabel van RWS wijzigt, liever iets ruimer zoeken dan de
       temperatuurkaart volledig leeg laten. */
    return locations;
  }

  async function postJson(url,body){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(url,{
        method:'POST',cache:'no-store',signal:controller.signal,
        headers:{Accept:'application/json','Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if(response.status===204)return null;
      const text=await response.text();
      if(!response.ok)throw new Error(`RWS HTTP ${response.status}${text?`: ${text.slice(0,120)}`:''}`);
      if(!text.trim())return null;
      try{return JSON.parse(text)}catch{throw new Error('RWS gaf geen geldige JSON terug')}
    }catch(error){
      if(error?.name==='AbortError')throw new Error('Rijkswaterstaat reageert te langzaam');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  function stationCache(){
    try{
      const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(cached&&Date.now()-Number(cached.savedAt)<CACHE_MAX_AGE&&Array.isArray(cached.stations)&&cached.stations.length){
        return cached.stations;
      }
    }catch{}
    return null;
  }

  async function getStations(){
    const cached=stationCache();
    if(cached)return cached;
    const data=await postJson(CATALOG_URL,{CatalogusFilter:{Compartimenten:true,Grootheden:true,ProcesTypes:true}});
    const stations=catalogToStations(data||{});
    if(!stations.length)throw new Error('Geen RWS-meetlocaties gevonden');
    try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),stations}))}catch{}
    return stations;
  }

  function coordinatesFromState(){
    try{
      const state=window.liveNavState||{};
      const directLat=finite(state.currentLat??state.lat);
      const directLon=finite(state.currentLon??state.lon??state.lng);
      if(directLat!==null&&directLon!==null)return {lat:directLat,lon:directLon};
      const point=Array.isArray(state.points)&&state.points.length?state.points[state.points.length-1]:null;
      const lat=finite(point?.lat),lon=finite(point?.lon??point?.lng);
      if(lat!==null&&lon!==null)return {lat,lon};
    }catch{}
    try{
      const key=`mijnserenity-weather-793-${window.currentBoat?.id||'serenity'}`;
      const cached=JSON.parse(localStorage.getItem(key)||'null');
      const lat=finite(cached?.coordinates?.lat),lon=finite(cached?.coordinates?.lon);
      if(lat!==null&&lon!==null)return {lat,lon};
    }catch{}
    return null;
  }

  function getGps(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet beschikbaar'));
      navigator.geolocation.getCurrentPosition(
        position=>resolve({lat:position.coords.latitude,lon:position.coords.longitude}),
        ()=>reject(new Error('GPS-positie niet beschikbaar')),
        {enableHighAccuracy:true,maximumAge:60000,timeout:12000}
      );
    });
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

  function findLocation(node,inherited=null){
    if(!node||typeof node!=='object')return inherited;
    const candidate=node.Locatie||node.locatie||node.Location||node.location;
    if(!candidate||typeof candidate!=='object')return inherited;
    const stationCode=String(candidate.Code??candidate.code??'').trim();
    if(!stationCode)return inherited;
    return {
      code:stationCode,
      name:String(candidate.Naam??candidate.Name??candidate.name??stationCode).trim()||stationCode,
      lat:finite(candidate.Y??candidate.Latitude??candidate.latitude),
      lon:finite(candidate.X??candidate.Longitude??candidate.longitude)
    };
  }

  function extractReadings(data){
    const readings=[];
    const seen=new Set();
    const visit=(node,location=null)=>{
      if(!node||typeof node!=='object')return;
      if(Array.isArray(node)){node.forEach(item=>visit(item,location));return;}
      const local=findLocation(node,location);
      const measure=node.Meetwaarde||node.meetwaarde||node.MeasurementValue||node.measurementValue;
      if(measure&&local?.code){
        const value=finite(measure.Waarde_Numeriek??measure.WaardeNumeriek??measure.value??measure.Value);
        const time=node.Tijdstip||node.tijdstip||node.Datumtijd||node.dateTime||node.time||null;
        if(value!==null&&value>-5&&value<45){
          const key=`${local.code}|${time||''}|${value}`;
          if(!seen.has(key)){
            seen.add(key);
            readings.push({...local,value,time});
          }
        }
      }
      Object.values(node).forEach(value=>{if(value&&typeof value==='object')visit(value,local)});
    };
    visit(data,null);
    return readings;
  }

  async function latestForStations(stations){
    if(!stations.length)return [];
    const locations=stations.map(station=>({Code:station.code}));

    /* Dit is de huidige officiële RWS-vraag voor actuele watertemperatuur. */
    const officialBody={
      LocatieLijst:locations,
      AquoPlusWaarnemingMetadataLijst:[{
        AquoMetadata:{Compartiment:{Code:'OW'},Grootheid:{Code:'T'}},
        WaarnemingMetadata:{OpdrachtgevendeInstantieLijst:['RIKZMON_TEMP']}
      }]
    };
    let data=await postJson(LATEST_URL,officialBody);
    let readings=extractReadings(data);
    if(readings.length)return readings;

    /* Sommige binnenwaterlocaties komen zonder instantiefilter terug. */
    data=await postJson(LATEST_URL,{
      LocatieLijst:locations,
      AquoPlusWaarnemingMetadataLijst:[{
        AquoMetadata:{Compartiment:{Code:'OW'},Grootheid:{Code:'T'},ProcesType:'meting'}
      }]
    });
    readings=extractReadings(data);
    return readings;
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
        best={
          value:reading.value,time:reading.time||null,
          timestamp:Number.isFinite(timestamp)?timestamp:0,
          code:reading.code,
          name:reading.name&&reading.name!==reading.code?reading.name:(station?.name||reading.code),
          lat,lon,distanceKm:distance
        };
      }
    });
    return best;
  }

  const formatTemp=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  const formatDistance=value=>value<1?`${Math.round(value*1000)} m`:`${value.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km`;

  function formatMeasuredAt(value){
    if(!value)return 'Tijdstip niet beschikbaar';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'Tijdstip niet beschikbaar';
    return date.toLocaleString('nl-NL',{
      day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
    });
  }

  function ensureLocationSheet(){
    let sheet=$('ms8234WaterLocationSheet');
    if(sheet)return sheet;

    if(!$('ms8234WaterLocationStyle')){
      const style=document.createElement('style');
      style.id='ms8234WaterLocationStyle';
      style.textContent=`
        #ms793WeatherWaterTemp[data-ms-water-location="1"]{cursor:pointer;text-decoration:underline;text-decoration-color:rgba(132,220,244,.48);text-decoration-thickness:1px;text-underline-offset:5px;touch-action:manipulation}
        #ms793WeatherWaterTemp[data-ms-water-location="1"]:focus-visible{outline:2px solid #8fe4f6;outline-offset:5px;border-radius:6px}
        .ms8234-water-overlay{position:fixed;inset:0;z-index:100000;background:rgba(1,12,19,.72);display:flex;align-items:flex-end;justify-content:center;padding:18px 12px 0}
        .ms8234-water-overlay[hidden]{display:none!important}
        .ms8234-water-sheet{width:min(100%,620px);max-height:82%;overflow:auto;background:linear-gradient(180deg,#123847 0%,#082734 100%);color:#f5fbfd;border:1px solid rgba(137,214,237,.3);border-bottom:0;border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(0,0,0,.34);-webkit-overflow-scrolling:touch}
        .ms8234-water-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
        .ms8234-water-kicker{font-size:12px;line-height:1.2;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9dc4d0}
        .ms8234-water-title{font-size:24px;line-height:1.1;font-weight:850;margin:4px 0 0}
        .ms8234-water-close{border:1px solid rgba(155,216,233,.26);background:rgba(255,255,255,.05);color:#fff;width:44px;height:44px;border-radius:50%;font-size:26px;line-height:1;display:grid;place-items:center;flex:0 0 auto}
        .ms8234-water-reading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 0 15px;border-bottom:1px solid rgba(153,215,232,.18)}
        .ms8234-water-temp{font-size:34px;font-weight:900;letter-spacing:-.02em;color:#9be7f8}
        .ms8234-water-distance{font-size:14px;color:#afcbd4;text-align:right}
        .ms8234-water-map{height:220px;margin:15px 0;border-radius:16px;overflow:hidden;background:#163946;border:1px solid rgba(153,215,232,.2)}
        .ms8234-water-map-fallback{height:100%;display:grid;place-items:center;text-align:center;padding:20px;color:#bdd5dc;font-size:14px}
        .ms8234-water-grid{display:grid;grid-template-columns:120px minmax(0,1fr);gap:9px 12px;font-size:14px;line-height:1.35;margin:0 0 16px}
        .ms8234-water-grid dt{color:#8fbbc8;font-weight:700}
        .ms8234-water-grid dd{margin:0;color:#f4fbfd;font-weight:650;overflow-wrap:anywhere}
        .ms8234-water-actions{display:grid;grid-template-columns:1fr;gap:10px}
        .ms8234-water-maplink{min-height:48px;border-radius:14px;background:#7fdcf2;color:#062532!important;font-weight:850;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:12px 16px}
        body.ms8234-water-open{overflow:hidden}
        .ms8234-water-sheet .leaflet-control-attribution{font-size:9px}
        @media (min-width:520px){.ms8234-water-grid{grid-template-columns:145px minmax(0,1fr)}}
      `;
      document.head.appendChild(style);
    }

    sheet=document.createElement('div');
    sheet.id='ms8234WaterLocationSheet';
    sheet.className='ms8234-water-overlay';
    sheet.hidden=true;
    sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`
      <section class="ms8234-water-sheet" role="dialog" aria-modal="true" aria-labelledby="ms8234WaterLocationTitle">
        <div class="ms8234-water-head">
          <div>
            <div class="ms8234-water-kicker">Rijkswaterstaat · meetpunt</div>
            <h2 class="ms8234-water-title" id="ms8234WaterLocationTitle">Meetlocatie watertemperatuur</h2>
          </div>
          <button class="ms8234-water-close" type="button" data-ms-water-close aria-label="Sluiten">×</button>
        </div>
        <div class="ms8234-water-reading">
          <div class="ms8234-water-temp" data-ms-water-temp>—</div>
          <div class="ms8234-water-distance" data-ms-water-distance>—</div>
        </div>
        <div class="ms8234-water-map" data-ms-water-map aria-label="Kaart met RWS meetlocatie"></div>
        <dl class="ms8234-water-grid">
          <dt>Meetlocatie</dt><dd data-ms-water-station>—</dd>
          <dt>Stationcode</dt><dd data-ms-water-code>—</dd>
          <dt>Gemeten op</dt><dd data-ms-water-time>—</dd>
          <dt>Coördinaten</dt><dd data-ms-water-coordinates>—</dd>
        </dl>
        <div class="ms8234-water-actions">
          <a class="ms8234-water-maplink" data-ms-water-maplink href="#" target="_blank" rel="noopener">Open meetpunt in Kaarten</a>
        </div>
      </section>`;
    document.body.appendChild(sheet);

    const close=()=>closeLocationSheet();
    sheet.querySelector('[data-ms-water-close]')?.addEventListener('click',close);
    sheet.addEventListener('click',event=>{if(event.target===sheet)close()});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!sheet.hidden)close();
    });
    return sheet;
  }

  function closeLocationSheet(){
    const sheet=$('ms8234WaterLocationSheet');
    if(!sheet)return;
    sheet.hidden=true;
    sheet.setAttribute('aria-hidden','true');
    document.body.classList.remove('ms8234-water-open');
    if(locationMap){
      try{locationMap.remove()}catch{}
      locationMap=null;
    }
  }

  function openLocationSheet(reading){
    if(!reading)return;
    const lat=finite(reading.lat),lon=finite(reading.lon);
    if(lat===null||lon===null)return;
    const station=String(reading.name||reading.code||'RWS meetpunt').trim();
    const sheet=ensureLocationSheet();
    sheet.querySelector('[data-ms-water-temp]').textContent=formatTemp(reading.value);
    sheet.querySelector('[data-ms-water-distance]').textContent=`${formatDistance(reading.distanceKm)} vanaf huidige positie`;
    sheet.querySelector('[data-ms-water-station]').textContent=station;
    sheet.querySelector('[data-ms-water-code]').textContent=String(reading.code||'—');
    sheet.querySelector('[data-ms-water-time]').textContent=formatMeasuredAt(reading.time);
    sheet.querySelector('[data-ms-water-coordinates]').textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    const mapLink=sheet.querySelector('[data-ms-water-maplink]');
    mapLink.href=`https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lon}`)}&q=${encodeURIComponent(station)}`;

    sheet.hidden=false;
    sheet.setAttribute('aria-hidden','false');
    document.body.classList.add('ms8234-water-open');
    sheet.querySelector('[data-ms-water-close]')?.focus({preventScroll:true});

    const mapNode=sheet.querySelector('[data-ms-water-map]');
    if(locationMap){
      try{locationMap.remove()}catch{}
      locationMap=null;
    }
    mapNode.replaceChildren();
    if(window.L&&typeof window.L.map==='function'){
      try{
        locationMap=window.L.map(mapNode,{zoomControl:true,attributionControl:true}).setView([lat,lon],14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,
          attribution:'&copy; OpenStreetMap'
        }).addTo(locationMap);
        window.L.marker([lat,lon]).addTo(locationMap).bindPopup(station).openPopup();
        requestAnimationFrame(()=>{try{locationMap?.invalidateSize()}catch{}});
      }catch(error){
        console.debug('Meetlocatiekaart kon niet worden geopend:',error);
        mapNode.innerHTML='<div class="ms8234-water-map-fallback">Kaartweergave niet beschikbaar.<br>Gebruik “Open meetpunt in Kaarten”.</div>';
      }
    }else{
      mapNode.innerHTML='<div class="ms8234-water-map-fallback">Kaartweergave niet beschikbaar.<br>Gebruik “Open meetpunt in Kaarten”.</div>';
    }
  }

  function bindLocationInteraction(reading){
    const valueNode=$('ms793WeatherWaterTemp');
    if(!valueNode)return;
    valueNode.__msWaterLocationReading=reading;
    valueNode.dataset.msWaterLocation='1';
    valueNode.setAttribute('role','button');
    valueNode.setAttribute('tabindex','0');
    valueNode.setAttribute('aria-label',`Watertemperatuur ${formatTemp(reading.value)}. Toon RWS meetlocatie.`);
    valueNode.title='Tik voor de RWS-meetlocatie';
    if(valueNode.dataset.msWaterLocationBound==='1')return;
    valueNode.dataset.msWaterLocationBound='1';
    valueNode.addEventListener('click',()=>openLocationSheet(valueNode.__msWaterLocationReading));
    valueNode.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        openLocationSheet(valueNode.__msWaterLocationReading);
      }
    });
  }

  function render(reading){
    if(!reading)return false;
    lastReading=reading;
    const temperature=formatTemp(reading.value);
    const distance=formatDistance(reading.distanceKm);
    const station=String(reading.name||reading.code||'RWS meetpunt').trim();

    const valueNode=$('ms793WeatherWaterTemp');
    if(valueNode)valueNode.textContent=temperature;
    const sourceNode=$('ms793WeatherWaterSource');
    if(sourceNode)sourceNode.textContent=`Rijkswaterstaat · gemeten · ${station} · ${distance}`;
    const startNode=$('ms71510WaterTemp');
    if(startNode)startNode.textContent=temperature;
    const marineNode=$('mgWaterTemp');
    if(marineNode)marineNode.textContent=temperature;

    /* Werk ook het bestaande uitgebreide RWS-paneel bij als dat al bestaat. */
    if($('ms71515RwsWaterValue'))$('ms71515RwsWaterValue').textContent=temperature;
    if($('ms71515RwsWaterMeta'))$('ms71515RwsWaterMeta').textContent=`Dichtstbijzijnde gemeten waarde · ${station}`;
    if($('ms71515RwsStation'))$('ms71515RwsStation').textContent=station;
    if($('ms71515RwsDistance'))$('ms71515RwsDistance').textContent=distance;

    bindLocationInteraction(reading);

    try{
      window.liveNavState=window.liveNavState||{};
      window.liveNavState.weather=window.liveNavState.weather||{};
      Object.assign(window.liveNavState.weather,{
        waterTemperature:reading.value,
        waterTemperatureSource:'Rijkswaterstaat',
        waterTemperatureStation:station,
        waterTemperatureStationCode:reading.code||null,
        waterTemperatureStationLat:reading.lat,
        waterTemperatureStationLon:reading.lon,
        waterTemperatureDistanceKm:reading.distanceKm,
        waterTemperatureMeasuredAt:reading.time||null
      });
    }catch{}

    try{window.dispatchEvent(new CustomEvent('mijnserenity-rws-water-temperature',{detail:{...reading,source:'Rijkswaterstaat'}}))}catch{}
    return true;
  }

  async function refresh(force=false){
    if(lastReading)render(lastReading);
    if(busy)return false;
    if(!force&&Date.now()-lastAttempt<REFRESH_MS)return Boolean(lastReading);
    busy=true;
    lastAttempt=Date.now();
    try{
      let coords=coordinatesFromState();
      if(!coords)coords=await getGps();
      const stations=await getStations();
      const nearest=stations
        .map(station=>({...station,distanceKm:distanceKm(coords.lat,coords.lon,station.lat,station.lon)}))
        .sort((a,b)=>a.distanceKm-b.distanceKm);

      let readings=[];
      /* Verruim stap voor stap. Zo vinden we ook binnenwaterposities waar het
         dichtstbijzijnde algemene RWS-punt geen temperatuursensor heeft. */
      for(const count of [12,30,60,120]){
        try{
          readings=await latestForStations(nearest.slice(0,count));
        }catch(error){
          console.debug(`RWS temperatuur ${count} locaties:`,error);
          readings=[];
        }
        if(readings.length)break;
      }

      const result=chooseReading(readings,nearest,coords);
      if(!result)throw new Error('Geen actuele RWS-watertemperatuur gevonden');
      render(result);
      return true;
    }catch(error){
      console.warn('RWS watertemperatuur 8.23.4:',error);
      if(lastReading)render(lastReading);
      return false;
    }finally{
      busy=false;
    }
  }

  function schedule(force=false){
    /* Open-Meteo kan na zijn eigen refresh nog even "niet beschikbaar" zetten.
       Herstel daarom de gemeten RWS-waarde direct én kort erna. */
    if(lastReading)render(lastReading);
    [80,500,1400].forEach(delay=>setTimeout(()=>{
      if(lastReading)render(lastReading);
    },delay));
    setTimeout(()=>refresh(force),180);
  }

  window.ms8233RefreshRwsWaterTemperature=refresh;
  ['mijnserenity-weather-updated','mijnserenity:routechange','mijnserenity:dashboard-ready','online']
    .forEach(name=>window.addEventListener(name,()=>schedule(name==='online'),{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(false)},{passive:true});
  window.addEventListener('pageshow',()=>schedule(true),{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});
  else schedule(true);
})();