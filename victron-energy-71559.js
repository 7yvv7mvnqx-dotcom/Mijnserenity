/* MijnSerenity 7.18.15 — live Victron AC/walstroom + centrale energiestatus */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const num=value=>{const n=Number.parseFloat(String(value??'').replace(',','.').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:null};
const usable=e=>e&&!['unknown','unavailable','none',''].includes(String(e.state??'').toLowerCase());
const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
let liveBusy=false;
let lastLiveAttempt=0;
function states(){try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot().filter(usable):[]}catch{return[]}}
function text(e){return `${e?.entity_id||''} ${e?.attributes?.friendly_name||''} ${e?.name||''}`.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function unit(e){return String(e?.attributes?.unit_of_measurement||'').toLowerCase()}
function exact(ids){const list=states();for(const id of ids){const found=list.find(e=>e.entity_id===id);if(found)return found}return null}
function scored({include=[],exclude=[],wantedUnit='',minimum=1}){
  return states().map(e=>{
    const hay=text(e);let score=0;
    include.forEach((term,index)=>{if(hay.includes(term))score+=60-index});
    if(/vrm|victron|cerbo|smartshunt|mppt/.test(hay))score+=20;
    if(wantedUnit&&unit(e)===wantedUnit.toLowerCase())score+=15;
    if(exclude.some(term=>hay.includes(term)))score=-1000;
    return {e,score};
  }).filter(x=>x.score>=minimum).sort((a,b)=>b.score-a.score)[0]?.e||null;
}
function pick(ids,include,wantedUnit,exclude=[]){return exact(ids)||scored({include,exclude,wantedUnit,minimum:55})}
function bool(e){
  if(!e)return null;
  const v=String(e.state||'').toLowerCase();
  if(['on','connected','true','1','yes','active','aan','present','detected'].includes(v))return true;
  if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(v))return false;
  return null;
}
function technical(){try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:{}}catch{return{}}}
function supabaseClient(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
function activeBoat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
function activeUser(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
function savedVrmToken(){
  for(const key of TOKEN_KEYS){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}
  try{const config=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(config?.vrmToken)return String(config.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}
  return '';
}
function freshLive(){
  const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
  if(!data||typeof data!=='object')return null;
  const at=Date.parse(String(data.sampledAt||''));
  if(Number.isFinite(at)&&Date.now()-at>180000)return null;
  return data;
}
async function refreshLiveEnergy(force=false){
  if(liveBusy)return false;
  if(!force&&Date.now()-lastLiveAttempt<45000)return false;
  const client=supabaseClient(),boat=activeBoat(),user=activeUser(),token=savedVrmToken();
  if(!client||!boat?.id||!user||!token)return false;
  liveBusy=true;lastLiveAttempt=Date.now();
  try{
    const {data,error}=await client.functions.invoke('victron-energy-live',{
      body:{boatId:boat.id},headers:{'x-vrm-token':token}
    });
    if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');
    window.MIJSERENITY_VRM_LIVE_ENERGY=data;
    window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
    render();
    return true;
  }catch(error){
    console.warn('MijnSerenity live walstroom uitlezen mislukt:',error);
    return false;
  }finally{liveBusy=false}
}
function read(){
  const t=technical(),vrm=window.MIJSERENITY_VRM_DATA?.energy||{},diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{},live=freshLive()?.ac||{};
  const directBattery=diagnosis.battery||{},directSolar=diagnosis.solar||{},directAc=diagnosis.ac||{};
  let climate={salon:null,forward:null};
  try{if(typeof window.ms7102GetRuuviClimate==='function')climate=window.ms7102GetRuuviClimate()||climate}catch{}
  const soc=pick(['sensor.vrm_state_of_charge'],['state of charge','smartshunt soc','battery soc'],'%');
  const voltage=pick(['sensor.vrm_voltage'],['vrm voltage','smartshunt voltage','house battery voltage','huishoudaccu spanning'],'v',['starter','startaccu','aux']);
  const current=pick(['sensor.vrm_current'],['vrm current','smartshunt current','battery current','accustroom'],'a',['starter','startaccu','aux']);
  const power=pick(['sensor.vrm_battery_power'],['vrm battery power','smartshunt power','battery power','accuvermogen'],'w',['solar','pv','mppt','charger']);
  const time=pick(['sensor.vrm_time_to_go'],['time to go','resterende tijd','battery runtime'],'h');
  const solar=pick(
    ['sensor.vrm_solar_charger_power','sensor.vrm_pv_power'],
    ['yield power','solar charger power','mppt power','pv power','zonnepaneel vermogen','mppt 278'],'w',
    ['battery power','load power','voltage','current']
  );
  const start=pick(
    ['sensor.vrm_starter_battery_voltage','sensor.vrm_start_battery_voltage','sensor.vrm_auxiliary_battery_voltage','sensor.vrm_aux_voltage'],
    ['starter battery voltage','start battery voltage','startaccu spanning','auxiliary battery voltage','aux voltage'],'v',
    ['house','huishoud']
  );
  const shoreEntity=exact(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected'])||
    scored({include:['shore power','walstroom','ac input connected','mains connected','grid connected'],exclude:['voltage','frequency','power'],minimum:55});
  const shoreVoltageEntity=pick(
    ['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage'],
    ['ac input voltage','shore voltage','walstroom spanning','grid voltage'],'v',
    ['battery','accu','dc','starter','startaccu']
  );
  const charger=pick(
    ['sensor.vrm_charger_power','sensor.vrm_ac_charger_power','sensor.vrm_charger_ac_power'],
    ['ac charger power','charger power','acculader vermogen','lader vermogen'],'w',
    ['solar','pv','mppt','inverter','omvormer']
  );
  const inverter=pick(
    ['sensor.vrm_inverter_power','sensor.vrm_inverter_output_power','sensor.vrm_ac_output_power'],
    ['inverter power','omvormer vermogen','ac output power','ac out power'],'w',
    ['solar','pv','mppt','charger','lader']
  );
  const load=pick(
    ['sensor.vrm_ac_load_power','sensor.vrm_load_power','sensor.vrm_consumption_power'],
    ['ac load power','load power','consumption power','verbruik vermogen'],'w',
    ['solar','pv','mppt','charger','lader','battery','accu']
  );
  const tv=v=>num(v?.state);
  const vSoc=tv(soc)??num(directBattery.soc?.value)??num(t.houseSoc);
  const vVoltage=tv(voltage)??num(directBattery.voltage?.value)??num(t.houseVoltage);
  const vCurrent=tv(current)??num(directBattery.current?.value)??num(t.houseCurrent);
  const vPower=tv(power)??num(directBattery.power?.value)??num(t.housePower)??(vVoltage!==null&&vCurrent!==null?vVoltage*vCurrent:null);
  const vSolar=tv(solar)??num(directSolar.power?.value)??num(vrm.solarPower)??num(t.solarPower);
  const vStart=tv(start)??num(directBattery.starterVoltage?.value)??num(t.startVoltage);
  const rawShoreV=tv(shoreVoltageEntity)??num(live.inputVoltage)??num(directAc.inputVoltage)??num(t.shoreVoltage);
  const validShoreV=rawShoreV!==null&&rawShoreV>=80&&rawShoreV<=280?rawShoreV:null;
  let shore=bool(shoreEntity);
  if(shore===null&&typeof live.shoreConnected==='boolean')shore=live.shoreConnected;
  if(shore===null&&typeof directAc.shoreConnected==='boolean')shore=directAc.shoreConnected;
  if(shore===null&&validShoreV!==null)shore=validShoreV>=180;
  if(shore===null&&t.shorePower===true)shore=true;
  const chargerPower=tv(charger)??num(live.chargerPower)??num(directAc.chargerPower)??num(t.chargerPower);
  const inverterPower=tv(inverter)??num(live.inverterPower)??num(directAc.inverterPower)??num(t.inverterPower);
  const measuredLoad=tv(load)??num(live.loadPower)??num(directAc.loadPower)??num(t.loadPower);
  return {
    soc:vSoc,voltage:vVoltage,current:vCurrent,power:vPower,time:tv(time)??num(t.houseTimeToGo),
    solar:vSolar,pvVoltage:num(vrm.pvVoltage),pvCurrent:num(vrm.pvCurrent),start:vStart,shore,shoreV:validShoreV,
    charger:chargerPower,inverter:inverterPower,load:measuredLoad,shoreInferred:false,
    salonTemp:num(climate.salon?.temperature),machineTemp:num(climate.forward?.temperature),
    solarLabel:solar?(solar.name||solar.entity_id):'Victron SmartSolar MPPT',
    hasVictron:Boolean(soc||voltage||current||power||solar||start||shoreEntity||shoreVoltageEntity||charger||inverter||load||freshLive()||num(directBattery.soc?.value)!==null||num(directBattery.voltage?.value)!==null)
  };
}
function fmt(v,d=0,suffix=''){return v===null?'–'+suffix:`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${suffix}`}
function setText(id,value){const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)}
function timeLabel(hours){
  if(hours===null)return '–';
  const total=Math.max(0,Math.round(hours)),days=Math.floor(total/24),rest=total%24;
  return days?`${days}d ${rest}u`:`${rest}u`;
}
function syncSharedStart(startVoltage){
  if(startVoltage===null)return;
  try{if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')technicalStateCache.startVoltage=startVoltage}catch{}
  ['techStartVoltage','liveStartVoltage','ms71510StartVoltage'].forEach(id=>setText(id,fmt(startVoltage,2,' V')));
}
function syncDashboard(s){
  if(!$('msMarineGlass'))return;
  const discharge=s.power!==null&&s.power<0?Math.abs(s.power):0;
  const load=s.load!==null?Math.max(0,s.load):discharge;
  const batteryPower=s.power;
  setText('mgSolar',fmt(s.solar,0,' W'));
  setText('mgPv',fmt(s.solar,0,' W'));
  setText('mgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'–');
  setText('mgLoad',fmt(load,0,' W'));
  setText('mgChg',fmt(s.charger,0,' W'));
  setText('mgChg2',fmt(s.charger,0,' W'));
  setText('mgInv',fmt(s.inverter,0,' W'));
  setText('mgInv2',fmt(s.inverter,0,' W'));
  setText('mgBatP',batteryPower===null?'– W':`${batteryPower>0?'+':''}${fmt(batteryPower,0,' W')}`);
  setText('mgNetPower',batteryPower===null?'– W':`${batteryPower>0?'+':''}${fmt(batteryPower,0,' W')}`);
  const flow=$('mgFlow');if(flow)flow.dataset.dir=batteryPower===null?'idle':batteryPower>15?'in':batteryPower<-15?'out':'idle';
  const shoreNode=$('msVictronShoreNode');if(shoreNode)shoreNode.classList.toggle('active',s.shore===true||(s.charger||0)>2);
  if(s.power!==null&&Math.abs(s.power)<0.5){setText('mgLoad',s.load!==null?fmt(Math.max(0,s.load),0,' W'):'0 W');setText('mgBatP','0 W');setText('mgNetPower','0 W')}
}
function render(){
  const s=read(),charge=s.power!==null&&s.power>0?s.power:0,discharge=s.power!==null&&s.power<0?Math.abs(s.power):0;
  syncSharedStart(s.start);
  syncDashboard(s);
  if(!$('msVictronEnergy'))return;
  setText('msVictronSolar',s.solar!==null?fmt(s.solar,0,' W'):(s.pvVoltage!==null?fmt(s.pvVoltage,1,' V PV'):'– W'));
  setText('msVictronSoc',fmt(s.soc,0,'%'));
  setText('msVictronVoltage',fmt(s.voltage,2,' V'));
  setText('msVictronCharger',fmt(s.charger,0,' W'));
  setText('msVictronShore',s.shore===true?'aangesloten':s.shore===false?'niet aangesloten':s.charger!==null?'lader gekoppeld':'status onbekend');
  setText('msVictronCharge',s.power===null?'– W':fmt(charge,0,' W'));
  setText('msVictronDischarge',s.power===null?'– W':fmt(discharge,0,' W'));
  setText('msVictronTime',timeLabel(s.time));
  setText('msVictronStart',fmt(s.start,2,' V'));
  setText('msVictronSalon',fmt(s.salonTemp,1,' °C'));
  setText('msVictronMachine',fmt(s.machineTemp,1,' °C'));
  setText('msVictronShoreV',s.shore===true?fmt(s.shoreV,0,' V AC'):'– V AC');
  const fill=Math.max(0,Math.min(100,s.soc||0));
  $('msVictronSocFill')?.style.setProperty('--soc',fill+'%');
  $('msVictronBatteryNode')?.classList.toggle('low',s.soc!==null&&s.soc<30);
  const solarNode=$('msVictronSolarNode'),solarFault=s.solar!==null&&s.solar<0;
  solarNode?.classList.toggle('active',s.solar!==null&&s.solar>2);
  solarNode?.classList.toggle('fault',solarFault);
  const solarMeta=solarNode?.querySelector('em');
  if(solarMeta)solarMeta.textContent=solarFault?'MEETFOUT · VICTRON SENSOR CONTROLEREN':(s.solar===null&&s.pvVoltage!==null?'MPPT-spanning · vermogen wacht':s.solarLabel);
  $('msVictronShoreNode')?.classList.toggle('active',s.shore===true||(s.charger||0)>2);
  const source=$('msVictronSource');
  if(source){source.querySelector('b').textContent=solarFault?'MEETFOUT':s.shore===true?'WALSTROOM':(s.charger||0)>2?'LADER':(s.solar||0)>2?'ZON + ACCU':s.power!==null&&s.power>2?'ACCU LADEN':'ACCU';source.classList.toggle('live',s.hasVictron&&!solarFault);source.classList.toggle('fault',solarFault)}
  setText('msVictronUpdated',(s.hasVictron?'Victron live · ':'Wacht op Victron · ')+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}));
}
function markup(){return '<section id="msVictronEnergy" class="ms-victron" aria-label="Victron energiedashboard"><div class="ms-victron-head"><div class="ms-victron-title"><span class="ms-victron-logo">V</span><h3>Victron energie<small>SERENITY · LIVE ENERGIESTROOM</small></h3></div><span id="msVictronSource" class="ms-victron-source"><i></i><b>ACCU</b></span></div><div class="ms-victron-flow"><div id="msVictronSolarNode" class="ms-victron-node ms-victron-solar"><span class="icon">☀️</span><small>ZONNEPANEEL</small><strong id="msVictronSolar">– W</strong><em>Victron SmartSolar MPPT</em><span class="ms-victron-line"></span></div><div id="msVictronBatteryNode" class="ms-victron-node ms-victron-battery"><div class="ms-victron-soc"><i id="msVictronSocFill"></i></div><small>HUISHOUDACCU\'S</small><strong id="msVictronSoc">–%</strong><em id="msVictronVoltage">– V</em></div><div id="msVictronShoreNode" class="ms-victron-node ms-victron-shore"><span class="icon">🔌</span><small>WALSTROOM / LADER</small><strong id="msVictronCharger">– W</strong><em id="msVictronShore">status onbekend</em><span class="ms-victron-line"></span></div></div><div class="ms-victron-stats"><div class="ms-victron-stat ms-victron-charge"><small>LADEN</small><strong id="msVictronCharge">– W</strong></div><div class="ms-victron-stat ms-victron-discharge"><small>ONTLADEN</small><strong id="msVictronDischarge">– W</strong></div><div class="ms-victron-stat"><small>RESTEREND</small><strong id="msVictronTime">–</strong></div><div class="ms-victron-stat"><small>STARTACCU\'S</small><strong id="msVictronStart">– V</strong></div><div class="ms-victron-stat"><small>SALON</small><strong id="msVictronSalon">– °C</strong></div><div class="ms-victron-stat"><small>MACHINEKAMER</small><strong id="msVictronMachine">– °C</strong></div><div class="ms-victron-stat"><small>WALSPANNING</small><strong id="msVictronShoreV">– V AC</strong></div></div><div class="ms-victron-actions"><button class="ms-victron-console" type="button" onclick="window.msOpenVictronConsole()">Open Cerbo GX</button><button class="ms-victron-refresh" type="button" onclick="window.msRefreshVictronEnergy(true)">↻ Vernieuwen</button></div><div class="ms-victron-foot"><span>SmartShunt · Cerbo GX · SmartSolar MPPT</span><span id="msVictronUpdated">Nog geen live meting</span></div></section>'}
function mount(){
  const host=$('technical');
  if(!host||$('msVictronEnergy'))return;
  const hero=host.querySelector('.technical-hero');
  if(hero)hero.insertAdjacentHTML('beforebegin',markup());else host.insertAdjacentHTML('afterbegin',markup());
  render();
}
function observeDashboard(){
  if(!window.MutationObserver)return;
  const ids=['mgSolar','mgPv','mgShore','mgLoad','mgChg','mgChg2','mgInv','mgInv2','mgBatP','mgNetPower'];
  const attach=()=>ids.forEach(id=>{const el=$(id);if(el&&!el.dataset.victronSyncObserved){el.dataset.victronSyncObserved='1';new MutationObserver(()=>queueMicrotask(render)).observe(el,{childList:true,characterData:true,subtree:true})}});
  attach();setInterval(attach,3000);
}
window.msRenderVictronEnergy=render;
window.msRefreshVictronEnergy=force=>refreshLiveEnergy(Boolean(force));
window.msOpenVictronConsole=function(){
  let url=localStorage.getItem('ms-victron-console-url')||'';
  if(!url){url=prompt('Vul eenmalig het lokale adres van de Cerbo GX in, bijvoorbeeld http://venus.local','http://venus.local')||'';if(!url)return;localStorage.setItem('ms-victron-console-url',url)}
  window.open(url,'_blank','noopener');
};
['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(render),{passive:true}));
window.addEventListener('focus',()=>{render();refreshLiveEnergy(false)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshLiveEnergy(false)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();observeDashboard();setTimeout(()=>refreshLiveEnergy(true),800)},{once:true});else{mount();observeDashboard();setTimeout(()=>refreshLiveEnergy(true),800)}
setInterval(render,2000);
setInterval(()=>{if(!document.hidden)refreshLiveEnergy(false)},60000);
})();
