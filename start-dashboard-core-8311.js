/* MijnSerenity 8.31.1 — canonieke Start-runtime.
   Eén DOM, één header, één datalaag en geen historische dashboardketen. */
(()=>{
  'use strict';
  if(window.__msStart8311)return;
  window.__msStart8311=true;
  /* Compatibiliteitsvlaggen voorkomen dat oudere, nog gecachte loaders een tweede dashboard bouwen. */
  window.__msStart8300=true;
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

  const BUILD='8.31.1';
  const TOKEN='831100';
  const ROOT_ID='ms8210Start';
  const HERO='/assets/serenity-hero-8274.jpg';
  const HERO_FALLBACK='/assets/serenity-home-hero-8266.jpg';
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
    return v&&!/^(?:undefined|null|–|-|—|geen data|geen meting|onbekend)$/i.test(v)?v:'';
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
    const version=$('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
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

  function normaliseRoute(route){return String(route||'').trim().toLowerCase()}
  function navigate(route){
    route=normaliseRoute(route);
    if(!route)return;
    if(route==='more')route='settings';
    try{
      if(route==='rws'&&typeof window.ms795OpenRws==='function'){window.ms795OpenRws();return;}
      const button=document.querySelector(`.bottom-nav .bottom-nav-item[data-target="${CSS.escape(route)}"]`);
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate(route,button||null);
        return;
      }
      if(route==='dashboard'){
        const app=$('appView'),dashboard=$('dashboard');
        if(app&&dashboard){
          [...app.querySelectorAll(':scope > section[id]')].forEach(section=>{
            const active=section===dashboard;
            section.classList.toggle('hidden',!active);
            section.setAttribute('aria-hidden',active?'false':'true');
          });
          syncRouteChrome('dashboard');
          return;
        }
      }
      const tab=document.querySelector(`.tabs [data-target="${CSS.escape(route)}"]`);
      if(tab){tab.click();return;}
      window.MIJSERENITY_PENDING_ROUTE=route;
      window.dispatchEvent(new CustomEvent('mijnserenity:route-requested',{detail:{route,source:'start-8311'}}));
    }catch(error){
      console.warn(`MijnSerenity: openen van ${route} mislukt.`,error);
      window.MIJSERENITY_PENDING_ROUTE=route;
    }
  }

  function activeRoute(){
    const app=$('appView');
    if(!app||app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return '';
    const visible=[...app.querySelectorAll(':scope > section[id]')]
      .find(section=>!section.classList.contains('hidden')&&section.getAttribute('aria-hidden')!=='true');
    return String(visible?.id||'dashboard').toLowerCase();
  }
  function syncRouteChrome(preferred=''){
    const body=document.body;if(!body)return;
    const route=normaliseRoute(preferred||activeRoute()||'dashboard');
    const onStart=route==='dashboard';
    body.classList.toggle('ms8300-start-page',onStart);
    body.classList.toggle('ms8300-sub-page',!onStart&&Boolean(route));
    document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(button=>{
      const active=button.dataset.target===route;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
  }

  function readTheme(){
    try{
      const saved=localStorage.getItem(THEME_KEY);
      if(saved==='day'||saved==='night')return saved;
    }catch{}
    return document.documentElement.dataset.msDaynight==='day'?'day':'night';
  }
  function applyTheme(mode,save=false){
    const next=mode==='day'?'day':'night';
    document.documentElement.dataset.msDaynight=next;
    document.documentElement.style.colorScheme=next==='day'?'light':'dark';
    if(save){try{localStorage.setItem(THEME_KEY,next)}catch{}}
    const button=$('ms8300Theme');
    if(button){
      button.innerHTML=next==='day'?'<span aria-hidden="true">☀</span><strong>Dag</strong>':'<span aria-hidden="true">☾</span><strong>Nacht</strong>';
      button.setAttribute('aria-label',next==='day'?'Schakel naar nachtweergave':'Schakel naar dagweergave');
    }
    window.dispatchEvent(new CustomEvent('mijnserenity:theme-changed',{detail:{mode:next,build:BUILD}}));
  }
  function toggleTheme(){applyTheme(readTheme()==='night'?'day':'night',true)}

  function statusCard(id,icon,label,sub=''){
    return `<div class="ms8300-status" id="${id}Card"><span class="ms8300-ring" id="${id}Ring"><span aria-hidden="true">${icon}</span></span><span class="ms8300-status-copy"><small>${esc(label)}</small><strong id="${id}">Geen data</strong><em id="${id}Sub">${esc(sub)}</em></span></div>`;
  }
  function feature(route,icon,label,sub,badge=false){
    return `<button type="button" class="ms8300-feature" data-route="${route}">${badge?`<span class="ms8300-feature-badge" id="ms8300Badge-${route}">0</span>`:''}<span class="ms8300-feature-icon" aria-hidden="true">${icon}</span><span class="ms8300-feature-copy"><strong>${esc(label)}</strong><small>${esc(sub)}</small></span></button>`;
  }
  function heroNav(route,icon,label){
    return `<button type="button" class="ms8311-hero-nav-button" data-route="${route}"><span aria-hidden="true">${icon}</span><strong>${esc(label)}</strong></button>`;
  }

  function build(){
    syncBuild();
    const dashboard=$('dashboard');if(!dashboard)return false;
    let root=$(ROOT_ID);
    if(root&&root.dataset.msBuild!==BUILD){root.remove();root=null;}
    if(!root){
      root=document.createElement('section');
      root.id=ROOT_ID;
      root.className='ms8300-start ms8311-start';
      root.dataset.msBuild=BUILD;
      root.setAttribute('aria-label','MijnSerenity Start');
      root.innerHTML=`
        <header class="ms8300-hero ms8311-hero">
          <img class="ms8300-photo" src="${HERO}?v=${TOKEN}" alt="Serenity VriJon" decoding="async" fetchpriority="high" loading="eager">
          <div class="ms8300-overlay" aria-hidden="true"></div>
          <div class="ms8300-top">
            <div class="ms8300-brand"><strong>Serenity</strong><small>EXPLORE · NAVIGATE · ENJOY</small></div>
            <div class="ms8300-actions">
              <button type="button" id="ms8300Theme" class="ms8300-action" aria-label="Weergave wisselen"><span aria-hidden="true">☾</span><strong>Nacht</strong></button>
            </div>
          </div>
          <div class="ms8300-copy">
            <span class="ms8300-eyebrow" id="ms8300Greeting">WELKOM TERUG</span>
            <h1>Klaar om te gaan varen?</h1>
            <p>Ontdek, vaar en geniet. De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?</p>
            <div class="ms8300-live-metrics" aria-label="Live vaarwaarden">
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">⌁</span><span class="ms8300-live-copy"><strong id="ms8234Speed">0,0 km/u</strong><small>Snelheid</small></span></div>
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">⌄</span><span class="ms8300-live-copy"><strong id="ms8234Depth">Geen data</strong><small>Diepte</small></span></div>
              <div class="ms8300-live-metric"><span class="ms8300-live-icon" aria-hidden="true">≋</span><span class="ms8300-live-copy"><strong id="ms8234Wind">Geen data</strong><small>Wind</small></span></div>
            </div>
            <button type="button" class="ms8300-start-live" data-route="live"><span aria-hidden="true">▶</span><span>Start live varen</span><span aria-hidden="true">›</span></button>
          </div>
          <nav class="ms8311-hero-nav" aria-label="Snel navigeren">
            ${heroNav('live','⛵','Varen')}
            ${heroNav('map','⌖','Kaart')}
            ${heroNav('planner','◇','Route')}
            ${heroNav('weather','☀','Weer')}
            ${heroNav('technical','⚙','Techniek')}
          </nav>
        </header>
        <div class="ms8300-status-grid" aria-label="Bootstatus">
          ${statusCard('ms8234House','▰','Huishoudaccu','Victron')}
          ${statusCard('ms8265StartMotor','⚡','Startaccu motor','Live meting')}
          ${statusCard('ms8265StartHeck','↯','Startaccu heckschroef','Live meting')}
          ${statusCard('ms8234Shore','⌁','Walstroom','Aansluitstatus')}
          ${statusCard('ms8234Cabin','°','Salon','Ruuvi')}
          ${statusCard('ms8264EngineTemp','°','Motorruimte','Ruuvi')}
          ${statusCard('ms8311Outside','☀','Buiten','Weerdata')}
          ${statusCard('ms8234Water','◒','Drinkwater','Tankniveau')}
          ${statusCard('ms8234Fuel','◆','Diesel','Tankniveau')}
        </div>
        <div class="ms8300-features" aria-label="Onderdelen">
          ${feature('ais','⌁','AIS','Schepen in de omgeving')}
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
      if(img)img.onerror=()=>{if(!String(img.src).includes('serenity-home-hero-8266.jpg'))img.src=`${HERO_FALLBACK}?v=${TOKEN}`;};
    }
    root.hidden=false;
    root.removeAttribute('aria-hidden');
    dashboard.classList.add('ms8300-ready','ms8311-ready');
    return true;
  }

  function setMissing(id,missing){const card=$(id+'Card');if(card)card.classList.toggle('is-missing',Boolean(missing));}
  function setRing(id,pct){const ring=$(id+'Ring');if(ring)ring.style.setProperty('--pct',String(clamp(finite(pct)??0,0,100)));}
  function setStatus(id,value,sub,pct=null,missing=false){
    setText(id,value);if(sub!==undefined)setText(id+'Sub',sub);setMissing(id,missing);if(pct!==null)setRing(id,pct);
  }

  function liveSpeedKmh(){
    const state=window.liveNavState||{};
    for(const value of [state.speedKmh,state.speed_kmh,state.live?.speedKmh]){const n=finite(value);if(n!==null&&n>=0&&n<120)return n;}
    for(const raw of [text('liveSpeedKmh'),text('liveSpeedKn'),text('liveSpeed'),text('ivmsSpeed')]){
      const n=numberFrom(raw);if(n===null||n<0||n>100)continue;
      if(/\bkn\b|knot/i.test(raw))return n*1.852;
      return n;
    }
    return 0;
  }
  function liveDepth(){
    const state=window.liveNavState||{};
    for(const value of [state.depthM,state.depth,state.live?.depthM,numberFrom(firstText(['liveDepth','ivmsDepth','ms71510Depth']))]){
      const n=finite(value);if(n!==null&&n>=0&&n<500)return n;
    }
    return null;
  }
  function beaufortFromKmh(kmh){
    const n=finite(kmh);if(n===null)return null;
    const limits=[1,6,12,20,29,39,50,62,75,89,103,118];
    const index=limits.findIndex(limit=>n<limit);return index<0?12:index;
  }
  function liveWindBft(){
    for(const value of [firstText(['ms71510WindBft','weatherWindBft','liveWindBft']),window.liveNavState?.weather?.beaufort,window.weatherState?.beaufort]){
      const n=numberFrom(value);if(n!==null&&n>=0&&n<=12)return Math.round(n);
    }
    const w=window.liveNavState?.weather||window.weatherState||{};
    const raw=finite(w.windSpeed??w.wind_speed??w.windSpeedKmh);if(raw===null)return null;
    const unit=String(w.windSpeedUnit||w.windUnit||w.units?.windSpeed||'').toLowerCase();
    const kmh=unit.includes('m/s')?raw*3.6:(unit.includes('kn')||unit.includes('knot')||!unit)?raw*1.852:raw;
    return beaufortFromKmh(kmh);
  }
  function outsideTemp(){
    const w=window.weatherState||{},live=window.liveNavState?.weather||{},vrm=window.MIJSERENITY_VRM_DATA||{};
    for(const value of [w.temperature,w.temperature_2m,w.current?.temperature_2m,live.temperature,live.temperature_2m,vrm.outside?.temperature,numberFrom(firstText(['weatherCurrentTemp','currentWeatherTemp','ivmsOutsideTemp','ms709WeatherTemp']))]){
      const n=finite(value);if(n!==null&&n>-80&&n<65)return n;
    }
    return null;
  }
  function energy(){return window.MIJSERENITY_VRM_LIVE_ENERGY||{};}
  function metric(value){return finite(value?.value)??finite(value?.valueFloat)??finite(value?.rawValue)??finite(value);}
  function houseBattery(){
    const e=energy(),b=e.battery||{};
    let soc=metric(b.soc)??metric(e.soc)??numberFrom(firstText(['ms71510HouseSoc','ivmsBatterySoc','techHouseSoc','techHouseBatterySoc','liveHouseSoc']));
    const voltage=metric(b.voltage)??metric(e.batteryVoltage)??numberFrom(firstText(['ms71510HouseVoltage','ivmsBatteryVoltage','techHouseVoltage','liveHouseVoltage']));
    if(soc!==null)soc=clamp(soc,0,100);
    return {soc,voltage};
  }
  function starterVoltage(kind){
    const e=energy(),d=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    if(kind==='motor'){
      for(const item of [e.battery?.starterVoltage,e.starterVoltage,d.battery?.starterVoltage,d.starterVoltage,numberFrom(firstText(['ms71510StartVoltage','techStartVoltage','liveStartVoltage']))]){
        const n=metric(item);if(n!==null&&n>=8&&n<=16.8)return n;
      }
    }
    const ids=kind==='heck'?['techHeckVoltage','liveHeckVoltage','heckBatteryVoltage','msStartHeckVoltage']:['techMotorStartVoltage'];
    const direct=numberFrom(firstText(ids));if(direct!==null&&direct>=8&&direct<=16.8)return direct;
    try{
      const states=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      const pattern=kind==='heck'?/heckschroef|hekschroef|stern\s*thruster|heckaccu|hekaccu/:/startaccu|starter\s*battery|engine\s*battery|motor\s*startaccu/;
      for(const entity of states){
        const label=`${entity?.entity_id||''} ${entity?.name||''}`.toLowerCase().replace(/[_-]+/g,' ');
        const unit=String(entity?.attributes?.unit_of_measurement||'').toLowerCase();
        const n=finite(entity?.state);
        if(pattern.test(label)&&(unit==='v'||/voltage|spanning|volt/.test(label))&&n!==null&&n>=8&&n<=16.8)return n;
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
    const vrm=window.MIJSERENITY_VRM_DATA||{},salon=c?.salon||{},machine=c?.forward||c?.machinekamer||{};
    const salonT=finite(salon.temperature)??finite(vrm.salon?.temperature)??numberFrom(firstText(['ivmsCabinTemp','ms7148SalonTemp']));
    const machineT=finite(machine.temperature)??finite(vrm.machinekamer?.temperature)??finite(vrm.forward?.temperature)??numberFrom(firstText(['ivmsForwardTemp','mgMachineTemp']));
    return {salon:salonT,machine:machineT};
  }
  function shoreState(){
    const e=energy(),ac=e.ac||{};
    if(typeof ac.shoreConnected==='boolean')return ac.shoreConnected;
    const voltage=finite(ac.inputVoltage);
    if(voltage!==null){if(voltage>=180&&voltage<=280)return true;if(voltage<80)return false;}
    const raw=firstText(['liveShorePower','techShorePowerStatus','ivmsShorePower']).toLowerCase();
    if(!raw)return null;
    if(/niet aangesloten|niet verbonden|disconnected|offline|\buit\b|\boff\b/.test(raw))return false;
    if(/aangesloten|verbonden|connected|active|\baan\b|\bon\b|230\s*v/.test(raw))return true;
    return null;
  }
  function tankLevel(kind){
    const ids=kind==='water'?['techWaterLevel','liveWaterPct','ms71510Water','mg-water']:['techFuelLevel','ms71510Fuel','liveFuelPct','mg-fuel'];
    const n=numberFrom(firstText(ids));return n===null?null:clamp(n,0,100);
  }

  function refreshAttention(){
    let total=0,critical=0;
    try{
      const warnings=typeof window.technicalWarnings==='function'?window.technicalWarnings():[];
      if(Array.isArray(warnings)){total+=warnings.filter(Boolean).length;critical+=warnings.filter(item=>String(item?.level||'').toLowerCase()==='critical').length;}
    }catch{}
    let rws=0;try{const notices=typeof window.ms710GetRwsNotices==='function'?window.ms710GetRwsNotices():[];rws=Array.isArray(notices)?notices.filter(item=>item&&item.severity!=='info').length:0;}catch{}
    total+=rws;
    const badge=$('ms8300Badge-rws');if(badge){badge.textContent=String(Math.min(99,rws));badge.classList.toggle('show',rws>0);badge.classList.toggle('critical',critical>0);}
    window.MIJSERENITY_ATTENTION_COUNT=total;
  }

  function renderStatus(){
    setText('ms8300Greeting','WELKOM TERUG');
    const speed=liveSpeedKmh();setText('ms8234Speed',`${fmt(speed,1)} km/u`);
    const depth=liveDepth();setText('ms8234Depth',depth===null?'Geen data':`${fmt(depth,1)} m`);
    const bft=liveWindBft();setText('ms8234Wind',bft===null?'Geen data':`${bft} Bft`);

    const house=houseBattery();
    setStatus('ms8234House',house.soc===null?'Geen data':`${Math.round(house.soc)}%`,house.voltage===null?'Geen Victron-data':`${fmt(house.voltage,2)} V`,house.soc??0,house.soc===null&&house.voltage===null);

    const motor=starterVoltage('motor'),motorSoc=estimatedSoc(motor);
    setStatus('ms8265StartMotor',motor===null?'Geen data':`${fmt(motor,2)} V`,motor===null?'Geen live meting':motor>=13.2?'Wordt geladen':'Startaccu motor',motorSoc??0,motor===null);
    const heck=starterVoltage('heck'),heckSoc=estimatedSoc(heck);
    setStatus('ms8265StartHeck',heck===null?'Geen data':`${fmt(heck,2)} V`,heck===null?'Geen live meting':heck>=13.2?'Wordt geladen':'Startaccu heckschroef',heckSoc??0,heck===null);

    const shore=shoreState();
    setStatus('ms8234Shore',shore===true?'Aangesloten':shore===false?'Niet aangesloten':'Geen data',shore===true?'Walstroom actief':shore===false?'Geen walstroom':'Geen betrouwbare bron',shore===true?100:0,shore===null);

    const c=climate();
    setStatus('ms8234Cabin',c.salon===null?'Geen data':`${fmt(c.salon,1)} °C`,'Ruuvi · Salon',c.salon===null?0:clamp(c.salon/40*100,0,100),c.salon===null);
    setStatus('ms8264EngineTemp',c.machine===null?'Geen data':`${fmt(c.machine,1)} °C`,'Ruuvi · Machinekamer',c.machine===null?0:clamp(c.machine/60*100,0,100),c.machine===null);
    const outside=outsideTemp();
    setStatus('ms8311Outside',outside===null?'Geen data':`${fmt(outside,1)} °C`,'Actueel weer',outside===null?0:clamp((outside+10)/50*100,0,100),outside===null);

    const water=tankLevel('water');
    setStatus('ms8234Water',water===null?'Geen data':`${Math.round(water)}%`,'Drinkwatertank',water??0,water===null);
    const fuel=tankLevel('fuel');
    setStatus('ms8234Fuel',fuel===null?'Geen data':`${Math.round(fuel)}%`,'Dieseltank',fuel??0,fuel===null);
    refreshAttention();
  }

  async function refreshWeather(force=false){
    renderStatus();
    if(weatherBusy||typeof window.ms709RefreshWeather!=='function')return;
    const now=Date.now();if(!force&&now-weatherAt<5*60*1000)return;
    weatherAt=now;weatherBusy=true;
    try{await window.ms709RefreshWeather(Boolean(force),true);}catch(error){console.debug('Startweer verversen:',error)}finally{weatherBusy=false;renderStatus()}
  }
  function refresh(){syncBuild();if(!build())return false;applyTheme(readTheme(),false);renderStatus();syncRouteChrome();return true;}
  function queueRefresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;refresh()})}
  function watchDashboard(){
    const dashboard=$('dashboard');if(!dashboard||dashboardObserver)return;
    dashboardObserver=new MutationObserver(()=>{if(!$(ROOT_ID))queueRefresh()});
    dashboardObserver.observe(dashboard,{childList:true});
  }
  function flushPendingRoute(){
    const route=window.MIJSERENITY_PENDING_ROUTE;
    if(route&&typeof window.captainNavigate==='function'){
      window.MIJSERENITY_PENDING_ROUTE='';
      navigate(route);
    }
  }
  function start(){
    syncBuild();build();applyTheme(readTheme(),false);renderStatus();syncRouteChrome();watchDashboard();
    [80,350,1200].forEach(ms=>setTimeout(queueRefresh,ms));
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{if(!document.hidden)renderStatus()},8000);
    [
      'mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-updated',
      'mijnserenity:vrm-energy-updated','mijnserenity:live-values-ready','mijnserenity:dashboard-ready','mijnserenity:app-ready',
      'weather:update','weather:updated','mijnserenity:weather-updated','online','offline','pageshow'
    ].forEach(name=>window.addEventListener(name,()=>{queueRefresh();flushPendingRoute()},{passive:true}));
    window.addEventListener('mijnserenity:routechange',event=>{
      const detail=event?.detail;const route=typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target||'');
      requestAnimationFrame(()=>syncRouteChrome(route));
    },{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueRefresh();refreshWeather(false);flushPendingRoute()}},{passive:true});
    setTimeout(()=>refreshWeather(false),1200);
    window.ms8210RefreshStart=refresh;
    window.ms8210RefreshAttention=refreshAttention;
    window.ms8300RefreshStart=refresh;
    window.ms8300Navigate=navigate;
    window.ms8311Navigate=navigate;
    window.ms8311ToggleTheme=toggleTheme;
    window.dispatchEvent(new CustomEvent('mijnserenity:start-runtime-ready',{detail:{build:BUILD,canonical:true}}));
    console.info(`MijnSerenity ${BUILD}: canonieke Start-runtime actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();