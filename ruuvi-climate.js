/* MijnSerenity 7.14.6 — Ruuvi Salon + Machinekamer via Home Assistant */
(()=>{
  'use strict';

  const CONFIG_KEY='mijnserenity-ruuvi-climate-v7102';
  const GROUP_ID='ms7102RuuviClimateGroup';
  const SLOT_LABELS={salon:'Salon Serenity',machine:'Machinekamer Serenity'};
  let renderQueued=false;

  const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);

  function snapshot(){
    try{
      return typeof window.ms730GetStateSnapshot==='function'
        ?window.ms730GetStateSnapshot()
        :[];
    }catch{return []}
  }

  function readConfig(){
    try{
      const value=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
      const saved=value&&typeof value==='object'?value:{};
      return {
        salonTemperature:String(saved.salonTemperature||'sensor.salon_serenity_temperatuur'),
        machineTemperature:String(saved.machineTemperature||saved.forwardTemperature||'sensor.machinekamer_serenity_temperatuur'),
        ...saved
      };
    }catch{return {}}
  }

  function saveConfig(value){
    const next={
      salonTemperature:String(value?.salonTemperature||'sensor.salon_serenity_temperatuur'),
      machineTemperature:String(value?.machineTemperature||value?.forwardTemperature||'sensor.machinekamer_serenity_temperatuur'),
      updatedAt:new Date().toISOString()
    };
    localStorage.setItem(CONFIG_KEY,JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('mijnserenity-ruuvi-config-updated',{detail:next}));
    return next;
  }

  function valid(entity){
    const state=String(entity?.state||'').toLowerCase();
    return entity?.domain==='sensor'&&!['','unknown','unavailable','none','null'].includes(state)&&Number.isFinite(Number(entity.state));
  }

  function text(entity){
    return `${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase();
  }

  function unit(entity){
    return String(entity?.attributes?.unit_of_measurement||'').trim().toLowerCase();
  }

  function deviceClass(entity){
    return String(entity?.attributes?.device_class||'').trim().toLowerCase();
  }

  function isTemperature(entity){
    if(!valid(entity))return false;
    if(deviceClass(entity)==='temperature')return true;
    return /°c|celsius/.test(unit(entity))&&/(ruuvi|temperatuur|temperature|salon|cabine|cabin|voorhut|slaap)/.test(text(entity));
  }

  function isHumidity(entity){
    if(!valid(entity))return false;
    if(deviceClass(entity)==='humidity')return true;
    return unit(entity)==='%'&&/(ruuvi|humidity|luchtvochtigheid|relative humidity|vocht)/.test(text(entity));
  }

  function isPressure(entity){
    if(!valid(entity))return false;
    if(deviceClass(entity)==='pressure')return true;
    return /hpa|mbar|bar/.test(unit(entity))&&/(ruuvi|pressure|luchtdruk|air pressure)/.test(text(entity));
  }

  function normaliseBase(value){
    return String(value||'')
      .toLowerCase()
      .replace(/^sensor\./,'')
      .replace(/\b(relative\s*)?(humidity|luchtvochtigheid|vochtigheid|temperature|temperatuur|temp|air\s*pressure|pressure|luchtdruk)\b/g,' ')
      .replace(/_(relative_)?(humidity|luchtvochtigheid|vochtigheid|temperature|temperatuur|temp|air_pressure|pressure|luchtdruk)(_[0-9]+)?$/,'')
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function tokenSet(entity){
    return new Set(normaliseBase(`${entity?.entity_id||''} ${entity?.name||''}`)
      .split(/\s+/)
      .filter(token=>token.length>1&&!['sensor','ruuvi','ruuvitag','serenity','victron','gx'].includes(token)));
  }

  function siblingScore(source,candidate){
    if(!source||!candidate)return -Infinity;
    const sourceTokens=tokenSet(source);
    const candidateTokens=tokenSet(candidate);
    let score=0;
    sourceTokens.forEach(token=>{if(candidateTokens.has(token))score+=12});
    const sourceBase=normaliseBase(source.entity_id);
    const candidateBase=normaliseBase(candidate.entity_id);
    if(sourceBase&&candidateBase&&(sourceBase===candidateBase||sourceBase.startsWith(candidateBase)||candidateBase.startsWith(sourceBase)))score+=40;
    const sourceName=normaliseBase(source.name);
    const candidateName=normaliseBase(candidate.name);
    if(sourceName&&candidateName&&(sourceName===candidateName||sourceName.startsWith(candidateName)||candidateName.startsWith(sourceName)))score+=35;
    return score;
  }

  function findSibling(source,kind,states=snapshot()){
    const predicate=kind==='humidity'?isHumidity:isPressure;
    return states
      .filter(predicate)
      .map(entity=>({entity,score:siblingScore(source,entity)}))
      .filter(item=>item.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function entityById(id,states=snapshot()){
    return states.find(entity=>entity?.entity_id===id&&valid(entity))||null;
  }

  function value(entity,digits=1){
    return valid(entity)?Number(Number(entity.state).toFixed(digits)):null;
  }

  function resolveSlot(slot,states=snapshot()){
    const config=readConfig();
    const key=slot==='salon'?'salonTemperature':'machineTemperature';
    const temperature=entityById(config[key],states);
    const humidity=findSibling(temperature,'humidity',states);
    const pressure=findSibling(temperature,'pressure',states);
    return {
      slot,
      label:SLOT_LABELS[slot],
      temperatureEntity:temperature,
      humidityEntity:humidity,
      pressureEntity:pressure,
      temperature:value(temperature,1),
      humidity:value(humidity,0),
      pressure:value(pressure,0)
    };
  }

  function climate(){
    const states=snapshot();
    return {salon:resolveSlot('salon',states),machine:resolveSlot('machine',states)};
  }

  function temperatureCandidates(){
    return snapshot()
      .filter(isTemperature)
      .sort((a,b)=>String(a.name||a.entity_id).localeCompare(String(b.name||b.entity_id),'nl'));
  }

  function optionList(selected){
    const candidates=temperatureCandidates();
    const options=['<option value="">Niet gekoppeld</option>'];
    candidates.forEach(entity=>{
      const state=`${Number(entity.state).toLocaleString('nl-NL',{maximumFractionDigits:1})} ${entity.attributes?.unit_of_measurement||'°C'}`;
      options.push(`<option value="${escape(entity.entity_id)}" ${entity.entity_id===selected?'selected':''}>${escape(entity.name)} — ${escape(state)}</option>`);
    });
    return options.join('');
  }

  function detectionText(entityId){
    const source=entityById(entityId);
    if(!source)return 'Kies eerst de temperatuursensor van deze RuuviTag.';
    const humidity=findSibling(source,'humidity');
    const pressure=findSibling(source,'pressure');
    const parts=[];
    if(humidity)parts.push(`vocht ${Math.round(Number(humidity.state))}%`);
    if(pressure)parts.push(`druk ${Math.round(Number(pressure.state))} ${pressure.attributes?.unit_of_measurement||'hPa'}`);
    return parts.length?`Automatisch gekoppeld: ${parts.join(' · ')}`:'Temperatuur gevonden; vocht en luchtdruk zijn nog niet zichtbaar in Home Assistant.';
  }

  function render(){
    renderQueued=false;
    const container=document.getElementById('ms730DeviceGroups');
    if(!container)return;
    let group=document.getElementById(GROUP_ID);
    if(!group){
      group=document.createElement('div');
      group.id=GROUP_ID;
      group.className='ms730-device-group ms7102-ruuvi-group';
      container.appendChild(group);
    }
    const config=readConfig();
    const count=temperatureCandidates().length;
    group.innerHTML=`
      <h5>🌡️ Ruuvi / klimaat <small>(2 meetpunten)</small></h5>
      <p class="ms7102-ruuvi-help">Kies per ruimte de temperatuur-entiteit. MijnSerenity koppelt luchtvochtigheid en luchtdruk van dezelfde RuuviTag automatisch.</p>
      <div class="ms7102-ruuvi-grid">
        <label><strong>Salon</strong><select id="ms7102SalonTemperature">${optionList(config.salonTemperature)}</select><small id="ms7102SalonDetection">${escape(detectionText(config.salonTemperature))}</small></label>
        <label><strong>Machinekamer Serenity</strong><select id="ms7102MachineTemperature">${optionList(config.machineTemperature||config.forwardTemperature)}</select><small id="ms7102MachineDetection">${escape(detectionText(config.machineTemperature||config.forwardTemperature))}</small></label>
      </div>
      <div class="ms730-wizard-actions ms7102-ruuvi-actions">
        <button type="button" onclick="ms7102SaveRuuviClimate()">✓ Klimaatsensoren gebruiken</button>
        <span>${count?`${count} temperatuursensor${count===1?'':'en'} gevonden`:'Nog geen Ruuvi-temperatuursensoren in Home Assistant gevonden'}</span>
      </div>`;
    const salon=group.querySelector('#ms7102SalonTemperature');
    const machine=group.querySelector('#ms7102MachineTemperature');
    const updateHints=()=>{
      const salonHint=group.querySelector('#ms7102SalonDetection');
      const machineHint=group.querySelector('#ms7102MachineDetection');
      if(salonHint)salonHint.textContent=detectionText(salon?.value||'');
      if(machineHint)machineHint.textContent=detectionText(machine?.value||'');
    };
    salon?.addEventListener('change',updateHints);
    machine?.addEventListener('change',updateHints);
  }

  function queueRender(){
    if(renderQueued)return;
    renderQueued=true;
    window.setTimeout(render,50);
  }

  function saveFromUi(){
    const salon=document.getElementById('ms7102SalonTemperature')?.value||'';
    const machine=document.getElementById('ms7102MachineTemperature')?.value||'';
    if(salon&&machine&&salon===machine){
      window.showAppToast?.('Kies twee verschillende Ruuvi-sensoren.');
      return false;
    }
    saveConfig({salonTemperature:salon,machineTemperature:machine});
    window.showAppToast?.('Ruuvi-klimaatsensoren gekoppeld ✅');
    queueRender();
    return true;
  }

  function install(){
    window.ms7102GetRuuviClimate=climate;
    window.ms7102GetRuuviClimateConfig=readConfig;
    window.ms7102SaveRuuviClimate=saveFromUi;
    window.addEventListener('mijnserenity-ha-state-updated',queueRender);
    window.addEventListener('mijnserenity-ha-connected',queueRender);
    if(document.getElementById('ms730DeviceGroups')){
      queueRender();
    }else{
      const startupObserver=new MutationObserver(()=>{
        if(!document.getElementById('ms730DeviceGroups'))return;
        startupObserver.disconnect();
        queueRender();
      });
      startupObserver.observe(document.body,{childList:true,subtree:true});
      window.setTimeout(()=>startupObserver.disconnect(),15000);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
