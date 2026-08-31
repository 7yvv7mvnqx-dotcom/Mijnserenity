/* MijnSerenity 8.20.2 — compacte AIS-aanvaringsradar op Start
   Begrensde netwerkrequests, geldige numerieke parsing en één rustige poller. */
(()=>{
  'use strict';
  if(window.__msDashboardCollisionRadar8202)return;
  window.__msDashboardCollisionRadar8202=true;

  const RANGE_NM=1.5;
  const FETCH_RADIUS_KM=3;
  const POLL_MS=30000;
  const REQUEST_TIMEOUT_MS=10000;
  const CACHE_KEY='mijnserenity-ais-last-position';
  const state={
    radar:null,pos:null,
    own:{sog:null,cog:null,heading:null,accuracy:null,source:''},
    targets:[],configured:null,online:false,busy:false,error:'',
    lastStatus:0,lastFetch:0,timer:null
  };

  const finite=value=>{
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };
  const angle=value=>{
    const n=finite(value);
    return n===null?null:((n%360)+360)%360;
  };
  const first=(...values)=>{
    for(const value of values){
      const n=finite(value);
      if(n!==null)return n;
    }
    return null;
  };

  function ensureStyle(){
    if(document.getElementById('mscr8202Style'))return;
    document.getElementById('mscr8201Style')?.remove();
    const style=document.createElement('style');
    style.id='mscr8202Style';
    style.textContent=`
      #msMarineGlass .mg-radar.mscr8202{width:clamp(142px,40vw,176px)!important;height:clamp(142px,40vw,176px)!important;right:16px!important;bottom:58px!important;border:1px solid rgba(157,210,231,.52)!important;background:radial-gradient(circle,rgba(12,43,50,.76),rgba(2,11,17,.97) 72%)!important;box-shadow:0 0 0 7px rgba(3,18,31,.42),inset 0 0 28px rgba(69,226,157,.10),0 10px 26px rgba(0,0,0,.32)!important;overflow:visible!important;cursor:pointer!important;touch-action:manipulation}
      #msMarineGlass .mg-radar.mscr8202:before,#msMarineGlass .mg-radar.mscr8202:after{content:none!important;display:none!important}
      #msMarineGlass .mg-radar.mscr8202.is-risk{border-color:#ff6262!important;box-shadow:0 0 0 7px rgba(255,77,77,.12),inset 0 0 30px rgba(255,77,77,.10),0 10px 26px rgba(0,0,0,.35)!important}
      #msMarineGlass .mg-radar.mscr8202.is-watch{border-color:#ffad38!important;box-shadow:0 0 0 7px rgba(255,159,26,.10),inset 0 0 30px rgba(255,159,26,.08),0 10px 26px rgba(0,0,0,.35)!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-svg{position:absolute;inset:5px;width:calc(100% - 10px);height:calc(100% - 10px);display:block;overflow:visible}
      #msMarineGlass .mg-radar.mscr8202 .mscr-badge{position:absolute!important;left:50%!important;top:8px!important;bottom:auto!important;z-index:3!important;transform:translateX(-50%)!important;padding:3px 7px!important;border-radius:999px!important;background:rgba(2,14,22,.84)!important;border:1px solid rgba(255,255,255,.14)!important;color:#eaf8ff!important;font-size:9px!important;line-height:1.2!important;font-weight:900!important;letter-spacing:.04em!important;white-space:nowrap!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-badge.ok{color:#7df29a!important;border-color:rgba(100,223,79,.34)!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-badge.warn{color:#ffc569!important;border-color:rgba(255,159,26,.38)!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-badge.bad{color:#ff8585!important;border-color:rgba(255,77,77,.36)!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-range{position:absolute!important;left:50%!important;bottom:8px!important;top:auto!important;z-index:3!important;transform:translateX(-50%)!important;color:#f4fbff!important;font-size:10px!important;font-weight:900!important;white-space:nowrap!important;text-shadow:0 2px 8px #000!important}
      #msMarineGlass .mg-radar.mscr8202 .mscr-summary{position:absolute!important;left:50%!important;bottom:-35px!important;top:auto!important;z-index:3!important;transform:translateX(-50%)!important;width:max-content!important;max-width:190px!important;padding:5px 9px!important;border-radius:999px!important;background:rgba(2,13,21,.93)!important;border:1px solid rgba(122,190,219,.24)!important;color:#d8e8ef!important;font-size:9px!important;line-height:1.15!important;font-weight:800!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;box-shadow:0 5px 16px rgba(0,0,0,.25)!important}
      #msMarineGlass .mg-radar.mscr8202.is-risk .mscr-summary{color:#ffd0d0!important;border-color:rgba(255,77,77,.45)!important}
      #msMarineGlass .mg-radar.mscr8202.is-watch .mscr-summary{color:#ffe0ae!important;border-color:rgba(255,159,26,.42)!important}
      @media(max-width:390px){#msMarineGlass .mg-radar.mscr8202{width:140px!important;height:140px!important;right:12px!important;bottom:56px!important}#msMarineGlass .mg-radar.mscr8202 .mscr-summary{max-width:165px!important;font-size:8px!important}}
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url,timeoutMs=REQUEST_TIMEOUT_MS){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error?.message||data?.error||`HTTP ${response.status}`);
      return data;
    }catch(error){
      if(error?.name==='AbortError')throw new Error('AIS-request duurde te lang');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  function textNum(id){
    const el=document.getElementById(id);
    if(!el)return null;
    const match=String(el.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?finite(match[0]):null;
  }

  function motion(){
    const nav=window.liveNavState||{};
    const speedKmh=first(nav.speedKmh,nav.speedKmH,textNum('mg-speed'));
    return {
      sog:first(nav.sog,nav.speedKnots,nav.speedKts,nav.speed?.knots,speedKmh!==null?speedKmh/1.852:null),
      cog:angle(first(nav.cog,nav.course,nav.courseOverGround,textNum('mg-course'))),
      heading:angle(first(nav.heading,nav.headingDeg,nav.compassHeading,nav.trueHeading)),
      accuracy:first(nav.accuracy,nav.gpsAccuracy)
    };
  }

  function livePosition(){
    const nav=window.liveNavState||{};
    let lat=first(nav.currentLat,nav.lat,nav.position?.lat,nav.position?.latitude);
    let lon=first(nav.currentLon,nav.lon,nav.lng,nav.position?.lon,nav.position?.lng,nav.position?.longitude);
    let timestamp=Date.now();

    if(lat===null||lon===null){
      for(const list of [nav.trackPoints,nav.track,nav.history,nav.gpsTrack,nav.points]){
        if(!Array.isArray(list)||!list.length)continue;
        const p=list[list.length-1]||{};
        lat=first(p.lat,p.latitude);
        lon=first(p.lon,p.lng,p.longitude);
        timestamp=first(p.time,p.timestamp)||Date.now();
        if(lat!==null&&lon!==null)break;
      }
    }
    if(lat===null||lon===null||Date.now()-timestamp>120000)return null;
    return {lat,lon,timestamp,...motion(),source:'Live GPS'};
  }

  function cachedPosition(){
    try{
      const p=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      const lat=finite(p?.lat),lon=finite(p?.lon),timestamp=finite(p?.timestamp);
      if(lat===null||lon===null||timestamp===null||Date.now()-timestamp>5*60*1000)return null;
      return {
        lat,lon,timestamp,
        accuracy:finite(p.accuracy),sog:finite(p.sog),cog:angle(p.cog),heading:angle(p.heading),
        source:'Recente GPS-cache'
      };
    }catch{return null}
  }

  function savePosition(p){
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({
        lat:p.lat,lon:p.lon,timestamp:p.timestamp||Date.now(),accuracy:p.accuracy,
        sog:p.sog,cog:p.cog,heading:p.heading
      }));
    }catch{}
  }

  function browserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet ondersteund'));
      navigator.geolocation.getCurrentPosition(position=>{
        const c=position.coords||{};
        const m=motion();
        resolve({
          lat:Number(c.latitude),lon:Number(c.longitude),timestamp:Number(position.timestamp)||Date.now(),
          accuracy:finite(c.accuracy),
          sog:first(finite(c.speed)!==null?Number(c.speed)*1.943844:null,m.sog),
          cog:angle(first(c.heading,m.cog)),heading:m.heading,source:'Apparaat-GPS'
        });
      },reject,{enableHighAccuracy:true,maximumAge:10000,timeout:10000});
    });
  }

  async function acquirePosition(){
    const live=livePosition();
    if(live)return live;
    try{
      const gps=await browserPosition();
      savePosition(gps);
      return gps;
    }catch{
      return cachedPosition();
    }
  }

  function get(obj,path){
    try{return path.split('.').reduce((value,key)=>value?.[key],obj)}catch{return undefined}
  }
  function value(obj,paths){
    for(const path of paths){
      const v=get(obj,path);
      if(v!==undefined&&v!==null&&v!=='')return v;
    }
    return null;
  }
  function normalize(raw,index){
    if(!raw||typeof raw!=='object')return null;
    const lat=finite(value(raw,['latitude','lat','position.latitude','position.lat','location.latitude','lastPosition.latitude']));
    const lon=finite(value(raw,['longitude','lon','lng','position.longitude','position.lon','position.lng','location.longitude','lastPosition.longitude']));
    if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    const mmsi=String(value(raw,['mmsi','MMSI','vessel.mmsi','ship.mmsi','identifiers.mmsi','id'])||'').replace(/\D/g,'').slice(0,9);
    const name=String(value(raw,['name','vesselName','shipName','vessel.name','ship.name','static.name'])||'').trim();
    const sog=finite(value(raw,['sog','speedOverGround','speed','position.sog','position.speed','navigation.sog','lastPosition.sog']));
    const cog=angle(value(raw,['cog','courseOverGround','course','position.cog','position.course','navigation.cog','lastPosition.cog']));
    return {
      id:mmsi||`${lat.toFixed(5)}:${lon.toFixed(5)}:${index}`,
      mmsi,name:name||(mmsi?`MMSI ${mmsi}`:'AIS-doel'),lat,lon,
      sog:sog!==null&&sog>=0?sog:null,cog
    };
  }
  function collect(input,out=[],depth=0){
    if(depth>7||input==null)return out;
    if(Array.isArray(input)){
      input.forEach(item=>collect(item,out,depth+1));
      return out;
    }
    if(typeof input==='object'){
      out.push(input);
      Object.values(input).forEach(item=>{
        if(item&&typeof item==='object')collect(item,out,depth+1);
      });
    }
    return out;
  }
  function targetsFrom(payload){
    const seen=new Set();
    const out=[];
    collect(payload).forEach((raw,index)=>{
      const target=normalize(raw,index);
      if(!target)return;
      const key=target.mmsi||`${target.lat.toFixed(5)}:${target.lon.toFixed(5)}`;
      if(seen.has(key))return;
      seen.add(key);
      out.push(target);
    });
    return out;
  }

  function relative(own,target){
    const lat0=own.lat*Math.PI/180;
    return {x:(target.lon-own.lon)*60*Math.cos(lat0),y:(target.lat-own.lat)*60};
  }
  function distance(own,target){
    const r=relative(own,target);
    return Math.hypot(r.x,r.y);
  }
  function velocity(sog,cog){
    const speed=finite(sog),course=angle(cog);
    if(speed===null)return null;
    if(speed<0.05)return {x:0,y:0};
    if(course===null)return null;
    const rad=course*Math.PI/180;
    return {x:speed*Math.sin(rad)/60,y:speed*Math.cos(rad)/60};
  }
  function cpa(own,target){
    const r=relative(own,target);
    const tv=velocity(target.sog,target.cog);
    const ov=velocity(own.sog,own.cog);
    if(!tv||!ov)return null;
    const vx=tv.x-ov.x,vy=tv.y-ov.y,vv=vx*vx+vy*vy;
    if(vv<1e-9)return {nm:Math.hypot(r.x,r.y),min:null};
    const min=-(r.x*vx+r.y*vy)/vv;
    if(min<=0)return {nm:Math.hypot(r.x,r.y),min};
    return {nm:Math.hypot(r.x+vx*min,r.y+vy*min),min};
  }
  function classify(target){
    const distanceM=target.distanceNm*1852;
    if(!target.cpa){
      if(distanceM<50)return 'risk';
      if(distanceM<120)return 'watch';
      return 'safe';
    }
    const cpaM=target.cpa.nm*1852;
    const future=Number.isFinite(target.cpa.min)&&target.cpa.min>0&&target.cpa.min<=30;
    if((future&&cpaM<50)||distanceM<50)return 'risk';
    if((future&&cpaM<200)||distanceM<120)return 'watch';
    return 'safe';
  }
  function enrich(list,own){
    const rank={risk:0,watch:1,safe:2};
    return list.map(target=>{
      const item={...target,distanceNm:distance(own,target),cpa:cpa(own,target)};
      item.level=classify(item);
      return item;
    }).filter(target=>target.distanceNm<=RANGE_NM*1.25)
      .sort((a,b)=>rank[a.level]-rank[b.level]||a.distanceNm-b.distanceNm)
      .slice(0,20);
  }

  function color(level){return level==='risk'?'#ff4d4d':level==='watch'?'#ff9f1a':'#65ea72'}
  function point(target){
    const r=relative(state.pos,target);
    const radius=80;
    return {x:100+r.x/RANGE_NM*radius,y:100-r.y/RANGE_NM*radius};
  }
  function targetSvg(target){
    const p=point(target);
    if(Math.hypot(p.x-100,p.y-100)>84)return '';
    let vx=p.x,vy=p.y;
    if(Number.isFinite(target.sog)&&Number.isFinite(target.cog)){
      const d=target.sog*0.1,rad=target.cog*Math.PI/180;
      vx+=d*Math.sin(rad)/RANGE_NM*80;
      vy-=d*Math.cos(rad)/RANGE_NM*80;
    }
    const c=color(target.level);
    return `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${vx.toFixed(1)}" y2="${vy.toFixed(1)}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="${c}" opacity=".20"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.6" fill="${c}" stroke="#fff" stroke-width="1.3"/>`;
  }
  function radarSvg(){
    const rotation=angle(state.own.heading??state.own.cog)??0;
    const visible=state.targets.filter(target=>target.distanceNm<=RANGE_NM).slice(0,12);
    return `<svg class="mscr-svg" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="84" fill="rgba(1,12,18,.44)" stroke="rgba(170,216,233,.56)" stroke-width="1"/><g fill="none" stroke="rgba(94,225,165,.22)" stroke-width="1"><circle cx="100" cy="100" r="27"/><circle cx="100" cy="100" r="53"/><circle cx="100" cy="100" r="80"/><line x1="20" y1="100" x2="180" y2="100"/><line x1="100" y1="20" x2="100" y2="180"/></g>${visible.map(targetSvg).join('')}<g transform="rotate(${rotation.toFixed(1)} 100 100)"><path d="M100 84 L108 112 L100 108 L92 112 Z" fill="#071720" stroke="#f7fbff" stroke-width="2"/><line x1="100" y1="84" x2="100" y2="69" stroke="#7af19a" stroke-width="2" stroke-linecap="round"/></g></svg>`;
  }
  function fmtCpa(target){
    if(!Number.isFinite(target?.cpa?.nm))return '';
    const metres=target.cpa.nm*1852;
    return `CPA ${metres<1000?Math.round(metres)+' m':target.cpa.nm.toFixed(2)+' NM'}`;
  }
  function fmtTcpa(target){
    return Number.isFinite(target?.cpa?.min)&&target.cpa.min>0?`${Math.round(target.cpa.min)} min`:'';
  }

  function mount(){
    ensureStyle();
    const radar=document.querySelector('#msMarineGlass .mg-radar');
    if(!radar)return null;
    if(state.radar!==radar){
      state.radar=radar;
      radar.classList.remove('mscr8201');
      radar.classList.add('mscr8202');
      radar.setAttribute('role','button');
      radar.setAttribute('tabindex','0');
      const open=event=>{
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if(typeof window.captainNavigate==='function')window.captainNavigate('ais');
        else window.ms708GoToPage?.('ais',true);
      };
      radar.onclick=open;
      radar.onkeydown=event=>{
        if(event.key==='Enter'||event.key===' ')open(event);
      };
    }
    return radar;
  }

  function render(){
    const radar=mount();
    if(!radar)return;
    const visible=state.targets.filter(target=>target.distanceNm<=RANGE_NM);
    const worst=visible[0];
    const risk=visible.some(target=>target.level==='risk');
    const watch=!risk&&visible.some(target=>target.level==='watch');
    radar.classList.toggle('is-risk',risk);
    radar.classList.toggle('is-watch',watch);

    let badgeClass='bad',badge='AIS –',summary='AIS offline';
    if(state.busy){
      badgeClass='warn';badge='AIS…';summary='AIS laden…';
    }else if(state.configured===false){
      badgeClass='warn';badge='AIS !';summary='AIS instellen';
    }else if(state.online){
      badgeClass='ok';badge=`AIS ${visible.length}`;
      if(!visible.length)summary='Geen doelen binnen 1,5 NM';
      else if(risk||watch){
        summary=[risk?'Risico':'Opletten',fmtCpa(worst),fmtTcpa(worst)].filter(Boolean).join(' · ');
      }else{
        summary=`${visible.length} doel${visible.length===1?'':'en'} · dichtst ${visible[0].distanceNm.toFixed(2)} NM`;
      }
    }else if(!state.pos){
      summary='GPS nodig';
    }else if(state.error){
      summary='AIS niet beschikbaar';
    }

    radar.innerHTML=`<span class="mscr-badge ${badgeClass}">${badge}</span>${radarSvg()}<span class="mscr-range">1.5 NM</span><span class="mscr-summary">${summary}</span>`;
    radar.setAttribute('aria-label',`Aanvaringsradar. ${summary}. Tik voor details.`);
    window.MIJSERENITY_DASHBOARD_AIS={
      online:state.online,configured:state.configured,count:visible.length,risk,watch,
      lastFetch:state.lastFetch,error:state.error||''
    };
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ais-update',{detail:window.MIJSERENITY_DASHBOARD_AIS}));
  }

  async function status(){
    if(state.configured!==null&&Date.now()-state.lastStatus<5*60*1000)return state.configured;
    const data=await fetchJson('/.netlify/functions/ais?mode=status');
    state.configured=Boolean(data.configured);
    state.lastStatus=Date.now();
    return state.configured;
  }

  async function fetchTargets(){
    const query=new URLSearchParams({
      mode:'nearby',lat:state.pos.lat.toFixed(6),lon:state.pos.lon.toFixed(6),
      radiusKm:String(FETCH_RADIUS_KM),limit:'50'
    });
    const data=await fetchJson(`/.netlify/functions/ais?${query}`);
    state.targets=enrich(targetsFrom(data?.data??data),state.pos);
    state.online=true;
    state.lastFetch=Date.now();
    state.error='';
  }

  async function refresh(){
    if(state.busy)return;
    state.busy=true;
    render();
    try{
      const position=await acquirePosition();
      if(!position)throw new Error('Geen actuele GPS-positie');
      state.pos={lat:Number(position.lat),lon:Number(position.lon)};
      const m=motion();
      state.own={
        sog:first(position.sog,m.sog),cog:angle(first(position.cog,m.cog)),
        heading:angle(first(position.heading,m.heading)),accuracy:first(position.accuracy,m.accuracy),
        source:position.source||'GPS'
      };
      savePosition({...position,...state.own,timestamp:position.timestamp||Date.now()});
      if(await status())await fetchTargets();
      else{
        state.online=false;
        state.targets=[];
        state.error='AIS-databron niet ingesteld';
      }
    }catch(error){
      state.online=false;
      state.targets=[];
      state.error=error?.message||'AIS niet beschikbaar';
    }finally{
      state.busy=false;
      render();
    }
  }

  function dashboardVisible(){
    const dashboard=document.getElementById('dashboard');
    return !document.hidden&&dashboard&&!dashboard.classList.contains('hidden')&&Boolean(document.querySelector('#msMarineGlass .mg-radar'));
  }

  function start(){
    mount();
    render();
    if(dashboardVisible())refresh();
    clearInterval(state.timer);
    state.timer=setInterval(()=>{
      if(dashboardVisible())refresh();
    },POLL_MS);
  }

  [0,250,800,1600].forEach(ms=>setTimeout(start,ms));
  window.addEventListener('mijnserenity:dashboard-ready',start,{passive:true});
  window.addEventListener('pageshow',()=>{mount();if(dashboardVisible())refresh()},{passive:true});
  window.addEventListener('online',()=>{if(dashboardVisible())refresh()},{passive:true});
  window.addEventListener('offline',()=>{
    state.online=false;
    state.targets=[];
    state.error='Geen internetverbinding';
    render();
  },{passive:true});
})();