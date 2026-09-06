/* MijnSerenity 8.26.2 — iPhone live weer + header zonder overlap */
(()=>{
  'use strict';
  if(window.__msStartIphone8262)return;
  window.__msStartIphone8262=true;

  const BUILD='8.26.2';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@054fe0cd9d445e77750fb8ee124eee90324995c7/start-dashboard-71510.js';
  const STYLE_ID='ms8262IphoneStartStyle';
  let weatherRequestBusy=false;

  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const number=Number(String(value).replace(',','.'));
    return Number.isFinite(number)?number:null;
  };

  function installIphoneStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Alleen de smalle iPhone-portretweergave corrigeren. Desktop/iPad blijven intact. */
      @supports (-webkit-touch-callout:none){
        @media (max-width:620px) and (orientation:portrait){
          #ms8210Start .ms8234-header{
            position:relative!important;
            padding-left:12px!important;
            padding-right:12px!important;
          }
          #ms8210Start .ms8234-brand{
            width:50%!important;
            max-width:50%!important;
            min-width:0!important;
            padding-right:8px!important;
            box-sizing:border-box!important;
          }
          #ms8210Start .ms8254-tagline,
          #ms8210Start .ms8261-compact-slogan{
            position:static!important;
            display:block!important;
            width:100%!important;
            max-width:105px!important;
            margin:7px 0 0!important;
            white-space:normal!important;
            overflow:visible!important;
            font-size:6px!important;
            line-height:1.35!important;
            letter-spacing:.12em!important;
            transform:none!important;
          }
          #ms8210Start .ms8234-attention,
          #ms8210Start #ms8210Summary{
            position:absolute!important;
            left:auto!important;
            right:8px!important;
            top:10px!important;
            width:43%!important;
            max-width:160px!important;
            min-width:0!important;
            padding:8px 9px!important;
            box-sizing:border-box!important;
            transform:none!important;
          }
          #ms8210Start .ms8234-attention-copy{min-width:0!important}
          #ms8210Start .ms8234-attention-copy strong{
            display:block!important;
            max-width:100%!important;
            font-size:10.5px!important;
            line-height:1.08!important;
            white-space:normal!important;
            overflow-wrap:anywhere!important;
          }
          #ms8210Start .ms8234-attention-copy small{
            display:block!important;
            max-width:100%!important;
            font-size:8.5px!important;
            line-height:1.12!important;
            white-space:normal!important;
          }
        }
      }
    `;
    document.head.appendChild(style);
  }

  function windKmhFromState(state){
    const raw=finite(state?.windSpeed);
    if(raw===null)return null;
    const unit=String(state?.windSpeedUnit||state?.windUnit||state?.units?.windSpeed||'').toLowerCase();
    if(unit.includes('km'))return Math.max(0,raw);
    if(unit.includes('m/s')||unit.includes('mps'))return Math.max(0,raw*3.6);
    /* marine-glass-weather gebruikt Open-Meteo bewust in knopen. */
    if(unit.includes('kn')||unit.includes('knot')||state?.source==='open-meteo'||!unit)return Math.max(0,raw*1.852);
    return Math.max(0,raw);
  }

  function beaufortFromKmh(value){
    const speed=finite(value);
    if(speed===null)return null;
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    const index=limits.findIndex(limit=>speed<limit);
    return index<0?12:index;
  }

  function snapshot(detail){
    const eventState=detail&&typeof detail==='object'?detail:{};
    const state={...(window.weatherState||{}),...eventState};
    const live=window.liveNavState?.weather||{};
    const temperature=finite(state.temperature)??finite(live.temperature);
    let windKmh=windKmhFromState(state);
    if(windKmh===null)windKmh=finite(live.windSpeed);
    const windDirection=finite(state.windDirection)??finite(live.windDirection);
    return {temperature,windKmh,windDirection,state};
  }

  function mirrorIntoLiveNav(weather){
    if(weather.temperature===null&&weather.windKmh===null)return;
    const nav=window.liveNavState||(window.liveNavState={});
    const previous=nav.weather&&typeof nav.weather==='object'?nav.weather:{};
    nav.weather={
      ...previous,
      ...(weather.temperature!==null?{temperature:weather.temperature}:{}),
      ...(weather.windKmh!==null?{windSpeed:weather.windKmh}:{}),
      ...(weather.windDirection!==null?{windDirection:weather.windDirection}:{}),
      updatedAt:Date.now()
    };
  }

  function renderWeather(detail){
    const weather=snapshot(detail);
    mirrorIntoLiveNav(weather);

    const outside=document.getElementById('ms8234Outside');
    if(outside&&weather.temperature!==null){
      const text=`${weather.temperature.toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})}°`;
      if(outside.textContent!==text)outside.textContent=text;
      outside.classList.remove('is-missing');
      outside.closest('.ms8234-status')?.classList.remove('is-missing');
    }

    const wind=document.getElementById('ms8234Wind');
    const bft=beaufortFromKmh(weather.windKmh);
    if(wind&&bft!==null){
      const text=`${bft} Bft`;
      if(wind.textContent!==text)wind.textContent=text;
      wind.classList.remove('is-missing');
      wind.closest('.ms8234-live-metric')?.classList.remove('is-missing');
      const kmh=weather.windKmh.toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1});
      wind.title=weather.windDirection===null?`${kmh} km/u`:`${kmh} km/u · ${Math.round(weather.windDirection)}°`;
    }
  }

  async function requestLiveWeather(force=false){
    if(weatherRequestBusy||typeof window.ms709RefreshWeather!=='function')return;
    weatherRequestBusy=true;
    try{
      await window.ms709RefreshWeather(Boolean(force),true);
    }catch(error){
      console.debug('iPhone Startweer verversen:',error);
    }finally{
      weatherRequestBusy=false;
      renderWeather();
    }
  }

  function startFix(){
    installIphoneStyle();
    renderWeather();

    ['weather:update','weather:updated','mijnserenity:weather-updated']
      .forEach(type=>window.addEventListener(type,event=>renderWeather(event.detail),{passive:true}));

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','pageshow']
      .forEach(type=>window.addEventListener(type,()=>requestAnimationFrame(()=>renderWeather()),{passive:true}));

    window.addEventListener('online',()=>setTimeout(()=>requestLiveWeather(true),150),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        renderWeather();
        requestLiveWeather(false);
      }
    },{passive:true});

    [0,250,700,1500,3000].forEach(ms=>setTimeout(()=>renderWeather(),ms));
    setTimeout(()=>requestLiveWeather(true),550);
    setInterval(()=>{if(!document.hidden)renderWeather()},5000);

    console.info(`MijnSerenity ${BUILD}: iPhone Start — live temperatuur/wind en headerlayout hersteld.`);
  }

  function loadBase(){
    if(window.__msStartLive8258){
      startFix();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startFix;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.8 basis kon niet worden geladen.');
      startFix();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
