/* MijnSerenity 7.18.19 — dieselwaarde strak synchroniseren met live Cerbo/VRM. */
(()=>{
  'use strict';
  if(window.__msCerboTankSync71819)return;
  window.__msCerboTankSync71819=true;

  const $=id=>document.getElementById(id);
  const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function capacity(fuel){
    const direct=num(fuel?.capacityLiters);
    if(direct&&direct>0)return direct;
    try{
      const t=typeof technicalStateCache!=='undefined'?technicalStateCache:null;
      for(const key of ['fuelCapacityLiters','fuelCapacityL','fuelTankCapacity','fuelCapacity']){
        const v=num(t?.[key]);if(v&&v>0)return v;
      }
    }catch{}
    return 360;
  }

  function liveFuel(){
    const data=window.MIJSERENITY_VRM_LIVE_ENERGY;
    if(!data||typeof data!=='object')return null;
    const sampled=Date.parse(String(data.sampledAt||''));
    if(Number.isFinite(sampled)&&Date.now()-sampled>120000)return null;
    const fuel=data?.tanks?.fuel;
    const pct=num(fuel?.levelPct);
    if(pct===null||pct<0||pct>100)return null;
    return fuel;
  }

  function apply(){
    const fuel=liveFuel();
    if(!fuel)return;
    const pct=Math.max(0,Math.min(100,num(fuel.levelPct)));
    const shown=`${Math.round(pct)}%`;
    ['mg-fuel','scdTank-fuel','techFuelLevel','ms71510Fuel'].forEach(id=>set(id,shown));
    const bar=$('mg-fuel-bar');if(bar)bar.style.width=`${pct}%`;
    const gauge=$('scdTankGauge-fuel');if(gauge)gauge.style.setProperty('--p',pct);

    const cap=capacity(fuel);
    const remaining=num(fuel.remainingLiters)??Math.round(cap*pct/100);
    set('mg-fuel-l',`circa ${Math.round(remaining)} van ${Math.round(cap)} liter`);
    ['techFuelLiters','ivmsFuelLiters','scdTankLiters-fuel'].forEach(id=>set(id,`${Math.round(remaining)} L`));

    try{
      if(typeof technicalStateCache!=='undefined'&&technicalStateCache&&typeof technicalStateCache==='object'){
        technicalStateCache.fuelPct=pct;
        technicalStateCache.fuelLiters=Math.round(remaining);
      }
    }catch{}
  }

  async function refresh(){
    try{await window.msRefreshVictronEnergy?.(true)}catch{}
    apply();
  }

  window.addEventListener('mijnserenity-vrm-energy-live-updated',apply,{passive:true});
  window.addEventListener('focus',refresh,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(refresh,600)},{once:true});
  else setTimeout(refresh,600);
  setInterval(()=>{if(!document.hidden)refresh()},15000);
})();
