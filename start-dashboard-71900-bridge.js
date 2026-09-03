/* MijnSerenity 7.19.0 — compatibiliteitsbrug voor oude dashboard-ID's.
   Geen verborgen dashboard-rendering, geen polling, geen MutationObservers,
   geen iPad-CSS-injecties. Alleen nuttige signalen + RWS same-origin proxy. */
(()=>{
  'use strict';
  if(window.__msStartBridge71900)return;
  window.__msStartBridge71900=true;

  const $=id=>document.getElementById(id);
  const text=id=>String($(id)?.textContent||'').trim();
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const set=(id,value)=>{
    const node=$(id);
    if(node&&value!==undefined&&value!==null&&node.textContent!==String(value))node.textContent=String(value);
  };

  function syncSignals(){
    /* Een paar nieuwere Marine Glass-functies hebben nog fallback-ID's uit
       het 7.15-dashboard. We houden alléén die waarden actueel, event-driven. */
    const speed=number(text('ivmsSpeed'));
    if(speed!==null)set('ms71510Speed',speed.toLocaleString('nl-NL',{maximumFractionDigits:1}));

    const depth=text('ivmsDepth');
    if(depth)set('ms71510Depth',depth);

    const rpm=number(text('liveEngineRpm'))??number($('liveEngineRpmInput')?.value);
    if(rpm!==null)set('ms71510Rpm',Math.round(rpm).toLocaleString('nl-NL'));

    const windCandidates=[
      text('ivmsWindBft'),text('liveWindBft'),text('ms71512WindBft'),
      text('weatherWindBft'),text('windBft')
    ];
    const wind=windCandidates.find(value=>number(value)!==null);
    if(wind)set('ms71510WindBft',`${number(wind).toLocaleString('nl-NL',{maximumFractionDigits:1})} Bft`);

    const fuel=number(text('ivmsTankFuelValue'))??number(text('ivmsFuelRing'));
    if(fuel!==null)set('ms71510Fuel',`${Math.round(fuel)}%`);

    const houseV=text('ivmsBatteryVoltage')||text('techHouseVoltage');
    const houseA=text('ivmsBatteryCurrent')||text('techHouseCurrent');
    const houseSoc=text('ivmsBatteryRing')||text('techHouseSoc');
    const startV=text('techStartVoltage')||text('liveStartVoltage');
    if(houseV)set('ms71510HouseVoltage',houseV);
    if(houseA)set('ms71510HouseCurrent',houseA);
    if(houseSoc)set('ms71510HouseSoc',houseSoc);
    if(startV)set('ms71510StartVoltage',startV);
  }

  let queued=false;
  function queueSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;syncSignals()});
  }

  const events=[
    'mijnserenity-ha-state-updated','mijnserenity-ha-connected',
    'mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange',
    'mijnserenity:dashboard-ready'
  ];

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueSync,{once:true});
  else queueSync();
  events.forEach(name=>window.addEventListener(name,queueSync,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync()},{passive:true});
})();

/* RWS WaterWebservices via dezelfde Netlify-origin.
   Dit blijft nodig omdat Safari/iOS de rechtstreekse cross-origin POST kan blokkeren. */
(()=>{
  'use strict';
  if(window.__msRwsFetchProxyInstalled)return;
  window.__msRwsFetchProxyInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  const catalog='https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES/OphalenCatalogus';
  const latest='https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen';
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url===catalog)return nativeFetch('/api/rws-water-catalogus',init);
    if(url===latest)return nativeFetch('/api/rws-water-latest',init);
    return nativeFetch(input,init);
  };
})();

/* RWS kaart gebruikt ongeveer 20 km omgeving. Prototype één keer patchen;
   geen documentbrede observer meer. */
