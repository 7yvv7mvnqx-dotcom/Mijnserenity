/* MijnSerenity 8.25.8 — live snelheid, buitentemperatuur en windkracht op Start */
(()=>{
  'use strict';
  if(window.__msStartLive8258)return;
  window.__msStartLive8258=true;

  const BUILD='8.25.8';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@8c1e3094f221de00245cad65e7c962a19d7dd3c7/start-dashboard-71510.js';
  const SPEED_ID='ms8234Speed';
  const OUTSIDE_ID='ms8234Outside';
  const WIND_ID='ms8234Wind';
  const WEATHER_REFRESH_MS=5*60*1000;

  /* Het oude Marine Glass-dashboard blijft technisch aanwezig als databron/fallback,
     maar mag tijdens het opstarten nooit meer zichtbaar worden. Zo blijven bestaande
     GPS-, AIS-, energie- en navigatiekoppelingen intact zonder de oude Start-flits. */
  function hideLegacyMarineGlassStart(){
    if(document.getElementById('ms8261LegacyStartGuard'))return;
    const style=document.createElement('style');
    style.id='ms8261LegacyStartGuard';
    style.textContent='#dashboard>#msMarineGlass{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }
  hideLegacyMarineGlassStart();

  let speedObserver=null;
  let speedObserverNode=null;
  let passiveWatchId=null;
  let lastPassivePoint=null;
  let passiveSpeedKmh=0;
  let lastPassiveAt=0;
  let syncTimer=null;
  let weatherBusy=false;
  let lastWeatherRefresh=0;

  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(String(value).replace(',','.'));
    return Number.isFinite(n)?n:null;
  };

  const numberFromText=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function dashboardVisible(){
    if(document.hidden)return false;
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    if(!app||!dashboard)return false;
    if(app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return false;
    return !dashboard.classList.contains('hidden')&&dashboard.getAttribute('aria-hidden')!=='true';
  }

  function formatKmh(value){
    const speed=Math.max(0,Number(value)||0);
    if(speed<0.05)return '0 km/u';
    return `${speed.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km/u`;
  }

  function renderSpeed(value){
    const node=document.getElementById(SPEED_ID);
    if(!node)return false;
    const text=formatKmh(value);
    if(node.textContent!==text)node.textContent=text;
    node.classList.remove('is-missing');
    return true;
  }

  function renderLiveMetric(id,value){
    const node=document.getElementById(id);
    if(!node||!value)return false;
    const next=String(value);
    if(node.textContent!==next)node.textContent=next;
    node.classList.remove('is-missing');
    node.closest('.ms8234-status')?.classList.remove('is-missing');
    return true;
  }

  function liveRecordedSpeed(){
    const state=window.liveNavState||{};
    if(String(state.status||'').toLowerCase()!=='active')return null;
    const speed=finite(state.speedKmh);
    if(speed!==null)return Math.max(0,speed);

    const liveNode=document.getElementById('liveSpeedKmh');
    const match=String(liveNode?.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Math.max(0,Number(match[0])):null;
  }

  function distanceMeters(a,b){
    if(!a||!b)return 0;
    const rad=Math.PI/180;
    const lat1=a.lat*rad,lat2=b.lat*rad;
    const dLat=(b.lat-a.lat)*rad;
    const dLon=(b.lon-a.lon)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }

  function passivePosition(position){
    const coords=position?.coords||{};
    const lat=finite(coords.latitude),lon=finite(coords.longitude);
    if(lat===null||lon===null)return;

    const now=Number(position.timestamp)||Date.now();
    const accuracy=finite(coords.accuracy);
    const rawMps=finite(coords.speed);
    let candidate=rawMps!==null?Math.max(0,rawMps*3.6):null;

    const current={lat,lon,time:now,accuracy};
    if(candidate===null&&lastPassivePoint){
      const seconds=(now-lastPassivePoint.time)/1000;
      if(seconds>=1.5&&seconds<=20&&(accuracy===null||accuracy<=80)){
        const meters=distanceMeters(lastPassivePoint,current);
        const noiseFloor=Math.max(3,Math.min(8,(accuracy||8)*0.35));
        candidate=meters<=noiseFloor?0:(meters/seconds)*3.6;
      }
    }
    lastPassivePoint=current;

    if(candidate===null){
      if(Date.now()-lastPassiveAt>5000)passiveSpeedKmh=0;
      renderSpeed(passiveSpeedKmh);
      return;
    }

    if(candidate<0.6)candidate=0;
    if(candidate>80)return;
    const response=passiveSpeedKmh>0?0.5:1;
    passiveSpeedKmh=(passiveSpeedKmh*(1-response))+(candidate*response);
    if(passiveSpeedKmh<0.35)passiveSpeedKmh=0;
    lastPassiveAt=Date.now();
    renderSpeed(passiveSpeedKmh);
  }

  function stopPassiveWatch(){
    if(passiveWatchId!==null&&navigator.geolocation){
      try{navigator.geolocation.clearWatch(passiveWatchId)}catch(_){}
    }
    passiveWatchId=null;
    lastPassivePoint=null;
  }

  function ensurePassiveWatch(){
    if(passiveWatchId!==null||!navigator.geolocation||!dashboardVisible())return;
    if(liveRecordedSpeed()!==null)return;
    try{
      passiveWatchId=navigator.geolocation.watchPosition(
        passivePosition,
        ()=>{},
        {enableHighAccuracy:true,maximumAge:2000,timeout:15000}
      );
    }catch(_){passiveWatchId=null}
  }

  function observeSpeedNode(){
    const node=document.getElementById(SPEED_ID);
    if(!node||node===speedObserverNode)return;
    speedObserver?.disconnect();
    speedObserverNode=node;
    speedObserver=new MutationObserver(()=>{
      const text=String(node.textContent||'');
      if(/\bkn\b/i.test(text)||!/km\/u/i.test(text))requestAnimationFrame(syncSpeed);
    });
    speedObserver.observe(node,{subtree:true,childList:true,characterData:true});
  }

  function syncSpeed(){
    syncBuild();
    observeSpeedNode();

    const live=liveRecordedSpeed();
    if(live!==null){
      stopPassiveWatch();
      renderSpeed(live);
      return;
    }

    if(!dashboardVisible()){
      stopPassiveWatch();
      return;
    }

    ensurePassiveWatch();
    const fresh=Date.now()-lastPassiveAt<=7000;
    renderSpeed(fresh?passiveSpeedKmh:0);
  }

  function beaufortFromKmh(value){
    const speed=finite(value);
    if(speed===null)return null;
    try{
      if(typeof window.windKmhToBeaufort==='function'){
        const result=finite(window.windKmhToBeaufort(speed));
        if(result!==null)return Math.max(0,Math.min(12,Math.round(result)));
      }
    }catch(_){}
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    const index=limits.findIndex(limit=>speed<limit);
    return index<0?12:index;
  }

  function bftFromText(value){
    const text=String(value??'');
    const match=text.replace(',','.').match(/(\d+(?:\.\d+)?)\s*Bft\b/i);
    return match?Math.max(0,Math.min(12,Math.round(Number(match[1])))):null;
  }

  function sourceText(ids){
    for(const id of ids){
      const value=String(document.getElementById(id)?.textContent||'').trim();
      if(value&&!/^(?:–|-|—|geen data|geen meting|onbekend)$/i.test(value))return value;
    }
    return '';
  }

  function keepWindSource(value){
    if(value===null)return;
    const text=`${value} Bft`;
    let source=document.getElementById('weatherWindBft');
    if(!source){
      source=document.createElement('span');
      source.id='weatherWindBft';
      source.hidden=true;
      source.dataset.msStartWeatherSource='8258';
      (document.body||document.documentElement).appendChild(source);
    }
    if(source.textContent!==text)source.textContent=text;
  }

  function readLiveWeather(){
    const weather=window.liveNavState?.weather||{};
    let temperature=finite(weather.temperature);
    let windKmh=finite(weather.windSpeed);

    if(temperature===null){
      temperature=numberFromText(sourceText([
        'ms709WeatherTemp','weatherCurrentTemp','ivmsOutsideTemp','currentWeatherTemp'
      ]));
    }

    let windBft=windKmh!==null?beaufortFromKmh(windKmh):null;
    if(windBft===null){
      const windText=sourceText([
        'ms709WeatherWind','ms71510WindBft','weatherWindBft','ivmsWindBft','liveWindBft'
      ]);
      windBft=bftFromText(windText);
      if(windBft===null){
        const raw=numberFromText(windText);
        if(raw!==null&&raw>=0&&raw<=12)windBft=Math.round(raw);
      }
    }

    const description=sourceText([
      'ms709WeatherDescription','weatherCurrentDescription','currentWeatherDescription','ms709WeatherCondition'
    ]);
    return {temperature,windKmh,windBft,description};
  }

  function syncWeather(){
    const weather=readLiveWeather();

    if(weather.temperature!==null){
      const value=`${weather.temperature.toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})}°`;
      renderLiveMetric(OUTSIDE_ID,value);
      const sub=document.getElementById('ms8245OutsideSub');
      if(sub&&weather.description){
        if(sub.textContent!==weather.description)sub.textContent=weather.description;
        sub.hidden=false;
      }
    }

    if(weather.windBft!==null){
      keepWindSource(weather.windBft);
      renderLiveMetric(WIND_ID,`${weather.windBft} Bft`);
      const node=document.getElementById(WIND_ID);
      if(node&&weather.windKmh!==null){
        node.title=`${weather.windKmh.toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})} km/u`;
      }
    }
  }

  async function refreshLiveWeather(force=false){
    if(weatherBusy||!dashboardVisible())return;
    const now=Date.now();
    if(!force&&now-lastWeatherRefresh<WEATHER_REFRESH_MS)return;
    const refresh=window.ms709RefreshWeather;
    if(typeof refresh!=='function')return;

    weatherBusy=true;
    lastWeatherRefresh=now;
    try{
      /* Live weerschatting op de actuele GPS-positie van Serenity. */
      await refresh(true,true);
    }catch(error){
      console.debug('Startweer verversen:',error);
    }finally{
      weatherBusy=false;
      syncWeather();
    }
  }

  function syncLiveValues(){
    syncSpeed();
    syncWeather();
    refreshLiveWeather(false);
  }

  function protectBaseRefresh(){
    const original=window.ms8210RefreshStart;
    if(typeof original!=='function'||original.__ms8258Wrapped)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      requestAnimationFrame(syncLiveValues);
      return result;
    };
    wrapped.__ms8258Wrapped=true;
    window.ms8210RefreshStart=wrapped;
  }

  function startFix(){
    syncBuild();
    protectBaseRefresh();
    syncLiveValues();
    setTimeout(()=>refreshLiveWeather(true),700);

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:routechange','mijnserenity:start-requested','pageshow','online']
      .forEach(type=>window.addEventListener(type,()=>{
        protectBaseRefresh();
        requestAnimationFrame(syncLiveValues);
        if(type==='online')setTimeout(()=>refreshLiveWeather(true),150);
      },{passive:true}));

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopPassiveWatch();
      else{
        syncLiveValues();
        refreshLiveWeather(false);
      }
    },{passive:true});

    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{
      protectBaseRefresh();
      syncLiveValues();
    },1000);

    [0,200,600,1300,2600,5000].forEach(ms=>setTimeout(()=>{
      protectBaseRefresh();
      syncLiveValues();
    },ms));

    console.info(`MijnSerenity ${BUILD}: snelheid, temperatuur en windkracht live op Start.`);
  }

  function loadBase(){
    if(window.__msPolish8256){
      startFix();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startFix;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.6 basis kon niet worden geladen.');
      startFix();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();