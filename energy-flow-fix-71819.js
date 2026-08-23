/* MijnSerenity 7.18.19 — actuele MPPT-opbrengst, walstroom aan/uit en totaalverbruik */
(()=>{
  'use strict';
  if(window.__msEnergyFlowFix71819)return;
  window.__msEnergyFlowFix71819=true;

  const $=id=>document.getElementById(id);
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const num=value=>finite(value)?Number(value):null;
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const setText=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function states(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return[]}
  }
  function exact(ids){
    const list=states();
    for(const id of ids){const found=list.find(item=>item?.entity_id===id);if(found)return found}
    return null;
  }
  function bool(value){
    const text=String(value??'').trim().toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(text))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(text))return false;
    return null;
  }
  function technical(){
    try{return typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object'?technicalStateCache:{}}
    catch{return{}}
  }
  function freshLive(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!live||typeof live!=='object')return null;
    const sampled=Date.parse(String(live.sampledAt||''));
    if(Number.isFinite(sampled)&&Date.now()-sampled>180000)return null;
    return live;
  }
  function freshDiagnosis(maxAge=20*60*1000){
    const data=window.MIJSERENITY_VRM_DIAGNOSTICS;
    if(!data||typeof data!=='object')return null;
    const sampled=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(sampled)&&Date.now()-sampled>maxAge)return null;
    return data;
  }

  function batteryPower(){
    const ha=exact(['sensor.vrm_battery_power','sensor.vrm_smartshunt_power']);
    if(finite(ha?.state))return Number(ha.state);
    const diagnostic=window.MIJSERENITY_VRM_DIAGNOSTICS?.battery?.power?.value;
    if(finite(diagnostic))return Number(diagnostic);
    const t=technical();
    if(finite(t.housePower))return Number(t.housePower);
    const shown=number($('mgBatP')?.textContent);
    if(shown!==null)return shown;
    const voltage=number($('mgVolt')?.textContent),current=number($('mgAmp')?.textContent);
    return voltage!==null&&current!==null?voltage*current:null;
  }

  function solarPower(){
    const vrm=window.MIJSERENITY_VRM_DATA?.energy||{};
    const ha=exact(['sensor.vrm_solar_charger_power','sensor.vrm_pv_power','sensor.vrm_mppt_power']);
    const diagnosis=freshDiagnosis();
    const t=technical();
    const candidates=[
      num(vrm.solarPower),
      num(ha?.state),
      num(diagnosis?.solar?.power?.value),
      num(t.solarPower)
    ];

    // Een expliciete positieve MPPT-meting gaat voor op een foutieve/statische 0 W-bron.
    const positive=candidates.find(value=>value!==null&&value>0.5);
    if(positive!==undefined)return positive;

    // Als VRM zowel PV-spanning als PV-stroom heeft, is dat een bruikbare actuele opbrengstmeting.
    const pvVoltage=num(vrm.pvVoltage),pvCurrent=num(vrm.pvCurrent);
    if(pvVoltage!==null&&pvCurrent!==null&&pvVoltage>0&&pvCurrent>0){
      const calculated=pvVoltage*pvCurrent;
      if(calculated>0.5)return calculated;
    }

    // Negatieve waarden blijven zichtbaar als meetfout; niet stilzwijgend naar nul maken.
    const measured=candidates.find(value=>value!==null);
    return measured===undefined?null:measured;
  }

  function chargerPower(){
    const live=freshLive()?.ac||{};
    if(finite(live.chargerPower))return Number(live.chargerPower);
    const ha=exact(['sensor.vrm_charger_power','sensor.vrm_ac_charger_power','sensor.vrm_charger_ac_power']);
    if(finite(ha?.state))return Number(ha.state);
    const ac=window.MIJSERENITY_VRM_DIAGNOSTICS?.ac||{};
    if(finite(ac.chargerPower))return Number(ac.chargerPower);
    const t=technical();
    return finite(t.chargerPower)?Number(t.chargerPower):null;
  }

  function shoreStatus(){
    const live=freshLive()?.ac||{};
    const directAc=window.MIJSERENITY_VRM_DIAGNOSTICS?.ac||{};
    let connected=null;

    if(typeof live.shoreConnected==='boolean')connected=live.shoreConnected;
    if(connected===null&&finite(live.inputVoltage)){
      const voltage=Number(live.inputVoltage);
      if(voltage>=180&&voltage<=280)connected=true;
      else if(voltage<80)connected=false;
    }

    const binary=exact(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected']);
    if(connected===null)connected=bool(binary?.state);

    const voltageEntity=exact(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage']);
    if(connected===null&&finite(voltageEntity?.state)){
      const voltage=Number(voltageEntity.state);
      if(voltage>=180&&voltage<=280)connected=true;
      else if(voltage<80)connected=false;
    }
    if(connected===null&&typeof directAc.shoreConnected==='boolean')connected=directAc.shoreConnected;

    const source=String($('ivmsPowerSource')?.textContent||'').trim().toUpperCase();
    if(connected===null&&source==='WALSTROOM')connected=true;
    if(connected===null&&source==='ACCU')connected=false;

    const activeMeasurements=[];
    [live.inputPower,live.chargerPower,directAc.inputPower,directAc.chargerPower].forEach(value=>{
      if(finite(value))activeMeasurements.push(Number(value));
    });
    const inputPowerEntity=exact(['sensor.vrm_ac_input_power','sensor.vrm_shore_power','sensor.vrm_grid_power']);
    if(finite(inputPowerEntity?.state))activeMeasurements.push(Number(inputPowerEntity.state));
    const charger=chargerPower();
    if(charger!==null)activeMeasurements.push(charger);

    let active=null;
    if(activeMeasurements.length)active=activeMeasurements.some(value=>Math.abs(value)>3);
    if(connected===false)active=false;
    if(connected===true&&active===null){
      const battery=batteryPower();
      if(battery!==null&&battery<-2)active=false;
    }
    return {connected,active};
  }

  function totalLoad(power,solar,shore){
    const measured=exact(['sensor.vrm_load_power','sensor.vrm_consumption_power','sensor.vrm_ac_load_power']);
    const measuredLoad=finite(measured?.state)?Math.max(0,Number(measured.state)):null;
    const liveLoad=num(freshLive()?.ac?.loadPower);
    const charger=shore.active===true?Math.max(0,chargerPower()||0):0;
    let balanced=null;
    if(power!==null){
      balanced=Math.max(0,Math.max(0,solar||0)+charger-power);
    }
    const values=[measuredLoad,liveLoad!==null?Math.max(0,liveLoad):null,balanced].filter(value=>value!==null&&Number.isFinite(value));
    return values.length?Math.max(...values):null;
  }

  function ensureUi(){
    if(!$('msEnergyFlowStyle71819')){
      const style=document.createElement('style');
      style.id='msEnergyFlowStyle71819';
      style.textContent=`
        .mg-battery .mg-battery-state-line{display:flex;align-items:center;gap:8px;margin-top:7px;white-space:nowrap}
        .mg-battery .mg-battery-state-line b{font-size:12px;color:#eaf7ff}
        .mg-battery .mg-battery-state-line small{font-size:10px;font-weight:750;color:#9fb6c6}
        .mg-battery[data-state="discharging"] #mgAmp,.mg-battery[data-state="discharging"] #mgBatWCard,.mg-battery[data-state="discharging"] #mgBatState{color:var(--mg-red)!important}
        .mg-battery[data-state="charging"] #mgAmp,.mg-battery[data-state="charging"] #mgBatWCard,.mg-battery[data-state="charging"] #mgBatState{color:var(--mg-green)!important}
        .mg-flow[data-flow="discharge"]>i{background:linear-gradient(90deg,var(--mg-red),rgba(255,93,93,.32))!important}
        .mg-flow[data-flow="discharge"]>b{background:var(--mg-red)!important;box-shadow:0 0 10px var(--mg-red)!important;animation-direction:normal!important;animation-play-state:running!important;opacity:1!important}
        .mg-flow[data-flow="charge"]>i{background:linear-gradient(90deg,rgba(57,210,125,.32),var(--mg-green))!important}
        .mg-flow[data-flow="charge"]>b{background:var(--mg-green)!important;box-shadow:0 0 10px var(--mg-green)!important;animation-direction:reverse!important;animation-play-state:running!important;opacity:1!important}
        .mg-flow[data-flow="idle"]>i{background:rgba(135,183,214,.18)!important}
        .mg-flow[data-flow="idle"]>b{animation:none!important;opacity:0!important}
      `;
      document.head.appendChild(style);
    }
    const battery=document.querySelector('#msMarineGlass .mg-battery');
    if(battery&&!$('mgBatteryStateLine')){
      const line=document.createElement('div');
      line.id='mgBatteryStateLine';
      line.className='mg-battery-state-line';
      line.innerHTML='<b id="mgBatWCard">– W</b><small id="mgBatState">–</small>';
      battery.appendChild(line);
    }
  }

  function sync(){
    ensureUi();
    const power=batteryPower();
    const solar=solarPower();
    const shore=shoreStatus();
    const state=power===null?'idle':power>2?'charging':power<-2?'discharging':'idle';
    const flow=$('mgFlow');
    if(flow)flow.dataset.flow=state==='charging'?'charge':state==='discharging'?'discharge':'idle';
    const battery=document.querySelector('#msMarineGlass .mg-battery');
    if(battery)battery.dataset.state=state;

    if(power===null){
      setText('mgBatWCard','– W');
      setText('mgBatState','Geen meting');
    }else{
      const rounded=Math.round(power);
      setText('mgBatWCard',`${rounded>0?'+':''}${rounded} W`);
      setText('mgBatState',state==='charging'?'Laden':state==='discharging'?'Ontladen':'Rust');
      setText('mgBatP',`${rounded>0?'+':''}${rounded} W`);
      setText('mgNetPower',`${rounded>0?'+':''}${rounded} W`);
      const net=$('mgNetPower');
      if(net)net.style.color=state==='discharging'?'var(--mg-red)':state==='charging'?'var(--mg-green)':'';
    }

    if(solar!==null){
      const rounded=Math.round(solar);
      setText('mgSolar',`${rounded} W`);
      setText('mgPv',`${rounded} W`);
      setText('msVictronSolar',`${rounded} W`);
    }

    if(shore.connected===true){
      setText('mgShore',shore.active===true?'Aangesloten · Actief':shore.active===false?'Aangesloten · Uit':'Aangesloten');
    }else if(shore.connected===false){
      setText('mgShore','Niet actief');
    }

    const load=totalLoad(power,solar,shore);
    if(load!==null)setText('mgLoad',`${Math.round(load)} W`);
  }

  let lastRefresh=0;
  function refreshEnergy(){
    if(document.hidden||typeof window.msRefreshVictronEnergy!=='function')return;
    if(Date.now()-lastRefresh<30000)return;
    lastRefresh=Date.now();
    Promise.resolve(window.msRefreshVictronEnergy(true)).catch(()=>{});
  }

  function start(){
    sync();
    setTimeout(refreshEnergy,1200);
    ['mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange']
      .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(sync),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();refreshEnergy()}},{passive:true});
    setInterval(()=>{if(!document.hidden)sync()},500);
    setInterval(refreshEnergy,10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
