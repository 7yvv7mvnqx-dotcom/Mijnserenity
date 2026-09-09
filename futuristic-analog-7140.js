(()=>{
  'use strict';
  if(window.__msDisableLegacyVisuals)return;
  const $=id=>document.getElementById(id);
  let overlayTimer=null;
  let overlayCleanupTimer=null;
  let suppressWelcomeEvent=false;
  let lastOverlayAt=0;
  let initialWelcomeShown=false;

  function numberFrom(id){
    const raw=String($(id)?.textContent||'').replace(',','.');
    const match=raw.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
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
  function dial(id,{icon='•',label='status',state='normal',fraction=0.5,title=''}={}){
    const el=$(id); if(!el) return;
    const ticks=Array.from({length:9},(_,i)=>`<i class="ms-dial-tick ${i%2===0?'major':''}" style="transform:rotate(${-130 + i*(260/8)}deg)"></i>`).join('');
    el.innerHTML=`<div class="ms-analog-dial" data-state="${state}" aria-hidden="true" style="--needle-angle:${angleFromFraction(fraction)}">${ticks}<div class="ms-dial-center"><span class="ms-dial-emoji">${icon}</span></div><div class="ms-dial-needle"></div><div class="ms-dial-cap"></div><div class="ms-dial-label">${label}</div></div>`;
    el.setAttribute('aria-label',title||label);
    el.setAttribute('title',title||label);
  }

  function buildData(){
    const engineHours=numberFrom('techEngineHours');
    const engineService=String($('techEngineService')?.textContent||'').toLowerCase();
    let engineFraction=Number.isFinite(engineHours)?clamp(engineHours/1000,0,1):.35;
    let engineState='good';
    if(!engineService||engineService.includes('nog geen'))engineState='warning';
    else if(engineService.includes('onderhoud')||engineService.includes('beurt')||engineService.includes('binnenkort')||engineService.includes('over'))engineState='warning';

    const houseV=numberFrom('techHouseVoltage');
    const startV=numberFrom('techStartVoltage');
    const houseFraction=Number.isFinite(houseV)?clamp((houseV-10.5)/(13.5-10.5),0,1):.45;
    const startFraction=Number.isFinite(startV)?clamp((startV-10.5)/(13.5-10.5),0,1):.45;

    const fuelPct=numberFrom('techFuelLevel');
    const waterPct=numberFrom('techWaterLevel');
    const wastePct=numberFrom('techWasteLevel');

    const solarW=numberFrom('techSolarPower');
    const shore=String($('techShorePowerStatus')?.textContent||'').toLowerCase();
    const solarFraction=Number.isFinite(solarW)?clamp(solarW/400,0,1):(shore.includes('walstroom')?.55:.25);
    const solarState=Number.isFinite(solarW)&&solarW>20?'good':shore.includes('walstroom')?'normal':'warning';

    const heater=String($('techHeaterStatus')?.textContent||'').toLowerCase();
    const bilge=String($('techBilgeStatus')?.textContent||'').toLowerCase();
    let systemState='good', systemFraction=.82;
    if(heater.includes('storing')||bilge.includes('alarm')){ systemState='critical'; systemFraction=.1; }
    else if(bilge.includes('actief')||heater.includes('onderhoud')||heater.includes('onbekend')||bilge.includes('onbekend')){ systemState='warning'; systemFraction=.48; }

    return {
      engine:{icon:'⚙️',label:'motor',state:engineState,fraction:engineFraction,title:'Motoruren'},
      house:{icon:'🔋',label:'hh accu',state:stateFromFraction(houseFraction),fraction:houseFraction,title:'Huishoudaccu'},
      start:{icon:'🔋',label:'start',state:stateFromFraction(startFraction),fraction:startFraction,title:'Startaccu'},
      fuel:{icon:'⛽',label:'diesel',state:Number.isFinite(fuelPct)?stateFromFraction(fuelPct/100):'warning',fraction:Number.isFinite(fuelPct)?fuelPct/100:.45,title:'Dieseltank'},
      water:{icon:'💧',label:'water',state:Number.isFinite(waterPct)?stateFromFraction(waterPct/100):'warning',fraction:Number.isFinite(waterPct)?waterPct/100:.45,title:'Drinkwater'},
      waste:{icon:'🚽',label:'vuil',state:Number.isFinite(wastePct)?stateFromFraction(wastePct/100,true):'warning',fraction:Number.isFinite(wastePct)?1-(wastePct/100):.45,title:'Vuilwatertank'},
      solar:{icon:'☀️',label:'solar',state:solarState,fraction:solarFraction,title:'Zonnepaneel'},
      systems:{icon:'🔥',label:'system',state:systemState,fraction:systemFraction,title:'Verwarming en systemen'}
    };
  }

  function dashboardVisible(){
    const authView=$('authView');
    const dashboard=$('dashboard');
    return (!authView || authView.classList.contains('hidden')) && (!!dashboard);
  }

  function ensureWelcomeCard(){
    const dashboard=$('dashboard');
    const captainStrip=document.querySelector('#dashboard .captain-strip');
    const ivms=$('serenityIvms');
    if(!dashboard || !captainStrip) return;
    let card=$('msWelcomeCard7140');
    if(!card){
      card=document.createElement('section');
      card.id='msWelcomeCard7140';
      card.className='ms-welcome-card';
      card.innerHTML="<div class='ms-welcome-art' aria-hidden='true'>🧭</div><div class='ms-welcome-copy'><span class='ms-welcome-eyebrow'>WELKOM AAN BOORD</span><h2 id='msWelcomeTitle7140'>Welkom aan boord</h2><p id='msWelcomeText7140'>Serenity ligt klaar voor vertrek.</p></div><button type='button' class='ms-welcome-action' onclick=\"captainNavigate('live')\">Start varen</button>";
    }
    const target=ivms || captainStrip;
    if(target && card.parentNode!==dashboard){
      dashboard.insertBefore(card,target);
    }else if(target && card.nextElementSibling!==target){
      dashboard.insertBefore(card,target);
    }
    const profile=window.MIJNSERENITY_WELCOME_PROFILE || (typeof window.msGetWelcomeProfile==='function' ? window.msGetWelcomeProfile(false) : null);
    const title=card.querySelector('#msWelcomeTitle7140');
    const copy=card.querySelector('#msWelcomeText7140');
    if(title) title.textContent=profile?.title||'Welkom aan boord';
    if(copy) copy.textContent=profile?.subtitle||'Serenity · VriJon Contessa 37E · Alles in één oogopslag gereed';
  }

  function ensureWelcomeOverlay(){
    let overlay=$('msScreenWelcome7140');
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id='msScreenWelcome7140';
    overlay.className='ms-screen-welcome';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="ms-screen-welcome-panel"><h1 id="msScreenWelcomeTitle7140">Welkom aan boord</h1></div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  function hideWelcomeOverlay(){
    const overlay=$('msScreenWelcome7140'); if(!overlay)return;
    clearTimeout(overlayTimer); clearTimeout(overlayCleanupTimer);
    overlay.classList.add('hide');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('ms-welcome-active');
    document.body.classList.add('ms-welcome-leaving');
    overlayCleanupTimer=setTimeout(()=>{
      document.body.classList.remove('ms-welcome-leaving');
      overlay.classList.remove('hide');
    },850);
  }
  function showWelcomeOverlay(profile){
    if(!dashboardVisible() || !profile) return;
    const now=Date.now();
    if(now-lastOverlayAt<3600) return;
    lastOverlayAt=now;
    const overlay=ensureWelcomeOverlay();
    const title=$('msScreenWelcomeTitle7140'); const sub=$('msScreenWelcomeSub7140');
    if(title) title.textContent=profile.short || profile.title || 'Welkom aan boord';
    if(sub) sub.textContent='';
    clearTimeout(overlayTimer); clearTimeout(overlayCleanupTimer);
    overlay.classList.remove('hide');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.remove('ms-welcome-leaving');
    document.body.classList.add('ms-welcome-active');
    requestAnimationFrame(()=>requestAnimationFrame(()=>overlay.classList.add('show')));
    overlayTimer=setTimeout(hideWelcomeOverlay,3200);
  }
  function refreshWelcome(forceNew=false,showOverlayNow=false){
    if(typeof window.msGetWelcomeProfile!=='function') return null;
    suppressWelcomeEvent=true;
    const profile=window.msGetWelcomeProfile(forceNew);
    suppressWelcomeEvent=false;
    ensureWelcomeCard();
    if(showOverlayNow) showWelcomeOverlay(profile);
    return profile;
  }

  function update(){
    const d=buildData();
    dial('techEngineIcon',d.engine);
    dial('techHouseIcon',d.house);
    dial('techStartIcon',d.start);
    dial('techFuelIcon',d.fuel);
    dial('techWaterIcon',d.water);
    dial('techWasteIcon',d.waste);
    dial('techSolarIcon',d.solar);
    dial('techSystemIcon',d.systems);
  }

  function install(){
    ensureWelcomeCard();
    ensureWelcomeOverlay();
    update();
    setTimeout(()=>{ if(dashboardVisible() && !initialWelcomeShown){ initialWelcomeShown=true; refreshWelcome(true,true); } },520);
    setTimeout(update,800);
    setInterval(update,4000);
    window.addEventListener('mijnserenity-ha-state-updated',update);
    window.addEventListener('mijnserenity-welcome-updated',event=>{
      ensureWelcomeCard();
      if(suppressWelcomeEvent) return;
      showWelcomeOverlay(event?.detail || window.MIJNSERENITY_WELCOME_PROFILE || null);
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible' && dashboardVisible()){
        setTimeout(()=>{ ensureWelcomeCard(); update(); refreshWelcome(true,true); },220);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();