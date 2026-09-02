/* MijnSerenity 8.20.8 — energiebronbrug voor Marine Glass.
   Gebruikt bestaande VRM/SmartShunt/Home Assistant waarden als fallback voor het energiedashboard.
   Er worden geen waarden verzonnen: alleen geldige live of reeds aanwezige metingen worden doorgezet. */
(()=>{
  'use strict';
  if(window.__msEnergyBridge8206)return;
  window.__msEnergyBridge8206=true;

  const $=id=>document.getElementById(id);
  const parse=value=>{
    if(value===null||value===undefined||value==='')return null;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    const match=String(value).trim().replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match&&Number.isFinite(Number(match[0]))?Number(match[0]):null;
  };
  const first=(...values)=>values.map(parse).find(value=>value!==null)??null;
  const text=id=>$(id)?.textContent||'';
  const validEntity=e=>e&&!['unknown','unavailable','none',''].includes(String(e.state||'').toLowerCase());

  function states(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return []}
  }
  function exact(id){return states().find(e=>e?.entity_id===id&&validEntity(e))||null}
  function findNumeric(terms,unit=''){
    return states().filter(validEntity).filter(e=>parse(e.state)!==null).map(e=>{
      const hay=`${e.entity_id||''} ${e.name||''}`.toLowerCase();
      let score=0;
      for(const [i,term] of terms.entries())if(hay.includes(term.toLowerCase()))score+=50-i;
      if(unit&&String(e.attributes?.unit_of_measurement||'').toLowerCase()===unit.toLowerCase())score+=15;
      if(/vrm|victron|cerbo|smartshunt|serenity/.test(hay))score+=12;
      return {e,score};
    }).filter(x=>x.score>=45).sort((a,b)=>b.score-a.score)[0]?.e||null;
  }
  function binary(entity){
    if(!entity)return null;
    const v=String(entity.state||'').trim().toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present'].includes(v))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent'].includes(v))return false;
    return null;
  }
  function technical(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
    }catch{}
    return {};
  }

  function collect(){
    const t=technical();
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const db=diag.battery||{}, ds=diag.solar||{};
    const socE=exact('sensor.vrm_state_of_charge')||findNumeric(['state of charge','smartshunt soc','battery soc','accu percentage','soc'],'%');
    const voltE=exact('sensor.vrm_voltage')||findNumeric(['smartshunt voltage','battery voltage','house battery voltage','accuspanning'],'V');
    const ampE=exact('sensor.vrm_current')||findNumeric(['smartshunt current','battery current','accustroom'],'A');
    const powerE=exact('sensor.vrm_battery_power')||findNumeric(['battery power','accuvermogen'],'W');
    const solarE=exact('sensor.vrm_solar_charger_power')||exact('sensor.vrm_pv_power')||findNumeric(['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'W');
    const startE=findNumeric(['starter battery voltage','start battery voltage','startaccu spanning','startaccu'],'V');
    const invE=findNumeric(['inverter power','omvormer vermogen','ac output power'],'W');
    const chgE=findNumeric(['charger power','lader vermogen','charging power'],'W');
    const loadE=findNumeric(['consumption power','load power','verbruik vermogen','ac load'],'W');
    const shoreE=states().filter(validEntity).map(e=>{
      const hay=`${e.entity_id||''} ${e.name||''}`.toLowerCase();
      let score=0;if(/shore|walstroom|landstroom/.test(hay))score+=100;if(/vrm|victron|cerbo|multiplus/.test(hay))score+=20;return{e,score};
    }).sort((a,b)=>b.score-a.score)[0];

    const soc=first(socE?.state,db.soc?.value,t.houseSoc,t.soc,text('techHouseSoc'),text('ivmsBatteryRing'),text('ms71510HouseSoc'));
    const voltage=first(voltE?.state,db.voltage?.value,t.houseVoltage,t.batteryVoltage,text('techHouseVoltage'),text('ivmsBatteryVoltage'),text('ms71510HouseVoltage'));
    const current=first(ampE?.state,db.current?.value,t.houseCurrent,t.batteryCurrent,text('techHouseCurrent'),text('ivmsBatteryCurrent'),text('ms71510HouseCurrent'));
    let power=first(powerE?.state,db.power?.value,t.housePower,t.batteryPower);
    if(power===null&&voltage!==null&&current!==null)power=voltage*current;
    const solar=first(solarE?.state,ds.power?.value,t.solarPower,t.pvPower,text('liveSolarYieldPower'));
    const start=first(startE?.state,t.startVoltage,text('techStartVoltage'),text('liveStartVoltage'),text('ms71510StartVoltage'));
    const inverter=first(invE?.state,t.inverterPower);
    const charger=first(chgE?.state,t.chargerPower);
    let load=first(loadE?.state,t.loadPower,t.dcLoadPower);
    if(load===null&&power!==null&&power<0)load=Math.abs(power);
    let shore=typeof t.shorePower==='boolean'?t.shorePower:null;
    if(shore===null&&shoreE?.score>=100)shore=binary(shoreE.e);
    return {soc,voltage,current,power,solar,start,inverter,charger,load,shore};
  }

  function publish(){
    const v=collect();
    const existing=window.MIJSERENITY_VRM_LIVE_ENERGY;
    const battery={...(existing?.battery||{})};
    const solar={...(existing?.solar||{})};
    const ac={...(existing?.ac||{})};
    const set=(obj,key,value)=>{if(value!==null&&value!==undefined)obj[key]=value};
    set(battery,'soc',v.soc);set(battery,'voltage',v.voltage);set(battery,'current',v.current);set(battery,'power',v.power);set(battery,'starterVoltage',v.start);
    set(solar,'power',v.solar);set(ac,'inverterPower',v.inverter);set(ac,'chargerPower',v.charger);set(ac,'loadPower',v.load);if(v.shore!==null)ac.shoreConnected=v.shore;
    const has=Object.keys(battery).length||Object.keys(solar).length||Object.keys(ac).length;
    if(!has)return false;
    window.MIJSERENITY_VRM_LIVE_ENERGY={...(existing&&typeof existing==='object'?existing:{}),success:true,sampledAt:new Date().toISOString(),battery,solar,ac,source:'mijnserenity-live-bridge'};
    window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:window.MIJSERENITY_VRM_LIVE_ENERGY}));
    try{window.ms71915RenderEnergy?.()}catch{}
    return true;
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;publish()})}
  ['mijnserenity:dashboard-ready','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-diagnostics-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity:modules-ready'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
  window.addEventListener('focus',queue,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
  [250,800,1800,3500,7000].forEach(ms=>setTimeout(queue,ms));
  setInterval(()=>{if(!document.hidden)queue()},15000);
  window.msEnergyBridge8206Refresh=publish;
})();

