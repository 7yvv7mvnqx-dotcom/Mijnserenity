(function(){
'use strict';
const $=id=>document.getElementById(id);
const num=value=>{const n=Number.parseFloat(String(value??'').replace(',','.').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:null};
const usable=e=>e&&!['unknown','unavailable','none',''].includes(String(e.state??'').toLowerCase());
function states(){try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot().filter(usable):[]}catch{return[]}}
function text(e){return `${e?.entity_id||''} ${e?.name||''}`.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
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
function read(){
  const t=technical(),vrm=window.MIJSERENITY_VRM_DATA?.energy||{};
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
    ['sensor.vrm_charger_power','sensor.vrm_ac_charger_power'],
    ['ac charger power','charger power','acculader vermogen','lader vermogen'],'w',
    ['solar','pv','mppt']
  );
  const tv=v=>num(v?.state);
  const vSoc=tv(soc)??num(t.houseSoc);
  const vVoltage=tv(voltage)??num(t.houseVoltage);
  const vCurrent=tv(current)??num(t.houseCurrent);
  const vPower=tv(power)??num(t.housePower)??(vVoltage!==null&&vCurrent!==null?vVoltage*vCurrent:null);
  const vSolar=tv(solar)??num(vrm.solarPower)??num(t.solarPower);
  const vStart=tv(start)??num(t.startVoltage);
  const rawShoreV=tv(shoreVoltageEntity)??num(t.shoreVoltage);
  const validShoreV=rawShoreV!==null&&rawShoreV>=80&&rawShoreV<=280?rawShoreV:null;
  let shore=bool(shoreEntity);
  if(shore===null&&validShoreV!==null)shore=validShoreV>=180;
  if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;
  const directCharger=tv(charger)??num(t.chargerPower);
  const externalCharge=vPower!==null&&vPower>0&&vSolar!==null?Math.max(0,vPower-Math.max(0,vSolar)):null;
  let chargerPower=directCharger,shoreInferred=false;
  if(chargerPower===null&&externalCharge!==null&&externalCharge>20)chargerPower=externalCharge;
  if(shore!==true&&externalCharge!==null&&externalCharge>20){shore=true;shoreInferred=true}
  return {
    soc:vSoc,voltage:vVoltage,current:vCurrent,power:vPower,time:tv(time)??num(t.houseTimeToGo),
    solar:vSolar,pvVoltage:num(vrm.pvVoltage),pvCurrent:num(vrm.pvCurrent),start:vStart,shore,shoreV:validShoreV,charger:chargerPower,shoreInferred,salonTemp:num(climate.salon?.temperature),machineTemp:num(climate.forward?.temperature),
    solarLabel:solar?(solar.name||solar.entity_id):'Victron SmartSolar MPPT',
    hasVictron:Boolean(soc||voltage||current||power||solar||start||shoreEntity||shoreVoltageEntity||charger)
  };
}
function fmt(v,d=0,suffix=''){return v===null?'–'+suffix:`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${suffix}`}
function timeLabel(hours){
  if(hours===null)return '–';
  const total=Math.max(0,Math.round(hours)),days=Math.floor(total/24),rest=total%24;
  return days?`${days}d ${rest}u`:`${rest}u`;
}
function render(){
  if(!$('msVictronEnergy'))return;
  const s=read(),charge=s.power!==null&&s.power>0?s.power:0,discharge=s.power!==null&&s.power<0?Math.abs(s.power):0;
  $('msVictronSolar').textContent=s.solar!==null?fmt(s.solar,0,' W'):(s.pvVoltage!==null?fmt(s.pvVoltage,1,' V PV'):'– W');
  $('msVictronSoc').textContent=fmt(s.soc,0,'%');
  $('msVictronVoltage').textContent=fmt(s.voltage,2,' V');
  $('msVictronCharger').textContent=s.charger!==null?fmt(s.charger,0,' W'):'– W';
  $('msVictronShore').textContent=s.shore===true?(s.shoreInferred?'lader actief · afgeleid':'aangesloten'):s.shore===false?'niet aangesloten':'niet gekoppeld';
  $('msVictronCharge').textContent=s.power===null?'– W':fmt(charge,0,' W');
  $('msVictronDischarge').textContent=s.power===null?'– W':fmt(discharge,0,' W');
  $('msVictronTime').textContent=timeLabel(s.time);
  $('msVictronStart').textContent=fmt(s.start,2,' V');
  $('msVictronSalon').textContent=fmt(s.salonTemp,1,' °C');
  $('msVictronMachine').textContent=fmt(s.machineTemp,1,' °C');
  $('msVictronShoreV').textContent=s.shore===true?fmt(s.shoreV,0,' V AC'):'– V AC';
  const fill=Math.max(0,Math.min(100,s.soc||0));
  $('msVictronSocFill').style.setProperty('--soc',fill+'%');
  $('msVictronBatteryNode').classList.toggle('low',s.soc!==null&&s.soc<30);
  const solarNode=$('msVictronSolarNode'),solarFault=s.solar!==null&&s.solar<0;
  solarNode.classList.toggle('active',s.solar!==null&&s.solar>2);
  solarNode.classList.toggle('fault',solarFault);
  const solarMeta=solarNode.querySelector('em');
  if(solarMeta)solarMeta.textContent=solarFault?'MEETFOUT · VICTRON SENSOR CONTROLEREN':(s.solar===null&&s.pvVoltage!==null?'MPPT-spanning · vermogen wacht':s.solarLabel);
  $('msVictronShoreNode').classList.toggle('active',s.shore===true||(s.charger||0)>2);
  const source=$('msVictronSource');
  source.querySelector('b').textContent=solarFault?'MEETFOUT':s.shoreInferred?'LADER':s.shore===true?'WALSTROOM':(s.solar||0)>2?'ZON + ACCU':'ACCU';
  source.classList.toggle('live',s.hasVictron&&!solarFault);
  source.classList.toggle('fault',solarFault);
  $('msVictronUpdated').textContent=(s.hasVictron?'Victron live · ':'Wacht op Victron · ')+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
}
function markup(){return '<section id="msVictronEnergy" class="ms-victron" aria-label="Victron energiedashboard"><div class="ms-victron-head"><div class="ms-victron-title"><span class="ms-victron-logo">V</span><h3>Victron energie<small>SERENITY · LIVE ENERGIESTROOM</small></h3></div><span id="msVictronSource" class="ms-victron-source"><i></i><b>ACCU</b></span></div><div class="ms-victron-flow"><div id="msVictronSolarNode" class="ms-victron-node ms-victron-solar"><span class="icon">☀️</span><small>ZONNEPANEEL</small><strong id="msVictronSolar">– W</strong><em>Victron SmartSolar MPPT</em><span class="ms-victron-line"></span></div><div id="msVictronBatteryNode" class="ms-victron-node ms-victron-battery"><div class="ms-victron-soc"><i id="msVictronSocFill"></i></div><small>HUISHOUDACCU\'S</small><strong id="msVictronSoc">–%</strong><em id="msVictronVoltage">– V</em></div><div id="msVictronShoreNode" class="ms-victron-node ms-victron-shore"><span class="icon">🔌</span><small>WALSTROOM / LADER</small><strong id="msVictronCharger">– W</strong><em id="msVictronShore">niet gekoppeld</em><span class="ms-victron-line"></span></div></div><div class="ms-victron-stats"><div class="ms-victron-stat ms-victron-charge"><small>LADEN</small><strong id="msVictronCharge">– W</strong></div><div class="ms-victron-stat ms-victron-discharge"><small>ONTLADEN</small><strong id="msVictronDischarge">– W</strong></div><div class="ms-victron-stat"><small>RESTEREND</small><strong id="msVictronTime">–</strong></div><div class="ms-victron-stat"><small>STARTACCU\'S</small><strong id="msVictronStart">– V</strong></div><div class="ms-victron-stat"><small>SALON</small><strong id="msVictronSalon">– °C</strong></div><div class="ms-victron-stat"><small>MACHINEKAMER</small><strong id="msVictronMachine">– °C</strong></div><div class="ms-victron-stat"><small>WALSPANNING</small><strong id="msVictronShoreV">– V AC</strong></div></div><div class="ms-victron-actions"><button class="ms-victron-console" type="button" onclick="window.msOpenVictronConsole()">Open Cerbo GX</button><button class="ms-victron-refresh" type="button" onclick="window.msRenderVictronEnergy()">↻ Vernieuwen</button></div><div class="ms-victron-foot"><span>SmartShunt · Cerbo GX · SmartSolar MPPT</span><span id="msVictronUpdated">Nog geen live meting</span></div></section>'}
function mount(){
  const host=$('technical');
  if(!host||$('msVictronEnergy'))return;
  const hero=host.querySelector('.technical-hero');
  if(hero)hero.insertAdjacentHTML('beforebegin',markup());else host.insertAdjacentHTML('afterbegin',markup());
  render();
}
window.msRenderVictronEnergy=render;
window.msOpenVictronConsole=function(){
  let url=localStorage.getItem('ms-victron-console-url')||'';
  if(!url){url=prompt('Vul eenmalig het lokale adres van de Cerbo GX in, bijvoorbeeld http://venus.local','http://venus.local')||'';if(!url)return;localStorage.setItem('ms-victron-console-url',url)}
  window.open(url,'_blank','noopener');
};
window.addEventListener('mijnserenity-ha-state-updated',render);
window.addEventListener('mijnserenity-vrm-updated',render);
window.addEventListener('mijnserenity-ruuvi-vrm-updated',render);
window.addEventListener('focus',render);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
setInterval(render,5000);
})();