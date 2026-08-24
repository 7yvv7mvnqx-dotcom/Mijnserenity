/* MijnSerenity 7.18.21 — snelle, event-driven Cerbo-synchronisatie. */
(()=>{
  'use strict';
  if(window.__msCerboTruth71821)return;
  window.__msCerboTruth71821=true;

  const $=id=>document.getElementById(id);
  const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const metric=v=>num(v?.value);
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};
  const setMany=(ids,value)=>ids.forEach(id=>set(id,value));
  const fmt=(v,d=0,s='')=>v===null?`–${s}`:`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${s}`;

  let canonicalFuelPct=null;
  let stateBusy=false;

  function technical(){
    try{return typeof technicalStateCache!=='undefined'&&technicalStateCache?technicalStateCache:null}catch{return null}
  }
  function client(){try{return typeof sb!=='undefined'?sb:null}catch{return null}}
  function boat(){try{return typeof currentBoat!=='undefined'?currentBoat:null}catch{return null}}

  function style(){
    if($('msCerboTruthStyle71821'))return;
    const el=document.createElement('style');
    el.id='msCerboTruthStyle71821';
    el.textContent='#msMarineGlass .ms-cerbo-discharge{color:#ff6464!important}#msMarineGlass .ms-cerbo-charge{color:#43df8b!important}';
    document.head.appendChild(el);
  }

  function applyEnergy(){
    const diag=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const live=window.MIJSERENITY_VRM_LIVE_ENERGY||{};
    const db=diag.battery||{}, lb=live.battery||{};
    const ds=diag.solar||{}, ls=live.solar||{};
    const soc=num(lb.soc)??metric(db.soc);
    const voltage=num(lb.voltage)??metric(db.voltage);
    const current=num(lb.current)??metric(db.current);
    let power=num(lb.power)??metric(db.power);
    const starter=num(lb.starterVoltage)??metric(db.starterVoltage);
    const solar=num(ls.power)??metric(ds.power);
    if(power===null&&voltage!==null&&current!==null)power=voltage*current;

    if(soc!==null)setMany(['mgSoc','ms71510HouseSoc','techHouseSoc'],fmt(soc,0,'%'));
    if(voltage!==null){set('mgVolt',fmt(voltage,1,' V'));setMany(['techHouseVoltage','ivmsBatteryVoltage','ms71510HouseVoltage'],fmt(voltage,2,' V'))}
    if(current!==null)setMany(['mgAmp','techHouseCurrent','ivmsBatteryCurrent','ms71510HouseCurrent'],fmt(current,1,' A'));
    if(starter!==null){set('mgStart','Startaccu');setMany(['mgStartV','techStartVoltage','liveStartVoltage','ms71510StartVoltage'],fmt(starter,2,' V'))}
    if(solar!==null)setMany(['mgSolar','mgPv','techSolarPower','ivmsSolarPower'],fmt(Math.max(0,solar),0,' W'));
    if(power!==null){
      const txt=`${power>0?'+':''}${fmt(power,0,' W')}`;
      for(const id of ['mgNetPower','mgBatP']){
        set(id,txt);
        const el=$(id);if(el){el.classList.toggle('ms-cerbo-discharge',power<-.5);el.classList.toggle('ms-cerbo-charge',power>.5)}
      }
      if(power<-.5)set('mgLoad',fmt(Math.abs(power)+Math.max(0,solar??0),0,' W'));
      const flow=$('mgFlow');if(flow)flow.dataset.dir=power>15?'in':power<-15?'out':'idle';
    }
  }

  function fuelCapacity(){
    const liveCapacity=num(window.MIJSERENITY_VRM_LIVE_ENERGY?.tanks?.fuel?.capacityLiters);
    if(liveCapacity&&liveCapacity>0)return liveCapacity;
    const t=technical();
    for(const key of ['fuelCapacityLiters','fuelCapacityL','fuelTankCapacity','fuelCapacity']){
      const v=num(t?.[key]);if(v&&v>0)return v;
    }
    return 360;
  }

  function currentFuelPct(){
    /* Live Cerbo/VRM is altijd leidend. De oude technicalStateCache kan minuten achterlopen. */
    const live=num(window.MIJSERENITY_VRM_LIVE_ENERGY?.tanks?.fuel?.levelPct);
    if(live!==null&&live>=0&&live<=100)return live;
    if(canonicalFuelPct!==null)return canonicalFuelPct;
    return num(technical()?.fuelPct);
  }

  function applyFuel(){
    const raw=currentFuelPct();
    if(raw===null||raw<0||raw>100)return;
    const pct=Math.max(0,Math.min(100,raw));
    const shown=`${Math.round(pct)}%`;
    const cap=fuelCapacity();
    const liveRemaining=num(window.MIJSERENITY_VRM_LIVE_ENERGY?.tanks?.fuel?.remainingLiters);
    const liters=liveRemaining!==null?Math.round(liveRemaining):Math.round(cap*pct/100);

    setMany(['techFuelLevel','ms71510Fuel','mg-fuel','scdTank-fuel'],shown);
    setMany(['techFuelLiters','ivmsFuelLiters','scdTankLiters-fuel'],`${liters} L`);
    set('mg-fuel-l',`circa ${liters} van ${Math.round(cap)} liter`);
    const bar=$('mg-fuel-bar');if(bar)bar.style.width=`${pct}%`;
    const gauge=$('scdTankGauge-fuel');if(gauge)gauge.style.setProperty('--p',pct);
    const title=$('mg-fuel')?.closest('.mg-level')?.querySelector('small');if(title)title.textContent='Dieseltank';
    const modernTitle=$('scdTank-fuel')?.closest('.scd-tank')?.querySelector('.scd-tank-title');if(modernTitle)modernTitle.textContent='⛽ Dieseltank';

    try{
      const t=technical();
      if(t&&typeof t==='object'){t.fuelPct=pct;t.fuelLiters=liters}
    }catch{}
  }

  async function refreshCanonicalFuel(){
    if(stateBusy)return;
    const c=client(),b=boat();
    if(!c||!b?.id){applyFuel();return}
    stateBusy=true;
    try{
      const {data,error}=await c.from('technical_state').select('data,updated_at').eq('boat_id',b.id).maybeSingle();
      if(!error&&data?.data){
        const pct=num(data.data.fuelPct);
        if(pct!==null&&pct>=0&&pct<=100)canonicalFuelPct=pct;
        try{
          const t=technical();
          if(t&&typeof t==='object')Object.assign(t,data.data);
        }catch{}
      }
    }catch(error){console.warn('Dieselstand synchroniseren mislukt:',error)}
    finally{stateBusy=false;applyFuel()}
  }

  function render(){style();applyEnergy();applyFuel()}

  function start(){
    render();
    setTimeout(refreshCanonicalFuel,500);
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',applyEnergy,{passive:true});
    window.addEventListener('mijnserenity-vrm-energy-live-updated',()=>{applyEnergy();applyFuel()},{passive:true});
    window.addEventListener('mijnserenity:routechange',render,{passive:true});
    window.addEventListener('focus',()=>{render();refreshCanonicalFuel()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();refreshCanonicalFuel()}},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
