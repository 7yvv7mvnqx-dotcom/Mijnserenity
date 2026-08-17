/* MijnSerenity 7.18.11 — stabiele Waterkaarten route-informatie + infrastructuur */
(()=>{
  'use strict';
  if(window.__msWaterkaartenMarineRoute71811)return;
  window.__msWaterkaartenMarineRoute71811=true;

  const $=id=>document.getElementById(id);
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};
  const number=value=>{const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const fmtKm=value=>Number(value).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})+' km';
  const fmtM=value=>Number(value).toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})+' m';

  function isWaterkaarten(plan){
    if(!plan||typeof plan!=='object')return false;
    const source=`${plan.source||''} ${plan.routeSource||''} ${plan.routeSourceLabel||''}`.toLowerCase();
    return source.includes('waterkaarten')||Boolean(plan.waterkaartenRouteId);
  }

  function storedPlan(){
    try{
      const key=typeof window.plannerStorageKey==='function'?window.plannerStorageKey():'';
      if(!key)return null;
      const drafts=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(drafts)?drafts.find(isWaterkaarten)||null:null;
    }catch{return null}
  }

  function activePlan(){
    const candidates=[window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN,window.MIJSERENITY_IMPORTED_ROUTE_PLAN];
    try{candidates.push(window.ms660NavigationPlan?.())}catch{}
    candidates.push(window.plannerCurrentPlan,storedPlan());
    const plan=candidates.find(isWaterkaarten)||null;
    if(plan){window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=plan;window.MIJSERENITY_IMPORTED_ROUTE_PLAN=plan}
    return plan;
  }

  function coord(value){
    if(Array.isArray(value)&&value.length>=2){const lon=Number(value[0]),lat=Number(value[1]);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null}
    if(Array.isArray(value?.geometry?.coordinates))return coord(value.geometry.coordinates);
    const lat=Number(value?.lat??value?.latitude??value?.position?.lat??value?.location?.lat);
    const lon=Number(value?.lon??value?.lng??value?.longitude??value?.position?.lon??value?.position?.lng??value?.location?.lon??value?.location?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }

  function routeCoordinates(plan){
    const seg=Array.isArray(plan?.segments)?plan.segments.flatMap(s=>Array.isArray(s?.routeCoordinates)?s.routeCoordinates:[]):[];
    for(const list of [plan?.routeCoordinates,plan?.route?.coordinates,plan?.routeGeometry?.coordinates,seg]){
      if(!Array.isArray(list))continue;
      const points=list.map(coord).filter(Boolean);if(points.length>1)return points;
    }
    return [];
  }

  function currentPosition(){
    const s=window.liveNavState||{};
    const direct=coord({lat:s.currentLat??s.lat??s.position?.lat??s.position?.latitude,lon:s.currentLon??s.lon??s.lng??s.position?.lon??s.position?.lng??s.position?.longitude});
    if(direct)return direct;
    for(const list of [s.trackPoints,s.track,s.history,s.gpsTrack,s.points]){if(Array.isArray(list)&&list.length){const p=coord(list[list.length-1]);if(p)return p}}
    return null;
  }

  function distanceKm(a,b){
    const rad=v=>v*Math.PI/180;
    const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),lat1=rad(a.lat),lat2=rad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }

  function routeModel(points,position){
    const cumulative=[0];
    for(let i=1;i<points.length;i++)cumulative[i]=cumulative[i-1]+distanceKm(points[i-1],points[i]);
    const total=cumulative.at(-1)||0;
    if(!position)return {total,cumulative,progressKm:0,progress:0,onRoute:false};
    let nearestIndex=0,nearestDistance=Infinity;
    points.forEach((p,i)=>{const d=distanceKm(position,p);if(d<nearestDistance){nearestDistance=d;nearestIndex=i}});
    const onRoute=nearestDistance<=1.5;
    const progressKm=onRoute?(cumulative[nearestIndex]||0):0;
    return {total,cumulative,progressKm,progress:total>0?Math.max(0,Math.min(100,Math.round(progressKm/total*100))):0,onRoute};
  }

  function formatDuration(hours){
    if(!Number.isFinite(hours)||hours<0)return '–';
    const minutes=Math.max(0,Math.round(hours*60)),h=Math.floor(minutes/60),m=minutes%60;
    return h?(m?`${h} u ${m} min`:`${h} u`):`${m} min`;
  }
  function formatEta(hours){
    if(!Number.isFinite(hours)||hours<0)return '–';
    return new Date(Date.now()+hours*3600000).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
  }

  function poiText(item){
    const p=item?.properties||{};
    return `${item?.category||''} ${item?.type||''} ${item?.kind||''} ${item?.label||''} ${item?.name||''} ${item?.title||''} ${p.category||''} ${p.type||''} ${p.name||''}`.toLowerCase();
  }
  function allPois(){try{if(typeof poiCache!=='undefined'&&Array.isArray(poiCache))return poiCache}catch{}return Array.isArray(window.poiCache)?window.poiCache:[]}

  function routeCandidates(plan){
    const values=[...(Array.isArray(plan?.routeObjects)?plan.routeObjects:[]),...(Array.isArray(plan?.routePois)?plan.routePois:[]),...allPois()];
    const seen=new Set();
    return values.filter(item=>{
      if(!item||typeof item!=='object')return false;
      const key=String(item.id||item.ref||item.osmId||`${item.category||''}:${item.name||item.label||''}:${item.lat||''}:${item.lon||''}`);
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }

  function nextBridgeOrLock(plan,points,model,progressKm){
    const candidates=[];
    for(const item of routeCandidates(plan)){
      if(!/brug|sluis|bridge|lock/.test(poiText(item)))continue;
      let along=number(item.alongRouteKm);
      if(along==null){
        const p=coord(item);if(!p)continue;
        let bestDistance=Infinity,bestIndex=0;
        points.forEach((rp,i)=>{const d=distanceKm(p,rp);if(d<bestDistance){bestDistance=d;bestIndex=i}});
        if(bestDistance>0.55)continue;
        along=model.cumulative[bestIndex]||0;
      }
      if(along+0.05<progressKm)continue;
      candidates.push({item,along});
    }
    candidates.sort((a,b)=>a.along-b.along);
    const found=candidates[0];if(!found)return null;
    const item=found.item,p=item?.properties||{},tags=item?.tags||item?._overpassTags||{};
    const label=String(item.label||item.name||item.title||p.name||item.category||'Brug/sluis');
    const timing=[item.openingHours,item.operatingHours,item.opening_hours,item.bedieningstijden,item.serviceHours,tags.opening_hours,tags.service_times,tags['seamark:bridge:opening_hours'],p.openingHours,p.opening_hours,p.bedieningstijden].find(v=>typeof v==='string'&&v.trim())||'';
    const clearance=number(item.clearanceHeight??p.clearanceHeight??tags.maxheight??tags['seamark:bridge:clearance_height']);
    const width=number(item.clearanceWidth??p.clearanceWidth);
    const depth=number(item.maxDepth??p.maxDepth);
    return {label,distanceKm:Math.max(0,found.along-progressKm),timing:String(timing).trim(),clearance,width,depth,movable:Boolean(item.movable)};
  }

  function nextMeta(next){
    if(!next)return 'Controleer route in Reisplanner';
    const details=[`${fmtKm(next.distanceKm)} resterend`];
    if(next.timing)details.push(`bediening ${next.timing}`);
    if(next.clearance!=null)details.push(`hoogte ${fmtM(next.clearance)}`);
    if(next.width!=null)details.push(`breedte ${fmtM(next.width)}`);
    if(next.depth!=null)details.push(`diepte ${fmtM(next.depth)}`);
    if(next.movable&&!next.timing)details.push('beweegbare brug');
    return details.join(' · ');
  }

  function legacyField(id,value){
    let el=$(id);
    if(!el){el=document.createElement('span');el.id=id;el.hidden=true;el.setAttribute('aria-hidden','true');(document.body||document.documentElement).appendChild(el)}
    el.textContent=String(value??'–');
  }

  function sourceBadge(){
    const heading=document.querySelector('#msMarineGlass .mg-route h3');if(!heading)return;
    let badge=heading.querySelector('.mg-route-source');
    if(!badge){badge=document.createElement('small');badge.className='mg-route-source';badge.style.cssText='margin-left:.55rem;font-size:.68em;font-weight:700;opacity:.72';heading.appendChild(badge)}
    badge.textContent='Waterkaarten GPX';
  }

  function apply(){
    const plan=activePlan();if(!plan)return;
    const points=routeCoordinates(plan);if(points.length<2)return;
    const model=routeModel(points,currentPosition());
    const total=number(plan.distanceKm)>0?number(plan.distanceKm):model.total;
    const progressKm=model.onRoute?Math.min(model.progressKm,total):0;
    const remaining=Math.max(0,total-progressKm);
    const liveSpeed=number($('mg-speed')?.textContent),planSpeed=number(plan.speed);
    const speed=liveSpeed!=null&&liveSpeed>=0.5?liveSpeed:(planSpeed>0?planSpeed:9);
    const hours=speed>0?remaining/speed:null;
    const eta=formatEta(hours),duration=formatDuration(hours),remainingText=fmtKm(remaining);
    const progress=total>0?Math.max(0,Math.min(100,Math.round(progressKm/total*100))):0;
    const next=nextBridgeOrLock(plan,points,model,progressKm);
    const nextLabel=next?.label||((Array.isArray(plan.routeObjects)&&plan.routeObjects.length)?'Geen volgende brug/sluis':'Infrastructuur wordt geladen…');
    const meta=nextMeta(next);

    window.MIJSERENITY_WATERKAARTEN_SUMMARY={remainingKm:remaining,eta,duration,next:nextLabel,nextMeta:meta,progress};
    legacyField('msnSmartEta',eta);legacyField('mscrEta',eta);legacyField('msnSmartRemaining',remainingText);legacyField('msnSmartDuration',duration);
    legacyField('msnSmartNext',nextLabel);legacyField('mscrNext',nextLabel);legacyField('mscrNextDist',meta);

    set('mgEta',eta);set('mgRemain',remainingText);set('mgDuration',duration);set('mgNext',nextLabel);set('mgNextMeta',meta);set('mgProgTxt',`${progress}%`);
    const bar=$('mgProg');if(bar)bar.style.width=`${progress}%`;
    sourceBadge();
  }

  function start(){
    const run=()=>requestAnimationFrame(apply);
    run();setTimeout(run,300);setTimeout(run,1500);setTimeout(run,3500);
    window.addEventListener('mijnserenity:waterkaarten-route-imported',event=>{if(event?.detail?.plan){window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=event.detail.plan;window.MIJSERENITY_IMPORTED_ROUTE_PLAN=event.detail.plan}run()},{passive:true});
    window.addEventListener('mijnserenity:waterkaarten-route-enriched',event=>{if(event?.detail?.plan){window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN=event.detail.plan;window.MIJSERENITY_IMPORTED_ROUTE_PLAN=event.detail.plan}run()},{passive:true});
    window.addEventListener('mijnserenity:routechange',run,{passive:true});window.addEventListener('pageshow',run,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)run()},{passive:true});
    const timer=setInterval(()=>{if(!document.hidden&&document.querySelector('#msMarineGlass:not([hidden])'))apply()},10000);
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
