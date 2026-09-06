/* MijnSerenity 8.26.5 — live startaccu Motor + Heckschroef op Start */
(()=>{
  'use strict';
  if(window.__msStartStatus8265)return;
  window.__msStartStatus8265=true;

  const BUILD='8.26.5';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@809eb784d177823052e64a94cb86b45ce6235853/start-dashboard-71510.js';
  const STYLE_ID='ms8265StartStatusStyle';
  const WEATHER_REFRESH_MS=5*60*1000;
  const BATTERY_REFRESH_MS=30*1000;
  const BATTERY_STALE_MS=15*60*1000;

  let weatherBusy=false;
  let lastWeatherRefresh=0;
  let lastOutsideTemperature=null;
  let syncTimer=0;
  let batteryBusy=false;
  let lastBatteryRefresh=0;
  let lastHaFreshAt=0;
  let lastVrmFreshAt=0;

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
  const fmtVoltage=value=>`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2})} V`;

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
    $('ms8264StartStatusStyle')?.remove();
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ms8210Start .ms8264-engine-gauge .ms8234-ring{--ring:#ff8a68!important}
      #ms8210Start .ms8264-engine-gauge .ms8234-gauge-copy strong.is-missing,
      #ms8210Start .ms8265-starter-gauge .ms8234-gauge-copy strong.is-missing{font-size:11px!important;color:#8fa6b6!important}
      #ms8210Start .ms8265-starter-gauge .ms8234-ring{--ring:#39c9f4!important}
      #ms8210Start .ms8265-starter-gauge[data-live="0"] .ms8234-ring{opacity:.55!important}
      #ms8210Start .ms8265-starter-gauge .ms8234-gauge-copy em{white-space:normal!important;line-height:1.15!important}
      @media(min-width:721px){
        #ms8210Start .ms8234-gauges:has(.ms8265-starter-gauge){grid-template-columns:repeat(4,minmax(0,1fr))!important}
      }
      @media(max-width:720px){
        #ms8210Start .ms8234-gauges:has(.ms8265-starter-gauge){grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #ms8210Start .ms8264-engine-gauge:last-child{grid-column:auto!important;max-width:none!important;width:100%!important;justify-self:stretch!important}
        #ms8210Start .ms8265-starter-gauge[data-battery="heck"]{grid-column:1/-1;max-width:50%;width:100%;justify-self:center}
      }
      @media(max-width:390px){
        #ms8210Start .ms8265-starter-gauge[data-battery="heck"]{max-width:100%}
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
    }catch(error){console.debug('Techniek openen:',error)}
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

  function ensureStarterGauge(kind,label,id){
    const gauges=document.querySelector('#ms8210Start .ms8234-gauges');
    const house=$('ms8234House')?.closest('.ms8234-gauge');
    if(!gauges||!house)return null;
    let gauge=$(id)?.closest('.ms8234-gauge');
    if(gauge)return gauge;

    gauge=house.cloneNode(true);
    gauge.classList.add('ms8265-starter-gauge');
    gauge.dataset.battery=kind;
    gauge.dataset.live='0';
    gauge.dataset.ms8210Target='technical';
    gauge.setAttribute('aria-label',label);

    const ring=gauge.querySelector('.ms8234-ring');
    const strong=gauge.querySelector('.ms8234-gauge-copy strong');
    const small=gauge.querySelector('.ms8234-gauge-copy small');
    const em=gauge.querySelector('.ms8234-gauge-copy em');
    if(ring){ring.id=`${id}Ring`;ring.style.setProperty('--pct','0')}
    if(strong){strong.id=id;strong.textContent='–';strong.classList.add('is-missing')}
    if(small)small.textContent=label;
    if(em){em.id=`${id}Sub`;em.textContent='Geen live meting'}
    gauge.addEventListener('click',goTechnical);
    gauges.appendChild(gauge);
    return gauge;
  }

  function ensureStarterGauges(){
    ensureStarterGauge('motor','Startaccu Motor','ms8265StartMotor');
    ensureStarterGauge('heck','Startaccu Heckschroef','ms8265StartHeck');
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

  function mirrorOutsideSource(value){
    if(value===null||value===undefined)return;
    const text=fmtOutside(value);
    const existing=$('ivmsOutsideTemp');
    if(existing&&existing.textContent!==text)existing.textContent=text;
    let source=$('weatherCurrentTemp');
    if(!source){
      source=document.createElement('span');
      source.id='weatherCurrentTemp';
      source.hidden=true;
      source.dataset.ms8264WeatherSource='1';
      (document.body||document.documentElement).appendChild(source);
    }
    if(source.textContent!==text)source.textContent=text;
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
    mirrorOutsideSource(value);
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

  function mirrorShoreSource(state){
    const text=state===true?'Aangesloten':'Niet aangesloten';
    let source=$('ivmsShorePower');
    if(!source){
      source=document.createElement('span');
      source.id='ivmsShorePower';
      source.hidden=true;
      source.dataset.ms8264ShoreSource='1';
      (document.body||document.documentElement).appendChild(source);
    }
    if(source.textContent!==text)source.textContent=text;
  }

  function renderShore(){
    const node=$('ms8234Shore');
    if(!node)return;
    const state=shoreState();
    const connected=state===true;
    mirrorShoreSource(state);
    const text=connected?'Aangesloten':'Niet aangesloten';
    if(node.textContent!==text)node.textContent=text;
    node.classList.toggle('is-missing',state===null);
    node.closest('.ms8234-status')?.classList.toggle('is-missing',state===null);
    node.title=state===null?'Geen expliciete walstroommeting; er is geen aansluiting gedetecteerd.':'';
  }

  function haStates(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return []}
  }

  function entityText(entity){
    return `${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase().replace(/[_-]+/g,' ');
  }

  function usableNumeric(entity){
    if(!entity)return false;
    const raw=String(entity.state??'').trim().toLowerCase();
    return !['','unknown','unavailable','none','null'].includes(raw)&&finite(entity.state)!==null;
  }

  function targetScore(text,kind){
    const heck=/heckschroef|hekschroef|hek\s*schroef|stern\s*thruster|stern\s*battery|heck\s*battery|hekaccu|heckaccu|hekschroefaccu/.test(text);
    const bow=/boegschroef|bow\s*thruster|boegaccu|bow\s*battery/.test(text);
    const start=/startaccu|start\s*accu|starter\s*battery|starterbattery|starter.*(?:voltage|spanning|soc)|engine\s*battery|motor\s*battery|startbattery/.test(text);
    if(kind==='heck')return heck?140:0;
    if(kind==='motor'){
      if(heck||bow)return -200;
      if(/startaccu\s*motor|motor\s*startaccu|motor.*starter|starter.*motor|engine.*starter/.test(text))return 180;
      return start?120:0;
    }
    return 0;
  }

  function findBatteryEntity(kind,metric){
    const unitWanted=metric==='soc'?'%':'v';
    const metricPattern=metric==='soc'
      ?/(?:\bsoc\b|state\s*of\s*charge|percentage|percent|lading|laadpercentage)/
      :/(?:voltage|spanning|\bvolt\b)/;
    return haStates()
      .filter(usableNumeric)
      .map(entity=>{
        const text=entityText(entity);
        const target=targetScore(text,kind);
        if(target<=0)return {entity,score:-999};
        const unit=String(entity.attributes?.unit_of_measurement||'').toLowerCase();
        let score=target;
        if(unit===unitWanted)score+=80;
        if(metricPattern.test(text))score+=65;
        if(metric==='voltage'&&finite(entity.state)!==null&&finite(entity.state)>=8&&finite(entity.state)<=16.5)score+=20;
        if(metric==='soc'&&finite(entity.state)!==null&&finite(entity.state)>=0&&finite(entity.state)<=100)score+=20;
        if(metric==='soc'&&unit==='v')score-=180;
        if(metric==='voltage'&&unit==='%')score-=180;
        return {entity,score};
      })
      .filter(item=>item.score>=160)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function estimatedSocFromVoltage(voltage){
    const value=finite(voltage);
    if(value===null||value<8||value>16)return null;
    if(value>=12.73)return 100;
    if(value<=11.50)return 0;
    const points=[[11.50,10],[11.66,20],[11.81,30],[11.96,40],[12.10,50],[12.24,60],[12.37,70],[12.50,80],[12.62,90],[12.73,100]];
    for(let i=1;i<points.length;i++){
      const [v1,s1]=points[i-1],[v2,s2]=points[i];
      if(value<=v2){
        const raw=s1+((value-v1)/(v2-v1))*(s2-s1);
        return clamp(Math.round(raw/5)*5,0,100);
      }
    }
    return 100;
  }

  function metricValue(value){
    if(value&&typeof value==='object'){
      return finite(value.value)??finite(value.valueFloat)??finite(value.rawValue);
    }
    return finite(value);
  }

  function timestampValue(value){
    if(value===null||value===undefined||value==='')return 0;
    const number=Number(value);
    if(Number.isFinite(number)&&number>0)return number<1e12?number*1000:number;
    const parsed=new Date(value).getTime();
    return Number.isFinite(parsed)?parsed:0;
  }

  function vrmTimestamp(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const diagnostic=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const candidates=[
      live.sampledAt,live.updatedAt,live.timestamp,
      diagnostic.sampledAt,diagnostic.updatedAt,diagnostic.timestamp,
      window.MIJSERENITY_VRM_DATA?.sampledAt,window.MIJSERENITY_VRM_DATA?.updatedAt,
      lastVrmFreshAt
    ].map(timestampValue).filter(Boolean);
    return candidates.length?Math.max(...candidates):0;
  }

  function sourceFresh(at){
    return at>0&&Date.now()-at<=BATTERY_STALE_MS;
  }

  function readMotorVrmVoltage(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const diagnostic=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const values=[
      live.battery?.starterVoltage,
      live.starterVoltage,
      diagnostic.battery?.starterVoltage,
      diagnostic.starterVoltage
    ];
    for(const candidate of values){
      const value=metricValue(candidate);
      if(value!==null&&value>=8&&value<=16.5)return value;
    }
    return null;
  }

  function batterySnapshot(kind){
    const voltageEntity=findBatteryEntity(kind,'voltage');
    const socEntity=findBatteryEntity(kind,'soc');
    let voltage=finite(voltageEntity?.state);
    let soc=finite(socEntity?.state);
    let sourceAt=voltageEntity||socEntity?lastHaFreshAt:0;
    let source='Home Assistant';

    if(kind==='motor'&&voltage===null){
      const vrmVoltage=readMotorVrmVoltage();
      const vrmAt=vrmTimestamp();
      if(vrmVoltage!==null&&sourceFresh(vrmAt)){
        voltage=vrmVoltage;
        sourceAt=vrmAt;
        source='Cerbo / VRM';
      }
    }

    if(kind==='motor'&&voltage===null&&sourceFresh(lastVrmFreshAt)){
      const fallback=[
        numberFromText($('ms71510StartVoltage')?.textContent),
        numberFromText($('techStartVoltage')?.textContent),
        numberFromText($('liveStartVoltage')?.textContent),
        numberFromText($('mgStartV')?.textContent)
      ].find(value=>value!==null&&value>=8&&value<=16.5);
      if(fallback!==undefined){
        voltage=fallback;
        sourceAt=lastVrmFreshAt;
        source='Live techniek';
      }
    }

    if(sourceAt&&!sourceFresh(sourceAt)){
      voltage=null;
      soc=null;
    }

    if(soc!==null)soc=clamp(Math.round(soc),0,100);
    const ringPct=soc!==null?soc:estimatedSocFromVoltage(voltage);

    return {voltage,soc,ringPct,source,sourceAt,live:Boolean(sourceFresh(sourceAt)&&(voltage!==null||soc!==null))};
  }

  function renderStarterBattery(id,data){
    const gauge=$(id)?.closest('.ms8234-gauge');
    const strong=$(id);
    const sub=$(`${id}Sub`);
    const ring=$(`${id}Ring`);
    if(!gauge||!strong||!sub)return;

    gauge.dataset.live=data.live?'1':'0';
    strong.classList.toggle('is-missing',!data.live);
    if(!data.live){
      strong.textContent='Geen meting';
      sub.textContent='Geen actuele live waarde';
      if(ring)ring.style.setProperty('--pct','0');
      return;
    }

    const details=[];
    if(data.soc!==null){
      strong.textContent=`${data.soc}%`;
      if(data.voltage!==null)details.push(fmtVoltage(data.voltage));
      details.push('SOC gemeten');
    }else{
      strong.textContent=data.voltage===null?'–':fmtVoltage(data.voltage);
      details.push('Spanning live');
      details.push('SOC niet gemeten');
    }
    sub.textContent=details.join(' · ');
    sub.title=data.source;
    if(ring)ring.style.setProperty('--pct',String(data.ringPct??0));
  }

  function renderUpdatedAt(snapshots=[]){
    const node=$('ms8234Updated');
    if(!node)return;
    const sourceTimes=[
      ...snapshots.map(item=>item?.sourceAt||0),
      vrmTimestamp(),
      lastHaFreshAt
    ].filter(sourceFresh);
    if(!sourceTimes.length){
      node.textContent='Wachten op actuele gegevens';
      return;
    }
    const newest=new Date(Math.max(...sourceTimes));
    node.textContent=`Bijgewerkt ${newest.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
  }

  function renderStarterBatteries(){
    ensureStarterGauges();
    const motor=batterySnapshot('motor');
    const heck=batterySnapshot('heck');
    renderStarterBattery('ms8265StartMotor',motor);
    renderStarterBattery('ms8265StartHeck',heck);
    renderUpdatedAt([motor,heck]);
  }

  async function refreshBatteryData(force=false){
    const now=Date.now();
    if(batteryBusy||(!force&&now-lastBatteryRefresh<BATTERY_REFRESH_MS))return;
    lastBatteryRefresh=now;

    const connected=()=>{
      try{return typeof window.ms730HomeAssistantConnected==='function'&&window.ms730HomeAssistantConnected()}
      catch{return false}
    };

    if(typeof window.ms730RefreshStateSnapshot!=='function'||!connected()){
      renderStarterBatteries();
      return;
    }

    batteryBusy=true;
    try{
      await window.ms730RefreshStateSnapshot();
      lastHaFreshAt=Date.now();
    }catch(error){
      console.debug('Startaccu live gegevens verversen:',error);
    }finally{
      batteryBusy=false;
      renderStarterBatteries();
    }
  }

  function sync(detail){
    syncBuild();
    installStyle();
    ensureEngineGauge();
    ensureStarterGauges();
    renderClimate();
    renderOutside(detail);
    renderShore();
    renderStarterBatteries();
  }

  function protectBaseRefresh(){
    const original=window.ms8210RefreshStart;
    if(typeof original!=='function'||original.__ms8265Wrapped)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      requestAnimationFrame(()=>sync());
      return result;
    };
    wrapped.__ms8265Wrapped=true;
    window.ms8210RefreshStart=wrapped;
  }

  function markVrmFresh(){
    lastVrmFreshAt=Date.now();
    requestAnimationFrame(()=>sync());
  }

  function markHaFresh(){
    lastHaFreshAt=Date.now();
    requestAnimationFrame(()=>sync());
  }

  function startFix(){
    syncBuild();
    installStyle();
    protectBaseRefresh();
    sync();

    [0,180,500,1100,2200,4500].forEach(ms=>setTimeout(()=>sync(),ms));
    setTimeout(()=>refreshOutside(true),650);
    setTimeout(()=>refreshBatteryData(true),800);

    ['mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-energy-live-updated',
     'mijnserenity-vrm-diagnostics-updated']
      .forEach(type=>window.addEventListener(type,markVrmFresh,{passive:true}));

    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected']
      .forEach(type=>window.addEventListener(type,markHaFresh,{passive:true}));

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:start-requested','pageshow']
      .forEach(type=>window.addEventListener(type,event=>requestAnimationFrame(()=>sync(event.detail)),{passive:true}));

    ['weather:update','weather:updated','mijnserenity:weather-updated']
      .forEach(type=>window.addEventListener(type,event=>requestAnimationFrame(()=>sync(event.detail)),{passive:true}));

    window.addEventListener('online',()=>{
      setTimeout(()=>refreshOutside(true),150);
      setTimeout(()=>refreshBatteryData(true),300);
    },{passive:true});

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        sync();
        refreshOutside(false);
        refreshBatteryData(true);
      }
    },{passive:true});

    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{
      if(document.hidden)return;
      protectBaseRefresh();
      sync();
      refreshOutside(false);
      refreshBatteryData(false);
    },5000);

    console.info(`MijnSerenity ${BUILD}: Startaccu Motor en Heckschroef live op Start.`);
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
