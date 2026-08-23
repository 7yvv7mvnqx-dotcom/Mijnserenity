/* MijnSerenity — werkelijke richtingpijl naar haven vanuit actuele positie */
(()=>{
  'use strict';
  if(window.__msPoiBearing71826)return;
  window.__msPoiBearing71826=true;

  let browserPos=null;
  let positionRequested=false;

  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };

  function ll(point){
    if(Array.isArray(point)){
      const lon=num(point[0]);
      const lat=num(point[1]);
      return lat!=null&&lon!=null?[lat,lon]:null;
    }
    const lat=num(point?.lat??point?.latitude??point?.position?.lat);
    const lon=num(point?.lon??point?.lng??point?.longitude??point?.position?.lon);
    return lat!=null&&lon!=null?[lat,lon]:null;
  }

  function currentPosition(){
    const state=window.liveNavState||{};
    const sets=[state.trackPoints,state.track,state.history,state.gpsTrack,state.points,state.live?.points];
    for(const list of sets){
      if(Array.isArray(list)&&list.length){
        const point=ll(list.at(-1));
        if(point)return point;
      }
    }
    return ll({
      lat:state.currentLat??state.lat??state.position?.lat,
      lon:state.currentLon??state.lon??state.lng??state.position?.lon
    })||browserPos;
  }

  function requestBrowserPosition(){
    if(positionRequested||!navigator.geolocation)return;
    positionRequested=true;
    navigator.geolocation.getCurrentPosition(
      position=>{
        browserPos=[position.coords.latitude,position.coords.longitude];
        sync();
      },
      ()=>{},
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
    );
  }

  function allPois(){
    const lists=[];
    try{if(typeof poiCache!=='undefined')lists.push(poiCache)}catch{}
    lists.push(window.poiCache,window.ms71511OnlinePois,window.pois,window.poiData,window.poiList);
    const list=lists.find(value=>Array.isArray(value)&&value.length);
    return Array.isArray(list)?list:[];
  }

  function bearingDeg(from,to){
    const rad=Math.PI/180;
    const lat1=from[0]*rad;
    const lat2=to[0]*rad;
    const dLon=(to[1]-from[1])*rad;
    const y=Math.sin(dLon)*Math.cos(lat2);
    const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return (Math.atan2(y,x)/rad+360)%360;
  }

  function compass(deg){
    return ['N','NO','O','ZO','Z','ZW','W','NW'][Math.round(deg/45)%8];
  }

  function normalize(text){
    return String(text||'').trim().toLocaleLowerCase('nl-NL');
  }

  function findPoi(name,pois){
    const wanted=normalize(name);
    if(!wanted)return null;
    return pois.find(poi=>normalize(poi?.name)===wanted)||null;
  }

  function resetArrow(arrow){
    if(!arrow)return;
    arrow.textContent='›';
    arrow.removeAttribute('title');
    arrow.removeAttribute('aria-label');
    arrow.style.removeProperty('display');
    arrow.style.removeProperty('transform');
    arrow.style.removeProperty('transform-origin');
    arrow.style.removeProperty('font-size');
    arrow.style.removeProperty('font-style');
    arrow.style.removeProperty('font-weight');
    arrow.style.removeProperty('line-height');
    arrow.style.removeProperty('color');
    arrow.style.removeProperty('width');
    arrow.style.removeProperty('text-align');
  }

  function sync(){
    const rows=document.querySelectorAll('#mgPoi .mg-poi-row');
    if(!rows.length)return;

    const here=currentPosition();
    if(!here){
      requestBrowserPosition();
      rows.forEach(row=>resetArrow(row.querySelector('em')));
      return;
    }

    const pois=allPois();
    rows.forEach(row=>{
      const name=row.querySelector('strong')?.textContent||'';
      const poi=findPoi(name,pois);
      const target=ll(poi);
      const arrow=row.querySelector('em');
      if(!arrow||!target){
        resetArrow(arrow);
        return;
      }

      const bearing=bearingDeg(here,target);
      const northHalf=Math.cos(bearing*Math.PI/180)>=0;
      const direction=compass(bearing);
      const rounded=Math.round(bearing);

      arrow.textContent='↑';
      arrow.title=`${rounded}° ${direction} vanaf huidige positie`;
      arrow.setAttribute('aria-label',`Haven ligt op ${rounded} graden ${direction} vanaf huidige positie`);
      arrow.style.display='inline-block';
      arrow.style.width='28px';
      arrow.style.textAlign='center';
      arrow.style.transformOrigin='50% 50%';
      arrow.style.transform=`rotate(${bearing}deg)`;
      arrow.style.fontSize='24px';
      arrow.style.fontStyle='normal';
      arrow.style.fontWeight='900';
      arrow.style.lineHeight='1';
      arrow.style.color=northHalf?'#39d27d':'#ff5b5f';
    });
  }

  function start(){
    requestBrowserPosition();
    sync();
    const dashboard=document.getElementById('dashboard')||document.body;
    if(dashboard){
      new MutationObserver(()=>requestAnimationFrame(sync)).observe(dashboard,{childList:true,subtree:true});
    }
    [
      'mijnserenity-ha-state-updated',
      'mijnserenity-ha-connected',
      'mijnserenity:routechange',
      'mijnserenity:dashboard-ready'
    ].forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(sync),{passive:true}));
    setInterval(()=>{if(!document.hidden)sync()},3000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
