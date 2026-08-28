/* MijnSerenity 7.19.1 — Serenity Victron Live
   Eén live energiescherm. Oude Energie/Accuconditie-kaarten blijven technisch
   beschikbaar als databron, maar worden niet meer dubbel aan de gebruiker getoond. */
(()=>{
  'use strict';
  if(window.__msVictronEnergy71910)return;
  window.__msVictronEnergy71910=true;

  const $=id=>document.getElementById(id);
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let liveBusy=false,lastLiveAttempt=0,refreshTimer=0,renderFrame=0,mounted=false,lastPaintAt=0;

  const num=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const finite=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
  const usable=entity=>entity&&!['unknown','unavailable','none',''].includes(String(entity.state??'').toLowerCase());
  const fmt=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`;
  const signed=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value)>0?'+':''}${fmt(value,digits,suffix)}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function states(){try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot().filter(usable):[]}catch{return []}}
  function text(entity){return `${entity?.entity_id||''} ${entity?.attributes?.friendly_name||''} ${entity?.name||''}`.toLowerCase()}
  function unit(entity){return String(entity?.attributes?.unit_of_measurement||'').toLowerCase()}
  function exact(ids){const list=states();for(const id of ids){const found=list.find(entity=>entity.entity_id===id);if(found)return found}return null}
  function find(terms,wantedUnit='',exclude=[]){
    return states().map(entity=>{const hay=text(entity);let score=0;terms.forEach((term,index)=>{if(hay.includes(term))score+=50-index});if(wantedUnit&&unit(entity)===wantedUnit.toLowerCase())score+=12;if(exclude.some(term=>hay.includes(term)))score=-1000;return {entity,score}}).filter(item=>item.score>=48).sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }
  function pick(ids,terms,wantedUnit='',exclude=[]){return exact(ids)||find(terms,wantedUnit,exclude)}
  function entityNumber(entity){return usable(entity)?num(entity.state):null}
  function bool(entity){if(!entity)return null;const value=String(entity.state||'').toLowerCase();if(['on','connected','true','1','yes','active','aan','present','detected'].includes(value))return true;if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(value))return false;return null}
  function technical(){try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:(typeof readTechnicalLocalState==='function'?readTechnicalLocalState()||{}:{})}catch{return {}}}
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  function token(){for(const key of TOKEN_KEYS){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}try{const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}return ''}
  function live(){const data=window.MIJSERENITY_VRM_LIVE_ENERGY;if(!data||typeof data!=='object')return {};const at=Date.parse(String(data.sampledAt||''));if(Number.isFinite(at)&&Date.now()-at>180000)return {};return data}
  function safeStart(value){return finite(value)&&Number(value)>=9&&Number(value)<=16.8?Number(value):null}

  function snapshot(){
    const t=technical(),diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{},directBattery=diagnosis.battery||{},directSolar=diagnosis.solar||{},directAc=diagnosis.ac||{},liveData=live(),liveAc=liveData.ac||{};
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
    const dcLoad=pick(['sensor.vrm_dc_load_power','sensor.vrm_dc_system_power','sensor.vrm_dc_consumption_power'],['dc load power','dc system power','dc consumption power','dc verbruik'],'w',['battery','solar','charger']);

    const vSoc=entityNumber(soc)??num(directBattery.soc?.value)??num(t.houseSoc);
    const vVoltage=entityNumber(voltage)??num(directBattery.voltage?.value)??num(t.houseVoltage);
    const vCurrent=entityNumber(current)??num(directBattery.current?.value)??num(t.houseCurrent);
    const vPower=entityNumber(power)??num(directBattery.power?.value)??num(t.housePower)??(vVoltage!==null&&vCurrent!==null?vVoltage*vCurrent:null);
    const vSolar=entityNumber(solar)??num(directSolar.power?.value)??num(t.solarPower);
    const startCandidates=[num(directBattery.starterVoltage?.value),entityNumber(start),num(t.startVoltage)];
    const vStart=startCandidates.map(safeStart).find(v=>v!==null)??null;
    const rawShoreV=entityNumber(shoreVoltage)??num(liveAc.inputVoltage)??num(directAc.inputVoltage)??num(t.shoreVoltage);
    const validShoreV=finite(rawShoreV)&&rawShoreV>=80&&rawShoreV<=280?Number(rawShoreV):null;
    let shore=bool(shoreEntity);if(shore===null&&typeof liveAc.shoreConnected==='boolean')shore=liveAc.shoreConnected;if(shore===null&&typeof directAc.shoreConnected==='boolean')shore=directAc.shoreConnected;if(shore===null&&validShoreV!==null)shore=validShoreV>=180;if(shore===null&&t.shorePower===true)shore=true;
    return {soc:vSoc,voltage:vVoltage,current:vCurrent,power:vPower,solar:vSolar,start:vStart,shore,shoreV:validShoreV,charger:entityNumber(charger)??num(liveAc.chargerPower)??num(directAc.chargerPower)??num(t.chargerPower),inverter:entityNumber(inverter)??num(liveAc.inverterPower)??num(directAc.inverterPower)??num(t.inverterPower),load:entityNumber(loadEntity)??num(liveAc.loadPower)??num(directAc.loadPower)??num(t.loadPower),dcLoad:entityNumber(dcLoad),inputA:num(liveAc.inputCurrent)??num(directAc.inputCurrent),inputW:num(liveAc.inputPower)??num(directAc.inputPower),outputW:num(liveAc.outputPower)??num(directAc.outputPower),dcV:num(liveAc.dcVoltage)??num(directAc.dcVoltage)??vVoltage,dcA:num(liveAc.dcCurrent)??num(directAc.dcCurrent)??vCurrent,sampledAt:liveData.sampledAt||t.liveTechnicalAt||t.liveTankSources?.updatedAt||''};
  }

  function markup(){return `
    <div id="msMarineGlass" aria-label="Serenity Victron Live">
      <div class="mg-live-head">
        <div class="mg-brand"><span class="mg-boat" aria-hidden="true">🛥️</span><span class="mg-brand-copy"><strong>SERENITY</strong><small>Victron Live</small></span></div>
        <span id="mgLivePill" class="mg-live-pill"><i></i> LIVE</span>
      </div>
      <div class="mg-main">
        <div class="mg-mini solar"><small>☀️ Zonne-energie</small><strong id="mgSolar">– W</strong><em id="mgSolarMeta">MPPT</em></div>
        <div class="mg-battery"><div id="mgSocRing" class="mg-ring"><div class="mg-ring-copy"><small>HUISHOUDACCU</small><strong><b id="mgSoc">–</b><span>%</span></strong><b id="mgVolt">– V</b><em><span id="mgAmp">– A</span> · <span id="mgBatP">– W</span></em><span id="mgBatteryMode" class="mg-charge-pill">⚡ Live</span></div></div></div>
        <div class="mg-mini use"><small>💡 Verbruik</small><strong id="mgLoad">– W</strong><em id="mgLoadMeta">Actueel</em></div>
        <div class="mg-mini shore"><small>🔌 Walstroom</small><strong id="mgShore">–</strong><em id="mgShoreMeta">Sensor wordt gelezen</em></div>
        <div class="mg-mini dc"><small>☷ DC-verbruik</small><strong id="mgDcLoad">– W</strong><em id="mgDcMeta">12 V boordnet</em></div>
      </div>
      <div class="mg-three">
        <div class="mg-info-card start"><small><span class="mg-icon">🔋</span>Startaccu</small><strong id="mgStartVoltage">– V</strong><span id="mgStartState" class="state">Wachten op meting</span></div>
        <div class="mg-info-card fuel"><small><span class="mg-icon">⛽</span>Dieseltank</small><strong id="mg-fuel">–%</strong><em id="mg-fuel-l">– L</em><div class="mg-level-bar"><i id="mg-fuel-bar"></i></div></div>
        <div class="mg-info-card water"><small><span class="mg-icon">💧</span>Watertank</small><strong id="mg-water">–%</strong><em id="mg-water-l">Live Cerbo</em><div class="mg-level-bar"><i id="mg-water-bar"></i></div></div>
      </div>
      <div class="mg-systems">
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">🔷</span><div><small>MultiPlus-II</small><strong id="mgMultiState">Stand-by</strong><em id="mgInv">– W</em></div></div></div>
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">⚡</span><div><small>Laadstatus</small><strong id="mgChargeState">Lader uit</strong><em id="mgChg">– W</em></div></div></div>
      </div>
      <div id="mgFlow" class="mg-flow-card" data-dir="idle">
        <div class="mg-flow-node"><small>☀️ PV</small><strong id="mgPv">– W</strong></div><span class="mg-flow-arrow">→</span>
        <div class="mg-flow-node"><small>🔋 Accu</small><strong id="mgNetPower">– W</strong></div><span class="mg-flow-arrow">→</span>
        <div class="mg-flow-node"><small>💡 Verbruikers</small><strong id="mgLoadFlow">– W</strong></div>
      </div>
      <div id="mgHiddenCompat" hidden><span id="mgChg2"></span><span id="mgInv2"></span><span id="mg-waste"></span><span id="mg-waste-l"></span><i id="mg-waste-bar"></i></div>
      <div id="mgFoot" class="mg-foot"><i></i><span id="mgUpdated">Laatst bijgewerkt: wachten op Cerbo GX</span></div>
    </div>`}

  function mount(){
    const host=$('msVictronEnergy');
    if(!host)return false;
    if(!$('msMarineGlass'))host.innerHTML=markup();
    host.classList.add('ms-victron-live-host');
    mounted=true;
    cleanLegacy();
    window.dispatchEvent(new CustomEvent('mijnserenity-victron-live-mounted'));
    return true;
  }

  function hideCardById(id){const el=$(id);if(!el||el.closest('#msVictronEnergy'))return;const card=el.closest('.technical-gauge,.technical-card,.card');if(card)card.classList.add('ms-victron-legacy-hidden')}
  function cleanLegacy(){
    const diagnosis=$('msVictronDiagnosis');if(diagnosis){diagnosis.hidden=true;diagnosis.setAttribute('aria-hidden','true')}
    ['techHouseVoltage','techSolarPower','techStartVoltage','techShorePowerStatus','techFuelLevel','techWaterLevel'].forEach(hideCardById);
    document.querySelectorAll('#technical .ms-vrm-diagnosis-actions button').forEach(button=>{button.hidden=true});
  }

  function ageLabel(value){const at=Date.parse(String(value||''));if(!Number.isFinite(at))return 'zojuist';const sec=Math.max(0,Math.round((Date.now()-at)/1000));if(sec<5)return '1 sec geleden';if(sec<60)return `${sec} sec geleden`;const min=Math.round(sec/60);return `${min} min geleden`}
  function startState(v){if(!finite(v))return ['Wachten op meting',''];if(v>=13.2)return ['Laden','good'];if(v>=12.2)return ['OK','good'];if(v>=12)return ['Laag','warn'];return ['Controleren','bad']}
  function multiState(s){if(finite(s.charger)&&s.charger>5)return ['Laden','Lader aan'];if(finite(s.inverter)&&Math.abs(s.inverter)>5)return ['Omvormen','Lader uit'];if(s.shore===true)return ['Walstroom','Lader stand-by'];return ['Stand-by','Lader uit']}

  function render(){
    if(!mount())return;
    const s=snapshot();lastPaintAt=Date.now();
    const soc=finite(s.soc)?Math.max(0,Math.min(100,Number(s.soc))):null;
    set('mgSoc',soc===null?'–':fmt(soc,0,''));set('mgVolt',fmt(s.voltage,2,' V'));set('mgAmp',signed(s.current,2,' A'));set('mgBatP',signed(s.power,0,' W'));
    const ring=$('mgSocRing');if(ring)ring.style.setProperty('--p',soc===null?0:soc);
    set('mgSolar',fmt(s.solar,0,' W'));set('mgPv',fmt(s.solar,0,' W'));
    const load=s.load!==null?s.load:(s.power!==null&&s.power<0?Math.abs(s.power):null);set('mgLoad',fmt(load,0,' W'));set('mgLoadFlow',fmt(load,0,' W'));
    set('mgShore',s.shore===true?'AAN':s.shore===false?'UIT':'–');const shoreEl=$('mgShore');if(shoreEl){shoreEl.classList.toggle('good',s.shore===true);shoreEl.classList.toggle('warn',s.shore===false)}
    set('mgShoreMeta',[finite(s.shoreV)?fmt(s.shoreV,0,' V'):null,finite(s.inputA)?fmt(s.inputA,1,' A'):null].filter(Boolean).join(' · ')||(s.shore===null?'Walstroomsensor niet gekoppeld':'Cerbo GX'));
    const estimatedDc=s.dcLoad!==null?s.dcLoad:(s.load===null&&finite(s.dcV)&&finite(s.dcA)?Math.max(0,Math.abs(s.dcV*s.dcA)):null);set('mgDcLoad',fmt(estimatedDc,0,' W'));set('mgDcMeta',finite(s.dcV)?`${fmt(s.dcV,1,' V')}${finite(s.dcA)?` · ${fmt(Math.abs(s.dcA),1,' A')}`:''}`:'12 V boordnet');
    set('mgStartVoltage',fmt(s.start,2,' V'));const [startLabel,startClass]=startState(s.start);set('mgStartState',startLabel);const startEl=$('mgStartState');if(startEl)startEl.className=`state ${startClass}`.trim();
    const [multi,charge]=multiState(s);set('mgMultiState',multi);set('mgChargeState',charge);set('mgInv',fmt(s.inverter,0,' W'));set('mgInv2',fmt(s.inverter,0,' W'));set('mgChg',fmt(s.charger,0,' W'));set('mgChg2',fmt(s.charger,0,' W'));
    const mode=$('mgBatteryMode');if(mode)mode.textContent=s.power>5?'⚡ Laden':s.power<-5?'⚡ Ontladen':'⚡ Stand-by';
    set('mgNetPower',signed(s.power,0,' W'));const flow=$('mgFlow');if(flow)flow.dataset.dir=s.power===null?'idle':s.power>10?'in':s.power<-10?'out':'idle';
    const hasData=[s.soc,s.voltage,s.solar,s.start,s.shoreV].some(finite)||s.shore!==null;const livePill=$('mgLivePill'),foot=$('mgFoot');if(livePill){livePill.classList.toggle('offline',!hasData);livePill.lastChild.textContent=hasData?' LIVE':' WACHT'}if(foot)foot.classList.toggle('offline',!hasData);
    set('mgUpdated',hasData?`Laatst bijgewerkt: ${ageLabel(s.sampledAt)} · Cerbo GX`:'Laatst bijgewerkt: wachten op Cerbo GX');
    cleanLegacy();
  }

  function queueRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}
  async function refreshLiveEnergy(force=false){
    if(liveBusy)return false;if(!force&&Date.now()-lastLiveAttempt<55000)return false;const supabase=client(),activeBoat=boat(),activeUser=user(),vrmToken=token();if(!supabase||!activeBoat?.id||!activeUser||!vrmToken)return false;liveBusy=true;lastLiveAttempt=Date.now();
    try{const {data,error}=await supabase.functions.invoke('victron-energy-live',{body:{boatId:activeBoat.id},headers:{'x-vrm-token':vrmToken}});if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');window.MIJSERENITY_VRM_LIVE_ENERGY=data;window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));queueRender();return true}catch(error){console.warn('Victron live energie kon niet worden vernieuwd:',error);return false}finally{liveBusy=false}
  }

  window.msRenderVictronEnergy=queueRender;window.msRefreshVictronEnergy=force=>refreshLiveEnergy(Boolean(force));
  window.msOpenVictronConsole=()=>{let url=localStorage.getItem('ms-victron-console-url')||'';if(!url){url=window.prompt?.('Plak het beveiligde Cerbo GX / VRM Remote Console-adres:','')||'';if(url)try{localStorage.setItem('ms-victron-console-url',url)}catch{}}if(url)window.open(url,'_blank','noopener,noreferrer')};

  const events=['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated','mijnserenity:dashboard-ready','mijnserenity-victron-live-mounted'];
  events.forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  window.addEventListener('mijnserenity-ha-connected',()=>refreshLiveEnergy(false),{passive:true});
  window.addEventListener('focus',()=>{queueRender();refreshLiveEnergy(false)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLiveEnergy(false)}},{passive:true});

  function start(){mount();queueRender();setTimeout(()=>{mount();queueRender();refreshLiveEnergy(true)},500);setTimeout(()=>{mount();queueRender()},1600);refreshTimer=setInterval(()=>{if(!document.hidden){queueRender();refreshLiveEnergy(false)}},60000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
