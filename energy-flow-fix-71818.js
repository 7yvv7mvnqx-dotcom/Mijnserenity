/* MijnSerenity 7.18.18 — correcte accu-flow, meetwaarden en walstroomstatus */
(()=>{
  'use strict';
  if(window.__msEnergyFlowFix71818)return;
  window.__msEnergyFlowFix71818=true;

  const $=id=>document.getElementById(id);
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
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

  function batteryPower(){
    const ha=exact(['sensor.vrm_battery_power','sensor.vrm_smartshunt_power']);
    if(finite(ha?.state))return Number(ha.state);
    const diagnostic=window.MIJSERENITY_VRM_DIAGNOSTICS?.battery?.power?.value;
    if(finite(diagnostic))return Number(diagnostic);
    const shown=number($('mgBatP')?.textContent);
    if(shown!==null)return shown;
    const voltage=number($('mgVolt')?.textContent),current=number($('mgAmp')?.textContent);
    return voltage!==null&&current!==null?voltage*current:null;
  }

  function liveShore(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY;
    const sampled=Date.parse(String(live?.sampledAt||''));
    const fresh=live&&(!Number.isFinite(sampled)||Date.now()-sampled<180000);
    const ac=fresh?live?.ac:null;
    if(typeof ac?.shoreConnected==='boolean')return ac.shoreConnected;
    if(finite(ac?.inputVoltage)){
      const voltage=Number(ac.inputVoltage);
      if(voltage>=180&&voltage<=280)return true;
      if(voltage<80)return false;
    }

    const binary=exact(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected']);
    const direct=bool(binary?.state);
    if(direct!==null)return direct;

    const voltageEntity=exact(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage']);
    if(finite(voltageEntity?.state)){
      const voltage=Number(voltageEntity.state);
      if(voltage>=180&&voltage<=280)return true;
      if(voltage<80)return false;
    }

    const source=String($('ivmsPowerSource')?.textContent||'').trim().toUpperCase();
    if(source==='WALSTROOM')return true;
    if(source==='ACCU')return false;
    return null;
  }

  function ensureUi(){
    if(!$('msEnergyFlowStyle71818')){
      const style=document.createElement('style');
      style.id='msEnergyFlowStyle71818';
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
      if(Math.abs(power)<=2){setText('mgBatP','0 W');setText('mgNetPower','0 W')}
    }

    const shore=liveShore();
    if(shore!==null)setText('mgShore',shore?'Aangesloten':'Niet aangesloten');
  }

  let lastRefresh=0;
  function refreshShore(){
    if(document.hidden||typeof window.msRefreshVictronEnergy!=='function')return;
    if(Date.now()-lastRefresh<30000)return;
    lastRefresh=Date.now();
    Promise.resolve(window.msRefreshVictronEnergy(true)).catch(()=>{});
  }

  function start(){
    sync();
    setTimeout(refreshShore,1800);
    ['mijnserenity-vrm-energy-live-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-diagnostics-updated','mijnserenity:routechange']
      .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(sync),{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();refreshShore()}},{passive:true});
    setInterval(()=>{if(!document.hidden)sync()},500);
    setInterval(refreshShore,10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
