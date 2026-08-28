/* MijnSerenity 7.19.2 — Serenity Victron Live
   Vervangt de zichtbare oude "Energie & Stroom" kaart op zijn echte plek.
   Blijft opnieuw mounten als een oudere dashboard-render de legacy kaart terugzet. */
(()=>{
  'use strict';
  if(window.__msVictronEnergy71920)return;
  window.__msVictronEnergy71920=true;

  const $=id=>document.getElementById(id);
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let liveBusy=false,lastLiveAttempt=0,renderFrame=0,observer=null,remountTimer=0,selfChange=false;

  const num=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const finite=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
  const fmt=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`;
  const signed=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value)>0?'+':''}${fmt(value,digits,suffix)}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function states(){
    try{
      const list=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      return Array.isArray(list)?list.filter(e=>e&&!['unknown','unavailable','none',''].includes(String(e.state??'').toLowerCase())):[];
    }catch{return []}
  }
  function entityText(e){return `${e?.entity_id||''} ${e?.attributes?.friendly_name||''} ${e?.name||''}`.toLowerCase()}
  function entityUnit(e){return String(e?.attributes?.unit_of_measurement||'').toLowerCase()}
  function exact(ids){const list=states();for(const id of ids){const found=list.find(e=>e.entity_id===id);if(found)return found}return null}
  function findMetric(terms,unit='',exclude=[]){
    return states().map(e=>{
      const hay=entityText(e);let score=0;
      terms.forEach((term,index)=>{if(hay.includes(term))score+=60-index});
      if(unit&&entityUnit(e)===unit.toLowerCase())score+=15;
      if(exclude.some(term=>hay.includes(term)))score=-9999;
      return {e,score};
    }).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score)[0]?.e||null;
  }
  function metric(ids,terms,unit='',exclude=[]){const e=exact(ids)||findMetric(terms,unit,exclude);return e?num(e.state):null}
  function boolEntity(ids,terms){
    const e=exact(ids)||findMetric(terms,'',[]);if(!e)return null;
    const v=String(e.state??'').toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(v))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(v))return false;
    return null;
  }
  function technical(){try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:(typeof readTechnicalLocalState==='function'?readTechnicalLocalState()||{}:{})}catch{return {}}}
  function live(){
    const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!data||typeof data!=='object')return {};
    const at=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(at)&&Date.now()-at>180000)return {};
    return data;
  }
  function safeStart(value){return finite(value)&&Number(value)>=9&&Number(value)<=16.8?Number(value):null}

  function snapshot(){
    const t=technical();
    const diagnosis=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const battery=diagnosis.battery||{},solarDiag=diagnosis.solar||{},acDiag=diagnosis.ac||{};
    const liveData=live(),ac=liveData.ac||{};

    const soc=metric(['sensor.vrm_state_of_charge'],['state of charge','smartshunt soc','battery soc'],'%')??num(battery.soc?.value)??num(t.houseSoc);
    const voltage=metric(['sensor.vrm_voltage'],['vrm voltage','smartshunt voltage','house battery voltage','huishoudaccu spanning'],'v',['starter','startaccu','aux'])??num(battery.voltage?.value)??num(t.houseVoltage);
    const current=metric(['sensor.vrm_current'],['vrm current','smartshunt current','battery current','accustroom'],'a',['starter','startaccu','aux'])??num(battery.current?.value)??num(t.houseCurrent);
    const power=metric(['sensor.vrm_battery_power'],['vrm battery power','smartshunt power','battery power','accuvermogen'],'w',['solar','pv','mppt','charger'])??num(battery.power?.value)??num(t.housePower)??(finite(voltage)&&finite(current)?Number(voltage)*Number(current):null);
    const solar=metric(['sensor.vrm_solar_charger_power','sensor.vrm_pv_power'],['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'w',['battery','load','voltage','current'])??num(solarDiag.power?.value)??num(t.solarPower);

    const rawStart=[
      num(battery.starterVoltage?.value),
      metric(['sensor.vrm_starter_battery_voltage','sensor.vrm_start_battery_voltage','sensor.vrm_auxiliary_battery_voltage','sensor.vrm_aux_voltage'],['starter battery voltage','start battery voltage','startaccu spanning','aux voltage'],'v',['house','huishoud']),
      num(t.startVoltage)
    ];
    const start=rawStart.map(safeStart).find(v=>v!==null)??null;

    let shore=boolEntity(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected'],['shore power','walstroom','ac input connected','grid connected']);
    const shoreV=metric(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage'],['ac input voltage','shore voltage','walstroom spanning','grid voltage'],'v',['battery','dc','starter'])??num(ac.inputVoltage)??num(acDiag.inputVoltage)??num(t.shoreVoltage);
    if(shore===null&&typeof ac.shoreConnected==='boolean')shore=ac.shoreConnected;
    if(shore===null&&typeof acDiag.shoreConnected==='boolean')shore=acDiag.shoreConnected;
    if(shore===null&&finite(shoreV)&&Number(shoreV)>=180&&Number(shoreV)<=280)shore=true;
    if(shore===null&&typeof t.shorePower==='boolean')shore=t.shorePower;

    const charger=metric(['sensor.vrm_charger_power','sensor.vrm_ac_charger_power'],['charger power','acculader vermogen','lader vermogen'],'w',['solar','pv','mppt','inverter'])??num(ac.chargerPower)??num(acDiag.chargerPower)??num(t.chargerPower);
    const inverter=metric(['sensor.vrm_inverter_power','sensor.vrm_inverter_output_power','sensor.vrm_ac_output_power'],['inverter power','omvormer vermogen','ac output power'],'w',['solar','charger','lader'])??num(ac.inverterPower)??num(acDiag.inverterPower)??num(t.inverterPower);
    const explicitLoad=metric(['sensor.vrm_ac_load_power','sensor.vrm_load_power','sensor.vrm_consumption_power'],['ac load power','load power','consumption power','verbruik vermogen'],'w',['solar','charger','battery'])??num(ac.loadPower)??num(acDiag.loadPower)??num(t.loadPower);
    const load=finite(explicitLoad)?Math.abs(Number(explicitLoad)):(finite(power)&&Number(power)<0?Math.abs(Number(power)):null);
    const dcLoad=metric(['sensor.vrm_dc_load_power','sensor.vrm_dc_system_power','sensor.vrm_dc_consumption_power'],['dc load power','dc system power','dc consumption power','dc verbruik'],'w',['battery','solar','charger']);

    const tanks=window.MIJSERENITY_TANK_LIVE||{};
    const fuel=num(tanks.fuel?.value)??num(t.fuelPct);
    const water=num(tanks.water?.value)??num(t.waterPct);
    const fuelCapacity=num(t.fuelCapacityLiters)??num(t.fuelCapacityL)??360;
    const fuelLiters=num(t.fuelLiters)??(finite(fuel)&&finite(fuelCapacity)?Math.round(Number(fuelCapacity)*Number(fuel)/100):null);

    let climate=null;try{climate=typeof window.ms7102GetRuuviClimate==='function'?window.ms7102GetRuuviClimate():null}catch{}
    const vrmClimate=window.MIJSERENITY_VRM_DATA||{};
    const salon=climate?.salon||{},machine=climate?.forward||climate?.machinekamer||{};

    return {
      soc,voltage,current,power,solar,start,shore,shoreV,charger,inverter,load,
      dcLoad:finite(dcLoad)?Math.abs(Number(dcLoad)):load,
      fuel,water,fuelLiters,
      salonTemp:num(salon.temperature)??num(vrmClimate.salon?.temperature),
      salonHum:num(salon.humidity)??num(vrmClimate.salon?.humidity),
      machineTemp:num(machine.temperature)??num(vrmClimate.machinekamer?.temperature)??num(vrmClimate.forward?.temperature),
      machineHum:num(machine.humidity)??num(vrmClimate.machinekamer?.humidity)??num(vrmClimate.forward?.humidity),
      sampledAt:liveData.sampledAt||t.liveTechnicalAt||t.liveTankSources?.updatedAt||''
    };
  }

  function markup(){return `
    <div id="msMarineGlass" data-ms-victron-live="7192" aria-label="Serenity Victron Live">
      <div class="mg-live-head">
        <div class="mg-brand"><span class="mg-boat" aria-hidden="true">🛥️</span><span class="mg-brand-copy"><strong>SERENITY</strong><small>Victron Live</small></span></div>
        <span id="mgLivePill" class="mg-live-pill"><i></i> LIVE</span>
      </div>
      <div class="mg-main">
        <div class="mg-mini solar"><small>☀️ Zonne-energie</small><strong id="mgSolar">– W</strong><em id="mgSolarMeta">SmartSolar MPPT</em></div>
        <div class="mg-battery"><div id="mgSocRing" class="mg-ring"><div class="mg-ring-copy"><small>HUISHOUDACCU</small><strong><b id="mgSoc" style="font:inherit;color:inherit">–</b><span>%</span></strong><b id="mgVolt">– V</b><em><span id="mgAmp">– A</span> · <span id="mgBatP">– W</span></em><span id="mgBatteryMode" class="mg-charge-pill">⚡ Live</span></div></div></div>
        <div class="mg-mini use"><small>💡 Verbruik</small><strong id="mgLoad">– W</strong><em id="mgLoadMeta">Actueel boordnet</em></div>
        <div class="mg-mini shore"><small>🔌 Walstroom</small><strong id="mgShore">–</strong><em id="mgShoreMeta">Cerbo / MultiPlus</em></div>
        <div class="mg-mini dc"><small>☷ DC-verbruik</small><strong id="mgDcLoad">– W</strong><em id="mgDcMeta">12 V boordnet</em></div>
      </div>
      <div class="mg-three">
        <div class="mg-info-card start"><small><span class="mg-icon">🔋</span>Startaccu</small><strong id="mgStartVoltage">– V</strong><span id="mgStartState" class="state">Wachten op meting</span></div>
        <div class="mg-info-card fuel"><small><span class="mg-icon">⛽</span>Dieseltank</small><strong id="mg-fuel">–%</strong><em id="mg-fuel-l">– L</em><div class="mg-level-bar"><i id="mg-fuel-bar"></i></div></div>
        <div class="mg-info-card water"><small><span class="mg-icon">💧</span>Watertank</small><strong id="mg-water">–%</strong><em id="mg-water-l">Cerbo live</em><div class="mg-level-bar"><i id="mg-water-bar"></i></div></div>
      </div>
      <div class="mg-systems">
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">🔷</span><div><small>MultiPlus-II</small><strong id="mgMultiState">Stand-by</strong><em id="mgInv">– W</em></div></div></div>
        <div class="mg-system"><div class="mg-system-row"><span class="mg-system-icon">⚡</span><div><small>Laadstatus</small><strong id="mgChargeState">Lader uit</strong><em id="mgChg">– W</em></div></div></div>
        <div id="mgClimateMini" class="mg-climate-mini">
          <button type="button" data-go="technical"><small>🌡️ Machinekamer</small><span class="mg-climate-values"><strong id="mgMachineTemp">– °C</strong><b id="mgMachineRv">– % RV</b></span><em>Ruuvi · Machinekamer</em></button>
          <button type="button" data-go="technical"><small>🌡️ Salon</small><span class="mg-climate-values"><strong id="mgSalonTemp">– °C</strong><b id="mgSalonRv">– % RV</b></span><em>Ruuvi · Salon</em></button>
        </div>
      </div>
      <div id="mgFlow" class="mg-flow-card" data-dir="idle">
        <div class="mg-flow-node"><small>☀️ PV</small><strong id="mgPv">– W</strong></div><span class="mg-flow-arrow">→</span>
        <div class="mg-flow-node"><small>🔋 Accu</small><strong id="mgNetPower">– W</strong></div><span class="mg-flow-arrow">→</span>
        <div class="mg-flow-node"><small>💡 Verbruikers</small><strong id="mgLoadFlow">– W</strong></div>
      </div>
      <div id="mgHiddenCompat" hidden><span id="mgChg2"></span><span id="mgInv2"></span><span id="mg-waste"></span><span id="mg-waste-l"></span><i id="mg-waste-bar"></i></div>
      <div id="mgFoot" class="mg-foot"><i></i><span id="mgUpdated">Laatst bijgewerkt: wachten op Cerbo GX</span></div>
    </div>`}

  function legacyEnergyCard(){
    const candidates=[...document.querySelectorAll('h1,h2,h3,h4,h5,.card-title,.section-title,strong')];
    const heading=candidates.find(el=>/^energie\s*&\s*stroom$/i.test(String(el.textContent||'').trim()));
    if(!heading)return null;
    let node=heading.parentElement;
    while(node&&node!==document.body){
      const txt=String(node.innerText||node.textContent||'');
      if(/walstroom/i.test(txt)&&/omvormer/i.test(txt)&&/netto\s*stroom/i.test(txt))return node;
      node=node.parentElement;
    }
    return heading.parentElement;
  }

  function locateHost(){
    const legacy=legacyEnergyCard();
    const existing=$('msVictronEnergy');
    if(legacy&&legacy!==existing){
      if(existing){existing.id='msVictronEnergyOld';existing.classList.add('ms-victron-legacy-hidden')}
      legacy.id='msVictronEnergy';
      return legacy;
    }
    return existing||legacy;
  }

  function hideDiagnosis(){
    const direct=$('msVictronDiagnosis');
    if(direct){direct.hidden=true;direct.classList.add('ms-victron-legacy-hidden');direct.setAttribute('aria-hidden','true')}
    const texts=[...document.querySelectorAll('h1,h2,h3,h4,strong,button')];
    texts.forEach(el=>{
      const txt=String(el.textContent||'').trim();
      if(/^(accuconditie|victron uitlezen & beoordelen|vrm-token instellen)$/i.test(txt)){
        const card=el.closest('.ms-vrm-diagnosis,.card,.technical-card,section,article');
        if(card&&!card.contains($('msMarineGlass')))card.classList.add('ms-victron-legacy-hidden');
      }
    });
  }

  function mount(){
    const host=locateHost();
    if(!host)return false;
    selfChange=true;
    try{
      host.classList.add('ms-victron-live-host');
      if(!$('msMarineGlass')||$('msMarineGlass')?.dataset.msVictronLive!=='7192'||!host.contains($('msMarineGlass'))){
        document.querySelectorAll('#msMarineGlass').forEach(el=>{if(!host.contains(el))el.remove()});
        host.innerHTML=markup();
      }
      hideDiagnosis();
    }finally{queueMicrotask(()=>{selfChange=false})}
    return true;
  }

  function startState(v){if(!finite(v))return ['Wachten op meting',''];if(v>=13.2)return ['Laden','good'];if(v>=12.2)return ['OK','good'];if(v>=12)return ['Laag','warn'];return ['Controleren','bad']}
  function multiState(s){if(finite(s.charger)&&Number(s.charger)>5)return ['Laden','Lader actief'];if(finite(s.inverter)&&Math.abs(Number(s.inverter))>5)return ['Omvormen','Omvormer actief'];if(s.shore===true)return ['Walstroom','MultiPlus verbonden'];return ['Stand-by','Lader uit']}
  function ageLabel(value){const at=Date.parse(String(value||''));if(!Number.isFinite(at))return 'zojuist';const sec=Math.max(0,Math.round((Date.now()-at)/1000));if(sec<5)return '1 sec geleden';if(sec<60)return `${sec} sec geleden`;return `${Math.round(sec/60)} min geleden`}

  function render(){
    if(!mount())return;
    const s=snapshot();
    const soc=finite(s.soc)?Math.max(0,Math.min(100,Number(s.soc))):null;
    set('mgSoc',finite(soc)?Math.round(soc):'–');
    const ring=$('mgSocRing');if(ring)ring.style.setProperty('--p',finite(soc)?soc:0);
    set('mgVolt',fmt(s.voltage,2,' V'));
    set('mgAmp',signed(s.current,2,' A'));
    set('mgBatP',signed(s.power,0,' W'));
    set('mgSolar',fmt(s.solar,0,' W'));set('mgPv',fmt(s.solar,0,' W'));
    set('mgLoad',fmt(s.load,0,' W'));set('mgLoadFlow',fmt(s.load,0,' W'));
    set('mgDcLoad',fmt(s.dcLoad,0,' W'));
    set('mgNetPower',signed(s.power,0,' W'));

    set('mgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
    set('mgShoreMeta',s.shore===true&&finite(s.shoreV)?`${fmt(s.shoreV,0,' V')} via MultiPlus`:s.shore===false?'Geen walspanning':'Sensor nog niet beschikbaar');

    const [startLabel,startClass]=startState(s.start);
    set('mgStartVoltage',fmt(s.start,2,' V'));set('mgStartState',startLabel);
    const start=$('mgStartState');if(start)start.className=`state ${startClass}`.trim();

    set('mg-fuel',finite(s.fuel)?`${Math.round(Number(s.fuel))}%`:'–%');
    set('mg-fuel-l',finite(s.fuelLiters)?`${Math.round(Number(s.fuelLiters))} L`:'– L');
    const fuelBar=$('mg-fuel-bar');if(fuelBar)fuelBar.style.width=`${finite(s.fuel)?Math.max(0,Math.min(100,Number(s.fuel))):0}%`;
    set('mg-water',finite(s.water)?`${Math.round(Number(s.water))}%`:'–%');
    const waterBar=$('mg-water-bar');if(waterBar)waterBar.style.width=`${finite(s.water)?Math.max(0,Math.min(100,Number(s.water))):0}%`;

    const [multi,charge]=multiState(s);set('mgMultiState',multi);set('mgChargeState',charge);
    set('mgInv',fmt(s.inverter,0,' W'));set('mgChg',fmt(s.charger,0,' W'));set('mgInv2',fmt(s.inverter,0,' W'));set('mgChg2',fmt(s.charger,0,' W'));

    set('mgSalonTemp',fmt(s.salonTemp,1,' °C'));set('mgSalonRv',fmt(s.salonHum,0,'% RV'));
    set('mgMachineTemp',fmt(s.machineTemp,1,' °C'));set('mgMachineRv',fmt(s.machineHum,0,'% RV'));

    const mode=$('mgBatteryMode');
    if(mode)mode.textContent=finite(s.power)&&Number(s.power)>10?'⚡ Laden':finite(s.power)&&Number(s.power)<-10?'⚡ Ontladen':'⚡ Live';
    const flow=$('mgFlow');if(flow)flow.dataset.dir=!finite(s.power)?'idle':Number(s.power)>10?'in':Number(s.power)<-10?'out':'idle';

    const fresh=Boolean(s.sampledAt)||states().length>0;
    const pill=$('mgLivePill');if(pill)pill.classList.toggle('offline',!fresh);
    const foot=$('mgFoot');if(foot)foot.classList.toggle('offline',!fresh);
    set('mgUpdated',fresh?`Cerbo GX live · ${ageLabel(s.sampledAt)}`:'Wachten op Cerbo GX live-data');
  }

  function queueRender(){
    if(renderFrame)return;
    renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()});
  }

  function token(){
    for(const key of TOKEN_KEYS){const value=localStorage.getItem(key);if(value&&String(value).trim())return String(value).trim().replace(/^Token\s+/i,'')}
    try{const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}
    return '';
  }
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  async function refreshLive(force=false){
    if(liveBusy)return false;
    if(!force&&Date.now()-lastLiveAttempt<55000)return false;
    const supabase=client(),activeBoat=boat(),activeUser=user(),vrmToken=token();
    if(!supabase||!activeBoat?.id||!activeUser||!vrmToken)return false;
    liveBusy=true;lastLiveAttempt=Date.now();
    try{
      const {data,error}=await supabase.functions.invoke('victron-energy-live',{body:{boatId:activeBoat.id},headers:{'x-vrm-token':vrmToken}});
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      queueRender();return true;
    }catch(error){console.warn('Victron live energie kon niet worden vernieuwd:',error);return false}
    finally{liveBusy=false}
  }

  function installObserver(){
    if(observer||!document.body)return;
    observer=new MutationObserver(()=>{
      if(selfChange)return;
      clearTimeout(remountTimer);
      remountTimer=setTimeout(queueRender,60);
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  const events=['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated','mijnserenity:dashboard-ready'];
  events.forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLive(false)}},{passive:true});
  window.addEventListener('focus',()=>{queueRender();refreshLive(false)},{passive:true});

  function boot(){
    installObserver();queueRender();
    setTimeout(queueRender,250);setTimeout(queueRender,1000);setTimeout(queueRender,3000);
    setTimeout(()=>refreshLive(true),1200);
    setInterval(()=>{if(!document.hidden)refreshLive(false)},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
