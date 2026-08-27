/* MijnSerenity 7.19.0 — compatibiliteitsbrug voor oude dashboard-ID's.
   Geen verborgen dashboard-rendering, geen polling, geen MutationObservers,
   geen iPad-CSS-injecties. Alleen nuttige signalen + RWS same-origin proxy. */
(()=>{
  'use strict';
  if(window.__msStartBridge71900)return;
  window.__msStartBridge71900=true;

  const $=id=>document.getElementById(id);
  const text=id=>String($(id)?.textContent||'').trim();
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const set=(id,value)=>{
    const node=$(id);
    if(node&&value!==undefined&&value!==null&&node.textContent!==String(value))node.textContent=String(value);
  };

  function syncSignals(){
    /* Een paar nieuwere Marine Glass-functies hebben nog fallback-ID's uit
       het 7.15-dashboard. We houden alléén die waarden actueel, event-driven. */
    const speed=number(text('ivmsSpeed'));
    if(speed!==null)set('ms71510Speed',speed.toLocaleString('nl-NL',{maximumFractionDigits:1}));

    const depth=text('ivmsDepth');
    if(depth)set('ms71510Depth',depth);

    const rpm=number(text('liveEngineRpm'))??number($('liveEngineRpmInput')?.value);
    if(rpm!==null)set('ms71510Rpm',Math.round(rpm).toLocaleString('nl-NL'));

    const windCandidates=[
      text('ivmsWindBft'),text('liveWindBft'),text('ms71512WindBft'),
      text('weatherWindBft'),text('windBft')
    ];
    const wind=windCandidates.find(value=>number(value)!==null);
    if(wind)set('ms71510WindBft',`${number(wind).toLocaleString('nl-NL',{maximumFractionDigits:1})} Bft`);

    const fuel=number(text('ivmsTankFuelValue'))??number(text('ivmsFuelRing'));
    if(fuel!==null)set('ms71510Fuel',`${Math.round(fuel)}%`);

    const houseV=text('ivmsBatteryVoltage')||text('techHouseVoltage');
    const houseA=text('ivmsBatteryCurrent')||text('techHouseCurrent');
    const houseSoc=text('ivmsBatteryRing')||text('techHouseSoc');
    const startV=text('techStartVoltage')||text('liveStartVoltage');
    if(houseV)set('ms71510HouseVoltage',houseV);
    if(houseA)set('ms71510HouseCurrent',houseA);
    if(houseSoc)set('ms71510HouseSoc',houseSoc);
    if(startV)set('ms71510StartVoltage',startV);
  }

  let queued=false;
  function queueSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;syncSignals()});
  }

  const events=[
    'mijnserenity-ha-state-updated','mijnserenity-ha-connected',
    'mijnserenity-ruuvi-vrm-updated','mijnserenity:routechange',
    'mijnserenity:dashboard-ready'
  ];

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueSync,{once:true});
  else queueSync();
  events.forEach(name=>window.addEventListener(name,queueSync,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync()},{passive:true});
})();

/* RWS WaterWebservices via dezelfde Netlify-origin.
   Dit blijft nodig omdat Safari/iOS de rechtstreekse cross-origin POST kan blokkeren. */
(()=>{
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

/* RWS kaart gebruikt ongeveer 20 km omgeving. Prototype één keer patchen;
   geen documentbrede observer meer. */
(()=>{
  'use strict';
  if(window.__ms719RwsMapPatch)return;
  window.__ms719RwsMapPatch=true;

  function currentCoords(){
    try{
      const state=window.liveNavState||{};
      const direct={lat:Number(state.currentLat??state.lat),lon:Number(state.currentLon??state.lon??state.lng)};
      if(Number.isFinite(direct.lat)&&Number.isFinite(direct.lon))return direct;
      const points=state.points;
      const point=Array.isArray(points)&&points.length?points[points.length-1]:null;
      const lat=Number(point?.lat),lon=Number(point?.lon??point?.lng);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }catch{}
    return null;
  }

  function patch(){
    const proto=window.L?.Map?.prototype;
    if(!proto||proto.__ms719RwsFitBounds)return Boolean(proto);
    const original=proto.fitBounds;
    proto.fitBounds=function(bounds,options){
      try{
        if(this.getContainer?.()?.id==='ms71515RwsWaterMap'){
          const coords=currentCoords();
          if(coords)return this.setView([coords.lat,coords.lon],11,{animate:false});
        }
      }catch(error){console.debug('RWS kaartfit:',error)}
      return original.call(this,bounds,options);
    };
    proto.__ms719RwsFitBounds=true;
    return true;
  }

  function start(){
    if(patch())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(patch()||attempts>=8)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
