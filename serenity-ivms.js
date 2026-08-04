/* MijnSerenity 7.9.6 — live Serenity IVMS startdashboard */
(()=>{
  'use strict';

  const $=id=>document.getElementById(id);
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
  const finite=value=>Number.isFinite(Number(value));
  const nl=(value,digits=0)=>finite(value)?Number(value).toLocaleString('nl-NL',{maximumFractionDigits:digits,minimumFractionDigits:0}):'–';
  let lastWeatherRequest=0;
  let lastHaRequest=0;

  function technicalState(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState();
    }catch{}
    return {};
  }

  function liveState(){
    try{return typeof liveNavState!=='undefined'&&liveNavState?liveNavState:{}}catch{return {}}
  }

  function weatherPayload(){
    try{
      if(typeof ms709WeatherPayload!=='undefined'&&ms709WeatherPayload)return ms709WeatherPayload;
      if(typeof ms709ReadWeatherCache==='function')return ms709ReadWeatherCache();
    }catch{}
    return null;
  }

  function haStates(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}catch{return []}
  }

  function scoreEntity(entity,terms,unit=''){
    const text=`${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase();
    let score=0;
    terms.forEach((term,index)=>{
      const value=String(term).toLowerCase();
      if(text.includes(value))score+=30-index;
    });
    if(unit&&String(entity?.attributes?.unit_of_measurement||'').toLowerCase()===unit.toLowerCase())score+=8;
    if(['unknown','unavailable','none',''].includes(String(entity?.state||'').toLowerCase()))score-=100;
    return score;
  }

  function findHa(terms,unit=''){
    return haStates()
      .map(entity=>({entity,score:scoreEntity(entity,terms,unit)}))
      .filter(item=>item.score>0&&finite(item.entity.state))
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function findHaBinary(terms){
    return haStates()
      .map(entity=>({entity,score:scoreEntity(entity,terms)}))
      .filter(item=>item.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function exactHa(entityId){
    return haStates().find(entity=>entity?.entity_id===entityId&&!['unknown','unavailable','none',''].includes(String(entity?.state||'').toLowerCase()))||null;
  }

  function timeToGoLabel(hours){
    if(!finite(hours)||Number(hours)<0)return '–';
    const total=Math.round(Number(hours));
    const days=Math.floor(total/24);
    const rest=total%24;
    return days>0?`${days}d ${rest}u`:`${rest}u`;
  }

  function setText(id,value){const el=$(id);if(el)el.textContent=value}
  function setRing(id,value,level='good'){
    const ring=$(id);if(!ring)return;
    const pct=finite(value)?clamp(value):0;
    ring.style.setProperty('--value',String(pct));
    ring.classList.remove('good','warning','critical');
    ring.classList.add(level);
    const label=ring.querySelector('strong');
    if(label)label.textContent=finite(value)?`${Math.round(pct)}%`:'–%';
  }

  function levelForPercent(value,{lowIsBad=true,warn=25,critical=12}={}){
    if(!finite(value))return 'good';
    const number=Number(value);
    if(lowIsBad){
      if(number<=critical)return 'critical';
      if(number<=warn)return 'warning';
    }else{
      if(number>=critical)return 'critical';
      if(number>=warn)return 'warning';
    }
    return 'good';
  }

  function estimateBatteryPct(voltage,type='lead'){
    const v=Number(voltage);
    if(!Number.isFinite(v)||v<=0)return null;
    const points=type==='lithium'
      ?[[11.8,0],[12.3,8],[12.8,20],[13.0,40],[13.2,70],[13.35,90],[13.5,100]]
      :[[11.8,0],[12.0,20],[12.2,40],[12.4,60],[12.6,80],[12.75,100]];
    if(v<=points[0][0])return 0;
    if(v>=points.at(-1)[0])return 100;
    for(let i=1;i<points.length;i+=1){
      if(v<=points[i][0]){
        const [v1,p1]=points[i-1];
        const [v2,p2]=points[i];
        return p1+(v-v1)*(p2-p1)/(v2-v1);
      }
    }
    return null;
  }

  function compass(degrees){
    if(!finite(degrees))return '–';
    const dirs=['N','NO','O','ZO','Z','ZW','W','NW'];
    return dirs[Math.round((((Number(degrees)%360)+360)%360)/45)%8];
  }

  function weatherIcon(code,isDay=1){
    try{if(typeof ms709WeatherSymbol==='function')return ms709WeatherSymbol(code,isDay)}catch{}
    const value=Number(code);
    if(value===0)return Number(isDay)===0?'☾':'☀';
    if([1,2].includes(value))return '⛅';
    if(value===3)return '☁';
    if([61,63,65,80,81,82].includes(value))return '🌧';
    if([95,96,99].includes(value))return '⛈';
    return '◌';
  }

  function weatherDescription(code){
    try{if(typeof weatherCodeDescription==='function')return weatherCodeDescription(code)}catch{}
    return Number(code)===0?'Helder':'Actueel weer';
  }

  function peopleKey(){
    let boat='serenity';
    try{boat=currentBoat?.id||currentBoat?.name||boat}catch{}
    return `mijnserenity-ivms-people-${boat}`;
  }
  function peopleOnboard(){
    const value=Number(localStorage.getItem(peopleKey()));
    return Number.isInteger(value)&&value>=0?value:2;
  }

  window.ivmsSetPeopleOnboard=()=>{
    const current=peopleOnboard();
    const value=prompt('Hoeveel personen zijn nu aan boord?',String(current));
    if(value===null)return;
    const number=Math.max(0,Math.min(20,Math.round(Number(value))));
    if(!Number.isFinite(number))return;
    localStorage.setItem(peopleKey(),String(number));
    update();
  };

  function updateClock(){
    const now=new Date();
    setText('ivmsTime',now.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}));
    setText('ivmsDate',now.toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase());
  }

  function updatePhoto(){
    const target=$('ivmsBoatPhoto');
    const source=$('dashboardBoatPhoto');
    const hero=$('ivmsHero');
    if(!target||!source||!hero)return;
    const src=source.currentSrc||source.src||'';
    const usable=Boolean(
      src&&
      !source.classList.contains('hidden')&&
      source.complete&&
      source.naturalWidth>0
    );
    if(!usable){
      target.removeAttribute('src');
      target.classList.add('hidden');
      hero.classList.remove('has-photo');
      return;
    }
    if(target.src!==src){
      target.onload=()=>{
        target.classList.remove('hidden');
        hero.classList.add('has-photo');
      };
      target.onerror=()=>{
        target.removeAttribute('src');
        target.classList.add('hidden');
        hero.classList.remove('has-photo');
      };
      target.src=src;
    }else if(target.complete&&target.naturalWidth>0){
      target.classList.remove('hidden');
      hero.classList.add('has-photo');
    }
  }

  function updateWeather(payload,live){
    const current=payload?.current||{};
    const liveWeather=live.weather||{};
    const temperature=finite(current.temperature_2m)?Number(current.temperature_2m):Number(liveWeather.temperature);
    const wind=finite(current.wind_speed_10m)?Number(current.wind_speed_10m):Number(liveWeather.windSpeed);
    const gust=finite(current.wind_gusts_10m)?Number(current.wind_gusts_10m):Number(liveWeather.windGusts);
    const code=finite(current.weather_code)?Number(current.weather_code):Number(liveWeather.weatherCode);
    const direction=finite(current.wind_direction_10m)?Number(current.wind_direction_10m):null;

    setText('ivmsOutsideTemp',finite(temperature)?`${nl(temperature,1)} °C`:'– °C');
    setText('ivmsWeatherTemp',finite(temperature)?`${Math.round(temperature)}°`:'–°');
    setText('ivmsWeatherDescription',finite(code)?weatherDescription(code):'Wachten op weer');
    setText('ivmsWindValue',finite(wind)?`${Math.max(0,Math.round(wind))}`:'–');
    setText('ivmsWindUnit',finite(wind)?`${typeof windKmhToBeaufort==='function'?windKmhToBeaufort(wind):'–'} Bft`:'Bft');
    setText('ivmsWeatherWind',finite(wind)?`Wind ${Math.round(wind)} km/u${finite(direction)?` ${compass(direction)}`:''}`:'Wind –');
    setText('ivmsWeatherRain',finite(payload?.hourly?.precipitation_probability?.[typeof ms709CurrentHourlyIndex==='function'?ms709CurrentHourlyIndex(payload):0])
      ?`Regen ${Math.round(Number(payload.hourly.precipitation_probability[typeof ms709CurrentHourlyIndex==='function'?ms709CurrentHourlyIndex(payload):0]))}%`
      :finite(gust)?`Windstoten ${Math.round(gust)} km/u`:'Regen –');

    const hourly=$('ivmsHourly');
    if(!hourly)return;
    const times=payload?.hourly?.time||[];
    if(!times.length){
      hourly.innerHTML='<div><time>NU</time><b>'+weatherIcon(code,current.is_day)+'</b><span>'+(finite(temperature)?Math.round(temperature)+'°':'–')+'</span></div>';
      return;
    }
    let start=0;
    try{start=typeof ms709CurrentHourlyIndex==='function'?ms709CurrentHourlyIndex(payload):0}catch{}
    const indexes=[0,3,6,9,12].map(offset=>Math.min(start+offset,times.length-1));
    hourly.innerHTML=indexes.map(index=>{
      const time=new Date(times[index]);
      const temp=payload.hourly.temperature_2m?.[index];
      return `<div><time>${time.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}</time><b>${weatherIcon(payload.hourly.weather_code?.[index],payload.hourly.is_day?.[index])}</b><span>${finite(temp)?Math.round(Number(temp))+'°':'–'}</span></div>`;
    }).join('');
  }

  function update(){
    const state=technicalState();
    const live=liveState();
    const payload=weatherPayload();
    const haSoc=exactHa('sensor.vrm_state_of_charge')||findHa(['state of charge','battery soc','accu percentage','battery percentage','smartshunt soc','soc'],'%');
    const haVoltage=exactHa('sensor.vrm_voltage')||findHa(['vrm voltage','smartshunt voltage','battery voltage','accuspanning','accu spanning','house battery voltage'],'V');
    const haCurrent=exactHa('sensor.vrm_current')||findHa(['vrm current','battery current','accustroom','accu stroom'],'A');
    const haBatteryPower=exactHa('sensor.vrm_battery_power')||findHa(['vrm battery power','battery power','accuvermogen','accu vermogen'],'W');
    const haTimeToGo=exactHa('sensor.vrm_time_to_go')||findHa(['time to go','resterende tijd','battery runtime'],'h');
    const haSolar=exactHa('sensor.vrm_solar_charger_power')||exactHa('sensor.vrm_pv_power')||findHa(['pv power','solar charger power','solar power','mppt power','zonnepaneel vermogen'],'W');
    const haCabin=findHa(['salon temperature','cabine temperatuur','cabin temperature','inside temperature','interieur temperatuur'],'°C');
    const haShorePower=findHaBinary(['shore power','walstroom','ac input connected','grid connected']);
    const haShoreVoltage=findHa(['shore voltage','walstroom spanning','ac input voltage','grid voltage'],'V');
    const haShoreFrequency=findHa(['shore frequency','walstroom frequentie','ac input frequency','grid frequency'],'Hz');
    const haBilge=findHaBinary(['bilge','bilgepomp','hoog water','high water']);

    const fuelPct=finite(state.fuelPct)?Number(state.fuelPct):null;
    const fuelCapacity=Number(state.fuelCapacity||(()=>{try{return settingsCache?.tank_capacity}catch{return 0}})()||0);
    const fuelLiters=fuelPct!==null&&fuelCapacity>0?fuelCapacity*fuelPct/100:null;
    setText('ivmsFuelLiters',fuelLiters!==null?`${nl(fuelLiters,0)} L`:fuelPct!==null?`${Math.round(fuelPct)}%`:'– L');
    setText('ivmsFuelCapacity',fuelCapacity>0?`van ${nl(fuelCapacity,0)} L`:'tankniveau');
    setRing('ivmsFuelRing',fuelPct,levelForPercent(fuelPct));

    const waterPct=finite(state.waterPct)?Number(state.waterPct):null;
    setText('ivmsWaterValue',waterPct!==null?`${Math.round(waterPct)}%`:'–%');
    setText('ivmsWaterMeta',waterPct!==null?'resterend':'nog niet gemeten');
    setRing('ivmsWaterRing',waterPct,levelForPercent(waterPct));

    const voltage=finite(haVoltage?.state)?Number(haVoltage.state):(finite(state.houseVoltage)?Number(state.houseVoltage):null);
    const batteryPct=finite(haSoc?.state)?Number(haSoc.state):estimateBatteryPct(voltage,state.batteryType||'lead');
    setText('ivmsBatteryVoltage',voltage!==null?`${nl(voltage,2)} V`:'– V');
    setText('ivmsBatteryMeta',haSoc||haVoltage?'Victron live':voltage!==null?'schatting op spanning':'nog geen meting');
    setText('ivmsBatteryCurrent',finite(haCurrent?.state)?`${nl(haCurrent.state,2)} A`:'– A');
    setText('ivmsBatteryPower',finite(haBatteryPower?.state)?`${nl(haBatteryPower.state,0)} W`:'– W');
    setText('ivmsBatteryTime',finite(haTimeToGo?.state)?timeToGoLabel(haTimeToGo.state):'–');
    setRing('ivmsBatteryRing',batteryPct,levelForPercent(batteryPct));

    const speed=finite(live.speedKmh)?Number(live.speedKmh):0;
    const heading=finite(live.headingDeg)?Number(live.headingDeg):null;
    setText('ivmsSpeed',nl(speed,1));
    setText('ivmsSpeedKn',`${nl(speed/1.852,1)} kn`);
    setText('ivmsHeading',heading!==null?`${Math.round(heading).toString().padStart(3,'0')}°`:'–°');
    setText('ivmsHeadingDir',heading!==null?compass(heading):'–');
    setText('ivmsDepth','–');
    setText('ivmsDepthUnit','nog niet gekoppeld');

    const shoreRaw=String(haShorePower?.state||'').toLowerCase();
    const shore=haShorePower?['on','connected','true','1','yes'].includes(shoreRaw):Boolean(state.shorePower);
    const shoreVoltage=finite(haShoreVoltage?.state)?Number(haShoreVoltage.state):null;
    const shoreFrequency=finite(haShoreFrequency?.state)?Number(haShoreFrequency.state):null;
    setText('ivmsPowerSource',shore?'WALSTROOM':'ACCU');
    setText('ivmsPowerVoltage',shoreVoltage!==null?`${nl(shoreVoltage,0)} V`:'– V');
    setText('ivmsPowerFrequency',shoreFrequency!==null?`${nl(shoreFrequency,1)} Hz`:'– Hz');
    setText('ivmsPowerStatus',shore?(shoreVoltage!==null?'NORMAAL':'AANGESLOTEN'):'BOORDNET');
    $('ivmsShoreDetails')?.classList.toggle('hidden',!shore);

    const solar=finite(haSolar?.state)?Number(haSolar.state):null;
    setText('ivmsSolarPower',solar!==null?`${nl(solar,0)} W`:'– W');
    setText('ivmsSolarBattery',solar!==null?(solar>0?'LADEN':'STANDBY'):'NIET GEKOPPELD');

    const cabinTemp=finite(haCabin?.state)?Number(haCabin.state):null;
    setText('ivmsCabinTemp',cabinTemp!==null?`${nl(cabinTemp,1)} °C`:'– °C');

    setText('ivmsPeople',String(peopleOnboard()));

    let bilgeState=String(state.bilge||'unknown');
    if(haBilge){
      const raw=String(haBilge.state||'').toLowerCase();
      bilgeState=['on','wet','detected','active','open'].includes(raw)?'alarm':'ok';
    }
    const bilgeGood=bilgeState==='ok'||bilgeState==='unknown';
    setText('ivmsBilgeStatus',bilgeGood?(bilgeState==='unknown'?'GEEN MELDING':'ALLES HELDER'):'CONTROLEER BILGE');
    setText('ivmsBilgeIcon',bilgeGood?'✓':'!');
    const bilgeText=$('ivmsBilgeStatus');
    bilgeText?.classList.toggle('critical',!bilgeGood);
    $('ivmsBilgeIcon')?.classList.toggle('critical',!bilgeGood);

    let health={level:'unknown',label:'Nog controleren'};
    let warnings=[];
    try{if(typeof technicalHealth==='function')health=technicalHealth();if(typeof technicalWarnings==='function')warnings=technicalWarnings()}catch{}
    const critical=warnings.filter(item=>item.level==='critical').length;
    const warning=warnings.filter(item=>item.level==='warning').length;
    const count=critical+warning;
    const system=$('ivmsSystemStatus');
    system?.classList.remove('warning','critical');
    const unknownHealth=health.level==='unknown';
    if(critical)system?.classList.add('critical');else if(warning||health.level==='warning'||unknownHealth)system?.classList.add('warning');
    setText('ivmsSystemLabel',critical?'ALARM':warning?'AANDACHT':unknownHealth?'CONTROLEREN':'NORMAAL');
    setText('ivmsAlarmCount',String(count));
    $('ivmsAlarmCount')?.classList.toggle('hidden',count===0);
    setText('ivmsSecurityStatus',critical?'DIRECT CONTROLEREN':warning?'AANDACHTSPUNTEN':unknownHealth?'NOG CONTROLEREN':'ALLES IN ORDE');
    const sec=$('ivmsSecurityStatus');sec?.classList.toggle('critical',critical>0);sec?.classList.toggle('warning',!critical&&(warning>0||unknownHealth));

    const point=Array.isArray(live.points)&&live.points.length?live.points.at(-1):null;
    if(point&&finite(point.lat)&&finite(point.lon)){
      setText('ivmsGpsLat',`${Math.abs(Number(point.lat)).toFixed(5)}° ${Number(point.lat)>=0?'N':'Z'}`);
      setText('ivmsGpsLon',`${Math.abs(Number(point.lon)).toFixed(5)}° ${Number(point.lon)>=0?'O':'W'}`);
      setText('ivmsGpsStatus','LIVE GPS');
    }else{
      setText('ivmsGpsLat','GPS nog niet actief');setText('ivmsGpsLon','Start Live varen');setText('ivmsGpsStatus','POSITIE');
    }

    const waste=finite(state.wastePct)?Number(state.wastePct):null;
    const setBar=(id,value)=>{const el=$(id);if(el)el.style.width=`${finite(value)?clamp(value):0}%`};
    setBar('ivmsTankFuelBar',fuelPct);setBar('ivmsTankWaterBar',waterPct);setBar('ivmsTankWasteBar',waste);
    setText('ivmsTankFuelValue',fuelPct!==null?`${Math.round(fuelPct)}%`:'–');
    setText('ivmsTankWaterValue',waterPct!==null?`${Math.round(waterPct)}%`:'–');
    setText('ivmsTankWasteValue',waste!==null?`${Math.round(waste)}%`:'–');

    updateWeather(payload,live);
    updatePhoto();
  }

  async function refreshSources(){
    const appVisible=!$('appView')?.classList.contains('hidden');
    if(!appVisible)return;
    const dashboardVisible=!$('dashboard')?.classList.contains('hidden');
    if(!dashboardVisible)return;

    const now=Date.now();
    if(now-lastWeatherRequest>5*60*1000){
      lastWeatherRequest=now;
      try{if(typeof ms709RefreshWeather==='function')ms709RefreshWeather(false)}catch{}
    }
    if(now-lastHaRequest>5*60*1000){
      lastHaRequest=now;
      try{
        if(typeof window.ms730HomeAssistantConnected==='function'&&window.ms730HomeAssistantConnected()&&typeof window.ms730RefreshStateSnapshot==='function'){
          await window.ms730RefreshStateSnapshot();
        }
      }catch{}
    }
    update();
  }

  function syncDashboardNavigation(){
    const active=!$('dashboard')?.classList.contains('hidden')&&!$('appView')?.classList.contains('hidden');
    document.body.classList.toggle('ivms-dashboard-active',active);
    document.querySelector('.bottom-nav')?.classList.toggle('ivms-dashboard-hidden',active);
    if(active)refreshSources();
  }

  function install(){
    updateClock();update();syncDashboardNavigation();refreshSources();
    setInterval(updateClock,1000);
    setInterval(update,3000);
    setInterval(refreshSources,60000);
    window.addEventListener('mijnserenity-ha-state-updated',update);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshSources()});
    const photo=$('dashboardBoatPhoto');
    if(photo)new MutationObserver(updatePhoto).observe(photo,{attributes:true,attributeFilter:['src','class']});
    const dashboard=$('dashboard');
    if(dashboard)new MutationObserver(syncDashboardNavigation).observe(dashboard,{attributes:true,attributeFilter:['class']});
    const appView=$('appView');
    if(appView)new MutationObserver(syncDashboardNavigation).observe(appView,{attributes:true,attributeFilter:['class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
