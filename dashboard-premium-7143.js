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