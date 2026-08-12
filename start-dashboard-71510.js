
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

/* MijnSerenity 7.15.19 — RWS kaart standaard ca. 20 km doorsnede */
(function(){
  'use strict';

  function hideLegacyWaterCard(){
    const legacy=document.getElementById('ms793WeatherWaterTemp')?.closest('article');
    if(legacy)legacy.style.setProperty('display','none','important');
  }

  function currentCoords(){
    try{
      const points=window.liveNavState?.points;
      const point=Array.isArray(points)&&points.length?points[points.length-1]:null;
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

  function firstRwsMarker(map){
    let found=null;
    try{
      map.eachLayer(layer=>{
        if(found)return;
        if(layer?.getLayers){
          const layers=layer.getLayers();
          for(const child of layers){
            if(child?.getLatLng && !child?.getBounds){
              const p=child.getLatLng();
              if(Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lng))){
                found={lat:Number(p.lat),lon:Number(p.lng)};
                break;
              }
            }
          }
        }
      });
    }catch(e){}
    return found;
  }

  function patchRwsMapZoom(){
    const proto=window.L?.Map?.prototype;
    if(!proto||proto.__ms71519TwentyKmFitBounds)return;
    const original=proto.fitBounds;
    proto.fitBounds=function(bounds,options){
      try{
        if(this.getContainer?.()?.id==='ms71515RwsWaterMap'){
          const coords=currentCoords()||firstRwsMarker(this);
          let center=null;
          if(coords){
            center=[coords.lat,coords.lon];
          }else{
            const b=window.L.latLngBounds(bounds);
            const c=b.getCenter();
            center=[c.lat,c.lng];
          }
          return this.setView(center,11,{animate:false});
        }
      }catch(e){
        console.warn('RWS kaart kon niet op 20 km doorsnede worden gezet',e);
      }
      return original.call(this,bounds,options);
    };
    proto.__ms71519TwentyKmFitBounds=true;
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

/* MijnSerenity 7.15.20 — iPad gebruikt hetzelfde actuele dashboard, maar benut extra ruimte. */
(function(){
  'use strict';
  if(window.__ms71520IPadLayout)return;
  window.__ms71520IPadLayout=true;

  async function installIPadLayout(){
    try{
      const width=Math.max(window.innerWidth||0,document.documentElement.clientWidth||0);
      if(width<=1024 || width>1400)return;
      const response=await fetch('start-dashboard-71510.css?v=715141',{cache:'no-store'});
      if(!response.ok)return;
      let css=await response.text();
      css=css.replace('@media(max-width:1024px)','@media(max-width:1400px)');
      const style=document.createElement('style');
      style.id='ms71520IPadDashboardStyle';
      style.textContent=css+`
@media (min-width:1025px) and (max-width:1400px){
  #appView:not(.hidden) #dashboard{max-width:1220px;margin:0 auto!important;padding-left:18px!important;padding-right:18px!important}
  .ms71510-dashboard{gap:10px!important}
  .ms71514-hero{height:220px!important}
  .ms71510-metrics{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
  .ms71510-metric{height:132px!important}
  .ms71510-twins{gap:10px!important}
  .ms71510-battery-row{grid-template-columns:minmax(0,1fr) 220px!important;gap:10px!important}
  .ms71510-shortcuts{gap:10px!important}
  .ms71510-rudder{height:220px!important}
}`;
      document.head.appendChild(style);
    }catch(error){
      console.warn('iPad-dashboard kon niet worden uitgebreid',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installIPadLayout,{once:true});
  else installIPadLayout();
})();

/* MijnSerenity 7.15.21 — correcte RWS meetdatum + brede weerlayout. */
(function(){
  'use strict';
  if(window.__ms71521WeatherLayout)return;
  window.__ms71521WeatherLayout=true;

  const dayNames=['zo','ma','di','wo','do','vr','za'];
  let queued=false;

  function rwsCard(){
    const map=document.getElementById('ms71515RwsWaterMap');
    if(!map)return null;
    return map.closest('.card, article, section')||map.parentElement;
  }

  function inferMeasuredDate(text){
    const match=String(text||'').trim().match(/^(zo|ma|di|wo|do|vr|za)\s+(\d{1,2})-(\d{1,2})(?:-(\d{4}))?\s*,?\s*(\d{1,2}):(\d{2})$/i);
    if(!match)return null;
    const weekday=match[1].toLowerCase();
    const day=Number(match[2]);
    const month=Number(match[3])-1;
    const hour=Number(match[5]);
    const minute=Number(match[6]);
    const now=new Date();

    if(match[4]){
      const date=new Date(Number(match[4]),month,day,hour,minute,0,0);
      return Number.isNaN(date.getTime())?null:date;
    }

    const candidates=[];
    for(let year=now.getFullYear()-3;year<=now.getFullYear()+1;year++){
      const date=new Date(year,month,day,hour,minute,0,0);
      if(date.getMonth()!==month||date.getDate()!==day)continue;
      if(dayNames[date.getDay()]!==weekday)continue;
      candidates.push(date);
    }
    if(!candidates.length)return null;

    const futureTolerance=6*60*60*1000;
    const past=candidates.filter(date=>date.getTime()<=now.getTime()+futureTolerance);
    return (past.length?past:candidates).sort((a,b)=>Math.abs(now-a)-Math.abs(now-b))[0];
  }

  function formatMeasuredDate(date){
    const weekday=dayNames[date.getDay()];
    const pad=value=>String(value).padStart(2,'0');
    return `${weekday} ${pad(date.getDate())}-${pad(date.getMonth()+1)}-${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function correctMeasuredDate(){
    const card=rwsCard();
    if(!card)return;
    const now=Date.now();
    const nodes=[...card.querySelectorAll('div,span,strong,p')];
    for(const node of nodes){
      if(node.children.length)continue;
      const raw=(node.textContent||'').trim();
      if(!/^(zo|ma|di|wo|do|vr|za)\s+\d{1,2}-\d{1,2}/i.test(raw))continue;
      const date=inferMeasuredDate(raw);
      if(!date)continue;
      const age=now-date.getTime();
      const future=date.getTime()-now;
      const stale=age>36*60*60*1000;
      const impossibleFuture=future>6*60*60*1000;
      const formatted=formatMeasuredDate(date);
      node.textContent=(stale||impossibleFuture)?`Verouderd · ${formatted}`:formatted;
      node.style.color=(stale||impossibleFuture)?'#ffbf5b':'';
      node.title=(stale||impossibleFuture)
        ?'Deze Rijkswaterstaat-meting is niet actueel en wordt daarom als verouderd gemarkeerd.'
        :'Actuele meettijd';
      break;
    }
  }

  function installPairStyle(){
    if(document.getElementById('ms71521WeatherPairStyle'))return;
    const style=document.createElement('style');
    style.id='ms71521WeatherPairStyle';
    style.textContent=`
.ms71521-weather-pair{display:block;width:100%}
@media (min-width:900px){
  .ms71521-weather-pair{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    gap:14px!important;
    align-items:start!important;
  }
  .ms71521-weather-pair>.card,
  .ms71521-weather-pair>article,
  .ms71521-weather-pair>section{
    width:auto!important;
    min-width:0!important;
    margin-top:0!important;
    margin-bottom:0!important;
  }
  .ms71521-weather-pair #ms71515RwsWaterMap{min-height:300px!important}
  .ms71521-weather-pair .ms710-radar-card{height:100%!important}
}
@media (max-width:899px){
  .ms71521-weather-pair>*+*{margin-top:14px!important}
}`;
    document.head.appendChild(style);
  }

  function pairWeatherCards(){
    const rws=rwsCard();
    const radar=document.querySelector('.ms710-radar-card');
    if(!rws||!radar||rws===radar)return;
    let pair=document.getElementById('ms71521WeatherPair');
    if(!pair){
      pair=document.createElement('div');
      pair.id='ms71521WeatherPair';
      pair.className='ms71521-weather-pair';
      rws.parentNode.insertBefore(pair,rws);
    }
    if(rws.parentNode!==pair)pair.appendChild(rws);
    if(radar.parentNode!==pair)pair.appendChild(radar);
    setTimeout(()=>{
      try{
        const map=window.L&&document.getElementById('ms71515RwsWaterMap')?document.getElementById('ms71515RwsWaterMap')._leaflet_id:null;
        if(map&&window.L){
          for(const key in window){
            void key;
          }
        }
      }catch(e){}
      window.dispatchEvent(new Event('resize'));
    },60);
  }

  function run(){
    queued=false;
    installPairStyle();
    correctMeasuredDate();
    pairWeatherCards();
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(run);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('mijnserenity:routechange',queue,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
})();

/* MijnSerenity 7.15.22 — roerstand direct onder wind op startscherm. */
(function(){
  'use strict';
  function placeRudder(){
    const metrics=document.querySelector('#ms71510Dashboard .ms71510-metrics');
    const rudder=document.querySelector('#ms71510Dashboard .ms71510-rudder');
    if(!metrics||!rudder)return;
    if(metrics.nextElementSibling!==rudder){
      metrics.insertAdjacentElement('afterend',rudder);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',placeRudder,{once:true});
  else placeRudder();
})();

/* MijnSerenity 7.15.27 — temperatuur + relatieve vochtigheid Salon en Motorruimte op startdashboard. */
(function(){
  'use strict';
  if(window.__ms71527ClimateDashboard)return;
  window.__ms71527ClimateDashboard=true;

  const $=id=>document.getElementById(id);
  const fmtTemp=value=>Number.isFinite(Number(value))
    ?Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})
    :'–';
  const fmtHumidity=value=>Number.isFinite(Number(value))
    ?Math.round(Number(value)).toLocaleString('nl-NL')
    :'–';

  function installStyle(){
    if($('ms71527ClimateStyle'))return;
    const style=document.createElement('style');
    style.id='ms71527ClimateStyle';
    style.textContent=`
.ms71527-climate-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ms71527-climate-tile{appearance:none;border:0;width:100%;min-width:0;min-height:82px;border-radius:18px;padding:13px 15px;background:linear-gradient(145deg,rgba(19,47,70,.96),rgba(8,28,45,.98));color:#f7fbff;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;text-align:left;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 22px rgba(0,0,0,.16)}
.ms71527-climate-icon{font-size:25px;line-height:1}
.ms71527-climate-copy{min-width:0;display:flex;flex-direction:column;gap:3px}
.ms71527-climate-copy small{font-size:10px;letter-spacing:.09em;font-weight:800;opacity:.72}
.ms71527-climate-values{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ms71527-climate-values strong{font-size:21px;line-height:1.05;font-weight:900;white-space:nowrap}
.ms71527-climate-values span{font-size:14px;font-weight:800;opacity:.82;white-space:nowrap}
.ms71527-climate-chevron{font-size:27px;opacity:.48}
@media(max-width:430px){
 .ms71527-climate-row{gap:8px}
 .ms71527-climate-tile{min-height:76px;padding:11px 10px;gap:8px;border-radius:16px;grid-template-columns:auto minmax(0,1fr)}
 .ms71527-climate-icon{font-size:21px}
 .ms71527-climate-copy small{font-size:9px}
 .ms71527-climate-values{gap:5px}
 .ms71527-climate-values strong{font-size:17px}
 .ms71527-climate-values span{font-size:12px}
 .ms71527-climate-chevron{display:none}
}
`;
    document.head.appendChild(style);
  }

  function ensureRow(){
    const dashboard=$('ms71510Dashboard');
    if(!dashboard)return null;
    let row=$('ms71527ClimateRow');
    if(row)return row;
    row=document.createElement('div');
    row.id='ms71527ClimateRow';
    row.className='ms71527-climate-row';
    row.innerHTML=`
      <button type="button" class="ms71527-climate-tile" onclick="captainNavigate('technical')" aria-label="Open klimaatmeting Salon">
        <span class="ms71527-climate-icon" aria-hidden="true">🌡️</span>
        <span class="ms71527-climate-copy">
          <small>SALON</small>
          <span class="ms71527-climate-values"><strong><b id="ms71527SalonTemp">–</b> °C</strong><span><b id="ms71527SalonRv">–</b>% RV</span></span>
        </span>
        <span class="ms71527-climate-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" class="ms71527-climate-tile" onclick="captainNavigate('technical')" aria-label="Open klimaatmeting Motorruimte">
        <span class="ms71527-climate-icon" aria-hidden="true">⚙️</span>
        <span class="ms71527-climate-copy">
          <small>MOTORRUIMTE</small>
          <span class="ms71527-climate-values"><strong><b id="ms71527MotorTemp">–</b> °C</strong><span><b id="ms71527MotorRv">–</b>% RV</span></span>
        </span>
        <span class="ms71527-climate-chevron" aria-hidden="true">›</span>
      </button>`;
    const twins=dashboard.querySelector('.ms71510-twins');
    const battery=dashboard.querySelector('.ms71510-battery-row');
    if(twins)twins.insertAdjacentElement('afterend',row);
    else if(battery)battery.insertAdjacentElement('beforebegin',row);
    else dashboard.appendChild(row);
    return row;
  }

  function update(){
    installStyle();
    if(!ensureRow())return;
    let climate=null;
    try{climate=window.ms7102GetRuuviClimate?.()||null;}catch(error){climate=null;}
    const salon=climate?.salon||{};
    const motor=climate?.forward||{};
    if($('ms71527SalonTemp'))$('ms71527SalonTemp').textContent=fmtTemp(salon.temperature);
    if($('ms71527SalonRv'))$('ms71527SalonRv').textContent=fmtHumidity(salon.humidity);
    if($('ms71527MotorTemp'))$('ms71527MotorTemp').textContent=fmtTemp(motor.temperature);
    if($('ms71527MotorRv'))$('ms71527MotorRv').textContent=fmtHumidity(motor.humidity);
  }

  let frame=0;
  function queue(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;update();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();
  ['mijnserenity-ruuvi-vrm-updated','mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity:routechange']
    .forEach(name=>window.addEventListener(name,queue,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
  window.setInterval(()=>{if(!document.hidden)queue()},10000);
})();
