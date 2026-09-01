/* MijnSerenity 8.20.5 — AIS Aanvaringsradar
   Toon nooit "0 doelen" of "veilig" zolang de AIS-databron niet aantoonbaar online is. */
(()=>{
  'use strict';
  if(window.__MS_COLLISION_RADAR_8205)return;
  window.__MS_COLLISION_RADAR_8205=true;

  const VERSION='8.20.5';
  const RANGE_NM=1.5;
  const FETCH_RADIUS_KM=3;
  const POLL_MS=30000;
  const GPS_MAX_AGE=120000;
  const POSITION_CACHE_MAX_AGE=5*60*1000;
  const POSITION_CACHE_KEY='mijnserenity-ais-last-position';
  const REQUEST_TIMEOUT_MS=12000;

  const state={
    mounted:false,root:null,position:null,
    own:{sog:null,cog:null,heading:null,accuracy:null,source:''},
    targets:[],providerConfigured:null,providerOnline:false,providerReason:'',lastFetch:null,
    lastError:'',busy:false,timer:null,selected:null
  };

  const finite=value=>{
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'&&value.trim()==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const firstFinite=(...values)=>{
    for(const value of values){const n=finite(value);if(n!==null)return n}
    return null;
  };
  const getPath=(obj,path)=>{try{return path.split('.').reduce((value,key)=>value?.[key],obj)}catch{return undefined}};
  const firstValue=(obj,paths)=>{
    for(const path of paths){const value=getPath(obj,path);if(value!==undefined&&value!==null&&value!=='')return value}
    return null;
  };
  const numValue=(obj,paths)=>finite(firstValue(obj,paths));
  const normalizeAngle=value=>{
    const n=finite(value);
    return n===null?null:((n%360)+360)%360;
  };

  async function fetchJson(url){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok){
        const err=new Error(payload?.error?.message||payload?.error||`HTTP ${response.status}`);
        err.code=payload?.error?.code||'';
        throw err;
      }
      return payload;
    }catch(error){
      if(error?.name==='AbortError')throw new Error('AIS-request duurde te lang');
      throw error;
    }finally{clearTimeout(timer)}
  }

  function ownFromLiveState(){
    const nav=window.liveNavState||{};
    let point=null;
    const lat=firstFinite(nav.currentLat,nav.lat,nav.position?.lat,nav.position?.latitude);
    const lon=firstFinite(nav.currentLon,nav.lon,nav.lng,nav.position?.lon,nav.position?.lng,nav.position?.longitude);
    const directTime=firstFinite(nav.timestamp,nav.time,nav.position?.timestamp,nav.position?.time)||Date.now();
    if(lat!==null&&lon!==null){
      point={lat,lon,timestamp:directTime};
    }else{
      for(const list of [nav.trackPoints,nav.track,nav.history,nav.gpsTrack,nav.points]){
        if(!Array.isArray(list)||!list.length)continue;
        const item=list[list.length-1]||{};
        const pLat=firstFinite(item.lat,item.latitude),pLon=firstFinite(item.lon,item.lng,item.longitude);
        if(pLat!==null&&pLon!==null){
          point={lat:pLat,lon:pLon,timestamp:firstFinite(item.time,item.timestamp)||Date.now()};
          break;
        }
      }
    }
    if(!point||Date.now()-Number(point.timestamp||0)>GPS_MAX_AGE)return null;
    const kmh=firstFinite(nav.speedKmh,nav.speedKmH);
    return {
      ...point,
      sog:firstFinite(nav.sog,nav.speedKnots,nav.speedKts,nav.speed?.knots,kmh!==null?kmh/1.852:null),
      cog:normalizeAngle(firstFinite(nav.cog,nav.course,nav.courseOverGround,nav.position?.heading)),
      heading:normalizeAngle(firstFinite(nav.heading,nav.compassHeading,nav.trueHeading)),
      accuracy:firstFinite(nav.accuracy,nav.gpsAccuracy,nav.position?.accuracy),
      source:'Live GPS'
    };
  }

  function cachedPosition(){
    try{
      const value=JSON.parse(localStorage.getItem(POSITION_CACHE_KEY)||'null');
      const lat=finite(value?.lat),lon=finite(value?.lon),timestamp=finite(value?.timestamp);
      if(lat===null||lon===null||timestamp===null||Date.now()-timestamp>POSITION_CACHE_MAX_AGE)return null;
      return {lat,lon,timestamp,accuracy:finite(value?.accuracy),sog:finite(value?.sog),
        cog:normalizeAngle(value?.cog),heading:normalizeAngle(value?.heading),source:'Recente GPS-cache'};
    }catch{return null}
  }

  function savePosition(pos){
    try{
      localStorage.setItem(POSITION_CACHE_KEY,JSON.stringify({
        lat:pos.lat,lon:pos.lon,timestamp:pos.timestamp||Date.now(),accuracy:pos.accuracy,
        sog:pos.sog,cog:pos.cog,heading:pos.heading
      }));
    }catch{}
  }

  function browserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet ondersteund'));
      navigator.geolocation.getCurrentPosition(position=>{
        const c=position.coords||{},speed=finite(c.speed);
        resolve({lat:Number(c.latitude),lon:Number(c.longitude),timestamp:Number(position.timestamp)||Date.now(),
          accuracy:finite(c.accuracy),sog:speed!==null?speed*1.943844:null,
          cog:normalizeAngle(c.heading),heading:null,source:'Apparaat-GPS'});
      },reject,{enableHighAccuracy:true,maximumAge:10000,timeout:10000});
    });
  }

  async function acquirePosition(force=false){
    const live=ownFromLiveState();
    if(live&&!force)return live;
    try{
      const gps=await browserPosition();
      if(Number.isFinite(gps.lat)&&Number.isFinite(gps.lon)){savePosition(gps);return gps}
    }catch{}
    return live||cachedPosition();
  }

  function normalizeTarget(raw,index){
    if(!raw||typeof raw!=='object')return null;
    const lat=numValue(raw,['latitude','lat','position.latitude','position.lat','location.latitude','location.lat','lastPosition.latitude','lastPosition.lat','coordinates.latitude']);
    const lon=numValue(raw,['longitude','lon','lng','position.longitude','position.lon','position.lng','location.longitude','location.lon','location.lng','lastPosition.longitude','lastPosition.lon','coordinates.longitude']);
    if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    const mmsi=String(firstValue(raw,['mmsi','MMSI','vessel.mmsi','ship.mmsi','identifiers.mmsi','id'])||'').replace(/\D/g,'').slice(0,9);
    const name=String(firstValue(raw,['name','vesselName','shipName','vessel.name','ship.name','static.name'])||'').trim();
    const sog=numValue(raw,['sog','speedOverGround','speed','position.sog','position.speed','navigation.sog','navigation.speedOverGround','lastPosition.sog']);
    const cog=normalizeAngle(numValue(raw,['cog','courseOverGround','course','position.cog','position.course','navigation.cog','navigation.courseOverGround','lastPosition.cog']));
    const heading=normalizeAngle(numValue(raw,['heading','trueHeading','position.heading','navigation.heading','lastPosition.heading']));
    return {id:mmsi||`${lat.toFixed(5)}:${lon.toFixed(5)}:${index}`,mmsi,
      name:name||(mmsi?`MMSI ${mmsi}`:'Onbekend AIS-doel'),lat,lon,
      sog:sog!==null&&sog>=0?sog:null,cog,heading};
  }

  function collectObjects(value,out=[],depth=0){
    if(depth>7||value===null||value===undefined)return out;
    if(Array.isArray(value)){for(const item of value)collectObjects(item,out,depth+1);return out}
    if(typeof value==='object'){
      out.push(value);
      for(const child of Object.values(value))if(child&&typeof child==='object')collectObjects(child,out,depth+1);
    }
    return out;
  }

  function targetsFromPayload(payload){
    const objects=collectObjects(payload,[]),seen=new Set(),targets=[];
    for(let i=0;i<objects.length;i++){
      const target=normalizeTarget(objects[i],i);
      if(!target)continue;
      const key=target.mmsi||`${target.lat.toFixed(5)}:${target.lon.toFixed(5)}`;
      if(seen.has(key))continue;
      seen.add(key);targets.push(target);
    }
    return targets;
  }

  function relativeNm(own,target){
    const lat0=own.lat*Math.PI/180;
    return {x:(target.lon-own.lon)*60*Math.cos(lat0),y:(target.lat-own.lat)*60};
  }
  const distanceNm=(own,target)=>{const r=relativeNm(own,target);return Math.hypot(r.x,r.y)};
  function velocity(sog,cog){
    const speed=finite(sog),course=normalizeAngle(cog);
    if(speed===null||speed<0)return null;
    if(speed<0.05)return {x:0,y:0};
    if(course===null)return null;
    const rad=course*Math.PI/180;
    return {x:speed*Math.sin(rad)/60,y:speed*Math.cos(rad)/60};
  }
  function cpaData(own,target){
    const r=relativeNm(own,target),ownV=velocity(own.sog,own.cog),targetV=velocity(target.sog,target.cog);
    if(!ownV||!targetV)return null;
    const vx=targetV.x-ownV.x,vy=targetV.y-ownV.y,vv=vx*vx+vy*vy;
    if(vv<1e-9)return {cpaNm:Math.hypot(r.x,r.y),tcpaMin:null};
    const tcpa=-(r.x*vx+r.y*vy)/vv;
    if(tcpa<=0)return {cpaNm:Math.hypot(r.x,r.y),tcpaMin:tcpa};
    return {cpaNm:Math.hypot(r.x+vx*tcpa,r.y+vy*tcpa),tcpaMin:tcpa};
  }
  function classify(target){
    const distanceM=target.distanceNm*1852,cpa=target.cpa;
    if(distanceM<50)return {level:'risk',rank:0,label:'RISICO'};
    if(distanceM<120)return {level:'watch',rank:1,label:'OPLETTEN'};
    if(!cpa||!Number.isFinite(cpa.cpaNm))return {level:'unknown',rank:3,label:'ONBEKEND'};
    const cpaM=cpa.cpaNm*1852,t=cpa.tcpaMin,future=Number.isFinite(t)&&t>0&&t<=30;
    if(future&&cpaM<50)return {level:'risk',rank:0,label:'RISICO'};
    if(future&&cpaM<200)return {level:'watch',rank:1,label:'OPLETTEN'};
    return {level:'safe',rank:2,label:'VEILIG'};
  }
  function enrichTargets(targets,own){
    return targets.map(target=>{
      const item={...target,distanceNm:distanceNm(own,target),cpa:cpaData(own,target)};
      item.risk=classify(item);return item;
    }).filter(item=>item.distanceNm<=RANGE_NM*1.35)
      .sort((a,b)=>a.risk.rank-b.risk.rank||a.distanceNm-b.distanceNm).slice(0,25);
  }

  function radarPoint(target){
    const r=relativeNm(state.position,target),radius=166;
    return {x:200+(r.x/RANGE_NM)*radius,y:200-(r.y/RANGE_NM)*radius};
  }
  function vectorEnd(target,start){
    if(!Number.isFinite(target.sog)||!Number.isFinite(target.cog))return start;
    const dist=target.sog*6/60,rad=target.cog*Math.PI/180;
    return {x:start.x+(dist*Math.sin(rad)/RANGE_NM)*166,y:start.y-(dist*Math.cos(rad)/RANGE_NM)*166};
  }
  const color=level=>level==='risk'?'#ff4d4d':level==='watch'?'#ff9f1a':level==='safe'?'#63dd4f':'#93a7b5';
  function targetSvg(target){
    const p=radarPoint(target);
    if(Math.hypot(p.x-200,p.y-200)>177)return '';
    const end=vectorEnd(target,p),c=color(target.risk.level),selected=state.selected===target.id?' ms820-selected':'';
    return `<g class="ms820-radar-target${selected}" data-target-id="${esc(target.id)}" tabindex="0" role="button" aria-label="${esc(target.name)}"><line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".95"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${c}" opacity=".20"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${c}" stroke="#f7fbff" stroke-width="2"/></g>`;
  }
  const ownShipRotation=()=>normalizeAngle(state.own.heading??state.own.cog)??0;
  function radarSvg(){
    const targets=state.targets.filter(t=>t.distanceNm<=RANGE_NM),shipRot=ownShipRotation();
    return `<svg class="ms820-radar-svg" viewBox="0 0 400 400" role="img" aria-label="Aanvaringsradar tot 1,5 zeemijl"><defs><radialGradient id="ms820RadarBg"><stop offset="0%" stop-color="#0c2530" stop-opacity=".78"/><stop offset="100%" stop-color="#03121b" stop-opacity=".95"/></radialGradient><filter id="ms820Glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="200" cy="200" r="184" fill="url(#ms820RadarBg)" stroke="#8ca8b7" stroke-width="1.5"/><circle cx="200" cy="200" r="55.3" class="ms820-grid-ring"/><circle cx="200" cy="200" r="110.7" class="ms820-grid-ring"/><circle cx="200" cy="200" r="166" class="ms820-grid-ring"/><line x1="16" y1="200" x2="384" y2="200" class="ms820-grid-line"/><line x1="200" y1="16" x2="200" y2="384" class="ms820-grid-line"/><text x="200" y="13" text-anchor="middle" class="ms820-degree">0°</text><text x="393" y="204" text-anchor="end" class="ms820-degree">90°</text><text x="200" y="397" text-anchor="middle" class="ms820-degree">180°</text><text x="7" y="204" class="ms820-degree">270°</text><text x="204" y="149" class="ms820-range-label">0.5 NM</text><text x="204" y="94" class="ms820-range-label">1.0 NM</text>${targets.map(targetSvg).join('')}<g transform="rotate(${shipRot.toFixed(1)} 200 200)" filter="url(#ms820Glow)"><path d="M200 174 L212 214 L200 208 L188 214 Z" fill="#071722" stroke="#f4fbff" stroke-width="3" stroke-linejoin="round"/><line x1="200" y1="173" x2="200" y2="139" stroke="#66ee8b" stroke-width="2.5" stroke-linecap="round"/></g></svg>`;
  }

  function formatDistance(nm){if(!Number.isFinite(nm))return '–';return nm<0.1?`${Math.round(nm*1852)} m`:`${nm.toFixed(2)} NM`}
  function formatCpa(target){const nm=target?.cpa?.cpaNm;if(!Number.isFinite(nm))return '–';const m=nm*1852;return m<1000?`${Math.round(m)} m`:`${nm.toFixed(2)} NM`}
  function formatTcpa(target){const t=target?.cpa?.tcpaMin;if(!Number.isFinite(t)||t<=0)return '–';return t<1?'< 1 min':`${Math.round(t)} min`}
  const formatKn=value=>Number.isFinite(value)?`${value.toFixed(1)} kn`:'–';
  function formatDeg(value){const n=normalizeAngle(value);return n===null?'–':`${String(Math.round(n)).padStart(3,'0')}°`}
  function targetCard(target){
    const risk=target.risk.level;
    return `<button type="button" class="ms820-target-card ms820-${risk}${state.selected===target.id?' is-selected':''}" data-target-id="${esc(target.id)}"><div class="ms820-target-title"><span class="ms820-dot"></span><strong>${esc(target.name)}</strong><em>${esc(target.risk.label)}</em></div><dl><dt>Afstand</dt><dd>${formatDistance(target.distanceNm)}</dd><dt>CPA</dt><dd>${formatCpa(target)}</dd><dt>TCPA</dt><dd>${formatTcpa(target)}</dd><dt>SOG</dt><dd>${formatKn(target.sog)}</dd><dt>COG</dt><dd>${formatDeg(target.cog)}</dd></dl>${target.mmsi?`<small>MMSI ${esc(target.mmsi)}</small>`:''}</button>`;
  }
  function checklistItem(ok,label,detail=''){
    return `<li class="${ok?'ok':'missing'}"><i>${ok?'✓':'!'}</i><span><strong>${esc(label)}</strong>${detail?`<small>${esc(detail)}</small>`:''}</span></li>`;
  }

  function render(){
    if(!state.root)return;
    const visible=state.targets.filter(t=>t.distanceNm<=RANGE_NM);
    const riskCount=visible.filter(t=>t.risk.level==='risk').length;
    const watchCount=visible.filter(t=>t.risk.level==='watch').length;
    const unknownCount=visible.filter(t=>t.risk.level==='unknown').length;
    const gpsOk=Boolean(state.position);
    const motionOk=Number.isFinite(state.own.sog),courseOk=Number.isFinite(state.own.cog),headingOk=Number.isFinite(state.own.heading);
    const aisAvailable=Boolean(state.providerConfigured===true&&state.providerOnline);
    const aisMissingConfig=state.providerConfigured===false;
    const cpaOk=aisAvailable&&gpsOk&&(visible.length===0||visible.every(t=>Number.isFinite(t?.cpa?.cpaNm)));
    const assessmentKnown=Boolean(aisAvailable&&gpsOk&&unknownCount===0);

    const connectionText=state.busy?'AIS laden…':aisAvailable?'AIS online':aisMissingConfig?'AIS niet gekoppeld':'AIS offline';
    const alarmText=riskCount?`Alarm: ${riskCount} risico${riskCount===1?'':'’s'}`:watchCount?`${watchCount} doel${watchCount===1?'':'en'} opletten`:assessmentKnown?'Geen risico':aisMissingConfig?'Risico niet berekenbaar':'Risico onbekend';
    const alarmClass=riskCount?'danger':watchCount?'warn':assessmentKnown?'ok':'warn';
    const alarmIcon=riskCount?'⚠':watchCount?'!':assessmentKnown?'✓':'?';
    const targetSummary=!aisAvailable?(aisMissingConfig?'configuratie nodig':'niet beschikbaar'):riskCount?`${riskCount} risico`:watchCount?`${watchCount} opletten`:unknownCount?`${unknownCount} onbekend`:'rustig';
    const targetHeadline=aisAvailable?`${visible.length} binnen ${RANGE_NM.toFixed(1)} NM`:aisMissingConfig?'AIS niet gekoppeld':'AIS niet beschikbaar';
    const emptyTitle=aisAvailable&&gpsOk?'Geen AIS-doelen binnen 1,5 NM':!gpsOk?'GPS-positie nodig':aisMissingConfig?'VesselAPI niet gekoppeld':'Geen AIS-databron verbonden';
    const emptyDetail=aisAvailable&&gpsOk?'Het actuele verkeersbeeld bevat geen doelen in dit bereik.':!gpsOk?'Sta locatie toe om de radar te gebruiken.':aisMissingConfig?'Voeg VESSELAPI_KEY toe aan de Netlify environment variables en publiceer opnieuw.':'Er wordt geen aantal doelen of veiligheidsstatus getoond zolang AIS niet online is.';
    const updated=state.lastFetch?new Date(state.lastFetch).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'–';

    state.root.innerHTML=`<div class="ms820-topbar"><div><span class="ms820-kicker">AIS · COLLISION AWARENESS</span><h2><span class="ms820-radar-icon">◎</span> Aanvaringsradar</h2><p>Realtime overzicht van AIS-doelen rond Serenity</p></div><div class="ms820-top-actions"><span id="ms711AisConnection" class="ms820-status ${aisAvailable?'ok':state.busy?'busy':'bad'}"><i></i>${esc(connectionText)}</span><span class="ms820-status ${alarmClass}">${alarmIcon} ${esc(alarmText)}</span><button type="button" class="ms820-refresh" id="ms820Refresh" aria-label="AIS verversen" title="AIS verversen">↻</button></div></div>
      ${state.lastError?`<div class="ms820-banner ${state.providerConfigured===false?'warn':'error'}">${esc(state.lastError)}</div>`:''}
      <div class="ms820-layout"><aside class="ms820-panel ms820-targets"><div class="ms820-panel-head"><div><small>DOELEN</small><strong>${esc(targetHeadline)}</strong></div><span>${esc(targetSummary)}</span></div><div class="ms820-target-list">${visible.length?visible.map(targetCard).join(''):`<div class="ms820-empty"><span>◎</span><strong>${esc(emptyTitle)}</strong><small>${esc(emptyDetail)}</small></div>`}</div></aside>
      <main class="ms820-center"><div class="ms820-radar-wrap">${radarSvg()}<div class="ms820-radar-range"><strong>1.5 NM</strong><small>Bereik</small></div></div><div class="ms820-legend" aria-label="Risico legenda"><span class="safe"><i></i><b>Veilig</b><small>CPA ≥ 200 m</small></span><span class="watch"><i></i><b>Opletten</b><small>CPA 50–200 m</small></span><span class="risk"><i></i><b>Risico</b><small>CPA &lt; 50 m</small></span></div></main>
      <aside class="ms820-right"><section class="ms820-panel ms820-own"><div class="ms820-panel-head"><div><small>EIGEN SCHIP</small><strong>Serenity</strong></div><span class="${gpsOk?'gps-ok':'gps-bad'}">${gpsOk?'● GPS':'○ GPS'}</span></div><dl><dt>SOG</dt><dd>${formatKn(state.own.sog)}</dd><dt>COG</dt><dd>${formatDeg(state.own.cog)}</dd><dt>Heading</dt><dd>${formatDeg(state.own.heading)}</dd><dt>GPS</dt><dd>${gpsOk?(Number.isFinite(state.own.accuracy)?`±${Math.round(state.own.accuracy)} m`:'Fix'):'Geen fix'}</dd></dl><small class="ms820-own-source">${esc(state.own.source||'GPS-bron nog onbekend')}</small></section>
      <section class="ms820-panel ms820-data"><div class="ms820-panel-head"><div><small>LIVE CHECK</small><strong>Beschikbare data</strong></div><span>${updated}</span></div><ul>${checklistItem(aisAvailable,'AIS targets',aisAvailable?'Internet-AIS online':aisMissingConfig?'VesselAPI-sleutel ontbreekt':'AIS-service niet bereikbaar')}${checklistItem(gpsOk,'GPS positie')}${checklistItem(motionOk&&courseOk,'COG / SOG')}${checklistItem(headingOk,'Heading / kompas',headingOk?'Live':'Niet vereist voor CPA')}${checklistItem(cpaOk,'CPA / TCPA',!aisAvailable?'AIS-data nodig':visible.length?'Berekend in MijnSerenity':'Geen doelen om te berekenen')}</ul></section></aside></div>
      <div class="ms820-footnote"><span>ⓘ CPA = kleinste verwachte passeerafstand · TCPA = tijd tot dat punt.</span><strong>Internet-AIS kan vertraagd of onvolledig zijn. Blijf altijd zelf uitkijken en gebruik dit niet als vervanging voor gecertificeerde navigatieapparatuur.</strong></div>`;

    state.root.querySelector('#ms820Refresh')?.addEventListener('click',()=>refresh(true));
    state.root.querySelectorAll('[data-target-id]').forEach(el=>{
      const select=()=>{state.selected=String(el.dataset.targetId||'');render()};
      el.addEventListener('click',select);
      el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select()}});
    });
    window.ms820AisState={version:VERSION,online:state.providerOnline,configured:state.providerConfigured,reason:state.providerReason,
      assessmentKnown,riskCount,watchCount,unknownCount,targetCount:aisAvailable?visible.length:null,
      lastFetch:state.lastFetch,error:state.lastError||''};
    window.dispatchEvent(new CustomEvent('mijnserenity:ais-update',{detail:window.ms820AisState}));
  }

  function mount(){
    if(state.mounted&&state.root?.isConnected)return state.root;
    const legacy=document.querySelector('.ms711-ais-hero');
    if(!legacy)return null;
    const parent=legacy.parentElement;
    legacy.className='card ms820-ais-root';legacy.id='ms820AisRoot';
    if(parent)parent.querySelectorAll('.ms711-ais-map-card,.ms711-ais-disclaimer').forEach(el=>el.remove());
    state.root=legacy;state.mounted=true;render();return legacy;
  }

  async function providerStatus(){
    try{
      const data=await fetchJson('/.netlify/functions/ais?mode=status');
      state.providerConfigured=Boolean(data?.configured);
      state.providerReason=String(data?.reason||'');
      if(!state.providerConfigured){
        state.lastError=state.providerReason==='missing_vesselapi_key'
          ?'AIS is nog niet gekoppeld. Voeg VESSELAPI_KEY toe als Netlify environment variable en publiceer opnieuw.'
          :'AIS-databron is niet geconfigureerd.';
      }else if(state.lastError.startsWith('AIS is nog niet gekoppeld')||state.lastError==='AIS-databron is niet geconfigureerd.'){
        state.lastError='';
      }
      return state.providerConfigured;
    }catch(error){
      state.providerConfigured=null;
      state.providerReason=error?.code||'status_unreachable';
      state.lastError='AIS-service is tijdelijk niet bereikbaar. Probeer opnieuw.';
      return false;
    }
  }

  async function fetchTargets(){
    if(!state.position)return;
    const query=new URLSearchParams({mode:'nearby',lat:Number(state.position.lat).toFixed(6),lon:Number(state.position.lon).toFixed(6),radiusKm:String(FETCH_RADIUS_KM),limit:'50'});
    const payload=await fetchJson(`/.netlify/functions/ais?${query}`);
    state.targets=enrichTargets(targetsFromPayload(payload?.data??payload),state.position);
    state.providerOnline=true;state.lastFetch=Date.now();state.lastError='';
  }

  async function refresh(forceGps=false){
    if(state.busy)return;
    mount();state.busy=true;render();
    try{
      const pos=await acquirePosition(forceGps);
      if(!pos){
        state.position=null;state.own={sog:null,cog:null,heading:null,accuracy:null,source:''};
        throw new Error('Geen GPS-positie beschikbaar. Sta locatie toe om de radar te gebruiken.');
      }
      state.position={lat:Number(pos.lat),lon:Number(pos.lon)};
      state.own={sog:finite(pos.sog),cog:normalizeAngle(pos.cog),heading:normalizeAngle(pos.heading),accuracy:finite(pos.accuracy),source:pos.source||'GPS'};
      savePosition({...pos,...state.own,timestamp:pos.timestamp||Date.now()});
      if(await providerStatus())await fetchTargets();
      else{state.providerOnline=false;state.targets=[]}
    }catch(error){
      state.providerOnline=false;state.targets=[];
      state.providerReason=error?.code||state.providerReason;
      state.lastError=error?.message||'AIS kon niet worden geladen.';
    }finally{state.busy=false;render()}
  }

  function pageVisible(){
    const root=state.root||document.querySelector('.ms711-ais-hero');
    if(!root)return false;
    const section=root.closest('section');
    return !document.hidden&&(!section||!section.classList.contains('hidden'));
  }
  function schedule(){clearInterval(state.timer);state.timer=setInterval(()=>{if(pageVisible())refresh(false)},POLL_MS)}
  async function initAisPage(){if(!mount())return;schedule();await refresh(false)}

  window.initAisPage=initAisPage;
  window.ms711CenterAis=()=>refresh(true);
  window.ms711RefreshAis=()=>refresh(false);
  window.addEventListener('online',()=>{if(pageVisible())refresh(false)},{passive:true});
  window.addEventListener('offline',()=>{state.providerOnline=false;state.targets=[];state.providerReason='offline';state.lastError='Geen internetverbinding. Internet-AIS is tijdelijk niet beschikbaar.';render()},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pageVisible())refresh(false)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();