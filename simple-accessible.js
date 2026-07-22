/* MijnSerenity 7.5.7 — eenvoudige en toegankelijke bediening */
(()=>{
  'use strict';

  const BUILD='7.5.7';
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
  let searchLayer=null;
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
        ${primaryButton('search','🔎','Zoeken','Zoek in alles op MijnSerenity')}
        ${primaryButton('entertainment','🏡','Home Assistant','Alles aan boord bedienen')}
        ${primaryButton('radio','📻','Radio','Sonos en favoriete zenders')}
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
      if(route==='search'){
        openSearch();
        return;
      }
      if(route==='radio'){
        openRadio();
        return;
      }
      navigate(route);
    });

    section.querySelector('#ms750AutoButton')?.addEventListener('click',toggleAutomaticVaren);
    syncAutomaticVaren();
    observePersonalWelcome();
  }

  const SEARCH_ROUTES=[
    {route:'dashboard',icon:'🏠',title:'Start',subtitle:'Persoonlijk overzicht',keywords:'home begin dashboard'},
    {route:'live',icon:'⛵',title:'Varen',subtitle:'GPS, snelheid en route',keywords:'live automatisch varen navigatie'},
    {route:'waterkaarten',icon:'🗺️',title:'Waterkaarten',subtitle:'Route kiezen of maken',keywords:'waterkaart route plannen'},
    {route:'map',icon:'📍',title:'Kaart',subtitle:'Positie, havens en POI’s',keywords:'kaart locatie gps poi haven'},
    {route:'logbook',icon:'📖',title:'Logboek',subtitle:'Vaartochten bekijken',keywords:'log route tocht geschiedenis'},
    {route:'ais',icon:'📡',title:'AIS',subtitle:'Boten in de omgeving',keywords:'schepen boten volgen ais'},
    {route:'weather',icon:'☀️',title:'Weer',subtitle:'Verwachting en waarschuwingen',keywords:'regen wind radar weer'},
    {route:'planner',icon:'🧭',title:'Reisplanner',subtitle:'Route en bootafmetingen',keywords:'reis route hoogte diepgang brug'},
    {route:'entertainment',icon:'🏡',title:'Home Assistant',subtitle:'Slimme apparaten bedienen',keywords:'home assistant ha ring hue sonos apple tv'},
    {route:'radio',icon:'📻',title:'Radio',subtitle:'Sonos en favoriete zenders',keywords:'radio muziek sonos zender favoriet'},
    {route:'technical',icon:'⚙️',title:'Techniek',subtitle:'Accu, motor en onderhoud',keywords:'techniek accu motor onderhoud storing'},
    {route:'pois',icon:'📍',title:'POI’s',subtitle:'Havens en favoriete locaties',keywords:'poi haven favorieten locatie'},
    {route:'costs',icon:'🧾',title:'Kosten',subtitle:'Bonnen en facturen',keywords:'kosten bon factuur uitgave'},
    {route:'finance',icon:'💶',title:'Financieel',subtitle:'Uitgaven en overzicht',keywords:'financieel geld totaal uitgaven'},
    {route:'settings',icon:'🚤',title:'Instellingen',subtitle:'Boot, app en koppelingen',keywords:'instellingen boot versie verversen'},
    {route:'boat',icon:'👥',title:'Boot en delen',subtitle:'Gebruikers en toegang',keywords:'delen account desiree gebruiker'}
  ];

  function searchMatch(haystack,terms){
    const value=String(haystack||'').toLowerCase();
    return terms.every(term=>value.includes(term));
  }

  function searchRouteButton(item){
    return `
      <button type="button" class="ms755-search-result" data-ms755-search-route="${escapeHtml(item.route)}">
        <span aria-hidden="true">${item.icon}</span>
        <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle)}</small></span>
        <b aria-hidden="true">›</b>
      </button>
    `;
  }

  function renderSearchResults(value=''){
    if(!searchLayer)return;
    const target=searchLayer.querySelector('#ms755SearchResults');
    if(!target)return;
    const query=String(value||'').trim().toLowerCase();
    const terms=query.split(/\s+/).filter(Boolean);

    const routes=SEARCH_ROUTES.filter(item=>
      !terms.length||searchMatch(`${item.title} ${item.subtitle} ${item.keywords}`,terms)
    ).slice(0,10);

    let dataItems=[];
    if(terms.length>=1&&typeof window.captainSearchItems==='function'){
      try{
        dataItems=window.captainSearchItems()
          .filter(item=>searchMatch(item.search,terms))
          .slice(0,10);
      }catch(error){
        console.warn('Zoekgegevens konden niet worden gelezen:',error);
      }
    }

    const routeHtml=routes.map(searchRouteButton).join('');
    const dataHtml=dataItems.map(item=>`
      <button type="button" class="ms755-search-result" data-ms755-search-type="${escapeHtml(item.type)}" data-ms755-search-id="${escapeHtml(item.id)}">
        <span aria-hidden="true">${item.icon||'🔎'}</span>
        <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle)}</small></span>
        <b aria-hidden="true">›</b>
      </button>
    `).join('');

    target.innerHTML=(routeHtml||dataHtml)
      ?`${routeHtml}${dataHtml}`
      :`<div class="ms755-search-empty">Geen resultaat voor “${escapeHtml(value)}”.</div>`;
  }

  function buildSearchLayer(){
    if(document.getElementById('ms755SearchLayer'))return;
    const layer=document.createElement('div');
    layer.id='ms755SearchLayer';
    layer.className='ms755-search-layer hidden';
    layer.setAttribute('role','dialog');
    layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-labelledby','ms755SearchTitle');
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=`
      <div class="ms755-search-panel" role="document">
        <div class="ms755-search-head">
          <div><small>MIJNSERENITY</small><h2 id="ms755SearchTitle">Zoek in alles</h2></div>
          <button type="button" class="ms755-search-close" aria-label="Zoeken sluiten">×</button>
        </div>
        <label class="ms755-search-input-wrap" for="ms755SearchInput">
          <span aria-hidden="true">🔎</span>
          <input id="ms755SearchInput" type="search" autocomplete="off" placeholder="Bijv. haven, factuur, route of Home Assistant">
        </label>
        <div id="ms755SearchResults" class="ms755-search-results" aria-live="polite"></div>
      </div>
    `;
    document.body.appendChild(layer);
    searchLayer=layer;
    const input=layer.querySelector('#ms755SearchInput');
    input?.addEventListener('input',()=>renderSearchResults(input.value));
    layer.addEventListener('click',event=>{
      if(event.target===layer||event.target.closest('.ms755-search-close')){
        closeSearch();
        return;
      }
      const routeButton=event.target.closest('[data-ms755-search-route]');
      if(routeButton){
        const route=routeButton.dataset.ms755SearchRoute;
        closeSearch(false);
        if(route==='waterkaarten')window.openWaterkaarten?.();
        else if(route==='radio')openRadio();
        else navigate(route);
        return;
      }
      const dataButton=event.target.closest('[data-ms755-search-type]');
      if(dataButton){
        closeSearch(false);
        window.openCaptainItem?.(dataButton.dataset.ms755SearchType,dataButton.dataset.ms755SearchId);
      }
    });
    renderSearchResults('');
  }

  function openSearch(){
    if(!searchLayer)buildSearchLayer();
    searchLayer?.classList.remove('hidden');
    searchLayer?.setAttribute('aria-hidden','false');
    document.body.classList.add('ms755-search-open');
    const input=searchLayer?.querySelector('#ms755SearchInput');
    if(input){
      input.value='';
      renderSearchResults('');
      requestAnimationFrame(()=>input.focus());
    }
  }

  function closeSearch(restoreFocus=true){
    if(!searchLayer||searchLayer.classList.contains('hidden'))return;
    searchLayer.classList.add('hidden');
    searchLayer.setAttribute('aria-hidden','true');
    document.body.classList.remove('ms755-search-open');
    if(restoreFocus)document.querySelector('[data-ms750-route="search"]')?.focus?.();
  }

  function openRadio(){
    navigate('entertainment');
    const reveal=()=>{
      const card=document.querySelector('#entertainment .sonos-control-card');
      card?.scrollIntoView({behavior:'smooth',block:'start'});
      card?.classList.add('ms755-radio-highlight');
      setTimeout(()=>card?.classList.remove('ms755-radio-highlight'),1800);
    };
    setTimeout(reveal,180);
  }

  function repositionCaptainQuestion(){
    const dashboard=document.getElementById('dashboard');
    const strip=dashboard?.querySelector(':scope > .captain-strip');
    const captainBox=dashboard?.querySelector('.ms690-captain-box');
    if(!dashboard||!strip||!captainBox)return;

    let slot=document.getElementById('ms755ExpandedCaptainSlot');
    if(!slot){
      slot=document.createElement('section');
      slot.id='ms755ExpandedCaptainSlot';
      slot.className='card ms755-expanded-captain-slot';
      slot.setAttribute('aria-label','Vraag het de Captain');
      strip.insertAdjacentElement('afterend',slot);
    }
    slot.appendChild(captainBox);
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

  function forceRouteVisible(route,runPageActions=false){
    const target=document.getElementById(route);
    if(!target)return false;

    const pager=document.getElementById('ms708NativePager');
    if(pager&&target.parentElement===pager){
      if(typeof window.ms708GoToPage==='function'){
        return window.ms708GoToPage(route,runPageActions)!==false;
      }
      if(typeof window.ms708ScrollToPage==='function'){
        return window.ms708ScrollToPage(route,false)!==false;
      }

      const pages=[...pager.querySelectorAll(':scope > section')];
      const index=pages.indexOf(target);
      if(index>=0){
        const left=index*Math.max(1,pager.clientWidth);
        pager.scrollTo({left,top:0,behavior:'auto'});
        pager.scrollLeft=left;
        return true;
      }
      return false;
    }

    document.querySelectorAll('#appView > section').forEach(section=>{
      section.classList.toggle('hidden',section!==target);
    });
    return true;
  }

  function navigate(route,sourceButton=null){
    if(route==='boat'&&typeof window.isAppAdmin==='function'&&!window.isAppAdmin()){
      route='settings';
    }

    /*
       Pagina's in de iPhone/iPad-pager gaan voortaan rechtstreeks en
       zonder animatie naar de gekozen pagina. Zo kunnen header, actieve
       knop en inhoud niet meer uit elkaar lopen.
    */
    if(typeof window.ms708GoToPage==='function'&&window.ms708GoToPage(route,true)){
      afterNavigate(route);
      requestAnimationFrame(()=>forceRouteVisible(route,false));
      return;
    }

    try{
      if(typeof window.captainNavigate==='function'){
        window.captainNavigate(route,sourceButton);
      }else{
        forceRouteVisible(route,true);
      }
    }catch(error){
      console.warn('Navigatie opnieuw uitgevoerd:',error);
      forceRouteVisible(route,true);
    }

    afterNavigate(route);
    window.setTimeout(()=>forceRouteVisible(route,false),40);
  }

  function clearLegacySinglePageLayout(){
    document.body.classList.remove('ms755-single-page-nav');
    const pager=document.getElementById('ms708NativePager');
    pager?.removeAttribute('data-ms755-active');
    document.querySelectorAll('#ms708NativePager > .ms708-native-page, #appView > section').forEach(page=>{
      page.classList.remove('ms755-route-active');
      page.style.removeProperty('display');
      page.style.removeProperty('width');
      page.style.removeProperty('min-width');
      page.removeAttribute('aria-hidden');
    });
  }

  function hardOpenStartPage(){
    const dashboard=document.getElementById('dashboard');
    if(!dashboard)return false;

    // Oude 7.5.6 één-pagina-instellingen kunnen Logboek en andere pagina's
    // onzichtbaar houden. 7.5.7 gebruikt weer één gedeelde pager-route voor
    // knoppen, veegbewegingen én automatisch openen na opslaan.
    clearLegacySinglePageLayout();

    let opened=false;
    if(typeof window.ms708GoToPage==='function'){
      try{opened=window.ms708GoToPage('dashboard',true)!==false;}catch(_error){}
    }
    if(!opened){
      opened=forceRouteVisible('dashboard',true);
    }

    currentRoute='dashboard';
    updatePageBar('dashboard');
    closeMore(false);
    dashboard.scrollTo?.({top:0,left:0,behavior:'auto'});
    window.scrollTo({top:0,left:0,behavior:'auto'});
    return opened;
  }

  function installReliableStartNavigation(){
    if(document.documentElement.dataset.ms756StartGuard==='true')return;
    document.documentElement.dataset.ms756StartGuard='true';

    const activate=event=>{
      const start=event.target.closest(
        '.ms750-home-button, .bottom-nav-item[data-target="dashboard"], [data-ms750-route="dashboard"]'
      );
      if(!start)return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      hardOpenStartPage();
    };

    document.addEventListener('pointerup',activate,true);
    document.addEventListener('click',activate,true);
    window.ms756OpenStart=hardOpenStartPage;
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

    const shared=typeof window.ms753SharedAutomaticState==='function'
      ?window.ms753SharedAutomaticState()
      :null;
    const localEnabled=Boolean(source?.checked);
    const enabled=shared?.known?Boolean(shared.enabled):localEnabled;

    button.textContent=shared?.busy?'Even…':(enabled?'Aan':'Uit');
    button.disabled=Boolean(shared?.busy);
    button.classList.toggle('is-on',enabled);
    button.setAttribute('aria-pressed',String(enabled));

    const detail=document.getElementById('ms701DepartureStatus')?.textContent?.trim();
    if(shared?.error){
      status.textContent=enabled
        ?'Aan op dit apparaat · synchronisatie tijdelijk niet bereikbaar.'
        :'Synchronisatie tussen iPhone en iPad tijdelijk niet bereikbaar.';
    }else if(enabled&&shared?.known&&!shared.localRecorder){
      status.textContent=shared.claimFresh
        ?'Aan op een ander apparaat · dit apparaat kijkt mee.'
        :'Aan voor Serenity · momenteel registreert geen apparaat.';
    }else{
      status.textContent=enabled
        ?(detail||'Dit apparaat wacht automatisch op vertrek.')
        :'Tik op Aan om automatisch varen voor Serenity te activeren.';
    }
  }

  async function toggleAutomaticVaren(){
    if(typeof window.ms753ToggleSharedAutomatic==='function'){
      await window.ms753ToggleSharedAutomatic();
      syncAutomaticVaren();
      return;
    }

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
    clearLegacySinglePageLayout();
    document.body.classList.toggle('ms750-large-text',storedBoolean(LARGE_TEXT_KEY,true));
    document.body.classList.toggle('ms750-dashboard-expanded',storedBoolean(EXPANDED_KEY,false));
    storeBoolean(SIMPLE_KEY,true);
  }

  function handleKeyboard(event){
    const searchOpen=searchLayer&&!searchLayer.classList.contains('hidden');
    if(event.key==='Escape'&&searchOpen){
      event.preventDefault();
      closeSearch();
      return;
    }
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
    buildSearchLayer();
    repositionCaptainQuestion();
    rebuildBottomNavigation();
    wrapNavigation();
    installReliableStartNavigation();
    observeAutomaticVaren();
    afterNavigate('dashboard');
    [0,120,450].forEach(delay=>setTimeout(()=>navigate('dashboard'),delay));
    document.addEventListener('keydown',handleKeyboard);
    window.ms753RefreshSimpleAutomaticUi=syncAutomaticVaren;
    window.ms753Navigate=navigate;
    window.ms755OpenSearch=openSearch;
    window.ms755OpenRadio=openRadio;
    console.info(`MijnSerenity ${BUILD}: eenvoudige bediening actief.`);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }
})();
