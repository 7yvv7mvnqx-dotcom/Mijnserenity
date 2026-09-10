/* ============================================================
   MijnSerenity 8.0.2 — snelle weerpagina
   Cache direct zichtbaar, weer eerst, locatie + watertemperatuur daarna.
   ============================================================ */

let ms709WeatherPayload=null;
let ms709WeatherCoordinates=null;
let ms709WeatherFetchBusy=false;
let ms709WeatherTimer=null;
let ms709WeatherClockTimer=null;
let ms709WeatherLastAttempt=0;
let ms709GpsRefreshPromise=null;
const MS709_REFRESH_MS=5*60*1000;
const MS709_REQUEST_TIMEOUT_MS=7000;
const MS709_GPS_TIMEOUT_MS=4000;

function ms709WeatherCacheKey(){ return `mijnserenity-weather-793-${currentBoat?.id||'serenity'}`; }
function ms709ReadWeatherCache(){ try{return JSON.parse(localStorage.getItem(ms709WeatherCacheKey())||'null');}catch{return null;} }
function ms709SaveWeatherCache(payload){ try{localStorage.setItem(ms709WeatherCacheKey(),JSON.stringify(payload));}catch{} }
function ms709SetText(id,value){ const el=document.getElementById(id); if(el)el.textContent=value; }
function ms709Number(value,digits=0){ const n=Number(value); return Number.isFinite(n)?n.toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:digits}):'–'; }
function ms709WeatherSymbol(code,isDay=1){ const v=Number(code); if(v===0)return Number(isDay)===0?'☾':'☀'; if([1,2].includes(v))return Number(isDay)===0?'☾':'⛅'; if(v===3)return '☁'; if([45,48].includes(v))return '≋'; if([51,53,55,56,57,80,81,82].includes(v))return '🌦'; if([61,63,65,66,67].includes(v))return '🌧'; if([71,73,75,77,85,86].includes(v))return '❄'; if([95,96,99].includes(v))return '⛈'; return '◌'; }
function ms709WindDirection(degrees){ const v=Number(degrees); if(!Number.isFinite(v))return 'Richting onbekend'; const d=['N','NO','O','ZO','Z','ZW','W','NW']; return `${d[Math.round((((v%360)+360)%360)/45)%8]} · ${Math.round(v)}°`; }
function ms709FormatTime(value){ const d=new Date(value); return Number.isNaN(d.getTime())?'–':d.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}); }
function ms709FormatDay(value,index){ const d=new Date(value); if(Number.isNaN(d.getTime()))return '–'; if(index===0)return 'Vandaag'; if(index===1)return 'Morgen'; return d.toLocaleDateString('nl-NL',{weekday:'short'}); }
function ms793FiniteNumber(value){ if(value===null||value===''||typeof value==='boolean')return null; const n=Number(value); return Number.isFinite(n)?n:null; }
function ms793DistanceKm(lat1,lon1,lat2,lon2){ const a=[lat1,lon1,lat2,lon2].map(ms793FiniteNumber); if(a.some(v=>v===null))return null; const r=v=>v*Math.PI/180,R=6371,dLat=r(a[2]-a[0]),dLon=r(a[3]-a[1]),x=Math.sin(dLat/2)**2+Math.cos(r(a[0]))*Math.cos(r(a[2]))*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function ms709WeatherPageVisible(){ const page=document.getElementById('weather'); if(!page)return false; const active=document.querySelector('.bottom-nav-item.active')?.dataset.target; return active==='weather'||(!page.classList.contains('hidden')&&document.visibilityState==='visible'); }

function ms709LatestRouteCoordinates(){
  const points=(typeof liveNavState!=='undefined'&&Array.isArray(liveNavState?.points))?liveNavState.points:[];
  const p=points.length?points[points.length-1]:null;
  if(p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))) return {lat:Number(p.lat),lon:Number(p.lon),source:'Live GPS'};
  if(typeof liveNavState!=='undefined'&&Number.isFinite(Number(liveNavState?.lastWeatherLat))&&Number.isFinite(Number(liveNavState?.lastWeatherLon))) return {lat:Number(liveNavState.lastWeatherLat),lon:Number(liveNavState.lastWeatherLon),source:'Laatste Serenity-positie'};
  const c=ms709ReadWeatherCache()?.coordinates;
  if(c&&Number.isFinite(Number(c.lat))&&Number.isFinite(Number(c.lon))) return {lat:Number(c.lat),lon:Number(c.lon),source:'Laatste positie'};
  return null;
}

