/* MijnSerenity 8.27.9 — techniek uitsluitend live/automatisch
   Fase 4: realtime events zijn hoofdbron; bron-tijd wordt nooit door een schermrefresh vervalst. */
(()=>{
  'use strict';

  const EXACT={
    soc:'sensor.vrm_state_of_charge',
    voltage:'sensor.vrm_voltage',
    current:'sensor.vrm_current',
    power:'sensor.vrm_battery_power',
    timeToGo:'sensor.vrm_time_to_go'
  };
  const SELECT_KEY='mijnserenity-ha-selection-v733';
  const RECOVERY_MS=5*60*1000;
  const STALE_MS=6*60*1000;

  let installed=false,refreshBusy=false,renderBusy=false;
  let lastLive={},originalWarnings=null;
  let haAt='',haHealthy=true,haError='',vrmAt='';

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const num=v=>finite(v)?Number(v):null;
  const fmt=(v,d=1)=>finite(v)?Number(v).toLocaleString('nl-NL',{maximumFractionDigits:d,minimumFractionDigits:0}):'–';
  const now=()=>new Date().toISOString();
  const ms=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:0};
  const fresh=v=>Boolean(ms(v)&&Date.now()-ms(v)<=STALE_MS);
  const latest=(...v)=>v.filter(Boolean).sort((a,b)=>ms(b)-ms(a))[0]||null;
  const time=v=>{try{return new Date(v).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}catch{return ''}};

  function markHa(){
    haAt=now();haHealthy=true;haError='';
  }
  function markVrm(detail){
    const source=detail&&typeof detail==='object'?detail:(window.MIJSERENITY_VRM_DIAGNOSTICS||{});
    vrmAt=String(source.sampledAt||source.sampled_at||'');
  }

  function states(){
    try{return typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[]}
    catch{return []}
  }
  function selection(){try{return JSON.parse(localStorage.getItem(SELECT_KEY)||'{}')||{}}catch{return {}}}
  function usable(e){return e&&!['unknown','unavailable','none',''].includes(String(e.state||'').toLowerCase())}
  function exact(id){return states().find(e=>e?.entity_id===id&&usable(e))||null}
  function text(e){return `${e?.entity_id||''} ${e?.name||''}`.toLowerCase()}
  function numeric(terms,unit='',min=25){
    const selected=selection();
    return states().filter(usable)
      .filter(e=>selected[e.entity_id]!==false&&finite(e.state))
      .map(e=>{
        const t=text(e);let score=0;
        terms.forEach((term,i)=>{if(t.includes(String(term).toLowerCase()))score+=40-i});
        if(unit&&String(e.attributes?.unit_of_measurement||'').toLowerCase()===unit.toLowerCase())score+=10;
        if(/vrm|victron|cerbo|serenity|smartshunt/.test(t))score+=12;
        return {e,score};
      }).filter(x=>x.score>=min).sort((a,b)=>b.score-a.score)[0]?.e||null;
  }
  function shoreEntity(){
    const selected=selection();
    return states().filter(usable).filter(e=>selected[e.entity_id]!==false).map(e=>{
      const t=text(e);let score=0;
      if(/\b(vrm|victron|cerbo|serenity|smartshunt)\b/.test(t))score+=25;
      if(/walstroom|landstroom|shore\s*power|shorepower/.test(t))score+=100;
      if(/ac[_\s-]*(input|in)\b/.test(t))score+=55;
      if(/mains\s+connected|netspanning\s+aanwezig/.test(t))score+=50;
      if(/grid\s+connected/.test(t)&&/vrm|victron|cerbo|serenity/.test(t))score+=45;
      if(e.domain==='binary_sensor')score+=15;
      return {e,score};
    }).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score)[0]?.e||null;
  }
  function bool(e){
    if(!e)return null;
    const v=String(e.state||'').trim().toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(v))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(v))return false;
    return null;
  }

  function readLive(){
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{},db=diag.battery||{},ds=diag.solar||{};
    const soc=exact(EXACT.soc)||numeric(['state of charge','battery soc','smartshunt soc','accu percentage','battery percentage','soc'],'%',45);
    const voltage=exact(EXACT.voltage)||numeric(['vrm voltage','smartshunt voltage','battery voltage','house battery voltage','accuspanning','accu spanning'],'V',45);
    const current=exact(EXACT.current)||numeric(['vrm current','smartshunt current','battery current','accustroom','accu stroom'],'A',45);
    const power=exact(EXACT.power)||numeric(['vrm battery power','battery power','accuvermogen','accu vermogen'],'W',45);
    const ttg=exact(EXACT.timeToGo)||numeric(['time to go','resterende tijd','battery runtime'],'h',45);
    const solar=exact('sensor.vrm_solar_charger_power')||exact('sensor.vrm_pv_power')||
      numeric(['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'W',45);
    const shore=shoreEntity();
    const shoreV=numeric(['shore voltage','walstroom spanning','ac input voltage','ac in voltage','vrm grid voltage'],'V',45);
    const shoreHz=numeric(['shore frequency','walstroom frequentie','ac input frequency','ac in frequency','vrm grid frequency'],'Hz',45);

    const direct={
      soc:num(db.soc?.value),voltage:num(db.voltage?.value),current:num(db.current?.value),
      power:num(db.power?.value),solar:num(ds.power?.value)
    };
    const haBattery=Boolean(soc||voltage||current||power||ttg);
    const vrmBattery=Object.values(direct).slice(0,4).some(v=>v!==null);
    const batterySource=haBattery?'ha':vrmBattery?'vrm':'none';
    const solarSource=solar?'ha':direct.solar!==null?'vrm':'none';
    const haFresh=haHealthy&&fresh(haAt),vrmFresh=fresh(vrmAt);
    const batteryFresh=batterySource==='ha'?haFresh:batterySource==='vrm'?vrmFresh:false;
    const solarFresh=solarSource==='ha'?haFresh:solarSource==='vrm'?vrmFresh:false;
    const shoreAvailable=Boolean(shore||shoreV||shoreHz),shoreFresh=Boolean(shoreAvailable&&haFresh);
    const syncedAt=latest(
      batteryFresh?(batterySource==='ha'?haAt:vrmAt):null,
      solarFresh?(solarSource==='ha'?haAt:vrmAt):null,
      shoreFresh?haAt:null,
      haBattery||shoreAvailable||solar?haAt:null,
      vrmBattery||direct.solar!==null?vrmAt:null
    );
    return {
      houseSoc:num(soc?.state)??direct.soc,
      houseVoltage:num(voltage?.state)??direct.voltage,
      houseCurrent:num(current?.state)??direct.current,
      housePower:num(power?.state)??direct.power,
      houseTimeToGo:num(ttg?.state),
      solarPower:num(solar?.state)??direct.solar,
      shorePowerDetected:bool(shore),shorePowerEntity:shore?.entity_id||'',
      shoreVoltage:num(shoreV?.state),shoreFrequency:num(shoreHz?.state),
      hasVictron:Boolean(haBattery||vrmBattery),batterySource,solarSource,
      batteryFresh,solarFresh,shoreFresh,haFresh,vrmFresh,
      isFresh:Boolean(batteryFresh||solarFresh||shoreFresh),syncedAt,
      sourceError:!haHealthy&&(haBattery||shoreAvailable||solar)?haError:''
    };
  }

  function current(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState()||{};
    }catch{}
    return {};
  }
  function merge(live){
    if(!live?.isFresh)return;
    const cur=current();
    const next={
      ...cur,
      ...(live.batteryFresh&&live.houseSoc!==null?{houseSoc:live.houseSoc}:{}),
      ...(live.batteryFresh&&live.houseVoltage!==null?{houseVoltage:live.houseVoltage}:{}),
      ...(live.batteryFresh&&live.houseCurrent!==null?{houseCurrent:live.houseCurrent}:{}),
      ...(live.batteryFresh&&live.housePower!==null?{housePower:live.housePower}:{}),
      ...(live.batteryFresh&&live.houseTimeToGo!==null?{houseTimeToGo:live.houseTimeToGo}:{}),
      ...(live.solarFresh&&live.solarPower!==null?{solarPower:live.solarPower}:{}),
      ...(live.shoreFresh&&live.shorePowerDetected!==null?{shorePower:live.shorePowerDetected}:{}),
      ...(live.shoreFresh&&live.shoreVoltage!==null?{shoreVoltage:live.shoreVoltage}:{}),
      ...(live.shoreFresh&&live.shoreFrequency!==null?{shoreFrequency:live.shoreFrequency}:{}),
      ...(live.shoreFresh&&live.shorePowerEntity?{shorePowerSource:live.shorePowerEntity}:{}),
      ...(live.syncedAt?{liveTechnicalAt:live.syncedAt,liveTechnicalSource:'automatic_live'}:{}),
      integrations:{
        ...(cur.integrations||{}),
        ...(live.batteryFresh||live.solarFresh?{victron:'connected'}:{}),
        ...(live.haFresh?{homeAssistant:'connected'}:{})
      }
    };
    try{
      if(typeof normaliseTechnicalState==='function')technicalStateCache=normaliseTechnicalState(next);
      else technicalStateCache=next;
    }catch(error){console.warn('Live technische waarden samenvoegen mislukt:',error)}
  }

  function summary(live){
    const groups=[];
    if(live.hasVictron)groups.push(Boolean(live.batteryFresh));
    if(live.solarPower!==null)groups.push(Boolean(live.solarFresh));
    if(live.shorePowerDetected!==null||live.shoreVoltage!==null||live.shoreFrequency!==null)groups.push(Boolean(live.shoreFresh));
    return {hasData:groups.length>0,anyFresh:groups.some(Boolean),allFresh:groups.length>0&&groups.every(Boolean),anyStale:groups.some(v=>!v)};
  }
  function batteryLevel(live){
    const v=live.houseVoltage??num(current().houseVoltage),soc=live.houseSoc??num(current().houseSoc);
    if(finite(v)&&typeof window.technicalBatteryStatus==='function'){
      try{const s=window.technicalBatteryStatus(Number(v),current().batteryType||'lead');if(s?.level==='critical'||s?.level==='warning')return s.level}catch{}
    }else if(finite(v)){if(Number(v)<=11.9)return 'critical';if(Number(v)<=12.2)return 'warning'}
    if(finite(soc)){if(Number(soc)<=15)return 'critical';if(Number(soc)<=30)return 'warning'}
    return 'good';
  }
  function batteryWarning(live){
    if(!live.batteryFresh)return null;
    const level=batteryLevel(live);if(level==='good')return null;
    return {level,title:level==='critical'?'Huishoudaccu kritisch':'Huishoudaccu laag',
      text:[finite(live.houseSoc)?`${fmt(live.houseSoc,0)}% lading`:null,finite(live.houseVoltage)?`${fmt(live.houseVoltage,2)} V`:null].filter(Boolean).join(' · ')||'Live Victron-meting vraagt aandacht.'};
  }

  function alerts(live){
    const box=$('technicalAlertList'),badge=$('technicalHealthBadge');if(!box&&!badge)return;
    const f=summary(live),warn=batteryWarning(live),stamp=live.syncedAt?time(live.syncedAt):'';
    let cls='info',title='Wachten op live techniek',detail='Geen handmatig ingevoerde waarden worden meer gebruikt.',icon='↻',badgeText='Live wacht';
    if(warn){cls=warn.level;title=warn.title;detail=warn.text;icon='🔋';badgeText=warn.level==='critical'?'1 dringend':'1 aandachtspunt'}
    else if(f.hasData&&!f.anyFresh){cls='warning';title='Live techniek niet actueel';detail=live.sourceError||`Laatste geldige bronmeting ${stamp||'onbekend'}.`;badgeText='Live niet actueel'}
    else if(f.anyStale){cls='warning';title='Live techniek deels actueel';detail=`Minstens één databron is tijdelijk niet actueel${stamp?` · laatste bronmeting ${stamp}`:''}.`;badgeText='Deels actueel'}
    else if(live.hasVictron&&live.batteryFresh){cls='good';title='Live techniek in orde';detail=[finite(live.houseSoc)?`${fmt(live.houseSoc,0)}% lading`:null,finite(live.houseVoltage)?`${fmt(live.houseVoltage,2)} V`:null].filter(Boolean).join(' · ')||'Victron is live gekoppeld.';icon='✅';badgeText='Live in orde'}
    if(box)box.innerHTML=`<div class="technical-alert ${cls}"><span>${icon}</span><div><strong>${title}</strong><small>${detail}</small></div></div>`;
    if(badge){badge.className=`technical-health-badge ${cls}`;badge.textContent=badgeText}
  }

  function automaticWarning(item){
    const t=String(item?.title||'').toLowerCase();
    if(/huishoudaccu|house battery/.test(t))return Boolean(lastLive.hasVictron&&lastLive.batteryFresh);
    if(/walstroom|shore power/.test(t))return Boolean(lastLive.shorePowerDetected!==null&&lastLive.shoreFresh);
    if(/zonne|solar|mppt/.test(t))return Boolean(lastLive.solarPower!==null&&lastLive.solarFresh);
    return false;
  }
  function installWarningFilter(){
    if(originalWarnings||typeof window.technicalWarnings!=='function')return;
    originalWarnings=window.technicalWarnings;
    window.technicalWarnings=function(){
      const list=originalWarnings.apply(this,arguments);
      return Array.isArray(list)?list.filter(automaticWarning):[];
    };
  }
  function hideManual(){
    const snap=$('technicalSnapshotCard');if(snap){snap.classList.add('hidden','ms792-auto-only-hidden');snap.setAttribute('aria-hidden','true')}
    document.querySelectorAll('.technical-hero-actions button').forEach(b=>{
      const a=String(b.getAttribute('onclick')||'');if(a.includes('openTechnicalSnapshotForm')||/nieuwe momentopname/i.test(b.textContent||'')){b.hidden=true;b.classList.add('ms792-auto-only-hidden')}
    });
    document.querySelectorAll('.technical-overview-grid .technical-gauge').forEach(card=>{
      const keep=Boolean(card.querySelector('#techHouseVoltage,#techEngineHours,#techSolarPower'));
      card.hidden=!keep;card.classList.toggle('ms792-auto-only-hidden',!keep);if(keep)card.removeAttribute('onclick');
    });
    const m=document.querySelector('.technical-maintenance-card');if(m){m.hidden=true;m.classList.add('ms792-auto-only-hidden')}
  }
  function runtime(hours){
    if(!finite(hours))return '–';const h=Math.max(0,Math.round(Number(hours))),d=Math.floor(h/24),r=h%24;return d?`${d}d ${r}u`:`${r}u`;
  }

  function enhance(live){
    const c=current(),soc=live.houseSoc??num(c.houseSoc),voltage=live.houseVoltage??num(c.houseVoltage);
    const currentA=live.houseCurrent??num(c.houseCurrent),power=live.housePower??num(c.housePower),ttg=live.houseTimeToGo??num(c.houseTimeToGo);
    const house=$('techHouseVoltage'),detail=$('techHouseBatteryStatus');
    if(house)house.textContent=soc!==null?`${fmt(soc,1)}%`:voltage!==null?`${fmt(voltage,2)} V`:'–';
    if(detail){detail.textContent=[voltage!==null?`${fmt(voltage,2)} V`:null,currentA!==null?`${fmt(currentA,2)} A`:null,power!==null?`${fmt(power,0)} W`:null].filter(Boolean).join(' · ')||(live.hasVictron?'Laatste Victron-meting':'Nog geen live meting');detail.classList.toggle('ms792-live-value',live.batteryFresh)}
    const card=house?.closest('.technical-gauge');if(card){let el=$('techHouseTimeToGo');if(!el){el=document.createElement('small');el.id='techHouseTimeToGo';card.appendChild(el)}el.textContent=ttg!==null?`Resterend ${runtime(ttg)} · ${live.batteryFresh?'Victron live':'laatste meting'}`:(live.batteryFresh?'Victron live':live.hasVictron?'Victron niet actueel':'Wacht op Victron');el.classList.toggle('ms792-live-value',live.batteryFresh)}
    const shore=$('techShorePowerStatus');if(shore){shore.textContent=live.shorePowerDetected===null?'Walstroomsensor niet gekoppeld':live.shoreFresh?(live.shorePowerDetected?'Walstroom live aangesloten':'Walstroom live niet aangesloten'):(live.shorePowerDetected?'Walstroom laatste meting: aangesloten':'Walstroom laatste meting: niet aangesloten');shore.classList.toggle('ms792-shore-on',live.shoreFresh&&live.shorePowerDetected===true)}
    const solar=$('techSolarPower');if(solar){solar.textContent=live.solarPower!==null?`${fmt(live.solarPower,0)} W`:'– W';solar.classList.toggle('ms792-live-value',live.solarFresh)}

    const stripHouse=$('liveHouseVoltage');if(stripHouse){stripHouse.textContent=(soc!==null||voltage!==null)?[soc!==null?`${fmt(soc,1)}%`:null,voltage!==null?`${fmt(voltage,2)} V`:null].filter(Boolean).join(' · '):'–';stripHouse.title=!live.batteryFresh&&live.syncedAt?`Niet actueel · laatste bronmeting ${time(live.syncedAt)}`:''}
    const stripSolar=$('liveSolarPower');if(stripSolar){stripSolar.textContent=live.solarPower!==null?`${fmt(live.solarPower,0)} W`:'– W';stripSolar.classList.toggle('ms792-live-value',live.solarFresh)}
    const liveShore=$('liveShorePower');if(liveShore){liveShore.textContent=live.shorePowerDetected===null?'–':live.shorePowerDetected?'Aan':'Uit';liveShore.classList.toggle('ms792-shore-on',live.shoreFresh&&live.shorePowerDetected===true);liveShore.title=live.shoreFresh?(live.shorePowerEntity||'Home Assistant-detectie'):`Niet actueel${live.syncedAt?` · laatste ${time(live.syncedAt)}`:''}`}
    const yieldPower=$('liveSolarYieldPower'),yieldStatus=$('liveSolarYieldStatus'),yieldDetail=$('liveSolarYieldDetail'),yieldBar=$('liveSolarYieldBar');
    if(yieldPower){yieldPower.textContent=live.solarPower!==null?`${fmt(live.solarPower,0)} W`:'– W';const producing=live.solarFresh&&live.solarPower!==null&&live.solarPower>2;if(yieldStatus){yieldStatus.textContent=!live.solarFresh&&live.solarPower!==null?'Niet actueel':producing?'Live opbrengst':live.solarPower!==null?'Stand-by':'Niet gekoppeld';yieldStatus.classList.toggle('live',producing);yieldStatus.classList.toggle('standby',live.solarFresh&&live.solarPower!==null&&!producing)}if(yieldDetail)yieldDetail.textContent=!live.solarFresh&&live.solarPower!==null?`Laatste bronmeting ${live.syncedAt?time(live.syncedAt):'onbekend'}`:producing?'Actueel via Victron SmartSolar / Home Assistant':live.solarPower!==null?'MPPT gekoppeld · momenteel vrijwel geen opbrengst':'Wacht op een Victron SmartSolar MPPT-sensor';if(yieldBar)yieldBar.style.width=`${live.solarPower!==null?Math.max(0,Math.min(100,Math.max(0,live.solarPower)/7)):0}%`}
    const updated=$('liveTechnicalUpdated');if(updated){const f=summary(live),stamp=live.syncedAt?time(live.syncedAt):'';updated.textContent=f.hasData&&f.allFresh&&stamp?`Live ${stamp}`:f.anyFresh&&f.anyStale&&stamp?`Deels live · laatste ${stamp}`:f.hasData&&stamp?`Niet actueel · laatste ${stamp}`:'Wacht op live data';updated.classList.toggle('live',f.hasData&&f.allFresh)}
    alerts(live);hideManual();
  }

  function sync({render=true,full=false}={}){
    lastLive=readLive();merge(lastLive);installWarningFilter();
    if(render){
      if(full&&typeof window.renderTechnicalDashboard==='function'&&!renderBusy){renderBusy=true;try{window.renderTechnicalDashboard()}catch(e){console.warn('Techniekdashboard opnieuw tekenen mislukt:',e)}finally{renderBusy=false}}
      enhance(lastLive);
    }
    return lastLive;
  }

  async function refresh(){
    if(refreshBusy)return lastLive;refreshBusy=true;let attempted=false;
    try{
      if(typeof window.ms730RefreshStateSnapshot==='function'){
        const connected=typeof window.ms730HomeAssistantConnected!=='function'||window.ms730HomeAssistantConnected();
        if(connected){attempted=true;await window.ms730RefreshStateSnapshot();markHa()}
      }
    }catch(error){
      if(attempted){haHealthy=false;haError=String(error?.message||'Home Assistant is tijdelijk niet bereikbaar.')}
      console.warn('Live techniek verversen mislukt:',error);
    }finally{refreshBusy=false}
    return sync({render:true,full:true});
  }

  function wrap(){
    const r=window.renderTechnicalDashboard;
    if(typeof r==='function'&&!r.ms792AutoOnlyWrapped){
      const w=function(){const result=r.apply(this,arguments);sync({render:false});enhance(lastLive);return result};w.ms792AutoOnlyWrapped=true;window.renderTechnicalDashboard=w;
    }
    const o=window.openTechnicalSnapshotForm;
    if(typeof o==='function'&&!o.ms792AutoOnlyWrapped){
      const b=function(){hideManual();refresh();return false};b.ms792AutoOnlyWrapped=true;window.openTechnicalSnapshotForm=b;
    }
    const s=window.renderLiveTechnicalStrip;
    if(typeof s==='function'&&!s.ms792AutoOnlyWrapped){
      const w=function(){const result=s.apply(this,arguments);sync({render:false});enhance(lastLive);return result};w.ms792AutoOnlyWrapped=true;window.renderLiveTechnicalStrip=w;
    }
  }

  function install(){
    if(installed)return;installed=true;wrap();installWarningFilter();hideManual();
    markVrm(window.MIJSERENITY_VRM_DIAGNOSTICS);sync({render:true,full:false});
    setTimeout(refresh,300);
    setInterval(()=>{if(document.visibilityState==='visible')refresh()},RECOVERY_MS);
    window.addEventListener('mijnserenity-ha-state-updated',()=>{markHa();sync({render:true,full:false})});
    window.addEventListener('mijnserenity-ha-connected',()=>setTimeout(refresh,250));
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',event=>{markVrm(event?.detail);sync({render:true,full:false})});
    window.addEventListener('focus',refresh);
    window.addEventListener('pageshow',refresh);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
    window.ms792SyncTechnicalMomentSnapshot=refresh;
    window.ms792RefreshTechnicalLive=refresh;
    window.ms792AutomaticOnly=true;
    window.ms792GetTechnicalLiveStatus=()=>({...lastLive,haAt:haAt||null,vrmAt:vrmAt||null,haHealthy,recoveryRefreshMs:RECOVERY_MS,staleAfterMs:STALE_MS});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
