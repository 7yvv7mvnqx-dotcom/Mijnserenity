/* MijnSerenity 7.19.14 — live waarden correct en geen verzonnen sensorstanden */
(()=>{
  'use strict';
  if(window.__msDashboardLiveValues71914)return;
  window.__msDashboardLiveValues71914=true;

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const num=v=>finite(v)?Number(v):null;
  const set=(id,value)=>{const el=$(id);if(el&&value!==undefined&&value!==null&&el.textContent!==String(value))el.textContent=String(value)};
  const fmt=(v,d=0,s='')=>finite(v)?`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${s}`:`–${s}`;
  const signed=(v,d=0,s='')=>finite(v)?`${Number(v)>0?'+':''}${fmt(v,d,s)}`:`–${s}`;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const TOKEN_KEYS=['ms7148_vrm_token','ms7148VrmToken','mijnserenity_vrm_token','vrm_api_token'];
  let busy=false,lastFetch=0,frame=0;

  function technical(){
    try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:{}}
    catch{return {}}
  }

  function liveData(){
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!live||typeof live!=='object'||live.success===false)return {};
    const at=Date.parse(String(live.sampledAt||''));
    if(Number.isFinite(at)&&Date.now()-at>5*60*1000)return {};
    return live;
  }

  function energySnapshot(){
    const live=liveData();
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const t=technical();
    const b=live.battery||{},s=live.solar||{},ac=live.ac||{};
    const db=diag.battery||{},ds=diag.solar||{},da=diag.ac||{};

    const soc=num(b.soc)??num(db.soc?.value)??num(t.houseSoc);
    const voltage=num(b.voltage)??num(db.voltage?.value)??num(t.houseVoltage);
    const current=num(b.current)??num(db.current?.value)??num(t.houseCurrent);
    const power=num(b.power)??num(db.power?.value)??num(t.housePower)??(finite(voltage)&&finite(current)?Number(voltage)*Number(current):null);
    const solar=num(s.power)??num(live.system?.solarPower)??num(ds.power?.value)??num(t.solarPower);

    const startCandidates=[num(b.starterVoltage),num(live.starter?.voltage),num(db.starterVoltage?.value),num(t.startVoltage)];
    const start=startCandidates.find(v=>finite(v)&&v>=9&&v<=16.8)??null;

    let shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:(typeof da.shoreConnected==='boolean'?da.shoreConnected:null);
    const shoreV=num(ac.inputVoltage)??num(da.inputVoltage)??num(t.shoreVoltage);
    if(shore===null&&finite(shoreV)&&shoreV>=180&&shoreV<=280)shore=true;

    const charger=num(ac.chargerPower)??num(da.chargerPower)??num(t.chargerPower);
    const inverter=num(ac.inverterPower)??num(da.inverterPower)??num(t.inverterPower);
    const explicitLoad=num(ac.loadPower)??num(da.loadPower)??num(t.loadPower);
    const load=finite(explicitLoad)?Math.abs(explicitLoad):(finite(power)&&power<0?Math.abs(power):null);
    const dc=num(ac.dcPower)??num(t.dcLoadPower);

    return {soc,voltage,current,power,solar,start,shore,shoreV,charger,inverter,load,dc,sampledAt:live.sampledAt||t.liveTechnicalAt||''};
  }

  function renderEnergy(){
    const s=energySnapshot();

    /* Marine Glass fallback-kaart. Deze blijft bruikbaar als de aparte
       Victron Live-kaart onverhoopt niet geladen is. */
    if($('#mgSoc')){
      set('mgSoc',finite(s.soc)?`${Math.round(clamp(s.soc,0,100))}%`:'–%');
      set('mgVolt',fmt(s.voltage,2,' V'));
      set('mgAmp',signed(s.current,2,' A'));
      set('mgSolar',fmt(s.solar,0,' W'));
      set('mgLoad',fmt(s.load,0,' W'));
      set('mgShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
      set('mgStart','Startaccu');set('mgStartV',fmt(s.start,2,' V'));
      set('mgInv',fmt(s.inverter,0,' W'));set('mgChg',fmt(s.charger,0,' W'));
      set('mgNetPower',signed(s.power,0,' W'));set('mgPv',fmt(s.solar,0,' W'));set('mgBatP',signed(s.power,0,' W'));
      set('mgInv2',fmt(s.inverter,0,' W'));set('mgChg2',fmt(s.charger,0,' W'));
      const flow=$('mgFlow');if(flow)flow.dataset.dir=!finite(s.power)?'idle':s.power>15?'in':s.power<-15?'out':'idle';
    }

    /* Ook de geïsoleerde Victron-kaart krijgt exact dezelfde bronvolgorde. */
    if($('#msVictronLivePanel')){
      set('msvSoc',finite(s.soc)?`${Math.round(clamp(s.soc,0,100))}%`:'–%');
      set('msvVolt',fmt(s.voltage,2,' V'));set('msvAmp',signed(s.current,2,' A'));set('msvBatPower',signed(s.power,0,' W'));
      set('msvSolar',fmt(s.solar,0,' W'));set('msvLoad',fmt(s.load,0,' W'));set('msvDc',fmt(finite(s.dc)?Math.abs(s.dc):null,0,' W'));
      set('msvShore',s.shore===true?'Aangesloten':s.shore===false?'Niet aangesloten':'Niet gekoppeld');
      set('msvShoreMeta',s.shore===true&&finite(s.shoreV)?`${fmt(s.shoreV,0,' V')} via MultiPlus`:s.shore===false?'Geen walspanning':'Cerbo / MultiPlus-data ontbreekt');
      set('msvStart',fmt(s.start,2,' V'));
      set('msvStartState',!finite(s.start)?'Wachten op meting':s.start>=12.2?'In orde':s.start>=12?'Laag':'Controleren');
      const multi=finite(s.charger)&&s.charger>5?'Laden':finite(s.inverter)&&Math.abs(s.inverter)>5?'Omvormen':s.shore===true?'Walstroom':'Stand-by';
      set('msvMulti',multi);set('msvInv',fmt(s.inverter,0,' W'));set('msvCharge',finite(s.charger)&&s.charger>5?'Laden':'Lader uit');set('msvChg',fmt(s.charger,0,' W'));
    }
  }

  function navValue(){
    const state=window.liveNavState||{};
    const course=num(state.course)??num(state.cog)??num(state.courseOverGround)??num(state.trackBearing)??num(state.gps?.course)??num(state.gps?.cog);
    const rudder=num(state.rudderAngle)??num(state.rudder)??num(state.steering?.rudderAngle);
    return {course,rudder};
  }

  function renderNavigation(){
    const {course,rudder}=navValue();
    const courseDial=$('mgd-course');
    if(courseDial)courseDial.style.setProperty('--p',finite(course)?clamp((((course%360)+360)%360)/360,0,1):0);
    set('mg-course',finite(course)?`${Math.round(((course%360)+360)%360)}°`:'–');
    set('mgs-course',finite(course)?'COG':'COG niet beschikbaar');

    /* liveRudderInput is alleen een handmatige schuif met standaard value=0.
       Die 0 mag dus niet meer automatisch als echte middenstand verschijnen. */
    const rudderDial=$('mgd-rudder');
    if(rudderDial)rudderDial.style.setProperty('--p',finite(rudder)?clamp((rudder+35)/70,0,1):0.5);
    if(finite(rudder)){
      const r=clamp(rudder,-35,35);
      set('mg-rudder',`${Math.abs(Math.round(r))}°`);
      set('mgs-rudder',r<-.5?'BB':r>.5?'SB':'Midden');
    }else{
      set('mg-rudder','–');
      set('mgs-rudder','Niet gekoppeld');
    }
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
    if(busy||(!force&&Date.now()-lastFetch<55000))return false;
    const c=client(),b=boat(),u=user(),vrm=token();
    if(!c||!b?.id||!u||!vrm)return false;
    busy=true;lastFetch=Date.now();
    try{
      const {data,error}=await c.functions.invoke('victron-energy-live',{body:{boatId:b.id},headers:{'x-vrm-token':vrm}});
      if(error||!data?.success)throw error||new Error(data?.error||'Geen geldige VRM-data');
      window.MIJSERENITY_VRM_LIVE_ENERGY=data;
      window.dispatchEvent(new CustomEvent('mijnserenity-vrm-energy-live-updated',{detail:data}));
      queueRender();return true;
    }catch(error){console.warn('Dashboard live waarden konden niet worden vernieuwd:',error);return false}
    finally{busy=false}
  }

  function render(){renderEnergy();renderNavigation()}
  function queueRender(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;render()})}

  ['mijnserenity:dashboard-ready','mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queueRender,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRender();refreshLive(false)}},{passive:true});
  window.addEventListener('focus',()=>{queueRender();refreshLive(false)},{passive:true});

  function start(){
    queueRender();
    setTimeout(queueRender,300);setTimeout(queueRender,1200);setTimeout(()=>refreshLive(true),1700);
    setInterval(()=>{if(!document.hidden){queueRender();refreshLive(false)}},60000);
    /* Dashboard-pro zelf ververst om de 12 s. Een lichte 3 s correctieronde
       voorkomt dat een oude fallback tijdelijk weer 'Midden' of lege VRM-data toont. */
    setInterval(()=>{if(!document.hidden)queueRender()},3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();