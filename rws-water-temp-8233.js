/* MijnSerenity 8.23.3 — robuuste RWS-watertemperatuur voor binnenwater.
   Gebruikt de officiële actuele RWS-temperatuurmeting via de bestaande
   same-origin Netlify-proxy en houdt de zichtbare weerkaart leidend. */
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

    try{
      window.liveNavState=window.liveNavState||{};
      window.liveNavState.weather=window.liveNavState.weather||{};
      Object.assign(window.liveNavState.weather,{
        waterTemperature:reading.value,
        waterTemperatureSource:'Rijkswaterstaat',
        waterTemperatureStation:station,
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
      console.warn('RWS watertemperatuur 8.23.3:',error);
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
