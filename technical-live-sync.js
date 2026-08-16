/* MijnSerenity 7.15.32 — techniek uitsluitend live/automatisch */
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
  const REFRESH_MS=15000;

  let installed=false;
  let lastLive={};
  let refreshBusy=false;
  let refreshTimer=null;
  let renderBusy=false;
  let originalTechnicalWarnings=null;

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
    if(/\b(vrm|victron|cerbo|serenity|smartshunt)\b/.test(text))score+=25;
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
    const selection=savedSelection();
    return states()
      .filter(usable)
      .filter(entity=>selection[entity.entity_id]!==false)
      .filter(entity=>finite(entity.state))
      .map(entity=>{
        const text=entityText(entity);
        let score=0;
        terms.forEach((term,index)=>{
          if(text.includes(String(term).toLowerCase()))score+=40-index;
        });
        if(unit&&String(entity.attributes?.unit_of_measurement||'').toLowerCase()===unit.toLowerCase())score+=10;
        if(/vrm|victron|cerbo|serenity|smartshunt/.test(text))score+=12;
        return {entity,score};
      })
      .filter(item=>item.score>=minimumScore)
      .sort((a,b)=>b.score-a.score)[0]?.entity||null;
  }

  function readLive(){
    const diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const directBattery=diagnosis.battery||{};
    const directSolar=diagnosis.solar||{};
    const soc=exact(EXACT.soc)||
      findNumeric(['state of charge','battery soc','smartshunt soc','accu percentage','battery percentage','soc'],'%',45);
    const voltage=exact(EXACT.voltage)||
      findNumeric(['vrm voltage','smartshunt voltage','battery voltage','house battery voltage','accuspanning','accu spanning'],'V',45);
    const current=exact(EXACT.current)||
      findNumeric(['vrm current','smartshunt current','battery current','accustroom','accu stroom'],'A',45);
    const power=exact(EXACT.power)||
      findNumeric(['vrm battery power','battery power','accuvermogen','accu vermogen'],'W',45);
    const timeToGo=exact(EXACT.timeToGo)||
      findNumeric(['time to go','resterende tijd','battery runtime'],'h',45);
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
      houseSoc:number(soc?.state)??number(directBattery.soc?.value),
      houseVoltage:number(voltage?.state)??number(directBattery.voltage?.value),
      houseCurrent:number(current?.state)??number(directBattery.current?.value),
      housePower:number(power?.state)??number(directBattery.power?.value),
      houseTimeToGo:number(timeToGo?.state),
      solarPower:number(solar?.state)??number(directSolar.power?.value),
      shorePowerDetected:binaryValue(shoreEntity),
      shorePowerEntity:shoreEntity?.entity_id||'',
      shoreVoltage:number(shoreVoltage?.state),
      shoreFrequency:number(shoreFrequency?.state),
      hasVictron:Boolean(soc||voltage||current||power||timeToGo||number(directBattery.soc?.value)!==null||number(directBattery.voltage?.value)!==null),
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

  function timeLabel(hours){
    if(!finite(hours))return '–';
    const total=Math.max(0,Math.round(Number(hours)));
    const days=Math.floor(total/24);
    const remainder=total%24;
    return days?`${days}d ${remainder}u`:`${remainder}u`;
  }

  function batteryLevel(live){
    const state=currentState();
    const voltage=live.houseVoltage??number(state.houseVoltage);
    const soc=live.houseSoc??number(state.houseSoc);

    if(finite(voltage)&&typeof window.technicalBatteryStatus==='function'){
      try{
        const status=window.technicalBatteryStatus(Number(voltage),state.batteryType||'lead');
        if(status?.level==='critical')return 'critical';
        if(status?.level==='warning')return 'warning';
      }catch{}
    }else if(finite(voltage)){
      if(Number(voltage)<=11.9)return 'critical';
      if(Number(voltage)<=12.2)return 'warning';
    }

    if(finite(soc)){
      if(Number(soc)<=15)return 'critical';
      if(Number(soc)<=30)return 'warning';
    }
    return 'good';
  }

  function liveBatteryWarning(live){
    const level=batteryLevel(live);
    if(level==='good')return null;
    const voltage=live.houseVoltage;
    const soc=live.houseSoc;
    const detail=[
      finite(soc)?`${nl(soc,0)}% lading`:null,
      finite(voltage)?`${nl(voltage,2)} V`:null
    ].filter(Boolean).join(' · ');
    return {
      level,
      title:level==='critical'?'Huishoudaccu kritisch':'Huishoudaccu laag',
      text:detail||'Live Victron-meting vraagt aandacht.',
      icon:'🔋'
    };
  }

  function renderAutomaticAlerts(live){
    const container=$('technicalAlertList');
    const badge=$('technicalHealthBadge');
    if(!container&&!badge)return;

    const batteryWarning=liveBatteryWarning(live);
    if(container){
      if(batteryWarning){
        container.innerHTML=`
          <div class="technical-alert ${batteryWarning.level}">
            <span>${batteryWarning.icon}</span>
            <div><strong>${batteryWarning.title}</strong><small>${batteryWarning.text}</small></div>
          </div>`;
      }else if(live.hasVictron){
        const detail=[
          finite(live.houseSoc)?`${nl(live.houseSoc,0)}% lading`:null,
          finite(live.houseVoltage)?`${nl(live.houseVoltage,2)} V`:null
        ].filter(Boolean).join(' · ');
        container.innerHTML=`
          <div class="technical-alert good">
            <span>✅</span>
            <div><strong>Live techniek in orde</strong><small>${detail||'Victron is live gekoppeld.'}</small></div>
          </div>`;
      }else{
        container.innerHTML=`
          <div class="technical-alert info">
            <span>↻</span>
            <div><strong>Wachten op live techniek</strong><small>Geen handmatig ingevoerde waarden worden meer gebruikt.</small></div>
          </div>`;
      }
    }

    if(badge){
      const level=batteryWarning?.level||'good';
      badge.className=`technical-health-badge ${level}`;
      badge.textContent=batteryWarning
        ?(level==='critical'?'1 dringend':'1 aandachtspunt')
        :(live.hasVictron?'Live in orde':'Live wacht');
    }
  }

  function warningIsAutomatic(item){
    const title=String(item?.title||'').toLowerCase();
    if(/huishoudaccu|house battery/.test(title))return Boolean(lastLive.hasVictron);
    if(/walstroom|shore power/.test(title))return lastLive.shorePowerDetected!==null;
    if(/zonne|solar|mppt/.test(title))return lastLive.solarPower!==null;
    return false;
  }

  function installWarningFilter(){
    if(originalTechnicalWarnings||typeof window.technicalWarnings!=='function')return;
    try{
      originalTechnicalWarnings=window.technicalWarnings;
      window.technicalWarnings=function(){
        const warnings=originalTechnicalWarnings.apply(this,arguments);
        return Array.isArray(warnings)?warnings.filter(warningIsAutomatic):[];
      };
    }catch(error){
      originalTechnicalWarnings=null;
      console.warn('Automatische waarschuwingenfilter kon niet worden geplaatst:',error);
    }
  }

  function hideManualOnlyUi(){
    const snapshot=$('technicalSnapshotCard');
    if(snapshot){
      snapshot.classList.add('hidden','ms792-auto-only-hidden');
      snapshot.setAttribute('aria-hidden','true');
    }

    document.querySelectorAll('.technical-hero-actions button').forEach(button=>{
      const action=String(button.getAttribute('onclick')||'');
      if(action.includes('openTechnicalSnapshotForm')||/nieuwe momentopname/i.test(button.textContent||'')){
        button.classList.add('ms792-auto-only-hidden');
        button.hidden=true;
      }
    });

    const grid=document.querySelector('.technical-overview-grid');
    grid?.querySelectorAll('.technical-gauge').forEach(card=>{
      const isHouse=Boolean(card.querySelector('#techHouseVoltage'));
      const isEngine=Boolean(card.querySelector('#techEngineHours'));
      const isSolar=Boolean(card.querySelector('#techSolarPower'));
      const keep=isHouse||isEngine||isSolar;
      if(keep){
        card.removeAttribute('onclick');
        card.classList.remove('ms792-auto-only-hidden');
        card.hidden=false;
      }else{
        card.classList.add('ms792-auto-only-hidden');
        card.hidden=true;
      }
    });

    const maintenance=document.querySelector('.technical-maintenance-card');
    if(maintenance){
      maintenance.classList.add('ms792-auto-only-hidden');
      maintenance.hidden=true;
    }

    const hero=$('technicalHealthBadge')?.closest('.card');
    const description=hero?.querySelector('p.small');
    if(description){
      description.textContent='Alleen live en automatisch bijgewerkte technische gegevens worden getoond.';
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
    if(strong){
      if(soc!==null)strong.textContent=`${nl(soc,1)}%`;
      else if(voltage!==null)strong.textContent=`${nl(voltage,2)} V`;
      else strong.textContent='–';
    }
    if(detail){
      detail.textContent=[
        voltage!==null?`${nl(voltage,2)} V`:null,
        current!==null?`${nl(current,2)} A`:null,
        power!==null?`${nl(power,0)} W`:null
      ].filter(Boolean).join(' · ')||(live.hasVictron?'Victron live':'Nog geen live meting');
      detail.classList.toggle('ms792-live-value',live.hasVictron);
    }

    const card=strong?.closest('.technical-gauge');
    if(card){
      let runtime=$('techHouseTimeToGo');
      if(!runtime){
        runtime=document.createElement('small');
        runtime.id='techHouseTimeToGo';
        card.appendChild(runtime);
      }
      runtime.textContent=time!==null?`Resterend ${timeLabel(time)} · Victron live`:(live.hasVictron?'Victron live':'Wacht op Victron');
      runtime.classList.toggle('ms792-live-value',live.hasVictron);
    }

    const shoreStatus=$('techShorePowerStatus');
    if(shoreStatus){
      if(live.shorePowerDetected!==null){
        shoreStatus.textContent=live.shorePowerDetected?'Walstroom live aangesloten':'Walstroom live niet aangesloten';
        shoreStatus.classList.toggle('ms792-shore-on',live.shorePowerDetected===true);
      }else{
        shoreStatus.textContent='Walstroomsensor niet gekoppeld';
        shoreStatus.classList.remove('ms792-shore-on');
      }
    }

    const solar=$('techSolarPower');
    if(solar){
      solar.textContent=live.solarPower!==null?`${nl(live.solarPower,0)} W`:'– W';
      solar.classList.toggle('ms792-live-value',live.solarPower!==null);
    }
  }

  function enhanceLiveStrip(live){
    const state=currentState();
    const soc=live.houseSoc??number(state.houseSoc);
    const voltage=live.houseVoltage??number(state.houseVoltage);
    const house=$('liveHouseVoltage');
    if(house){
      house.textContent=(soc!==null||voltage!==null)
        ?[soc!==null?`${nl(soc,1)}%`:null,voltage!==null?`${nl(voltage,2)} V`:null].filter(Boolean).join(' · ')
        :'–';
      house.title=[
        live.houseCurrent!==null?`Stroom ${nl(live.houseCurrent,2)} A`:null,
        live.housePower!==null?`Vermogen ${nl(live.housePower,0)} W`:null,
        live.houseTimeToGo!==null?`Resterend ${timeLabel(live.houseTimeToGo)}`:null
      ].filter(Boolean).join(' · ');
    }

    const solarPower=live.solarPower!==null?live.solarPower:null;
    const solarStrip=$('liveSolarPower');
    if(solarStrip){
      solarStrip.textContent=solarPower!==null?`${nl(solarPower,0)} W`:'– W';
      solarStrip.classList.toggle('ms792-live-value',solarPower!==null);
    }

    const solarYield=$('liveSolarYieldPower');
    const solarYieldStatus=$('liveSolarYieldStatus');
    const solarYieldDetail=$('liveSolarYieldDetail');
    const solarYieldBar=$('liveSolarYieldBar');
    if(solarYield){
      solarYield.textContent=solarPower!==null?`${nl(solarPower,0)} W`:'– W';
      const producing=solarPower!==null&&solarPower>2;
      if(solarYieldStatus){
        solarYieldStatus.textContent=producing?'Live opbrengst':solarPower!==null?'Stand-by':'Niet gekoppeld';
        solarYieldStatus.classList.toggle('live',producing);
        solarYieldStatus.classList.toggle('standby',solarPower!==null&&!producing);
      }
      if(solarYieldDetail){
        solarYieldDetail.textContent=producing
          ?'Actueel via Victron SmartSolar / Home Assistant'
          :solarPower!==null?'MPPT gekoppeld · momenteel vrijwel geen opbrengst'
          :'Wacht op een Victron SmartSolar MPPT-sensor';
      }
      if(solarYieldBar){
        const pct=solarPower!==null?Math.max(0,Math.min(100,(Math.max(0,solarPower)/700)*100)):0;
        solarYieldBar.style.width=`${pct}%`;
      }
    }

    const shore=$('liveShorePower');
    if(shore){
      if(live.shorePowerDetected!==null){
        shore.textContent=live.shorePowerDetected?'Aan':'Uit';
        shore.classList.toggle('ms792-shore-on',live.shorePowerDetected===true);
        shore.title=live.shorePowerEntity||'Home Assistant-detectie';
      }else{
        shore.textContent='–';
        shore.classList.remove('ms792-shore-on');
        shore.title='Walstroomsensor niet gekoppeld';
      }
    }

    const updated=$('liveTechnicalUpdated');
    if(updated){
      if(live.hasVictron||live.shorePowerDetected!==null||live.solarPower!==null){
        updated.textContent=`Live ${new Date(live.syncedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
        updated.classList.add('live');
      }else{
        updated.textContent='Wacht op live data';
        updated.classList.remove('live');
      }
    }
  }

  function paint(live,{fullRender=true}={}){
    if(fullRender&&typeof window.renderTechnicalDashboard==='function'&&!renderBusy){
      renderBusy=true;
      try{
        window.renderTechnicalDashboard();
      }catch(error){
        console.warn('Techniekdashboard opnieuw tekenen mislukt:',error);
      }finally{
        renderBusy=false;
      }
    }
    enhanceDashboard(live);
    enhanceLiveStrip(live);
    hideManualOnlyUi();
    renderAutomaticAlerts(live);
  }

  function sync({render=true,fullRender=true}={}){
    lastLive=readLive();
    mergeLiveIntoTechnical(lastLive);
    installWarningFilter();
    if(render)paint(lastLive,{fullRender});
    return lastLive;
  }

  async function refreshLiveSource(){
    if(refreshBusy)return lastLive;
    refreshBusy=true;
    try{
      if(typeof window.ms730RefreshStateSnapshot==='function'){
        const connected=typeof window.ms730HomeAssistantConnected!=='function'||window.ms730HomeAssistantConnected();
        if(connected)await window.ms730RefreshStateSnapshot();
      }
    }catch(error){
      console.warn('Live techniek verversen mislukt:',error);
    }finally{
      refreshBusy=false;
    }
    return sync({render:true,fullRender:true});
  }

  function wrapFunctions(){
    const originalRender=window.renderTechnicalDashboard;
    if(typeof originalRender==='function'&&!originalRender.ms792AutoOnlyWrapped){
      const wrapped=function(){
        lastLive=readLive();
        mergeLiveIntoTechnical(lastLive);
        installWarningFilter();
        const result=originalRender.apply(this,arguments);
        enhanceDashboard(lastLive);
        enhanceLiveStrip(lastLive);
        hideManualOnlyUi();
        renderAutomaticAlerts(lastLive);
        return result;
      };
      wrapped.ms792AutoOnlyWrapped=true;
      window.renderTechnicalDashboard=wrapped;
    }

    const originalOpen=window.openTechnicalSnapshotForm;
    if(typeof originalOpen==='function'&&!originalOpen.ms792AutoOnlyWrapped){
      const blocked=function(){
        hideManualOnlyUi();
        refreshLiveSource();
        return false;
      };
      blocked.ms792AutoOnlyWrapped=true;
      window.openTechnicalSnapshotForm=blocked;
    }

    const originalLiveStrip=window.renderLiveTechnicalStrip;
    if(typeof originalLiveStrip==='function'&&!originalLiveStrip.ms792AutoOnlyWrapped){
      const wrapped=function(){
        const result=originalLiveStrip.apply(this,arguments);
        lastLive=readLive();
        mergeLiveIntoTechnical(lastLive);
        enhanceLiveStrip(lastLive);
        return result;
      };
      wrapped.ms792AutoOnlyWrapped=true;
      window.renderLiveTechnicalStrip=wrapped;
    }
  }

  function install(){
    if(installed)return;
    installed=true;
    wrapFunctions();
    installWarningFilter();
    hideManualOnlyUi();
    sync({render:true,fullRender:true});

    setTimeout(refreshLiveSource,300);
    refreshTimer=setInterval(()=>{
      if(document.visibilityState==='visible')refreshLiveSource();
    },REFRESH_MS);

    window.addEventListener('mijnserenity-ha-state-updated',()=>sync({render:true,fullRender:true}));
    window.addEventListener('mijnserenity-ha-connected',()=>setTimeout(refreshLiveSource,250));
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',()=>sync({render:true,fullRender:true}));
    window.addEventListener('focus',refreshLiveSource);
    window.addEventListener('pageshow',refreshLiveSource);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')refreshLiveSource();
    });

    window.ms792SyncTechnicalMomentSnapshot=refreshLiveSource;
    window.ms792RefreshTechnicalLive=refreshLiveSource;
    window.ms792AutomaticOnly=true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
