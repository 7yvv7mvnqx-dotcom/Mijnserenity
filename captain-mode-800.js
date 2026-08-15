(function(){
  'use strict';
  if(window.__msCaptainMode800)return;
  window.__msCaptainMode800=true;

  const ENTER_KMH=2.0;
  const EXIT_KMH=1.0;
  const ENTER_MS=5000;
  const EXIT_MS=25000;
  const SAMPLE_MS=750;

  let active=false;
  let enterSince=0;
  let exitSince=0;
  let lastSpeed=0;
  let awaySince=0;
  let lastDashboardOpen=0;
  const RETURN_MS=10000;

  function finite(value){
    if(value===null||value===''||typeof value==='boolean')return null;
    const number=Number(String(value).replace(',','.'));
    return Number.isFinite(number)?number:null;
  }

  function speedFromState(){
    try{
      const state=window.liveNavState||{};
      const candidates=[
        state.speedKmh,state.speed,state.currentSpeedKmh,
        state.navigation?.speedKmh,state.navigation?.speed,
        state.gps?.speedKmh,state.gps?.speed,
        state.live?.speedKmh,state.live?.speed
      ];
      for(const raw of candidates){
        const value=finite(raw);
        if(value!==null && value>=0 && value<120){
          // Alleen expliciete km/u-velden zijn direct bruikbaar. Generieke GPS speed
          // kan m/s zijn, daarom heeft de zichtbare dashboardwaarde hieronder voorrang.
          if(raw===state.speedKmh||raw===state.currentSpeedKmh||raw===state.navigation?.speedKmh||raw===state.gps?.speedKmh||raw===state.live?.speedKmh)return value;
        }
      }
    }catch(e){}
    return null;
  }

  function speedFromDashboard(){
    const value=document.getElementById('ms71510Speed')?.textContent?.trim();
    const number=finite(value);
    return number!==null&&number>=0&&number<120?number:null;
  }

  function getSpeed(){
    // Het startdashboard wordt door de bestaande GPS/live-logica bijgewerkt en is
    // daarom de meest stabiele bron voor precies de km/u die Michel in beeld ziet.
    return speedFromDashboard() ?? speedFromState() ?? 0;
  }

  function ensureBadge(){
    let badge=document.getElementById('msCaptainModeBadge');
    if(badge)return badge;
    const dashboard=document.getElementById('ms71510Dashboard');
    if(!dashboard)return null;
    badge=document.createElement('div');
    badge.id='msCaptainModeBadge';
    badge.setAttribute('role','status');
    badge.setAttribute('aria-live','polite');
    badge.textContent='CAPTAIN MODE · VAREN';
    dashboard.prepend(badge);
    return badge;
  }

  function dashboardActive(){
    const nav=document.querySelector('.bottom-nav');
    const selected=nav?.querySelector('.bottom-nav-item.active,[aria-current="page"]');
    if(selected?.dataset?.target)return selected.dataset.target==='dashboard';
    const portal=document.getElementById('msProDashboard');
    return Boolean(portal&&!portal.hidden&&getComputedStyle(portal).display!=='none');
  }

  function openDashboard(reason){
    const now=Date.now();
    if(now-lastDashboardOpen<1500)return;
    lastDashboardOpen=now;
    awaySince=0;
    try{
      if(typeof window.ms708GoToPage==='function'){
        window.ms708GoToPage('dashboard',true);
      }else if(typeof window.captainNavigate==='function'){
        window.captainNavigate('dashboard');
      }else{
        document.querySelector('.bottom-nav-item[data-target="dashboard"],.tab[data-target="dashboard"]')?.click();
      }
      window.dispatchEvent(new CustomEvent('mscaptaindashboardopen',{detail:{reason,speedKmh:lastSpeed}}));
    }catch(e){}
  }

  function setActive(next,reason){
    if(active===next)return;
    active=next;
    document.documentElement.classList.toggle('ms-captain-sailing',active);
    document.body?.classList.toggle('ms-captain-sailing',active);
    const badge=ensureBadge();
    if(badge)badge.textContent=active?'CAPTAIN MODE · VAREN':'CAPTAIN MODE';
    try{localStorage.setItem('ms-captain-last-state',active?'sailing':'idle')}catch(e){}
    window.dispatchEvent(new CustomEvent('mscaptainmodechange',{detail:{active,speedKmh:lastSpeed,reason}}));
    if(active)setTimeout(()=>openDashboard('vaart-gestart'),100);
    else awaySince=0;
  }

  function tick(){
    ensureBadge();
    const now=Date.now();
    const speed=getSpeed();
    lastSpeed=Number.isFinite(speed)?speed:0;

    if(!active){
      exitSince=0;
      if(lastSpeed>=ENTER_KMH){
        if(!enterSince)enterSince=now;
        if(now-enterSince>=ENTER_MS)setActive(true,'speed-enter');
      }else{
        enterSince=0;
      }
    }else{
      enterSince=0;
      if(!dashboardActive()){
        if(!awaySince)awaySince=now;
        if(now-awaySince>=RETURN_MS)openDashboard('automatisch-terug');
      }else{
        awaySince=0;
      }
      if(lastSpeed<=EXIT_KMH){
        if(!exitSince)exitSince=now;
        if(now-exitSince>=EXIT_MS)setActive(false,'speed-exit');
      }else{
        exitSince=0;
      }
    }
  }

  function init(){
    ensureBadge();
    tick();
    setInterval(tick,SAMPLE_MS);
  }

  window.msCaptainMode={
    get active(){return active},
    get speedKmh(){return lastSpeed},
    thresholds:{enterKmh:ENTER_KMH,exitKmh:EXIT_KMH,enterMs:ENTER_MS,exitMs:EXIT_MS,returnMs:RETURN_MS},
    openDashboard(){openDashboard('manual')},
    forceOn(){setActive(true,'manual')},
    forceOff(){setActive(false,'manual')}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
