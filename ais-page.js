
/* ============================================================
   MijnSerenity Cloud 7.1.1 — AIS boten volgen
   ============================================================ */

const MS711_DEFAULT_RADIUS_KM=20;
const MS711_DEFAULT_REFRESH_SECONDS=30;

let ms711AisMap=null;
let ms711OwnMarker=null;
let ms711RangeCircle=null;
let ms711VesselMarkers=new Map();
let ms711NearbyVessels=[];
let ms711WatchedPositions=[];
let ms711SearchVessels=[];
let ms711Coordinates=null;
let ms711Configured=null;
let ms711Busy=false;
let ms711WatchBusy=false;
let ms711SearchBusy=false;
let ms711RefreshTimer=null;
let ms711CountdownTimer=null;
let ms711NextRefreshAt=0;
let ms711SelectedVessel=null;
let ms711LastUpdatedAt=0;
let ms711MapUserMoved=false;

function ms711PreferencesKey(){
  return `mijnserenity-ais-prefs-${currentBoat?.id||'serenity'}`;
}

function ms711WatchKey(){
  return `mijnserenity-ais-watch-${currentBoat?.id||'serenity'}`;
}

function ms711ReadJson(key,fallback){
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'null');
    return parsed===null?fallback:parsed;
  }catch{
    return fallback;
  }
}

function ms711Preferences(){
  return {
    radiusKm:MS711_DEFAULT_RADIUS_KM,
    alertDistanceKm:1,
    refreshSeconds:MS711_DEFAULT_REFRESH_SECONDS,
    ...ms711ReadJson(ms711PreferencesKey(),{})
  };
}

function ms711Watchlist(){
  const items=ms711ReadJson(ms711WatchKey(),[]);
  return Array.isArray(items)
    ?items.filter(item=>/^\d{9}$/.test(String(item.mmsi||''))).slice(0,50)
    :[];
}

function ms711WriteJson(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
  }catch{}
}

function ms711SavePreferences(){
  const preferences={
    radiusKm:Number(document.getElementById('ms711Radius')?.value)||20,
    alertDistanceKm:Number(document.getElementById('ms711AlertDistance')?.value)||1,
    refreshSeconds:Number(document.getElementById('ms711RefreshSeconds')?.value)||30
  };
  ms711WriteJson(ms711PreferencesKey(),preferences);
  return preferences;
}

function ms711LoadPreferences(){
  const preferences=ms711Preferences();
  const values={
    ms711Radius:String(preferences.radiusKm),
    ms711AlertDistance:String(preferences.alertDistanceKm),
    ms711RefreshSeconds:String(preferences.refreshSeconds)
  };
  Object.entries(values).forEach(([id,value])=>{
    const element=document.getElementById(id);
    if(element)element.value=value;
  });
}

function ms711SetText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=value;
}

function ms711Esc(value){
  return typeof esc==='function'
    ?esc(String(value??''))
    :String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
}

function ms711Number(value,digits=1){
  const number=Number(value);
  return Number.isFinite(number)
    ?number.toLocaleString('nl-NL',{
        minimumFractionDigits:0,
        maximumFractionDigits:digits
      })
    :'–';
}

