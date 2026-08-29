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

    if(valid(wind))set('mgBft',wind);
    if(valid(direction)&&!/onbekend/i.test(direction))set('mgDir',direction);
    if(valid(outside)){
      set('mgOutTemp',outside);
      set('mgTempTop',outside.replace(/\s/g,''));
    }
    if(valid(water)&&!/niet beschikbaar/i.test(water))set('mgWaterTemp',water);
    if(valid(pressure))set('mgPressure',pressure);
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
