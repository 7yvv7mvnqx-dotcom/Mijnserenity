/* MijnSerenity 8.31.2 — één canonieke Start-runtime. */
(()=>{
  'use strict';
  if(window.__msStart8310)return;
  window.__msStart8310=true;

  const BUILD='8.31.2';
  const ROOT_ID='ms8210Start';
  const THEME_KEY='mijnserenity-daynight-v1';
  const HERO='/assets/serenity-hero-8274.jpg?v=831200';
  const HERO_FALLBACK='/assets/serenity-home-hero-8266.jpg?v=831200';
  const $=id=>document.getElementById(id);
  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(String(value).replace(',','.'));
    return Number.isFinite(n)?n:null;
  };
  const numberFrom=value=>{
    const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):null;
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const text=id=>String($(id)?.textContent||'').trim();
  const valid=value=>{
    const v=String(value??'').replace(/\s+/g,' ').trim();
    return v&&!/^(?:undefined|null|–|-|—|geen data|onbekend)$/i.test(v)?v:'';
  };
  const firstText=(ids,fallback='')=>{
    for(const id of ids){const v=valid(text(id));if(v)return v;}
    return fallback;
  };
  const fmt=(v,d=1)=>Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    set('settingsAppVersion',BUILD);
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function firstName(){
    const raw=window.currentProfile?.display_name||window.currentProfile?.name||window.currentUser?.user_metadata?.full_name||window.currentUser?.user_metadata?.name||'';
    return String(raw).trim().split(/\s+/)[0]||'';
  }
  function greeting(){
    const h=new Date().getHours();
    const part=h<12?'Goedemorgen':h<18?'Goedemiddag':'Goedenavond';
    const name=firstName();
    return name?`${part} ${name}`:part;
  }

  function route(route){
    if(!route)return;
    if(route==='more'){route='settings';}
    try{
      const button=document.querySelector(`.tab[data-target="${CSS.escape(route)}"],.bottom-nav-item[data-target="${CSS.escape(route)}"]`);
      if(typeof window.captainNavigate==='function')return window.captainNavigate(route,button||null);
      if(button)return button.click();
    }catch(error){console.warn('Startnavigatie mislukt:',route,error);}
  }

  function readTheme(){
    try{
      const saved=localStorage.getItem(THEME_KEY);
      if(saved==='day'||saved==='night')return saved;
    }catch{}
    return 'night';
  }
  function applyTheme(mode,save=false){
    const next=mode==='day'?'day':'night';
    document.documentElement.dataset.msDaynight=next;
    if(save){try{localStorage.setItem(THEME_KEY,next)}catch{}}
    const b=$('ms8300Theme');
    if(b){b.innerHTML=next==='night'?'<span>☾</span><strong>Nacht</strong>':'<span>☀</span><strong>Dag</strong>';}
  }

  function statusCard(id,icon,label,sub){
    return `<div class="ms8300-status" id="${id}Card"><span class="ms8300-ring" id="${id}Ring"><span>${icon}</span></span><span class="ms8300-status-copy"><small>${label}</small><strong id="${id}">Geen data</strong><em id="${id}Sub">${sub}</em></span></div>`;
  }
  function feature(routeName,icon,label,sub){
    return `<button type="button" class="ms8300-feature" data-route="${routeName}"><span class="ms8300-feature-icon">${icon}</span><span class="ms8300-feature-copy"><strong>${label}</strong><small>${sub}</small></span></button>`;
  }

  function build(){
    const dashboard=$('dashboard');
    if(!dashboard)return false;
    let root=$(ROOT_ID);
    if(root)return true;
    root=document.createElement('section');
    root.id=ROOT_ID;
    root.className='ms8300-start';
    root.setAttribute('aria-label','MijnSerenity Start');
    root.innerHTML=`
      <header class="ms8300-hero">
        <img class="ms8300-photo" src="${HERO}" alt="Serenity" fetchpriority="high" decoding="async">
        <div class="ms8300-overlay" aria-hidden="true"></div>
        <div class="ms8300-top">
          <div class="ms8300-brand"><strong>Serenity</strong><small>EXPLORE · NAVIGATE · ENJOY</small></div>
          <button type="button" id="ms8300Theme" class="ms8300-action"><span>☾</span><strong>Nacht</strong></button>
        </div>
        <div class="ms8300-copy">
          <span class="ms8300-eyebrow" id="ms8300Greeting">WELKOM TERUG</span>
          <h1>Klaar om te gaan varen?</h1>
          <p>Ontdek, vaar en geniet. De Serenity ligt klaar. Waar brengt de volgende reis je naartoe?</p>
          <div class="ms8300-live-metrics">
            <div class="ms8300-live-metric"><span>⌁</span><div><strong id="ms8234Speed">0,0 km/u</strong><small>Snelheid</small></div></div>
            <div class="ms8300-live-metric"><span>⌄</span><div><strong id="ms8234Depth">Geen data</strong><small>Diepte</small></div></div>
            <div class="ms8300-live-metric"><span>≋</span><div><strong id="ms8234Wind">Geen data</strong><small>Wind</small></div></div>
          </div>
        </div>
        <nav class="ms8310-hero-nav" aria-label="Snelle navigatie">
          <button data-route="live"><span>⛵</span><strong>Varen</strong></button>
          <button data-route="map"><span>🗺️</span><strong>Kaart</strong></button>
          <button data-route="planner"><span>🧭</span><strong>Route</strong></button>
          <button data-route="technical"><span>⚙️</span><strong>Techniek</strong></button>
          <button data-route="settings"><span>☰</span><strong>Meer</strong></button>
        </nav>
      </header>
      <div class="ms8300-status-grid">
        ${statusCard('ms8234House','▰','Huishoudaccu','Victron')}
        ${statusCard('ms8265StartMotor','⚡','Startaccu motor','Live meting')}
        ${statusCard('ms8265StartHeck','↯','Startaccu heckschroef','Live meting')}
        ${statusCard('ms8234Shore','⌁','Walstroom','Aansluitstatus')}
        ${statusCard('ms8234Cabin','°','Salon','Ruuvi')}
        ${statusCard('ms8264EngineTemp','°','Motorruimte','Ruuvi')}
        ${statusCard('ms8234Water','◒','Drinkwater','Tankniveau')}
        ${statusCard('ms8234Fuel','◆','Diesel','Tankniveau')}
      </div>
      <div class="ms8300-features">
        ${feature('ais','📡','AIS','Schepen in de omgeving')}
        ${feature('weather','☀','Weer','Actueel weer & verwachting')}
        ${feature('logbook','▤','Logboek','Vaartochten & herinneringen')}
        ${feature('rws','⚠','Vaarwegberichten','Bruggen, sluizen & meldingen')}
        ${feature('entertainment','⌂','Home Assistant','Boordsystemen bedienen')}
        ${feature('costs','€','Kosten','Bonnen & uitgaven')}
        ${feature('finance','▦','Financieel','Overzicht & rapportage')}
        ${feature('pois','★',"POI's",'Havens & favoriete plekken')}
      </div>`;
    dashboard.prepend(root);
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-route]');
      if(button)route(button.dataset.route);
    });
    $('ms8300Theme')?.addEventListener('click',event=>{event.stopPropagation();applyTheme(readTheme()==='night'?'day':'night',true);});
    const img=root.querySelector('.ms8300-photo');
    if(img)img.onerror=()=>{if(!img.src.includes('serenity-home-hero-8266.jpg'))img.src=HERO_FALLBACK;};
    dashboard.classList.add('ms8300-ready');
    document.body?.classList.add('ms8300-start-page');
    return true;
  }

  function ring(id,pct){const el=$(id+'Ring');if(el)el.style.setProperty('--pct',String(clamp(finite(pct)??0,0,100)));}
  function missing(id,isMissing){$(id+'Card')?.classList.toggle('is-missing',Boolean(isMissing));}
  function energy(){return window.MIJSERENITY_VRM_LIVE_ENERGY||window.MIJSERENITY_VRM_DATA?.energy||{};}
  function metric(v){return finite(v?.value)??finite(v?.valueFloat)??finite(v?.rawValue)??finite(v);}

  function speed(){
    const s=window.liveNavState||{};
    for(const v of [s.speedKmh,s.speed_kmh,s.live?.speedKmh]){const n=finite(v);if(n!==null&&n>=0&&n<120)return n;}
    const raw=firstText(['liveSpeedKmh','liveSpeed','ivmsSpeed']);
    const n=numberFrom(raw);return n!==null&&n>=0&&n<120?n:0;
  }
  function depth(){
    const s=window.liveNavState||{};
    for(const v of [s.depthM,s.depth,s.live?.depthM,numberFrom(firstText(['liveDepth','ivmsDepth','ms71510Depth']))]){const n=finite(v);if(n!==null&&n>=0&&n<500)return n;}
    return null;
  }
  function wind(){
    for(const raw of [firstText(['ms71510WindBft','weatherWindBft','liveWindBft']),window.liveNavState?.weather?.beaufort,window.weatherState?.beaufort]){
      const n=numberFrom(raw);if(n!==null&&n>=0&&n<=12)return Math.round(n);
    }
    return null;
  }
  function house(){
    const e=energy(),b=e.battery||{};
    const soc=metric(b.soc)??metric(e.soc)??numberFrom(firstText(['ms71510HouseSoc','ivmsBatterySoc','techHouseSoc','techHouseBatterySoc']));
    const voltage=metric(b.voltage)??metric(e.batteryVoltage)??numberFrom(firstText(['ms71510HouseVoltage','ivmsBatteryVoltage','techHouseVoltage']));
    return {soc:soc===null?null:clamp(soc,0,100),voltage};
  }
  function starter(kind){
    const e=energy(),d=window.MIJSERENITY_VRM_DIAGNOSTICS||{};
    const direct=kind==='motor'?[e.battery?.starterVoltage,e.starterVoltage,d.battery?.starterVoltage,d.starterVoltage,numberFrom(firstText(['ms71510StartVoltage','techStartVoltage','liveStartVoltage']))]:[numberFrom(firstText(['techHeckVoltage','liveHeckVoltage','heckBatteryVoltage','msStartHeckVoltage']))];
    for(const v of direct){const n=metric(v);if(n!==null&&n>=8&&n<=16.8)return n;}
    try{
      const states=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      const re=kind==='heck'?/heckschroef|stern\s*thruster|heckaccu|hekaccu/:/startaccu|starter\s*battery|engine\s*battery/;
      for(const ent of states){
        const label=`${ent?.entity_id||''} ${ent?.name||''}`.toLowerCase().replace(/[_-]+/g,' ');
        const n=finite(ent?.state);
        if(re.test(label)&&n!==null&&n>=8&&n<=16.8)return n;
      }
    }catch{}
    return null;
  }
  function climate(){
    let c=null;try{c=typeof window.ms7102GetRuuviClimate==='function'?window.ms7102GetRuuviClimate():null}catch{}
    const vrm=window.MIJSERENITY_VRM_DATA||{};
    return {
      salon:finite(c?.salon?.temperature)??finite(vrm.salon?.temperature)??numberFrom(firstText(['ivmsCabinTemp','ms7148SalonTemp'])),
      machine:finite(c?.forward?.temperature)??finite(c?.machinekamer?.temperature)??finite(vrm.machinekamer?.temperature)??numberFrom(firstText(['ivmsForwardTemp','mgMachineTemp']))
    };
  }
  function shore(){
    const e=energy(),ac=e.ac||{};
    if(typeof ac.shoreConnected==='boolean')return ac.shoreConnected;
    const v=finite(ac.inputVoltage);if(v!==null){if(v>=180&&v<=280)return true;if(v<80)return false;}
    const raw=firstText(['liveShorePower','techShorePowerStatus','ivmsShorePower']).toLowerCase();
    if(/niet aangesloten|niet verbonden|disconnected|offline|\buit\b|\boff\b/.test(raw))return false;
    if(/aangesloten|verbonden|connected|active|\baan\b|\bon\b|230\s*v/.test(raw))return true;
    return null;
  }
  function tank(kind){
    const e=energy();
    const direct=kind==='water'?metric(e.tanks?.water?.levelPct)??metric(e.waterPct):metric(e.tanks?.fuel?.levelPct)??metric(e.fuelPct);
    if(direct!==null)return clamp(direct,0,100);
    const ids=kind==='water'?['techWaterLevel','liveWaterPct','ms71510Water']:['techFuelLevel','ms71510Fuel','liveFuelPct'];
    const n=numberFrom(firstText(ids));return n===null?null:clamp(n,0,100);
  }
  function approxLeadSoc(voltage){
    const v=finite(voltage);if(v===null)return null;if(v>=12.75)return 100;if(v<=11.5)return 0;return clamp(Math.round((v-11.5)/1.25*100),0,100);
  }

  function render(){
    if(!$(ROOT_ID))return;
    set('ms8300Greeting',greeting().toUpperCase());
    set('ms8234Speed',`${fmt(speed(),1)} km/u`);
    const d=depth();set('ms8234Depth',d===null?'Geen data':`${fmt(d,1)} m`);
    const w=wind();set('ms8234Wind',w===null?'Geen data':`${w} Bft`);

    const h=house();set('ms8234House',h.soc===null?'Geen data':`${Math.round(h.soc)}%`);set('ms8234HouseSub',h.voltage===null?'Victron':`${fmt(h.voltage,2)} V`);ring('ms8234House',h.soc);missing('ms8234House',h.soc===null&&h.voltage===null);
    const sm=starter('motor'),sh=starter('heck');
    set('ms8265StartMotor',sm===null?'Geen data':`${fmt(sm,2)} V`);set('ms8265StartMotorSub',sm===null?'Niet aangesloten / geen data':sm>=13.2?'Wordt geladen':'Startaccu motor');ring('ms8265StartMotor',approxLeadSoc(sm));missing('ms8265StartMotor',sm===null);
    set('ms8265StartHeck',sh===null?'Geen data':`${fmt(sh,2)} V`);set('ms8265StartHeckSub',sh===null?'Niet aangesloten / geen data':sh>=13.2?'Wordt geladen':'Startaccu heckschroef');ring('ms8265StartHeck',approxLeadSoc(sh));missing('ms8265StartHeck',sh===null);
    const sp=shore();set('ms8234Shore',sp===true?'Aangesloten':sp===false?'Niet aangesloten':'Geen data');set('ms8234ShoreSub',sp===true?'Walstroom actief':sp===false?'Geen walstroom':'Geen brondata');ring('ms8234Shore',sp===true?100:0);missing('ms8234Shore',sp===null);
    const c=climate();set('ms8234Cabin',c.salon===null?'Geen data':`${fmt(c.salon,1)} °C`);set('ms8234CabinSub',c.salon===null?'Ruuvi niet bereikbaar':'Ruuvi · Salon');ring('ms8234Cabin',c.salon===null?0:clamp(c.salon/40*100,0,100));missing('ms8234Cabin',c.salon===null);
    set('ms8264EngineTemp',c.machine===null?'Geen data':`${fmt(c.machine,1)} °C`);set('ms8264EngineTempSub',c.machine===null?'Ruuvi niet bereikbaar':'Ruuvi · Machinekamer');ring('ms8264EngineTemp',c.machine===null?0:clamp(c.machine/40*100,0,100));missing('ms8264EngineTemp',c.machine===null);
    const water=tank('water'),fuel=tank('fuel');set('ms8234Water',water===null?'Geen data':`${Math.round(water)}%`);set('ms8234WaterSub',water===null?'Geen tankdata':'Drinkwatertank');ring('ms8234Water',water);missing('ms8234Water',water===null);set('ms8234Fuel',fuel===null?'Geen data':`${Math.round(fuel)}%`);set('ms8234FuelSub',fuel===null?'Geen tankdata':'Dieseltank');ring('ms8234Fuel',fuel);missing('ms8234Fuel',fuel===null);
  }

  function syncRouteChrome(){
    const app=$('appView');if(!app||app.classList.contains('hidden'))return;
    const visible=[...app.querySelectorAll(':scope > section[id]')].find(s=>!s.classList.contains('hidden')&&s.getAttribute('aria-hidden')!=='true');
    const isStart=!visible||visible.id==='dashboard';
    document.body?.classList.toggle('ms8300-start-page',isStart);
    document.body?.classList.toggle('ms8300-sub-page',!isStart);
  }

  function init(){
    syncBuild();
    if(!build())return;
    applyTheme(readTheme());
    render();syncRouteChrome();
    [160,850].forEach(delay=>setTimeout(render,delay));
    setInterval(()=>{if(!document.hidden&&document.body?.classList.contains('ms8300-start-page'))render();},10000);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-vrm-updated','mijnserenity:vrm-energy-updated','mijnserenity:live-values-ready','weather:update','weather:updated','online','pageshow'].forEach(name=>window.addEventListener(name,render,{passive:true}));
    window.addEventListener('mijnserenity:routechange',()=>requestAnimationFrame(syncRouteChrome),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();syncRouteChrome();}},{passive:true});
    window.ms8300RefreshStart=()=>{build();render();syncRouteChrome();return true;};
    window.ms8210RefreshStart=window.ms8300RefreshStart;
    window.dispatchEvent(new CustomEvent('mijnserenity:start-runtime-ready',{detail:{build:BUILD,canonical:true}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();