/* MijnSerenity 8.31.1 — dag/nacht en uniforme subpagina-header zonder zware DOM-observer. */
(()=>{
  'use strict';
  if(window.__msSerenityTheme8311)return;
  window.__msSerenityTheme8311=true;
  window.__msSerenityTheme8310=true;

  const VERSION='8.31.1';
  const TOKEN='831100';
  const THEME_KEY='mijnserenity-daynight-v1';
  const $=id=>document.getElementById(id);
  const routeNames={
    dashboard:['Start','Overzicht van Serenity'],live:['Live varen','Navigatie & vaartregistratie'],
    ais:['AIS','Schepen in de omgeving'],weather:['Weer','Actueel weer & voorspelling'],
    map:['Kaart','Waterkaarten & navigatie'],planner:['Reisplanner','Plan je route & reistijd'],
    entertainment:['Home Assistant','Boordsystemen bedienen'],technical:['Techniek','Energie, tanks & systemen'],
    pois:["POI's",'Havens & favoriete plekken'],logbook:['Logboek','Vaartochten & herinneringen'],
    costs:['Kosten','Bonnen & uitgaven'],finance:['Financieel','Overzicht & rapportage'],
    settings:['Instellingen','App, koppelingen & beheer'],boat:['Boot & delen','Serenity beheren'],
    rws:['Vaarwegberichten','Bruggen, sluizen & meldingen']
  };
  let routeObserver=null;
  let observedSections=new WeakSet();
  let syncQueued=false;

  function ensureCss(){
    if(document.querySelector('link[href*="serenity-theme-8311.css"]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/serenity-theme-8311.css?v=${TOKEN}`;
    (document.head||document.documentElement).appendChild(link);
  }
  function readTheme(){
    try{const saved=localStorage.getItem(THEME_KEY);if(saved==='day'||saved==='night')return saved}catch{}
    return document.documentElement.dataset.msDaynight==='day'?'day':'night';
  }
  function syncButtons(mode){
    const day=mode==='day',label=day?'Dag':'Nacht',icon=day?'☀':'☾';
    document.querySelectorAll('[data-ms8311-theme-toggle],#ms8300Theme').forEach(button=>{
      button.innerHTML=`<span aria-hidden="true">${icon}</span><strong>${label}</strong>`;
      button.setAttribute('aria-label',day?'Schakel naar nachtweergave':'Schakel naar dagweergave');
    });
  }
  function applyTheme(mode,save=false){
    const next=mode==='day'?'day':'night';
    document.documentElement.dataset.msDaynight=next;
    document.documentElement.style.colorScheme=next==='day'?'light':'dark';
    if(save){try{localStorage.setItem(THEME_KEY,next)}catch{}}
    syncButtons(next);
    window.dispatchEvent(new CustomEvent('mijnserenity:serenity-theme',{detail:{mode:next,version:VERSION}}));
  }
  function toggleTheme(){applyTheme(readTheme()==='night'?'day':'night',true)}
  function goHome(){
    if(typeof window.ms8311Navigate==='function'){window.ms8311Navigate('dashboard');return;}
    if(typeof window.captainNavigate==='function'){
      const home=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
      window.captainNavigate('dashboard',home||null);return;
    }
    document.querySelector('.tabs [data-target="dashboard"]')?.click();
  }
  function ensurePageBar(){
    const app=$('appView');if(!app)return null;
    let bar=$('ms8311PageBar');if(bar)return bar;
    bar=document.createElement('header');bar.id='ms8311PageBar';
    bar.innerHTML=`
      <button type="button" class="ms8311-page-brand" id="ms8311BrandHome" aria-label="Terug naar Start">
        <span class="ms8311-page-brandmark"><strong>Serenity</strong><small>EXPLORE · NAVIGATE · ENJOY</small></span>
        <span class="ms8311-page-title"><small id="ms8311PageKicker">MIJNSERENITY</small><strong id="ms8311PageTitle">Serenity</strong></span>
      </button>
      <div class="ms8311-page-actions">
        <button type="button" class="ms8311-pill" data-ms8311-theme-toggle><span aria-hidden="true">☾</span><strong>Nacht</strong></button>
        <button type="button" class="ms8311-pill ms8311-pill-home" id="ms8311Home" aria-label="Terug naar Start">⌂</button>
      </div>`;
    const tabs=app.querySelector(':scope > .tabs');
    if(tabs)tabs.insertAdjacentElement('afterend',bar);else app.prepend(bar);
    bar.querySelector('[data-ms8311-theme-toggle]')?.addEventListener('click',toggleTheme);
    $('ms8311BrandHome')?.addEventListener('click',goHome);$('ms8311Home')?.addEventListener('click',goHome);
    syncButtons(readTheme());return bar;
  }
  function visibleRoute(){
    const app=$('appView');
    if(!app||app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return '';
    const visible=[...app.querySelectorAll(':scope > section[id]')].find(section=>!section.classList.contains('hidden')&&section.getAttribute('aria-hidden')!=='true');
    return String(visible?.id||'dashboard').toLowerCase();
  }
  function inferTitle(route){
    if(routeNames[route])return routeNames[route];
    const title=$(route)?.querySelector('h1,h2,h3')?.textContent?.trim();
    return [title||route||'Serenity','MijnSerenity'];
  }
  function syncChrome(){
    syncQueued=false;ensurePageBar();
    const route=visibleRoute(),inApp=Boolean(route),onStart=route==='dashboard';
    if(document.body&&inApp){document.body.classList.toggle('ms8300-start-page',onStart);document.body.classList.toggle('ms8300-sub-page',!onStart);}
    if(route&&route!=='dashboard'){
      const [title,sub]=inferTitle(route);if($('ms8311PageTitle'))$('ms8311PageTitle').textContent=title;if($('ms8311PageKicker'))$('ms8311PageKicker').textContent=sub.toUpperCase();
    }
    syncButtons(readTheme());
  }
  function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(syncChrome)}
  function observeSection(section){
    if(!section||observedSections.has(section))return;observedSections.add(section);
    new MutationObserver(queueSync).observe(section,{attributes:true,attributeFilter:['class','aria-hidden']});
  }
  function observeRoutes(){
    const app=$('appView');if(!app)return;
    app.querySelectorAll(':scope > section[id]').forEach(observeSection);
    routeObserver=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.addedNodes.length))app.querySelectorAll(':scope > section[id]').forEach(observeSection);
      queueSync();
    });
    routeObserver.observe(app,{childList:true});
    ['pageshow','orientationchange','mijnserenity:routechange','mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:app-ready']
      .forEach(type=>window.addEventListener(type,queueSync,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync()},{passive:true});
  }
  function boot(){
    ensureCss();applyTheme(readTheme(),false);ensurePageBar();observeRoutes();syncChrome();
    window.ms8311ApplyTheme=applyTheme;window.ms8311ToggleTheme=toggleTheme;
    console.info(`MijnSerenity ${VERSION}: Serenity Glass actief.`);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();