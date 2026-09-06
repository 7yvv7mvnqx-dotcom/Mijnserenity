/* MijnSerenity 8.26.4 — buitenweer, walstroomstatus en motorruimte live op Start */
(()=>{
  'use strict';
  if(window.__msStartStatus8264)return;
  window.__msStartStatus8264=true;

  const BUILD='8.26.4';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@809eb784d177823052e64a94cb86b45ce6235853/start-dashboard-71510.js';
  const STYLE_ID='ms8264StartStatusStyle';
  const WEATHER_REFRESH_MS=5*60*1000;

  let weatherBusy=false;
  let lastWeatherRefresh=0;
  let lastOutsideTemperature=null;
  let syncTimer=0;

  const $=id=>document.getElementById(id);
  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const number=Number(String(value).replace(',','.'));
    return Number.isFinite(number)?number:null;
  };
  const numberFromText=value=>{
    const match=String(value??'').trim().replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const fmtTemp=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`;
  const fmtOutside=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})}°`;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=$('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function installStyle(){
    if($(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start .ms8264-engine-gauge .ms8234-ring{--ring:#ff8a68!important}
      #ms8210Start .ms8264-engine-gauge .ms8234-gauge-copy strong.is-missing{font-size:11px!important;color:#8fa6b6!important}
      @media(min-width:721px){
        #ms8210Start .ms8234-gauges:has(.ms8264-engine-gauge){grid-template-columns:repeat(5,minmax(0,1fr))!important}
      }
      @media(max-width:720px){
        #ms8210Start .ms8234-gauges:has(.ms8264-engine-gauge){grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #ms8210Start .ms8264-engine-gauge:last-child{grid-column:1/-1;max-width:50%;width:100%;justify-self:center}
      }
      @media(max-width:390px){
        #ms8210Start .ms8264-engine-gauge:last-child{max-width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function goTechnical(){
    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate('technical');
        return;
      }
      document.querySelector('.tabs [data-target="technical"]')?.click();
    }catch(error){console.debug('Motorruimte openen:',error)}
  }

  function ensureEngineGauge(){
    const gauges=document.querySelector('#ms8210Start .ms8234-gauges');
    const cabin=$('ms8234Cabin')?.closest('.ms8234-gauge');
    if(!gauges||!cabin)return false;

    let engine=$('ms8264EngineTemp')?.closest('.ms8234-gauge');
    if(!engine){
      engine=cabin.cloneNode(true);
      engine.classList.add('ms8264-engine-gauge');
      engine.dataset.ms8264Engine='1';
      engine.dataset.ms8210Target='technical';
      engine.setAttribute('aria-label','Motorruimte temperatuur');

      const ring=engine.querySelector('.ms8234-ring');
      const strong=engine.querySelector('.ms8234-gauge-copy strong');
      const small=engine.querySelector('.ms8234-gauge-copy small');
      const em=engine.querySelector('.ms8234-gauge-copy em');
      if(ring)ring.id='ms8264EngineRing';
      if(strong){strong.id='ms8264EngineTemp';strong.textContent='– °C'}
      if(small)small.textContent='Motorruimte';
      if(em){em.id='ms8264EngineSub';em.textContent='Ruuvi · Machinekamer'}

      engine.addEventListener('click',goTechnical);
      cabin.insertAdjacentElement('afterend',engine);
    }
    return true;
  }

  function readClimate(){
    let climate=null;
    try{
      if(typeof window.ms7102GetRuuviClimate==='function')climate=window.ms7102GetRuuviClimate();
    }catch{}

    const vrm=window.MIJSERENITY_VRM_DATA||{};
    const salon=climate?.salon||{};
    const machine=climate?.forward||climate?.machinekamer||{};
    return {
      salon:finite(salon.temperature)
        ??finite(vrm.salon?.temperature)
        ??numberFromText($('ivmsCabinTemp')?.textContent)
        ??numberFromText($('mgSalonTemp')?.textContent),
      machine:finite(machine.temperature)
        ??finite(vrm.machinekamer?.temperature)
        ??finite(vrm.forward?.temperature)
        ??numberFromText($('ivmsForwardTemp')?.textContent)
        ??numberFromText($('mgMachineTemp')?.textContent)
    };
  }

  function renderTemperature(id,ringId,value){
    const node=$(id);
    if(!node)return;
    const missing=value===null;
    const text=missing?'Geen meting':fmtTemp(value);
    if(node.textContent!==text)node.textContent=text;
    node.classList.toggle('is-missing',missing);
    const ring=$(ringId);
    if(ring)ring.style.setProperty('--pct',String(missing?0:clamp((value/40)*100,0,100)));
  }

  function renderClimate(){
    ensureEngineGauge();
    const climate=readClimate();
    if(climate.salon!==null)renderTemperature('ms8234Cabin','ms8234CabinRing',climate.salon);
    renderTemperature('ms8264EngineTemp','ms8264EngineRing',climate.machine);
  }

  function readOutsideTemperature(detail){
    const event=detail&&typeof detail==='object'?detail:{};
    const weather=window.weatherState&&typeof window.weatherState==='object'?window.weatherState:{};
    const live=window.liveNavState?.weather||{};
    const candidates=[
      event.temperature,event.temperature_2m,event.current?.temperature,event.current?.temperature_2m,event.current_weather?.temperature,
      weather.temperature,weather.temperature_2m,weather.current?.temperature,weather.current?.temperature_2m,weather.current_weather?.temperature,
      live.temperature,live.temperature_2m,live.current?.temperature,live.current?.temperature_2m,
      numberFromText($('ms709WeatherTemp')?.textContent),
      numberFromText($('weatherCurrentTemp')?.textContent),
      numberFromText($('mgOutTemp')?.textContent),
      numberFromText($('ivmsOutsideTemp')?.textContent),
      numberFromText($('currentWeatherTemp')?.textContent),
      lastOutsideTemperature
    ];
    for(const candidate of candidates){
      const value=finite(candidate);
      if(value!==null&&value>-80&&value<65)return value;
    }
    return null;
  }

  function outsideDescription(){
    const ids=['ms709WeatherDescription','weatherCurrentDescription','currentWeatherDescription','ms709WeatherCondition','weatherCondition'];
    for(const id of ids){
      const text=String($(id)?.textContent||'').trim();
      if(text&&!/^(?:–|-|—|weer laden…|geen data|onbekend)$/i.test(text))return text;
    }
    return '';
  }

  function renderOutside(detail){
    const value=readOutsideTemperature(detail);
    const node=$('ms8234Outside');
    if(!node)return null;
    if(value===null){
      if(lastOutsideTemperature===null){
        node.textContent='Weer laden…';
        node.classList.add('is-missing');
        node.closest('.ms8234-status')?.classList.add('is-missing');
      }
      return null;
    }

    lastOutsideTemperature=value;
    const text=fmtOutside(value);
    if(node.textContent!==text)node.textContent=text;
    node.classList.remove('is-missing');
    node.closest('.ms8234-status')?.classList.remove('is-missing');

    const sub=$('ms8245OutsideSub');
    const description=outsideDescription();
    if(sub&&description){sub.textContent=description;sub.hidden=false}
    return value;
  }

  function coordsFromState(){
    const state=window.liveNavState||{};
    const weather=window.weatherState||{};
    const options=[
      {lat:finite(state.currentLat),lon:finite(state.currentLon)},
      {lat:finite(state.lat),lon:finite(state.lon??state.lng)},
      {lat:finite(weather.latitude),lon:finite(weather.longitude)}
    ];
    const points=Array.isArray(state.points)?state.points:[];
    const last=points.length?points[points.length-1]:null;
    if(last)options.push({lat:finite(last.lat),lon:finite(last.lon??last.lng)});
    return options.find(item=>item.lat!==null&&item.lon!==null&&Math.abs(item.lat)<=90&&Math.abs(item.lon)<=180)||null;
  }

  function geolocationOnce(){
    return new Promise(resolve=>{
      if(!navigator.geolocation){resolve(null);return}
      try{
        navigator.geolocation.getCurrentPosition(
          position=>resolve({lat:finite(position?.coords?.latitude),lon:finite(position?.coords?.longitude)}),
          ()=>resolve(null),
          {enableHighAccuracy:false,maximumAge:60000,timeout:8000}
        );
      }catch{resolve(null)}
    });
  }

  async function directWeatherFallback(){
    let coords=coordsFromState();
    if(!coords)coords=await geolocationOnce();
    if(!coords||coords.lat===null||coords.lon===null)return null;

    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',String(coords.lat));
    url.searchParams.set('longitude',String(coords.lon));
    url.searchParams.set('current','temperature_2m');
    url.searchParams.set('timezone','auto');

    const response=await fetch(url.toString(),{cache:'no-store'});
    if(!response.ok)throw new Error(`Open-Meteo ${response.status}`);
    const data=await response.json();
    const value=finite(data?.current?.temperature_2m);
    if(value===null)return null;
    lastOutsideTemperature=value;
    return value;
  }

  async function refreshOutside(force=false){
    renderOutside();
    if(weatherBusy)return;
    const now=Date.now();
    if(!force&&now-lastWeatherRefresh<WEATHER_REFRESH_MS)return;
    weatherBusy=true;
    lastWeatherRefresh=now;

    try{
      if(typeof window.ms709RefreshWeather==='function'){
        try{await window.ms709RefreshWeather(Boolean(force),true)}catch(error){console.debug('Startweer via bestaande weerlaag:',error)}
      }
      if(renderOutside()===null){
        try{
          const direct=await directWeatherFallback();
          if(direct!==null)renderOutside({temperature:direct});
        }catch(error){console.debug('Startweer fallback:',error)}
      }
    }finally{
      weatherBusy=false;
      renderOutside();
    }
  }

  function shoreState(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const ac=live.ac||{};
    if(typeof ac.shoreConnected==='boolean')return ac.shoreConnected;

    const voltage=finite(ac.inputVoltage);
    if(voltage!==null){
      if(voltage>=180&&voltage<=280)return true;
      if(voltage<80)return false;
    }

    const ids=['liveShorePower','techShorePowerStatus','ivmsShorePower'];
    for(const id of ids){
      const text=String($(id)?.textContent||'').trim().toLowerCase();
      if(!text)continue;
      if(/niet aangesloten|niet verbonden|disconnected|offline|\buit\b|\boff\b|absent/.test(text))return false;
      if(/aangesloten|verbonden|connected|active|\baan\b|\bon\b|230\s*v/.test(text))return true;
    }
    return null;
  }

  function renderShore(){
    const node=$('ms8234Shore');
    if(!node)return;
    const state=shoreState();
    const connected=state===true;
    const text=connected?'Aangesloten':'Niet aangesloten';
    if(node.textContent!==text)node.textContent=text;
    node.classList.toggle('is-missing',state===null);
    node.closest('.ms8234-status')?.classList.toggle('is-missing',state===null);
    node.title=state===null?'Geen expliciete walstroommeting; er is geen aansluiting gedetecteerd.':'';
  }

  function sync(detail){
    syncBuild();
    installStyle();
    ensureEngineGauge();
    renderClimate();
    renderOutside(detail);
    renderShore();
  }

  function startFix(){
    syncBuild();
    installStyle();
    sync();

    [0,180,500,1100,2200,4500].forEach(ms=>setTimeout(()=>sync(),ms));
    setTimeout(()=>refreshOutside(true),650);

    ['mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-energy-live-updated',
     'mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:dashboard-ready',
     'mijnserenity:boot-complete','mijnserenity:start-requested','pageshow']
      .forEach(type=>window.addEventListener(type,event=>requestAnimationFrame(()=>sync(event.detail)),{passive:true}));

    ['weather:update','weather:updated','mijnserenity:weather-updated']
      .forEach(type=>window.addEventListener(type,event=>requestAnimationFrame(()=>sync(event.detail)),{passive:true}));

    window.addEventListener('online',()=>setTimeout(()=>refreshOutside(true),150),{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){sync();refreshOutside(false)}
    },{passive:true});

    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{
      if(document.hidden)return;
      sync();
      refreshOutside(false);
    },5000);

    console.info(`MijnSerenity ${BUILD}: buitenweer, walstroom en motorruimte live op Start.`);
  }

  function loadBase(){
    if(window.__msVriJonBrand8263){startFix();return}
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startFix;
    script.onerror=()=>{
      console.error('MijnSerenity 8.26.3 basis kon niet worden geladen.');
      startFix();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
