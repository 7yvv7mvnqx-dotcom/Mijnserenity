(()=>{
  'use strict';
  if(window.__msDisableLegacyVisuals)return;
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
    const premium=$('msDashboardPremium7143') || $('serenityIvms');
    if(!dashboard || !premium) return null;
    let section=$('msStartCockpit7144');
    if(!section){
      section=document.createElement('section');
      section.id='msStartCockpit7144';
      section.className='ms-start-cockpit';
      section.innerHTML=`<div class="ms-start-cockpit-head"><div><h2>Startdashboard</h2><p>Snelheid, diepte, koers, wind, toerental en tanks op één scherm.</p></div><div class="ms-start-badge">Captain Deck</div></div><div class="ms-start-cockpit-grid" id="msStartCockpitGrid7144"></div><div class="ms-cockpit-footer"><button type="button" class="ms-cockpit-action" onclick="captainNavigate('live')"><span>⛵</span><small>Live</small></button><button type="button" class="ms-cockpit-action" onclick="captainNavigate('technical')"><span>🔋</span><small>Techniek</small></button><button type="button" class="ms-cockpit-action" onclick="captainNavigate('planner')"><span>🧭</span><small>Route</small></button><button type="button" class="ms-cockpit-action" onclick="captainNavigate('weather')"><span>☀️</span><small>Weer</small></button></div>`;
      dashboard.insertBefore(section,premium);
    }
    return section;
  }
  function render(){
    if(!dashboardVisible()) return;
    ensure();
    const grid=$('msStartCockpitGrid7144');
    if(!grid) return;

    const speed=$('ivmsSpeed')?.textContent||'0,0';
    const speedKn=$('ivmsSpeedKn')?.textContent||'0,0 kn';
    const depthText=$('ivmsDepth')?.textContent||'–';
    const depthVal=num('ivmsDepth');
    const depthState=Number.isFinite(depthVal)?(depthVal>=2.0?'good':depthVal>=1.0?'warning':'critical'):'warning';
    const heading=$('ivmsHeading')?.textContent||'–°';
    const headingDir=$('ivmsHeadingDir')?.textContent||'–';
    const wind=$('ivmsWindValue')?.textContent||'–';
    const windUnit=$('ivmsWindUnit')?.textContent||'Bft';
    const windNum=num('ivmsWindValue');
    const windState=Number.isFinite(windNum)?(windNum<20?'good':windNum<35?'warning':'critical'):'warning';
    const rpm=$('liveEngineRpm')?.textContent||'0';
    const rpmNum=num('liveEngineRpm')||0;
    const rpmState=rpmNum<=1800?'good':rpmNum<=2300?'warning':'critical';
    const fuel=num('techFuelLevel');
    const water=num('techWaterLevel');
    const waste=num('techWasteLevel');
    const fuelState=Number.isFinite(fuel)?stateFromFraction(fuel/100):'warning';
    const waterState=Number.isFinite(water)?stateFromFraction(water/100):'warning';
    const wasteState=Number.isFinite(waste)?stateFromFraction(waste/100,true):'warning';

    const cards=[
      {icon:'◴', title:'Snelheid', state:(Number(speed.replace(',','.'))>=1?'good':'warning'), value:`${speed} km/u`, meta:speedKn},
      {icon:'≋', title:'Diepte', state:depthState, value:`${depthText} m`, meta:$('ivmsDepthUnit')?.textContent||'diepte'},
      {icon:'◉', title:'Koers', state:'good', value:heading, meta:headingDir},
      {icon:'༄', title:'Wind', state:windState, value:`${wind} km/u`, meta:windUnit},
      {icon:'⚙', title:'Toerental', state:rpmState, value:`${rpm} rpm`, meta:rpmState==='good'?'groene zone':rpmState==='warning'?'gele zone':'rode zone'},
      {icon:'▣', title:'Tankniveaus', state:(waterState==='critical'||fuelState==='critical'||wasteState==='critical')?'critical':(waterState==='warning'||fuelState==='warning'||wasteState==='warning')?'warning':'good',
       tanks:[
        {label:'Brandstof', value:Number.isFinite(fuel)?`${Math.round(fuel)}%`:'–', width:Number.isFinite(fuel)?`${Math.round(fuel)}%`:'0%', state:fuelState},
        {label:'Drinkwater', value:Number.isFinite(water)?`${Math.round(water)}%`:'–', width:Number.isFinite(water)?`${Math.round(water)}%`:'0%', state:waterState},
        {label:'Vuilwater', value:Number.isFinite(waste)?`${Math.round(waste)}%`:'–', width:Number.isFinite(waste)?`${Math.round(waste)}%`:'0%', state:wasteState},
       ]}
    ];

    grid.innerHTML=cards.map(card=>{
      const stateText=labelFromState(card.state,'ok','let op','kritiek');
      if(card.tanks){
        return `<article class="ms-cockpit-card" onclick="captainNavigate('technical')"><div class="ms-cockpit-top"><div class="ms-cockpit-label"><b>${card.icon}</b><span>${card.title}</span></div><span class="ms-cockpit-chip ${card.state}">${stateText}</span></div><div class="ms-cockpit-tanks">${card.tanks.map(t=>`<div class="ms-cockpit-tank-row"><span>${t.label}</span><div class="ms-cockpit-track"><i class="ms-cockpit-fill ${t.state}" style="--fill:${t.width}"></i></div><strong>${t.value}</strong></div>`).join('')}</div></article>`;
      }
      return `<article class="ms-cockpit-card" onclick="captainNavigate('${card.title==='Toerental'?'live':'live'}')"><div class="ms-cockpit-top"><div class="ms-cockpit-label"><b>${card.icon}</b><span>${card.title}</span></div><span class="ms-cockpit-chip ${card.state}">${stateText}</span></div><div class="ms-cockpit-value">${card.value}</div><div class="ms-cockpit-meta">${card.meta}</div></article>`;
    }).join('');
  }
  function install(){
    render();
    setTimeout(render,900);
    setInterval(render,3500);
    window.addEventListener('mijnserenity-ha-state-updated',render);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(render,180); });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();