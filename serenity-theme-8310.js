/* MijnSerenity 8.31.0 — Serenity Glass dag/nacht + uniforme paginabalk. */
(()=>{
  'use strict';
  if(window.__msSerenityTheme8310)return;
  window.__msSerenityTheme8310=true;

  const VERSION='8.31.0';
  const TOKEN='831000';
  const THEME_KEY='mijnserenity-daynight-v1';
  const $=id=>document.getElementById(id);
  const routeNames={
    dashboard:['Start','Overzicht van Serenity'],
    live:['Live varen','Navigatie & vaartregistratie'],
    ais:['AIS','Schepen in de omgeving'],
    weather:['Weer','Actueel weer & voorspelling'],
    map:['Kaart','Waterkaarten & navigatie'],
    planner:['Reisplanner','Plan je route & reistijd'],
    entertainment:['Home Assistant','Boordsystemen bedienen'],
    technical:['Techniek','Energie, tanks & systemen'],
    pois:["POI's",'Havens & favoriete plekken'],
    logbook:['Logboek','Vaartochten & herinneringen'],
    costs:['Kosten','Bonnen & uitgaven'],
    finance:['Financieel','Overzicht & rapportage'],
    settings:['Instellingen','App, koppelingen & beheer'],
    boat:['Boot & delen','Serenity beheren']
  };

  function installCss(){
    if(document.getElementById('ms8310ThemeCss'))return;
    const link=document.createElement('link');
    link.id='ms8310ThemeCss';
    link.rel='stylesheet';
    link.href=`/serenity-theme-8310.css?v=${TOKEN}`;
    (document.head||document.documentElement).appendChild(link);
  }

  function readTheme(){
    try{
      const own=localStorage.getItem(THEME_KEY);
      if(own==='day'||own==='night')return own;
    }catch{}
    const current=document.documentElement.dataset.msDaynight;
    return current==='day'?'day':'night';
  }

  function syncButtons(mode){
    const day=mode==='day';
    const label=day?'Dag':'Nacht';
    const icon=day?'☀':'☾';
    document.querySelectorAll('[data-ms8310-theme-toggle]').forEach(button=>{
      button.innerHTML=`<span aria-hidden="true">${icon}</span><strong>${label}</strong>`;
      button.setAttribute('aria-label',day?'Schakel naar nachtweergave':'Schakel naar dagweergave');
      button.setAttribute('aria-pressed',day?'false':'true');
    });
    const legacy=$('ms8300Theme');
    if(legacy){
      legacy.innerHTML=`<span aria-hidden="true">${icon}</span><strong>${label}</strong>`;
      legacy.setAttribute('aria-label',day?'Schakel naar nachtweergave':'Schakel naar dagweergave');
    }
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
    try{
      if(typeof window.captainNavigate==='function'){
        const home=document.querySelector('.bottom-nav .bottom-nav-item[data-target="dashboard"]');
        window.captainNavigate('dashboard',home||null);
        return;
      }
      document.querySelector('.tabs [data-target="dashboard"]')?.click();
    }catch(error){console.debug('Serenity Start openen:',error)}
  }

  function ensurePageBar(){
    const app=$('appView');
    if(!app)return null;
    let bar=$('ms8310PageBar');
    if(bar)return bar;
    bar=document.createElement('header');
    bar.id='ms8310PageBar';
    bar.innerHTML=`
      <button type="button" class="ms8310-page-brand" id="ms8310BrandHome" aria-label="Terug naar Start">
        <span class="ms8310-page-brandmark"><strong>Serenity</strong><small>EXPLORE · NAVIGATE · ENJOY</small></span>
        <span class="ms8310-page-title"><small id="ms8310PageKicker">MIJNSERENITY</small><strong id="ms8310PageTitle">Serenity</strong></span>
      </button>
      <div class="ms8310-page-actions">
        <button type="button" class="ms8310-pill" data-ms8310-theme-toggle><span aria-hidden="true">☾</span><strong>Nacht</strong></button>
        <button type="button" class="ms8310-pill ms8310-pill-home" id="ms8310Home" aria-label="Terug naar Start">⌂</button>
      </div>`;
    const tabs=app.querySelector(':scope > .tabs');
    if(tabs?.nextSibling)app.insertBefore(bar,tabs.nextSibling);else app.prepend(bar);
    bar.querySelector('[data-ms8310-theme-toggle]')?.addEventListener('click',toggleTheme);
    bar.querySelector('#ms8310BrandHome')?.addEventListener('click',goHome);
    bar.querySelector('#ms8310Home')?.addEventListener('click',goHome);
    syncButtons(readTheme());
    return bar;
  }

  function ensureFloatingTheme(){
    let button=$('ms8310FloatingTheme');
    if(button)return button;
    button=document.createElement('button');
    button.id='ms8310FloatingTheme';
    button.type='button';
    button.className='ms8310-pill';
    button.dataset.ms8310ThemeToggle='1';
    button.innerHTML='<span aria-hidden="true">☾</span><strong>Nacht</strong>';
    button.addEventListener('click',toggleTheme);
    document.body?.appendChild(button);
    syncButtons(readTheme());
    return button;
  }

  function visibleRoute(){
    const app=$('appView');
    if(!app||app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return '';
    const sections=[...app.querySelectorAll(':scope > section[id]')];
    const visible=sections.find(section=>!section.classList.contains('hidden')&&section.getAttribute('aria-hidden')!=='true');
    return String(visible?.id||'dashboard').toLowerCase();
  }

  function inferTitle(route){
    if(routeNames[route])return routeNames[route];
    const section=$(route);
    const title=section?.querySelector('h1,h2,h3')?.textContent?.trim();
    return [title||route||'Serenity','MijnSerenity'];
  }

  function syncChrome(){
    ensurePageBar();
    ensureFloatingTheme();
    const route=visibleRoute();
    const inApp=Boolean(route);
    const onStart=route==='dashboard';
    if(document.body){
      if(inApp){
        document.body.classList.toggle('ms8300-start-page',onStart);
        document.body.classList.toggle('ms8300-sub-page',!onStart);
      }
    }
    if(route&&route!=='dashboard'){
      const [title,sub]=inferTitle(route);
      const titleNode=$('ms8310PageTitle');
      const kicker=$('ms8310PageKicker');
      if(titleNode)titleNode.textContent=title;
      if(kicker)kicker.textContent=sub.toUpperCase();
    }
    syncButtons(readTheme());
  }

  function attachLegacyThemeBridge(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('#ms8300Theme');
      if(!button)return;
      setTimeout(()=>applyTheme(document.documentElement.dataset.msDaynight==='day'?'day':'night',true),0);
    },true);
    window.addEventListener('mijnserenity:theme-changed',event=>{
      const mode=event?.detail?.mode;
      if(mode==='day'||mode==='night')applyTheme(mode,true);
    });
  }

  function observeRoutes(){
    const app=$('appView');
    if(!app)return;
    let queued=false;
    const queue=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;syncChrome()});
    };
    const observer=new MutationObserver(queue);
    observer.observe(app,{subtree:true,attributes:true,attributeFilter:['class','aria-hidden'],childList:true});
    ['pageshow','orientationchange','mijnserenity:routechange','mijnserenity:dashboard-ready','mijnserenity:boot-complete']
      .forEach(type=>window.addEventListener(type,queue,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()},{passive:true});
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-target], [data-route]'))setTimeout(queue,0);
    },{passive:true});
  }

  function boot(){
    installCss();
    applyTheme(readTheme(),false);
    ensurePageBar();
    ensureFloatingTheme();
    attachLegacyThemeBridge();
    observeRoutes();
    syncChrome();
    setTimeout(syncChrome,80);
    setTimeout(syncChrome,350);
    console.info(`MijnSerenity ${VERSION}: Serenity Glass dag/nacht actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
