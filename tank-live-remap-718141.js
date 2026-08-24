/* MijnSerenity 7.18.14.2 — Victron/Cerbo leidend voor tanks en startaccu */
(()=>{
  'use strict';
  if(window.__msTankLiveRemap718141)return;
  window.__msTankLiveRemap718141=1;

  const $=id=>document.getElementById(id);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const pct=v=>finite(v)?Math.max(0,Math.min(100,Number(v))):null;
  const lower=v=>String(v||'').toLowerCase();

  const TYPES={
    water:{label:'Drinkwater',friendly:[/drinkwater/,/fresh\s*water/,/potable\s*water/,/watertank/],id:[/drinkwater/,/fresh[_\s-]*water/,/water[_\s-]*tank/]},
    fuel:{label:'Dieseltank',friendly:[/diesel/,/brandstof/,/fuel(?:\s*tank)?/],id:[/diesel/,/brandstof/,/fuel(?:[_\s-]*tank)?/]},
    waste:{label:'Vuilwater',friendly:[/vuilwater/,/zwartwater/,/black\s*water/,/waste\s*water/,/holding\s*tank/,/afvalwater/],id:[/vuilwater/,/zwartwater/,/black[_\s-]*water/,/waste[_\s-]*water/,/holding[_\s-]*tank/,/afvalwater/]}
  };

  let last={water:null,fuel:null,waste:null,repurposedWasteAsFuel:false};
  let applying=false;
  let refreshTimer=null;
  let observer=null;

  function states(){
    try{
      const list=window.ms730GetStateSnapshot?.();
      return Array.isArray(list)?list:[];
    }catch{return []}
  }

  function usable(e){
    if(!e||!finite(e.state))return false;
    const unit=lower(e.attributes?.unit_of_measurement);
    const text=`${lower(e.name)} ${lower(e.entity_id)} ${unit}`;
    if(/temperature|temperatuur|voltage|spanning|current|stroom|power|vermogen|alarm|switch|battery/.test(text))return false;
    if(unit&&unit!=='%'&&!unit.includes('percent')&&!unit.includes('percentage'))return false;
    const value=Number(e.state);
    return value>=0&&value<=100;
  }

  function friendlyType(e){
    const name=lower(e?.name);
    if(!name)return null;
    const hits=Object.entries(TYPES).filter(([,cfg])=>cfg.friendly.some(rx=>rx.test(name))).map(([key])=>key);
    return hits.length===1?hits[0]:null;
  }

  function score(e,type){
    if(!usable(e))return -9999;
    const friendly=friendlyType(e);
    if(friendly&&friendly!==type)return -9999;
    const cfg=TYPES[type];
    const name=lower(e.name),id=lower(e.entity_id),unit=lower(e.attributes?.unit_of_measurement);
    const source=`${name} ${id} ${lower(e.attributes?.integration)} ${lower(e.attributes?.source)} ${lower(e.attributes?.device_name)}`;
    let s=0;
    if(friendly===type)s+=300;
    cfg.friendly.forEach((rx,i)=>{if(rx.test(name))s+=120-i*5});
    cfg.id.forEach((rx,i)=>{if(rx.test(id))s+=friendly?5:35-i*2});
    if(unit==='%'||unit.includes('percent'))s+=40;
    if(/tank|level|niveau/.test(name))s+=18;
    if(/tank|level|niveau/.test(id))s+=8;

    // De echte Victron/Cerbo/VRM-bron moet altijd vóór een oude helper/template komen.
    if(/^sensor\.vrm_/.test(id))s+=360;
    if(/\bvrm\b/.test(source))s+=280;
    if(/victron|cerbo|venus/.test(source))s+=220;
    if(/serenity/.test(source))s+=20;
    if(/input_number|helper|template|manual|handmatig/.test(source))s-=160;
    return s;
  }

  function resolve(){
    const list=states();
    const used=new Set();
    const out={water:null,fuel:null,waste:null,repurposedWasteAsFuel:false};
    const ranked=[];
    for(const type of ['fuel','water','waste']){
      for(const e of list){
        const s=score(e,type);
        if(s>0)ranked.push({type,e,score:s});
      }
    }
    ranked.sort((a,b)=>b.score-a.score);
    for(const item of ranked){
      if(out[item.type]||used.has(item.e.entity_id))continue;
      out[item.type]=item.e;
      used.add(item.e.entity_id);
    }
    const fuel=out.fuel;
    if(fuel){
      const name=lower(fuel.name),id=lower(fuel.entity_id);
      out.repurposedWasteAsFuel=(/diesel|brandstof|fuel/.test(name)&&/vuilwater|zwartwater|waste|black[_\s-]*water/.test(id));
    }
    return out;
  }

  function technical(){
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache)return technicalStateCache;
      if(typeof readTechnicalLocalState==='function')return readTechnicalLocalState();
    }catch{}
    return {};
  }

  function fuelCapacity(){
    const current=technical()||{};
    for(const key of ['fuelCapacityLiters','fuelCapacityL','fuelTankCapacity','fuelCapacity']){
      if(finite(current[key])&&Number(current[key])>0)return Number(current[key]);
    }
    return 360;
  }

  function mergeTechnical(resolved){
    try{
      const current=technical()||{};
      const next={...current};
      if(resolved.water)next.waterPct=pct(resolved.water.state);
      if(resolved.fuel){
        const value=pct(resolved.fuel.state);
        const capacity=fuelCapacity();
        next.fuelPct=value;
        next.fuelLiters=value===null?null:Math.round(capacity*value/100);
        if(!finite(next.fuelCapacityLiters))next.fuelCapacityLiters=capacity;
      }
      if(resolved.waste)next.wastePct=pct(resolved.waste.state);
      else if(resolved.repurposedWasteAsFuel)next.wastePct=null;
      next.liveTankSources={
        water:resolved.water?.entity_id||'',
        fuel:resolved.fuel?.entity_id||'',
        waste:resolved.waste?.entity_id||'',
        updatedAt:new Date().toISOString()
      };
      if(typeof technicalStateCache!=='undefined'){
        technicalStateCache=typeof normaliseTechnicalState==='function'?normaliseTechnicalState(next):next;
      }
    }catch(error){console.warn('Tankwaarden samenvoegen mislukt:',error)}
  }

  function text(id,value){const e=$(id);if(e&&e.textContent!==value)e.textContent=value}
  function width(id,value){const e=$(id);if(e)e.style.width=`${value==null?0:value}%`}
  function ring(id,value){const e=$(id);if(e)e.style.setProperty('--p',value==null?0:value)}

  function labelFuel(){
    const old=$('mg-fuel')?.closest('.mg-level')?.querySelector('small');
    if(old&&old.textContent!=='Dieseltank')old.textContent='Dieseltank';
    const modern=$('scdTank-fuel')?.closest('.scd-tank')?.querySelector('.scd-tank-title');
    if(modern&&modern.textContent.trim()!=='⛽ Dieseltank')modern.textContent='⛽ Dieseltank';
  }

  function syncFuelLiters(value){
    const capacity=fuelCapacity();
    const liters=value==null?null:Math.round(capacity*value/100);
    const plain=liters==null?'– L':`${liters} L`;
    ['techFuelLiters','ivmsFuelLiters','scdTankLiters-fuel'].forEach(id=>text(id,plain));
    text('mg-fuel-l',liters==null?'– L':`circa ${liters} van ${Math.round(capacity)} liter`);

    // Ondersteun ook de compacte mobiele dieselregel zonder afhankelijk te zijn van één oud element-id.
    const fuelValue=$('mg-fuel');
    const row=fuelValue?.closest('.mg-level');
    if(row&&liters!==null){
      row.querySelectorAll('span,small,em,strong,div').forEach(el=>{
        if(el===fuelValue||el.children.length)return;
        const valueText=String(el.textContent||'').trim();
        if(/^circa\s+\d+\s+van\s+\d+\s+liter$/i.test(valueText))el.textContent=`circa ${liters} van ${Math.round(capacity)} liter`;
      });
    }
  }

  function directStartVoltage(){
    const metric=window.MIJSERENITY_VRM_DIAGNOSTICS?.battery?.starterVoltage;
    return finite(metric?.value)?Number(metric.value):null;
  }

  function syncDirectStart(){
    const value=directStartVoltage();
    if(value===null)return;
    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object')technicalStateCache.startVoltage=value;
    }catch{}
    const shown=`${value.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2})} V`;
    ['techStartVoltage','liveStartVoltage','ms71510StartVoltage','scdStart1'].forEach(id=>text(id,shown));
    if($('scdStart1State')){
      text('scdStart1State',value>=11.8?'✓ OK':'⚠ Laag');
      $('scdStart1State').classList.toggle('bad',value<11.8);
    }
  }

  function setTank(type,e,{clear=false}={}){
    const value=e?pct(e.state):null;
    const shown=value==null?'–%':`${Math.round(value)}%`;
    const meta=e?(e.name||e.entity_id):'Geen aparte HA/Cerbo-sensor';

    const legacyIds=type==='water'
      ?['techWaterLevel','ivmsWaterValue','mg-water']
      :type==='fuel'
        ?['techFuelLevel','ms71510Fuel','mg-fuel']
        :['techWasteLevel','ivmsWasteLevel','mg-waste'];
    legacyIds.forEach(id=>text(id,shown));
    width(`mg-${type}-bar`,value);

    text(`scdTank-${type}`,shown);
    text(`scdTankMeta-${type}`,meta);
    ring(`scdTankGauge-${type}`,value);
    if(type==='fuel')syncFuelLiters(value);

    if(clear&&type==='waste'){
      text('techWasteLiters','– L');
      text('ivmsWasteLiters','– L');
      text('mg-waste-l','– L');
    }
  }

  function apply(){
    if(applying)return;
    applying=true;
    try{
      const resolved=resolve();
      last=resolved;
      mergeTechnical(resolved);
      labelFuel();
      setTank('water',resolved.water);
      setTank('fuel',resolved.fuel);
      setTank('waste',resolved.waste,{clear:resolved.repurposedWasteAsFuel&&!resolved.waste});
      syncDirectStart();
      window.MIJSERENITY_TANK_LIVE={
        water:resolved.water?{entityId:resolved.water.entity_id,name:resolved.water.name,value:pct(resolved.water.state)}:null,
        fuel:resolved.fuel?{entityId:resolved.fuel.entity_id,name:resolved.fuel.name,value:pct(resolved.fuel.state)}:null,
        waste:resolved.waste?{entityId:resolved.waste.entity_id,name:resolved.waste.name,value:pct(resolved.waste.state)}:null,
        repurposedWasteAsFuel:resolved.repurposedWasteAsFuel,
        updatedAt:new Date().toISOString()
      };
    }finally{applying=false}
  }

  async function refreshStates(){
    try{
      if(!states().length&&typeof window.ms730RefreshStateSnapshot==='function')await window.ms730RefreshStateSnapshot();
    }catch{}
    apply();
  }

  function observe(){
    const root=$('dashboard');
    if(!root||observer)return;
    observer=new MutationObserver(()=>{
      if(applying)return;
      requestAnimationFrame(apply);
    });
    observer.observe(root,{subtree:true,childList:true,characterData:true});
  }

  function boot(){
    observe();
    refreshStates();
    syncDirectStart();
    window.addEventListener('mijnserenity-ha-state-updated',apply,{passive:true});
    window.addEventListener('mijnserenity-ha-connected',refreshStates,{passive:true});
    window.addEventListener('mijnserenity-vrm-diagnostics-updated',syncDirectStart,{passive:true});
    refreshTimer=setInterval(refreshStates,15000);
    setTimeout(refreshStates,1200);
    setTimeout(refreshStates,4500);
    console.info('MijnSerenity: Victron/Cerbo is leidend voor tankmapping en startaccuspanning.');
  }

  window.ms718141ResolveTanks=()=>window.MIJSERENITY_TANK_LIVE||last;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