/* 8.20.8: laad het eigen Cerbo-paneel met eigen DOM-ID's. Hierdoor kan de
   oude Marine Glass energy()-loop de live waarden niet meer terugzetten naar streepjes. */
(()=>{
  'use strict';
  if(window.__msCerboLoader8208)return;
  window.__msCerboLoader8208=true;
  function loadCerbo(){
    if(window.__msCerboLive8208||document.querySelector('script[data-ms-cerbo-live="8208"]'))return;
    const script=document.createElement('script');
    script.src='/dashboard-cerbo-live-8208.js?v=820800';
    script.async=false;
    script.dataset.msCerboLive='8208';
    script.onerror=()=>console.warn('Cerbo GX live dashboard kon niet worden geladen.');
    document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCerbo,{once:true});
  else loadCerbo();
})();

/* 8.21.7: officiële Victron GUI-v2 Remote Console live ín Techniek, met tokeninvoer op het foutscherm. */
(()=>{
  'use strict';
  if(window.__msVictronConsoleLoader8216)return;
  window.__msVictronConsoleLoader8216=true;
  function loadConsole(){
    if(window.__msVictronRemoteConsole8216||document.querySelector('script[data-ms-victron-console="8216"]'))return;
    const script=document.createElement('script');
    script.src='/victron-remote-console-8209.js?v=821700';
    script.async=false;
    script.dataset.msVictronConsole='8216';
    script.onerror=()=>console.warn('Victron Remote Console live kon niet worden geladen.');
    document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadConsole,{once:true});
  else loadConsole();
})();
