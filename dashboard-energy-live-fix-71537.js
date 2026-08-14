/* MijnSerenity 7.15.37 — live energie op Pro-dashboard */
(()=>{
  'use strict';
  if(window.__msEnergyLiveFix71537)return;
  window.__msEnergyLiveFix71537=true;

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

    const badge=document.querySelector('.msc-energy .msc-title .ok');
    if(badge){
      const live=soc!==null||voltage!==null||current!==null||solar!==null||shore!==null||text('ivmsBatteryMeta').toLowerCase().includes('victron live');
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
    syncEnergy();
  }

  function install(){
    syncEnergy();
    refreshNow();
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated']
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