function ms709GetCurrentPosition(timeout=MS709_GPS_TIMEOUT_MS){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('GPS-locatie wordt niet ondersteund.'));return;}
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,source:'Huidige GPS'}),reject,{enableHighAccuracy:true,maximumAge:60000,timeout});
  });
}
function ms709RefreshGpsInBackground(){
  if(ms709GpsRefreshPromise)return ms709GpsRefreshPromise;
  ms709GpsRefreshPromise=ms709GetCurrentPosition().then(coords=>{ms709WeatherCoordinates=coords;return coords;}).catch(()=>null).finally(()=>{setTimeout(()=>{ms709GpsRefreshPromise=null;},1000);});
  return ms709GpsRefreshPromise;
}

function ms709BuildWeatherUrl(lat,lon){
  const p=new URLSearchParams({latitude:Number(lat).toFixed(6),longitude:Number(lon).toFixed(6),current:['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','rain','showers','weather_code','cloud_cover','pressure_msl','surface_pressure','wind_speed_10m','wind_direction_10m','wind_gusts_10m','visibility','is_day'].join(','),hourly:['temperature_2m','precipitation_probability','weather_code','wind_speed_10m','wind_gusts_10m','wind_direction_10m','visibility','is_day'].join(','),daily:['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max','wind_speed_10m_max','wind_gusts_10m_max','sunrise','sunset'].join(','),wind_speed_unit:'kmh',timezone:'auto',forecast_days:'7'});
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}
function ms793BuildMarineUrl(lat,lon){ const p=new URLSearchParams({latitude:Number(lat).toFixed(6),longitude:Number(lon).toFixed(6),current:'sea_surface_temperature',hourly:'sea_surface_temperature',timezone:'auto',forecast_days:'1'}); return `https://marine-api.open-meteo.com/v1/marine?${p}`; }

async function ms709FetchJson(url,timeout=MS709_REQUEST_TIMEOUT_MS){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{ const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal}); if(!r.ok)throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally{clearTimeout(timer);}
}

function ms793NearestMarineTemperature(data){
  const current=ms793FiniteNumber(data?.current?.sea_surface_temperature); if(current!==null)return {available:true,value:current,time:data?.current?.time||null,source:'Open-Meteo Marine'};
  const times=Array.isArray(data?.hourly?.time)?data.hourly.time:[],values=Array.isArray(data?.hourly?.sea_surface_temperature)?data.hourly.sea_surface_temperature:[]; let best=null,dist=Infinity,now=Date.now();
  times.forEach((t,i)=>{const v=ms793FiniteNumber(values[i]),ts=new Date(t).getTime(); if(v===null||!Number.isFinite(ts))return; const d=Math.abs(ts-now); if(d<dist){dist=d;best={available:true,value:v,time:t,source:'Open-Meteo Marine'};}});
  return best||{available:false,value:null,time:null,source:'Open-Meteo Marine'};
}
async function ms793FetchWaterTemperature(lat,lon){
  try{ const data=await ms709FetchJson(ms793BuildMarineUrl(lat,lon)); const gridDistanceKm=ms793DistanceKm(lat,lon,data?.latitude,data?.longitude); if(gridDistanceKm!==null&&gridDistanceKm>15)return {available:false,value:null,source:'Open-Meteo Marine',reason:'Geen nabijgelegen watermodel',gridDistanceKm}; return {...ms793NearestMarineTemperature(data),gridDistanceKm}; }
  catch(error){console.warn('Watertemperatuur kon niet worden opgehaald:',error);return {available:false,value:null,source:'Open-Meteo Marine',reason:'Niet bereikbaar'};}
}
async function ms709ReverseLabel(lat,lon){
  try{ const p=new URLSearchParams({lat:String(lat),lon:String(lon),format:'jsonv2',zoom:'10',addressdetails:'1'}); const data=await ms709FetchJson(`https://nominatim.openstreetmap.org/reverse?${p}`); const a=data?.address||{}; return a.city||a.town||a.village||a.municipality||a.county||''; }catch{return '';}
}

