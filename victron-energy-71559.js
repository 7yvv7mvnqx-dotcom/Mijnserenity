/* MijnSerenity 7.20.0 — Serenity Victron Live + volledige VRM-stroompagina
   Gebruikt actuele VRM live-data als eerste bron en valt daarna terug op HA/diagnostiek/lokale data.
   De dashboardkaart opent een apart, live Victron-overzicht met energiestromen. */
(()=>{
  'use strict';
  if(window.__msVictronEnergy72000)return;
  window.__msVictronEnergy72000=true;

  const $=id=>document.getElementById(id);
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let liveBusy=false,lastLiveAttempt=0,renderFrame=0,refreshTimer=0,resizeTimer=0;

  const num=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const fmt=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`;
  const signed=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value)>0?'+':''}${fmt(value,digits,suffix)}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function states(){
    try{
      const list=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      return Array.isArray(list)?list.filter(e=>e&&!['unknown','unavailable','none',''].includes(String(e.state??'').toLowerCase())):[];
    }catch{return []}
  }
  function entityText(e){return `${e?.entity_id||''} ${e?.attributes?.friendly_name||''} ${e?.name||''}`.toLowerCase()}
  function entityUnit(e){return String(e?.attributes?.unit_of_measurement||'').toLowerCase()}
  function exact(ids){const list=states();for(const id of ids){const found=list.find(e=>e.entity_id===id);if(found)return found}return null}
  function findMetric(terms,unit='',exclude=[]){
    return states().map(e=>{
      const hay=entityText(e);let score=0;
      terms.forEach((term,index)=>{if(hay.includes(term))score+=60-index});
      if(unit&&entityUnit(e)===unit.toLowerCase())score+=15;
      if(exclude.some(term=>hay.includes(term)))score=-9999;
      return {e,score};
    }).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score)[0]?.e||null;
  }
  function metric(ids,terms,unit='',exclude=[]){const e=exact(ids)||findMetric(terms,unit,exclude);return e?num(e.state):null}
  function boolEntity(ids,terms){
    const e=exact(ids)||findMetric(terms,'',[]);if(!e)return null;
    const v=String(e.state??'').toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(v))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(v))return false;
    return null;
  }
  function technical(){try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:(typeof readTechnicalLocalState==='function'?readTechnicalLocalState()||{}:{})}catch{return {}}}
  function live(){
    const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!data||typeof data!=='object'||data.success===false)return {};
    const at=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(at)&&Date.now()-at>300000)return {};
    return data;
  }
  function safeStart(value){return finite(value)&&Number(value)>=9&&Number(value)<=16.8?Number(value):null}
  function firstFinite(...values){for(const value of values)if(finite(value))return Number(value);return null}

  function snapshot(){
    const t=technical();
    const diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const battery=diagnosis.battery||{},solarDiag=diagnosis.solar||{},acDiag=diagnosis.ac||{};
    const liveData=live();
    const liveBattery=liveData.battery||{},liveSolar=liveData.solar||{},liveStarter=liveData.starter||{},ac=liveData.ac||{};

    const soc=num(liveBattery.soc)
      ??metric(['sensor.vrm_state_of_charge'],['state of charge','smartshunt soc','battery soc'],'%')
      ??num(battery.soc?.value)??num(t.houseSoc);
    const voltage=num(liveBattery.voltage)
      ??metric(['sensor.vrm_voltage'],['vrm voltage','smartshunt voltage','house battery voltage','huishoudaccu spanning'],'v',['starter','startaccu','aux'])
      ??num(battery.voltage?.value)??num(t.houseVoltage);
    const current=num(liveBattery.current)
      ??metric(['sensor.vrm_current'],['vrm current','smartshunt current','battery current','accustroom'],'a',['starter','startaccu','aux'])
      ??num(battery.current?.value)??num(t.houseCurrent);
    const power=num(liveBattery.power)
      ??metric(['sensor.vrm_battery_power'],['vrm battery power','smartshunt power','battery power','accuvermogen'],'w',['solar','pv','mppt','charger'])
      ??num(battery.power?.value)??num(t.housePower)
      ??(finite(voltage)&&finite(current)?Number(voltage)*Number(current):null);
    const batteryTemp=num(liveBattery.temperature)
      ??metric(['sensor.vrm_battery_temperature','sensor.vrm_temperature'],['battery temperature','accutemperatuur','smartshunt temperature'],'°c',['solar','mppt','room','salon'])
      ??num(t.houseBatteryTemp);

    const solar=num(liveSolar.power)
      ??num(liveData.system?.solarPower)
      ??metric(['sensor.vrm_solar_charger_power','sensor.vrm_pv_power'],['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'w',['battery','load','voltage','current'])
      ??num(solarDiag.power?.value)??num(t.solarPower);

    const start=[num(liveBattery.starterVoltage),num(liveStarter.voltage),num(battery.starterVoltage?.value),
      metric(['sensor.vrm_starter_battery_voltage','sensor.vrm_start_battery_voltage','sensor.vrm_auxiliary_battery_voltage','sensor.vrm_aux_voltage'],['starter battery voltage','start battery voltage','startaccu spanning','aux voltage'],'v',['house','huishoud']),num(t.startVoltage)]
      .map(safeStart).find(v=>v!==null)??null;

    let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
    if(shore===null)shore=boolEntity(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected'],['shore power','walstroom','ac input connected','grid connected']);
    const shoreV=num(ac.inputVoltage)
      ??metric(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage'],['ac input voltage','shore voltage','walstroom spanning','grid voltage'],'v',['battery','dc','starter'])
      ??num(acDiag.inputVoltage)??num(t.shoreVoltage);
    const shorePower=num(ac.inputPower)
      ??metric(['sensor.vrm_ac_input_power','sensor.vrm_grid_power','sensor.vrm_shore_power'],['ac input power','grid power','shore power','walstroom vermogen'],'w',['battery','dc'])
      ??num(acDiag.inputPower)??num(t.shorePowerWatts);
    if(shore===null&&finite(shoreV)&&Number(shoreV)>=180&&Number(shoreV)<=280)shore=true;
    if(shore===null&&finite(shorePower)&&Math.abs(Number(shorePower))>2)shore=true;
    if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;

    const charger=num(ac.chargerPower)
      ??metric(['sensor.vrm_charger_power','sensor.vrm_ac_charger_power'],['charger power','acculader vermogen','lader vermogen'],'w',['solar','pv','mppt','inverter'])
      ??num(acDiag.chargerPower)??num(t.chargerPower);
    const inverter=num(ac.inverterPower)
      ??metric(['sensor.vrm_inverter_power','sensor.vrm_inverter_output_power'],['inverter power','omvormer vermogen'],'w',['solar','charger','lader'])
      ??num(acDiag.inverterPower)??num(t.inverterPower);
    const acLoad=num(ac.loadPower)
      ??num(ac.outputPower)
      ??metric(['sensor.vrm_ac_load_power','sensor.vrm_load_power','sensor.vrm_consumption_power'],['ac load power','load power','consumption power','verbruik vermogen'],'w',['solar','charger','battery','dc'])
      ??num(acDiag.loadPower)??num(t.loadPower);

    const alternator=num(liveData.alternator?.power)
      ??metric(['sensor.vrm_alternator_power','sensor.vrm_orion_power','sensor.orion_xs_power'],['alternator power','dynamo power','orion power','orion xs power','dc dc charger power'],'w',['solar','ac load'])
      ??num(t.alternatorPower)??num(t.dynamoPower)??num(t.orionPower);

    let dcLoad=metric(['sensor.vrm_dc_load_power','sensor.vrm_dc_system_power','sensor.vrm_dc_consumption_power'],['dc load power','dc system power','dc consumption power','dc verbruik'],'w',['battery','solar','charger','vebus'])
      ??num(t.dcLoadPower);
    if(!finite(dcLoad)){
      const available=(finite(solar)?Math.max(0,Number(solar)):0)+(finite(charger)?Math.max(0,Number(charger)):0)+(finite(alternator)?Math.max(0,Number(alternator)):0);
      if(available>0&&finite(power))dcLoad=Math.max(0,available-Number(power));
      else if(finite(power)&&Number(power)<-1&&!finite(acLoad))dcLoad=Math.abs(Number(power));
    }

    const load=firstFinite(acLoad,finite(power)&&Number(power)<0?Math.abs(Number(power)):null);
    const tanks=window.MIJSERENITY_TANK_LIVE||{};
    const fuel=num(tanks.fuel?.value)??num(tanks.fuel?.levelPct)??num(t.fuelPct);
    const water=num(tanks.water?.value)??num(tanks.water?.levelPct)??num(t.waterPct);
    const fuelCapacity=num(t.fuelCapacityLiters)??num(t.fuelCapacityL)??360;
    const fuelLiters=num(tanks.fuel?.remainingLiters)??num(t.fuelLiters)??(finite(fuel)&&finite(fuelCapacity)?Math.round(Number(fuelCapacity)*Number(fuel)/100):null);

    let climate=null;try{climate=typeof window.ms7102GetRuuviClimate==='function'?window.ms7102GetRuuviClimate():null}catch{}
    const vrmClimate=window.MIJSERENITY_VRM_DATA||{};
    const salon=climate?.salon||{},machine=climate?.forward||climate?.machinekamer||{};

    return {soc,voltage,current,power,batteryTemp,solar,start,shore,shoreV,shorePower,charger,inverter,acLoad,load,dcLoad:finite(dcLoad)?Math.abs(Number(dcLoad)):null,alternator,
      fuel,water,fuelLiters,salonTemp:num(salon.temperature)??num(vrmClimate.salon?.temperature),salonHum:num(salon.humidity)??num(vrmClimate.salon?.humidity),
      machineTemp:num(machine.temperature)??num(vrmClimate.machinekamer?.temperature)??num(vrmClimate.forward?.temperature),machineHum:num(machine.humidity)??num(vrmClimate.machinekamer?.humidity)??num(vrmClimate.forward?.humidity),
      sampledAt:liveData.sampledAt||t.liveTechnicalAt||t.liveTankSources?.updatedAt||''};
  }

  function dashboardMarkup(){return `
    <div id="msMarineGlass" data-ms-victron-live="7200" aria-label="Serenity Victron Live">
      <div class="mg-live-head"><div class="mg-brand"><span class="mg-boat" aria-hidden="true">🛥️</span><span class="mg-brand-copy"><strong>SERENITY</strong><small>Victron Live</small></span></div><span id="mgLivePill" class="mg-live-pill"><i></i> LIVE</span></div>
      <button type="button" id="mgOpenVictron" class="mg-open-victron" aria-label="Open volledig Victron overzicht">Open Victron overzicht <span>›</span></button>
      <div class="mg-main">
        <div class="mg-mini solar"><small>☀️ Zonne-energie</small><strong id="mgSolar">– W</strong><em>SmartSolar MPPT</em></div>
        <div class="mg-battery"><div id="mgSocRing" class="mg-ring"><div class="mg-ring-copy"><small>HUISHOUDACCU</small><strong><b id="mg7195Soc" style="font:inherit;color:inherit">–%</b></strong><b id="mgVolt">– V</b><em><span id="mgAmp">– A</span> · <span id="mgBatP">– W</span></em><span id="mgBatteryMode" class="mg-charge-pill">⚡ Live</span></div></div></div>
        <div class="mg-mini use"><small>💡 AC-verbruik</small><strong id="mg7195Load">– W</strong><em>230 V belastingen</em></div>
        <div class="mg-mini shore"><small>🔌 Walstroom</small><strong id="mg7195Shore">–</strong><em id="mg7195ShoreMeta">Cerbo / MultiPlus</em></div>
        <div class="mg-mini dc"><small>☷ DC-verbruik</small><strong id="mgDcLoad">– W</strong><em>12 V boordnet</em></div>
      </div>
      <div class="mg-three">
        <div class="mg-info-card start"><small><span class="mg-icon">🔋</span>Startaccu</small><strong id="mgStartVoltage">– V</strong><span id="mgStartState" class="state">Wachten op meting</span></div>
        <div class="mg-info-card fuel"><small><span class="mg-icon">⛽</span>Dieseltank</small><strong id="mg-fuel">–%</strong><em id="mg-fuel-l">– L</em><div class="mg-level-bar"><i id="mg-fuel-bar"></i></div></div>
        <div class="mg-info-card water"><small><span class="mg-icon">💧</span>Drinkwater</small><strong id="mg-water">–%</strong><em>Cerbo live</em><div class="mg-level-bar"><i id="mg-water-bar"></i></div></div>
      </div>
      <div class="mg-systems">
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">🔷</span><div><small>MultiPlus-II</small><strong id="mg7195MultiState">Stand-by</strong><em id="mgInv">– W</em></div></div></div>
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">⚡</span><div><small>Laadstatus</small><strong id="mg7195ChargeState">Lader uit</strong><em id="mgChg">– W</em></div></div></div>
        <div id="mgClimateMini" class="mg-climate-mini">
          <button type="button" data-go="technical"><small>🌡️ Machinekamer</small><span class="mg-climate-values"><strong id="mgMachineTemp">– °C</strong><b id="mgMachineRv">– % RV</b></span><em>Ruuvi · Machinekamer</em></button>
          <button type="button" data-go="technical"><small>🌡️ Salon</small><span class="mg-climate-values"><strong id="mgSalonTemp">– °C</strong><b id="mgSalonRv">– % RV</b></span><em>Ruuvi · Salon</em></button>
        </div>
      </div>
      <div id="mgFlow" class="mg-flow-card" data-dir="idle"><div class="mg-flow-node"><small>☀️ PV</small><strong id="mgPv">– W</strong></div><span class="mg-flow-arrow">→</span><div class="mg-flow-node"><small>🔋 Accu</small><strong id="mgNetPower">– W</strong></div><span class="mg-flow-arrow">→</span><div class="mg-flow-node"><small>💡 Verbruikers</small><strong id="mg7195LoadFlow">– W</strong></div></div>
      <div id="mgHiddenCompat" hidden><span id="mgSoc"></span><span id="mg7194Soc"></span><span id="mgLoad"></span><span id="mgLoadFlow"></span><span id="mg7194LoadFlow"></span><span id="mgShore"></span><span id="mgShoreMeta"></span><span id="mg7194Shore"></span><span id="mg7194ShoreMeta"></span><span id="mgMultiState"></span><span id="mg7194MultiState"></span><span id="mgChargeState"></span><span id="mg7194ChargeState"></span><span id="mgChg2"></span><span id="mgInv2"></span><span id="mg-waste"></span><span id="mg-waste-l"></span><i id="mg-waste-bar"></i></div>
      <div id="mgFoot" class="mg-foot"><i></i><span id="mgUpdated">Laatst bijgewerkt: wachten op Cerbo GX</span></div>
    </div>`}

  function injectPageStyle(){
    if($('msVictronPage7200Style'))return;
    const style=document.createElement('style');style.id='msVictronPage7200Style';
    style.textContent=`
      #msMarineGlass .mg-open-victron{display:flex;align-items:center;justify-content:space-between;width:100%;margin:0 0 10px;padding:10px 12px;border:1px solid rgba(51,169,239,.26);border-radius:13px;background:rgba(51,169,239,.08);color:#dff4ff;font:inherit;font-size:12px;font-weight:850;text-align:left;cursor:pointer}
      #msMarineGlass .mg-open-victron span{font-size:21px;line-height:.7;color:#49b9f5}
      #msVictronPage{--vp-bg:#06131f;--vp-panel:#0b1d2a;--vp-line:#2e86c1;--vp-text:#f5fbff;--vp-muted:#94aaba;--vp-green:#42d67d;--vp-blue:#3daef0;--vp-yellow:#f3c74e;--vp-orange:#ff9f43;--vp-red:#ff625c;position:fixed;inset:0;z-index:2147482000;overflow:auto;overscroll-behavior:contain;background:linear-gradient(180deg,#081a29 0,#06131f 55%,#05101a 100%);color:var(--vp-text);font-family:inherit;-webkit-overflow-scrolling:touch}
      #msVictronPage[hidden]{display:none!important}#msVictronPage *{box-sizing:border-box;min-width:0}
      #msVictronPage .msvp-top{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;border-bottom:1px solid rgba(91,174,222,.18);background:rgba(5,17,28,.92);backdrop-filter:blur(18px)}
      #msVictronPage .msvp-back,#msVictronPage .msvp-refresh{appearance:none;display:grid;place-items:center;width:42px;height:42px;margin:0;padding:0;border:1px solid rgba(99,183,229,.25);border-radius:12px;background:#0b2233;color:#fff;font:inherit;font-size:21px;cursor:pointer}
      #msVictronPage .msvp-title{text-align:center}#msVictronPage .msvp-title strong{display:block;font-size:16px;letter-spacing:.01em}#msVictronPage .msvp-title small{display:block;margin-top:2px;color:var(--vp-blue);font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
      #msVictronPage .msvp-shell{width:min(980px,100%);margin:0 auto;padding:14px 12px calc(28px + env(safe-area-inset-bottom))}
      #msVictronPage .msvp-statusbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;padding:0 2px;color:var(--vp-muted);font-size:10px}
      #msVictronPage .msvp-live{display:inline-flex;align-items:center;gap:6px;color:var(--vp-green);font-weight:900;letter-spacing:.07em}#msVictronPage .msvp-live:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--vp-green);box-shadow:0 0 10px rgba(66,214,125,.75)}#msVictronPage .msvp-live.offline{color:#8196a5}#msVictronPage .msvp-live.offline:before{background:#6c8291;box-shadow:none}
      #msVictronPage .msvp-flow{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(135px,.92fr) minmax(190px,1.16fr) minmax(135px,.92fr);grid-template-rows:repeat(3,minmax(118px,auto));grid-template-areas:'shore multi ac' 'solar battery dc' 'alt battery dc';gap:10px;min-height:410px;padding:12px;border:1px solid rgba(71,164,216,.28);border-radius:22px;background:radial-gradient(circle at 50% 50%,rgba(36,135,187,.09),transparent 42%),rgba(255,255,255,.012);overflow:hidden}
      #msVictronPage .msvp-lines{position:absolute;inset:0;z-index:0;width:100%;height:100%;pointer-events:none;overflow:visible}#msVictronPage .msvp-lines path{fill:none;stroke:rgba(62,154,209,.34);stroke-width:3;stroke-linecap:round;transition:stroke .25s,opacity .25s}#msVictronPage .msvp-lines path.active{stroke:#49b8f4;stroke-dasharray:8 10;animation:msvp-flow 1.15s linear infinite;filter:drop-shadow(0 0 4px rgba(73,184,244,.5))}#msVictronPage .msvp-lines path.charge{stroke:var(--vp-green)}@keyframes msvp-flow{to{stroke-dashoffset:-36}}
      #msVictronPage .msvp-card{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;min-height:108px;padding:12px;border:1px solid rgba(70,166,219,.45);border-radius:15px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));box-shadow:0 10px 28px rgba(0,0,0,.13)}
      #msVictronPage .msvp-card[data-node='shore']{grid-area:shore}#msVictronPage .msvp-card[data-node='solar']{grid-area:solar}#msVictronPage .msvp-card[data-node='alt']{grid-area:alt}#msVictronPage .msvp-card[data-node='multi']{grid-area:multi}#msVictronPage .msvp-card[data-node='battery']{grid-area:battery;align-items:center;text-align:center;background:linear-gradient(180deg,rgba(74,154,213,.66),rgba(46,110,166,.78));border-color:rgba(111,194,242,.72)}#msVictronPage .msvp-card[data-node='ac']{grid-area:ac}#msVictronPage .msvp-card[data-node='dc']{grid-area:dc}
      #msVictronPage .msvp-label{display:flex;align-items:center;gap:6px;color:#d9e6ee;font-size:10px;font-weight:800}#msVictronPage .msvp-value{display:block;margin-top:8px;font-size:27px;line-height:1;font-weight:400;letter-spacing:-.025em;white-space:nowrap}#msVictronPage .msvp-meta{display:block;margin-top:7px;color:var(--vp-muted);font-size:9px;line-height:1.3}#msVictronPage .msvp-card[data-node='battery'] .msvp-label,#msVictronPage .msvp-card[data-node='battery'] .msvp-meta{color:#dbeaf4}#msVictronPage .msvp-card[data-node='battery'] .msvp-value{font-size:46px;font-weight:500}#msVictronPage .msvp-bat-bottom{display:flex;gap:12px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.18);font-size:13px;white-space:nowrap}
      #msVictronPage .msvp-mode{display:inline-flex;align-self:flex-start;margin-top:7px;padding:5px 8px;border-radius:999px;background:rgba(66,214,125,.12);color:var(--vp-green);font-size:9px;font-weight:850}#msVictronPage .msvp-card[data-node='battery'] .msvp-mode{align-self:center;background:rgba(3,31,47,.22);color:#fff}
      #msVictronPage .msvp-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}#msVictronPage .msvp-detail{padding:12px;border:1px solid rgba(79,160,206,.22);border-radius:14px;background:rgba(255,255,255,.018)}#msVictronPage .msvp-detail small{display:block;color:var(--vp-muted);font-size:9px;font-weight:800;text-transform:uppercase}#msVictronPage .msvp-detail strong{display:block;margin-top:7px;font-size:16px}#msVictronPage .msvp-detail em{display:block;margin-top:5px;color:var(--vp-muted);font-size:9px;font-style:normal}
      #msVictronPage .msvp-note{margin:10px 2px 0;color:#728b9b;font-size:9px;line-height:1.35;text-align:center}
      body.ms-victron-page-open{overflow:hidden!important}
      @media(max-width:640px){#msVictronPage .msvp-shell{padding-left:7px;padding-right:7px}#msVictronPage .msvp-flow{grid-template-columns:minmax(0,.9fr) minmax(112px,1.1fr) minmax(0,.9fr);grid-template-rows:repeat(3,minmax(112px,auto));gap:6px;min-height:365px;padding:7px;border-radius:17px}#msVictronPage .msvp-card{min-height:101px;padding:9px 8px;border-radius:12px}#msVictronPage .msvp-label{gap:4px;font-size:8px;line-height:1.15}#msVictronPage .msvp-value{margin-top:7px;font-size:20px}#msVictronPage .msvp-meta{font-size:7.5px}#msVictronPage .msvp-card[data-node='battery'] .msvp-value{font-size:36px}#msVictronPage .msvp-bat-bottom{gap:7px;font-size:10px}#msVictronPage .msvp-mode{font-size:7.5px;padding:4px 6px}#msVictronPage .msvp-details{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#msVictronPage .msvp-detail:last-child{grid-column:1/-1}}
      @media(max-width:380px){#msVictronPage .msvp-flow{grid-template-columns:minmax(0,.9fr) minmax(105px,1.05fr) minmax(0,.9fr)}#msVictronPage .msvp-card{padding:8px 6px}#msVictronPage .msvp-value{font-size:18px}#msVictronPage .msvp-card[data-node='battery'] .msvp-value{font-size:32px}}
    `;document.head.appendChild(style);
  }

  function pageMarkup(){return `
    <div class="msvp-top">
      <button type="button" class="msvp-back" id="msvpBack" aria-label="Terug">‹</button>
      <div class="msvp-title"><strong>Victron Energie</strong><small>Serenity · VRM live</small></div>
      <button type="button" class="msvp-refresh" id="msvpRefresh" aria-label="Ververs">↻</button>
    </div>
    <main class="msvp-shell">
      <div class="msvp-statusbar"><span id="msvpLive" class="msvp-live">LIVE</span><span id="msvpUpdated">Wachten op Cerbo GX</span></div>
      <section id="msvpFlow" class="msvp-flow" aria-label="Actuele energiestromen">
        <svg class="msvp-lines" id="msvpLines" aria-hidden="true"><path id="msvpLineShore"></path><path id="msvpLineSolar"></path><path id="msvpLineAlt"></path><path id="msvpLineMultiBat"></path><path id="msvpLineAc"></path><path id="msvpLineDc"></path></svg>
        <article class="msvp-card" data-node="shore"><span class="msvp-label">◉ Walstroom</span><strong class="msvp-value" id="msvpShorePower">– W</strong><span class="msvp-meta" id="msvpShoreMeta">Niet gekoppeld</span></article>
        <article class="msvp-card" data-node="solar"><span class="msvp-label">☀︎ Zon opbrengst</span><strong class="msvp-value" id="msvpSolar">– W</strong><span class="msvp-meta" id="msvpSolarMeta">SmartSolar MPPT</span></article>
        <article class="msvp-card" data-node="alt"><span class="msvp-label">⚡ Dynamo / Orion</span><strong class="msvp-value" id="msvpAlt">– W</strong><span class="msvp-meta" id="msvpAltMeta">Motorlading</span></article>
        <article class="msvp-card" data-node="multi"><span class="msvp-label">▣ Omvormer / Lader</span><strong class="msvp-value" id="msvpMulti">Stand-by</strong><span class="msvp-mode" id="msvpChargeMode">Lader uit</span><span class="msvp-meta" id="msvpMultiPower">– W</span></article>
        <article class="msvp-card" data-node="battery"><span class="msvp-label">▣ Huishoudaccu</span><strong class="msvp-value" id="msvpSoc">–%</strong><span class="msvp-mode" id="msvpBatMode">Live</span><span class="msvp-bat-bottom"><span id="msvpVolt">– V</span><span id="msvpAmp">– A</span><span id="msvpBatPower">– W</span></span><span class="msvp-meta" id="msvpBatTemp">Temperatuur – °C</span></article>
        <article class="msvp-card" data-node="ac"><span class="msvp-label">≈ AC Belastingen</span><strong class="msvp-value" id="msvpAc">– W</strong><span class="msvp-meta">230 V boordnet</span></article>
        <article class="msvp-card" data-node="dc"><span class="msvp-label">≋ DC Belastingen</span><strong class="msvp-value" id="msvpDc">– W</strong><span class="msvp-meta">12 V boordnet</span></article>
      </section>
      <section class="msvp-details">
        <div class="msvp-detail"><small>Startaccu</small><strong id="msvpStart">– V</strong><em id="msvpStartState">Wachten</em></div>
        <div class="msvp-detail"><small>MultiPlus</small><strong id="msvpMultiDetail">Stand-by</strong><em id="msvpMultiDetailPower">– W</em></div>
        <div class="msvp-detail"><small>VRM bron</small><strong id="msvpSource">Cerbo GX</strong><em id="msvpSampleAge">Nog geen live meting</em></div>
      </section>
      <p class="msvp-note">Alleen waarden die werkelijk uit Victron VRM, Cerbo GX of gekoppelde sensoren komen worden getoond. Ontbrekende metingen blijven op –.</p>
    </main>`}

  function ensurePage(){
    injectPageStyle();let page=$('msVictronPage');if(page)return page;
    page=document.createElement('section');page.id='msVictronPage';page.hidden=true;page.setAttribute('aria-label','Victron Energie');page.innerHTML=pageMarkup();document.body.appendChild(page);
    $('msvpBack')?.addEventListener('click',closePage);$('msvpRefresh')?.addEventListener('click',async()=>{await refreshLive(true);queueRender()});
    return page;
  }
  function openPage(){const page=ensurePage();page.hidden=false;document.body.classList.add('ms-victron-page-open');page.scrollTop=0;queueRender();refreshLive(true)}
  function closePage(){const page=$('msVictronPage');if(page)page.hidden=true;document.body.classList.remove('ms-victron-page-open')}
  window.msOpenVictronPage=openPage;window.msCloseVictronPage=closePage;

  function findLegacyEnergyCard(){
    const root=$('dashboard');if(!root)return null;
    const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title')];
    const heading=headings.find(el=>/^energie\s*&\s*stroom$/i.test(String(el.textContent||'').trim()));if(!heading)return null;
    const preferred=heading.closest('.card,section,article');if(preferred&&preferred!==root)return preferred;
    let node=heading.parentElement;for(let depth=0;node&&node!==root&&depth<6;depth++,node=node.parentElement){const txt=String(node.innerText||node.textContent||'');if(/huishoudaccu|zonne|walstroom|startaccu/i.test(txt))return node}return null;
  }
  function locateHost(){const existing=$('msVictronEnergy');if(existing&&existing.querySelector('#msMarineGlass'))return existing;if(existing&&/^energie\s*&\s*stroom$/im.test(String(existing.innerText||existing.textContent||'')))return existing;return findLegacyEnergyCard()}
  function hideDiagnosis(){const direct=$('msVictronDiagnosis');if(direct){direct.hidden=true;direct.classList.add('ms-victron-legacy-hidden');direct.setAttribute('aria-hidden','true')}}
  function hideDuplicateTankSystems(){
    const root=$('dashboard');if(!root)return;const headings=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,.card-title,.section-title')];
    const heading=headings.find(el=>/^(tanks\s*&\s*systems|tanks?\s*&\s*systemen|tanks?\s+en\s+systemen)$/i.test(String(el.textContent||'').trim()));if(!heading)return;
    let card=heading.closest('.card,section,article');if(!card||card===root||card.id==='msVictronEnergy'||card.contains($('msMarineGlass'))){card=null;let node=heading.parentElement;for(let depth=0;node&&node!==root&&depth<6;depth++,node=node.parentElement){const txt=String(node.innerText||node.textContent||'');if(/drinkwater/i.test(txt)&&/dieseltank/i.test(txt)){card=node;break}}}
    if(card&&card!==root&&!card.contains($('msMarineGlass'))){card.hidden=true;card.classList.add('ms-victron-legacy-hidden');card.setAttribute('aria-hidden','true')}
  }
  function mount(){
    const host=locateHost();if(!host)return false;if(host.id!=='msVictronEnergy')host.id='msVictronEnergy';host.classList.add('ms-victron-live-host');
    ['height','min-height','max-height','aspect-ratio','align-self'].forEach((p,i)=>host.style.setProperty(p,['auto','0','none','auto','start'][i],'important'));
    if(!$('msMarineGlass')||$('msMarineGlass')?.dataset.msVictronLive!=='7200'||!host.contains($('msMarineGlass'))){host.innerHTML=dashboardMarkup()}
    $('mgOpenVictron')?.addEventListener('click',openPage);hideDiagnosis();hideDuplicateTankSystems();ensurePage();return true;
  }

  function startState(v){if(!finite(v))return ['Wachten op meting',''];if(v>=13.2)return ['Laden','good'];if(v>=12.2)return ['OK','good'];if(v>=12)return ['Laag','warn'];return ['Controleren','bad']}
  function multiState(s){if(finite(s.charger)&&Number(s.charger)>5)return ['Laden','Lader actief'];if(finite(s.inverter)&&Math.abs(Number(s.inverter))>5)return ['Omvormen','Omvormer actief'];if(s.shore===true)return ['Walstroom','MultiPlus verbonden'];return ['Stand-by','Lader uit']}
  function ageLabel(value){const at=Date.parse(String(value||''));if(!Number.isFinite(at))return 'nog geen live tijd';const sec=Math.max(0,Math.round((Date.now()-at)/1000));if(sec<5)return 'zojuist';if(sec<60)return `${sec} sec geleden`;return `${Math.round(sec/60)} min geleden`}
  function batteryColor(soc){if(!finite(soc))return '#6d8190';const n=Number(soc);return n>99?'#42d67d':n>=85?'#f3c74e':n>=40?'#ff9f43':'#ff625c'}

  function drawFlow(s){
    const flow=$('msvpFlow'),svg=$('msvpLines');if(!flow||!svg||$('msVictronPage')?.hidden)return;
    const fr=flow.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${Math.max(1,fr.width)} ${Math.max(1,fr.height)}`);
    const node=name=>flow.querySelector(`[data-node="${name}"]`);
    function point(el,target){const a=el?.getBoundingClientRect(),b=target?.getBoundingClientRect();if(!a||!b)return null;const acx=a.left+a.width/2,acy=a.top+a.height/2,bcx=b.left+b.width/2,bcy=b.top+b.height/2;let x=acx,y=acy;if(Math.abs(bcx-acx)>=Math.abs(bcy-acy)){x=bcx>acx?a.right:a.left}else{y=bcy>acy?a.bottom:a.top}return {x:x-fr.left,y:y-fr.top}}
    function path(id,from,to,active,charge=false){const p=$(id),a=node(from),b=node(to);if(!p||!a||!b)return;const p1=point(a,b),p2=point(b,a);if(!p1||!p2)return;const dx=Math.abs(p2.x-p1.x),dy=Math.abs(p2.y-p1.y);let d;if(dx>=dy){const mx=(p1.x+p2.x)/2;d=`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`}else{const my=(p1.y+p2.y)/2;d=`M ${p1.x} ${p1.y} C ${p1.x} ${my}, ${p2.x} ${my}, ${p2.x} ${p2.y}`}p.setAttribute('d',d);p.classList.toggle('active',Boolean(active));p.classList.toggle('charge',Boolean(charge))}
    path('msvpLineShore','shore','multi',s.shore===true&&finite(s.shorePower)&&Math.abs(Number(s.shorePower))>2);
    path('msvpLineSolar','solar','battery',finite(s.solar)&&Number(s.solar)>2,true);
    path('msvpLineAlt','alt','battery',finite(s.alternator)&&Number(s.alternator)>2,true);
    path('msvpLineMultiBat','multi','battery',finite(s.charger)&&Number(s.charger)>2,true);
    path('msvpLineAc','multi','ac',finite(s.acLoad)&&Number(s.acLoad)>2);
    path('msvpLineDc','battery','dc',finite(s.dcLoad)&&Number(s.dcLoad)>2);
  }

  function render(){
    if(!mount())return;const s=snapshot(),soc=finite(s.soc)?Math.max(0,Math.min(100,Number(s.soc))):null;
    set('mg7195Soc',finite(soc)?`${Math.round(soc)}%`:'–%');const ring=$('mgSocRing');if(ring){ring.style.setProperty('--p',finite(soc)?soc:0);ring.style.color=batteryColor(soc)}
    set('mgVolt',fmt(s.voltage,2,' V'));set('mgAmp',signed(s.current,2,' A'));set('mgBatP',signed(s.power,0,' W'));set('mgSolar',fmt(s.solar,0,' W'));set('mgPv',fmt(s.solar,0,' W'));
    set('mg7195Load',fmt(s.acLoad,0,' W'));set('mg7195LoadFlow',fmt(s.acLoad,0,' W'));set('mgDcLoad',fmt(s.dcLoad,0,' W'));set('mgNetPower',signed(s.power,0,' W'));
    set('mg7195Shore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
    set('mg7195ShoreMeta',s.shore===true?(finite(s.shorePower)?`${fmt(s.shorePower,0,' W')} · ${fmt(s.shoreV,0,' V')}`:fmt(s.shoreV,0,' V')):s.shore===false?'Geen walspanning':'Cerbo / MultiPlus-data ontbreekt');
    const [startLabel,startClass]=startState(s.start);set('mgStartVoltage',fmt(s.start,2,' V'));set('mgStartState',startLabel);const start=$('mgStartState');if(start)start.className=`state ${startClass}`.trim();
    set('mg-fuel',finite(s.fuel)?`${Math.round(Number(s.fuel))}%`:'–%');set('mg-fuel-l',fmt(s.fuelLiters,0,' L'));const fuelBar=$('mg-fuel-bar');if(fuelBar)fuelBar.style.width=`${finite(s.fuel)?Math.max(0,Math.min(100,Number(s.fuel))):0}%`;
    set('mg-water',finite(s.water)?`${Math.round(Number(s.water))}%`:'–%');const waterBar=$('mg-water-bar');if(waterBar)waterBar.style.width=`${finite(s.water)?Math.max(0,Math.min(100,Number(s.water))):0}%`;
    const [multi,charge]=multiState(s);set('mg7195MultiState',multi);set('mg7195ChargeState',charge);set('mgInv',fmt(s.inverter,0,' W'));set('mgChg',fmt(s.charger,0,' W'));set('mgInv2',fmt(s.inverter,0,' W'));set('mgChg2',fmt(s.charger,0,' W'));
    set('mgSalonTemp',fmt(s.salonTemp,1,' °C'));set('mgSalonRv',fmt(s.salonHum,0,'% RV'));set('mgMachineTemp',fmt(s.machineTemp,1,' °C'));set('mgMachineRv',fmt(s.machineHum,0,'% RV'));
    const mode=$('mgBatteryMode');if(mode)mode.textContent=finite(s.power)&&Number(s.power)>10?'⚡ Laden':finite(s.power)&&Number(s.power)<-10?'⚡ Ontladen':'⚡ Live';const flow=$('mgFlow');if(flow)flow.dataset.dir=!finite(s.power)?'idle':Number(s.power)>10?'in':Number(s.power)<-10?'out':'idle';
    const at=Date.parse(String(s.sampledAt||'')),fresh=Number.isFinite(at)?Date.now()-at<300000:Boolean(window.MIJSERENITY_VRM_LIVE_ENERGY)||states().length>0;const pill=$('mgLivePill');if(pill)pill.classList.toggle('offline',!fresh);const foot=$('mgFoot');if(foot)foot.classList.toggle('offline',!fresh);set('mgUpdated',fresh?`Cerbo GX live · ${ageLabel(s.sampledAt)}`:'Wachten op Cerbo GX live-data');

    const page=ensurePage();if(!page.hidden){
      set('msvpShorePower',fmt(s.shorePower,0,' W'));set('msvpShoreMeta',s.shore===true?`${fmt(s.shoreV,0,' V')} · aangesloten`:s.shore===false?'Niet aangesloten':'Walstroomstatus onbekend');
      set('msvpSolar',fmt(s.solar,0,' W'));set('msvpSolarMeta',finite(s.solar)?'SmartSolar MPPT live':'MPPT-meting ontbreekt');set('msvpAlt',fmt(s.alternator,0,' W'));set('msvpAltMeta',finite(s.alternator)?'Dynamo / Orion live':'Nog geen Dynamo/Orion-vermogenssensor');
      set('msvpMulti',multi);set('msvpChargeMode',charge);set('msvpMultiPower',finite(s.charger)&&Number(s.charger)>2?`${fmt(s.charger,0,' W')} naar DC`:finite(s.inverter)&&Number(s.inverter)>2?`${fmt(s.inverter,0,' W')} naar AC`:s.shore===true?'Walstroom actief':'Geen vermogensoverdracht');
      set('msvpSoc',finite(soc)?`${Math.round(soc)}%`:'–%');set('msvpVolt',fmt(s.voltage,2,' V'));set('msvpAmp',signed(s.current,1,' A'));set('msvpBatPower',signed(s.power,0,' W'));set('msvpBatTemp',`Temperatuur ${fmt(s.batteryTemp,0,' °C')}`);set('msvpBatMode',finite(s.power)&&Number(s.power)>10?'Opladen':finite(s.power)&&Number(s.power)<-10?'Ontladen':'Rust / vol');
      const bat=$('msvpSoc');if(bat)bat.style.color=batteryColor(soc);set('msvpAc',fmt(s.acLoad,0,' W'));set('msvpDc',fmt(s.dcLoad,0,' W'));set('msvpStart',fmt(s.start,2,' V'));set('msvpStartState',startLabel);set('msvpMultiDetail',multi);set('msvpMultiDetailPower',finite(s.charger)&&Number(s.charger)>2?`Lader ${fmt(s.charger,0,' W')}`:finite(s.inverter)&&Number(s.inverter)>2?`Omvormer ${fmt(s.inverter,0,' W')}`:'Stand-by');set('msvpSampleAge',fresh?ageLabel(s.sampledAt):'Geen verse VRM-meting');
      const lp=$('msvpLive');if(lp)lp.classList.toggle('offline',!fresh);set('msvpUpdated',fresh?`Cerbo GX · ${ageLabel(s.sampledAt)}`:'Offline / wachten');setTimeout(()=>drawFlow(s),0);
    }
  }
  function queueRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}

  function token(){for(const key of TOKEN_KEYS){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}try{const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}return ''}
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  async function refreshLive(force=false){
    if(liveBusy)return false;if(!force&&Date.now()-lastLiveAttempt<55000)return false;const supabase=client(),activeBoat=boat(),activeUser=user(),vrmToken=token();if(!supabase||!activeBoat?.id||!activeUser||!vrmToken)return false;
    liveBusy=true;lastLiveAttempt=Date.now();try{const {data,error}=await supabase.functions.invoke('victron-energy-live',{body:{boatId:activeBoat.id},headers:{'x-vrm-token':vrmToken}});if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');window.MIJSERENITY_VRM_LIVE_ENERGY=data;window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));queueRender();return true}catch(error){console.warn('Victron live energie kon niet worden vernieuwd:',error);return false}finally{liveBusy=false}
  }

  const events=['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated','mijnserenity:dashboard-ready','mijnserenity:routechange'];events.forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLive(false)}},{passive:true});window.addEventListener('focus',()=>{queueRender();refreshLive(false)},{passive:true});window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(queueRender,120)},{passive:true});
  document.addEventListener('click',event=>{const btn=event.target.closest?.('#msMarineGlass [data-go="technical"]');if(btn&&typeof window.captainNavigate==='function'){closePage();window.captainNavigate('technical')}},{passive:true});

  function boot(){ensurePage();queueRender();setTimeout(queueRender,500);setTimeout(queueRender,1800);setTimeout(queueRender,4500);setTimeout(()=>refreshLive(true),1200);refreshTimer=setInterval(()=>{if(!document.hidden){queueRender();refreshLive(false)}},60000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
