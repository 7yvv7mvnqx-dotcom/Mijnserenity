
/* ============================================================
   MijnSerenity Cloud 7.4.4 — live weerpagina
   ============================================================ */

let ms709WeatherPayload=null;
let ms709WeatherCoordinates=null;
let ms709WeatherFetchBusy=false;
let ms709WeatherTimer=null;
let ms709WeatherClockTimer=null;
let ms709WeatherLastAttempt=0;
const MS709_REFRESH_MS=5*60*1000;

function ms709WeatherCacheKey(){
  return `mijnserenity-weather-709-${currentBoat?.id||'serenity'}`;
}

function ms709ReadWeatherCache(){
  try{
    return JSON.parse(
      localStorage.getItem(ms709WeatherCacheKey())||'null'
    );
  }catch{
    return null;
  }
}

function ms709SaveWeatherCache(payload){
  try{
    localStorage.setItem(
      ms709WeatherCacheKey(),
      JSON.stringify(payload)
    );
  }catch{}
}

function ms709SetText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=value;
}

function ms709Number(value,digits=0){
  const number=Number(value);
  return Number.isFinite(number)
    ?number.toLocaleString('nl-NL',{
        minimumFractionDigits:0,
        maximumFractionDigits:digits
      })
    :'–';
}

function ms709WeatherSymbol(code,isDay=1){
  const value=Number(code);

  if(value===0)return Number(isDay)===0?'☾':'☀';
  if([1,2].includes(value))return Number(isDay)===0?'☾':'⛅';
  if(value===3)return '☁';
  if([45,48].includes(value))return '≋';
  if([51,53,55,56,57].includes(value))return '🌦';
  if([61,63,65,66,67].includes(value))return '🌧';
  if([71,73,75,77,85,86].includes(value))return '❄';
  if([80,81,82].includes(value))return '🌦';
  if([95,96,99].includes(value))return '⛈';
  return '◌';
}

function ms709WindDirection(degrees){
  const value=Number(degrees);
  if(!Number.isFinite(value))return 'Richting onbekend';

  const directions=[
    'N','NO','O','ZO','Z','ZW','W','NW'
  ];
  const index=Math.round(
    ((value%360)+360)%360/45
  )%8;

  return `${directions[index]} · ${Math.round(value)}°`;
}

function ms709FormatTime(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '–';

  return date.toLocaleTimeString('nl-NL',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function ms709FormatDay(value,index){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '–';
  if(index===0)return 'Vandaag';
  if(index===1)return 'Morgen';

  return date.toLocaleDateString('nl-NL',{
    weekday:'short'
  });
}

function ms709WeatherPageVisible(){
  const page=document.getElementById('weather');
  if(!page)return false;

  const active=document.querySelector(
    '.bottom-nav-item.active'
  )?.dataset.target;

  return active==='weather'||
    (
      !page.classList.contains('hidden')&&
      document.visibilityState==='visible'&&
      typeof ms708CurrentPageId==='function'&&
      ms708CurrentPageId()==='weather'
    );
}

function ms709LatestRouteCoordinates(){
  const point=liveNavState?.points?.at?.(-1);

  if(
    point&&
    Number.isFinite(Number(point.lat))&&
    Number.isFinite(Number(point.lon))
  ){
    return {
      lat:Number(point.lat),
      lon:Number(point.lon),
      source:'Live GPS'
    };
  }

  const cached=ms709ReadWeatherCache();
  const coords=cached?.coordinates;

  if(
    coords&&
    Number.isFinite(Number(coords.lat))&&
    Number.isFinite(Number(coords.lon))
  ){
    return {
      lat:Number(coords.lat),
      lon:Number(coords.lon),
      source:'Laatste positie'
    };
  }

  return null;
}

function ms709GetCurrentPosition(){
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
      error=>reject(error),
      {
        enableHighAccuracy:true,
        maximumAge:60000,
        timeout:15000
      }
    );
  });
}

async function ms709ResolveCoordinates(forceGps=false){
  if(!forceGps){
    const route=ms709LatestRouteCoordinates();
    if(route)return route;
  }

  return ms709GetCurrentPosition();
}

