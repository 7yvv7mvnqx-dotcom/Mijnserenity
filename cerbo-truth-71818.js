/* MijnSerenity 7.18.18 — Cerbo/VRM is leidend voor energie, startaccu en tanks. */
(()=>{
  'use strict';
  if(window.__msCerboTruth71818)return;
  window.__msCerboTruth71818=true;

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const n=v=>finite(v)?Number(v):null;
  const metric=v=>n(v?.value);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const fmt=(v,d=0,suffix='')=>v===null?`–${suffix}`:`${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d})}${suffix}`;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};
  const setMany=(ids,value)=>ids.forEach(id=>set(id,value));
  const fresh=(data,maxAge=180000)=>{
    if(!data||typeof data!=='object')return null;
    const at=Date.parse(String(data.sampledAt||data.updatedAt||''));
    return Number.isFinite(at)&&Date.now()-at<=maxAge?data:null;
  };

  function direct(){
    const live=fresh(window.MIJSERENITY_VRM_LIVE_ENERGY,180000);
    const diag=fresh(window.MIJSERENITY_VRM_DIAGNOSTICS,10*60*1000);
    const lb=live?.battery||{}, db=diag?.battery||{};
    const ls=live?.solar||{}, ds=diag?.solar||{};
    const battery={
      soc:n(lb.soc)??metric(db.soc),
      voltage:n(lb.voltage)??metric(db.voltage),
      current:n(lb.current)??metric(db.current),
      power:n(lb.power)??metric(db.power),
      starterVoltage:n(lb.starterVoltage)??metric(db.starterVoltage)
    };
    if(battery.power===null&&battery.voltage!==null&&battery.current!==null)battery.power=battery.voltage*battery.current;
    return {
      live,
      battery,
      solar:{power:n(ls.power)??metric(ds.power),pvVoltage:n(ls.pvVoltage)??metric(ds.pvVoltage)},
      ac:live?.ac||null,
      tanks:live?.tanks||null
    };
  }

  function powerTone(id,value){
    const el=$(id);if(!el)return;
    el.classList.remove('ms-cerbo-charge','ms-cerbo-discharge');
    if(value!==null&&value>0.5)el.classList.add('ms-cerbo-charge');
    else if(value!==null&&value<-.5)el.classList.add('ms-cerbo-discharge');
  }

  function energy(s){
    const b=s.battery, solar=s.solar.power, ac=s.ac;
    if(b.soc!==null){const shown=fmt(b.soc,0,'%');setMany(['mgSoc','ms71510HouseSoc','techHouseSoc'],shown)}
    if(b.voltage!==null){const shown2=fmt(b.voltage,2,' V'),shown1=fmt(b.voltage,1,' V');setMany(['techHouseVoltage','ivmsBatteryVoltage','ms71510HouseVoltage'],shown2);set('mgVolt',shown1)}
    if(b.current!==null){const shown=fmt(b.current,1,' A');setMany(['mgAmp','techHouseCurrent','ivmsBatteryCurrent','ms71510HouseCurrent'],shown)}

    if(solar!==null){const shown=fmt(Math.max(0,solar),0,' W');setMany(['mgSolar','mgPv','techSolarPower','ivmsSolarPower'],shown)}

    if(b.starterVoltage!==null){
      const shown2=fmt(b.starterVoltage,2,' V');
      setMany(['techStartVoltage','liveStartVoltage','ms71510StartVoltage','mgStartV'],shown2);
      set('mgStart','Startaccu');
    }

    const p=b.power;
    if(p!==null){
      const shown=`${p>0?'+':''}${fmt(p,0,' W')}`;
      setMany(['mgNetPower','mgBatP'],shown);
      powerTone('mgNetPower',p);powerTone('mgBatP',p);
      const flow=$('mgFlow');if(flow)flow.dataset.dir=p>15?'in':p<-15?'out':'idle';
    }

    if(ac){
      const shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
      const shoreText=shore===true?'Aangesloten':shore===false?'Niet aangesloten':'–';
      setMany(['mgShore','techShorePowerStatus','ivmsShorePower'],shoreText);
      const inverter=n(ac.inverterPower),charger=n(ac.chargerPower),acLoad=n(ac.loadPower);
      const invText=fmt(inverter,0,' W'),chgText=fmt(charger,0,' W');
      setMany(['mgInv','mgInv2','techInverterPower','ivmsInverterPower'],invText);
      setMany(['mgChg','mgChg2','techChargerPower','ivmsChargerPower'],chgText);

      let load=acLoad;
      if(p!==null&&p<-.5){
        const dcDraw=Math.abs(p)+Math.max(0,solar??0);
        load=Math.max(load??0,dcDraw);
      }else if(load===null&&p!==null){
        load=Math.max(0,(charger??0)+Math.max(0,solar??0)-Math.max(0,p));
      }
      if(load!==null)set('mgLoad',fmt(load,0,' W'));
    }else if(p!==null&&p<-.5){
      set('mgLoad',fmt(Math.abs(p)+Math.max(0,solar??0),0,' W'));
    }
  }

  function tankCapacity(type,tank){
    if(n(tank?.capacityLiters)>0)return n(tank.capacityLiters);
    if(type==='fuel'){
      try{
        const t=typeof technicalStateCache!=='undefined'?technicalStateCache:{};
        for(const key of ['fuelCapacityLiters','fuelCapacityL','fuelTankCapacity','fuelCapacity'])if(n(t?.[key])>0)return n(t[key]);
      }catch{}
      return 360;
    }
    return null;
  }
  function validTank(tank){return tank&&n(tank.levelPct)!==null&&(n(tank.status)===null||n(tank.status)===0)}
  function tank(type,tank){
    const ids=type==='water'?['techWaterLevel','ivmsWaterValue']:type==='fuel'?['techFuelLevel','ms71510Fuel']:['techWasteLevel','ivmsWasteLevel'];
    const modern=`scdTank-${type}`,bar=$(`mg-${type}-bar`),gauge=$(`scdTankGauge-${type}`);
    const title=$(`mg-${type}`)?.closest('.mg-level')?.querySelector('small');
    if(title&&type==='fuel')title.textContent='Dieseltank';
    const modernTitle=$(modern)?.closest('.scd-tank')?.querySelector('.scd-tank-title');
    if(modernTitle&&type==='fuel')modernTitle.textContent='⛽ Dieseltank';

    if(!validTank(tank)){
      set(`mg-${type}`,'–%');set(modern,'–%');setMany(ids,'–%');
      if(bar)bar.style.width='0%';if(gauge)gauge.style.setProperty('--p',0);
      set(`mg-${type}-l`,'Niet gekoppeld');set(`scdTankMeta-${type}`,'Geen geldige Cerbo-tanksensor');
      return;
    }
    const value=clamp(n(tank.levelPct),0,100),shown=`${Math.round(value)}%`;
    set(`mg-${type}`,shown);set(modern,shown);setMany(ids,shown);
    if(bar)bar.style.width=`${value}%`;if(gauge)gauge.style.setProperty('--p',value);
    set(`scdTankMeta-${type}`,tank.name||tank.fluidName||'Cerbo GX');
    const capacity=tankCapacity(type,tank),remaining=n(tank.remainingLiters);
    let liters='– L';
    if(type==='fuel'&&capacity){const approx=remaining??Math.round(capacity*value/100);liters=`circa ${Math.round(approx)} van ${Math.round(capacity)} liter`;setMany(['techFuelLiters','ivmsFuelLiters'],`${Math.round(approx)} L`)}
    else if(remaining!==null)liters=`${Math.round(remaining)} L`;
    else if(capacity)liters=`circa ${Math.round(capacity*value/100)} L`;
    set(`mg-${type}-l`,liters);
  }
  function tanks(s){
    if(!s.live||!s.tanks)return;
    tank('water',s.tanks.water);tank('fuel',s.tanks.fuel);tank('waste',s.tanks.waste);
  }

  let queued=false;
  function apply(){
    queued=false;
    const s=direct();
    energy(s);tanks(s);
  }
  function queue(){if(queued)return;queued=true;queueMicrotask(apply)}

  function style(){
    if($('msCerboTruthStyle71818'))return;
    const el=document.createElement('style');el.id='msCerboTruthStyle71818';
    el.textContent='#msMarineGlass .ms-cerbo-discharge{color:#ff6464!important}#msMarineGlass .ms-cerbo-charge{color:#43df8b!important}';
    document.head.appendChild(el);
  }
  function observe(){
    const ids=['mgSolar','mgPv','mgShore','mgLoad','mgStartV','mgInv','mgInv2','mgChg','mgChg2','mgNetPower','mgBatP','mg-water','mg-fuel','mg-waste'];
    ids.forEach(id=>{const el=$(id);if(el&&!el.dataset.cerboTruthObserved){el.dataset.cerboTruthObserved='1';new MutationObserver(queue).observe(el,{childList:true,characterData:true,subtree:true})}});
  }
  function start(){
    style();apply();observe();
    setTimeout(()=>window.msRefreshVictronEnergy?.(true),250);
    setTimeout(()=>{observe();apply()},1000);
    setInterval(()=>{if(!document.hidden){observe();apply()}},2500);
    ['mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity-ha-state-updated','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
    window.addEventListener('focus',()=>{window.msRefreshVictronEnergy?.(true);queue()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){window.msRefreshVictronEnergy?.(true);queue()}},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
