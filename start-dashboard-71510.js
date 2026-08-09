
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

    const savedPhoto=$('dashboardBoatPhoto');
    const heroPhoto=$('ms71514HeroPhoto');
    const savedSource=savedPhoto?.currentSrc||savedPhoto?.src||'';
    if(heroPhoto && savedSource && !savedPhoto?.classList.contains('hidden')){
      if(heroPhoto.src!==savedSource)heroPhoto.src=savedSource;
      heroPhoto.classList.remove('hidden');
    }else if(heroPhoto){
      heroPhoto.removeAttribute('src');
      heroPhoto.classList.add('hidden');
    }

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

    const rwsTemp=window.liveNavState?.weather?.waterTemperature;
    const waterTemp=Number.isFinite(Number(rwsTemp))
      ?`${Number(rwsTemp).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} °C`
      :(text('ms793WeatherWaterTemp')||'– °C');
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

  let frame=0;
  const queueSync=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;syncDashboard()});
  };
  document.addEventListener('DOMContentLoaded',()=>{
    queueSync();
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange']
      .forEach(name=>window.addEventListener(name,queueSync,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync()},{passive:true});
    const savedPhoto=$('dashboardBoatPhoto');
    if(savedPhoto)new MutationObserver(queueSync).observe(savedPhoto,{attributes:true,attributeFilter:['src','class']});
    setInterval(()=>{if(!document.hidden)queueSync()},5000);
  },{once:true});
})();

/* MijnSerenity 7.15.16 — RWS WaterWebservices door dezelfde Netlify-origin sturen.
   Safari/iOS blokkeerde de rechtstreekse cross-origin POST met "Load failed". */
(function(){
  'use strict';
  if(window.__msRwsFetchProxyInstalled)return;
  window.__msRwsFetchProxyInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  const catalog='https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES/OphalenCatalogus';
  const latest='https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen';
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url===catalog)return nativeFetch('/api/rws-water-catalogus',init);
    if(url===latest)return nativeFetch('/api/rws-water-latest',init);
    return nativeFetch(input,init);
  };
})();

/* MijnSerenity 7.15.17 — RWS watertemperatuur opschonen + kaart 10 km doorsnede */
(function(){
  'use strict';

  function hideLegacyWaterCard(){
    const legacy=document.getElementById('ms793WeatherWaterTemp')?.closest('article');
    if(legacy)legacy.style.setProperty('display','none','important');
  }

  function currentCoords(){
    try{
      const point=window.liveNavState?.points?.at?.(-1);
      const lat=Number(point?.lat);
      const lon=Number(point?.lon);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch(e){}
    try{
      const raw=localStorage.getItem(`mijnserenity-weather-793-${window.currentBoat?.id||'serenity'}`);
      const cached=JSON.parse(raw||'null');
      const lat=Number(cached?.coordinates?.lat);
      const lon=Number(cached?.coordinates?.lon);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch(e){}
    return null;
  }

  function patchRwsMapZoom(){
    const proto=window.L?.Map?.prototype;
    if(!proto||proto.__ms71517TenKmFitBounds)return;
    const original=proto.fitBounds;
    proto.fitBounds=function(bounds,options){
      try{
        if(this.getContainer?.()?.id==='ms71515RwsWaterMap'){
          const coords=currentCoords();
          if(coords){
            const circle=window.L.circle([coords.lat,coords.lon],{radius:5000});
            const nextOptions={...(options||{})};
            delete nextOptions.maxZoom;
            nextOptions.padding=[8,8];
            return original.call(this,circle.getBounds(),nextOptions);
          }
        }
      }catch(e){
        console.warn('RWS kaart kon niet op 10 km doorsnede worden gezet',e);
      }
      return original.call(this,bounds,options);
    };
    proto.__ms71517TenKmFitBounds=true;
  }

  function init(){
    hideLegacyWaterCard();
    patchRwsMapZoom();
    new MutationObserver(()=>{
      hideLegacyWaterCard();
      patchRwsMapZoom();
    }).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
