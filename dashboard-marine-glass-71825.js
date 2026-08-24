/* MijnSerenity 7.18.26 — Marine Glass met werkende navigatie en live HA/Cerbo data */
(()=>{
  'use strict';
  if(window.__msMarineGlass71826)return;
  window.__msMarineGlass71826=true;

  const BUILD='7.18.26';
  const EMPTY='—';
  const $=id=>document.getElementById(id);
  let syncFrame=0;
  let lastRefresh=0;
  let observer=null;

  function toast(message){
    if(typeof window.showAppToast==='function')window.showAppToast(message);
  }

  function clean(value){
    const text=String(value??'').trim();
    if(!text||/^(?:-|–|—)(?:\s*(?:%|v|a|w|m|°c|kn|rpm))?$/i.test(text))return '';
    return text;
  }

  function set(id,value){
    const el=$(id);
    if(!el)return;
    const next=clean(value)||EMPTY;
    if(el.textContent!==next)el.textContent=next;
  }

  function text(id){return clean($(id)?.textContent)}

  function go(page){
    try{
      const nav=[...document.querySelectorAll(`.bottom-nav [data-target="${page}"], #appView>.tabs [data-target="${page}"]`)]
        .find(el=>!el.closest('#msMarineDashboard')&&!el.closest('#msIntegratedDashboard'));
      if(nav){nav.click();return true;}
      if(typeof window.captainNavigate==='function'){window.captainNavigate(page);return true;}
      if(typeof window.ms708GoToPage==='function'){window.ms708GoToPage(page,true);return true;}
    }catch(error){console.warn('Marine Glass navigatie:',error);}
    return false;
  }

  function home(){
    const nav=document.querySelector('.bottom-nav [data-target="dashboard"]');
    if(nav){nav.click();return;}
    if(!go('dashboard'))window.scrollTo({top:0,behavior:'smooth'});
  }

  function legacyControl(key){
    try{
      const legacy=$('msIntegratedDashboard');
      const control=legacy?.querySelector(`[data-control="${key}"]`);
      if(control){control.click();return true;}
    }catch(error){console.warn('Marine Glass bediening:',error);}
    return false;
  }

  function setTab(root,targetId){
    root.querySelectorAll('.mg-tab').forEach(button=>button.classList.toggle('active',button.dataset.target===targetId));
  }

  function scrollSection(root,targetId){
    const target=$(targetId);
    if(!target)return;
    setTab(root,targetId);
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function discoverSerenityImage(root){
    const explicit=window.MIJSERENITY_HERO_IMAGE;
    if(typeof explicit==='string'&&explicit.trim()){
      const hero=root.querySelector('.mg-hero');
      hero?.style.setProperty('background-image',`linear-gradient(180deg,rgba(2,10,18,.10),rgba(2,10,18,.76)),url("${explicit.replace(/"/g,'\\"')}")`);
      hero?.style.setProperty('background-size','cover');
      hero?.style.setProperty('background-position','center');
      return;
    }
    const candidate=[...document.images].find(img=>img.closest('#msMarineDashboard')===null&&/serenity|boot|boat/i.test(`${img.alt||''} ${img.title||''} ${img.dataset?.role||''}`)&&img.currentSrc);
    if(candidate?.currentSrc){
      const hero=root.querySelector('.mg-hero');
      hero?.style.setProperty('background-image',`linear-gradient(180deg,rgba(2,10,18,.12),rgba(2,10,18,.78)),url("${candidate.currentSrc.replace(/"/g,'\\"')}")`);
      hero?.style.setProperty('background-size','cover');
      hero?.style.setProperty('background-position','center');
    }
  }

  function stateSnapshot(){
    try{
      const list=typeof window.ms730GetStateSnapshot==='function'?window.ms730GetStateSnapshot():[];
      return Array.isArray(list)?list:[];
    }catch{return [];}
  }

  function entityLabel(entity){
    return `${entity?.entity_id||''} ${entity?.name||''} ${entity?.attributes?.friendly_name||''}`.toLowerCase();
  }

  function findEntity(pattern,domains=[]){
    return stateSnapshot().find(entity=>{
      const domain=entity?.domain||String(entity?.entity_id||'').split('.')[0];
      return (!domains.length||domains.includes(domain))&&pattern.test(entityLabel(entity));
    })||null;
  }

  function entityDisplay(pattern,domains=[]){
    const entity=findEntity(pattern,domains);
    if(!entity)return '';
    const state=String(entity.state??'').trim();
    if(!state||['unknown','unavailable','none','null'].includes(state.toLowerCase()))return '';
    const unit=String(entity?.attributes?.unit_of_measurement||'').trim();
    return `${state}${unit?` ${unit}`:''}`;
  }

  function binaryDisplay(pattern){
    const entity=findEntity(pattern,['binary_sensor','sensor']);
    if(!entity)return '';
    const state=String(entity.state||'').trim().toLowerCase();
    if(['on','true','1','aan','detected','active','occupied'].includes(state))return 'Beweging';
    if(['off','false','0','uit','clear','inactive','not_occupied'].includes(state))return 'Rustig';
    return clean(entity.state);
  }

  function combine(...parts){return parts.map(clean).filter(Boolean).join(' · ')}

  function mirrorIntegrated(){
    const speed=combine(text('msiSpeed'),text('msiSpeedUnit'));
    const depth=text('msiDepth');
    const rpm=text('msiRpm');
    const voltage=text('msiHouseV');
    const heading=combine(text('msiHeading'),text('msiHeadingDir'));

    set('mgSpeed',speed);
    set('mgDepth',depth);
    set('mgRpm',rpm);
    set('mgHouseVoltage',voltage);
    set('mgStart1',text('msiStart1'));
    set('mgStart2',text('msiStart2'));
    set('mgHeading',heading);
    set('mgRoute',text('msiRouteStatus'));

    set('mgHouseSoc',text('msiSoc'));
    set('mgSolar',text('msiTopSolar'));
    set('mgShore',text('msiTopShore'));
    set('mgWater',text('msiWater'));
    set('mgFuel',text('msiFuel'));
    set('mgWaste',text('msiWaste'));

    set('mgMachine',combine(text('msiMachineTemp'),text('msiMachineHum')));
    set('mgSalon',combine(text('msiSalonTemp'),text('msiSalonHum')));

    set('mgRudder',entityDisplay(/roerstand|rudder.*angle|rudder/i,['sensor']));
    set('mgMotion',binaryDisplay(/beweging|motion|pir|presence|occupancy/i));
    set('mgPersons',entityDisplay(/personen.*boord|aan.*boord.*personen|people.*aboard|onboard.*people|person.*count/i,['sensor','input_number']));

    const inverter=text('msiInvState');
    const charger=text('msiChargerState');
    const light=text('msiLightState');
    set('mgControlInverterState',inverter);
    set('mgControlChargerState',charger);
    set('mgControlLightState',light);

    const controlPairs=[
      ['mgControlInverter',inverter],
      ['mgControlCharger',charger],
      ['mgControlLight',light]
    ];
    controlPairs.forEach(([id,state])=>{
      const button=$(id);if(!button)return;
      button.classList.toggle('on',/^(?:aan|on)$/i.test(state));
    });

    const hasLive=Boolean(speed||depth||voltage||text('msiSoc')||stateSnapshot().length);
    const status=$('mgLiveStatus');
    if(status){
      status.classList.toggle('live',hasLive);
      const label=status.querySelector('b');
      if(label)label.textContent=hasLive?'LIVE':'WACHT OP DATA';
    }
  }

  function queueSync(){
    if(syncFrame)return;
    syncFrame=requestAnimationFrame(()=>{syncFrame=0;mirrorIntegrated();});
  }

  async function refreshLive(force=false){
    if(!force&&Date.now()-lastRefresh<5000){queueSync();return;}
    lastRefresh=Date.now();
    try{
      if(typeof window.ms71820RefreshDashboard==='function')await window.ms71820RefreshDashboard();
      else if(typeof window.ms730RefreshStateSnapshot==='function')await window.ms730RefreshStateSnapshot();
    }catch(error){console.warn('Marine Glass live refresh:',error);}
    setTimeout(queueSync,80);
    setTimeout(queueSync,500);
  }

  function bindButtonActions(root){
    root.querySelectorAll('.mg-tab[data-target]').forEach(button=>{
      button.onclick=event=>{event.preventDefault();event.stopPropagation();scrollSection(root,button.dataset.target);};
    });
    root.querySelectorAll('[data-go]').forEach(button=>{
      button.onclick=event=>{
        event.preventDefault();event.stopPropagation();
        const page=button.dataset.go;
        if(page==='dashboard'){home();return;}
        if(!go(page))toast('Dit onderdeel kon niet worden geopend.');
      };
    });
    root.querySelectorAll('[data-control]').forEach(button=>{
      button.onclick=event=>{
        event.preventDefault();event.stopPropagation();
        const key=button.dataset.control;
        if(!legacyControl(key)){
          if(!go('entertainment'))toast('Home Assistant bediening is nog niet beschikbaar.');
        }
      };
    });
  }

  function observeBackend(){
    observer?.disconnect();
    const backend=$('msIntegratedDashboard');
    if(!backend)return;
    observer=new MutationObserver(queueSync);
    observer.observe(backend,{subtree:true,childList:true,characterData:true,attributes:true});
  }

  function build(){
    const host=$('dashboard');
    if(!host)return false;
    if($('msMarineDashboard')){queueSync();return true;}

    const root=document.createElement('section');
    root.id='msMarineDashboard';
    root.setAttribute('aria-label','MijnSerenity Marine Glass dashboard');
    root.style.setProperty('position','relative','important');
    root.style.setProperty('z-index','20','important');
    root.style.setProperty('pointer-events','auto','important');
    root.innerHTML=`
      <header class="mg-head">
        <button class="mg-brand" type="button" data-go="dashboard" aria-label="MijnSerenity home">Mijn<span>Serenity</span></button>
        <div class="mg-head-actions">
          <span id="mgLiveStatus" class="mg-status-dot"><i></i><b>SERENITY</b></span>
          <button class="mg-icon-btn" type="button" data-go="settings" aria-label="Instellingen">☰</button>
        </div>
      </header>

      <section class="mg-hero" aria-label="Serenity">
        <div class="mg-hero-copy">
          <span class="mg-kicker">MIJN SERENITY</span>
          <h1>Welkom aan boord</h1>
          <p>Cockpit, energie en boordsystemen in één rustig overzicht.</p>
        </div>
      </section>

      <nav class="mg-tabs" aria-label="Dashboard onderdelen">
        <button class="mg-tab active" type="button" data-target="mg-home">Home</button>
        <button class="mg-tab" type="button" data-target="mg-cockpit">Cockpit</button>
        <button class="mg-tab" type="button" data-target="mg-tech">Techniek</button>
        <button class="mg-tab" type="button" data-target="mg-board">Boord</button>
      </nav>

      <main>
        <section id="mg-home" class="mg-section">
          <div class="mg-section-head"><h2>Varen & energie</h2><p>live overzicht</p></div>
          <div class="mg-metric-grid">
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Snelheid</b><i class="mg-metric-icon">⌁</i></span>
              <strong id="mgSpeed" class="mg-value">${EMPTY}</strong><small class="mg-sub">Live varen</small>
            </button>
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Diepte</b><i class="mg-metric-icon">≋</i></span>
              <strong id="mgDepth" class="mg-value">${EMPTY}</strong><small class="mg-sub">Dieptemeter</small>
            </button>
            <button class="mg-metric" type="button" data-go="live">
              <span class="mg-metric-top"><b>Toerental</b><i class="mg-metric-icon">◴</i></span>
              <strong id="mgRpm" class="mg-value">${EMPTY}</strong><small class="mg-sub">Motor</small>
            </button>
            <button class="mg-metric" type="button" data-go="technical">
              <span class="mg-metric-top"><b>Accuspanning</b><i class="mg-metric-icon">⚡</i></span>
              <strong id="mgHouseVoltage" class="mg-value">${EMPTY}</strong><small class="mg-sub">Huishoudaccu</small>
            </button>
          </div>
        </section>

        <section class="mg-section mg-panel" aria-label="Startaccu's">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>▰</i><h3>STARTACCU'S</h3></div>
            <button class="mg-link" type="button" data-go="technical">Details ›</button>
          </div>
          <div class="mg-start-grid">
            <button class="mg-mini" type="button" data-go="technical"><small>Startaccu 1</small><strong id="mgStart1">${EMPTY}</strong></button>
            <button class="mg-mini" type="button" data-go="technical"><small>Startaccu 2</small><strong id="mgStart2">${EMPTY}</strong></button>
          </div>
        </section>

        <section id="mg-cockpit" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>◉</i><h3>COCKPIT</h3></div>
            <button class="mg-link" type="button" data-go="live">Live openen ›</button>
          </div>
          <div class="mg-cockpit-body">
            <div class="mg-cockpit-stage">
              <div class="mg-cockpit-readouts">
                <button class="mg-readout" type="button" data-go="live"><small>Koers</small><strong id="mgHeading">${EMPTY}</strong></button>
                <button class="mg-readout" type="button" data-go="live"><small>Roerstand</small><strong id="mgRudder">${EMPTY}</strong></button>
                <button class="mg-readout" type="button" data-go="planner"><small>Route</small><strong id="mgRoute">${EMPTY}</strong></button>
              </div>
              <div class="mg-action-row">
                <button class="mg-action" type="button" data-go="live">Open live cockpit</button>
                <button class="mg-action secondary" type="button" data-go="planner">Route plannen</button>
              </div>
            </div>
          </div>
        </section>

        <section id="mg-tech" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>⚡</i><h3>TECHNIEK</h3></div>
            <button class="mg-link" type="button" data-go="technical">Alles bekijken ›</button>
          </div>
          <div class="mg-tech-grid">
            <button class="mg-tech-item" type="button" data-go="technical"><small>Huishoudaccu</small><strong id="mgHouseSoc">${EMPTY}</strong><span>▣</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Zonnepaneel</small><strong id="mgSolar">${EMPTY}</strong><span>☀</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Walstroom</small><strong id="mgShore">${EMPTY}</strong><span>⌁</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Drinkwater</small><strong id="mgWater">${EMPTY}</strong><span>💧</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Brandstof</small><strong id="mgFuel">${EMPTY}</strong><span>⛽</span></button>
            <button class="mg-tech-item" type="button" data-go="technical"><small>Zwartwater</small><strong id="mgWaste">${EMPTY}</strong><span>◈</span></button>
          </div>
          <div class="mg-controls" aria-label="Bediening">
            <button id="mgControlInverter" class="mg-control" type="button" data-control="inverter"><span>Omvormer</span><b id="mgControlInverterState">${EMPTY}</b></button>
            <button id="mgControlCharger" class="mg-control" type="button" data-control="charger"><span>Lader</span><b id="mgControlChargerState">${EMPTY}</b></button>
            <button id="mgControlLight" class="mg-control" type="button" data-control="light"><span>Verlichting</span><b id="mgControlLightState">${EMPTY}</b></button>
          </div>
        </section>

        <section id="mg-board" class="mg-section mg-panel">
          <div class="mg-panel-head">
            <div class="mg-panel-title"><i>⌂</i><h3>AAN BOORD</h3></div>
            <button class="mg-link" type="button" data-go="technical">Sensoren ›</button>
          </div>
          <div class="mg-board-grid">
            <button class="mg-board-item" type="button" data-go="technical"><small>Machinekamer</small><strong id="mgMachine">${EMPTY}</strong><span>🌡</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Salon</small><strong id="mgSalon">${EMPTY}</strong><span>🌡</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Beweging</small><strong id="mgMotion">${EMPTY}</strong><span>◌</span></button>
            <button class="mg-board-item" type="button" data-go="technical"><small>Personen aan boord</small><strong id="mgPersons">${EMPTY}</strong><span>♙</span></button>
          </div>
        </section>
      </main>

      <footer class="mg-foot">MijnSerenity ${BUILD} · Marine Glass · live gekoppeld</footer>`;

    root.querySelectorAll('button').forEach(button=>{
      button.style.setProperty('pointer-events','auto','important');
      button.style.touchAction='manipulation';
    });

    host.prepend(root);
    host.classList.add('mg-71825-active');
    discoverSerenityImage(root);
    bindButtonActions(root);
    observeBackend();
    queueSync();
    refreshLive(true);

    if('IntersectionObserver' in window){
      const sectionObserver=new IntersectionObserver(entries=>{
        const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(visible)setTab(root,visible.target.id);
      },{root:null,rootMargin:'-70px 0px -55% 0px',threshold:[.05,.2,.5]});
      ['mg-home','mg-cockpit','mg-tech','mg-board'].forEach(id=>{const el=$(id);if(el)sectionObserver.observe(el);});
    }

    window.dispatchEvent(new CustomEvent('mijnserenity:marine-glass-ready',{detail:{build:BUILD,valuesVisible:true}}));
    return true;
  }

  function install(){
    if(!build()){
      let tries=0;
      const timer=setInterval(()=>{
        tries+=1;
        if(build()||tries>50)clearInterval(timer);
      },100);
    }

    const events=['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated','mijnserenity-ruuvi-config-updated','mijnserenity:routechange','mijnserenity:modules-ready','mijnserenity:marine-glass-ready'];
    events.forEach(name=>window.addEventListener(name,()=>{observeBackend();queueSync();},{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){observeBackend();refreshLive(true);queueSync();}},{passive:true});
    window.addEventListener('online',()=>refreshLive(true),{passive:true});
    setInterval(()=>{if(!document.hidden)queueSync();},1000);
    setInterval(()=>{if(!document.hidden)refreshLive();},30000);
  }

  window.ms71826RefreshMarineGlass=()=>refreshLive(true);
  window.ms71825BuildMarineGlass=build;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