function ms709CurrentHourlyIndex(payload){ const t=payload?.hourly?.time||[]; if(!t.length)return 0; const i=t.findIndex(v=>new Date(v).getTime()>=Date.now()-30*60*1000); return i>=0?i:0; }
function ms709CurrentRainChance(payload){ return Number(payload?.hourly?.precipitation_probability?.[ms709CurrentHourlyIndex(payload)]); }
function ms709Risk(payload){
  const c=payload?.current||{},gust=windKmhToBeaufort(Number(c.wind_gusts_10m)),wind=windKmhToBeaufort(Number(c.wind_speed_10m)),vis=Number(c.visibility),prec=Number(c.precipitation),code=Number(c.weather_code),s=typeof ms705Settings==='function'?ms705Settings():{windWarning:7,windCritical:9};
  const issues=[];let level='good'; const add=(l,title,text,icon)=>{issues.push({level:l,title,text,icon});if(l==='critical')level='critical';else if(l==='warning'&&level!=='critical')level='warning';};
  if(gust>=Number(s.windCritical||9))add('critical','Zware windstoten',`${gust} Bft · vaarplan opnieuw beoordelen.`,'💨'); else if(gust>=Number(s.windWarning||7))add('warning','Stevige windstoten',`${gust} Bft · extra aandacht bij afmeren en manoeuvreren.`,'💨'); else if(wind>=6)add('warning','Stevige gemiddelde wind',`${wind} Bft op de huidige positie.`,'🌬');
  if(Number.isFinite(vis)&&vis<1000)add('critical','Zeer beperkt zicht',`${Math.round(vis)} meter zicht.`,'≋'); else if(Number.isFinite(vis)&&vis<3000)add('warning','Beperkt zicht',`${(vis/1000).toFixed(1)} km zicht.`,'≋');
  if([95,96,99].includes(code))add('critical','Onweer in de actuele weerschatting','Controleer officiële waarschuwingen.','⛈'); else if(prec>=2)add('warning','Stevige neerslag',`${prec.toFixed(1)} mm in het huidige meetinterval.`,'🌧');
  if(!issues.length)issues.push({level:'good',title:'Rustige vaarcondities',text:`Wind ${wind} Bft · geen directe waarschuwing uit de bekende data.`,icon:'✓'});
  return {level,headline:level==='critical'?'Niet vertrekken zonder controle':level==='warning'?'Extra aandacht':'Goed vaarbaar',detail:issues[0]?.text||'Geen directe aandachtspunten.',issues,windBft:wind,gustBft:gust};
}

