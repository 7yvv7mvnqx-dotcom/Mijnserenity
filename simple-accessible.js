/* MijnSerenity 7.5.2 — eenvoudige en toegankelijke bediening */
(()=>{
  'use strict';

  const BUILD='7.5.2';
  const SIMPLE_KEY='ms750-simple-ui';
  const LARGE_TEXT_KEY='ms750-large-text';
  const EXPANDED_KEY='ms750-dashboard-expanded';

  const PAGE_META={
    dashboard:{title:'MijnSerenity',icon:'🏠'},
    live:{title:'Varen',icon:'⛵'},
    map:{title:'Kaart',icon:'🗺️'},
    logbook:{title:'Logboek',icon:'📖'},
    ais:{title:'AIS',icon:'📡'},
    weather:{title:'Weer',icon:'☀️'},
    planner:{title:'Reisplanner',icon:'🧭'},
    entertainment:{title:'Home Assistant',icon:'🏡'},
    technical:{title:'Techniek',icon:'⚙️'},
    pois:{title:'POI’s',icon:'📍'},
    costs:{title:'Kosten',icon:'🧾'},
    finance:{title:'Financieel',icon:'💶'},
    settings:{title:'Instellingen',icon:'🚤'},
    boat:{title:'Boot en delen',icon:'👥'}
  };

  const PRIMARY_ROUTES=new Set(['dashboard','live','map','logbook']);
  let currentRoute='dashboard';
  let originalCaptainNavigate=null;
  let moreLayer=null;
  let pageTitle=null;
  let homeButton=null;
  let autoObserver=null;
  let moreReturnFocus=null;
  let welcomePhotoObserver=null;
  let greetingTimer=0;

  function storedBoolean(key,fallback){
    try{
      const value=localStorage.getItem(key);
      if(value===null)return fallback;
      return value==='1'||value==='true';
    }catch(_error){
      return fallback;
    }
  }

  function storeBoolean(key,value){
    try{localStorage.setItem(key,value?'1':'0');}catch(_error){}
  }

  function escapeHtml(value){
    return String(value??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function buildSkipLink(){
    if(document.querySelector('.ms750-skip-link'))return;
    const link=document.createElement('a');
    link.className='ms750-skip-link';
    link.href='#ms750PageTitle';
    link.textContent='Ga direct naar de pagina';
    document.body.prepend(link);
  }

  function buildPageBar(){
    const app=document.getElementById('appView');
    if(!app||document.getElementById('ms750PageBar'))return;

    const bar=document.createElement('div');
    bar.id='ms750PageBar';
    bar.className='ms750-pagebar';
    bar.innerHTML=`
      <button type="button" class="ms750-home-button" aria-label="Terug naar start" title="Terug naar start">← <span>Start</span></button>
      <h1 id="ms750PageTitle" tabindex="-1">MijnSerenity</h1>
      <button type="button" class="ms750-more-button" aria-label="Meer onderdelen openen" title="Meer onderdelen">☰ <span>Meer</span></button>
    `;
    app.insertBefore(bar,app.firstChild);
    pageTitle=bar.querySelector('#ms750PageTitle');
    homeButton=bar.querySelector('.ms750-home-button');
    homeButton.addEventListener('click',()=>navigate('dashboard'));
    bar.querySelector('.ms750-more-button').addEventListener('click',openMore);
  }

  function primaryButton(route,icon,title,subtitle,className=''){
    return `
      <button type="button" class="ms750-primary-action ${className}" data-ms750-route="${escapeHtml(route)}">
        <span class="ms750-action-icon" aria-hidden="true">${icon}</span>
        <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span>
      </button>
    `;
  }

  function personalGreetingText(){
    if(typeof window.captainGreetingText==='function'){
      try{return window.captainGreetingText();}catch(_error){}
    }
    const hour=new Date().getHours();
    const part=hour<12?'Goedemorgen':hour<18?'Goedemiddag':'Goedenavond';
    let name='Michel';
    if(typeof window.getLoggedInFirstName==='function'){
      try{name=window.getLoggedInFirstName()||name;}catch(_error){}
    }
    return `${part}, ${name}`;
  }

  function syncPersonalWelcome(){
    const greeting=document.getElementById('ms751Greeting');
    if(greeting)greeting.textContent=personalGreetingText();

    const source=document.getElementById('dashboardBoatPhoto');
    const target=document.getElementById('ms751WelcomePhoto');
    const fallback=document.getElementById('ms751WelcomeFallback');
    if(!target||!fallback)return;

    const usable=Boolean(
      source?.src&&
      !source.classList.contains('hidden')&&
      source.complete&&
      source.naturalWidth>0
    );

    if(usable){
      if(target.src!==source.src)target.src=source.src;
      target.classList.remove('hidden');
      fallback.classList.add('hidden');
    }else{
      target.removeAttribute('src');
      target.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }

  function observePersonalWelcome(){
    const source=document.getElementById('dashboardBoatPhoto');
    if(source){
      source.addEventListener('load',syncPersonalWelcome);
      source.addEventListener('error',syncPersonalWelcome);
      welcomePhotoObserver?.disconnect();
      welcomePhotoObserver=new MutationObserver(syncPersonalWelcome);
      welcomePhotoObserver.observe(source,{
        attributes:true,
        attributeFilter:['src','class','data-storage-path']
      });
    }

    [0,250,800,1800,4000].forEach(delay=>setTimeout(syncPersonalWelcome,delay));
    clearInterval(greetingTimer);
    greetingTimer=setInterval(syncPersonalWelcome,60*1000);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')syncPersonalWelcome();
    });
    window.addEventListener('pageshow',syncPersonalWelcome,{passive:true});
  }

  function buildSimpleDashboard(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard||document.getElementById('ms750SimpleDashboard'))return;

    const section=document.createElement('section');
    section.id='ms750SimpleDashboard';
    section.className='ms750-simple-dashboard';
    section.setAttribute('aria-label','Snelle bediening');
    section.innerHTML=`
      <div class="ms750-welcome-card ms751-photo-welcome" aria-label="Persoonlijke begroeting">
        <img id="ms751WelcomePhoto" class="ms751-welcome-photo hidden" alt="Serenity">
        <div id="ms751WelcomeFallback" class="ms751-welcome-fallback" aria-hidden="true">🚤</div>
        <div class="ms751-welcome-shade" aria-hidden="true"></div>
        <div class="ms751-welcome-copy">
          <h2 id="ms751Greeting">Welkom aan boord</h2>
          <p>Fijn dat je er bent. Wat gaan we vandaag met Serenity doen?</p>
        </div>
      </div>

      <div class="ms750-auto-card">
        <div>
          <strong>Automatisch varen</strong>
          <small id="ms750AutoStatus">Status wordt gecontroleerd…</small>
        </div>
        <button id="ms750AutoButton" type="button" class="ms750-auto-button" aria-pressed="false">Uit</button>
      </div>

      <div class="ms750-primary-grid">
        ${primaryButton('live','⛵','Start varen','GPS, snelheid en route','ms750-start-action')}
        ${primaryButton('waterkaarten','🗺️','Waterkaarten','Route kiezen of maken')}
        ${primaryButton('map','📍','Kaart','Positie en locaties')}
        ${primaryButton('logbook','📖','Logboek','Vaartochten bekijken')}
        ${primaryButton('costs','🧾','Kosten','Bon of factuur toevoegen')}
        ${primaryButton('weather','☀️','Weer','Verwachting en waarschuwingen')}
      </div>
    `;

    const reference=dashboard.querySelector('.captain-strip')||dashboard.firstChild;
    dashboard.insertBefore(section,reference);

    section.addEventListener('click',event=>{
      const button=event.target.closest('[data-ms750-route]');
      if(!button)return;
      const route=button.dataset.ms750Route;
      if(route==='waterkaarten'){
        if(typeof window.openWaterkaarten==='function')window.openWaterkaarten();
        return;
      }
      navigate(route);
    });

    section.querySelector('#ms750AutoButton')?.addEventListener('click',toggleAutomaticVaren);
    syncAutomaticVaren();
    observePersonalWelcome();
  }

  function moreRoute(route){
    const meta=PAGE_META[route];
    if(!meta)return'';
    return `
      <button type="button" class="ms750-more-route" data-ms750-route="${route}">
        <span aria-hidden="true">${meta.icon}</span><strong>${escapeHtml(meta.title)}</strong>
      </button>
    `;
  }

  function buildMoreLayer(){
    if(document.getElementById('ms750MoreLayer'))return;
    const layer=document.createElement('div');
    layer.id='ms750MoreLayer';
    layer.className='ms750-more-layer hidden';
    layer.setAttribute('role','dialog');
    layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-labelledby','ms750MoreTitle');
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=`
      <div class="ms750-more-panel" role="document">
        <div class="ms750-more-head">
          <h2 id="ms750MoreTitle">Alle onderdelen</h2>
          <button type="button" class="ms750-close-more" aria-label="Menu sluiten">×</button>
        </div>
        <div class="ms750-more-grid">
          ${moreRoute('ais')}
          ${moreRoute('weather')}
          ${moreRoute('planner')}
          ${moreRoute('pois')}
          ${moreRoute('technical')}
          ${moreRoute('entertainment')}
          ${moreRoute('costs')}
          ${moreRoute('finance')}
          ${moreRoute('settings')}
          ${moreRoute('boat')}
        </div>
        <div class="ms750-more-settings">
          <button type="button" id="ms750TextSizeButton">Tekstgrootte: groot</button>
          <button type="button" id="ms750DashboardModeButton">Toon uitgebreid dashboard</button>
        </div>
      </div>
    `;
    document.body.appendChild(layer);
    moreLayer=layer;

    layer.addEventListener('click',event=>{
      if(event.target===layer||event.target.closest('.ms750-close-more')){
        closeMore();
        return;
      }
      const routeButton=event.target.closest('[data-ms750-route]');
      if(routeButton)navigate(routeButton.dataset.ms750Route);
    });
    layer.querySelector('#ms750TextSizeButton')?.addEventListener('click',toggleTextSize);
    layer.querySelector('#ms750DashboardModeButton')?.addEventListener('click',toggleDashboardMode);
    updatePreferenceButtons();
  }

  function rebuildBottomNavigation(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    nav.setAttribute('aria-label','Hoofdnavigatie');
    nav.innerHTML=`
      <button type="button" class="bottom-nav-item active" data-target="dashboard" aria-label="Start"><span aria-hidden="true">🏠</span><small>Start</small></button>
      <button type="button" class="bottom-nav-item" data-target="live" aria-label="Varen"><span aria-hidden="true">⛵</span><small>Varen</small></button>
      <button type="button" class="bottom-nav-item" data-target="map" aria-label="Kaart"><span aria-hidden="true">🗺️</span><small>Kaart</small></button>
      <button type="button" class="bottom-nav-item" data-target="logbook" aria-label="Logboek"><span aria-hidden="true">📖</span><small>Logboek</small></button>
      <button type="button" class="bottom-nav-item" data-target="more" aria-label="Meer onderdelen"><span aria-hidden="true">☰</span><small>Meer</small></button>
    `;
    nav.addEventListener('click',event=>{
      const button=event.target.closest('.bottom-nav-item');
      if(!button)return;
      if(button.dataset.target==='more')openMore();
      else navigate(button.dataset.target,button);
    });
  }

  function syncNavigation(route){
    const secondary=!PRIMARY_ROUTES.has(route);
    document.querySelectorAll('.bottom-nav-item').forEach(button=>{
      const active=secondary
        ? button.dataset.target==='more'
        : button.dataset.target===route;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }

  function updatePageBar(route){
    const meta=PAGE_META[route]||{title:'MijnSerenity'};
    if(pageTitle)pageTitle.textContent=meta.title;
    if(homeButton){
      const placeholder=route==='dashboard';
      homeButton.classList.toggle('is-placeholder',placeholder);
      homeButton.tabIndex=placeholder?-1:0;
      homeButton.setAttribute('aria-hidden',String(placeholder));
    }
    document.title=`${meta.title} · MijnSerenity`;
    syncNavigation(route);
  }

  function afterNavigate(route){
    currentRoute=PAGE_META[route]?route:'dashboard';
    updatePageBar(currentRoute);
    closeMore(false);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }

  function wrapNavigation(){
    if(typeof window.captainNavigate!=='function'||window.captainNavigate.__ms750Wrapped)return;
    originalCaptainNavigate=window.captainNavigate;
    const wrapped=function(route,sourceButton=null){
      const result=originalCaptainNavigate(route,sourceButton);
      afterNavigate(route);
      return result;
    };
    wrapped.__ms750Wrapped=true;
    window.captainNavigate=wrapped;
  }

  function navigate(route,sourceButton=null){
    if(route==='boat'&&typeof window.isAppAdmin==='function'&&!window.isAppAdmin()){
      route='settings';
    }
    if(typeof window.captainNavigate==='function'){
      window.captainNavigate(route,sourceButton);
    }
  }

  function openMore(){
    if(!moreLayer)buildMoreLayer();
    moreReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    moreLayer?.classList.remove('hidden');
    moreLayer?.setAttribute('aria-hidden','false');
    document.body.classList.add('ms750-more-open');
    document.querySelector('.bottom-nav-item[data-target="more"]')?.classList.add('active');
    requestAnimationFrame(()=>moreLayer?.querySelector('.ms750-close-more')?.focus());
  }

  function closeMore(restoreFocus=true){
    if(!moreLayer||moreLayer.classList.contains('hidden'))return;
    moreLayer.classList.add('hidden');
    moreLayer.setAttribute('aria-hidden','true');
    document.body.classList.remove('ms750-more-open');
    syncNavigation(currentRoute);
    if(restoreFocus){
      const target=moreReturnFocus?.isConnected
        ?moreReturnFocus
        :document.querySelector('.bottom-nav-item[data-target="more"]');
      target?.focus?.();
    }
    moreReturnFocus=null;
  }

  function toggleTextSize(){
    const large=!document.body.classList.contains('ms750-large-text');
    document.body.classList.toggle('ms750-large-text',large);
    storeBoolean(LARGE_TEXT_KEY,large);
    updatePreferenceButtons();
  }

  function toggleDashboardMode(){
    const expanded=!document.body.classList.contains('ms750-dashboard-expanded');
    document.body.classList.toggle('ms750-dashboard-expanded',expanded);
    storeBoolean(EXPANDED_KEY,expanded);
    updatePreferenceButtons();
    if(currentRoute==='dashboard')window.scrollTo({top:0,left:0,behavior:'smooth'});
  }

  function updatePreferenceButtons(){
    const textButton=document.getElementById('ms750TextSizeButton');
    const dashboardButton=document.getElementById('ms750DashboardModeButton');
    if(textButton){
      textButton.textContent=document.body.classList.contains('ms750-large-text')
        ?'Tekstgrootte: groot'
        :'Tekstgrootte: normaal';
    }
    if(dashboardButton){
      dashboardButton.textContent=document.body.classList.contains('ms750-dashboard-expanded')
        ?'Verberg uitgebreid dashboard'
        :'Toon uitgebreid dashboard';
    }
  }

  function automaticToggle(){
    return document.getElementById('ms701AutoToggle');
  }

  function syncAutomaticVaren(){
    const source=automaticToggle();
    const button=document.getElementById('ms750AutoButton');
    const status=document.getElementById('ms750AutoStatus');
    if(!button||!status)return;
    const enabled=Boolean(source?.checked);
    button.textContent=enabled?'Aan':'Uit';
    button.classList.toggle('is-on',enabled);
    button.setAttribute('aria-pressed',String(enabled));
    const detail=document.getElementById('ms701DepartureStatus')?.textContent?.trim();
    status.textContent=enabled
      ?(detail||'MijnSerenity wacht automatisch op vertrek.')
      :'Tik op Aan om een vaartocht automatisch te registreren.';
  }

  function toggleAutomaticVaren(){
    const source=automaticToggle();
    if(!source){
      navigate('dashboard');
      return;
    }
    source.checked=!source.checked;
    source.dispatchEvent(new Event('change',{bubbles:true}));
    syncAutomaticVaren();
  }

  function observeAutomaticVaren(){
    const source=automaticToggle();
    if(source)source.addEventListener('change',syncAutomaticVaren);
    const detail=document.getElementById('ms701DepartureStatus');
    if(detail&&'MutationObserver' in window){
      autoObserver?.disconnect();
      autoObserver=new MutationObserver(syncAutomaticVaren);
      autoObserver.observe(detail,{childList:true,subtree:true,characterData:true});
    }
  }

  function applyPreferences(){
    document.body.classList.add('ms750-simple-ui');
    document.body.classList.toggle('ms750-large-text',storedBoolean(LARGE_TEXT_KEY,true));
    document.body.classList.toggle('ms750-dashboard-expanded',storedBoolean(EXPANDED_KEY,false));
    storeBoolean(SIMPLE_KEY,true);
  }

  function handleKeyboard(event){
    const open=moreLayer&&!moreLayer.classList.contains('hidden');
    if(event.key==='Escape'&&open){
      event.preventDefault();
      closeMore();
      return;
    }
    if(event.key!=='Tab'||!open)return;
    const focusable=[...moreLayer.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(element=>!element.disabled&&element.getClientRects().length>0);
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  }

  function initialise(){
    applyPreferences();
    buildSkipLink();
    buildPageBar();
    buildSimpleDashboard();
    buildMoreLayer();
    rebuildBottomNavigation();
    wrapNavigation();
    observeAutomaticVaren();
    afterNavigate('dashboard');
    document.addEventListener('keydown',handleKeyboard);
    console.info(`MijnSerenity ${BUILD}: eenvoudige bediening actief.`);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }
})();
