/* MijnSerenity 7.18.9 — Waterkaarten route-informatie in Marine Glass */
(()=>{
  'use strict';
  if(window.__msWaterkaartenMarineRoute7189)return;
  window.__msWaterkaartenMarineRoute7189=true;

  const $=id=>document.getElementById(id);
  const set=(id,value)=>{
    const el=$(id);
    if(!el||value==null)return false;
    const text=String(value);
    if(el.textContent===text)return false;
    el.textContent=text;
    return true;
  };
  const number=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    if(!match)return null;
    const parsed=Number(match[0]);
    return Number.isFinite(parsed)?parsed:null;
  };
  const fmtKm=value=>Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+' km';

  function isWaterkaarten(plan){
    if(!plan||typeof plan!=='object')return false;
    const source=`${plan.source||''} ${plan.routeSource||''} ${plan.routeSourceLabel||''}`.toLowerCase();
    return source.includes('waterkaarten')||Boolean(plan.waterkaartenRouteId);
  }

  function storedWaterkaartenPlan(){
    try{
      const key=typeof window.plannerStorageKey==='function'?window.plannerStorageKey():'';
      if(!key)return null;
      const drafts=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(drafts))return null;
      return drafts.find(isWaterkaarten)||null;
    }catch{return null}
  }

  function activePlan(){
    const candidates=[];
    try{candidates.push(window.ms660NavigationPlan?.())}catch{}
    candidates.push(window.MIJSERENITY_IMPORTED_ROUTE_PLAN,window.plannerCurrentPlan);
    for(const plan of candidates){
      if(isWaterkaarten(plan)){
        window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan;
        return plan;
      }
    }
    const stored=storedWaterkaartenPlan();
    if(stored)window.MIJSERENITY_IMPORTED_ROUTE_PLAN=stored;
    return stored;
  }

  function coord(value){
    if(Array.isArray(value)&&value.length>=2){
      const lon=Number(value[0]),lat=Number(value[1]);
      return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
    }
    if(Array.isArray(value?.geometry?.coordinates))return coord(value.geometry.coordinates);
    if(Array.isArray(value?.location?.coordinates))return coord(value.location.coordinates);
    const lat=Number(value?.lat??value?.latitude??value?.position?.lat??value?.location?.lat);
    const lon=Number(value?.lon??value?.lng??value?.longitude??value?.position?.lon??value?.position?.lng??value?.location?.lon??value?.location?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }

  function routeCoordinates(plan){
    const segmentCoordinates=Array.isArray(plan?.segments)
      ?plan.segments.flatMap(segment=>Array.isArray(segment?.routeCoordinates)?segment.routeCoordinates:[])
      :[];
    for(const list of [plan?.routeCoordinates,plan?.route?.coordinates,plan?.routeGeometry?.coordinates,segmentCoordinates,plan?.points]){
      if(!Array.isArray(list))continue;
      const points=list.map(coord).filter(Boolean);
      if(points.length>1)return points;
    }
    return [];
  }

  function currentPosition(){
    const state=window.liveNavState||{};
    const direct=coord({
      lat:state.currentLat??state.lat??state.position?.lat??state.position?.latitude,
      lon:state.currentLon??state.lon??state.lng??state.position?.lon??state.position?.lng??state.position?.longitude
    });
    if(direct)return direct;
    for(const list of [state.trackPoints,state.track,state.history,state.gpsTrack,state.points]){
      if(Array.isArray(list)&&list.length){
        const point=coord(list[list.length-1]);
        if(point)return point;
      }
    }
    return null;
  }

  function distanceKm(a,b){
    const rad=value=>value*Math.PI/180;
    const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
    const lat1=rad(a.lat),lat2=rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }

  function routeModel(points,position){
    const cumulative=[0];
    for(let i=1;i<points.length;i++)cumulative[i]=cumulative[i-1]+distanceKm(points[i-1],points[i]);
    const total=cumulative[cumulative.length-1]||0;
    if(!position)return {total,cumulative,progressKm:0,progress:0,nearestIndex:0,onRoute:false};
    let nearestIndex=0,nearestDistance=Infinity;
    points.forEach((point,index)=>{
      const distance=distanceKm(position,point);
      if(distance<nearestDistance){nearestDistance=distance;nearestIndex=index}
    });
    const onRoute=nearestDistance<=1.5;
    const progressKm=onRoute?(cumulative[nearestIndex]||0):0;
    return {
      total,cumulative,progressKm,
      progress:total>0?Math.max(0,Math.min(100,Math.round(progressKm/total*100))):0,
      nearestIndex,nearestDistance,onRoute
    };
  }

  function formatDuration(hours){
    if(!Number.isFinite(hours)||hours<0)return '–';
    const minutes=Math.max(0,Math.round(hours*60));
    const h=Math.floor(minutes/60),m=minutes%60;
    if(h&&m)return `${h} u ${m} min`;
    if(h)return `${h} u`;
    return `${m} min`;
  }

  function formatEta(hours){
    if(!Number.isFinite(hours)||hours<0)return '–';
    const eta=new Date(Date.now()+hours*3600000);
    return eta.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
  }

  function allPois(){
    try{
      if(typeof poiCache!=='undefined'&&Array.isArray(poiCache))return poiCache;
    }catch{}
    return Array.isArray(window.poiCache)?window.poiCache:[];
  }

  function poiText(item){
    const props=item?.properties||{};
    return `${item?.category||''} ${item?.type||''} ${item?.kind||''} ${item?.label||''} ${item?.name||''} ${item?.title||''} ${props.category||''} ${props.type||''} ${props.name||''}`.toLowerCase();
  }

  function routePois(plan,points,model){
    if(Array.isArray(plan?.routePois)&&plan.routePois.length)return plan.routePois;
    try{
      if(typeof window.ms650CollectRoutePois==='function'){
        const pois=window.ms650CollectRoutePois(points,Array.isArray(plan?.points)?plan.points:[]);
        if(Array.isArray(pois)&&pois.length)return pois;
      }
    }catch(error){console.debug('POI aanvullen Waterkaarten-route:',error)}

    const result=[];
    for(const item of allPois()){
      if(!/brug|sluis|bridge|lock/.test(poiText(item)))continue;
      const p=coord(item);
      if(!p)continue;
      let bestDistance=Infinity,bestIndex=0;
      points.forEach((routePoint,index)=>{
        const distance=distanceKm(p,routePoint);
        if(distance<bestDistance){bestDistance=distance;bestIndex=index}
      });
      if(bestDistance>0.55)continue;
      result.push({...item,alongRouteKm:model.cumulative[bestIndex]||0,distanceToRouteKm:bestDistance});
    }
    return result;
  }

  function timingText(item){
    const props=item?.properties||{};
    const values=[
      item?.operatingHours,item?.openingHours,item?.opening_hours,item?.bedieningstijden,item?.serviceHours,item?.schedule,
      props.operatingHours,props.openingHours,props.opening_hours,props.bedieningstijden,props.serviceHours,props.schedule
    ];
    const value=values.find(v=>typeof v==='string'&&v.trim());
    return value?String(value).trim():'';
  }

  function nextBridgeOrLock(plan,points,model,progressKm){
    const candidates=routePois(plan,points,model)
      .filter(item=>/brug|sluis|bridge|lock/.test(poiText(item)))
      .map(item=>{
        let along=number(item?.alongRouteKm);
        if(along==null){
          const p=coord(item);
          if(p){
            let best={distance:Infinity,index:0};
            points.forEach((routePoint,index)=>{
              const distance=distanceKm(p,routePoint);
              if(distance<best.distance)best={distance,index};
            });
            along=model.cumulative[best.index]||0;
          }
        }
        return {...item,along};
      })
      .filter(item=>Number.isFinite(item.along)&&item.along+0.05>=progressKm)
      .sort((a,b)=>a.along-b.along);

    const next=candidates[0];
    if(!next)return null;
    const label=String(next.label||next.name||next.title||next?.properties?.name||next.category||'Brug/sluis');
    return {label,distanceKm:Math.max(0,next.along-progressKm),timing:timingText(next)};
  }

  function sourceBadge(){
    const card=document.querySelector('#msMarineGlass .mg-route');
    const heading=card?.querySelector('h3');
    if(!heading)return;
    let badge=heading.querySelector('.mg-route-source');
    if(!badge){
      badge=document.createElement('small');
      badge.className='mg-route-source';
      badge.style.cssText='margin-left:.55rem;font-size:.68em;font-weight:700;opacity:.72;letter-spacing:.02em';
      heading.appendChild(badge);
    }
    badge.textContent='Waterkaarten GPX';
  }

  function legacyField(id,value){
    let el=$(id);
    if(!el){
      el=document.createElement('span');
      el.id=id;
      el.hidden=true;
      el.setAttribute('aria-hidden','true');
      (document.body||document.documentElement).appendChild(el);
    }
    const text=String(value??'–');
    if(el.textContent!==text)el.textContent=text;
  }

  function bridgeLegacy({eta,remaining,duration,next,nextMeta}){
    legacyField('msnSmartEta',eta);
    legacyField('mscrEta',eta);
    legacyField('msnSmartRemaining',remaining);
    legacyField('msnSmartDuration',duration);
    legacyField('msnSmartNext',next);
    legacyField('mscrNext',next);
    legacyField('mscrNextDist',nextMeta);
  }

  let applying=false;
  function apply(){
    if(applying)return;
    const plan=activePlan();
    if(!plan)return;
    const points=routeCoordinates(plan);
    if(points.length<2)return;

    applying=true;
    try{
      const model=routeModel(points,currentPosition());
      const planTotal=number(plan.distanceKm);
      const total=planTotal!=null&&planTotal>0?planTotal:model.total;
      const progressKm=model.onRoute?Math.min(model.progressKm,total):0;
      const remaining=Math.max(0,total-progressKm);
      const actualSpeed=number($('mg-speed')?.textContent);
      const planSpeed=number(plan.speed);
      const speed=actualSpeed!=null&&actualSpeed>=0.5?actualSpeed:(planSpeed!=null&&planSpeed>0?planSpeed:9);
      const remainingHours=speed>0?remaining/speed:null;
      const progress=total>0?Math.max(0,Math.min(100,Math.round(progressKm/total*100))):0;
      const eta=formatEta(remainingHours);
      const duration=formatDuration(remainingHours);
      const remainingText=fmtKm(remaining);

      const next=nextBridgeOrLock(plan,points,model,progressKm);
      const nextLabel=next?.label||'Geen brug/sluis gevonden';
      const nextMeta=next
        ?`${fmtKm(next.distanceKm)} resterend${next.timing?` · ${next.timing}`:''}`
        :'Controleer route in Reisplanner';

      /* Voed eerst de bronnen die de bestaande cockpit iedere 3 seconden uitleest. */
      bridgeLegacy({eta,remaining:remainingText,duration,next:nextLabel,nextMeta});

      /* En werk daarna de zichtbare kaart direct bij. */
      set('mgEta',eta);
      set('mgRemain',remainingText);
      set('mgDuration',duration);
      set('mgNext',nextLabel);
      set('mgNextMeta',nextMeta);
      set('mgProgTxt',`${progress}%`);
      const bar=$('mgProg');
      if(bar&&bar.style.width!==`${progress}%`)bar.style.width=`${progress}%`;
      sourceBadge();
    }finally{applying=false}
  }

  function observe(){
    const card=document.querySelector('#msMarineGlass .mg-route');
    if(!card||card.dataset.waterkaartenObserved==='1')return;
    card.dataset.waterkaartenObserved='1';
    if(window.MutationObserver){
      const observer=new MutationObserver(()=>queueMicrotask(apply));
      observer.observe(card,{subtree:true,childList:true,characterData:true});
    }
  }

  function start(){
    const run=()=>{observe();apply()};
    run();
    setTimeout(run,200);
    setTimeout(run,900);
    setTimeout(run,2500);
    window.addEventListener('mijnserenity:waterkaarten-route-imported',event=>{
      try{
        const key=typeof window.plannerStorageKey==='function'?window.plannerStorageKey():'';
        const drafts=key?JSON.parse(localStorage.getItem(key)||'[]'):[];
        const plan=Array.isArray(drafts)?drafts.find(item=>String(item?.id||'')===String(event?.detail?.planId||'')):null;
        if(plan)window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan;
      }catch{}
      queueMicrotask(run);
    },{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>queueMicrotask(run),{passive:true});
    window.addEventListener('pageshow',()=>queueMicrotask(run),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueMicrotask(run)},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