function ms709RenderCurrent(payload){
  const c=payload?.current||{},d=payload?.daily||{},risk=ms709Risk(payload),rain=ms709CurrentRainChance(payload),wt=ms793FiniteNumber(payload?.waterTemperature?.value);
  ms709SetText('ms709WeatherSymbol',ms709WeatherSymbol(c.weather_code,c.is_day)); ms709SetText('ms709WeatherTemp',Number.isFinite(Number(c.temperature_2m))?`${ms709Number(c.temperature_2m,1)}°`:'–°'); ms709SetText('ms709WeatherDescription',weatherCodeDescription(c.weather_code)); ms709SetText('ms709WeatherFeels',Number.isFinite(Number(c.apparent_temperature))?`Voelt als ${ms709Number(c.apparent_temperature,1)} °C`:'Gevoelstemperatuur onbekend');
  ms709SetText('ms793WeatherWaterTemp',wt!==null?`${ms709Number(wt,1)} °C`:payload?.waterTemperaturePending?'Wordt bijgewerkt…':'Niet beschikbaar'); ms709SetText('ms793WeatherWaterSource',wt!==null?'Modelschatting op de GPS-positie':payload?.waterTemperaturePending?'Watertemperatuur volgt zonder het weer te blokkeren':'Geen watermodel voor deze positie');
  ms709SetText('ms709WeatherWind',Number.isFinite(Number(c.wind_speed_10m))?formatWindBeaufort(c.wind_speed_10m,true):'–'); ms709SetText('ms709WeatherDirection',ms709WindDirection(c.wind_direction_10m)); ms709SetText('ms709WeatherGusts',Number.isFinite(Number(c.wind_gusts_10m))?formatWindBeaufort(c.wind_gusts_10m,true):'–'); ms709SetText('ms709WeatherGustRisk',`${risk.gustBft} Bft maximaal actueel`);
  ms709SetText('ms709WeatherRain',Number.isFinite(Number(c.precipitation))?`${ms709Number(c.precipitation,1)} mm`:'–'); ms709SetText('ms709WeatherRainChance',Number.isFinite(rain)?`${Math.round(rain)}% kans komende uur`:'Kans onbekend'); ms709SetText('ms709WeatherVisibility',Number.isFinite(Number(c.visibility))?(Number(c.visibility)>=1000?`${ms709Number(Number(c.visibility)/1000,1)} km`:`${Math.round(Number(c.visibility))} m`):'–'); ms709SetText('ms709WeatherCloud',Number.isFinite(Number(c.cloud_cover))?`${Math.round(Number(c.cloud_cover))}% bewolking`:'Bewolking onbekend'); ms709SetText('ms709WeatherPressure',Number.isFinite(Number(c.pressure_msl))?`${Math.round(Number(c.pressure_msl))} hPa`:'–'); ms709SetText('ms709WeatherHumidity',Number.isFinite(Number(c.relative_humidity_2m))?`${Math.round(Number(c.relative_humidity_2m))}% luchtvochtigheid`:'Luchtvochtigheid onbekend'); ms709SetText('ms709WeatherSunrise',`↑ ${ms709FormatTime(d.sunrise?.[0])}`); ms709SetText('ms709WeatherSunset',`↓ ${ms709FormatTime(d.sunset?.[0])}`);
  const re=document.getElementById('ms709WeatherRisk'); if(re){re.className=`ms709-weather-risk ${risk.level}`; re.innerHTML=`<span>VAARADVIES</span><strong>${esc(risk.headline)}</strong><small>${esc(risk.detail)}</small>`;}
  ms709SetText('ms709MissionWeatherStatus',`${Math.round(Number(c.temperature_2m)||0)}° · ${risk.windBft} Bft`); ms709SetText('ms709MissionWeatherDetail',risk.headline);
  if(typeof liveNavState!=='undefined'&&payload?.current){liveNavState.weather={temperature:Number(c.temperature_2m),apparentTemperature:Number(c.apparent_temperature),precipitation:Number(c.precipitation),weatherCode:Number(c.weather_code),windSpeed:Number(c.wind_speed_10m),windGusts:Number(c.wind_gusts_10m),windDirection:Number(c.wind_direction_10m),waterTemperature:wt};liveNavState.weatherUpdatedAt=Number(payload.fetchedAt)||Date.now();liveNavState.lastWeatherLat=Number(payload.coordinates?.lat);liveNavState.lastWeatherLon=Number(payload.coordinates?.lon);try{persistLiveState();renderLiveWeather();}catch{}}
}
function ms709RenderHourly(payload){ const el=document.getElementById('ms709HourlyForecast'); if(!el)return; const h=payload?.hourly;if(!h?.time?.length){el.innerHTML='<div class="ms709-weather-empty">Geen uurverwachting beschikbaar.</div>';return;} const start=ms709CurrentHourlyIndex(payload),idx=Array.from({length:12},(_,o)=>start+o).filter(i=>i<h.time.length); el.innerHTML=idx.map((i,o)=>{const t=new Date(h.time[i]),w=Number(h.wind_speed_10m?.[i]),g=Number(h.wind_gusts_10m?.[i]),r=Number(h.precipitation_probability?.[i]),v=Number(h.visibility?.[i]);return `<article class="${o===0?'now':''}"><span>${o===0?'Nu':t.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}</span><strong>${ms709WeatherSymbol(h.weather_code?.[i],h.is_day?.[i])}</strong><b>${Math.round(Number(h.temperature_2m?.[i])||0)}°</b><small>💨 ${windKmhToBeaufort(w)} Bft</small><small>↯ ${windKmhToBeaufort(g)} Bft</small><small>💧 ${Number.isFinite(r)?Math.round(r):0}%</small><small>◉ ${Number.isFinite(v)?ms709Number(v/1000,1):'–'} km</small></article>`;}).join(''); }
function ms709RenderDaily(payload){ const el=document.getElementById('ms709DailyForecast');if(!el)return;const d=payload?.daily;if(!d?.time?.length){el.innerHTML='<div class="ms709-weather-empty">Geen weekverwachting beschikbaar.</div>';return;}el.innerHTML=d.time.map((date,i)=>{const g=Number(d.wind_gusts_10m_max?.[i]),w=Number(d.wind_speed_10m_max?.[i]),r=Number(d.precipitation_probability_max?.[i]);return `<article><div><span>${ms709FormatDay(date,i)}</span><strong>${ms709WeatherSymbol(d.weather_code?.[i],1)}</strong></div><div><b>${Math.round(Number(d.temperature_2m_max?.[i])||0)}°</b><small>${Math.round(Number(d.temperature_2m_min?.[i])||0)}° min</small></div><div><span>💨 ${windKmhToBeaufort(w)} Bft</span><small>stoten ${windKmhToBeaufort(g)} Bft</small></div><div><span>💧 ${Number.isFinite(r)?Math.round(r):0}%</span><small>${weatherCodeDescription(d.weather_code?.[i])}</small></div></article>`;}).join(''); }
function ms709RenderAdvice(payload){const el=document.getElementById('ms709WeatherAdvice');if(!el)return;el.innerHTML=ms709Risk(payload).issues.map(i=>`<article class="${i.level}"><span>${i.icon}</span><div><strong>${esc(i.title)}</strong><small>${esc(i.text)}</small></div></article>`).join('');}
function ms709RenderWeather(payload){ if(!payload)return;ms709WeatherPayload=payload;ms709WeatherCoordinates=payload.coordinates||ms709WeatherCoordinates;ms709SetText('ms709WeatherLocation',payload.locationLabel||'Positie van Serenity');const f=new Date(Number(payload.fetchedAt)||Date.now());ms709SetText('ms709WeatherUpdated',`Bijgewerkt ${f.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} · automatisch iedere 5 minuten`);ms709RenderCurrent(payload);ms709RenderHourly(payload);ms709RenderDaily(payload);ms709RenderAdvice(payload);ms709UpdateCountdown();}
function ms709UpdateCountdown(){ const b=document.getElementById('ms709WeatherCountdown');if(!b)return;if(ms709WeatherFetchBusy&&!ms709WeatherPayload){b.textContent='Weer ophalen…';b.className='ms709-weather-badge checking';return;}const f=Number(ms709WeatherPayload?.fetchedAt||0),remaining=Math.max(0,MS709_REFRESH_MS-(Date.now()-f)),m=Math.floor(remaining/60000),s=Math.floor((remaining%60000)/1000);b.textContent=f?`↻ ${m}:${String(s).padStart(2,'0')}`:'Opnieuw proberen';b.className='ms709-weather-badge';}

