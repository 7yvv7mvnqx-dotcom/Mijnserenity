/* MijnSerenity 7.19.0 — rustige Victron energiebrug
   Geen 2s renderpoll, geen DOM-scan en geen MutationObservers.
   Live VRM wordt maximaal eens per minuut ververst; UI volgt events. */
(()=>{
  'use strict';
  if(window.__msVictronEnergy71900)return;
  window.__msVictronEnergy71900=true;

  const $=id=>document.getElementById(id);
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let liveBusy=false;
  let lastLiveAttempt=0;
  let refreshTimer=0;
  let renderFrame=0;

  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const usable=entity=>entity&&!['unknown','unavailable','none',''].includes(String(entity.state??'').toLowerCase());
  const fmt=(value,digits=0,suffix='')=>value===null||value===undefined||!Number.isFinite(Number(value))
    ?`–${suffix}`
    :`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function states(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot().filter(usable):[]}
    catch{return []}
  }
  function text(entity){
    return `${entity?.entity_id||''} ${entity?.attributes?.friendly_name||''} ${entity?.name||''}`.toLowerCase();
  }
  function unit(entity){return String(entity?.attributes?.unit_of_measurement||'').toLowerCase()}
  function exact(ids){
    const list=states();
    for(const id of ids){const found=list.find(entity=>entity.entity_id===id);if(found)return found}
    return null;
  }
  function find(terms,wantedUnit='',exclude=[]){
    return states().map(entity=>{
      const hay=text(entity);let score=0;
      terms.forEach((term,index)=>{if(hay.includes(term))score+=50-index});
      if(wantedUnit&&unit(entity)===wantedUnit.toLowerCase())score+=12;
      if(exclude.some(term=>hay.includes(term)))score=-1000;
      return {entity,score};
    }).filter(item=>item.score>=48).sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }
  function pick(ids,terms,wantedUnit='',exclude=[]){return exact(ids)||find(terms,wantedUnit,exclude)}
  function entityNumber(entity){return usable(entity)?num(entity.state):null}
  function bool(entity){
    if(!entity)return null;
    const value=String(entity.state||'').toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(value))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(value))return false;
    return null;
  }
  function technical(){
    try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:(typeof readTechnicalLocalState==='function'?readTechnicalLocalState()||{}:{})}
    catch{return {}}
  }
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  function token(){
    for(const key of TOKEN_KEYS){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}
    try{
      const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');
      if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'');
    }catch{}
    return '';
  }
  function live(){
    const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!data||typeof data!=='object')return {};
    const at=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(at)&&Date.now()-at>180000)return {};
    return data;
  }

  function snapshot(){
    const t=technical();
    const diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const directBattery=diagnosis.battery||{};
    const directSolar=diagnosis.solar||{};
    const directAc=diagnosis.ac||{};
    const liveAc=live().ac||{};

    const soc=pick(['sensor.vrm_state_of_charge'],['state of charge','smartshunt soc','battery soc'],'%');
    const voltage=pick(['sensor.vrm_voltage'],['vrm voltage','smartshunt voltage','house battery voltage','huishoudaccu spanning'],'v',['starter','startaccu','aux']);
    const current=pick(['sensor.vrm_current'],['vrm current','smartshunt current','battery current','accustroom'],'a',['starter','startaccu','aux']);
    const power=pick(['sensor.vrm_battery_power'],['vrm battery power','smartshunt power','battery power','accuvermogen'],'w',['solar','pv','mppt','charger']);
    const solar=pick(['sensor.vrm_solar_charger_power','sensor.vrm_pv_power'],['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'w',['battery','load','voltage','current']);
    const start=pick(['sensor.vrm_starter_battery_voltage','sensor.vrm_start_battery_voltage','sensor.vrm_auxiliary_battery_voltage','sensor.vrm_aux_voltage'],['starter battery voltage','start battery voltage','startaccu spanning','aux voltage'],'v',['house','huishoud']);
    const shoreEntity=exact(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected'])||find(['shore power','walstroom','ac input connected','grid connected'],'',['voltage','frequency','power']);
    const shoreVoltage=pick(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage'],['ac input voltage','shore voltage','walstroom spanning','grid voltage'],'v',['battery','dc','starter']);
    const charger=pick(['sensor.vrm_charger_power','sensor.vrm_ac_charger_power'],['charger power','acculader vermogen','lader vermogen'],'w',['solar','pv','mppt','inverter']);
    const inverter=pick(['sensor.vrm_inverter_power','sensor.vrm_inverter_output_power','sensor.vrm_ac_output_power'],['inverter power','omvormer vermogen','ac output power'],'w',['solar','charger','lader']);
    const loadEntity=pick(['sensor.vrm_ac_load_power','sensor.vrm_load_power','sensor.vrm_consumption_power'],['ac load power','load power','consumption power','verbruik vermogen'],'w',['solar','charger','battery']);

    const vSoc=entityNumber(soc)??num(directBattery.soc?.value)??num(t.houseSoc);
    const vVoltage=entityNumber(voltage)??num(directBattery.voltage?.value)??num(t.houseVoltage);
    const vCurrent=entityNumber(current)??num(directBattery.current?.value)??num(t.houseCurrent);
    const vPower=entityNumber(power)??num(directBattery.power?.value)??num(t.housePower)??(vVoltage!==null&&vCurrent!==null?vVoltage*vCurrent:null);
    const vSolar=entityNumber(solar)??num(directSolar.power?.value)??num(t.solarPower);
    const vStart=entityNumber(start)??num(directBattery.starterVoltage?.value)??num(t.startVoltage);
    const rawShoreV=entityNumber(shoreVoltage)??num(liveAc.inputVoltage)??num(directAc.inputVoltage)??num(t.shoreVoltage);
    const validShoreV=rawShoreV!==null&&rawShoreV>=80&&rawShoreV<=280?rawShoreV:null;
    let shore=bool(shoreEntity);
    if(shore===null&&typeof liveAc.shoreConnected==='boolean')shore=liveAc.shoreConnected;
    if(shore===null&&typeof directAc.shoreConnected==='boolean')shore=directAc.shoreConnected;
    if(shore===null&&validShoreV!==null)shore=validShoreV>=180;
    if(shore===null&&t.shorePower===true)shore=true;

    return {
      soc:vSoc,voltage:vVoltage,current:vCurrent,power:vPower,solar:vSolar,start:vStart,shore,shoreV:validShoreV,
      charger:entityNumber(charger)??num(liveAc.chargerPower)??num(directAc.chargerPower)??num(t.chargerPower),
      inverter:entityNumber(inverter)??num(liveAc.inverterPower)??num(directAc.inverterPower)??num(t.inverterPower),
      load:entityNumber(loadEntity)??num(liveAc.loadPower)??num(directAc.loadPower)??num(t.loadPower),
      inputA:num(liveAc.inputCurrent)??num(directAc.inputCurrent),
      inputW:num(liveAc.inputPower)??num(directAc.inputPower),
      outputW:num(liveAc.outputPower)??num(directAc.outputPower),
      dcV:num(liveAc.dcVoltage)??num(directAc.dcVoltage)??vVoltage,
      dcA:num(liveAc.dcCurrent)??num(directAc.dcCurrent)??vCurrent
    };
  }

  function render(){
    const s=snapshot();
    if(s.start!==null){
      ['techStartVoltage','liveStartVoltage','ms71510StartVoltage'].forEach(id=>set(id,fmt(s.start,2,' V')));
    }
    if(!$('msMarineGlass'))return;

    set('mgSoc',fmt(s.soc,0,'%'));
    set('mgVolt',fmt(s.voltage,1,' V'));
    set('mgAmp',fmt(s.current,1,' A'));
    set('mgSolar',fmt(s.solar,0,' W'));
    set('mgPv',fmt(s.solar,0,' W'));
    set('mgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'–');

    const batteryPower=s.power;
    const load=s.load!==null?s.load:(batteryPower!==null&&batteryPower<0?Math.abs(batteryPower):null);
    set('mgLoad',fmt(load,0,' W'));
    set('mgChg',fmt(s.charger,0,' W'));
    set('mgChg2',fmt(s.charger,0,' W'));
    set('mgInv',fmt(s.inverter,0,' W'));
    set('mgInv2',fmt(s.inverter,0,' W'));
    set('mgBatP',batteryPower===null?'– W':`${batteryPower>0?'+':''}${fmt(batteryPower,0,' W')}`);
    set('mgNetPower',batteryPower===null?'– W':`${batteryPower>0?'+':''}${fmt(batteryPower,0,' W')}`);
    const flow=$('mgFlow');
    if(flow)flow.dataset.dir=batteryPower===null?'idle':batteryPower>15?'in':batteryPower<-15?'out':'idle';
  }

  function queueRender(){
    if(renderFrame)return;
    renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()});
  }

  async function refreshLiveEnergy(force=false){
    if(liveBusy)return false;
    if(!force&&Date.now()-lastLiveAttempt<55000)return false;
    const supabase=client(),activeBoat=boat(),activeUser=user(),vrmToken=token();
    if(!supabase||!activeBoat?.id||!activeUser||!vrmToken)return false;
    liveBusy=true;
    lastLiveAttempt=Date.now();
    try{
      const {data,error}=await supabase.functions.invoke('victron-energy-live',{
        body:{boatId:activeBoat.id},headers:{'x-vrm-token':vrmToken}
      });
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      queueRender();
      return true;
    }catch(error){
      console.warn('Victron live energie kon niet worden vernieuwd:',error);
      return false;
    }finally{liveBusy=false}
  }

  window.msRenderVictronEnergy=queueRender;
  window.msRefreshVictronEnergy=force=>refreshLiveEnergy(Boolean(force));
  window.msOpenVictronConsole=()=>{
    let url=localStorage.getItem('ms-victron-console-url')||'';
    if(!url){
      url=window.prompt?.('Plak het beveiligde Cerbo GX / VRM Remote Console-adres:','')||'';
      if(url)try{localStorage.setItem('ms-victron-console-url',url)}catch{}
    }
    if(url)window.open(url,'_blank','noopener,noreferrer');
  };

  const renderEvents=[
    'mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated',
    'mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated',
    'mijnserenity:dashboard-ready'
  ];
  renderEvents.forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  window.addEventListener('mijnserenity-ha-connected',()=>refreshLiveEnergy(false),{passive:true});
  window.addEventListener('focus',()=>{queueRender();refreshLiveEnergy(false)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLiveEnergy(false)}},{passive:true});

  function start(){
    queueRender();
    setTimeout(()=>refreshLiveEnergy(true),1200);
    refreshTimer=setInterval(()=>{if(!document.hidden)refreshLiveEnergy(false)},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
