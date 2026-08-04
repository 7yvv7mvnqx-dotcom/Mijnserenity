/* MijnSerenity 7.10.1 — live Victron- en walstroomwaarden in momentopname */
(()=>{
  'use strict';

  const EXACT={
    soc:'sensor.vrm_state_of_charge',
    voltage:'sensor.vrm_voltage',
    current:'sensor.vrm_current',
    power:'sensor.vrm_battery_power',
    timeToGo:'sensor.vrm_time_to_go'
  };
  const SELECTION_KEY='mijnserenity-ha-selection-v733';
  let installed=false;
  let lastLive={};

  const $=id=>document.getElementById(id);
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const number=value=>finite(value)?Number(value):null;
  const nl=(value,digits=1)=>finite(value)
    ?Number(value).toLocaleString('nl-NL',{maximumFractionDigits:digits,minimumFractionDigits:0})
    :'–';

  function states(){
    try{
      return typeof window.ms730GetStateSnapshot==='function'
        ?window.ms730GetStateSnapshot()
        :[];
    }catch{return []}
  }

  function savedSelection(){
    try{return JSON.parse(localStorage.getItem(SELECTION_KEY)||'{}')||{}}
    catch{return {}}
  }

  function usable(entity){
    return entity&&!['unknown','unavailable','none',''].includes(String(entity.state||'').toLowerCase());
  }

  function exact(entityId){
    return states().find(entity=>entity?.entity_id===entityId&&usable(entity))||null;
  }

  function entityText(entity){
    return `${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase();
  }

  function contextScore(entity){
    const text=entityText(entity);
    let score=0;
    if(/\b(vrm|victron|cerbo|serenity)\b/.test(text))score+=25;
    if(/walstroom|landstroom|shore\s*power|shorepower/.test(text))score+=100;
    if(/ac[_\s-]*(input|in)\b/.test(text))score+=55;
    if(/mains\s+connected|netspanning\s+aanwezig/.test(text))score+=50;
    if(/grid\s+connected/.test(text)&&/vrm|victron|cerbo|serenity/.test(text))score+=45;
    return score;
  }

  function findShoreEntity(){
    const selection=savedSelection();
    return states()
      .filter(usable)
      .filter(entity=>selection[entity.entity_id]!==false)
      .map(entity=>({entity,score:contextScore(entity)+(entity.domain==='binary_sensor'?15:0)}))
      .filter(item=>item.score>=55)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function binaryValue(entity){
    if(!entity)return null;
    const raw=String(entity.state||'').trim().toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(raw))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(raw))return false;
    return null;
  }

  function findNumeric(terms,unit='',minimumScore=25){
    return states()
      .filter(usable)
      .filter(entity=>finite(entity.state))
      .map(entity=>{
        const text=entityText(entity);
        let score=0;
        terms.forEach((term,index)=>{
          if(text.includes(String(term).toLowerCase()))score+=40-index;
        });
        if(unit&&String(entity.attributes?.unit_of_measurement||'').toLowerCase()===unit.toLowerCase())score+=10;
        if(/vrm|victron|cerbo|serenity/.test(text))score+=12;
        return {entity,score};
      })
      .filter(item=>item.score>=minimumScore)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function readLive(){
    const soc=exact(EXACT.soc);
    const voltage=exact(EXACT.voltage);
    const current=exact(EXACT.current);
    const power=exact(EXACT.power);
    const timeToGo=exact(EXACT.timeToGo);
    const solar=exact('sensor.vrm_solar_charger_power')||
      exact('sensor.vrm_pv_power')||
      findNumeric(['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'W',45);
    const shoreEntity=findShoreEntity();
    const shoreVoltage=findNumeric(
      ['shore voltage','walstroom spanning','ac input voltage','ac in voltage','vrm grid voltage'],
      'V',45
    );
    const shoreFrequency=findNumeric(
      ['shore frequency','walstroom frequentie','ac input frequency','ac in frequency','vrm grid frequency'],
      'Hz',45
    );

    return {
      houseSoc:number(soc?.state),
      houseVoltage:number(voltage?.state),
      houseCurrent:number(current?.state),
      housePower:number(power?.state),
      houseTimeToGo:number(timeToGo?.state),
      solarPower:number(solar?.state),
      shorePowerDetected:binaryValue(shoreEntity),
      shorePowerEntity:shoreEntity?.entity_id||'',
      shoreVoltage:number(shoreVoltage?.state),
      shoreFrequency:number(shoreFrequency?.state),
      hasVictron:Boolean(soc||voltage||current||power||timeToGo),
      syncedAt:new Date().toISOString()
    };
  }

  function currentState(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState();
    }catch{}
    return {};
  }

  function mergeLiveIntoTechnical(live){
    if(!live||(!live.hasVictron&&live.shorePowerDetected===null&&live.solarPower===null))return;
    try{
      const current=currentState();
      const next={
        ...current,
        ...(live.houseSoc!==null?{houseSoc:live.houseSoc}:{}),
        ...(live.houseVoltage!==null?{houseVoltage:live.houseVoltage}:{}),
        ...(live.houseCurrent!==null?{houseCurrent:live.houseCurrent}:{}),
        ...(live.housePower!==null?{housePower:live.housePower}:{}),
        ...(live.houseTimeToGo!==null?{houseTimeToGo:live.houseTimeToGo}:{}),
        ...(live.solarPower!==null?{solarPower:live.solarPower}:{}),
        ...(live.shorePowerDetected!==null?{shorePower:live.shorePowerDetected}:{}),
        shoreVoltage:live.shoreVoltage,
        shoreFrequency:live.shoreFrequency,
        shorePowerSource:live.shorePowerEntity||current.shorePowerSource||'',
        liveTechnicalAt:live.syncedAt,
        liveTechnicalSource:'home_assistant',
        integrations:{
          ...(current.integrations||{}),
          ...(live.hasVictron?{victron:'connected'}:{}),
          homeAssistant:'connected'
        }
      };
      if(typeof normaliseTechnicalState==='function')technicalStateCache=normaliseTechnicalState(next);
      else technicalStateCache=next;
    }catch(error){
      console.warn('Live technische waarden samenvoegen mislukt:',error);
    }
  }

  function ensureFormFields(){
    const section=document.querySelector('.technical-form-section[data-tech-section="battery"]');
    if(!section||$('techInputHouseSoc'))return;
    const rows=section.querySelectorAll(':scope > .row');
    const anchor=rows[0]||section.querySelector('.checkline');
    const wrapper=document.createElement('div');
    wrapper.className='ms792-live-snapshot-fields';
    wrapper.innerHTML=`
      <div class="ms792-live-snapshot-head">
        <span>🔴 LIVE VIA VICTRON / HOME ASSISTANT</span>
        <small id="techLiveSnapshotTime">Wachten op live waarden</small>
      </div>
      <div class="row">
        <div>
          <label for="techInputHouseSoc">Lading huishoudaccu %</label>
          <input id="techInputHouseSoc" type="number" min="0" max="100" step="0.1" inputmode="decimal" readonly>
        </div>
        <div>
          <label for="techInputHouseCurrent">Accustroom A</label>
          <input id="techInputHouseCurrent" type="number" step="0.01" inputmode="decimal" readonly>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="techInputHousePower">Accuvermogen W</label>
          <input id="techInputHousePower" type="number" step="1" inputmode="decimal" readonly>
        </div>
        <div>
          <label for="techInputHouseTimeToGo">Resterende tijd uur</label>
          <input id="techInputHouseTimeToGo" type="number" min="0" step="0.1" inputmode="decimal" readonly>
        </div>
      </div>`;
    if(anchor)anchor.insertAdjacentElement('afterend',wrapper);
    else section.appendChild(wrapper);

    const checkline=$('techInputShorePower')?.closest('.checkline');
    if(checkline&&!$('techShorePowerLiveNote')){
      const note=document.createElement('small');
      note.id='techShorePowerLiveNote';
      note.className='ms792-shore-note';
      note.textContent='Handmatig zolang geen walstroomsensor is gevonden.';
      checkline.insertAdjacentElement('afterend',note);
    }
  }

  function setInput(id,value,{force=false}={}){
    const input=$(id);
    if(!input||value===null||value===undefined)return;
    if(!force&&document.activeElement===input)return;
    input.value=String(value);
  }

  function timeLabel(hours){
    if(!finite(hours))return '–';
    const total=Math.max(0,Math.round(Number(hours)));
    const days=Math.floor(total/24);
    const remainder=total%24;
    return days?`${days}d ${remainder}u`:`${remainder}u`;
  }

  function updateForm(live,{force=false}={}){
    ensureFormFields();
    const form=$('technicalSnapshotCard');
    if(!form||form.classList.contains('hidden'))return;

    setInput('techInputHouseSoc',live.houseSoc,{force:true});
    setInput('techInputHouseVoltage',live.houseVoltage,{force});
    setInput('techInputHouseCurrent',live.houseCurrent,{force:true});
    setInput('techInputHousePower',live.housePower,{force:true});
    setInput('techInputHouseTimeToGo',live.houseTimeToGo,{force:true});
    if(live.solarPower!==null)setInput('techInputSolarPower',live.solarPower,{force});

    const shore=$('techInputShorePower');
    const note=$('techShorePowerLiveNote');
    if(shore){
      const detected=live.shorePowerDetected!==null;
      if(detected)shore.checked=Boolean(live.shorePowerDetected);
      shore.disabled=detected;
      shore.dataset.liveDetected=detected?'true':'false';
      if(note){
        note.textContent=detected
          ?`Automatisch gedetecteerd via ${live.shorePowerEntity}: ${live.shorePowerDetected?'AAN':'UIT'}.`
          :'Geen walstroomsensor gevonden; handmatige keuze blijft mogelijk.';
        note.classList.toggle('active',detected&&live.shorePowerDetected===true);
      }
    }

    const time=$('techLiveSnapshotTime');
    if(time){
      time.textContent=live.hasVictron
        ?`Bijgewerkt ${new Date(live.syncedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`
        :'Nog geen Victron-sensoren gevonden';
    }

    const status=$('technicalSnapshotStatus');
    if(status&&(live.hasVictron||live.shorePowerDetected!==null)){
      const parts=[];
      if(live.houseSoc!==null)parts.push(`accu ${nl(live.houseSoc,1)}%`);
      if(live.houseVoltage!==null)parts.push(`${nl(live.houseVoltage,2)} V`);
      if(live.shorePowerDetected!==null)parts.push(`walstroom ${live.shorePowerDetected?'aan':'uit'}`);
      status.textContent=`Momentopname live aangevuld: ${parts.join(' · ')}. Opslaan legt deze waarden vast.`;
      status.className='status small success';
    }
  }

  function enhanceDashboard(live){
    const state=currentState();
    const soc=live.houseSoc??number(state.houseSoc);
    const voltage=live.houseVoltage??number(state.houseVoltage);
    const current=live.houseCurrent??number(state.houseCurrent);
    const power=live.housePower??number(state.housePower);
    const time=live.houseTimeToGo??number(state.houseTimeToGo);

    const strong=$('techHouseVoltage');
    const detail=$('techHouseBatteryStatus');
    if(strong&&soc!==null)strong.textContent=`${nl(soc,1)}%`;
    if(detail&&(voltage!==null||current!==null||power!==null)){
      detail.textContent=[
        voltage!==null?`${nl(voltage,2)} V`:null,
        current!==null?`${nl(current,2)} A`:null,
        power!==null?`${nl(power,0)} W`:null
      ].filter(Boolean).join(' · ');
      detail.classList.add('ms792-live-value');
    }
    const card=strong?.closest('.technical-gauge');
    if(card){
      let runtime=$('techHouseTimeToGo');
      if(!runtime){
        runtime=document.createElement('small');
        runtime.id='techHouseTimeToGo';
        card.appendChild(runtime);
      }
      runtime.textContent=time!==null?`Resterend ${timeLabel(time)} · Victron live`:(live.hasVictron?'Victron live':'Nog niet gemeten');
      runtime.classList.toggle('ms792-live-value',live.hasVictron);
    }

    const shoreStatus=$('techShorePowerStatus');
    if(shoreStatus&&live.shorePowerDetected!==null){
      shoreStatus.textContent=live.shorePowerDetected
        ?'Walstroom live aangesloten'
        :'Walstroom live niet aangesloten';
      shoreStatus.classList.toggle('ms792-shore-on',live.shorePowerDetected===true);
    }

    const solar=$('techSolarPower');
    if(solar&&live.solarPower!==null){
      solar.textContent=`${nl(live.solarPower,0)} W`;
      solar.classList.add('ms792-live-value');
    }
  }

  function enhanceLiveStrip(live){
    const state=currentState();
    const soc=live.houseSoc??number(state.houseSoc);
    const voltage=live.houseVoltage??number(state.houseVoltage);
    const house=$('liveHouseVoltage');
    if(house&&(soc!==null||voltage!==null)){
      house.textContent=[soc!==null?`${nl(soc,1)}%`:null,voltage!==null?`${nl(voltage,2)} V`:null].filter(Boolean).join(' · ');
      house.title=[
        live.houseCurrent!==null?`Stroom ${nl(live.houseCurrent,2)} A`:null,
        live.housePower!==null?`Vermogen ${nl(live.housePower,0)} W`:null,
        live.houseTimeToGo!==null?`Resterend ${timeLabel(live.houseTimeToGo)}`:null
      ].filter(Boolean).join(' · ');
    }
    const solarIsLive=live.solarPower!==null;
    const solarPower=solarIsLive?live.solarPower:number(state.solarPower);
    const solarStrip=$('liveSolarPower');
    if(solarStrip){
      solarStrip.textContent=solarPower!==null?`${nl(solarPower,0)} W`:'– W';
      solarStrip.classList.toggle('ms792-live-value',solarIsLive);
    }
    const solarYield=$('liveSolarYieldPower');
    const solarYieldStatus=$('liveSolarYieldStatus');
    const solarYieldDetail=$('liveSolarYieldDetail');
    const solarYieldBar=$('liveSolarYieldBar');
    if(solarYield){
      solarYield.textContent=solarPower!==null?`${nl(solarPower,0)} W`:'– W';
      const producing=solarIsLive&&solarPower>2;
      const hasSavedValue=!solarIsLive&&solarPower!==null;
      if(solarYieldStatus){
        solarYieldStatus.textContent=producing?'Live opbrengst':solarIsLive?'Stand-by':hasSavedValue?'Momentopname':'Niet gekoppeld';
        solarYieldStatus.classList.toggle('live',producing);
        solarYieldStatus.classList.toggle('standby',solarIsLive&&!producing);
      }
      if(solarYieldDetail){
        solarYieldDetail.textContent=producing
          ?'Actueel via Victron SmartSolar / Home Assistant'
          :solarIsLive?'MPPT gekoppeld · momenteel vrijwel geen opbrengst'
          :hasSavedValue?'Laatst opgeslagen technische waarde · niet live'
          :'Wacht op een Victron SmartSolar MPPT-sensor';
      }
      if(solarYieldBar){
        const pct=solarPower!==null?Math.max(0,Math.min(100,(Math.max(0,solarPower)/700)*100)):0;
        solarYieldBar.style.width=`${pct}%`;
      }
    }

    const shore=$('liveShorePower');
    if(shore&&live.shorePowerDetected!==null){
      shore.textContent=live.shorePowerDetected?'Aan':'Uit';
      shore.classList.toggle('ms792-shore-on',live.shorePowerDetected===true);
      shore.title=live.shorePowerEntity||'Home Assistant-detectie';
    }
    const updated=$('liveTechnicalUpdated');
    if(updated&&(live.hasVictron||live.shorePowerDetected!==null)){
      updated.textContent=`Live ${new Date(live.syncedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
      updated.classList.add('live');
    }
  }

  function sync({forceForm=false,render=true}={}){
    lastLive=readLive();
    mergeLiveIntoTechnical(lastLive);
    updateForm(lastLive,{force:forceForm});
    if(render){
      enhanceDashboard(lastLive);
      enhanceLiveStrip(lastLive);
    }
    return lastLive;
  }

  function storeExtraInputs(){
    try{
      const state=currentState();
      const read=id=>number($(id)?.value);
      const next={
        ...state,
        houseSoc:read('techInputHouseSoc')??state.houseSoc??null,
        houseCurrent:read('techInputHouseCurrent')??state.houseCurrent??null,
        housePower:read('techInputHousePower')??state.housePower??null,
        houseTimeToGo:read('techInputHouseTimeToGo')??state.houseTimeToGo??null,
        shorePowerSource:lastLive.shorePowerEntity||state.shorePowerSource||'',
        shoreVoltage:lastLive.shoreVoltage??state.shoreVoltage??null,
        shoreFrequency:lastLive.shoreFrequency??state.shoreFrequency??null,
        liveTechnicalAt:lastLive.syncedAt||state.liveTechnicalAt||null
      };
      technicalStateCache=typeof normaliseTechnicalState==='function'?normaliseTechnicalState(next):next;
    }catch(error){
      console.warn('Extra momentopnamevelden bewaren mislukt:',error);
    }
  }

  function wrapFunctions(){
    const originalFill=window.fillTechnicalSnapshotForm;
    if(typeof originalFill==='function'){
      window.fillTechnicalSnapshotForm=function(){
        const result=originalFill.apply(this,arguments);
        sync({forceForm:true,render:true});
        return result;
      };
    }

    const originalOpen=window.openTechnicalSnapshotForm;
    if(typeof originalOpen==='function'){
      window.openTechnicalSnapshotForm=function(){
        const result=originalOpen.apply(this,arguments);
        sync({forceForm:true,render:true});
        if(typeof window.ms730HomeAssistantConnected==='function'&&window.ms730HomeAssistantConnected()&&typeof window.ms730RefreshStateSnapshot==='function'){
          window.ms730RefreshStateSnapshot().then(()=>sync({forceForm:true,render:true})).catch(()=>{});
        }
        return result;
      };
    }

    const originalSave=window.saveTechnicalSnapshot;
    if(typeof originalSave==='function'){
      window.saveTechnicalSnapshot=async function(){
        sync({forceForm:true,render:false});
        storeExtraInputs();
        const result=await originalSave.apply(this,arguments);
        enhanceDashboard(lastLive);
        enhanceLiveStrip(lastLive);
        return result;
      };
    }

    const originalRender=window.renderTechnicalDashboard;
    if(typeof originalRender==='function'){
      window.renderTechnicalDashboard=function(){
        const result=originalRender.apply(this,arguments);
        enhanceDashboard(lastLive=readLive());
        return result;
      };
    }

    const originalLiveStrip=window.renderLiveTechnicalStrip;
    if(typeof originalLiveStrip==='function'){
      window.renderLiveTechnicalStrip=function(){
        const result=originalLiveStrip.apply(this,arguments);
        enhanceLiveStrip(lastLive=readLive());
        return result;
      };
    }
  }

  function install(){
    if(installed)return;
    installed=true;
    ensureFormFields();
    wrapFunctions();
    sync({render:true});
    window.addEventListener('mijnserenity-ha-state-updated',()=>sync({render:true}));
    window.addEventListener('mijnserenity-ha-connected',()=>setTimeout(()=>{
      if(typeof window.ms730RefreshStateSnapshot==='function'){
        window.ms730RefreshStateSnapshot().then(()=>sync({forceForm:true,render:true})).catch(()=>{});
      }
    },350));
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')sync({render:true});
    });
    window.ms792SyncTechnicalMomentSnapshot=()=>sync({forceForm:true,render:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
