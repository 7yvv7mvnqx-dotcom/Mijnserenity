/* MijnSerenity 8.31.1 — route-assets.
   Alleen styles en kleine compatibiliteitsmodules laden wanneer de functie ze nodig heeft. */
(()=>{
  'use strict';
  if(window.__msRouteAssets8311)return;
  window.__msRouteAssets8311=true;
  const TOKEN='831100';
  const loadedStyles=new Set();
  const loadedScripts=new Set();

  const CORE_STYLES=[
    'serenity-shell-8311.css',
    'mission-control.css','easy-auto.css','route-control.css','ruuvi-climate.css',
    'victron-energy-71559.css','victron-diagnostics.css','home-assistant-contrast.css'
  ];
  const ROUTE_STYLES={
    live:['live-cameras.css','live-split.css','auto-track-reliability.css','gps-continuity-guard.css','waterkaarten-split-launch.css','wind-direction-71512.css'],
    map:['map-next-level-8220.css'],
    planner:['route-control.css'],
    weather:['weather-page.css','weather-radar.css','rws-nearby.css'],
    rws:['rws-nearby.css'],
    ais:['ais-page.css'],
    entertainment:['entertainment-page.css'],
    technical:['technical-live-sync.css','ha-live-bridge.css','ruuvi-climate.css','victron-energy-71559.css','victron-diagnostics.css'],
    pois:['poi-regio-filter-71511.css']
  };
  const ROUTE_SCRIPTS={
    live:['wind-direction-71512.js'],
    pois:['poi-regio-filter-71511.js']
  };

  function pathOf(value){try{return new URL(value,location.href).pathname}catch{return String(value||'')}}
  function styleLoaded(file){
    const path='/'+file.replace(/^\//,'');
    return [...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>pathOf(link.href)===path);
  }
  function ensureStyle(file){
    const path='/'+file.replace(/^\//,'');
    if(loadedStyles.has(path)||styleLoaded(file)){loadedStyles.add(path);return;}
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=`${path}?v=${TOKEN}`;link.dataset.msRouteStyle='8311';
    document.head.appendChild(link);loadedStyles.add(path);
  }
  function scriptLoaded(file){
    const path='/'+file.replace(/^\//,'');
    return [...document.scripts].some(script=>script.src&&pathOf(script.src)===path);
  }
  function ensureScript(file){
    const path='/'+file.replace(/^\//,'');
    if(loadedScripts.has(path)||scriptLoaded(file)){loadedScripts.add(path);return;}
    const script=document.createElement('script');
    script.src=`${path}?v=${TOKEN}`;script.async=false;script.dataset.msRouteSupport='8311';
    script.onerror=()=>console.warn(`MijnSerenity route-asset kon niet worden geladen: ${path}`);
    document.head.appendChild(script);loadedScripts.add(path);
  }
  function loadRoute(route){
    const key=String(route||'').trim().toLowerCase();
    (ROUTE_STYLES[key]||[]).forEach(ensureStyle);
    (ROUTE_SCRIPTS[key]||[]).forEach(ensureScript);
  }

  CORE_STYLES.forEach(ensureStyle);
  document.addEventListener('click',event=>{
    const node=event.target instanceof Element?event.target.closest('[data-target],[data-route]'):null;
    const route=node?.dataset?.target||node?.dataset?.route;
    if(route)loadRoute(route);
  },{capture:true,passive:true});
  window.addEventListener('mijnserenity:routechange',event=>{
    const detail=event?.detail;
    loadRoute(typeof detail==='string'?detail:(detail?.route||detail?.id||detail?.target));
  },{passive:true});
  window.addEventListener('mijnserenity:route-requested',event=>loadRoute(event?.detail?.route),{passive:true});
  const open=new URLSearchParams(location.search).get('open');if(open)loadRoute(open);
  window.ms8311LoadRouteAssets=loadRoute;
})();