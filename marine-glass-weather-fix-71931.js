/* MijnSerenity 7.19.3 hotfix — één actuele weerbron voor Marine Glass */
(()=>{
  'use strict';
  if(window.__msMarineWeatherFix71931)return;
  window.__msMarineWeatherFix71931=true;

  const $=id=>document.getElementById(id);
  const finite=value=>Number.isFinite(Number(value))?Number(value):null;
  const fmt=(value,digits=1)=>Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const setText=(id,value)=>{
    const el=$(id);
    if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value);
  };

  const state={busy:false,nextAt:0,key:'',data:null};

  function livePosition(){
    const s=window.liveNavState||{};
    const direct={
      lat:s.currentLat??s.lat??s.position?.lat??s.position?.latitude,
      lon:s.currentLon??s.lon??s.lng??s.position?.lon??s.position?.lng??s.position?.longitude
    };
    if(finite(direct.lat)!=null&&finite(direct.lon)!=null)return {lat:Number(direct.lat),lon:Number(direct.lon)};
    for(const list of [s.trackPoints,s.track,s.history,s.gpsTrack,s.points]){
      if(!Array.isArray(list)||!list.length)continue;
      const p=list[list.length-1]||{};
      const lat=finite(p.lat??p.latitude),lon=finite(p.lon??p.lng??p.longitude);
      if(lat!=null&&lon!=null)return {lat,lon};
    }
    return null;
  }

  function getPosition(){
    const live=livePosition();
    if(live)return Promise.resolve(live);
    if(!navigator.geolocation)return Promise.resolve(null);
    return new Promise(resolve=>navigator.geolocation.getCurrentPosition(
      pos=>resolve({lat:pos.coords.latitude,lon:pos.coords.longitude}),
      ()=>resolve(null),
      {enableHighAccuracy:false,maximumAge:5*60*1000,timeout:8000}
    ));
  }

  function beaufort(kmh){
    const v=Math.max(0,finite(kmh)??0);
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    const i=limits.findIndex(limit=>v<limit);
    return i<0?12:i;
  }

  function direction(deg){
    const d=finite(deg);
    if(d==null)return '–';
    const names=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
    return names[Math.round((((d%360)+360)%360)/22.5)%16];
  }

  function seedFromLiveState(){
    const w=window.liveNavState?.weather||{};
    const temperature=finite(w.temperature??w.temperature2m??w.airTemperature);
    const windSpeed=finite(w.windSpeed??w.wind_speed_10m);
    const windDirection=finite(w.windDirection??w.wind_direction_10m);
    const precipitation=finite(w.precipitation);
    const waterTemperature=finite(w.waterTemperature);
    if([temperature,windSpeed,windDirection,precipitation,waterTemperature].every(v=>v==null))return;
    state.data={...(state.data||{}),temperature,windSpeed,windDirection,precipitation,waterTemperature};
  }

  function render(data=state.data){
    if(!data)return;
    const temperature=finite(data.temperature);
    const windSpeed=finite(data.windSpeed);
    const windDirection=finite(data.windDirection);
    const pressure=finite(data.pressure);
    const visibility=finite(data.visibility);
    const precipitation=finite(data.precipitation);
    const waterTemperature=finite(data.waterTemperature??window.liveNavState?.weather?.waterTemperature);

    const bft=windSpeed==null?null:beaufort(windSpeed);
    const dir=direction(windDirection);
    const tempText=temperature==null?'–°C':`${fmt(temperature,1)}°C`;
    const bftText=bft==null?'– Bft':`${bft} Bft`;

    setText('mgBft',bftText);
    setText('mgDir',dir);
    setText('mgOutTemp',tempText);
    setText('mgTempTop',tempText.replace(/\s/g,''));
    if(waterTemperature!=null)setText('mgWaterTemp',`${fmt(waterTemperature,1)}°C`);

    if(pressure!=null){
      setText('mgPressure',`${Math.round(pressure)} hPa`);
      setText('ivmsClimatePressure',`${Math.round(pressure)} hPa`);
    }

    const foot=document.querySelector('#msMarineGlass .mg-weather-foot');
    const cells=foot?.querySelectorAll('span');
    if(cells?.length>=3){
      const pressureEl=cells[0].querySelector('b');
      const visibilityEl=cells[1].querySelector('b');
      const precipitationEl=cells[2].querySelector('b');
      if(pressureEl&&pressure!=null)pressureEl.textContent=`${Math.round(pressure)} hPa`;
      if(visibilityEl&&visibility!=null){
        const km=visibility/1000;
        visibilityEl.textContent=km>=10?'10+ km':`${fmt(km,1)} km`;
      }
      if(precipitationEl&&precipitation!=null)precipitationEl.textContent=`${fmt(precipitation,1)} mm`;
    }

    /* Voed ook de oudere dashboardvelden zodat de 12-seconden-sync de actuele waarden niet terug overschrijft. */
    if(windSpeed!=null)setText('ms71510Wind',Math.round(windSpeed));
    setText('ms71510WindBft',bftText);
    setText('ms71512WindDirection',dir);
    if(temperature!=null){
      setText('weatherCurrentTemp',tempText);
      setText('ms793WeatherTemp',tempText);
      setText('ms709WeatherTemp',tempText);
    }
    if(windSpeed!=null)setText('ms709WeatherWind',bftText);
    setText('ms709WeatherDirection',dir);

    const arrow=$('mgWindArrow');
    if(arrow&&windDirection!=null)arrow.style.transform=`translate(-50%,-85%) rotate(${windDirection}deg)`;
  }

  async function refresh(force=false){
    seedFromLiveState();
    render();
    if(state.busy||(!force&&Date.now()<state.nextAt))return;
    const pos=await getPosition();
    if(!pos)return;
    const key=`${pos.lat.toFixed(3)},${pos.lon.toFixed(3)}`;
    if(!force&&key===state.key&&Date.now()<state.nextAt)return;
    state.busy=true;
    state.key=key;
    state.nextAt=Date.now()+10*60*1000;
    try{
      const query=new URLSearchParams({
        latitude:pos.lat.toFixed(5),
        longitude:pos.lon.toFixed(5),
        current:'temperature_2m,pressure_msl,visibility,precipitation,wind_speed_10m,wind_direction_10m',
        wind_speed_unit:'kmh',
        timezone:'auto'
      });
      const response=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`Weer ${response.status}`);
      const payload=await response.json();
      const current=payload?.current||{};
      state.data={
        ...(state.data||{}),
        temperature:finite(current.temperature_2m),
        windSpeed:finite(current.wind_speed_10m),
        windDirection:finite(current.wind_direction_10m),
        pressure:finite(current.pressure_msl),
        visibility:finite(current.visibility),
        precipitation:finite(current.precipitation)
      };
      render();
    }catch(error){
      console.warn('Marine Glass actuele weerdata niet bijgewerkt',error);
      state.nextAt=Date.now()+2*60*1000;
    }finally{
      state.busy=false;
    }
  }

  function guardWeatherCard(){
    const card=document.querySelector('#msMarineGlass .mg-weather');
    if(!card||!window.MutationObserver)return;
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;render()});
    }).observe(card,{childList:true,characterData:true,subtree:true});
  }

  function start(){
    refresh(true);
    setTimeout(()=>{seedFromLiveState();render();guardWeatherCard();refresh(true)},500);
    setTimeout(()=>refresh(true),2500);
    const timer=setInterval(()=>{if(!document.hidden)refresh(false)},60*1000);
    ['mijnserenity:modules-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-ruuvi-vrm-updated'].forEach(name=>window.addEventListener(name,()=>{seedFromLiveState();render()},{passive:true}));
    window.addEventListener('online',()=>{state.nextAt=0;refresh(true)},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)},{passive:true});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
