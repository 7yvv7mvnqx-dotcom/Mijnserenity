/* MijnSerenity 7.20.1 — Victron live pagina + startpagina + complete navigatie
   - Victron VRM/Cerbo live waarden krijgen voorrang.
   - De IVMS Energie & Klimaat kaart opent het volledige Victron overzicht.
   - De onderste navigatie blijft zichtbaar en heeft altijd een Meer-knop.
   - Ontbrekende echte metingen blijven als – staan; er worden geen waarden verzonnen. */
(()=>{
  'use strict';
  if(window.__msVictronEnergy72010)return;
  window.__msVictronEnergy72010=true;

  const $=id=>document.getElementById(id);
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let liveBusy=false,lastLiveAttempt=0,renderFrame=0,refreshTimer=0;

  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const num=v=>{if(!finite(v))return null;return Number(v)};
  const fmt=(v,d=0,s='')=>finite(v)?`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${s}`:`–${s}`;
  const signed=(v,d=0,s='')=>finite(v)?`${Number(v)>0?'+':''}${fmt(v,d,s)}`:`–${s}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function technical(){
    try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:(typeof readTechnicalLocalState==='function'?readTechnicalLocalState()||{}:{})}catch{return {}}
  }
  function rawLive(){
    const d=window.MIJSERENITY_VRM_LIVE_ENERGY;
    return d&&typeof d==='object'&&d.success!==false?d:{};
  }
  function rawLegacyEnergy(){
    const d=window.MIJSERENITY_VRM_DATA?.energy;
    return d&&typeof d==='object'?d:{};
  }
  function states(){
    try{
      const list=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      return Array.isArray(list)?list.filter(e=>e&&!['unknown','unavailable','none',''].includes(String(e.state??'').toLowerCase())):[];
    }catch{return []}
  }
  function entityText(e){return `${e?.entity_id||''} ${e?.attributes?.friendly_name||''} ${e?.name||''}`.toLowerCase()}
  function unit(e){return String(e?.attributes?.unit_of_measurement||'').toLowerCase()}
  function exact(ids){for(const id of ids){const e=states().find(x=>x?.entity_id===id);if(e)return e}return null}
  function metric(ids,terms,u='',exclude=[]){
    const ex=exact(ids);if(ex&&finite(ex.state))return Number(ex.state);
    const hit=states().map(e=>{
      const text=entityText(e);let score=0;
      terms.forEach((term,i)=>{if(text.includes(term))score+=60-i});
      if(u&&unit(e)===u.toLowerCase())score+=15;
      if(exclude.some(term=>text.includes(term)))score=-9999;
      return {e,score};
    }).filter(x=>x.score>=55&&finite(x.e?.state)).sort((a,b)=>b.score-a.score)[0]?.e;
    return hit?Number(hit.state):null;
  }
  function boolMetric(ids,terms){
    const e=exact(ids)||states().map(e=>({e,score:terms.reduce((n,t,i)=>n+(entityText(e).includes(t)?60-i:0),0)})).sort((a,b)=>b.score-a.score)[0]?.e;
    if(!e)return null;const v=String(e.state??'').toLowerCase();
    if(['on','connected','true','1','yes','active','aan','present','detected'].includes(v))return true;
    if(['off','disconnected','false','0','no','inactive','uit','absent','clear'].includes(v))return false;
    return null;
  }

  function snapshot(){
    const live=rawLive(),legacy=rawLegacyEnergy(),t=technical();
    const b=live.battery||{},solar=live.solar||{},ac=live.ac||{},starter=live.starter||{},diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const db=diag.battery||{},ds=diag.solar||{},da=diag.ac||{};

    const soc=num(b.soc)??num(legacy.soc)??metric(['sensor.vrm_state_of_charge'],['state of charge','smartshunt soc','battery soc'],'%')??num(db.soc?.value)??num(t.houseSoc);
    const voltage=num(b.voltage)??num(legacy.voltage)??metric(['sensor.vrm_voltage'],['vrm voltage','smartshunt voltage','house battery voltage','huishoudaccu spanning'],'v',['starter','startaccu','aux'])??num(db.voltage?.value)??num(t.houseVoltage);
    const current=num(b.current)??num(legacy.current)??metric(['sensor.vrm_current'],['vrm current','smartshunt current','battery current','accustroom'],'a',['starter','startaccu','aux'])??num(db.current?.value)??num(t.houseCurrent);
    const power=num(b.power)??num(legacy.power)??metric(['sensor.vrm_battery_power'],['vrm battery power','smartshunt power','battery power','accuvermogen'],'w',['solar','pv','mppt'])??num(db.power?.value)??num(t.housePower)??(finite(voltage)&&finite(current)?Number(voltage)*Number(current):null);
    const batteryTemp=num(b.temperature)??metric(['sensor.vrm_battery_temperature'],['battery temperature','accutemperatuur','smartshunt temperature'],'°c',['salon','room','solar'])??num(t.houseBatteryTemp);

    const solarPower=num(solar.power)??num(live.system?.solarPower)??num(legacy.solarPower)??metric(['sensor.vrm_solar_charger_power','sensor.vrm_pv_power'],['solar charger power','mppt power','pv power','zonnepaneel vermogen'],'w',['battery','load','voltage'])??num(ds.power?.value)??num(t.solarPower);

    const start=[num(b.starterVoltage),num(starter.voltage),metric(['sensor.vrm_starter_battery_voltage','sensor.vrm_start_battery_voltage','sensor.vrm_auxiliary_battery_voltage'],['starter battery voltage','start battery voltage','startaccu spanning','aux voltage'],'v',['house','huishoud']),num(db.starterVoltage?.value),num(t.startVoltage)].find(v=>finite(v)&&v>=9&&v<=16.8)??null;

    let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:boolMetric(['binary_sensor.vrm_shore_power','binary_sensor.vrm_ac_input_connected','binary_sensor.vrm_grid_connected'],['shore power','walstroom','ac input connected','grid connected']);
    const shoreV=num(ac.inputVoltage)??num(legacy.inputVoltage)??metric(['sensor.vrm_ac_input_voltage','sensor.vrm_shore_voltage','sensor.vrm_grid_voltage'],['ac input voltage','shore voltage','walstroom spanning','grid voltage'],'v',['battery','dc'])??num(da.inputVoltage)??num(t.shoreVoltage);
    const shorePower=num(ac.inputPower)??num(legacy.inputPower)??metric(['sensor.vrm_ac_input_power','sensor.vrm_grid_power','sensor.vrm_shore_power'],['ac input power','grid power','shore power','walstroom vermogen'],'w',['battery','dc'])??num(da.inputPower)??num(t.shorePowerWatts);
    if(shore===null&&finite(shoreV))shore=Number(shoreV)>=180&&Number(shoreV)<=280;
    if(shore===null&&finite(shorePower)&&Math.abs(Number(shorePower))>2)shore=true;

    const charger=num(ac.chargerPower)??metric(['sensor.vrm_charger_power','sensor.vrm_ac_charger_power'],['charger power','acculader vermogen','lader vermogen'],'w',['solar','pv','mppt','inverter'])??num(da.chargerPower)??num(t.chargerPower);
    const inverter=num(ac.inverterPower)??metric(['sensor.vrm_inverter_power','sensor.vrm_inverter_output_power'],['inverter power','omvormer vermogen'],'w',['solar','charger'])??num(da.inverterPower)??num(t.inverterPower);
    const acLoad=num(ac.loadPower)??num(ac.outputPower)??metric(['sensor.vrm_ac_load_power','sensor.vrm_load_power','sensor.vrm_consumption_power'],['ac load power','load power','consumption power','verbruik vermogen'],'w',['solar','charger','battery','dc'])??num(da.loadPower)??num(t.loadPower);
    const alternator=num(live.alternator?.power)??metric(['sensor.vrm_alternator_power','sensor.vrm_orion_power','sensor.orion_xs_power'],['alternator power','dynamo power','orion power','orion xs power','dc dc charger power'],'w',['solar','ac load'])??num(t.alternatorPower)??num(t.dynamoPower)??num(t.orionPower);

    let dcLoad=num(ac.dcLoadPower)??metric(['sensor.vrm_dc_load_power','sensor.vrm_dc_system_power','sensor.vrm_dc_consumption_power'],['dc load power','dc system power','dc consumption power','dc verbruik'],'w',['battery','solar','charger','vebus'])??num(t.dcLoadPower);
    if(!finite(dcLoad)){
      const inDc=(finite(solarPower)?Math.max(0,Number(solarPower)):0)+(finite(charger)?Math.max(0,Number(charger)):0)+(finite(alternator)?Math.max(0,Number(alternator)):0);
      if(inDc>0&&finite(power))dcLoad=Math.max(0,inDc-Number(power));
      else if(finite(power)&&Number(power)<0&&!finite(acLoad))dcLoad=Math.abs(Number(power));
    }

    const sampledAt=live.sampledAt||legacy.updatedAt||t.liveTechnicalAt||'';
    return {soc,voltage,current,power,batteryTemp,solar:solarPower,start,shore,shoreV,shorePower,charger,inverter,acLoad,dcLoad:finite(dcLoad)?Math.abs(Number(dcLoad)):null,alternator,sampledAt};
  }

  function syntheticEntity(id,state,u,name){return {entity_id:id,state:String(state),name,attributes:{friendly_name:name,unit_of_measurement:u}}}
  function installSyntheticStates(){
    const current=window.ms730GetStateSnapshot;
    if(typeof current!=='function'||current.__msVrmSynthetic7201)return;
    const original=current;
    const wrapped=function(){
      let base=[];try{base=original.apply(this,arguments);if(!Array.isArray(base))base=[]}catch{base=[]}
      const l=rawLive(),b=l.battery||{},s=l.solar||{},ac=l.ac||{};
      const synthetic=[];
      if(finite(b.soc))synthetic.push(syntheticEntity('sensor.vrm_state_of_charge',b.soc,'%','VRM State of charge'));
      if(finite(b.voltage))synthetic.push(syntheticEntity('sensor.vrm_voltage',b.voltage,'V','VRM Voltage'));
      if(finite(b.current))synthetic.push(syntheticEntity('sensor.vrm_current',b.current,'A','VRM Current'));
      if(finite(b.power))synthetic.push(syntheticEntity('sensor.vrm_battery_power',b.power,'W','VRM Battery power'));
      if(finite(b.starterVoltage))synthetic.push(syntheticEntity('sensor.vrm_starter_battery_voltage',b.starterVoltage,'V','VRM Starter battery voltage'));
      if(finite(s.power))synthetic.push(syntheticEntity('sensor.vrm_solar_charger_power',s.power,'W','VRM Solar charger power'));
      if(typeof ac.shoreConnected==='boolean')synthetic.push({entity_id:'binary_sensor.vrm_shore_power',state:ac.shoreConnected?'on':'off',name:'VRM Shore power',attributes:{friendly_name:'VRM Shore power'}});
      if(finite(ac.inputVoltage))synthetic.push(syntheticEntity('sensor.vrm_ac_input_voltage',ac.inputVoltage,'V','VRM AC input voltage'));
      if(finite(ac.inputPower))synthetic.push(syntheticEntity('sensor.vrm_ac_input_power',ac.inputPower,'W','VRM AC input power'));
      if(finite(ac.loadPower))synthetic.push(syntheticEntity('sensor.vrm_ac_load_power',ac.loadPower,'W','VRM AC load power'));
      if(finite(ac.chargerPower))synthetic.push(syntheticEntity('sensor.vrm_charger_power',ac.chargerPower,'W','VRM Charger power'));
      if(finite(ac.inverterPower))synthetic.push(syntheticEntity('sensor.vrm_inverter_power',ac.inverterPower,'W','VRM Inverter power'));
      const ids=new Set(synthetic.map(e=>e.entity_id));
      return [...base.filter(e=>!ids.has(e?.entity_id)),...synthetic];
    };
    wrapped.__msVrmSynthetic7201=true;wrapped.__msVrmOriginal=original;
    window.ms730GetStateSnapshot=wrapped;
  }

  function token(){
    for(const key of TOKEN_KEYS){const v=localStorage.getItem(key);if(v&&String(v).trim())return String(v).trim().replace(/^Token\s+/i,'')}
    try{const cfg=JSON.parse(localStorage.getItem('mijnserenity-ruuvi-climate-v7102')||'{}');if(cfg?.vrmToken)return String(cfg.vrmToken).trim().replace(/^Token\s+/i,'')}catch{}
    return '';
  }
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}
  function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch{return null}}
  async function refreshLive(force=false){
    if(liveBusy)return false;
    if(!force&&Date.now()-lastLiveAttempt<30000)return false;
    const c=client(),b=boat(),u=user(),vrm=token();if(!c||!b?.id||!u||!vrm)return false;
    liveBusy=true;lastLiveAttempt=Date.now();
    try{
      const {data,error}=await c.functions.invoke('victron-energy-live',{body:{boatId:b.id},headers:{'x-vrm-token':vrm}});
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige Victron live-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      installSyntheticStates();
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      window.dispatchEvent(new CustomEvent('mijnserenity-ha-state-updated'));
      queueRender();return true;
    }catch(error){console.warn('Victron live energie kon niet worden vernieuwd:',error);return false}
    finally{liveBusy=false}
  }

  function batteryColor(soc){if(!finite(soc))return '#8ba0af';const n=Number(soc);return n>99?'#42d67d':n>=85?'#f3c74e':n>=40?'#ff9f43':'#ff625c'}
  function startState(v){if(!finite(v))return 'Wachten';if(v>=13.2)return 'Laden';if(v>=12.2)return 'In orde';if(v>=12)return 'Laag';return 'Controleren'}
  function multiState(s){if(finite(s.charger)&&Number(s.charger)>5)return ['Laden','Lader actief'];if(finite(s.inverter)&&Math.abs(Number(s.inverter))>5)return ['Omvormen','Omvormer actief'];if(s.shore===true)return ['Walstroom','MultiPlus verbonden'];return ['Stand-by','Lader uit']}
  function ageLabel(value){const at=Date.parse(String(value||''));if(!Number.isFinite(at))return 'geen live tijd';const sec=Math.max(0,Math.round((Date.now()-at)/1000));if(sec<5)return 'zojuist';if(sec<60)return `${sec} sec geleden`;return `${Math.round(sec/60)} min geleden`}

  function injectUiStyle(){
    if($('ms7201UiStyle'))return;
    const st=document.createElement('style');st.id='ms7201UiStyle';st.textContent=`
      body{padding-bottom:calc(64px + env(safe-area-inset-bottom))!important}
      body .bottom-nav,body.ivms-dashboard-active .bottom-nav.ivms-dashboard-hidden{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:2147481800!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;align-items:start!important;width:100%!important;height:calc(58px + env(safe-area-inset-bottom))!important;min-height:calc(58px + env(safe-area-inset-bottom))!important;margin:0!important;padding:5px 5px env(safe-area-inset-bottom)!important;gap:3px!important;overflow:visible!important;background:rgba(2,11,19,.97)!important;border-top:1px solid rgba(113,220,255,.18)!important;box-shadow:0 -8px 24px rgba(0,0,0,.28)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important}
      body .bottom-nav .bottom-nav-item{display:none!important;width:100%!important;min-width:0!important;height:44px!important;min-height:44px!important;margin:0!important;padding:0!important;border:0!important;border-radius:12px!important;background:transparent!important;place-items:center!important}
      body .bottom-nav .bottom-nav-item[data-target='dashboard'],body .bottom-nav .bottom-nav-item[data-target='live'],body .bottom-nav .bottom-nav-item[data-target='ais'],body .bottom-nav .bottom-nav-item[data-target='weather'],body .bottom-nav .bottom-nav-item[data-target='map'],body .bottom-nav .ms7201-more-nav{display:grid!important}
      body .bottom-nav .bottom-nav-item span,body .bottom-nav .ms7201-more-nav span{font-size:20px!important;line-height:1!important}
      body .bottom-nav .bottom-nav-item.active{background:rgba(79,203,242,.14)!important;box-shadow:inset 0 0 0 1px rgba(99,217,249,.23)!important}
      body .bottom-nav .ms7201-more-nav{appearance:none;width:100%;height:44px;border:0;border-radius:12px;background:rgba(38,105,146,.23);color:#fff;font:inherit;place-items:center;padding:0;margin:0}
      body .bottom-nav .ms7201-more-nav small{display:block;margin-top:2px;font-size:7px;color:#a9c7d8;font-weight:750}
      #ms7201MoreSheet[hidden],#msVictronPage[hidden]{display:none!important}
      #ms7201MoreSheet{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:flex-end;background:rgba(0,7,13,.66);backdrop-filter:blur(8px)}
      #ms7201MoreSheet .msm-panel{width:100%;max-height:min(76dvh,650px);overflow:auto;padding:12px 12px calc(20px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;border-top:1px solid rgba(94,183,229,.3);background:linear-gradient(180deg,#0a2233,#06131f);color:#fff}
      #ms7201MoreSheet .msm-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}#ms7201MoreSheet .msm-head strong{font-size:18px}#ms7201MoreSheet .msm-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.15);border-radius:12px;background:#102b3e;color:#fff;font-size:22px}
      #ms7201MoreSheet .msm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#ms7201MoreSheet .msm-item{appearance:none;min-height:76px;padding:9px 5px;border:1px solid rgba(98,181,226,.2);border-radius:14px;background:rgba(255,255,255,.025);color:#fff;font:inherit;text-align:center}#ms7201MoreSheet .msm-item b{display:block;font-size:23px;line-height:1.1}#ms7201MoreSheet .msm-item span{display:block;margin-top:6px;font-size:10px;color:#d7e8f2;font-weight:750}
      #msVictronPage{--blue:#3daef0;--green:#42d67d;--muted:#95aaba;position:fixed;inset:0;z-index:2147483200;overflow:auto;background:linear-gradient(180deg,#081a29,#06131f 58%,#04101a);color:#f6fbff;font-family:inherit;-webkit-overflow-scrolling:touch}
      #msVictronPage *{box-sizing:border-box;min-width:0}#msVictronPage .vp-top{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;background:rgba(5,17,28,.94);border-bottom:1px solid rgba(91,174,222,.18);backdrop-filter:blur(16px)}
      #msVictronPage .vp-top button{width:42px;height:42px;border:1px solid rgba(99,183,229,.25);border-radius:12px;background:#0b2233;color:#fff;font-size:21px}#msVictronPage .vp-title{text-align:center}#msVictronPage .vp-title strong{display:block;font-size:16px}#msVictronPage .vp-title small{display:block;margin-top:2px;color:var(--blue);font-size:9px;font-weight:850;letter-spacing:.08em}
      #msVictronPage .vp-shell{width:min(980px,100%);margin:auto;padding:12px 8px calc(80px + env(safe-area-inset-bottom))}#msVictronPage .vp-status{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 2px 9px;color:var(--muted);font-size:9px}#msVictronPage .vp-live{color:var(--green);font-weight:900}.vp-live.offline{color:#8196a5}
      #msVictronPage .vp-flow{display:grid;grid-template-columns:minmax(0,.9fr) minmax(116px,1.1fr) minmax(0,.9fr);grid-template-areas:'shore multi ac' 'solar battery dc' 'alt battery dc';gap:6px;padding:7px;border:1px solid rgba(71,164,216,.28);border-radius:17px;background:rgba(255,255,255,.012)}
      #msVictronPage .vp-card{min-height:108px;display:flex;flex-direction:column;justify-content:center;padding:9px 8px;border:1px solid rgba(70,166,219,.43);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.015))}#msVictronPage .vp-shore{grid-area:shore}#msVictronPage .vp-solar{grid-area:solar}#msVictronPage .vp-alt{grid-area:alt}#msVictronPage .vp-multi{grid-area:multi}#msVictronPage .vp-battery{grid-area:battery;align-items:center;text-align:center;background:linear-gradient(180deg,rgba(74,154,213,.68),rgba(46,110,166,.82))}#msVictronPage .vp-ac{grid-area:ac}#msVictronPage .vp-dc{grid-area:dc}
      #msVictronPage .vp-label{font-size:8px;color:#d9e6ee;font-weight:800}#msVictronPage .vp-value{display:block;margin-top:8px;font-size:21px;line-height:1;font-weight:450;white-space:nowrap}#msVictronPage .vp-meta{display:block;margin-top:7px;font-size:7.5px;line-height:1.3;color:var(--muted)}#msVictronPage .vp-battery .vp-value{font-size:38px}#msVictronPage .vp-batline{display:flex;gap:7px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);font-size:10px;white-space:nowrap}#msVictronPage .vp-mode{display:inline-flex;margin-top:7px;padding:4px 6px;border-radius:999px;background:rgba(66,214,125,.12);color:var(--green);font-size:8px;font-weight:850}
      #msVictronPage .vp-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}#msVictronPage .vp-detail{padding:10px;border:1px solid rgba(79,160,206,.22);border-radius:12px;background:rgba(255,255,255,.018)}#msVictronPage .vp-detail small{display:block;color:var(--muted);font-size:8px;text-transform:uppercase}#msVictronPage .vp-detail strong{display:block;margin-top:6px;font-size:14px}#msVictronPage .vp-detail em{display:block;margin-top:4px;color:var(--muted);font-size:8px;font-style:normal}
      @media(max-width:380px){#ms7201MoreSheet .msm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#msVictronPage .vp-value{font-size:18px}#msVictronPage .vp-battery .vp-value{font-size:32px}#msVictronPage .vp-details{grid-template-columns:1fr 1fr}#msVictronPage .vp-detail:last-child{grid-column:1/-1}}
    `;document.head.appendChild(st);
  }

  const menuItems=[
    ['dashboard','🏠','Start'],['live','⛵','Live varen'],['ais','📡','AIS'],['weather','☀️','Weer'],['map','🗺️','Kaart'],['planner','🧭','Reisplanner'],
    ['entertainment','🏡','Home Assistant'],['technical','⚙️','Techniek'],['victron','⚡','Victron'],['logbook','📖','Logboek'],['pois','📍','POI'],['costs','🧾','Kosten'],['finance','💶','Financieel'],['settings','🚤','Boot']
  ];
  function ensureMore(){
    injectUiStyle();let sheet=$('ms7201MoreSheet');
    if(!sheet){sheet=document.createElement('section');sheet.id='ms7201MoreSheet';sheet.hidden=true;sheet.innerHTML=`<div class="msm-panel" role="dialog" aria-modal="true" aria-label="Meer navigatie"><div class="msm-head"><strong>Meer</strong><button type="button" class="msm-close" aria-label="Sluiten">×</button></div><div class="msm-grid">${menuItems.map(([target,icon,label])=>`<button type="button" class="msm-item" data-ms-target="${target}"><b>${icon}</b><span>${label}</span></button>`).join('')}</div></div>`;document.body.appendChild(sheet);
      sheet.querySelector('.msm-close')?.addEventListener('click',closeMore);sheet.addEventListener('click',e=>{if(e.target===sheet)closeMore();const btn=e.target.closest?.('[data-ms-target]');if(!btn)return;const target=btn.dataset.msTarget;closeMore();if(target==='victron')openVictron();else if(typeof window.captainNavigate==='function')window.captainNavigate(target)});
    }
    const nav=document.querySelector('.bottom-nav');
    if(nav&&!nav.querySelector('.ms7201-more-nav')){const btn=document.createElement('button');btn.type='button';btn.className='ms7201-more-nav';btn.setAttribute('aria-label','Meer navigatie');btn.innerHTML='<span>☰</span><small>MEER</small>';btn.addEventListener('click',openMore);nav.appendChild(btn)}
    return sheet;
  }
  function openMore(){const s=ensureMore();s.hidden=false;document.body.style.overflow='hidden'}
  function closeMore(){const s=$('ms7201MoreSheet');if(s)s.hidden=true;if($('msVictronPage')?.hidden!==false)document.body.style.overflow=''}
  window.ms797OpenMore=openMore;window.ms7201OpenMore=openMore;

  function pageMarkup(){return `<div class="vp-top"><button type="button" id="vpBack" aria-label="Terug">‹</button><div class="vp-title"><strong>Victron Energie</strong><small>SERENITY · VRM LIVE</small></div><button type="button" id="vpRefresh" aria-label="Ververs">↻</button></div><main class="vp-shell"><div class="vp-status"><span id="vpLive" class="vp-live">● LIVE</span><span id="vpUpdated">Wachten op Cerbo GX</span></div><section class="vp-flow"><article class="vp-card vp-shore"><span class="vp-label">◉ Walstroom</span><strong id="vpShore" class="vp-value">– W</strong><span id="vpShoreMeta" class="vp-meta">Niet gekoppeld</span></article><article class="vp-card vp-solar"><span class="vp-label">☀︎ Zon opbrengst</span><strong id="vpSolar" class="vp-value">– W</strong><span class="vp-meta">SmartSolar MPPT</span></article><article class="vp-card vp-alt"><span class="vp-label">⚡ Dynamo / Orion</span><strong id="vpAlt" class="vp-value">– W</strong><span class="vp-meta">Motorlading</span></article><article class="vp-card vp-multi"><span class="vp-label">▣ Omvormer / Lader</span><strong id="vpMulti" class="vp-value">Stand-by</strong><span id="vpCharge" class="vp-mode">Lader uit</span><span id="vpMultiMeta" class="vp-meta">– W</span></article><article class="vp-card vp-battery"><span class="vp-label">▣ Huishoudaccu</span><strong id="vpSoc" class="vp-value">–%</strong><span id="vpBatMode" class="vp-mode">Live</span><span class="vp-batline"><span id="vpVolt">– V</span><span id="vpAmp">– A</span><span id="vpBatP">– W</span></span><span id="vpBatTemp" class="vp-meta">Temperatuur – °C</span></article><article class="vp-card vp-ac"><span class="vp-label">≈ AC Belastingen</span><strong id="vpAc" class="vp-value">– W</strong><span class="vp-meta">230 V boordnet</span></article><article class="vp-card vp-dc"><span class="vp-label">≋ DC Belastingen</span><strong id="vpDc" class="vp-value">– W</strong><span class="vp-meta">12 V boordnet</span></article></section><section class="vp-details"><div class="vp-detail"><small>Startaccu</small><strong id="vpStart">– V</strong><em id="vpStartState">Wachten</em></div><div class="vp-detail"><small>MultiPlus</small><strong id="vpMultiDetail">Stand-by</strong><em id="vpMultiPower">– W</em></div><div class="vp-detail"><small>Bron</small><strong>Cerbo GX</strong><em id="vpAge">Nog geen live meting</em></div></section></main>`}
  function ensurePage(){injectUiStyle();let p=$('msVictronPage');if(p)return p;p=document.createElement('section');p.id='msVictronPage';p.hidden=true;p.innerHTML=pageMarkup();document.body.appendChild(p);$('vpBack')?.addEventListener('click',closeVictron);$('vpRefresh')?.addEventListener('click',async()=>{await refreshLive(true);queueRender()});return p}
  function openVictron(){const p=ensurePage();p.hidden=false;p.scrollTop=0;document.body.style.overflow='hidden';closeMore();queueRender();refreshLive(true)}
  function closeVictron(){const p=$('msVictronPage');if(p)p.hidden=true;document.body.style.overflow=''}
  window.msOpenVictronPage=openVictron;window.msCloseVictronPage=closeVictron;

  function updatePage(s){
    const p=$('msVictronPage');if(!p||p.hidden)return;
    const soc=finite(s.soc)?Math.max(0,Math.min(100,Number(s.soc))):null,[multi,charge]=multiState(s);
    set('vpShore',fmt(s.shorePower,0,' W'));set('vpShoreMeta',s.shore===true?`${fmt(s.shoreV,0,' V')} · aangesloten`:s.shore===false?'Niet aangesloten':'Walstroomstatus onbekend');set('vpSolar',fmt(s.solar,0,' W'));set('vpAlt',fmt(s.alternator,0,' W'));
    set('vpMulti',multi);set('vpCharge',charge);set('vpMultiMeta',finite(s.charger)&&s.charger>2?`${fmt(s.charger,0,' W')} naar accu`:finite(s.inverter)&&Math.abs(s.inverter)>2?`${fmt(Math.abs(s.inverter),0,' W')} naar AC`:s.shore===true?'Walstroom actief':'Geen vermogensoverdracht');
    set('vpSoc',finite(soc)?`${Math.round(soc)}%`:'–%');const socEl=$('vpSoc');if(socEl)socEl.style.color=batteryColor(soc);set('vpVolt',fmt(s.voltage,2,' V'));set('vpAmp',signed(s.current,1,' A'));set('vpBatP',signed(s.power,0,' W'));set('vpBatTemp',`Temperatuur ${fmt(s.batteryTemp,0,' °C')}`);set('vpBatMode',finite(s.power)&&s.power>10?'Opladen':finite(s.power)&&s.power<-10?'Ontladen':'Rust / vol');
    set('vpAc',fmt(s.acLoad,0,' W'));set('vpDc',fmt(s.dcLoad,0,' W'));set('vpStart',fmt(s.start,2,' V'));set('vpStartState',startState(s.start));set('vpMultiDetail',multi);set('vpMultiPower',finite(s.charger)&&s.charger>2?`Lader ${fmt(s.charger,0,' W')}`:finite(s.inverter)&&Math.abs(s.inverter)>2?`Omvormer ${fmt(Math.abs(s.inverter),0,' W')}`:'Stand-by');
    const at=Date.parse(String(s.sampledAt||'')),fresh=Number.isFinite(at)?Date.now()-at<300000:Boolean(rawLive().sampledAt);set('vpAge',fresh?ageLabel(s.sampledAt):'Geen verse VRM-meting');set('vpUpdated',fresh?`Cerbo GX · ${ageLabel(s.sampledAt)}`:'Offline / wachten');$('vpLive')?.classList.toggle('offline',!fresh);
  }

  function updateIvms(s){
    if(!$('serenityIvms'))return;
    const soc=finite(s.soc)?Math.max(0,Math.min(100,Number(s.soc))):null;
    set('ivmsBatteryVoltage',fmt(s.voltage,2,' V'));set('ivmsBatteryMeta',finite(s.voltage)||finite(s.soc)?'Victron VRM live':'nog geen meting');set('ivmsBatteryCurrent',signed(s.current,2,' A'));set('ivmsBatteryPower',signed(s.power,0,' W'));
    const ring=$('ivmsBatteryRing');if(ring){ring.style.setProperty('--value',finite(soc)?String(soc):'0');const label=ring.querySelector('strong');if(label)label.textContent=finite(soc)?`${Math.round(soc)}%`:'–%';ring.classList.remove('good','warning','critical');ring.classList.add(!finite(soc)||soc>=40?'good':soc>=20?'warning':'critical')}
    set('ivmsSolarPower',fmt(s.solar,0,' W'));set('ivmsSolarBattery',finite(s.solar)?(Number(s.solar)>2?'LADEN':'STANDBY'):'NIET GEKOPPELD');
    set('ivmsChargerPower',fmt(s.charger,0,' W'));const [,charge]=multiState(s);set('ivmsChargerStatus',finite(s.charger)||s.shore!==null?charge.toUpperCase():'NIET GEKOPPELD');
    set('ivmsPowerSource',s.shore===true?'WALSTROOM':'ACCU');set('ivmsPowerStatus',s.shore===true?'AANGESLOTEN':'BOORDNET');set('ivmsPowerVoltage',fmt(s.shoreV,0,' V'));$('ivmsShoreDetails')?.classList.toggle('hidden',s.shore!==true);
    const card=document.querySelector('.ivms-energy-card');if(card){card.style.cursor='pointer';card.setAttribute('aria-label','Open Victron energie overzicht');card.setAttribute('title','Open Victron energie overzicht')}
  }

  function render(){installSyntheticStates();ensureMore();ensurePage();const s=snapshot();updateIvms(s);updatePage(s)}
  function queueRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}

  document.addEventListener('click',event=>{
    const energy=event.target.closest?.('.ivms-energy-card');if(energy){event.preventDefault();event.stopImmediatePropagation();openVictron();return}
  },true);
  ['mijnserenity-ha-state-updated','mijnserenity-vrm-updated','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-vrm-energy-live-updated','mijnserenity:dashboard-ready','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLive(false)}},{passive:true});window.addEventListener('focus',()=>{queueRender();refreshLive(false)},{passive:true});

  function boot(){injectUiStyle();ensureMore();ensurePage();installSyntheticStates();queueRender();setTimeout(queueRender,500);setTimeout(()=>refreshLive(true),900);setTimeout(queueRender,1800);refreshTimer=setInterval(()=>{if(!document.hidden){installSyntheticStates();queueRender();refreshLive(false)}},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();