(()=>{
  'use strict';
  if(window.__ms719RwsMapPatch)return;
  window.__ms719RwsMapPatch=true;

  function currentCoords(){
    try{
      const state=window.liveNavState||{};
      const direct={lat:Number(state.currentLat??state.lat),lon:Number(state.currentLon??state.lon??state.lng)};
      if(Number.isFinite(direct.lat)&&Number.isFinite(direct.lon))return direct;
      const points=state.points;
      const point=Array.isArray(points)&&points.length?points[points.length-1]:null;
      const lat=Number(point?.lat),lon=Number(point?.lon??point?.lng);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch{}
    return null;
  }

  function patch(){
    const proto=window.L?.Map?.prototype;
    if(!proto||proto.__ms719RwsFitBounds)return Boolean(proto);
    const original=proto.fitBounds;
    proto.fitBounds=function(bounds,options){
      try{
        if(this.getContainer?.()?.id==='ms71515RwsWaterMap'){
          const coords=currentCoords();
          if(coords)return this.setView([coords.lat,coords.lon],11,{animate:false});
        }
      }catch(error){console.debug('RWS kaartfit:',error)}
      return original.call(this,bounds,options);
    };
    proto.__ms719RwsFitBounds=true;
    return true;
  }

  function start(){
    if(patch())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(patch()||attempts>=8)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

/* Marine Glass dashboard: haal het actuele weer op de huidige GPS-positie op.
   Het dashboard las eerder alleen losse/stale DOM-waarden en ververste de
   Open-Meteo data niet zolang de aparte Weer-pagina niet geopend was. */
(()=>{
  'use strict';
  if(window.__ms719LiveDashboardWeather)return;
  window.__ms719LiveDashboardWeather=true;

  const REFRESH_MS=5*60*1000;
  const $=id=>document.getElementById(id);
  const text=id=>String($(id)?.textContent||'').trim();
  const set=(id,value)=>{
    const node=$(id);
    if(node&&value&&node.textContent!==String(value))node.textContent=String(value);
  };
  const valid=value=>{
    const clean=String(value||'').trim();
    return clean&&clean!=='–'&&clean!=='-'&&!/^–\s*(?:°|°C|Bft)?$/i.test(clean);
  };
  const syncSource=(id,value)=>{
    if(!valid(value))return;
    let node=$(id);
    if(!node){
      node=document.createElement('span');
      node.id=id;
      node.hidden=true;
      node.dataset.msDashboardWeatherSource='1';
      (document.body||document.documentElement).appendChild(node);
    }
    if(node.dataset.msDashboardWeatherSource==='1'||!valid(node.textContent)){
      node.dataset.msDashboardWeatherSource='1';
      if(node.textContent!==String(value))node.textContent=String(value);
    }
  };

  let busy=false;
  let lastRefresh=0;

  function ensureDashboardWeatherIds(){
    const fields=document.querySelectorAll('#msMarineGlass .mg-weather-foot span');
    if(fields[1]?.querySelector('b'))fields[1].querySelector('b').id='mgVisibility';
    if(fields[2]?.querySelector('b'))fields[2].querySelector('b').id='mgPrecipitation';
  }

  function copyLiveWeatherToDashboard(){
    ensureDashboardWeatherIds();

    const wind=text('ms709WeatherWind');
    const direction=text('ms709WeatherDirection');
    const outside=text('ms709WeatherTemp');
    const water=text('ms793WeatherWaterTemp');
    const pressure=text('ms709WeatherPressure');
    const visibility=text('ms709WeatherVisibility');
    const precipitation=text('ms709WeatherRain');

    if(valid(wind)){
      set('mgBft',wind);
      syncSource('ms71510WindBft',wind);
    }
    if(valid(direction)&&!/onbekend/i.test(direction)){
      set('mgDir',direction);
      syncSource('ms71512WindDirection',direction);
    }
    if(valid(outside)){
      set('mgOutTemp',outside);
      set('mgTempTop',outside.replace(/\s/g,''));
      syncSource('weatherCurrentTemp',outside);
    }
    if(valid(water)&&!/niet beschikbaar/i.test(water)){
      set('mgWaterTemp',water);
      syncSource('ms71510WaterTemp',water);
    }
    if(valid(pressure)){
      set('mgPressure',pressure);
      syncSource('ivmsClimatePressure',pressure);
    }
    if(valid(visibility))set('mgVisibility',visibility);
    if(valid(precipitation))set('mgPrecipitation',precipitation);

    const degrees=Number(window.liveNavState?.weather?.windDirection);
    const arrow=$('mgWindArrow');
    if(arrow&&Number.isFinite(degrees))arrow.style.transform=`translate(-50%,-85%) rotate(${degrees}deg)`;
  }

  function weatherRefreshFunction(){
    try{
      return typeof ms709RefreshWeather==='function'?ms709RefreshWeather:null;
    }catch{
      return null;
    }
  }

  async function refreshDashboardWeather(force=false){
    if(busy)return;
    const now=Date.now();
    if(!force&&now-lastRefresh<REFRESH_MS){
      copyLiveWeatherToDashboard();
      return;
    }

    const refresh=weatherRefreshFunction();
    if(!refresh){
      setTimeout(()=>refreshDashboardWeather(force),1000);
      return;
    }

    busy=true;
    lastRefresh=now;
    try{
      /* force=true voorkomt een oude cache; forceGps=true verplaatst het weer
         mee met de boot in plaats van op de laatst opgeslagen positie te blijven. */
      await refresh(true,true);
    }catch(error){
      console.debug('Dashboardweer verversen:',error);
    }finally{
      busy=false;
      copyLiveWeatherToDashboard();
    }
  }

  function dashboardVisible(){
    const dashboard=$('dashboard');
    return dashboard&&!dashboard.classList.contains('hidden')&&!document.hidden;
  }

  function start(){
    copyLiveWeatherToDashboard();
    setTimeout(()=>refreshDashboardWeather(true),700);

    setInterval(()=>{
      if(dashboardVisible())refreshDashboardWeather(false);
    },60000);

    window.addEventListener('online',()=>refreshDashboardWeather(true),{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>refreshDashboardWeather(true),{passive:true});
    window.addEventListener('mijnserenity:dashboard-ready',()=>refreshDashboardWeather(false),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        copyLiveWeatherToDashboard();
        if(dashboardVisible())refreshDashboardWeather(false);
      }
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

/* Publiceer de bestaande Captain AI-laag op het huidige Marine Glass-dashboard.
   De Captain-module bouwt de kaart eerst in de oude compatibiliteitslaag;
   daarna verplaatsen we exact diezelfde kaart naar het zichtbare dashboard. */
(()=>{
  'use strict';
  if(window.__msCaptainAiDashboardLoader)return;
  window.__msCaptainAiDashboardLoader=true;

  function installMarineStyle(){
    if(document.getElementById('msCaptainMarineStyle8203'))return;
    const style=document.createElement('style');
    style.id='msCaptainMarineStyle8203';
    style.textContent=`
      #msMarineGlass .mg-grid>#msDashboardCaptainSearch{
        grid-column:1/-1!important;
        width:100%!important;
        box-sizing:border-box!important;
        margin:0!important;
      }
      @media(max-width:700px){
        #msMarineGlass .mg-grid>#msDashboardCaptainSearch{margin:0!important;border-radius:18px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function placeCaptain(){
    const marine=document.getElementById('msMarineGlass');
    const grid=marine?.querySelector('.mg-grid');
    const card=document.getElementById('msDashboardCaptainSearch');
    if(!grid||!card)return false;
    installMarineStyle();
    const map=grid.querySelector('.mg-map');
    if(card.parentElement!==grid){
      if(map)map.insertAdjacentElement('afterend',card);
      else grid.prepend(card);
    }
    card.dataset.msMarineCaptain='8203';
    return true;
  }

  function watchPlacement(){
    if(placeCaptain())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(placeCaptain()||attempts>=30)clearInterval(timer);
    },250);
  }

  function loadCaptainAi(){
    if(window.__msCaptainAi71814){watchPlacement();return;}
    if(document.querySelector('script[data-ms-captain-ai-loader]')){watchPlacement();return;}
    const script=document.createElement('script');
    script.src='captain-ai-71814.js?v=82030';
    script.async=true;
    script.dataset.msCaptainAiLoader='1';
    script.onload=watchPlacement;
    script.onerror=()=>console.warn('Captain AI kon niet worden geladen.');
    document.head.appendChild(script);
  }

  window.addEventListener('mijnserenity:dashboard-ready',()=>setTimeout(placeCaptain,0),{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCaptainAi,{once:true});
  else loadCaptainAi();
})();

/* MijnSerenity 8.23.1 — toon de gemeten RWS-watertemperatuur ook in de
   bestaande Watertemperatuur-kaart. Open-Meteo Marine blijft alleen fallback. */
(()=>{
  'use strict';
  if(window.__msRwsWaterCardSync8231)return;
  window.__msRwsWaterCardSync8231=true;

  const $=id=>document.getElementById(id);
  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  };
  const formatTemp=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  const formatDistance=value=>{
    const distance=finite(value);
    if(distance===null)return '';
    return distance<1?`${Math.round(distance*1000)} m`:`${distance.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km`;
  };

  function weatherVisible(){
    if(document.hidden)return false;
    const page=$('weather');
    if(!page)return false;
    if(!page.classList.contains('hidden'))return true;
    try{return typeof window.ms708CurrentPageId==='function'&&window.ms708CurrentPageId()==='weather'}catch{return false}
  }

  function rwsReading(){
    const weather=window.liveNavState?.weather||{};
    const stateValue=finite(weather.waterTemperature);
    if(stateValue!==null){
      return {
        value:stateValue,
        station:String(weather.waterTemperatureStation||'').trim(),
        distanceKm:finite(weather.waterTemperatureDistanceKm)
      };
    }

    const raw=String($('ms71515RwsWaterValue')?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    if(!match)return null;
    const value=finite(match[0]);
    if(value===null||value<=-5||value>=45)return null;
    return {
      value,
      station:String($('ms71515RwsStation')?.textContent||'').trim(),
      distanceKm:null
    };
  }

  function sync(){
    const reading=rwsReading();
    if(!reading)return false;

    const temperature=formatTemp(reading.value);
    const valueNode=$('ms793WeatherWaterTemp');
    if(valueNode)valueNode.textContent=temperature;

    const details=[];
    if(reading.station&&reading.station!=='–')details.push(reading.station);
    const distance=formatDistance(reading.distanceKm);
    if(distance)details.push(distance);
    const source=$('ms793WeatherWaterSource');
    if(source)source.textContent=`Rijkswaterstaat · gemeten${details.length?' · '+details.join(' · '):''}`;

    const dashboard=$('ms71510WaterTemp');
    if(dashboard)dashboard.textContent=temperature;
    const marine=$('mgWaterTemp');
    if(marine)marine.textContent=temperature;
    return true;
  }

  let lastKick=0;
  function kickRws(){
    if(sync()||!weatherVisible())return;
    const now=Date.now();
    if(now-lastKick<30000)return;
    const button=$('ms71515RwsRefresh');
    if(!button)return;
    lastKick=now;
    try{button.click()}catch{}
  }

  function schedule(){
    [0,500,1200,2500,5000,9000,16000].forEach(delay=>setTimeout(()=>{
      if(!sync())kickRws();
    },delay));
  }

  ['mijnserenity-weather-updated','mijnserenity:routechange','mijnserenity:dashboard-ready','online']
    .forEach(name=>window.addEventListener(name,schedule,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()},{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();
