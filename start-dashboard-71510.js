/* MijnSerenity 8.25.7 — live snelheid op Start in km/u */
(()=>{
  'use strict';
  if(window.__msSpeedKmh8257)return;
  window.__msSpeedKmh8257=true;

  const BUILD='8.25.7';
  const BASE='https://cdn.jsdelivr.net/gh/7yvv7mvnqx-dotcom/Mijnserenity@8c1e3094f221de00245cad65e7c962a19d7dd3c7/start-dashboard-71510.js';
  const SPEED_ID='ms8234Speed';

  let speedObserver=null;
  let speedObserverNode=null;
  let passiveWatchId=null;
  let lastPassivePoint=null;
  let passiveSpeedKmh=0;
  let lastPassiveAt=0;
  let syncTimer=null;

  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(String(value).replace(',','.'));
    return Number.isFinite(n)?n:null;
  };

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
  }

  function dashboardVisible(){
    if(document.hidden)return false;
    const app=document.getElementById('appView');
    const dashboard=document.getElementById('dashboard');
    if(!app||!dashboard)return false;
    if(app.classList.contains('hidden')||app.getAttribute('aria-hidden')==='true')return false;
    return !dashboard.classList.contains('hidden')&&dashboard.getAttribute('aria-hidden')!=='true';
  }

  function formatKmh(value){
    const speed=Math.max(0,Number(value)||0);
    if(speed<0.05)return '0 km/u';
    return `${speed.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km/u`;
  }

  function renderSpeed(value){
    const node=document.getElementById(SPEED_ID);
    if(!node)return false;
    const text=formatKmh(value);
    if(node.textContent!==text)node.textContent=text;
    node.classList.remove('is-missing');
    return true;
  }

  function liveRecordedSpeed(){
    const state=window.liveNavState||{};
    if(String(state.status||'').toLowerCase()!=='active')return null;
    const speed=finite(state.speedKmh);
    if(speed!==null)return Math.max(0,speed);

    const liveNode=document.getElementById('liveSpeedKmh');
    const match=String(liveNode?.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Math.max(0,Number(match[0])):null;
  }

  function distanceMeters(a,b){
    if(!a||!b)return 0;
    const rad=Math.PI/180;
    const lat1=a.lat*rad,lat2=b.lat*rad;
    const dLat=(b.lat-a.lat)*rad;
    const dLon=(b.lon-a.lon)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }

  function passivePosition(position){
    const coords=position?.coords||{};
    const lat=finite(coords.latitude),lon=finite(coords.longitude);
    if(lat===null||lon===null)return;

    const now=Number(position.timestamp)||Date.now();
    const accuracy=finite(coords.accuracy);
    const rawMps=finite(coords.speed);
    let candidate=rawMps!==null?Math.max(0,rawMps*3.6):null;

    const current={lat,lon,time:now,accuracy};
    if(candidate===null&&lastPassivePoint){
      const seconds=(now-lastPassivePoint.time)/1000;
      if(seconds>=1.5&&seconds<=20&&(accuracy===null||accuracy<=80)){
        const meters=distanceMeters(lastPassivePoint,current);
        const noiseFloor=Math.max(3,Math.min(8,(accuracy||8)*0.35));
        candidate=meters<=noiseFloor?0:(meters/seconds)*3.6;
      }
    }
    lastPassivePoint=current;

    if(candidate===null){
      if(Date.now()-lastPassiveAt>5000)passiveSpeedKmh=0;
      renderSpeed(passiveSpeedKmh);
      return;
    }

    if(candidate<0.6)candidate=0;
    if(candidate>80)return;
    const response=passiveSpeedKmh>0?0.5:1;
    passiveSpeedKmh=(passiveSpeedKmh*(1-response))+(candidate*response);
    if(passiveSpeedKmh<0.35)passiveSpeedKmh=0;
    lastPassiveAt=Date.now();
    renderSpeed(passiveSpeedKmh);
  }

  function stopPassiveWatch(){
    if(passiveWatchId!==null&&navigator.geolocation){
      try{navigator.geolocation.clearWatch(passiveWatchId)}catch(_){}
    }
    passiveWatchId=null;
    lastPassivePoint=null;
  }

  function ensurePassiveWatch(){
    if(passiveWatchId!==null||!navigator.geolocation||!dashboardVisible())return;
    if(liveRecordedSpeed()!==null)return;
    try{
      passiveWatchId=navigator.geolocation.watchPosition(
        passivePosition,
        ()=>{},
        {enableHighAccuracy:true,maximumAge:2000,timeout:15000}
      );
    }catch(_){passiveWatchId=null}
  }

  function observeSpeedNode(){
    const node=document.getElementById(SPEED_ID);
    if(!node||node===speedObserverNode)return;
    speedObserver?.disconnect();
    speedObserverNode=node;
    speedObserver=new MutationObserver(()=>{
      const text=String(node.textContent||'');
      if(/\bkn\b/i.test(text)||!/km\/u/i.test(text))requestAnimationFrame(syncSpeed);
    });
    speedObserver.observe(node,{subtree:true,childList:true,characterData:true});
  }

  function syncSpeed(){
    syncBuild();
    observeSpeedNode();

    const live=liveRecordedSpeed();
    if(live!==null){
      stopPassiveWatch();
      renderSpeed(live);
      return;
    }

    if(!dashboardVisible()){
      stopPassiveWatch();
      return;
    }

    ensurePassiveWatch();
    const fresh=Date.now()-lastPassiveAt<=7000;
    renderSpeed(fresh?passiveSpeedKmh:0);
  }

  function protectBaseRefresh(){
    const original=window.ms8210RefreshStart;
    if(typeof original!=='function'||original.__ms8257Wrapped)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      requestAnimationFrame(syncSpeed);
      return result;
    };
    wrapped.__ms8257Wrapped=true;
    window.ms8210RefreshStart=wrapped;
  }

  function startFix(){
    syncBuild();
    protectBaseRefresh();
    syncSpeed();

    ['mijnserenity:dashboard-ready','mijnserenity:boot-complete','mijnserenity:routechange','mijnserenity:start-requested','pageshow','online']
      .forEach(type=>window.addEventListener(type,()=>{
        protectBaseRefresh();
        requestAnimationFrame(syncSpeed);
      },{passive:true}));

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stopPassiveWatch();
      else syncSpeed();
    },{passive:true});

    if(syncTimer)clearInterval(syncTimer);
    syncTimer=setInterval(()=>{
      protectBaseRefresh();
      syncSpeed();
    },1000);

    [0,200,600,1300,2600,5000].forEach(ms=>setTimeout(()=>{
      protectBaseRefresh();
      syncSpeed();
    },ms));

    console.info(`MijnSerenity ${BUILD}: snelheid op Start actief in km/u.`);
  }

  function loadBase(){
    if(window.__msPolish8256){
      startFix();
      return;
    }
    const script=document.createElement('script');
    script.src=BASE;
    script.async=false;
    script.crossOrigin='anonymous';
    script.onload=startFix;
    script.onerror=()=>{
      console.error('MijnSerenity 8.25.6 basis kon niet worden geladen.');
      startFix();
    };
    document.head.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBase,{once:true});
  else loadBase();
})();
