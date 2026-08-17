/* MijnSerenity 7.18.5 — veilige statuspolish */
(()=>{
  'use strict';
  if(window.__msMarineGlassPolish7185)return;
  window.__msMarineGlassPolish7185=true;
  const BUILD='7.18.5';
  const $=id=>document.getElementById(id);
  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function latestPosition(){
    const state=window.liveNavState||{};
    const direct={
      lat:state.currentLat??state.lat??state.position?.lat??state.position?.latitude,
      lon:state.currentLon??state.lon??state.lng??state.position?.lon??state.position?.lng??state.position?.longitude,
      accuracy:state.accuracy??state.gpsAccuracy??state.position?.accuracy
    };
    if(Number.isFinite(Number(direct.lat))&&Number.isFinite(Number(direct.lon)))return direct;
    for(const list of [state.trackPoints,state.track,state.history,state.gpsTrack,state.points]){
      if(!Array.isArray(list)||!list.length)continue;
      const p=list[list.length-1]||{};
      const lat=p.lat??p.latitude;
      const lon=p.lon??p.lng??p.longitude;
      if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lon)))return {lat,lon,accuracy:p.accuracy};
    }
    return null;
  }

  function syncGps(){
    const pos=latestPosition();
    if(pos){
      const accuracy=num(pos.accuracy);
      set('mgGps',accuracy!=null&&accuracy>0?`Actief · ±${Math.round(accuracy)} m`:'Actief');
    }else{
      set('mgGps','Geen fix');
    }
  }

  function routeIsActive(){
    const plan=window.plannerCurrentPlan||{};
    const state=window.liveNavState||{};
    const arrays=[
      plan.routeCoordinates,
      plan.route?.coordinates,
      plan.routeGeometry?.coordinates,
      plan.points,
      state.routeCoordinates,
      state.route,
      state.plannedRoute
    ];
    if(arrays.some(value=>Array.isArray(value)&&value.length>1))return true;
    if(Array.isArray(plan.segments)&&plan.segments.some(segment=>Array.isArray(segment?.routeCoordinates)&&segment.routeCoordinates.length>1))return true;
    return Boolean(plan.destination||plan.destinationName||state.destination||state.destinationName);
  }

  function syncRoutePresentation(){
    if(routeIsActive()){
      const speed=num($('mg-speed')?.textContent);
      const eta=String($('mgEta')?.textContent||'').trim();
      if((!eta||eta==='–'||eta==='-')&&(speed==null||speed<0.3))set('mgEta','Na vertrek');
      return;
    }
    set('mgEta','Geen actieve route');
    set('mgRemain','–');
    set('mgDuration','–');
    set('mgNext','Geen actieve route');
    set('mgNextMeta','Kies een bestemming');
    set('mgProgTxt','0%');
    const bar=$('mgProg');
    if(bar)bar.style.width='0%';
  }

  function syncEnergyWarning(){
    const battery=document.querySelector('#msMarineGlass .mg-battery');
    if(!battery)return;
    const voltage=num($('mgVolt')?.textContent);
    const low=voltage!=null&&voltage>0&&voltage<11.8;
    battery.classList.toggle('mg-low-voltage',low);
    battery.title=low?'Lage gemeten accuspanning — controleer accu en SmartShunt-instellingen':'';
  }

  function syncAlarmPresentation(){
    const alarmButton=document.querySelector('#msMarineGlass .mg-status .alarm');
    if(!alarmButton)return;
    const count=num($('mgAlarm')?.textContent)||0;
    alarmButton.classList.toggle('has-active-alarm',count>0);
  }

  function syncInternet(){
    if(!navigator.onLine){set('mgNet','Offline');return}
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const type=String(connection?.effectiveType||'').toUpperCase();
    set('mgNet',type||'Online');
  }

  function dashboardVisible(){
    const glass=$('msMarineGlass');
    if(!glass||glass.hidden)return false;
    const rect=glass.getBoundingClientRect();
    return rect.width>0&&rect.height>0;
  }

  function polish(){
    syncVersion();
    syncInternet();
    if(!dashboardVisible())return;
    syncGps();
    syncRoutePresentation();
    syncEnergyWarning();
    syncAlarmPresentation();
  }

  function start(){
    polish();
    setTimeout(polish,250);
    setTimeout(polish,1200);
    setTimeout(polish,3200);
    const timer=setInterval(()=>{if(!document.hidden)polish()},5000);
    window.addEventListener('mijnserenity:modules-ready',polish,{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(polish,50),{passive:true});
    window.addEventListener('online',polish,{passive:true});
    window.addEventListener('offline',polish,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)polish()},{passive:true});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