async function ms709EnrichWeather(payload,coordinates){
  const [label,waterTemperature]=await Promise.all([ms709ReverseLabel(coordinates.lat,coordinates.lon),ms793FetchWaterTemperature(coordinates.lat,coordinates.lon)]);
  if(ms709WeatherPayload!==payload&&Number(ms709WeatherPayload?.fetchedAt)>Number(payload.fetchedAt))return;
  const enriched={...payload,waterTemperature,waterTemperaturePending:false,locationLabel:label||payload.locationLabel||`${Number(coordinates.lat).toFixed(4)}, ${Number(coordinates.lon).toFixed(4)}`};ms709SaveWeatherCache(enriched);ms709RenderWeather(enriched);
}

async function ms709RefreshWeather(force=false,forceGps=false){
  if(ms709WeatherFetchBusy)return;
  const cached=ms709WeatherPayload||ms709ReadWeatherCache(); const age=Date.now()-Number(cached?.fetchedAt||0);
  if(cached&&!ms709WeatherPayload)ms709RenderWeather(cached);
  if(!force&&cached&&age<MS709_REFRESH_MS){ms709RefreshGpsInBackground();return;}
  ms709WeatherFetchBusy=true;ms709WeatherLastAttempt=Date.now();ms709UpdateCountdown();
  try{
    let coordinates=forceGps?null:ms709LatestRouteCoordinates();
    const gpsPromise=ms709RefreshGpsInBackground();
    if(!coordinates){coordinates=await gpsPromise;if(!coordinates)throw new Error('Geen GPS-positie beschikbaar');}
    ms709WeatherCoordinates=coordinates;
    const data=await ms709FetchJson(ms709BuildWeatherUrl(coordinates.lat,coordinates.lon));
    const payload={...data,fetchedAt:Date.now(),coordinates:{lat:coordinates.lat,lon:coordinates.lon,accuracy:coordinates.accuracy||null,source:coordinates.source||'GPS'},waterTemperature:cached?.waterTemperature||null,waterTemperaturePending:true,locationLabel:cached?.locationLabel||`${Number(coordinates.lat).toFixed(4)}, ${Number(coordinates.lon).toFixed(4)}`};
    ms709SaveWeatherCache(payload);ms709RenderWeather(payload);
    ms709EnrichWeather(payload,coordinates);
    gpsPromise.then(gps=>{if(!gps||forceGps)return;const km=ms793DistanceKm(coordinates.lat,coordinates.lon,gps.lat,gps.lon);if(km!==null&&km>2){ms709WeatherCoordinates=gps;}});
  }catch(error){
    console.error('Weerpagina verversen mislukt:',error);
    if(cached){ms709RenderWeather(cached);ms709SetText('ms709WeatherUpdated',`Tijdelijk geen nieuwe weerdata · laatst bijgewerkt ${new Date(Number(cached.fetchedAt)||0).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})} · tik op ↻ om opnieuw te proberen`);}else{ms709SetText('ms709WeatherDescription','Weer kon niet worden opgehaald');ms709SetText('ms709WeatherUpdated','Opnieuw proberen · tik op ↻');ms709SetText('ms709MissionWeatherStatus','Niet beschikbaar');ms709SetText('ms709MissionWeatherDetail','Tik op ↻ om opnieuw te proberen');}
  }finally{ms709WeatherFetchBusy=false;ms709UpdateCountdown();}
}
async function ms709UseCurrentLocation(){await ms709RefreshWeather(true,true);}
function initWeatherPage(){const cached=ms709ReadWeatherCache();if(cached&&!ms709WeatherPayload)ms709RenderWeather(cached);setTimeout(()=>ms709RefreshWeather(false),0);if(!ms709WeatherTimer)ms709WeatherTimer=setInterval(()=>{if(document.visibilityState==='visible'&&ms709WeatherPageVisible())ms709RefreshWeather(false);},60000);if(!ms709WeatherClockTimer)ms709WeatherClockTimer=setInterval(ms709UpdateCountdown,1000);}
document.addEventListener('DOMContentLoaded',()=>{const cached=ms709ReadWeatherCache();if(cached)ms709RenderWeather(cached);setTimeout(()=>{if(ms709WeatherPageVisible())initWeatherPage();},100);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ms709WeatherPageVisible())ms709RefreshWeather(false);});
window.addEventListener('online',()=>{if(ms709WeatherPageVisible())ms709RefreshWeather(true);},{passive:true});
