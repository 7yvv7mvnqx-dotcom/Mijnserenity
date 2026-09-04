/* MijnSerenity 7.18.12 — route maximaal zichtbaar op Marine Glass kaart */
(()=>{
  'use strict';
  if(window.__msMarineMapRouteFit71812)return;
  window.__msMarineMapRouteFit71812=true;

  const PADDING=12;
  const MAX_ZOOM=16;
  let marineMap=null;
  let lastSignature='';
  let manualTouched=false;
  let patchTimer=null;
  let patchAttempts=0;

  function ll(value){
    if(Array.isArray(value)&&value.length>=2){
      const lon=Number(value[0]),lat=Number(value[1]);
      return Number.isFinite(lat)&&Number.isFinite(lon)?[lat,lon]:null;
    }
    const lat=Number(value?.lat??value?.latitude??value?.position?.lat??value?.location?.lat);
    const lon=Number(value?.lon??value?.lng??value?.longitude??value?.position?.lon??value?.position?.lng??value?.location?.lon??value?.location?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lon)?[lat,lon]:null;
  }

  function planCandidates(){
    const values=[
      window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN,
      window.MIJSERENITY_IMPORTED_ROUTE_PLAN
    ];
    try{values.push(window.ms660NavigationPlan?.())}catch{}
    try{values.push(window.plannerCurrentPlan)}catch{}
    return values.filter(value=>value&&typeof value==='object');
  }

  function routePoints(plan){
    if(!plan)return [];
    const segments=Array.isArray(plan.segments)
      ?plan.segments.flatMap(segment=>Array.isArray(segment?.routeCoordinates)?segment.routeCoordinates:[])
      :[];
    const candidates=[
      plan.routeCoordinates,
      plan.route?.coordinates,
      plan.routeGeometry?.coordinates,
      segments,
      plan.route?.points,
      plan.points
    ];
    for(const values of candidates){
      if(!Array.isArray(values))continue;
      const points=values.map(ll).filter(Boolean);
      if(points.length>1)return points;
    }
    return [];
  }

  function activeRoute(){
    for(const plan of planCandidates()){
      const points=routePoints(plan);
      if(points.length>1)return {plan,points};
    }
    return null;
  }

  function signature(plan,points){
    const first=points[0],last=points[points.length-1];
    return [
      plan?.waterkaartenRouteId||plan?.id||plan?.title||'',
      points.length,
      first?.[0]?.toFixed?.(5),first?.[1]?.toFixed?.(5),
      last?.[0]?.toFixed?.(5),last?.[1]?.toFixed?.(5)
    ].join('|');
  }

  function bindManualInteraction(map){
    const container=map?.getContainer?.();
    if(!container||container.dataset.msRouteFitBound==='1')return;
    container.dataset.msRouteFitBound='1';
    const touched=()=>{manualTouched=true};
    container.addEventListener('pointerdown',touched,{passive:true});
    container.addEventListener('touchstart',touched,{passive:true});
    container.addEventListener('wheel',touched,{passive:true});
  }

  function captureMap(map){
    try{
      const container=map?.getContainer?.();
      if(container?.id!=='mgMap')return;
      marineMap=map;
      window.MIJSERENITY_MARINE_MAP=map;
      bindManualInteraction(map);
      setTimeout(()=>fitRoute(false),120);
      setTimeout(()=>fitRoute(false),650);
      setTimeout(()=>fitRoute(false),1800);
    }catch(error){console.debug('Marine kaart vastleggen:',error)}
  }

  function patchLeaflet(){
    if(window.L?.map){
      const current=window.L.map;
      if(!current.__msMarineRouteFit71812){
        const original=current;
        const wrapped=function(...args){
          const instance=original.apply(this,args);
          captureMap(instance);
          return instance;
        };
        Object.assign(wrapped,original);
        wrapped.__msMarineRouteFit71812=true;
        wrapped.__msOriginal=original;
        window.L.map=wrapped;
      }
      clearTimeout(patchTimer);
      return;
    }
    if(++patchAttempts<80)patchTimer=setTimeout(patchLeaflet,50);
  }

  function fitRoute(force=false){
    const map=marineMap||window.MIJSERENITY_MARINE_MAP;
    if(!map||!window.L?.latLngBounds)return false;
    const route=activeRoute();
    if(!route)return false;
    const sig=signature(route.plan,route.points);
    const changed=sig!==lastSignature;
    if(!force&&!changed&&manualTouched)return false;
    if(!force&&!changed&&lastSignature)return false;

    try{
      const bounds=window.L.latLngBounds(route.points);
      if(!bounds?.isValid?.())return false;
      map.stop?.();
      map.invalidateSize?.({pan:false,animate:false});
      map.fitBounds(bounds,{
        paddingTopLeft:[PADDING,PADDING],
        paddingBottomRight:[PADDING,PADDING],
        maxZoom:MAX_ZOOM,
        animate:false
      });
      lastSignature=sig;
      manualTouched=false;
      return true;
    }catch(error){
      console.warn('Route passend in Marine Glass kaart zetten:',error);
      return false;
    }
  }

  function refitSoon(force=false){
    setTimeout(()=>fitRoute(force),60);
    setTimeout(()=>fitRoute(force),260);
  }

  function loadPlannerLiveSearch(){
    if(window.__msPlannerLiveSearch8237)return;
    import('./planner-live-search-8237.js?v=20260904-8237')
      .catch(error=>console.warn('Routeplanner live zoeken laden:',error));
  }

  patchLeaflet();
  loadPlannerLiveSearch();
  window.ms71812FitMarineRoute=()=>fitRoute(true);
  window.addEventListener('mijnserenity:waterkaarten-route-imported',()=>refitSoon(true),{passive:true});
  window.addEventListener('mijnserenity:waterkaarten-route-enriched',()=>refitSoon(true),{passive:true});
  window.addEventListener('mijnserenity:routechange',()=>refitSoon(false),{passive:true});
  window.addEventListener('mijnserenity:modules-ready',()=>refitSoon(false),{passive:true});
  window.addEventListener('pageshow',()=>refitSoon(false),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>fitRoute(true),350),{passive:true});
})();
