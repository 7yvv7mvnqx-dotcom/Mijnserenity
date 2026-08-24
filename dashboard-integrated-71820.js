/* MijnSerenity 7.18.21 — geïntegreerd live cockpit/startdashboard */
(()=>{
  'use strict';
  if(window.__msIntegratedDashboard71820)return;
  window.__msIntegratedDashboard71820=true;

  const BUILD='7.18.21';
  const $=id=>document.getElementById(id);
  const text=id=>($(id)?.textContent||'').trim();
  const number=value=>{
    if(value===null||value===undefined||value==='')return null;
    const match=String(value).replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const fmt=(value,digits=1)=>finite(value)?Number(value).toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:digits}):'–';
  const set=(id,value)=>{const el=$(id);if(el&&value!==undefined&&value!==null&&el.textContent!==String(value))el.textContent=String(value)};
  const setClass=(id,name,on)=>$(id)?.classList.toggle(name,Boolean(on));
  let stateCache=[];
  let lastHaRefresh=0;
  let frame=0;

  function go(page){
    if(typeof window.captainNavigate==='function')window.captainNavigate(page);
    else window.ms708GoToPage?.(page,true);
  }

  function stateSnapshot(){
    try{
      const list=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      if(Array.isArray(list)&&list.length)stateCache=list;
    }catch{}
    return stateCache;
  }

  function label(entity){
    return `${entity?.entity_id||''} ${entity?.name||''} ${entity?.attributes?.friendly_name||''}`.toLowerCase();
  }

  function exact(entityId){return stateSnapshot().find(entity=>entity?.entity_id===entityId)||null}
  function exactNumber(...ids){for(const id of ids){const entity=exact(id);if(finite(entity?.state))return Number(entity.state)}return null}
  function findEntity(pattern,domains=[]){
    const list=stateSnapshot();
    return list.find(entity=>(!domains.length||domains.includes(entity?.domain||String(entity?.entity_id||'').split('.')[0]))&&pattern.test(label(entity)))||null;
  }
  function findEntities(pattern,domains=[]){
    return stateSnapshot().filter(entity=>(!domains.length||domains.includes(entity?.domain||String(entity?.entity_id||'').split('.')[0]))&&pattern.test(label(entity)));
  }
  function entityNumber(pattern,domains=[]){
    const entity=findEntities(pattern,domains).find(item=>finite(item?.state));
    return entity?Number(entity.state):null;
  }
  function stateOn(entity){
    if(!entity)return null;
    const value=String(entity.state||'').trim().toLowerCase();
    if(['on','true','1','yes','aan','active','connected','charging','inverting','present','detected'].includes(value))return true;
    if(['off','false','0','no','uit','inactive','disconnected','idle','absent','clear'].includes(value))return false;
    return null;
  }

  function readNumber(ids){
    for(const id of ids){const value=number(text(id));if(value!==null)return value}
    return null;
  }
  function readText(ids,fallback='–'){
    for(const id of ids){const value=text(id);if(value&&!/^[-–](?:\s*(?:%|V|A|W|m|°C))?$/i.test(value))return value}
    return fallback;
  }

  function build(){
    const host=$('dashboard');
    if(!host)return false;
    host.classList.add('msi-active');
    ['ms71510Dashboard','serenityIvms','msMarineGlass','msMarineGlassMobile7182'].forEach(id=>$(id)?.style.setProperty('display','none','important'));
    if($('msIntegratedDashboard'))return true;

    const root=document.createElement('section');
    root.id='msIntegratedDashboard';
    root.setAttribute('aria-label','MijnSerenity live dashboard');
    root.innerHTML=`
      <header class="msi-top">
        <button class="msi-brand" type="button" data-go="dashboard">Mijn<span>Serenity</span></button>
        <div class="msi-top-center">
          <strong id="msiClock" class="msi-clock">--:--</strong>
          <button id="msiAlarmHead" class="msi-alarm-head" type="button" data-go="technical"><i>⚠</i><span><b id="msiAlarmTop">0</b> alarm actief</span></button>
        </div>
        <div class="msi-links">
          <span id="msiLivePill" class="msi-live-pill"><i></i><span id="msiLiveText">Wacht op live data</span></span>
          <button class="msi-menu" type="button" data-go="settings" aria-label="Instellingen">☰</button>
        </div>
      </header>

      <div class="msi-summary" aria-label="Belangrijkste systeemstatus">
        <button class="msi-summary-item" type="button" data-go="technical"><span class="msi-summary-icon">▣</span><span class="msi-summary-copy"><small>HH-accu</small><strong id="msiTopSoc">–%</strong><em id="msiTopBatteryMeta">Wacht op Victron</em></span></button>
        <button class="msi-summary-item" type="button" data-go="technical"><span class="msi-summary-icon sun">☀</span><span class="msi-summary-copy"><small>Zonnepaneel</small><strong id="msiTopSolar">– W</strong><em id="msiTopSolarMeta">Niet gemeten</em></span></button>
        <button id="msiTopShoreCard" class="msi-summary-item" type="button" data-go="technical"><span class="msi-summary-icon">⌁</span><span class="msi-summary-copy"><small>Walstroom</small><strong id="msiTopShore">–</strong><em id="msiTopShoreMeta">Status onbekend</em></span></button>
        <button class="msi-summary-item" type="button" data-control="inverter"><span class="msi-summary-icon">▱</span><span class="msi-summary-copy"><small>Omvormer</small><strong id="msiTopInv">–</strong><em id="msiTopInvMeta">Open bediening</em></span></button>
        <button id="msiTopAlarmCard" class="msi-summary-item" type="button" data-go="technical"><span class="msi-summary-icon alert">!</span><span class="msi-summary-copy"><small>Alarmen</small><strong id="msiTopAlarm">0 actief</strong><em id="msiTopAlarmMeta">Geen waarschuwingen</em></span></button>
      </div>

      <div class="msi-grid">
        <section class="msi-panel msi-batteries">
          <header class="msi-panel-head"><h2><span>▣</span>ACCU'S</h2><button type="button" data-go="technical">Details ›</button></header>
          <div class="msi-battery-wrap">
            <button class="msi-battery-card msi-house" type="button" data-go="technical">
              <div id="msiSocRing" class="msi-ring"><span><strong id="msiSoc">–%</strong><small>⚡</small></span></div>
              <div class="msi-house-stats"><small>HUISHOUDACCU</small><dl><dt>Spanning</dt><dd id="msiHouseV">– V</dd><dt>Stroom</dt><dd id="msiHouseA">– A</dd><dt>Vermogen</dt><dd id="msiHouseW">– W</dd><dt>Resterend</dt><dd id="msiHouseT" class="good">–</dd></dl></div>
            </button>
            <button id="msiStart1Card" class="msi-battery-card msi-start-card unknown" type="button" data-go="technical"><small>STARTACCU 1</small><span class="msi-start-icon">▰</span><strong id="msiStart1">– V</strong><em id="msiStart1Status">Niet gekoppeld</em></button>
            <button id="msiStart2Card" class="msi-battery-card msi-start-card unknown" type="button" data-go="technical"><small>STARTACCU 2</small><span class="msi-start-icon">▰</span><strong id="msiStart2">– V</strong><em id="msiStart2Status">Niet gekoppeld</em></button>
          </div>
        </section>

        <section class="msi-panel msi-tanks">
          <header class="msi-panel-head"><h2><span>◉</span>TANKS</h2><button type="button" data-go="technical">Alle tanks ›</button></header>
          <div class="msi-tank-wrap">
            <button class="msi-tank" type="button" data-go="technical"><small>💧 Drinkwater</small><span id="msiWaterGauge" class="msi-tank-gauge"><strong id="msiWater">–%</strong></span><em id="msiWaterMeta">Live niveau</em></button>
            <button class="msi-tank waste" type="button" data-go="technical"><small>◈ Zwartwater</small><span id="msiWasteGauge" class="msi-tank-gauge"><strong id="msiWaste">–%</strong></span><em id="msiWasteMeta">Live niveau</em></button>
            <button class="msi-tank fuel" type="button" data-go="technical"><small>⛽ Brandstof</small><span id="msiFuelGauge" class="msi-tank-gauge"><strong id="msiFuel">–%</strong></span><em id="msiFuelMeta">Live niveau</em></button>
          </div>
        </section>

        <section class="msi-panel msi-climate">
          <header class="msi-panel-head"><h2><span>⌁</span>OMGEVING</h2><button type="button" data-go="technical">Sensoren ›</button></header>
          <div class="msi-climate-wrap">
            <button class="msi-climate-card" type="button" data-go="technical"><small>🌡 Machinekamer</small><div class="msi-climate-values"><div class="msi-climate-metric"><strong id="msiMachineTemp">– °C</strong><div class="msi-thermo"><span id="msiMachineTempBar" class="msi-bar"><i></i></span><span class="msi-scale"><b>60</b><b>0</b><b>-20</b></span></div></div><div class="msi-climate-metric"><strong id="msiMachineHum">–% RH</strong><div class="msi-thermo"><span id="msiMachineHumBar" class="msi-bar hum"><i></i></span><span class="msi-scale"><b>100</b><b>50</b><b>0</b></span></div></div></div></button>
            <button class="msi-climate-card" type="button" data-go="technical"><small>🌡 Salon Serenity</small><div class="msi-climate-values"><div class="msi-climate-metric"><strong id="msiSalonTemp">– °C</strong><div class="msi-thermo"><span id="msiSalonTempBar" class="msi-bar"><i></i></span><span class="msi-scale"><b>40</b><b>15</b><b>-10</b></span></div></div><div class="msi-climate-metric"><strong id="msiSalonHum">–% RH</strong><div class="msi-thermo"><span id="msiSalonHumBar" class="msi-bar hum"><i></i></span><span class="msi-scale"><b>100</b><b>50</b><b>0</b></span></div></div></div></button>
          </div>
        </section>

        <section class="msi-panel msi-cockpit">
          <header class="msi-panel-head"><h2><span>◉</span>COCKPIT</h2><button type="button" data-go="live">Live varen ›</button></header>
          <div class="msi-cockpit-inner">
            <button class="msi-navmetric" type="button" data-go="live"><span id="msiSpeedRing" class="msi-speed-ring"><strong id="msiSpeed">–</strong></span><small>Snelheid</small><em id="msiSpeedUnit">kn</em></button>
            <button class="msi-navmetric" type="button" data-go="live"><span class="icon">≋</span><small>Diepte</small><strong id="msiDepth">– m</strong><em id="msiDepthMeta">sensor</em></button>
            <button class="msi-navmetric" type="button" data-go="live"><span class="icon">◈</span><small>Koers</small><strong id="msiHeading">–°</strong><em id="msiHeadingDir">–</em></button>
            <button class="msi-navmetric" type="button" data-go="live"><span class="icon">◴</span><small>Toerental</small><strong id="msiRpm">–</strong><em>RPM</em></button>
            <div class="msi-navmetric msi-route-mini"><span class="icon">⌖</span><small>GPS & Route</small><b id="msiRouteStatus">Geen actieve route</b><div class="msi-route-line"></div><button type="button" data-go="planner">Route plannen</button></div>
          </div>
        </section>

        <section class="msi-panel msi-controls">
          <header class="msi-panel-head"><h2><span>☷</span>BEDIENING</h2><button type="button" data-control="home">Home Assistant ›</button></header>
          <div class="msi-control-wrap">
            <button id="msiControlInverter" class="msi-control unavailable" type="button" data-control="inverter"><small>Omvormer</small><span class="ico">∿</span><strong id="msiInvState">–</strong><span class="msi-toggle"></span><span id="msiInvMode" class="mode">Status</span></button>
            <button id="msiControlCharger" class="msi-control unavailable" type="button" data-control="charger"><small>Lader</small><span class="ico">▣</span><strong id="msiChargerState">–</strong><span class="msi-toggle"></span><span id="msiChargerMode" class="mode">Status</span></button>
            <button id="msiControlShore" class="msi-control readonly unavailable" type="button" data-control="shore"><small>Walstroom</small><span class="ico">⌁</span><strong id="msiShoreState">–</strong><span class="msi-toggle"></span><span class="mode">Live status</span></button>
            <button id="msiControlLight" class="msi-control unavailable" type="button" data-control="light"><small>Verlichting</small><span class="ico">☼</span><strong id="msiLightState">–</strong><span class="msi-toggle"></span><span id="msiLightMode" class="mode">Home Assistant</span></button>
            <button id="msiControlPump" class="msi-control readonly unavailable" type="button" data-control="pump"><small>Pomp</small><span class="ico">◉</span><strong id="msiPumpState">–</strong><span class="msi-toggle"></span><span class="mode">Veilige status</span></button>
          </div>
        </section>

        <section class="msi-panel msi-messages">
          <header class="msi-panel-head"><h2><span>♢</span>BERICHTEN</h2><button type="button" data-go="technical"><span id="msiMessageBadge">0</span> actief ›</button></header>
          <div class="msi-message-wrap"><div id="msiMessage" class="msi-message" role="button" tabindex="0" data-go="technical"><span id="msiMessageIcon">✓</span><div><b id="msiMessageTitle">Geen actieve waarschuwingen</b><p id="msiMessageText">Serenity meldt op dit moment geen kritieke systeemstatus.</p><time id="msiMessageTime">Live controle</time></div></div></div>
        </section>
      </div>
      <footer class="msi-footnote"><span id="msiUpdated">Live waarden worden automatisch bijgewerkt.</span><button type="button" data-go="technical">Techniek & diagnostiek openen ›</button></footer>`;

    root.addEventListener('click',event=>{
      const goTarget=event.target.closest('[data-go]');
      if(goTarget){event.preventDefault();go(goTarget.dataset.go);return}
      const control=event.target.closest('[data-control]');
      if(control){event.preventDefault();handleControl(control.dataset.control)}
    });
    host.prepend(root);
    return true;
  }

  function sourceIsLive(){
    const states=stateSnapshot();
    if(states.length)return true;
    try{
      const climate=window.ms7102GetRuuviClimate?.();
      if(finite(climate?.salon?.temperature)||finite(climate?.forward?.temperature))return true;
    }catch{}
    return /victron live/i.test(text('ivmsBatteryMeta'))||finite(readNumber(['ivmsBatteryVoltage','techHouseVoltage']));
  }

  function houseData(){
    const soc=exactNumber('sensor.vrm_state_of_charge')??readNumber(['ivmsBatteryRing','techHouseSoc','ms71510HouseSoc']);
    const voltage=exactNumber('sensor.vrm_voltage')??readNumber(['ivmsBatteryVoltage','techHouseVoltage','ms71510HouseVoltage']);
    const current=exactNumber('sensor.vrm_current')??readNumber(['ivmsBatteryCurrent','techHouseCurrent','ms71510HouseCurrent']);
    const power=exactNumber('sensor.vrm_battery_power')??readNumber(['ivmsBatteryPower','techHousePower']);
    const t=exact('sensor.vrm_time_to_go');
    const time=(t&&String(t.state||'').trim()&&!['unknown','unavailable'].includes(String(t.state).toLowerCase()))?String(t.state):readText(['ivmsBatteryTime','techHouseTime'],'–');
    return {soc,voltage,current,power:power??(voltage!==null&&current!==null?voltage*current:null),time};
  }

  function individualStartVoltages(){
    const candidates=findEntities(/start\s*accu|startaccu|starter\s*battery|start\s*battery|startbatter/i,['sensor'])
      .filter(entity=>finite(entity.state)&&(String(entity?.attributes?.unit_of_measurement||'').toLowerCase()==='v'||/volt|spanning|voltage/.test(label(entity))));
    const unique=[];
    for(const entity of candidates.sort((a,b)=>label(a).localeCompare(label(b),'nl'))){
      const key=label(entity).replace(/spanning|voltage|volt/g,'').trim();
      if(unique.some(item=>item.key===key))continue;
      unique.push({key,value:Number(entity.state),entity});
    }
    if(unique.length)return unique.slice(0,2);
    const fallback=readNumber(['techStartVoltage','liveStartVoltage','ms71510StartVoltage']);
    return fallback!==null?[{key:'legacy',value:fallback,entity:null}]:[];
  }

  function startStatus(value){
    if(value===null)return {text:'Niet gekoppeld',kind:'unknown'};
    if(value<11.8)return {text:'Kritiek laag',kind:'critical'};
    if(value<12.2)return {text:'Laag',kind:'critical'};
    return {text:'OK',kind:'ok'};
  }

  function tankValue(kind){
    const patterns={water:/drinkwater|fresh\s*water|watertank|tank.*water/i,waste:/zwartwater|vuilwater|waste\s*water|black\s*water|holding\s*tank/i,fuel:/brandstof|diesel|fuel\s*tank|tank.*fuel/i};
    const entity=findEntities(patterns[kind],['sensor']).find(item=>finite(item.state)&&(String(item?.attributes?.unit_of_measurement||'').includes('%')||Number(item.state)>=0&&Number(item.state)<=100));
    if(entity)return clamp(Number(entity.state),0,100);
    const ids={water:['ivmsWaterValue','ivmsWaterRing','techWaterPct'],waste:['ivmsWasteValue','ivmsWasteRing','techWastePct'],fuel:['ivmsTankFuelValue','ivmsFuelRing','techFuelPct']}[kind];
    const value=readNumber(ids);
    return value===null?null:clamp(value,0,100);
  }

  function climateData(){
    let ruuvi=null;
    try{ruuvi=window.ms7102GetRuuviClimate?.()||null}catch{}
    const machine=ruuvi?.forward||ruuvi?.machine||null;
    const salon=ruuvi?.salon||null;
    return {
      machineTemp:finite(machine?.temperature)?Number(machine.temperature):entityNumber(/machinekamer.*temperatuur|machine.*temp|engine.*room.*temp/i,['sensor']),
      machineHum:finite(machine?.humidity)?Number(machine.humidity):entityNumber(/machinekamer.*vocht|machine.*humidity|engine.*room.*humidity/i,['sensor']),
      salonTemp:finite(salon?.temperature)?Number(salon.temperature):entityNumber(/salon.*temperatuur|salon.*temp/i,['sensor']),
      salonHum:finite(salon?.humidity)?Number(salon.humidity):entityNumber(/salon.*vocht|salon.*humidity/i,['sensor'])
    };
  }

  function cockpitData(){
    const speedKn=readNumber(['liveSpeedKn','ivmsSpeedKn','ms71510SpeedKn'])??entityNumber(/speed.*knot|snelheid.*kn|gps.*speed/i,['sensor']);
    const speedKmh=readNumber(['liveSpeed','ivmsSpeed','ms71510Speed'])??entityNumber(/speed.*km|snelheid.*km/i,['sensor']);
    const speed=speedKn??(speedKmh!==null?speedKmh/1.852:null);
    const depth=readNumber(['liveDepth','ivmsDepth','ms71510Depth'])??entityNumber(/diepte|depth/i,['sensor']);
    const heading=readNumber(['liveHeading','ivmsHeading'])??entityNumber(/heading|course|koers/i,['sensor']);
    const rpm=readNumber(['liveRpm','ivmsRpm','ms71510Rpm'])??entityNumber(/rpm|toerental/i,['sensor']);
    return {speed,depth,heading,rpm};
  }

  function cardinal(degrees){
    if(!finite(degrees))return '–';
    const dirs=['N','NO','O','ZO','Z','ZW','W','NW'];
    return dirs[Math.round((Number(degrees)%360)/45)%8];
  }

  function solarPower(){
    return exactNumber('sensor.vrm_solar_power')??entityNumber(/solar.*power|pv.*power|zonne.*vermogen/i,['sensor'])??readNumber(['ivmsSolarPower','techSolarPower','ms71510SolarPower']);
  }

  function shoreEntity(){return findEntity(/walstroom|shore.*power|shore.*connected|ac.*input/i,['binary_sensor','sensor','switch'])}
  function inverterEntity(){return findEntity(/omvormer|inverter/i,['switch','sensor'])}
  function chargerEntity(){return findEntity(/acculader|charger|lader/i,['switch','sensor'])}
  function lightEntity(){return findEntity(/salon.*light|salon.*lamp|verlichting|lighting/i,['light','switch'])}
  function pumpEntity(){return findEntity(/water.*pump|drukpomp|pomp/i,['switch','binary_sensor','sensor'])}

  function sync(){
    frame=0;
    if(!build())return;
    const house=houseData();
    const starts=individualStartVoltages();
    const live=sourceIsLive();
    const solar=solarPower();
    const shore=shoreEntity();
    const inverter=inverterEntity();
    const charger=chargerEntity();
    const light=lightEntity();
    const pump=pumpEntity();
    const climate=climateData();
    const cockpit=cockpitData();
    const water=tankValue('water'),waste=tankValue('waste'),fuel=tankValue('fuel');
    const shoreOn=stateOn(shore),invOn=stateOn(inverter),chargerOn=stateOn(charger),lightOn=stateOn(light),pumpOn=stateOn(pump);

    set('msiClock',new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}));
    set('msiLiveText',live?'Live data':'Wacht op live data');
    setClass('msiLivePill','live',live);

    set('msiTopSoc',house.soc!==null?`${fmt(house.soc,0)}%`:'–%');
    set('msiTopBatteryMeta',house.current!==null?`${house.current>=0?'Laden':'Verbruik'} ${fmt(Math.abs(house.current),1)} A`:'Wacht op Victron');
    set('msiTopSolar',solar!==null?`${fmt(solar,0)} W`:'– W');
    set('msiTopSolarMeta',solar!==null?(solar>5?'Opbrengst actief':'Geen opbrengst'):'Niet gemeten');
    set('msiTopShore',shoreOn===null?'–':shoreOn?'AAN':'UIT');
    set('msiTopShoreMeta',shoreOn===null?'Status onbekend':shoreOn?'Aangesloten':'Niet actief');
    set('msiTopInv',invOn===null?'–':invOn?'AAN':'UIT');
    set('msiTopInvMeta',inverter?label(inverter).replace(/^\S+\s*/,'').slice(0,28):'Open bediening');

    set('msiSoc',house.soc!==null?`${fmt(house.soc,0)}%`:'–%');
    $('msiSocRing')?.style.setProperty('--p',house.soc!==null?String(clamp(house.soc,0,100)):'0');
    set('msiHouseV',house.voltage!==null?`${fmt(house.voltage,2)} V`:'– V');
    set('msiHouseA',house.current!==null?`${fmt(house.current,1)} A`:'– A');
    set('msiHouseW',house.power!==null?`${fmt(house.power,0)} W`:'– W');
    set('msiHouseT',house.time||'–');

    [0,1].forEach(index=>{
      const value=starts[index]?.value??null;
      const status=startStatus(value);
      set(`msiStart${index+1}`,value!==null?`${fmt(value,2)} V`:'– V');
      set(`msiStart${index+1}Status`,status.text);
      const card=$(`msiStart${index+1}Card`);
      if(card){card.classList.remove('unknown','critical');if(status.kind!=='ok')card.classList.add(status.kind)}
    });

    [[water,'msiWater','msiWaterGauge'],[waste,'msiWaste','msiWasteGauge'],[fuel,'msiFuel','msiFuelGauge']].forEach(([value,id,gauge])=>{
      set(id,value!==null?`${fmt(value,0)}%`:'–%');
      $(gauge)?.style.setProperty('--p',value!==null?String(value):'0');
    });

    const climateItems=[
      ['msiMachineTemp',climate.machineTemp,' °C','msiMachineTempBar',-20,60],
      ['msiMachineHum',climate.machineHum,'% RH','msiMachineHumBar',0,100],
      ['msiSalonTemp',climate.salonTemp,' °C','msiSalonTempBar',-10,40],
      ['msiSalonHum',climate.salonHum,'% RH','msiSalonHumBar',0,100]
    ];
    climateItems.forEach(([id,value,unit,bar,min,max])=>{
      set(id,value!==null?`${fmt(value,1)}${unit}`:`–${unit}`);
      $(bar)?.style.setProperty('--p',value!==null?String(clamp((value-min)/(max-min)*100,0,100)):'0');
    });

    set('msiSpeed',cockpit.speed!==null?fmt(cockpit.speed,1):'–');
    $('msiSpeedRing')?.style.setProperty('--p',cockpit.speed!==null?String(clamp(cockpit.speed/15*100,0,100)):'0');
    set('msiDepth',cockpit.depth!==null?`${fmt(cockpit.depth,1)} m`:'– m');
    set('msiHeading',cockpit.heading!==null?`${fmt(cockpit.heading,0)}°`:'–°');
    set('msiHeadingDir',cardinal(cockpit.heading));
    set('msiRpm',cockpit.rpm!==null?fmt(cockpit.rpm,0):'–');

    const activeTrip=window.plannerCurrentPlan||window.msCurrentRoute||null;
    set('msiRouteStatus',activeTrip?'Route actief':'Geen actieve route');

    const controlData=[
      ['Inverter',inverter,invOn,'msiControlInverter','msiInvState','msiInvMode'],
      ['Charger',charger,chargerOn,'msiControlCharger','msiChargerState','msiChargerMode'],
      ['Light',light,lightOn,'msiControlLight','msiLightState','msiLightMode'],
      ['Shore',shore,shoreOn,'msiControlShore','msiShoreState',null],
      ['Pump',pump,pumpOn,'msiControlPump','msiPumpState',null]
    ];
    controlData.forEach(([name,entity,on,cardId,stateId,modeId])=>{
      const card=$(cardId);if(!card)return;
      card.classList.toggle('unavailable',!entity);
      card.classList.toggle('on',on===true);
      set(stateId,on===null?'–':on?'AAN':'UIT');
      if(modeId)set(modeId,entity?(entity.domain==='switch'||entity.domain==='light'?'Bedienbaar':'Status'):'Niet gekoppeld');
    });

    const alarmPatterns=/alarm|warning|fout|error|critical|low battery|undervoltage|overtemp|leak/i;
    const activeAlerts=stateSnapshot().filter(entity=>alarmPatterns.test(label(entity))&&stateOn(entity)===true);
    const criticalStart=starts.find(item=>item.value<11.8);
    const lowSoc=house.soc!==null&&house.soc<50;
    const messages=[];
    if(activeAlerts.length)messages.push(`${activeAlerts.length} Home Assistant waarschuwing${activeAlerts.length===1?'':'en'}`);
    if(criticalStart)messages.push('Startaccu kritisch laag');
    if(lowSoc)messages.push('Huishoudaccu onder 50%');
    const count=messages.length;
    set('msiTopAlarm',`${count} actief`);
    set('msiAlarmTop',String(count));
    set('msiMessageBadge',String(count));
    setClass('msiAlarmHead','active',count>0);
    setClass('msiTopAlarmCard','danger',count>0);
    setClass('msiMessage','alert',count>0);
    set('msiMessageIcon',count>0?'!':'✓');
    set('msiMessageTitle',count>0?messages[0]:'Geen actieve waarschuwingen');
    set('msiMessageText',count>0?messages.join(' · '):'Serenity meldt op dit moment geen kritieke systeemstatus.');
    set('msiTopAlarmMeta',count>0?messages[0]:'Geen waarschuwingen');
    set('msiMessageTime','Live controle');
    set('msiUpdated',`Bijgewerkt ${new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);
  }

  function queueSync(){if(frame)return;frame=requestAnimationFrame(sync)}

  async function refreshLive(){
    if(Date.now()-lastHaRefresh<5000)return;
    lastHaRefresh=Date.now();
    try{
      if(typeof window.ms730RefreshStateSnapshot==='function')await window.ms730RefreshStateSnapshot();
      stateSnapshot();
    }catch{}
    queueSync();
  }

  function openHomeAssistant(){
    if(typeof window.ms712OpenHomeAssistant==='function'){window.ms712OpenHomeAssistant();return}
    go('entertainment');
  }

  async function callHomeAssistant(entity,turnOn){
    const domain=entity?.domain||String(entity?.entity_id||'').split('.')[0];
    if(!entity?.entity_id||!['switch','light'].includes(domain))throw new Error('Deze functie is alleen als live status beschikbaar.');
    if(typeof window.ms730RefreshStateSnapshot==='function')await window.ms730RefreshStateSnapshot();
    let auth=null;
    try{auth=JSON.parse(localStorage.getItem('mijnserenity-ha-oauth-v733')||'null')}catch{}
    if(!auth?.baseUrl||!auth?.accessToken)throw new Error('Home Assistant is niet actief gekoppeld.');
    const response=await fetch(`${auth.baseUrl}/api/services/${domain}/${turnOn?'turn_on':'turn_off'}`,{
      method:'POST',headers:{Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({entity_id:entity.entity_id}),cache:'no-store'
    });
    if(!response.ok)throw new Error(`Bediening mislukt (${response.status}).`);
    await new Promise(resolve=>setTimeout(resolve,350));
    if(typeof window.ms730RefreshStateSnapshot==='function')await window.ms730RefreshStateSnapshot();
  }

  function controlEntity(key){
    if(key==='inverter')return inverterEntity();
    if(key==='charger')return chargerEntity();
    if(key==='light')return lightEntity();
    if(key==='shore')return shoreEntity();
    if(key==='pump')return pumpEntity();
    return null;
  }

  async function handleControl(key){
    if(key==='home'){openHomeAssistant();return}
    const entity=controlEntity(key);
    const domain=entity?.domain||String(entity?.entity_id||'').split('.')[0];
    const canToggle=entity&&['switch','light'].includes(domain)&&!['shore','pump'].includes(key);
    if(!canToggle){
      if(key==='shore'||key==='pump')go('technical');
      else openHomeAssistant();
      return;
    }
    const current=stateOn(entity);
    const next=current!==true;
    const names={inverter:'omvormer',charger:'lader',light:'verlichting'};
    if((key==='inverter'||key==='charger')&&!next){
      const ok=window.confirm(`Wil je de ${names[key]} uitschakelen?`);
      if(!ok)return;
    }
    try{
      const controlId={inverter:'msiControlInverter',charger:'msiControlCharger',light:'msiControlLight'}[key];
      $(controlId)?.classList.add('busy');
      await callHomeAssistant(entity,next);
      queueSync();
      if(typeof window.showAppToast==='function')window.showAppToast(`${names[key]} ${next?'aan':'uit'} ✅`);
    }catch(error){
      console.warn('Dashboardbediening:',error);
      if(typeof window.showAppToast==='function')window.showAppToast(error.message||'Bediening mislukt.');
      else window.alert(error.message||'Bediening mislukt.');
    }finally{
      ['msiControlInverter','msiControlCharger','msiControlLight'].forEach(id=>$(id)?.classList.remove('busy'));
    }
  }

  function install(){
    build();
    queueSync();
    const events=['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-ruuvi-config-updated','mijnserenity:routechange','mijnserenity:modules-ready'];
    events.forEach(name=>window.addEventListener(name,()=>{stateSnapshot();queueSync()},{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshLive();queueSync()}},{passive:true});
    window.addEventListener('online',refreshLive,{passive:true});
    setInterval(()=>{if(!document.hidden)queueSync()},1000);
    setInterval(()=>{if(!document.hidden)refreshLive()},60000);
    setTimeout(refreshLive,1200);
    setTimeout(refreshLive,6500);
    console.info(`MijnSerenity ${BUILD}: geïntegreerd dashboard actief.`);
  }

  window.ms71820RefreshDashboard=refreshLive;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
