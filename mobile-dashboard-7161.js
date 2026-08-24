
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const txt=id=>($(id)?.textContent||'').trim();
  const n=v=>{
    const m=String(v||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):null;
  };
  const set=(id,v)=>{const e=$(id);if(e&&v!==undefined&&v!==null&&v!=='')e.textContent=v};

  function sync(){
    if(!$('ms7161Dashboard'))return;

    const sys=(txt('ivmsSystemLabel')||'NORMAAL').toUpperCase();
    set('ms7161System',sys);
    const system=$('ms7161System')?.closest('.ms7161-system');
    const alarm=/alarm|krit|storing|waarsch/i.test(sys);
    system?.classList.toggle('alarm',alarm);

    const speed=n(txt('ivmsSpeed'));
    set('ms7161Speed',speed===null?'0':speed.toLocaleString('nl-NL',{maximumFractionDigits:1}));
    set('ms7161SpeedKn',txt('ivmsSpeedKn')||'0 kn');

    const rpm=n(txt('liveEngineRpm'))??n($('liveEngineRpmInput')?.value)??0;
    set('ms7161Rpm',Math.round(rpm).toLocaleString('nl-NL'));
    set('ms7161RpmSub',`${Math.round(rpm).toLocaleString('nl-NL')} u/min`);

    set('ms7161Depth',txt('ivmsDepth')||'–');
    set('ms7161DepthSub',txt('ivmsDepthUnit')||'nog niet gekoppeld');

    set('ms7161Wind',txt('ivmsWindValue')||'–');
    const bft=txt('ivmsWindUnit');
    set('ms7161WindBft',bft?(bft.toLowerCase().includes('bft')?bft:`${bft} Bft`):'– Bft');

    let fuel=txt('ivmsFuelRing')||txt('techFuelLevel')||txt('ivmsFuelLiters');
    const fuelN=n(fuel);
    set('ms7161Fuel',fuelN===null?'–%':`${Math.round(fuelN)}%`);
    if($('ms7161FuelBar'))$('ms7161FuelBar').style.width=`${Math.max(0,Math.min(100,fuelN??0))}%`;

    const wt=txt('ms793WeatherWaterTemp')||'– °C';
    set('ms7161WaterTemp',wt);
    const wtN=n(wt);
    if($('ms7161WaterBar'))$('ms7161WaterBar').style.width=`${Math.max(0,Math.min(100,((wtN??0)/30)*100))}%`;

    set('ms7161HouseV',txt('ivmsBatteryVoltage')||'– V');
    set('ms7161HouseA',txt('ivmsBatteryCurrent')||'– A');
    const soc=txt('ivmsBatteryRing')||'–%';
    set('ms7161HouseSoc',soc);
    set('ms7161StartV',txt('techStartVoltage')||'– V');

    let rudder=n($('liveRudderInput')?.value);
    if(rudder===null)rudder=0;
    rudder=Math.max(-35,Math.min(35,rudder));
    const needle=$('ms7161RudderNeedle');
    if(needle)needle.style.transform=`translateX(-50%) rotate(${rudder}deg)`;
    const rudderText=rudder===0?'Midden':`${rudder<0?'BB':'SB'} ${Math.abs(Math.round(rudder))}°`;
    set('ms7161RudderText',rudderText);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    sync();
    setInterval(sync,700);
    try{
      const observer=new MutationObserver(sync);
      observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
    }catch(e){}
  });
})();
