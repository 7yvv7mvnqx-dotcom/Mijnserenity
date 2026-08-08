
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const text=id=>($(id)?.textContent||'').trim();
  const number=v=>{
    const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):null;
  };
  const set=(id,value)=>{
    const el=$(id);
    if(el && value!==undefined && value!==null) el.textContent=String(value);
  };

  function syncDashboard(){
    const dash=$('ms71510Dashboard');
    if(!dash)return;

    const sys=(text('ivmsSystemLabel')||'NORMAAL').toUpperCase();
    set('ms71510SystemLabel',sys);
    const system=$('ms71510SystemLabel')?.closest('.ms71510-system');
    system?.classList.toggle('alarm',/alarm|krit|storing|waarsch/i.test(sys));

    const speed=number(text('ivmsSpeed'));
    set('ms71510Speed',speed===null?'0':speed.toLocaleString('nl-NL',{maximumFractionDigits:1}));
    set('ms71510SpeedKn',text('ivmsSpeedKn')||'0 kn');

    const rpm=number(text('liveEngineRpm')) ?? number($('liveEngineRpmInput')?.value) ?? 0;
    set('ms71510Rpm',Math.round(rpm).toLocaleString('nl-NL'));
    set('ms71510RpmSub',`${Math.round(rpm).toLocaleString('nl-NL')} u/min`);

    set('ms71510Depth',text('ivmsDepth')||'–');
    set('ms71510DepthMeta',text('ivmsDepthUnit')||'nog niet gekoppeld');

    set('ms71510Wind',text('ivmsWindValue')||'–');
    const windUnit=text('ivmsWindUnit');
    set('ms71510WindBft',windUnit
      ?(windUnit.toLowerCase().includes('bft')?windUnit:`${windUnit} Bft`)
      :'– Bft');

    const fuelText=text('ivmsTankFuelValue')||text('ivmsFuelRing')||'';
    const fuel=number(fuelText);
    set('ms71510Fuel',fuel===null?'–%':`${Math.round(fuel)}%`);
    if($('ms71510FuelBar')) $('ms71510FuelBar').style.width=`${Math.max(0,Math.min(100,fuel??0))}%`;

    const waterTemp=text('ms793WeatherWaterTemp')||'– °C';
    set('ms71510WaterTemp',waterTemp);
    const wt=number(waterTemp);
    if($('ms71510WaterTempBar')){
      $('ms71510WaterTempBar').style.width=`${Math.max(0,Math.min(100,((wt??0)/30)*100))}%`;
    }

    set('ms71510HouseVoltage',text('ivmsBatteryVoltage')||'– V');
    set('ms71510HouseCurrent',text('ivmsBatteryCurrent')||'– A');
    set('ms71510HouseSoc',text('ivmsBatteryRing')||'–%');
    set('ms71510StartVoltage',text('techStartVoltage')||text('liveStartVoltage')||'– V');

    let rudder=number($('liveRudderInput')?.value);
    if(rudder===null && typeof liveNavState!=='undefined'){
      rudder=number(liveNavState?.rudderAngle);
    }
    rudder=Math.max(-35,Math.min(35,rudder??0));
    const needle=$('ms71510RudderNeedle');
    if(needle) needle.style.transform=`translateX(-50%) rotate(${rudder}deg)`;
    set('ms71510RudderText',
      Math.abs(rudder)<1?'Midden':`${rudder<0?'BB':'SB'} ${Math.abs(Math.round(rudder))}°`
    );
  }

  document.addEventListener('DOMContentLoaded',()=>{
    syncDashboard();
    setInterval(syncDashboard,800);
  },{once:true});
})();