function ms709BuildWeatherUrl(lat,lon){
  const params=new URLSearchParams({
    latitude:Number(lat).toFixed(6),
    longitude:Number(lon).toFixed(6),
    current:[
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'rain',
      'showers',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'is_day'
    ].join(','),
    hourly:[
      'temperature_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'visibility',
      'is_day'
    ].join(','),
    daily:[
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'sunrise',
      'sunset'
    ].join(','),
    wind_speed_unit:'kmh',
    timezone:'auto',
    forecast_days:'7'
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function ms709CurrentHourlyIndex(payload){
  const times=payload?.hourly?.time||[];
  if(!times.length)return 0;

  const now=Date.now();
  const futureIndex=times.findIndex(value=>
    new Date(value).getTime()>=now-30*60*1000
  );

  return futureIndex>=0?futureIndex:0;
}

function ms709CurrentRainChance(payload){
  const index=ms709CurrentHourlyIndex(payload);
  return Number(
    payload?.hourly?.precipitation_probability?.[index]
  );
}

function ms709Risk(payload){
  const current=payload?.current||{};
  const gustBft=windKmhToBeaufort(
    Number(current.wind_gusts_10m)
  );
  const windBft=windKmhToBeaufort(
    Number(current.wind_speed_10m)
  );
  const visibility=Number(current.visibility);
  const precipitation=Number(current.precipitation);
  const code=Number(current.weather_code);
  const thresholds=typeof ms705Settings==='function'
    ?ms705Settings()
    :{
        windWarning:7,
        windCritical:9
      };

  const issues=[];
  let level='good';

  const add=(nextLevel,title,text,icon)=>{
    issues.push({level:nextLevel,title,text,icon});
    if(nextLevel==='critical'){
      level='critical';
    }else if(
      nextLevel==='warning'&&
      level!=='critical'
    ){
      level='warning';
    }
  };

  if(gustBft>=Number(thresholds.windCritical||9)){
    add(
      'critical',
      'Zware windstoten',
      `${gustBft} Bft · vaarplan opnieuw beoordelen.`,
      '💨'
    );
  }else if(gustBft>=Number(thresholds.windWarning||7)){
    add(
      'warning',
      'Stevige windstoten',
      `${gustBft} Bft · extra aandacht bij afmeren en manoeuvreren.`,
      '💨'
    );
  }else if(windBft>=6){
    add(
      'warning',
      'Stevige gemiddelde wind',
      `${windBft} Bft op de huidige positie.`,
      '🌬'
    );
  }

  if(Number.isFinite(visibility)&&visibility<1000){
    add(
      'critical',
      'Zeer beperkt zicht',
      `${Math.round(visibility)} meter zicht.`,
      '≋'
    );
  }else if(Number.isFinite(visibility)&&visibility<3000){
    add(
      'warning',
      'Beperkt zicht',
      `${(visibility/1000).toFixed(1)} km zicht.`,
      '≋'
    );
  }

  if([95,96,99].includes(code)){
    add(
      'critical',
      'Onweer in de actuele weerschatting',
      'Zoek een veilige ligplaats en controleer officiële waarschuwingen.',
      '⛈'
    );
  }else if(precipitation>=2){
    add(
      'warning',
      'Stevige neerslag',
      `${precipitation.toFixed(1)} mm in het huidige meetinterval.`,
      '🌧'
    );
  }

  if(!issues.length){
    issues.push({
      level:'good',
      title:'Rustige vaarcondities',
      text:`Wind ${windBft} Bft · geen directe waarschuwing uit de bekende data.`,
      icon:'✓'
    });
  }

  const headline=
    level==='critical'
      ?'Niet vertrekken zonder controle'
      :level==='warning'
        ?'Extra aandacht'
        :'Goed vaarbaar';

  const detail=issues[0]?.text||
    'Geen directe aandachtspunten.';

  return {
    level,
    headline,
    detail,
    issues,
    windBft,
    gustBft
  };
}

function ms709RenderCurrent(payload){
  const current=payload?.current||{};
  const daily=payload?.daily||{};
  const risk=ms709Risk(payload);
  const rainChance=ms709CurrentRainChance(payload);

  ms709SetText(
    'ms709WeatherSymbol',
    ms709WeatherSymbol(
      current.weather_code,
      current.is_day
    )
  );
  ms709SetText(
    'ms709WeatherTemp',
    Number.isFinite(Number(current.temperature_2m))
      ?`${ms709Number(current.temperature_2m,1)}°`
      :'–°'
  );
  ms709SetText(
    'ms709WeatherDescription',
    weatherCodeDescription(current.weather_code)
  );
  ms709SetText(
    'ms709WeatherFeels',
    Number.isFinite(Number(current.apparent_temperature))
      ?`Voelt als ${ms709Number(current.apparent_temperature,1)} °C`
      :'Gevoelstemperatuur onbekend'
  );
  ms709SetText(
    'ms709WeatherWind',
    Number.isFinite(Number(current.wind_speed_10m))
      ?formatWindBeaufort(current.wind_speed_10m,true)
      :'–'
  );
  ms709SetText(
    'ms709WeatherDirection',
    ms709WindDirection(current.wind_direction_10m)
  );
  ms709SetText(
    'ms709WeatherGusts',
    Number.isFinite(Number(current.wind_gusts_10m))
      ?formatWindBeaufort(current.wind_gusts_10m,true)
      :'–'
  );
  ms709SetText(
    'ms709WeatherGustRisk',
    `${risk.gustBft} Bft maximaal actueel`
  );
  ms709SetText(
    'ms709WeatherRain',
    Number.isFinite(Number(current.precipitation))
      ?`${ms709Number(current.precipitation,1)} mm`
      :'–'
  );
  ms709SetText(
    'ms709WeatherRainChance',
    Number.isFinite(rainChance)
      ?`${Math.round(rainChance)}% kans komende uur`
      :'Kans onbekend'
  );
  ms709SetText(
    'ms709WeatherVisibility',
    Number.isFinite(Number(current.visibility))
      ?Number(current.visibility)>=1000
        ?`${ms709Number(Number(current.visibility)/1000,1)} km`
        :`${Math.round(Number(current.visibility))} m`
      :'–'
  );
  ms709SetText(
    'ms709WeatherCloud',
    Number.isFinite(Number(current.cloud_cover))
      ?`${Math.round(Number(current.cloud_cover))}% bewolking`
      :'Bewolking onbekend'
  );
  ms709SetText(
    'ms709WeatherPressure',
    Number.isFinite(Number(current.pressure_msl))
      ?`${Math.round(Number(current.pressure_msl))} hPa`
      :'–'
  );
  ms709SetText(
    'ms709WeatherHumidity',
    Number.isFinite(Number(current.relative_humidity_2m))
      ?`${Math.round(Number(current.relative_humidity_2m))}% luchtvochtigheid`
      :'Luchtvochtigheid onbekend'
  );
  ms709SetText(
    'ms709WeatherSunrise',
    `↑ ${ms709FormatTime(daily.sunrise?.[0])}`
  );
  ms709SetText(
    'ms709WeatherSunset',
    `↓ ${ms709FormatTime(daily.sunset?.[0])}`
  );

  const riskElement=document.getElementById(
    'ms709WeatherRisk'
  );
  if(riskElement){
    riskElement.className=
      `ms709-weather-risk ${risk.level}`;
    riskElement.innerHTML=`
      <span>VAARADVIES</span>
      <strong>${esc(risk.headline)}</strong>
      <small>${esc(risk.detail)}</small>
    `;
  }

  ms709SetText(
    'ms709MissionWeatherStatus',
    `${Math.round(Number(current.temperature_2m)||0)}° · ${risk.windBft} Bft`
  );
  ms709SetText(
    'ms709MissionWeatherDetail',
    risk.headline
  );

  if(
    typeof liveNavState!=='undefined'&&
    payload?.current
  ){
    liveNavState.weather={
      temperature:Number(current.temperature_2m),
      apparentTemperature:Number(current.apparent_temperature),
      precipitation:Number(current.precipitation),
      weatherCode:Number(current.weather_code),
      windSpeed:Number(current.wind_speed_10m),
      windGusts:Number(current.wind_gusts_10m),
      windDirection:Number(current.wind_direction_10m)
    };
    liveNavState.weatherUpdatedAt=
      Number(payload.fetchedAt)||Date.now();
    liveNavState.lastWeatherLat=
      Number(payload.coordinates?.lat);
    liveNavState.lastWeatherLon=
      Number(payload.coordinates?.lon);

    try{
      persistLiveState();
      renderLiveWeather();
    }catch{}
  }
}

function ms709RenderHourly(payload){
  const container=document.getElementById(
    'ms709HourlyForecast'
  );
  if(!container)return;

  const hourly=payload?.hourly;
  if(!hourly?.time?.length){
    container.innerHTML=
      '<div class="ms709-weather-empty">Geen uurverwachting beschikbaar.</div>';
    return;
  }

  const start=ms709CurrentHourlyIndex(payload);
  const indexes=Array.from(
    {length:12},
    (_,offset)=>start+offset
  ).filter(index=>index<hourly.time.length);

  container.innerHTML=indexes.map((index,offset)=>{
    const time=new Date(hourly.time[index]);
    const wind=Number(hourly.wind_speed_10m?.[index]);
    const gust=Number(hourly.wind_gusts_10m?.[index]);
    const rain=Number(
      hourly.precipitation_probability?.[index]
    );
    const visibility=Number(
      hourly.visibility?.[index]
    );

    return `
      <article class="${offset===0?'now':''}">
        <span>${offset===0?'Nu':time.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}</span>
        <strong>${ms709WeatherSymbol(hourly.weather_code?.[index],hourly.is_day?.[index])}</strong>
        <b>${Math.round(Number(hourly.temperature_2m?.[index])||0)}°</b>
        <small>💨 ${windKmhToBeaufort(wind)} Bft</small>
        <small>↯ ${windKmhToBeaufort(gust)} Bft</small>
        <small>💧 ${Number.isFinite(rain)?Math.round(rain):0}%</small>
        <small>◉ ${Number.isFinite(visibility)?ms709Number(visibility/1000,1):'–'} km</small>
      </article>
    `;
  }).join('');
}

function ms709RenderDaily(payload){
  const container=document.getElementById(
    'ms709DailyForecast'
  );
  if(!container)return;

  const daily=payload?.daily;
  if(!daily?.time?.length){
    container.innerHTML=
      '<div class="ms709-weather-empty">Geen weekverwachting beschikbaar.</div>';
    return;
  }

  container.innerHTML=daily.time.map((date,index)=>{
    const gust=Number(
      daily.wind_gusts_10m_max?.[index]
    );
    const wind=Number(
      daily.wind_speed_10m_max?.[index]
    );
    const rain=Number(
      daily.precipitation_probability_max?.[index]
    );

    return `
      <article>
        <div>
          <span>${ms709FormatDay(date,index)}</span>
          <strong>${ms709WeatherSymbol(daily.weather_code?.[index],1)}</strong>
        </div>
        <div>
          <b>${Math.round(Number(daily.temperature_2m_max?.[index])||0)}°</b>
          <small>${Math.round(Number(daily.temperature_2m_min?.[index])||0)}° min</small>
        </div>
        <div>
          <span>💨 ${windKmhToBeaufort(wind)} Bft</span>
          <small>stoten ${windKmhToBeaufort(gust)} Bft</small>
        </div>
        <div>
          <span>💧 ${Number.isFinite(rain)?Math.round(rain):0}%</span>
          <small>${weatherCodeDescription(daily.weather_code?.[index])}</small>
        </div>
      </article>
    `;
  }).join('');
}

function ms709RenderAdvice(payload){
  const container=document.getElementById(
    'ms709WeatherAdvice'
  );
  if(!container)return;

  const risk=ms709Risk(payload);

  container.innerHTML=risk.issues.map(issue=>`
    <article class="${issue.level}">
      <span>${issue.icon}</span>
      <div>
        <strong>${esc(issue.title)}</strong>
        <small>${esc(issue.text)}</small>
      </div>
    </article>
  `).join('');
}

function ms709RenderWeather(payload){
  if(!payload)return;

  ms709WeatherPayload=payload;
  ms709WeatherCoordinates=payload.coordinates||null;

  ms709SetText(
    'ms709WeatherLocation',
    payload.locationLabel||
    'Positie van Serenity'
  );

  const fetched=new Date(
    Number(payload.fetchedAt)||Date.now()
  );
  ms709SetText(
    'ms709WeatherUpdated',
    `Bijgewerkt ${fetched.toLocaleTimeString('nl-NL',{
      hour:'2-digit',
      minute:'2-digit',
      second:'2-digit'
    })} · automatisch iedere 5 minuten`
  );

  ms709RenderCurrent(payload);
  ms709RenderHourly(payload);
  ms709RenderDaily(payload);
  ms709RenderAdvice(payload);
  ms709UpdateCountdown();
}

function ms709UpdateCountdown(){
  const badge=document.getElementById(
    'ms709WeatherCountdown'
  );
  if(!badge)return;

  if(ms709WeatherFetchBusy){
    badge.textContent='Verversen…';
    badge.className='ms709-weather-badge checking';
    return;
  }

  const fetched=Number(
    ms709WeatherPayload?.fetchedAt||0
  );
  const remaining=Math.max(
    0,
    MS709_REFRESH_MS-
    (Date.now()-fetched)
  );
  const minutes=Math.floor(remaining/60000);
  const seconds=Math.floor(
    (remaining%60000)/1000
  );

  badge.textContent=
    fetched
      ?`↻ ${minutes}:${String(seconds).padStart(2,'0')}`
      :'Nog niet bijgewerkt';
  badge.className='ms709-weather-badge';
}

async function ms709ReverseLabel(lat,lon){
  try{
    const params=new URLSearchParams({
      lat:String(lat),
      lon:String(lon),
      format:'jsonv2',
      zoom:'10',
      addressdetails:'1'
    });

    const response=await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers:{
          Accept:'application/json'
        }
      }
    );

    if(!response.ok)return '';

    const data=await response.json();
    const address=data?.address||{};

    return (
      address.city||
      address.town||
      address.village||
      address.municipality||
      address.county||
      ''
    );
  }catch{
    return '';
  }
}

async function ms709RefreshWeather(
  force=false,
  forceGps=false
){
  if(ms709WeatherFetchBusy)return;

  const cached=ms709WeatherPayload||
    ms709ReadWeatherCache();
  const age=
    Date.now()-
    Number(cached?.fetchedAt||0);

  if(
    !force&&
    cached&&
    age<MS709_REFRESH_MS
  ){
    ms709RenderWeather(cached);
    return;
  }

  ms709WeatherFetchBusy=true;
  ms709WeatherLastAttempt=Date.now();
  ms709UpdateCountdown();

  try{
    const coordinates=
      await ms709ResolveCoordinates(forceGps);
    ms709WeatherCoordinates=coordinates;

    const response=await fetch(
      ms709BuildWeatherUrl(
        coordinates.lat,
        coordinates.lon
      ),
      {
        headers:{
          Accept:'application/json'
        },
        cache:'no-store'
      }
    );

    if(!response.ok){
      throw new Error(
        `Weerservice gaf fout ${response.status}`
      );
    }

    const data=await response.json();
    const label=
      await ms709ReverseLabel(
        coordinates.lat,
        coordinates.lon
      );

    const payload={
      ...data,
      fetchedAt:Date.now(),
      coordinates:{
        lat:coordinates.lat,
        lon:coordinates.lon,
        accuracy:coordinates.accuracy||null,
        source:coordinates.source||'GPS'
      },
      locationLabel:
        label||
        `${Number(coordinates.lat).toFixed(4)}, ${Number(coordinates.lon).toFixed(4)}`
    };

    ms709SaveWeatherCache(payload);
    ms709RenderWeather(payload);
  }catch(error){
    console.error(
      'Weerpagina verversen mislukt:',
      error
    );

    if(cached){
      ms709RenderWeather(cached);
      ms709SetText(
        'ms709WeatherUpdated',
        `Offline of geen GPS · laatst bijgewerkt ${new Date(Number(cached.fetchedAt)||0).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`
      );
    }else{
      ms709SetText(
        'ms709WeatherDescription',
        'Weer kon niet worden opgehaald'
      );
      ms709SetText(
        'ms709WeatherUpdated',
        'Geef locatietoegang en tik op ↻.'
      );
      ms709SetText(
        'ms709MissionWeatherStatus',
        'Niet beschikbaar'
      );
      ms709SetText(
        'ms709MissionWeatherDetail',
        'Open Weer en geef locatietoegang'
      );
    }
  }finally{
    ms709WeatherFetchBusy=false;
    ms709UpdateCountdown();
  }
}

async function ms709UseCurrentLocation(){
  await ms709RefreshWeather(true,true);
}

function initWeatherPage(){
  const cached=ms709ReadWeatherCache();

  if(cached&&!ms709WeatherPayload){
    ms709RenderWeather(cached);
  }

  ms709RefreshWeather(false);

  if(!ms709WeatherTimer){
    ms709WeatherTimer=setInterval(()=>{
      if(
        document.visibilityState==='visible'&&
        ms709WeatherPageVisible()
      ){
        ms709RefreshWeather(false);
      }
    },60000);
  }

  if(!ms709WeatherClockTimer){
    ms709WeatherClockTimer=setInterval(
      ms709UpdateCountdown,
      1000
    );
  }
}

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    const cached=ms709ReadWeatherCache();
    if(cached)ms709RenderWeather(cached);

    setTimeout(()=>{
      if(ms709WeatherPageVisible()){
        initWeatherPage();
      }
    },800);
  }
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(
      !document.hidden&&
      ms709WeatherPageVisible()
    ){
      ms709RefreshWeather(false);
    }
  }
);

window.addEventListener(
  'online',
  ()=>{
    if(ms709WeatherPageVisible()){
      ms709RefreshWeather(true);
    }
  },
  {passive:true}
);
