/* MijnSerenity 8.30.0 — één canonieke Start-runtime, zonder historische patchketen. */
(()=>{
  'use strict';
  if(window.__msStart8300)return;
  window.__msStart8300=true;

  /* Compatibiliteitsguards: oude loaders hoeven niets meer over deze Start heen te leggen. */
  window.__msSimpleStart8210=true;
  window.__msDashboardLoader8234=true;
  window.__ms8280Header=true;
  window.__msStartStatus8265=true;
  window.__msStartIphone8262=true;
  window.__msStartLive8258=true;
  window.__msPolish8256=true;
  window.__msReferenceDashboard8254=true;
  window.__msPersonalWelcome8253=true;
  window.__msDayNightChoice8252=true;
  window.__msDayNight8250=true;

  const BUILD='8.30.0';
  const TOKEN='830000';
  const ROOT_ID='ms8210Start';
  const THEME_KEY='mijnserenity-daynight-v1';
  const $=id=>document.getElementById(id);
  let refreshTimer=0;
  let weatherAt=0;
  let weatherBusy=false;
  let dashboardObserver=null;
  let refreshQueued=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(String(value).replace(',','.'));
    return Number.isFinite(n)?n:null;
  };
  const numberFrom=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const text=id=>String($(id)?.textContent||'').trim();
  const validText=value=>{
    const v=String(value??'').replace(/\s+/g,' ').trim();
    return v&&!/^(?:undefined|null|–|-|—|geen data|onbekend)$/i.test(v)?v:'';
  };
  const firstText=(ids,fallback='')=>{
    for(const id of ids){const v=validText(text(id));if(v)return v;}
    return fallback;
  };
  const setText=(id,value)=>{const node=$(id);if(node&&node.textContent!==String(value))node.textContent=String(value)};
  const fmt=(value,digits=1)=>Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    document.querySelectorAll('.ms8287-version,.ms8286-version,.ms8285-version').forEach(node=>node.textContent=`v${BUILD}`);
  }

  function profileFirstName(){
    const raw=window.currentProfile?.display_name||window.currentProfile?.name||window.currentUser?.user_metadata?.full_name||window.currentUser?.user_metadata?.name||'';
    return String(raw||'').trim().split(/\s+/)[0]||'';
  }

  function greeting(){
    const hour=new Date().getHours();
    const word=hour<12?'Goedemorgen':hour<18?'Goedemiddag':'Goedenavond';
    const name=profileFirstName();
    return name?`${word} ${name}`:word;
  }

  function navigate(route){
    if(!route)return;
    if(route==='more'){openMore();return;}
    if(route==='dashboard'){
      const home=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
      try{
        if(typeof window.captainNavigate==='function'){window.captainNavigate('dashboard',home||null);return;}
        if(home){home.click();return;}
      }catch{}
      const app=$('appView');
      const dashboard=$('dashboard');
      if(app&&dashboard){
        [...app.querySelectorAll(':scope > section[id]')].forEach(section=>{
          const active=section===dashboard;
          section.classList.toggle('hidden',!active);
          section.setAttribute('aria-hidden',active?'false':'true');
        });
      }
      syncRouteChrome('dashboard');
      return;
    }
    try{
      if(route==='rws'&&typeof window.ms795OpenRws==='function'){window.ms795OpenRws();return;}
      const button=document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${CSS.escape(route)}"]`);
      if(typeof window.captainNavigate==='function'){window.captainNavigate(route,button||null);return;}
      if(typeof window.ms708GoToPage==='function'){window.ms708GoToPage(route,true);return;}
      document.querySelector(`.tabs [data-target="${CSS.escape(route)}"]`)?.click();
    }catch(error){console.warn(`MijnSerenity: openen van ${route} mislukt.`,error);}
  }

  function openMore(){
    try{
      if(typeof window.ms797OpenMore==='function'){window.ms797OpenMore();return;}
      const existing=$('ms8202More')||$('mgMore')||$('msIpadMore71917')||$('ms71919More');
      if(existing){existing.classList.remove('hidden');return;}
    }catch{}
    navigate('settings');
  }

  function ensureBottomNav(){
    let nav=document.querySelector('.bottom-nav');
    if(!nav){
      nav=document.createElement('nav');
      nav.className='bottom-nav';
      document.body.appendChild(nav);
    }
    const needed=['dashboard','live','map','planner','technical'];
    const existing=[...nav.querySelectorAll(':scope > .bottom-nav-item')].map(node=>node.dataset.target);
    if(needed.every(item=>existing.includes(item)))return nav;
    nav.innerHTML=`
      <button type="button" class="bottom-nav-item" data-target="dashboard"><span>⌂</span><small>Start</small></button>
      <button type="button" class="bottom-nav-item" data-target="live"><span>▶</span><small>Varen</small></button>
      <button type="button" class="bottom-nav-item" data-target="map"><span>⌖</span><small>Kaart</small></button>
      <button type="button" class="bottom-nav-item" data-target="planner"><span>◇</span><small>Route</small></button>
      <button type="button" class="bottom-nav-item" data-target="technical"><span>⚙</span><small>Techniek</small></button>`;
    nav.onclick=event=>{
      const button=event.target.closest('.bottom-nav-item[data-target]');
      if(button)navigate(button.dataset.target);
    };
    return nav;
  }

  function activeRoute(){
    const app=$('appView');
    if(!app||app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return '';
    const sections=[...app.querySelectorAll(':scope > section[id]')];
    const visible=sections.find(section=>!section.classList.contains('hidden')&&section.getAttribute('aria-hidden')!=='true');
    return String(visible?.id||'dashboard').toLowerCase();
  }

  function syncRouteChrome(preferred=''){
    const body=document.body;
    if(!body)return;
    const route=String(preferred||activeRoute()||'dashboard').toLowerCase();
    const onStart=route==='dashboard';
    body.classList.toggle('ms8300-start-page',onStart);
    body.classList.toggle('ms8300-sub-page',!onStart&&Boolean(route));
    ensureBottomNav();
    document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(button=>{
      const isActive=button.dataset.target===route;
      button.classList.toggle('active',isActive);
      if(isActive)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
  }

  function readTheme(){
    try{
      const own=localStorage.getItem(THEME_KEY);
      if(own==='day'||own==='night')return own;
      const mode=window.serenityDayNight?.mode?.();
      if(mode==='day'||mode==='night')return mode;
    }catch{}
    return 'night';
  }

  function applyTheme(mode,save=false){
    const next=mode==='day'?'day':'night';
    document.documentElement.dataset.msDaynight=next;
    if(save){try{localStorage.setItem(THEME_KEY,next)}catch{}}
    const button=$('ms8300Theme');
    if(button){
      button.innerHTML=next==='night'?'<span aria-hidden="true">☾</span><strong>Nacht</strong>':'<span aria-hidden="true">☀</span><strong>Dag</strong>';
      button.setAttribute('aria-label',next==='night'?'Schakel naar dagweergave':'Schakel naar nachtweergave');
    }
    window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed',{detail:{mode:next,build:BUILD}}));
  }

  function toggleTheme(){applyTheme(readTheme()==='night'?'day':'night',true);}

  function card(id,icon,label,sub=''){
    return `<div class="ms8300-status" id="${id}Card"><span class="ms8300-status-icon" aria-hidden="true">${icon}</span><span class="ms8300-status-copy"><small>${esc(label)}</small><strong id="${id}">–</strong><em id="${id}Sub">${esc(sub)}</em></span></div>`;
  }
  function ringCard(id,icon,label,sub=''){
    return `<div class="ms8300-status" id="${id}Card"><span class="ms8300-ring" id="${id}Ring"><span aria-hidden="true">${icon}</span></span><span class="ms8300-status-copy"><small>${esc(label)}</small><strong id="${id}">–</strong><em id="${id}Sub">${esc(sub)}</em></span></div>`;
  }
  function feature(route,icon,label,sub,badge=false){
    return `<button type="button" class="ms8300-feature" data-route="${route}">${badge?`<span class="ms8300-feature-badge" id="ms8300Badge-${route}">0</span>`:''}<span class="ms8300-feature-icon" aria-hidden="true">${icon}</span><span class="ms8300-feature-copy"><strong>${esc(label)}</strong><small>${esc(sub)}</small></span></button>`;
  }

  function build(){
    syncBuild();
    const dashboard=$('dashboard');
    if(!dashboard)return false;
    let root=$(ROOT_ID);
    if(!root){
      root=document.createElement('section');
      root.id=ROOT_ID;
      root.className='ms8300-start';
      root.setAttribute('aria-label','MijnSerenity Start');
      root.innerHTML=`
        <header class="ms8300-hero">
          <img class="ms8300-photo" src="/assets/serenity-hero-8275.jpg?v=${TOKEN}" alt="" aria-hidden="true" decoding="async" fetchpriority="high">
          <div class="ms8300-overlay" aria-hidden="true"></div>
          <div class="ms8300-top">
            <div class="ms8300-brand"><strong>Serenity</strong><small>EXPLORE · NAVIGATE · ENJOY</small></div>
            <div class="ms8300-actions">
              <button type="button" id="ms8210Summary" class="ms8300-action" data-route="technical"><span class="count">0</span><strong>Aandacht</strong></button>
              <button type="button" id="ms8300Theme" class="ms8300-action" aria-label="Weergave wisselen"><span aria-hidden="true">☾</span><strong>Nacht</strong></button>
              <button type="button" class="ms8300-action" data-route="more"><span aria-hidden="true">☰</span><strong>Meer</strong></button>
              <span class="ms8300-action ms8300-version" data-ms-build-version>${BUILD}</span>
            </div>
          </div>
          <div class="ms8300-copy">
            <span class="ms8300-eyebrow" id="ms8300Greeting">${esc(greeting())}</span>
            <h1>Klaar om te gaan varen?</h1>
            <p>Ontdek, vaar en geniet. De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?</p>
            <div class="ms8300-live-metrics" aria-label="Live vaarwaarden">
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">⌁</span><span class="ms8300-live-copy"><strong id="ms8234Speed">0,0 km/u</strong><small>Snelheid</small></span></div>
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">⌄</span><span class="ms8300-live-copy"><strong id="ms8234Depth">Geen meting</strong><small>Diepte</small></span></div>
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">≋</span><span class="ms8300-live-copy"><strong id="ms8234Wind">Geen meting</strong><small>Wind</small></span></div>
            </div>
            <button type="button" class="ms8300-start-live" data-route="live"><span aria-hidden="true">▶</span><span>Start live varen</span><span aria-hidden="true">›</span></button>
          </div>
        </header>
        <div class="ms8300-status-grid" aria-label="Bootstatus">
          ${ringCard('ms8234House','▰','Huishoudaccu','Live via Victron')}
          ${ringCard('ms8265StartMotor','⚡','Startaccu Motor','Live meting')}
          ${ringCard('ms8265StartHeck','↯','Startaccu Heckschroef','Live meting')}
          ${card('ms8234Shore','⌁','Walstroom','Aansluitstatus')}
          ${ringCard('ms8234Cabin','°','Salon','Ruuvi')}
          ${ringCard('ms8264EngineTemp','°','Motorruimte','Ruuvi')}
          ${ringCard('ms8234Water','◒','Drinkwater','Tankniveau')}
          ${ringCard('ms8234Fuel','◆','Diesel','Tankniveau')}
        </div>
        <div class="ms8300-features" aria-label="Onderdelen">
          ${feature('map','⌖','Kaart','Navigatie & actuele positie')}
          ${feature('planner','◇','Reisplanner','Plan route & reistijd',true)}
          ${feature('ais','⌁','AIS','Schepen in de omgeving')}
          ${feature('weather','☀','Weer','Actueel weer & voorspelling')}
          ${feature('technical','⚙','Techniek','Energie, tanks & systemen',true)}
          ${feature('logbook','▤','Logboek','Vaartochten & herinneringen')}
          ${feature('rws','⚠','Vaarwegberichten','Bruggen, sluizen & meldingen',true)}
          ${feature('entertainment','⌂','Home Assistant','Boordsystemen bedienen')}
          ${feature('costs','€','Kosten','Bonnen & uitgaven')}
          ${feature('finance','▦','Financieel','Overzicht & rapportage')}
          ${feature('pois','★',"POI's",'Havens & favoriete plekken')}
          ${feature('settings','⚙','Instellingen','App, koppelingen & beheer')}
        </div>`;
      dashboard.prepend(root);
      root.addEventListener('click',event=>{
        const button=event.target.closest('[data-route]');
        if(button)navigate(button.dataset.route);
      });
      $('ms8300Theme')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleTheme();});
      const img=root.querySelector('.ms8300-photo');
      if(img)img.onerror=()=>{if(!img.src.includes('serenity-hero-8274.jpg'))img.src=`/assets/serenity-hero-8274.jpg?v=${TOKEN}`;};
    }
    root.hidden=false;
    root.removeAttribute('aria-hidden');
    dashboard.classList.add('ms8300-ready');
    return true;
  }

  function setMissing(id,missing){const card=$(id+'Card');if(card)card.classList.toggle('is-missing',Boolean(missing));}
  function setRing(id,pct){const ring=$(id+'Ring');if(ring)ring.style.setProperty('--pct',String(clamp(finite(pct)??0,0,100)));}

  function liveSpeedKmh(){
    const state=window.liveNavState||{};
    const direct=[state.speedKmh,state.speed_kmh,state.live?.speedKmh,finite($('liveSpeedKmh')?.value),numberFrom(text('liveSpeedKmh'))];
    for(const value of direct){const n=finite(value);if(n!==null&&n>=0&&n<120)return n;}
    const textSources=[text('ms71510SpeedKn'),text('liveSpeedKn'),text('liveSpeed'),text('ivmsSpeed')];
    for(const raw of textSources){
      const n=numberFrom(raw);if(n===null||n<0||n>100)continue;
      if(/\bkn\b|knot/i.test(raw))return n*1.852;
      if(/km\/?u|km\/?h/i.test(raw))return n;
    }
    return 0;
  }

  function liveDepth(){
    const state=window.liveNavState||{};
    const candidates=[state.depthM,state.depth,state.live?.depthM,numberFrom(firstText(['liveDepth','ivmsDepth','ms71510Depth']))];
    for(const value of candidates){const n=finite(value);if(n!==null&&n>=0&&n<500)return n;}
    return null;
  }

  function beaufortFromKmh(kmh){
    const n=finite(kmh);if(n===null)return null;
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    const index=limits.findIndex(limit=>n<limit);return index<0?12:index;
  }

  function liveWindBft(){
    const direct=[firstText(['ms71510WindBft','weatherWindBft','liveWindBft']),window.liveNavState?.weather?.beaufort,window.weatherState?.beaufort];
    for(const value of direct){const n=numberFrom(value);if(n!==null&&n>=0&&n<=12)return Math.round(n);}
    const w=window.liveNavState?.weather||window.weatherState||{};
    const raw=finite(w.windSpeed??w.wind_speed??w.windSpeedKmh);if(raw===null)return null;
    const unit=String(w.windSpeedUnit||w.windUnit||w.units?.windSpeed||'').toLowerCase();
    const kmh=unit.includes('m/s')?raw*3.6:unit.includes('kn')||unit.includes('knot')||!unit?raw*1.852:raw;
    return beaufortFromKmh(kmh);
  }

  function outsideTemp(){
    const w=window.weatherState||{},live=window.liveNavState?.weather||{},vrm=window.MIJSERENITY_VRM_DATA||{};
    const candidates=[w.temperature,w.temperature_2m,w.current?.temperature_2m,live.temperature,live.temperature_2m,vrm.outside?.temperature,numberFrom(firstText(['weatherCurrentTemp','currentWeatherTemp','ivmsOutsideTemp','ms709WeatherTemp']))];
    for(const value of candidates){const n=finite(value);if(n!==null&&n>-80&&n<65)return n;}
    return null;
  }

  function energy(){return window.MIJSERENITY_VRM_LIVE_ENERGY||{};}
  function metric(value){return finite(value?.value)??finite(value?.valueFloat)??finite(value?.rawValue)??finite(value);}

  function houseBattery(){
    const e=energy(),b=e.battery||{};
    let soc=metric(b.soc)??metric(e.soc)??numberFrom(firstText(['ms71510HouseSoc','ivmsBatterySoc','techHouseSoc','techHouseBatterySoc','liveHouseSoc']));
    let voltage=metric(b.voltage)??metric(e.batteryVoltage)??numberFrom(firstText(['ms71510HouseVoltage','ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage']));
    if(soc!==null)soc=clamp(soc,0,100);
    return {soc,voltage};
  }

  function starterVoltage(kind){
    const e=energy(),d=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    if(kind==='motor'){
      const candidates=[e.battery?.starterVoltage,e.starterVoltage,d.battery?.starterVoltage,d.starterVoltage,numberFrom(firstText(['ms71510StartVoltage','techStartVoltage','liveStartVoltage']))];
      for(const item of candidates){const n=metric(item);if(n!==null&&n>=8&&n<=16.8)return n;}
    }
    const exact=kind==='heck'?['techHeckVoltage','liveHeckVoltage','heckBatteryVoltage','msStartHeckVoltage']:['techMotorStartVoltage'];
    const source=numberFrom(firstText(exact));if(source!==null&&source>=8&&source<=16.8)return source;
    try{
      const states=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      const patterns=kind==='heck'?/heckschroef|hekschroef|stern\s*thruster|heckaccu|hekaccu/:/startaccu|starter\s*battery|engine\s*battery|motor\s*startaccu/;
      for(const entity of states){
        const label=`${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase().replace(/[_-]+/g,' ');
        const unit=String(entity?.attributes?.unit_of_measurement||'').toLowerCase();
        const n=finite(entity?.state);
        if(patterns.test(label)&&(unit==='v'||/voltage|spanning|volt/.test(label))&&n!==null&&n>=8&&n<=16.8)return n;
      }
    }catch{}
    return null;
  }

  function estimatedSoc(voltage){
    const v=finite(voltage);if(v===null||v<8||v>16.8)return null;
    if(v>=12.75)return 100;if(v<=11.5)return 0;
    return clamp(Math.round(((v-11.5)/(12.75-11.5))*100),0,100);
  }

  function climate(){
    let c=null;try{if(typeof window.ms7102GetRuuviClimate==='function')c=window.ms7102GetRuuviClimate();}catch{}
    const vrm=window.MIJSERENITY_VRM_DATA||{};
    const salon=c?.salon||{},machine=c?.forward||c?.machinekamer||{};
    const salonT=finite(salon.temperature)??finite(vrm.salon?.temperature)??numberFrom(firstText(['ivmsCabinTemp','ms7148SalonTemp']));
    const machineT=finite(machine.temperature)??finite(vrm.machinekamer?.temperature)??finite(vrm.forward?.temperature)??numberFrom(firstText(['ivmsForwardTemp','mgMachineTemp']));
    return {salon:salonT,machine:machineT};
  }

  function shoreState(){
    const e=energy(),ac=e.ac||{};
    if(typeof ac.shoreConnected==='boolean')return ac.shoreConnected;
    const voltage=finite(ac.inputVoltage);if(voltage!==null){if(voltage>=180&&voltage<=280)return true;if(voltage<80)return false;}
    const raw=firstText(['liveShorePower','techShorePowerStatus','ivmsShorePower']).toLowerCase();
    if(/niet aangesloten|niet verbonden|disconnected|offline|\buit\b|\boff\b/.test(raw))return false;
    if(/aangesloten|verbonden|connected|active|\baan\b|\bon\b|230\s*v/.test(raw))return true;
    return false;
  }

  function tankLevel(kind){
    const ids=kind==='water'?['techWaterLevel','liveWaterPct','ms71510Water','mg-water']:['techFuelLevel','ms71510Fuel','liveFuelPct','mg-fuel'];
    const raw=firstText(ids);const n=numberFrom(raw);return n===null?null:clamp(n,0,100);
  }

  function refreshAttention(){
    let total=0,critical=0;
    try{
      const warnings=typeof window.technicalWarnings==='function'?window.technicalWarnings():[];
      if(Array.isArray(warnings)){total+=warnings.filter(Boolean).length;critical+=warnings.filter(item=>String(item?.level||'').toLowerCase()==='critical').length;}
    }catch{}
    let planner=0;try{if(typeof window.readPlannerDrafts==='function')planner=window.readPlannerDrafts().length||0;}catch{}
    let rws=0;try{const notices=typeof window.ms710GetRwsNotices==='function'?window.ms710GetRwsNotices():[];rws=Array.isArray(notices)?notices.filter(item=>item&&item.severity!=='info').length:0;}catch{}
    total+=planner+rws;
    const summary=$('ms8210Summary');
    if(summary){summary.classList.toggle('warning',total>0&&!critical);summary.classList.toggle('critical',critical>0);const count=summary.querySelector('.count');if(count)count.textContent=String(Math.min(99,total));const strong=summary.querySelector('strong');if(strong)strong.textContent=total?`${total} aandachtspunt${total===1?'':'en'}`:'Alles in orde';}
    [['planner',planner],['rws',rws],['technical',Math.max(0,total-planner-rws)]].forEach(([route,count])=>{
      const badge=$(`ms8300Badge-${route}`);if(!badge)return;badge.textContent=String(Math.min(99,count));badge.classList.toggle('show',count>0);badge.classList.toggle('critical',route==='technical'&&critical>0);
    });
  }

  function renderStatus(){
    setText('ms8300Greeting',greeting().toUpperCase());
    const speed=liveSpeedKmh();setText('ms8234Speed',`${fmt(speed,1)} km/u`);
    const depth=liveDepth();setText('ms8234Depth',depth===null?'Geen meting':`${fmt(depth,1)} m`);
    const bft=liveWindBft();setText('ms8234Wind',bft===null?'Geen meting':`${bft} Bft`);

    const house=houseBattery();
    setText('ms8234House',house.soc===null?'Geen meting':`${Math.round(house.soc)}%`);
    setText('ms8234HouseSub',house.voltage===null?'Victron live':`${fmt(house.voltage,2)} V`);
    setRing('ms8234House',house.soc??0);setMissing('ms8234House',house.soc===null&&house.voltage===null);

    const motor=starterVoltage('motor'),motorSoc=estimatedSoc(motor);
    setText('ms8265StartMotor',motor===null?'Geen meting':`${fmt(motor,2)} V`);setText('ms8265StartMotorSub',motor===null?'Geen live meting':motor>=13.2?'Wordt geladen':'Startaccu motor');setRing('ms8265StartMotor',motorSoc??0);setMissing('ms8265StartMotor',motor===null);
    const heck=starterVoltage('heck'),heckSoc=estimatedSoc(heck);
    setText('ms8265StartHeck',heck===null?'Geen meting':`${fmt(heck,2)} V`);setText('ms8265StartHeckSub',heck===null?'Geen live meting':heck>=13.2?'Wordt geladen':'Startaccu heckschroef');setRing('ms8265StartHeck',heckSoc??0);setMissing('ms8265StartHeck',heck===null);

    const shore=shoreState();setText('ms8234Shore',shore?'Aangesloten':'Niet aangesloten');setText('ms8234ShoreSub',shore?'Walstroom actief':'Geen walstroom');setMissing('ms8234Shore',false);

    const c=climate();
    setText('ms8234Cabin',c.salon===null?'Geen meting':`${fmt(c.salon,1)} °C`);setText('ms8234CabinSub','Ruuvi · Salon');setRing('ms8234Cabin',c.salon===null?0:clamp((c.salon/40)*100,0,100));setMissing('ms8234Cabin',c.salon===null);
    setText('ms8264EngineTemp',c.machine===null?'Geen meting':`${fmt(c.machine,1)} °C`);setText('ms8264EngineTempSub','Ruuvi · Machinekamer');setRing('ms8264EngineTemp',c.machine===null?0:clamp((c.machine/40)*100,0,100));setMissing('ms8264EngineTemp',c.machine===null);

    const water=tankLevel('water');setText('ms8234Water',water===null?'Geen meting':`${Math.round(water)}%`);setText('ms8234WaterSub','Drinkwatertank');setRing('ms8234Water',water??0);setMissing('ms8234Water',water===null);
    const fuel=tankLevel('fuel');setText('ms8234Fuel',fuel===null?'Geen meting':`${Math.round(fuel)}%`);setText('ms8234FuelSub','Dieseltank');setRing('ms8234Fuel',fuel??0);setMissing('ms8234Fuel',fuel===null);

    const outside=outsideTemp();
    let hidden=$('weatherCurrentTemp');if(!hidden){hidden=document.createElement('span');hidden.id='weatherCurrentTemp';hidden.hidden=true;document.body?.appendChild(hidden);}if(outside!==null)hidden.textContent=`${fmt(outside,1)}°`;
    refreshAttention();
  }

  async function refreshWeather(force=false){
    renderStatus();
    if(weatherBusy||typeof window.ms709RefreshWeather!=='function')return;
    const now=Date.now();if(!force&&now-weatherAt<5*60*1000)return;
    weatherAt=now;weatherBusy=true;
    try{await window.ms709RefreshWeather(Boolean(force),true);}catch(error){console.debug('Startweer verversen:',error);}finally{weatherBusy=false;renderStatus();}
  }

  function refresh(){
    syncBuild();
    if(!build())return false;
    applyTheme(readTheme(),false);
    renderStatus();
    syncRouteChrome();
    return true;
  }

  function queueRefresh(){
    if(refreshQueued)return;refreshQueued=true;
    requestAnimationFrame(()=>{refreshQueued=false;refresh();});
  }

  function watchDashboard(){
    const dashboard=$('dashboard');
    if(!dashboard||dashboardObserver)return;
    dashboardObserver=new MutationObserver(()=>{if(!$(ROOT_ID))queueRefresh();});
    dashboardObserver.observe(dashboard,{childList:true});
  }

  function start(){
    syncBuild();
    build();
    applyTheme(readTheme(),false);
    renderStatus();
    ensureBottomNav();
    syncRouteChrome();
    watchDashboard();

    [120,500,1400].forEach(ms=>setTimeout(queueRefresh,ms));
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{if(!document.hidden)renderStatus();},5000);

    const events=[
      'mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-updated',
      'mijnserenity:vrm-energy-updated','mijnserenity:live-values-ready','mijnserenity:dashboard-ready','mijnserenity:boot-complete',
      'weather:update','weather:updated','mijnserenity:weather-updated','online','offline','pageshow'
    ];
    events.forEach(name=>window.addEventListener(name,queueRefresh,{passive:true}));
    window.addEventListener('mijnserenity:routechange',event=>{
      const detail=event?.detail;const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target||'');
      requestAnimationFrame(()=>syncRouteChrome(route));
    },{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRefresh();refreshWeather(false);}},{passive:true});
    window.addEventListener('online',()=>setTimeout(()=>refreshWeather(true),150),{passive:true});
    setTimeout(()=>refreshWeather(false),800);

    window.ms8210RefreshStart=refresh;
    window.ms8210RefreshAttention=refreshAttention;
    window.ms8300RefreshStart=refresh;
    window.ms8300Navigate=navigate;

    window.dispatchEvent(new CustomEvent('mijnserenity:start-runtime-ready',{detail:{build:BUILD,canonical:true}}));
    console.info(`MijnSerenity ${BUILD}: één canonieke Start-runtime actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
