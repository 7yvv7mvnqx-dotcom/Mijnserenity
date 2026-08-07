(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const num=(id)=>{
    const raw=String($(id)?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  function angleFromFraction(fraction){
    const clamped=clamp(Number(fraction)||0,0,1);
    return `${-130 + clamped*260}deg`;
  }
  function stateFromFraction(fraction,invert=false){
    const f=clamp(Number(fraction)||0,0,1);
    const x=invert?1-f:f;
    if(x>=0.66)return 'good';
    if(x>=0.33)return 'warning';
    return 'critical';
  }
  function dialMarkup({icon='•',label='status',state='normal',fraction=0.5}){
    const ticks=Array.from({length:9},(_,i)=>`<i class="ms-dial-tick ${i%2===0?'major':''}" style="transform:rotate(${-130 + i*(260/8)}deg)"></i>`).join('');
    return `<div class="ms-analog-dial" data-state="${state}" style="--needle-angle:${angleFromFraction(fraction)}">${ticks}<div class="ms-dial-center"><span class="ms-dial-emoji">${icon}</span></div><div class="ms-dial-needle"></div><div class="ms-dial-cap"></div><div class="ms-dial-label">${label}</div></div>`;
  }
  function dashboardVisible(){
    const authView=$('authView');
    const dashboard=$('dashboard');
    return (!authView || authView.classList.contains('hidden')) && !!dashboard;
  }
  function ensure(){
    const dashboard=$('dashboard');
    const captainStrip=dashboard?.querySelector('.captain-strip');
    if(!dashboard || !captainStrip) return null;
    let section=$('msDashboardAnalog7141');
    if(section) return section;
    section=document.createElement('section');
    section.id='msDashboardAnalog7141';
    section.className='ms-dashboard-analog';
    section.innerHTML=`<div class="ms-dashboard-analog-head"><div><h3>Boordstatus in één oogopslag</h3><p>De belangrijkste gegevens als analoge klokken op je dashboard.</p></div><div class="ms-dashboard-analog-badge">Captain View</div></div><div class="ms-dashboard-analog-grid" id="msDashboardAnalogGrid7141"></div>`;
    const welcome=$('msWelcomeCard7140') || $('msWelcomeCard7137');
    if(welcome && welcome.parentNode) welcome.insertAdjacentElement('afterend',section);
    else captainStrip.parentNode.insertBefore(section,captainStrip);
    return section;
  }
  function items(){
    const houseV=num('techHouseVoltage');
    const fuelPct=num('techFuelLevel');
    const waterPct=num('techWaterLevel');
    const wastePct=num('techWasteLevel');
    const solarW=num('techSolarPower');
    const engineHours=num('techEngineHours');
    const shore=String($('techShorePowerStatus')?.textContent||'').toLowerCase();
    return [
      {
        key:'house', icon:'🔋', label:'accu', state:Number.isFinite(houseV)?stateFromFraction((houseV-10.5)/(13.5-10.5)):'warning',
        fraction:Number.isFinite(houseV)?clamp((houseV-10.5)/(13.5-10.5),0,1):.45,
        title:'Huishoudaccu', value:$('techHouseVoltage')?.textContent||'– V', meta:$('techHouseBatteryStatus')?.textContent||'Nog niet gemeten'
      },
      {
        key:'fuel', icon:'⛽', label:'diesel', state:Number.isFinite(fuelPct)?stateFromFraction(fuelPct/100):'warning',
        fraction:Number.isFinite(fuelPct)?fuelPct/100:.45,
        title:'Dieseltank', value:$('techFuelLevel')?.textContent||'–%', meta:$('techFuelLiters')?.textContent||'Inhoud onbekend'
      },
      {
        key:'water', icon:'💧', label:'water', state:Number.isFinite(waterPct)?stateFromFraction(waterPct/100):'warning',
        fraction:Number.isFinite(waterPct)?waterPct/100:.45,
        title:'Drinkwater', value:$('techWaterLevel')?.textContent||'–%', meta:'Beschikbare voorraad'
      },
      {
        key:'waste', icon:'🚽', label:'vuil', state:Number.isFinite(wastePct)?stateFromFraction(wastePct/100,true):'warning',
        fraction:Number.isFinite(wastePct)?1-(wastePct/100):.45,
        title:'Vuilwater', value:$('techWasteLevel')?.textContent||'–%', meta:$('techWasteStatus')?.textContent||'Nog niet gemeten'
      },
      {
        key:'solar', icon:'☀️', label:'solar', state:Number.isFinite(solarW)&&solarW>20?'good':shore.includes('walstroom')?'normal':'warning',
        fraction:Number.isFinite(solarW)?clamp(solarW/400,0,1):(shore.includes('walstroom')?.55:.25),
        title:'Zonnepaneel', value:$('techSolarPower')?.textContent||'– W', meta:$('techShorePowerStatus')?.textContent||'Walstroom onbekend'
      },
      {
        key:'engine', icon:'⚙️', label:'motor', state:'good',
        fraction:Number.isFinite(engineHours)?clamp(engineHours/1000,0,1):.35,
        title:'Motoruren', value:$('techEngineHours')?.textContent||'0,0', meta:$('techEngineService')?.textContent||'Nog geen onderhoudsgegevens'
      }
    ];
  }
  function render(){
    if(!dashboardVisible()) return;
    ensure();
    const grid=$('msDashboardAnalogGrid7141');
    if(!grid) return;
    grid.innerHTML=items().map(item=>`<button type="button" class="ms-dashboard-dial-card" onclick="captainNavigate('technical')"><div>${dialMarkup(item)}</div><div class="ms-dashboard-dial-title">${item.title}</div><div class="ms-dashboard-dial-value">${item.value}</div><div class="ms-dashboard-dial-meta">${item.meta}</div></button>`).join('');
  }
  function install(){
    render();
    setTimeout(render,900);
    setInterval(render,5000);
    window.addEventListener('mijnserenity-ha-state-updated',render);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(render,120); });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();