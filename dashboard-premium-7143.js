(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const num=id=>{
    const raw=String($(id)?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const stateFromFraction=(fraction,invert=false)=>{
    const f=clamp(Number(fraction)||0,0,1);
    const x=invert?1-f:f;
    if(x>=0.66)return 'good';
    if(x>=0.33)return 'warning';
    return 'critical';
  };
  const labelFromState=(state,good='goed',warning='let op',critical='kritiek')=>state==='good'?good:state==='warning'?warning:critical;
  function dashboardVisible(){
    const authView=$('authView');
    const dashboard=$('dashboard');
    return (!authView || authView.classList.contains('hidden')) && !!dashboard;
  }
  function ensure(){
    const dashboard=$('dashboard');
    const ivms=$('serenityIvms');
    if(!dashboard || !ivms) return null;
    let section=$('msDashboardPremium7143');
    if(!section){
      section=document.createElement('section');
      section.id='msDashboardPremium7143';
      section.className='ms-dashboard-premium';
      section.innerHTML=`<div class="ms-premium-head"><div><h3>Dashboard overzicht</h3><p>De belangrijkste boordinfo in een rustig en gelikt overzicht.</p></div><div class="ms-premium-badge">Overzicht</div></div><div class="ms-premium-grid" id="msPremiumGrid7143"></div><div class="ms-premium-actions"><button type="button" class="ms-premium-action" onclick="captainNavigate('live')"><span>⛵</span><small>Live varen</small></button><button type="button" class="ms-premium-action" onclick="captainNavigate('technical')"><span>🔋</span><small>Techniek</small></button><button type="button" class="ms-premium-action" onclick="captainNavigate('planner')"><span>🧭</span><small>Route</small></button><button type="button" class="ms-premium-action" onclick="captainNavigate('weather')"><span>☀️</span><small>Weer</small></button></div>`;
      dashboard.insertBefore(section, ivms);
    }else if(section.previousElementSibling?.id !== 'msWelcomeCard7140' && $('msWelcomeCard7140')){
      $('msWelcomeCard7140').insertAdjacentElement('afterend',section);
    }
    return section;
  }
  function render(){
    if(!dashboardVisible()) return;
    ensure();
    const grid=$('msPremiumGrid7143');
    if(!grid) return;

    const houseV=num('techHouseVoltage');
    const houseF=Number.isFinite(houseV)?clamp((houseV-10.5)/(13.5-10.5),0,1):.45;
    const houseState=stateFromFraction(houseF);
    const fuel=num('techFuelLevel');
    const fuelF=Number.isFinite(fuel)?clamp(fuel/100,0,1):.45;
    const fuelState=stateFromFraction(fuelF);
    const water=num('techWaterLevel');
    const waterF=Number.isFinite(water)?clamp(water/100,0,1):.45;
    const waterState=stateFromFraction(waterF);
    const waste=num('techWasteLevel');
    const wasteF=Number.isFinite(waste)?clamp(waste/100,0,1):.45;
    const wasteState=stateFromFraction(wasteF,true);
    const solar=num('techSolarPower');
    const shore=String($('techShorePowerStatus')?.textContent||'').toLowerCase();
    const solarState=Number.isFinite(solar)&&solar>20?'good':shore.includes('walstroom')?'warning':'critical';
    const speed=$('ivmsSpeed')?.textContent||'0,0';
    const heading=$('ivmsHeading')?.textContent||'–°';
    const wind=$('ivmsWindValue')?.textContent||'–';
    const outside=$('ivmsOutsideTemp')?.textContent||'– °C';
    const people=$('ivmsPeople')?.textContent||'0';
    const bilge=$('ivmsBilgeStatus')?.textContent||'GEEN MELDING';
    const security=$('ivmsSecurityStatus')?.textContent||'ALLES IN ORDE';
    const gps=$('ivmsGpsLat')?.textContent||'GPS niet actief';
    const powerSource=$('ivmsPowerSource')?.textContent||'ACCU';
    const powerStatus=$('ivmsPowerStatus')?.textContent||'BOORDNET';

    const cards=[
      {
        title:'Boordnet', pill:labelFromState(houseState,'stabiel','opletten','laag'), state:houseState,
        big:$('techHouseVoltage')?.textContent||'– V', sub:`Stroombron: ${powerSource} · ${powerStatus}`,
        body:`<div class="ms-premium-micro"><span><small>Zonnepaneel</small><strong>${$('techSolarPower')?.textContent||'– W'}</strong></span><span><small>Accustatus</small><strong>${$('techHouseBatteryStatus')?.textContent||'Nog geen meting'}</strong></span><span><small>Walstroom</small><strong>${$('techShorePowerStatus')?.textContent||'Niet gekoppeld'}</strong></span><span><small>Laden</small><strong>${labelFromState(solarState,'actief','beperkt','uit')}</strong></span></div>`
      },
      {
        title:'Tanks', pill:labelFromState(waterState,'op peil','controleren','laag'), state:waterState,
        big:`${$('techFuelLevel')?.textContent||'–%'} / ${$('techWaterLevel')?.textContent||'–%'}`,
        sub:'Brandstof en water direct in beeld',
        body:`<div class="ms-premium-bars"><div class="ms-premium-bar-row"><small>Brandstof · ${$('techFuelLevel')?.textContent||'–%'}</small><div class="ms-premium-bar-track"><i class="ms-premium-bar-fill ${fuelState}" style="--fill:${Math.round(fuelF*100)}%"></i></div><strong>${$('techFuelLiters')?.textContent||'Inhoud onbekend'}</strong></div><div class="ms-premium-bar-row"><small>Drinkwater · ${$('techWaterLevel')?.textContent||'–%'}</small><div class="ms-premium-bar-track"><i class="ms-premium-bar-fill ${waterState}" style="--fill:${Math.round(waterF*100)}%"></i></div><strong>${$('techWaterStatus')?.textContent||'Beschikbare voorraad'}</strong></div><div class="ms-premium-bar-row"><small>Vuilwater · ${$('techWasteLevel')?.textContent||'–%'}</small><div class="ms-premium-bar-track"><i class="ms-premium-bar-fill ${wasteState}" style="--fill:${Math.round(wasteF*100)}%"></i></div><strong>${$('techWasteStatus')?.textContent||'Nog niet gemeten'}</strong></div></div>`
      },
      {
        title:'Navigatie', pill:'live data', state:'good',
        big:`${speed} km/u`, sub:`Koers ${heading} · Wind ${wind} km/u`,
        body:`<div class="ms-premium-micro"><span><small>Koers</small><strong>${heading} ${$('ivmsHeadingDir')?.textContent||''}</strong></span><span><small>Buiten</small><strong>${outside}</strong></span><span><small>Wind</small><strong>${wind} km/u · ${$('ivmsWindUnit')?.textContent||'Bft'}</strong></span><span><small>Diepte</small><strong>${$('ivmsDepth')?.textContent||'–'} m</strong></span></div>`
      },
      {
        title:'Veiligheid', pill:(String(security).toLowerCase().includes('orde')?'in orde':'controleren'), state:(String(security).toLowerCase().includes('orde')?'good':'warning'),
        big:`${people} aan boord`, sub:`Bilge ${String(bilge).toLowerCase()}`,
        body:`<div class="ms-premium-micro"><span><small>Bilge</small><strong>${bilge}</strong></span><span><small>Veiligheid</small><strong>${security}</strong></span><span><small>GPS</small><strong>${gps}</strong></span><span><small>Positie</small><strong>${$('ivmsGpsLon')?.textContent||$('ivmsGpsStatus')?.textContent||'Onbekend'}</strong></span></div>`
      }
    ];

    grid.innerHTML=cards.map(card=>`<article class="ms-premium-card"><div class="ms-premium-card-header"><strong>${card.title}</strong><span class="ms-premium-pill ${card.state}">${card.pill}</span></div><div class="ms-premium-primary"><div><div class="ms-premium-big">${card.big}</div><div class="ms-premium-sub">${card.sub}</div></div></div>${card.body}</article>`).join('');
  }
  function install(){
    render();
    setTimeout(render,900);
    setInterval(render,5000);
    window.addEventListener('mijnserenity-ha-state-updated',render);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(render,180); });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* MijnSerenity 7.15.31 — stroomflow compact in huishoudaccuknop + vermogen in watt */
(function(){
  'use strict';
  if(window.__ms71531BatteryFlow)return;
  window.__ms71531BatteryFlow=true;

  function byId(id){return document.getElementById(id);}
  function parseNumber(text){
    var match=String(text||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    if(!match)return null;
    var value=Number(match[0]);
    return Number.isFinite(value)?value:null;
  }
  function readFrom(ids){
    for(var i=0;i<ids.length;i++){
      var el=byId(ids[i]);
      var value=parseNumber(el&&el.textContent);
      if(value!==null)return value;
    }
    return null;
  }
  function readCurrent(){return readFrom(['ivmsBatteryCurrent','techHouseCurrent','liveHouseCurrent','ms71510HouseCurrent']);}
  function readVoltage(){return readFrom(['ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage','ms71510HouseVoltage']);}
  function sourceLabel(){
    var shore=String((byId('techShorePowerStatus')||{}).textContent||'').toLowerCase();
    var solar=readFrom(['techSolarPower']);
    if(shore.indexOf('walstroom')!==-1 && shore.indexOf('geen')===-1 && shore.indexOf('niet')===-1)return 'WAL';
    if(solar!==null && solar>5)return 'ZON';
    return 'BOORD';
  }
  function installStyle(){
    if(byId('ms71531BatteryFlowStyle'))return;
    var style=document.createElement('style');
    style.id='ms71531BatteryFlowStyle';
    style.textContent='#ms71530BatteryFlow{display:none!important}'+
      '#ms71531BatteryFlow{grid-column:1/-1;width:100%;display:grid;grid-template-columns:auto minmax(70px,1fr) auto;align-items:center;gap:7px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(105,204,235,.16);pointer-events:none}'+
      '#ms71531BatteryFlow .node{font-size:9px;font-weight:900;letter-spacing:.05em;color:#b9d5df;white-space:nowrap}'+
      '#ms71531BatteryFlow .track{position:relative;height:7px;border-radius:999px;background:rgba(139,183,199,.14);overflow:hidden}'+
      '#ms71531BatteryFlow .dot{position:absolute;top:50%;left:-10px;width:7px;height:7px;border-radius:50%;background:#d8f9ff;box-shadow:0 0 9px rgba(118,226,255,.95);transform:translateY(-50%);animation:ms71531Right var(--flow-speed,1.8s) linear infinite}'+
      '#ms71531BatteryFlow .dot:nth-child(2){animation-delay:-.45s}#ms71531BatteryFlow .dot:nth-child(3){animation-delay:-.9s}#ms71531BatteryFlow .dot:nth-child(4){animation-delay:-1.35s}'+
      '#ms71531BatteryFlow[data-direction="out"] .dot{animation-name:ms71531Left}#ms71531BatteryFlow[data-direction="idle"] .dot{animation-play-state:paused;opacity:.18}'+
      '#ms71531BatteryFlow .meta{grid-column:1/-1;display:flex;justify-content:center;gap:7px;align-items:center;color:#9fbcc7;font-size:10px;font-weight:800;text-align:center;white-space:nowrap}'+
      '#ms71531BatteryFlow .meta strong{color:#eafaff;font-size:11px}'+
      '@keyframes ms71531Right{from{left:-10px}to{left:calc(100% + 10px)}}@keyframes ms71531Left{from{left:calc(100% + 10px)}to{left:-10px}}'+
      '@media(max-width:520px){#ms71531BatteryFlow{gap:5px;margin-top:7px;padding-top:7px}#ms71531BatteryFlow .node{font-size:8px}#ms71531BatteryFlow .meta{font-size:9px;gap:5px}#ms71531BatteryFlow .meta strong{font-size:10px}}'+
      '@media(prefers-reduced-motion:reduce){#ms71531BatteryFlow .dot{animation:none!important;left:50%!important}}';
    document.head.appendChild(style);
  }
  function ensureFlow(){
    installStyle();
    var old=byId('ms71530BatteryFlow');
    if(old)old.style.display='none';
    var existing=byId('ms71531BatteryFlow');
    if(existing)return existing;
    var host=document.querySelector('#ms71510Dashboard .ms71510-house-battery');
    if(!host)return null;
    var flow=document.createElement('span');
    flow.id='ms71531BatteryFlow';
    flow.dataset.direction='idle';
    flow.innerHTML='<span class="node" id="ms71531Source">BOORD</span><span class="track" aria-hidden="true"><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></span><span class="node">ACCU</span><span class="meta"><strong id="ms71531Label">Geen stroommeting</strong><span id="ms71531Power">– W</span></span>';
    host.appendChild(flow);
    return flow;
  }
  function updateMainPower(power,current){
    var value=byId('ms71510HouseCurrent');
    if(!value)return;
    var box=value.parentElement;
    var title=box&&box.querySelector('small');
    if(title)title.textContent='VERMOGEN';
    if(power===null){value.textContent='– W';return;}
    var rounded=Math.round(Math.abs(power));
    value.textContent=rounded.toLocaleString('nl-NL')+' W';
    value.title=(current!==null?current.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+' A · ':'')+'vermogen huishoudaccu';
  }
  function update(){
    try{
      var flow=ensureFlow();
      if(!flow)return;
      var current=readCurrent();
      var voltage=readVoltage();
      var power=(current!==null && voltage!==null)?voltage*current:null;
      var absCurrent=current===null?0:Math.abs(current);
      var absPower=power===null?null:Math.abs(power);
      var label=byId('ms71531Label');
      var amount=byId('ms71531Power');
      var source=byId('ms71531Source');
      if(source)source.textContent=sourceLabel();
      updateMainPower(power,current);
      if(current===null || voltage===null){
        flow.dataset.direction='idle';
        flow.style.setProperty('--flow-speed','2.2s');
        if(label)label.textContent='Geen vermogensmeting';
        if(amount)amount.textContent='– W';
        return;
      }
      var speed=Math.max(.65,Math.min(2.4,2.4-(Math.min(absCurrent,50)/50)*1.75));
      flow.style.setProperty('--flow-speed',speed.toFixed(2)+'s');
      if(amount)amount.textContent=Math.round(absPower).toLocaleString('nl-NL')+' W';
      if(absCurrent<0.15){
        flow.dataset.direction='idle';
        if(label)label.textContent='Nagenoeg geen stroom';
      }else if(current>0){
        flow.dataset.direction='in';
        if(label)label.textContent='Laden →';
      }else{
        flow.dataset.direction='out';
        if(label)label.textContent='← Levert';
      }
    }catch(error){
      console.warn('Accu-stroomanimatie kon niet bijwerken:',error);
    }
  }
  function install(){
    update();
    setTimeout(update,800);
    setInterval(function(){if(!document.hidden)update();},1500);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated'].forEach(function(name){window.addEventListener(name,update,{passive:true});});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(update,100);},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();