function ms711Haversine(a,b){
  if(typeof haversineKm==='function'){
    return haversineKm(a,b);
  }
  const radians=degrees=>degrees*Math.PI/180;
  const lat1=radians(Number(a.lat));
  const lat2=radians(Number(b.lat));
  const dLat=lat2-lat1;
  const dLon=radians(Number(b.lon)-Number(a.lon));
  const h=Math.sin(dLat/2)**2+
    Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

function ms711BearingName(degrees){
  const value=Number(degrees);
  if(!Number.isFinite(value))return '–';
  const names=['N','NO','O','ZO','Z','ZW','W','NW'];
  return `${names[Math.round((((value%360)+360)%360)/45)%8]} ${Math.round(value)}°`;
}

function ms711NavStatus(value){
  const statuses={
    0:'Varend op motor',
    1:'Voor anker',
    2:'Niet manoeuvreerbaar',
    3:'Beperkt manoeuvreerbaar',
    4:'Beperkt door diepgang',
    5:'Afgemeerd',
    6:'Aan de grond',
    7:'Bezig met vissen',
    8:'Varend onder zeil',
    14:'AIS-SART actief',
    15:'Niet opgegeven'
  };
  return statuses[Number(value)]||'Status onbekend';
}

function ms711AgeText(value){
  const time=new Date(value).getTime();
  if(!Number.isFinite(time))return 'tijd onbekend';
  const seconds=Math.max(0,Math.round((Date.now()-time)/1000));
  if(seconds<60)return `${seconds} sec geleden`;
  const minutes=Math.round(seconds/60);
  if(minutes<60)return `${minutes} min geleden`;
  return `${Math.round(minutes/60)} uur geleden`;
}

function ms711CoordinatesFromKnownData(){
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

  return null;
}

function ms711GetPosition(){
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

async function ms711ResolveCoordinates(force=false){
  if(!force){
    const known=ms711CoordinatesFromKnownData();
    if(known)return known;
  }
  return ms711GetPosition();
}

async function ms711Api(mode,parameters={}){
  const query=new URLSearchParams({
    mode,
    ...Object.fromEntries(
      Object.entries(parameters)
        .filter(([,value])=>value!==undefined&&value!==null&&value!=='')
        .map(([key,value])=>[key,String(value)])
    )
  });

  const response=await fetch(`/api/ais?${query.toString()}`,{
    headers:{Accept:'application/json'},
    cache:'no-store'
  });

  let payload=null;
  try{
    payload=await response.json();
  }catch{
    payload={};
  }

  if(!response.ok){
    const error=new Error(
      payload?.error?.message||
      payload?.message||
      `AIS-service gaf fout ${response.status}`
    );
    error.status=response.status;
    error.code=payload?.error?.code||payload?.code||'ais_error';
    error.retryAfter=Number(response.headers.get('Retry-After')||0);
    throw error;
  }

  return payload;
}

function ms711NormalisePositions(payload){
  const data=payload?.data||payload||{};
  const source=
    data.vessels||
    data.vesselPositions||
    data.positions||
    (Array.isArray(data)?data:[]);

  if(!Array.isArray(source))return [];

  const latestByMmsi=new Map();

  source.forEach(item=>{
    const latitude=Number(
      item.latitude??
      item.lat??
      item.location?.coordinates?.[1]
    );
    const longitude=Number(
      item.longitude??
      item.lon??
      item.location?.coordinates?.[0]
    );
    const mmsi=String(item.mmsi??item.MMSI??'').trim();

    if(
      !/^\d{9}$/.test(mmsi)||
      !Number.isFinite(latitude)||
      !Number.isFinite(longitude)||
      Math.abs(latitude)>90||
      Math.abs(longitude)>180
    ){
      return;
    }

    const vessel={
      ...item,
      mmsi,
      vessel_name:String(
        item.vessel_name||
        item.name||
        item.ship_name||
        `MMSI ${mmsi}`
      ).trim(),
      latitude,
      longitude,
      sog:Number(item.sog),
      cog:Number(item.cog),
      heading:Number(item.heading),
      nav_status:item.nav_status,
      timestamp:
        item.timestamp||
        item.processed_timestamp||
        item.updated_at||
        null,
      suspected_glitch:Boolean(item.suspected_glitch)
    };

    const current=latestByMmsi.get(mmsi);
    const currentTime=new Date(current?.timestamp||0).getTime();
    const nextTime=new Date(vessel.timestamp||0).getTime();

    if(!current||nextTime>=currentTime){
      latestByMmsi.set(mmsi,vessel);
    }
  });

  return [...latestByMmsi.values()];
}

function ms711NormaliseSearch(payload){
  const data=payload?.data||payload||{};
  const source=data.vessels||(Array.isArray(data)?data:[]);
  if(!Array.isArray(source))return [];

  return source.map(item=>({
    ...item,
    mmsi:String(item.mmsi||'').trim(),
    name:String(item.name||item.vessel_name||'Onbekende boot').trim()
  })).filter(item=>/^\d{9}$/.test(item.mmsi));
}

function ms711IsWatched(mmsi){
  return ms711Watchlist()
    .some(item=>String(item.mmsi)===String(mmsi));
}

function ms711Distance(vessel){
  if(!ms711Coordinates)return Infinity;
  return ms711Haversine(
    {lat:ms711Coordinates.lat,lon:ms711Coordinates.lon},
    {lat:vessel.latitude,lon:vessel.longitude}
  );
}

function ms711EnhanceVessels(vessels){
  return vessels.map(vessel=>({
    ...vessel,
    distanceKm:ms711Distance(vessel),
    watched:ms711IsWatched(vessel.mmsi)
  })).sort((a,b)=>a.distanceKm-b.distanceKm);
}

function ms711InitMap(){
  const container=document.getElementById('ms711AisMap');
  if(!container||typeof L==='undefined')return;

  if(!ms711AisMap){
    ms711AisMap=L.map(container,{
      zoomControl:true,
      attributionControl:true,
      preferCanvas:true,
      minZoom:4,
      maxZoom:18
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom:19,
        attribution:'&copy; OpenStreetMap-bijdragers'
      }
    ).addTo(ms711AisMap);

    ms711AisMap.on('movestart',()=>{
      ms711MapUserMoved=true;
    });
  }

  requestAnimationFrame(()=>{
    ms711AisMap?.invalidateSize({pan:false});
  });
}

function ms711OwnPositionOnMap(center=false){
  if(!ms711Coordinates||!ms711AisMap)return;

  const latlng=[ms711Coordinates.lat,ms711Coordinates.lon];
  const radiusKm=Number(document.getElementById('ms711Radius')?.value)||20;

  if(!ms711OwnMarker){
    ms711OwnMarker=L.circleMarker(latlng,{
      radius:10,
      color:'#ffffff',
      weight:3,
      fillColor:'#45d3ff',
      fillOpacity:1,
      pane:'markerPane'
    }).addTo(ms711AisMap)
      .bindTooltip('Serenity',{direction:'top'});
  }else{
    ms711OwnMarker.setLatLng(latlng);
  }

  if(!ms711RangeCircle){
    ms711RangeCircle=L.circle(latlng,{
      radius:radiusKm*1000,
      color:'#45d3ff',
      weight:1,
      opacity:.35,
      fillColor:'#45d3ff',
      fillOpacity:.025,
      interactive:false
    }).addTo(ms711AisMap);
  }else{
    ms711RangeCircle
      .setLatLng(latlng)
      .setRadius(radiusKm*1000);
  }

  if(center||!ms711AisMap._loaded||!ms711MapUserMoved){
    ms711AisMap.setView(
      latlng,
      radiusKm<=5?12:radiusKm<=10?11:radiusKm<=20?10:radiusKm<=50?8:7,
      {animate:false}
    );
  }
}

function ms711VesselIcon(vessel){
  const preferences=ms711Preferences();
  const close=
    Number.isFinite(vessel.distanceKm)&&
    vessel.distanceKm<=preferences.alertDistanceKm;
  const watched=ms711IsWatched(vessel.mmsi);
  const heading=Number.isFinite(vessel.heading)&&vessel.heading>=0&&vessel.heading<360
    ?vessel.heading
    :Number.isFinite(vessel.cog)?vessel.cog:0;
  const className=close?'alert':watched?'watched':'normal';

  return L.divIcon({
    className:'ms711-vessel-icon-wrap',
    html:`<div class="ms711-vessel-icon ${className}" style="transform:rotate(${heading}deg)"><span></span></div>`,
    iconSize:[32,32],
    iconAnchor:[16,16],
    popupAnchor:[0,-14]
  });
}

function ms711PopupHtml(vessel){
  return `
    <div class="ms711-popup">
      <strong>${ms711Esc(vessel.vessel_name)}</strong>
      <small>MMSI ${ms711Esc(vessel.mmsi)}</small>
      <span>${ms711Number(vessel.distanceKm,2)} km · ${ms711Number(vessel.sog,1)} kn</span>
      <span>${ms711BearingName(vessel.cog)} · ${ms711NavStatus(vessel.nav_status)}</span>
      <button type="button" onclick="ms711OpenVessel('${ms711Esc(vessel.mmsi)}')">Open details</button>
    </div>
  `;
}

function ms711RenderMap(){
  ms711InitMap();
  if(!ms711AisMap)return;

  ms711OwnPositionOnMap(false);

  const all=ms711MergeVessels();
  const activeMmsi=new Set(all.map(vessel=>vessel.mmsi));

  for(const [mmsi,marker] of ms711VesselMarkers){
    if(!activeMmsi.has(mmsi)){
      marker.remove();
      ms711VesselMarkers.delete(mmsi);
    }
  }

  all.forEach(vessel=>{
    let marker=ms711VesselMarkers.get(vessel.mmsi);
    const latlng=[vessel.latitude,vessel.longitude];

    if(!marker){
      marker=L.marker(latlng,{
        icon:ms711VesselIcon(vessel),
        zIndexOffset:ms711IsWatched(vessel.mmsi)?500:0
      }).addTo(ms711AisMap);

      marker.on('click',()=>{
        ms711OpenVessel(vessel.mmsi);
      });

      ms711VesselMarkers.set(vessel.mmsi,marker);
    }else{
      marker.setLatLng(latlng);
      marker.setIcon(ms711VesselIcon(vessel));
    }

    marker.bindPopup(ms711PopupHtml(vessel));
  });

  const message=document.getElementById('ms711AisMapMessage');
  if(message){
    message.classList.toggle('hidden',Boolean(all.length));
    message.textContent=ms711Configured===false
      ?'Koppel eerst de veilige AIS-databron.'
      :all.length
        ?''
        :'Geen recente AIS-posities in dit gebied.';
  }

  requestAnimationFrame(()=>{
    ms711AisMap?.invalidateSize({pan:false});
  });
}

function ms711MergeVessels(){
  const map=new Map();
  [...ms711NearbyVessels,...ms711WatchedPositions].forEach(vessel=>{
    const current=map.get(vessel.mmsi);
    const currentTime=new Date(current?.timestamp||0).getTime();
    const nextTime=new Date(vessel.timestamp||0).getTime();
    if(!current||nextTime>=currentTime){
      map.set(vessel.mmsi,vessel);
    }
  });
  return ms711EnhanceVessels([...map.values()]);
}

function ms711VesselRow(vessel,watchContext=false){
  const preferences=ms711Preferences();
  const close=
    Number.isFinite(vessel.distanceKm)&&
    vessel.distanceKm<=preferences.alertDistanceKm;
  const watched=ms711IsWatched(vessel.mmsi);
  const speed=Number.isFinite(vessel.sog)
    ?`${ms711Number(vessel.sog,1)} kn · ${ms711Number(vessel.sog*1.852,1)} km/u`
    :'snelheid onbekend';

  return `
    <article class="ms711-vessel-row ${close?'alert':''} ${watched?'watched':''}">
      <button class="ms711-vessel-main" type="button"
        onclick="ms711OpenVessel('${ms711Esc(vessel.mmsi)}')">
        <span class="ms711-row-arrow" style="transform:rotate(${Number.isFinite(vessel.heading)?vessel.heading:Number.isFinite(vessel.cog)?vessel.cog:0}deg)">▲</span>
        <div>
          <strong>${ms711Esc(vessel.vessel_name)}</strong>
          <small>MMSI ${ms711Esc(vessel.mmsi)} · ${ms711AgeText(vessel.timestamp)}</small>
          <span>${ms711Number(vessel.distanceKm,2)} km · ${speed}</span>
          <span>${ms711NavStatus(vessel.nav_status)} · koers ${ms711BearingName(vessel.cog)}</span>
        </div>
      </button>
      <button class="ms711-watch-button ${watched?'active':''}" type="button"
        aria-label="${watched?'Niet meer volgen':'Boot volgen'}"
        title="${watched?'Niet meer volgen':'Boot volgen'}"
        onclick="ms711ToggleWatch('${ms711Esc(vessel.mmsi)}','${ms711Esc(vessel.vessel_name)}')">★</button>
    </article>
  `;
}

function ms711RenderNearby(){
  const list=document.getElementById('ms711NearbyList');
  if(!list)return;

  const vessels=ms711EnhanceVessels(ms711NearbyVessels);
  const preferences=ms711Preferences();
  const close=vessels.filter(vessel=>
    Number.isFinite(vessel.distanceKm)&&
    vessel.distanceKm<=preferences.alertDistanceKm
  );

  ms711SetText('ms711NearbyCount',String(vessels.length));
  ms711SetText(
    'ms711NearbyCountDetail',
    close.length
      ?`${close.length} binnen alarmafstand`
      :'boten rond Serenity'
  );
  ms711SetText('ms711NearbyBadge',String(vessels.length));

  const nearest=vessels[0];
  ms711SetText(
    'ms711NearestDistance',
    nearest?`${ms711Number(nearest.distanceKm,2)} km`:'–'
  );
  ms711SetText(
    'ms711NearestName',
    nearest?.vessel_name||'nog geen AIS-data'
  );

  list.innerHTML=vessels.length
    ?vessels.map(vessel=>ms711VesselRow(vessel)).join('')
    :`<div class="ms711-empty">${
      ms711Configured===false
        ?'Stel eerst de veilige AIS-koppeling in.'
        :'Geen recente AIS-posities in het gekozen gebied.'
    }</div>`;
}

function ms711RenderWatchlist(){
  const list=document.getElementById('ms711WatchList');
  if(!list)return;

  const watched=ms711Watchlist();
  ms711SetText('ms711WatchedCount',String(watched.length));

  if(!watched.length){
    list.innerHTML='<div class="ms711-empty">Zoek een boot en tik op ★ om deze te volgen.</div>';
    return;
  }

  const byMmsi=new Map(
    ms711EnhanceVessels(ms711WatchedPositions)
      .map(vessel=>[vessel.mmsi,vessel])
  );

  list.innerHTML=watched.map(item=>{
    const vessel=byMmsi.get(item.mmsi);
    if(vessel)return ms711VesselRow(vessel,true);

    return `
      <article class="ms711-vessel-row watched stale">
        <button class="ms711-vessel-main" type="button"
          onclick="ms711OpenVessel('${ms711Esc(item.mmsi)}')">
          <span class="ms711-row-arrow">▲</span>
          <div>
            <strong>${ms711Esc(item.name||`MMSI ${item.mmsi}`)}</strong>
            <small>MMSI ${ms711Esc(item.mmsi)}</small>
            <span>Actuele positie nog ophalen…</span>
          </div>
        </button>
        <button class="ms711-watch-button active" type="button"
          aria-label="Niet meer volgen" title="Niet meer volgen"
          onclick="ms711ToggleWatch('${ms711Esc(item.mmsi)}','${ms711Esc(item.name||'')}')">★</button>
      </article>
    `;
  }).join('');
}

function ms711RenderAll(){
  ms711RenderNearby();
  ms711RenderWatchlist();
  ms711RenderMap();
}

function ms711SetConfigured(configured,message=''){
  ms711Configured=Boolean(configured);
  document.getElementById('ms711SetupCard')
    ?.classList.toggle('hidden',ms711Configured);
  ms711SetText(
    'ms711AisStatus',
    ms711Configured
      ?message||'AIS-databron is veilig gekoppeld.'
      :'AIS-databron nog niet ingesteld.'
  );
}

async function ms711CheckStatus(){
  try{
    const payload=await ms711Api('status');
    ms711SetConfigured(
      Boolean(payload.configured),
      payload.configured
        ?'Veilige AIS-verbinding actief.'
        :'AIS-databron nog niet ingesteld.'
    );
    return Boolean(payload.configured);
  }catch(error){
    ms711SetConfigured(false,error.message);
    return false;
  }
}

async function ms711RefreshNearby(force=false){
  if(ms711Busy)return;
  if(ms711Configured===false&&!force)return;

  ms711Busy=true;
  const button=document.getElementById('ms711RefreshButton');
  if(button){
    button.disabled=true;
    button.classList.add('loading');
  }

  try{
    if(ms711Configured===null){
      const configured=await ms711CheckStatus();
      if(!configured)return;
    }

    ms711Coordinates=await ms711ResolveCoordinates(false);
    ms711InitMap();
    ms711OwnPositionOnMap(false);

    const preferences=ms711Preferences();
    const payload=await ms711Api('nearby',{
      lat:ms711Coordinates.lat,
      lon:ms711Coordinates.lon,
      radiusKm:preferences.radiusKm,
      limit:50
    });

    ms711NearbyVessels=ms711NormalisePositions(payload);
    ms711LastUpdatedAt=Date.now();
    ms711NextRefreshAt=
      Date.now()+
      preferences.refreshSeconds*1000;

    ms711SetConfigured(
      true,
      `${ms711Coordinates.source} · AIS rond Serenity`
    );
    ms711SetText(
      'ms711LastUpdate',
      new Date(ms711LastUpdatedAt).toLocaleTimeString('nl-NL',{
        hour:'2-digit',
        minute:'2-digit',
        second:'2-digit'
      })
    );

    ms711RenderAll();
  }catch(error){
    console.error('AIS rondom ophalen mislukt:',error);

    if(error.code==='ais_not_configured'||error.status===503){
      ms711SetConfigured(false,error.message);
    }else{
      ms711SetText('ms711AisStatus',`AIS kon niet worden bijgewerkt: ${error.message}`);
    }
  }finally{
    ms711Busy=false;
    if(button){
      button.disabled=false;
      button.classList.remove('loading');
    }
  }
}

async function ms711RefreshWatched(force=false){
  if(ms711WatchBusy)return;
  const watched=ms711Watchlist();

  if(!watched.length){
    ms711WatchedPositions=[];
    ms711RenderAll();
    return;
  }

  if(ms711Configured===false&&!force)return;
  ms711WatchBusy=true;

  try{
    if(ms711Configured===null){
      const configured=await ms711CheckStatus();
      if(!configured)return;
    }

    const payload=await ms711Api('fleet',{
      mmsi:watched.map(item=>item.mmsi).join(',')
    });

    ms711WatchedPositions=ms711NormalisePositions(payload);
    ms711RenderAll();
  }catch(error){
    console.error('Gevolgde boten ophalen mislukt:',error);
  }finally{
    ms711WatchBusy=false;
  }
}

async function ms711RefreshAll(force=false){
  await ms711RefreshNearby(force);
  await ms711RefreshWatched(force);
}

async function ms711Search(){
  if(ms711SearchBusy)return;

  const input=document.getElementById('ms711SearchInput');
  const query=String(input?.value||'').trim();
  const result=document.getElementById('ms711SearchResults');

  if(query.length<2){
    showAppToast('Vul minimaal twee letters of een MMSI in.');
    return;
  }

  ms711SearchBusy=true;
  if(result){
    result.classList.remove('hidden');
    result.innerHTML='<div class="ms711-empty">Zoeken…</div>';
  }

  try{
    if(ms711Configured===null){
      const configured=await ms711CheckStatus();
      if(!configured)return;
    }

    const payload=await ms711Api('search',{q:query,limit:20});
    ms711SearchVessels=ms711NormaliseSearch(payload);
    ms711RenderSearch();
  }catch(error){
    if(result){
      result.innerHTML=`<div class="ms711-empty">${ms711Esc(error.message)}</div>`;
    }
  }finally{
    ms711SearchBusy=false;
  }
}

function ms711SearchKey(event){
  if(event.key==='Enter'){
    event.preventDefault();
    ms711Search();
  }
}

function ms711RenderSearch(){
  const result=document.getElementById('ms711SearchResults');
  if(!result)return;

  result.classList.remove('hidden');
  result.innerHTML=ms711SearchVessels.length
    ?ms711SearchVessels.map(vessel=>{
      const watched=ms711IsWatched(vessel.mmsi);
      return `
        <article>
          <button type="button" onclick="ms711OpenVessel('${ms711Esc(vessel.mmsi)}')">
            <strong>${ms711Esc(vessel.name)}</strong>
            <small>MMSI ${ms711Esc(vessel.mmsi)} · ${ms711Esc(vessel.vessel_type||vessel.country||'')}</small>
          </button>
          <button class="${watched?'active':''}" type="button"
            aria-label="${watched?'Niet meer volgen':'Boot volgen'}"
            title="${watched?'Niet meer volgen':'Boot volgen'}"
            onclick="ms711ToggleWatch('${ms711Esc(vessel.mmsi)}','${ms711Esc(vessel.name)}')">★</button>
        </article>
      `;
    }).join('')
    :'<div class="ms711-empty">Geen boten gevonden.</div>';
}

function ms711ClearSearch(){
  const input=document.getElementById('ms711SearchInput');
  if(input)input.value='';
  ms711SearchVessels=[];
  document.getElementById('ms711SearchResults')?.classList.add('hidden');
}

function ms711ToggleWatch(mmsi,name=''){
  const value=String(mmsi||'').trim();
  if(!/^\d{9}$/.test(value))return;

  const watched=ms711Watchlist();
  const index=watched.findIndex(item=>item.mmsi===value);

  if(index>=0){
    watched.splice(index,1);
    showAppToast(`${name||value} wordt niet meer gevolgd.`);
  }else{
    watched.unshift({
      mmsi:value,
      name:String(name||`MMSI ${value}`).trim(),
      addedAt:new Date().toISOString()
    });
    showAppToast(`${name||value} toegevoegd aan Mijn boten ★`);
  }

  ms711WriteJson(ms711WatchKey(),watched.slice(0,50));
  ms711RenderAll();
  ms711RenderSearch();

  if(index<0){
    ms711RefreshWatched(true);
  }

  if(ms711SelectedVessel?.mmsi===value){
    ms711RenderModal(ms711SelectedVessel);
  }
}

function ms711FindVessel(mmsi){
  return ms711MergeVessels()
    .find(vessel=>vessel.mmsi===String(mmsi))||
    ms711SearchVessels.find(vessel=>vessel.mmsi===String(mmsi))||
    null;
}

async function ms711OpenVessel(mmsi){
  const value=String(mmsi||'').trim();
  if(!/^\d{9}$/.test(value))return;

  const modal=document.getElementById('ms711VesselModal');
  modal?.classList.remove('hidden');
  document.body.classList.add('ms711-modal-open');

  const known=ms711FindVessel(value);
  ms711SelectedVessel={
    ...(known||{}),
    mmsi:value,
    vessel_name:known?.vessel_name||known?.name||`MMSI ${value}`
  };
  ms711RenderModal(ms711SelectedVessel);

  try{
    const payload=await ms711Api('vessel',{mmsi:value});
    const data=payload?.data||{};
    const position=ms711NormalisePositions(data.position?.ok?data.position.data:data.position||{})[0];
    const info=data.info?.ok?data.info.data:data.info?.data||data.info||{};
    const eta=data.eta?.ok?data.eta.data:data.eta?.data||data.eta||{};

    ms711SelectedVessel={
      ...(known||{}),
      ...(info||{}),
      ...(position||{}),
      eta:eta||{},
      mmsi:value,
      vessel_name:
        position?.vessel_name||
        info?.name||
        known?.vessel_name||
        known?.name||
        `MMSI ${value}`
    };

    if(
      Number.isFinite(Number(ms711SelectedVessel.latitude))&&
      Number.isFinite(Number(ms711SelectedVessel.longitude))
    ){
      ms711SelectedVessel.distanceKm=ms711Distance(ms711SelectedVessel);
    }

    ms711RenderModal(ms711SelectedVessel);
  }catch(error){
    ms711SelectedVessel.error=error.message;
    ms711RenderModal(ms711SelectedVessel);
  }
}

function ms711RenderModal(vessel){
  if(!vessel)return;

  ms711SetText(
    'ms711ModalName',
    vessel.vessel_name||vessel.name||`MMSI ${vessel.mmsi}`
  );
  ms711SetText(
    'ms711ModalIdentity',
    `MMSI ${vessel.mmsi}${vessel.imo?` · IMO ${vessel.imo}`:''}`
  );

  const body=document.getElementById('ms711ModalBody');
  if(body){
    const eta=vessel.eta||{};
    body.innerHTML=`
      <div class="ms711-detail-grid">
        <article><span>Afstand</span><strong>${Number.isFinite(vessel.distanceKm)?`${ms711Number(vessel.distanceKm,2)} km`:'–'}</strong></article>
        <article><span>Snelheid</span><strong>${Number.isFinite(vessel.sog)?`${ms711Number(vessel.sog,1)} kn`:'–'}</strong><small>${Number.isFinite(vessel.sog)?`${ms711Number(vessel.sog*1.852,1)} km/u`:''}</small></article>
        <article><span>Koers</span><strong>${ms711BearingName(vessel.cog)}</strong></article>
        <article><span>Heading</span><strong>${ms711BearingName(vessel.heading)}</strong></article>
        <article><span>Status</span><strong>${ms711Esc(ms711NavStatus(vessel.nav_status))}</strong></article>
        <article><span>Positie</span><strong>${Number.isFinite(vessel.latitude)?`${Number(vessel.latitude).toFixed(5)}, ${Number(vessel.longitude).toFixed(5)}`:'–'}</strong></article>
        <article><span>Type</span><strong>${ms711Esc(vessel.vessel_type||vessel.type||'Onbekend')}</strong></article>
        <article><span>Vlag</span><strong>${ms711Esc(vessel.country||vessel.flag||'Onbekend')}</strong></article>
        <article><span>Roepnaam</span><strong>${ms711Esc(vessel.call_sign||vessel.callsign||'–')}</strong></article>
        <article><span>Bestemming</span><strong>${ms711Esc(eta.destination||eta.reported_destination||vessel.destination||'–')}</strong></article>
        <article><span>ETA</span><strong>${ms711Esc(eta.eta||eta.estimated_arrival||'–')}</strong></article>
        <article><span>Laatste AIS</span><strong>${ms711Esc(vessel.timestamp?ms711AgeText(vessel.timestamp):'–')}</strong></article>
      </div>
      ${vessel.error?`<div class="ms711-detail-error">${ms711Esc(vessel.error)}</div>`:''}
      ${vessel.suspected_glitch?'<div class="ms711-detail-error">Deze AIS-positie is door de databron als mogelijk onbetrouwbaar gemarkeerd.</div>':''}
    `;
  }

  const watchButton=document.getElementById('ms711ModalWatchButton');
  const watched=ms711IsWatched(vessel.mmsi);
  if(watchButton){
    watchButton.classList.toggle('active',watched);
    watchButton.setAttribute('aria-label',watched?'Niet meer volgen':'Boot volgen');
    watchButton.title=watched?'Niet meer volgen':'Boot volgen';
  }
}

function ms711ToggleModalWatch(){
  if(!ms711SelectedVessel)return;
  ms711ToggleWatch(
    ms711SelectedVessel.mmsi,
    ms711SelectedVessel.vessel_name||ms711SelectedVessel.name||''
  );
}

function ms711FocusModalVessel(){
  const vessel=ms711SelectedVessel;
  if(
    !vessel||
    !Number.isFinite(Number(vessel.latitude))||
    !Number.isFinite(Number(vessel.longitude))
  ){
    showAppToast('Er is nog geen geldige AIS-positie.');
    return;
  }

  ms711CloseVesselModal(null,true);
  ms711AisMap?.setView(
    [Number(vessel.latitude),Number(vessel.longitude)],
    Math.max(13,ms711AisMap.getZoom()),
    {animate:true}
  );
  ms711VesselMarkers.get(vessel.mmsi)?.openPopup();
  document.getElementById('ms711AisMap')
    ?.scrollIntoView({behavior:'smooth',block:'center'});
}

async function ms711RefreshModalVessel(){
  if(ms711SelectedVessel){
    await ms711OpenVessel(ms711SelectedVessel.mmsi);
  }
}

function ms711CloseVesselModal(event,force=false){
  const modal=document.getElementById('ms711VesselModal');
  if(event&&!force&&event.target!==modal)return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  modal?.classList.add('hidden');
  document.body.classList.remove('ms711-modal-open');
}

function ms711ShowSetupHelp(){
  document.getElementById('ms711SetupModal')?.classList.remove('hidden');
  document.body.classList.add('ms711-modal-open');
}

function ms711CloseSetupHelp(event,force=false){
  const modal=document.getElementById('ms711SetupModal');
  if(event&&!force&&event.target!==modal)return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  modal?.classList.add('hidden');
  document.body.classList.remove('ms711-modal-open');
}

async function ms711Locate(){
  try{
    ms711Coordinates=await ms711ResolveCoordinates(true);
    ms711MapUserMoved=false;
    ms711OwnPositionOnMap(true);
    ms711SetText(
      'ms711AisStatus',
      `${ms711Coordinates.source} · kaart gecentreerd op Serenity`
    );
  }catch{
    showAppToast('Geef locatietoegang om Serenity te centreren.');
  }
}

function ms711ScrollToWatchlist(){
  document.getElementById('ms711WatchlistCard')
    ?.scrollIntoView({behavior:'smooth',block:'start'});
}

function ms711RadiusChanged(){
  ms711SavePreferences();
  ms711MapUserMoved=false;
  ms711OwnPositionOnMap(true);
  ms711RefreshAll(true);
}

function ms711RefreshRateChanged(){
  ms711SavePreferences();
  ms711ScheduleRefresh();
}

function ms711ScheduleRefresh(){
  clearInterval(ms711RefreshTimer);
  const seconds=Math.max(
    15,
    Number(ms711Preferences().refreshSeconds)||30
  );
  ms711NextRefreshAt=Date.now()+seconds*1000;

  ms711RefreshTimer=setInterval(()=>{
    if(
      document.visibilityState==='visible'&&
      ms711PageVisible()
    ){
      ms711RefreshAll(false);
    }
  },seconds*1000);
}

function ms711UpdateCountdown(){
  const element=document.getElementById('ms711RefreshCountdown');
  if(!element)return;

  if(ms711Busy){
    element.textContent='AIS bijwerken…';
    return;
  }

  if(!ms711NextRefreshAt){
    element.textContent='automatisch verversen';
    return;
  }

  const seconds=Math.max(
    0,
    Math.ceil((ms711NextRefreshAt-Date.now())/1000)
  );
  element.textContent=`opnieuw over ${seconds} sec`;
}

function ms711PageVisible(){
  const active=document.querySelector('.bottom-nav-item.active')?.dataset.target;
  if(active==='ais')return true;
  try{
    return typeof ms708CurrentPageId==='function'&&
      ms708CurrentPageId()==='ais'&&
      document.visibilityState==='visible';
  }catch{
    return false;
  }
}

async function initAisPage(){
  ms711LoadPreferences();
  ms711InitMap();

  if(!ms711CountdownTimer){
    ms711CountdownTimer=setInterval(ms711UpdateCountdown,1000);
  }

  ms711ScheduleRefresh();

  if(ms711Configured===null){
    await ms711CheckStatus();
  }

  if(ms711Configured){
    await ms711RefreshAll(false);
  }else{
    ms711RenderAll();
  }

  setTimeout(()=>{
    ms711AisMap?.invalidateSize({pan:false});
  },250);
}

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&ms711PageVisible()){
    initAisPage();
  }
});

window.addEventListener('online',()=>{
  if(ms711PageVisible()){
    ms711RefreshAll(true);
  }
},{passive:true});

window.addEventListener('resize',()=>{
  setTimeout(()=>{
    ms711AisMap?.invalidateSize({pan:false});
  },160);
},{passive:true});

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!document.getElementById('ms711VesselModal')?.classList.contains('hidden')){
    ms711CloseVesselModal(event,true);
  }else if(!document.getElementById('ms711SetupModal')?.classList.contains('hidden')){
    ms711CloseSetupHelp(event,true);
  }
});
