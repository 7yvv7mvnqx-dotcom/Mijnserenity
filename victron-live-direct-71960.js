/* MijnSerenity 7.19.6 — zichtbare Victron Live waarden rechtstreeks uit actuele VRM-data */
(()=>{
  'use strict';
  if(window.__msVictronLiveDirect71960)return;
  window.__msVictronLiveDirect71960=true;

  const $=id=>document.getElementById(id);
  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const num=value=>finite(value)?Number(value):null;
  const fmt=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits})}${suffix}`;
  const signed=(value,digits=0,suffix='')=>!finite(value)?`–${suffix}`:`${Number(value)>0?'+':''}${fmt(value,digits,suffix)}`;
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function freshLive(){
    const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!data||typeof data!=='object'||data.success===false)return null;
    const at=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(at)&&Date.now()-at>5*60*1000)return null;
    return data;
  }

  function startState(value){
    const v=num(value);
    if(v===null)return ['Wachten op meting',''];
    if(v<11.8)return ['Laag','low'];
    if(v<12.2)return ['Controleren','warn'];
    return ['In orde','good'];
  }

  function render(){
    const data=freshLive();
    if(!data)return false;
    const b=data.battery||{},s=data.solar||{},ac=data.ac||{},tanks=data.tanks||{};

    const soc=num(b.soc),voltage=num(b.voltage),current=num(b.current);
    let power=num(b.power);
    if(power===null&&voltage!==null&&current!==null)power=voltage*current;
    const solar=num(s.power);
    const start=num(b.starterVoltage);

    if(soc!==null){
      const pct=clamp(soc,0,100);
      set('mg7195Soc',`${Math.round(pct)}%`);
      set('mgSoc',`${Math.round(pct)}%`);
      const ring=$('mgSocRing');if(ring)ring.style.setProperty('--p',pct);
    }
    if(voltage!==null)set('mgVolt',fmt(voltage,2,' V'));
    if(current!==null)set('mgAmp',signed(current,2,' A'));
    if(power!==null){
      set('mgBatP',signed(power,0,' W'));
      set('mgNetPower',signed(power,0,' W'));
      const mode=$('mgBatteryMode');if(mode)mode.textContent=power>10?'⚡ Laden':power<-10?'⚡ Ontladen':'⚡ Live';
      const flow=$('mgFlow');if(flow)flow.dataset.dir=power>10?'in':power<-10?'out':'idle';
    }
    if(solar!==null){set('mgSolar',fmt(solar,0,' W'));set('mgPv',fmt(solar,0,' W'))}

    const load=num(ac.loadPower);
    const loadFallback=power!==null&&power<0?Math.abs(power):null;
    const shownLoad=load!==null?Math.abs(load):loadFallback;
    if(shownLoad!==null){set('mg7195Load',fmt(shownLoad,0,' W'));set('mg7195LoadFlow',fmt(shownLoad,0,' W'))}

    const dcLoad=num(ac.dcPower);
    if(dcLoad!==null)set('mgDcLoad',fmt(Math.abs(dcLoad),0,' W'));

    const shore=typeof ac.shoreConnected==='boolean'?ac.shoreConnected:null;
    const shoreV=num(ac.inputVoltage);
    if(shore!==null){
      set('mg7195Shore',shore?'Aangesloten':'Niet aangesloten');
      set('mg7195ShoreMeta',shore&&shoreV!==null?`${fmt(shoreV,0,' V')} via MultiPlus`:shore?'Via MultiPlus':'Geen walspanning');
    }

    const charger=num(ac.chargerPower),inverter=num(ac.inverterPower);
    if(charger!==null){set('mgChg',fmt(charger,0,' W'));set('mgChg2',fmt(charger,0,' W'))}
    if(inverter!==null){set('mgInv',fmt(inverter,0,' W'));set('mgInv2',fmt(inverter,0,' W'))}
    if(shore===true)set('mg7195MultiState','Walstroom');
    else if(inverter!==null&&inverter>1)set('mg7195MultiState','Omvormen');
    else if(ac.deviceFound)set('mg7195MultiState','Stand-by');
    if(charger!==null)set('mg7195ChargeState',charger>1?'Laden':'Lader uit');

    if(start!==null){
      set('mgStartVoltage',fmt(start,2,' V'));
      const [label,cls]=startState(start);set('mgStartState',label);
      const el=$('mgStartState');if(el)el.className=`state ${cls}`.trim();
    }

    for(const [type,id,barId] of [['fuel','mg-fuel','mg-fuel-bar'],['water','mg-water','mg-water-bar']]){
      const tank=tanks[type]||{};
      const level=num(tank.levelPct);
      if(level!==null){
        const pct=clamp(level,0,100);set(id,`${Math.round(pct)}%`);
        const bar=$(barId);if(bar)bar.style.width=`${pct}%`;
      }
      if(type==='fuel'){
        const remaining=num(tank.remainingLiters);
        if(remaining!==null)set('mg-fuel-l',`${Math.round(remaining)} L`);
      }
    }

    const sampled=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(sampled)){
      const time=new Date(sampled).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
      set('mgUpdated',`Laatst bijgewerkt: ${time} · Cerbo GX / VRM`);
      const pill=$('mgLivePill');if(pill){pill.classList.remove('offline');pill.classList.add('live')}
    }
    return true;
  }

  let queued=false;
  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;render()});
  }

  ['mijnserenity-vrm-energy-live-updated','mijnserenity-vrm-diagnostics-updated','mijnserenity:dashboard-ready','mijnserenity:routechange'].forEach(name=>window.addEventListener(name,queue,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
  window.addEventListener('focus',queue,{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{queue();setTimeout(queue,800);setTimeout(queue,2500)},{once:true});
  else{queue();setTimeout(queue,800);setTimeout(queue,2500)}
  setInterval(()=>{if(!document.hidden)queue()},15000);
})();
