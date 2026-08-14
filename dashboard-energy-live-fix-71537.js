/* MijnSerenity 7.15.38 — live energie + Ruuvi klimaat op Pro-dashboard */
(()=>{
  'use strict';
  if(window.__msEnergyLiveFix71538)return;
  window.__msEnergyLiveFix71538=true;

  const $=id=>document.getElementById(id);
  const text=id=>($(id)?.textContent||'').trim();
  const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
  const nl=(value,digits=1)=>Number(value).toLocaleString('nl-NL',{
    minimumFractionDigits:0,
    maximumFractionDigits:digits
  });
  const set=(id,value)=>{
    const el=$(id);
    const next=String(value??'');
    if(el&&el.textContent!==next)el.textContent=next;
  };

  function haStates(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return []}
  }

  function exact(entityId){
    return haStates().find(entity=>entity?.entity_id===entityId)||null;
  }

  function exactNumber(...entityIds){
    for(const entityId of entityIds){
      const entity=exact(entityId);
      if(finite(entity?.state))return Number(entity.state);
    }
    return null;
  }

  function fallbackText(id,fallback){
    const value=text(id);
    if(!value||/^[-–](?:\s*(?:%|V|A|W))?$/i.test(value))return fallback;
    return value;
  }

  function shoreFromSnapshot(){
    const entity=haStates().find(item=>{
      const label=`${item?.entity_id||''} ${item?.attributes?.friendly_name||''} ${item?.name||''}`.toLowerCase();
      return /shore power|walstroom|ac input connected|grid connected/.test(label);
    });
    if(!entity)return null;
    const value=String(entity.state||'').trim().toLowerCase();
    if(['on','connected','true','1','yes','aan'].includes(value))return 'Aan';
    if(['off','disconnected','false','0','no','uit'].includes(value))return 'Uit';
    return null;
  }

  function installClimateStyle(){
    if($('msEnergyClimateStyle71538'))return;
    const style=document.createElement('style');
    style.id='msEnergyClimateStyle71538';
    style.textContent=`
      .msc-energy .msc-climate-wrap{
        margin:2px 0 0;
        padding-top:10px;
        border-top:1px solid rgba(255,255,255,.09);
        display:grid;
        gap:8px;
      }
      .msc-energy .msc-climate-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        gap:10px;
        min-width:0;
      }
      .msc-energy .msc-climate-row small{
        display:block;
        opacity:.72;
        font-size:11px;
        line-height:1.15;
      }
      .msc-energy .msc-climate-values{
        display:flex;
        align-items:baseline;
        justify-content:flex-end;
        gap:8px;
        white-space:nowrap;
      }
      .msc-energy .msc-climate-values strong{
        color:#b9ff23;
        font-size:18px;
        line-height:1;
      }
      .msc-energy .msc-climate-values span{
        color:#eef6ff;
        font-size:15px;
        font-weight:700;
      }
      @media(max-width:760px){
        .msc-energy .msc-climate-values{gap:6px}
        .msc-energy .msc-climate-values strong{font-size:17px}
        .msc-energy .msc-climate-values span{font-size:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureClimateRows(){
    const energy=document.querySelector('.msc-energy');
    if(!energy||$('mscRuuviClimate'))return;
    const wrap=document.createElement('div');
    wrap.id='mscRuuviClimate';
    wrap.className='msc-climate-wrap';
    wrap.innerHTML=`
      <div class="msc-climate-row">
        <div><small>🌡️ SALON</small></div>
        <div class="msc-climate-values"><strong id="mscSalonTemp">– °C</strong><span id="mscSalonRv">– % RV</span></div>
      </div>
      <div class="msc-climate-row">
        <div><small>🌡️ MACHINEKAMER</small></div>
        <div class="msc-climate-values"><strong id="mscMachineTemp">– °C</strong><span id="mscMachineRv">– % RV</span></div>
      </div>`;
    energy.appendChild(wrap);
  }

  function ruuviClimate(){
    try{return typeof window.ms7102GetRuuviClimate==='function'?window.ms7102GetRuuviClimate():null}
    catch{return null}
  }

  function syncClimate(){
    installClimateStyle();
    ensureClimateRows();
    const climate=ruuviClimate();
    const salon=climate?.salon||{};
    const machine=climate?.forward||{};
    set('mscSalonTemp',finite(salon.temperature)?`${nl(salon.temperature,1)} °C`:'– °C');
    set('mscSalonRv',finite(salon.humidity)?`${nl(salon.humidity,0)} % RV`:'– % RV');
    set('mscMachineTemp',finite(machine.temperature)?`${nl(machine.temperature,1)} °C`:'– °C');
    set('mscMachineRv',finite(machine.humidity)?`${nl(machine.humidity,0)} % RV`:'– % RV');
  }

  function syncEnergy(){
    if(!$('mscSoc'))return;

    const soc=exactNumber('sensor.vrm_state_of_charge');
    const voltage=exactNumber('sensor.vrm_voltage');
    const current=exactNumber('sensor.vrm_current');
    const solar=exactNumber('sensor.vrm_solar_charger_power','sensor.vrm_pv_power');

    set('mscSoc',soc!==null?`${nl(soc,1)}%`:fallbackText('ivmsBatteryRing','–%'));

    const voltageText=voltage!==null
      ?`${nl(voltage,2)} V`
      :fallbackText('ivmsBatteryVoltage','– V');
    const currentText=current!==null
      ?`${nl(current,2)} A`
      :fallbackText('ivmsBatteryCurrent','– A');
    set('mscVoltAmp',`${voltageText}　${currentText}`);
    set('mscAmp',currentText);

    let shore=shoreFromSnapshot();
    if(!shore){
      const source=text('ivmsPowerSource').toUpperCase();
      const liveMeta=text('ivmsBatteryMeta').toLowerCase();
      if(liveMeta.includes('victron live')||haStates().length){
        if(source==='WALSTROOM')shore='Aan';
        else if(source==='ACCU')shore='Uit';
      }
    }
    set('mscShore',shore||'–');

    const solarText=solar!==null
      ?`${nl(solar,0)} W`
      :fallbackText('ivmsSolarPower',fallbackText('techSolarPower','– W'));
    set('mscSolar',solarText);

    syncClimate();

    const badge=document.querySelector('.msc-energy .msc-title .ok');
    if(badge){
      const climate=ruuviClimate();
      const climateLive=finite(climate?.salon?.temperature)||finite(climate?.forward?.temperature);
      const live=soc!==null||voltage!==null||current!==null||solar!==null||shore!==null||climateLive||text('ivmsBatteryMeta').toLowerCase().includes('victron live');
      const next=live?'• Live':'• Wachten op live data';
      if(badge.textContent!==next)badge.textContent=next;
    }
  }

  async function refreshNow(){
    try{
      if(typeof window.ms730HomeAssistantConnected==='function'&&
         window.ms730HomeAssistantConnected()&&
         typeof window.ms730RefreshStateSnapshot==='function'){
        await window.ms730RefreshStateSnapshot();
      }
    }catch(error){
      console.warn('MijnSerenity live energie verversen mislukt:',error);
    }
    try{
      if(typeof window.ms7102RefreshRuuviVrm==='function')await window.ms7102RefreshRuuviVrm();
    }catch(error){
      console.warn('MijnSerenity Ruuvi verversen mislukt:',error);
    }
    syncEnergy();
  }

  function install(){
    installClimateStyle();
    ensureClimateRows();
    syncEnergy();
    refreshNow();
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-ruuvi-config-updated']
      .forEach(name=>window.addEventListener(name,syncEnergy,{passive:true}));
    setInterval(syncEnergy,1000);
    setInterval(()=>{if(!document.hidden)refreshNow()},60000);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')refreshNow();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
