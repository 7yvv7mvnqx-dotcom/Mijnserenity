/* MijnSerenity 8.20.6 — AIS hybrid
   Gebruik VesselAPI voor CPA/TCPA; val automatisch terug op de eerder werkende
   MyShipTracking-kaart wanneer VesselAPI niet is geconfigureerd of tijdelijk faalt. */
(()=>{
  'use strict';
  if(window.__MS_AIS_HYBRID_8206)return;
  window.__MS_AIS_HYBRID_8206=true;

  const VERSION='8.20.6';
  const RANGE_NM=1.5;
  const FETCH_RADIUS_KM=3;
  const POLL_MS=30000;
  const FALLBACK_REFRESH_MS=120000;
  const POSITION_KEY='mijnserenity-ais-last-position';
  const WIDGET_SCRIPT='https://www.myshiptracking.com/js/widgetApi.js';

  const state={
    root:null,position:null,own:{sog:null,cog:null,heading:null,accuracy:null,source:''},
    targets:[],mode:'loading',configured:null,online:false,error:'',lastFetch:null,
    busy:false,timer:null,selected:'',widgetReady:false,widgetLoadedAt:0
  };

  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(value); return Number.isFinite(n)?n:null;
  };
  const angle=value=>{const n=finite(value);return n===null?null:((n%360)+360)%360};
  const first=(...values)=>{for(const v of values){const n=finite(v);if(n!==null)return n}return null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function fetchJson(url,timeout=12000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const error=new Error(data?.error?.message||data?.error||`HTTP ${response.status}`);
        error.code=data?.error?.code||'http_error';
        throw error;
      }
      return data;
    }catch(error){
      if(error?.name==='AbortError')throw new Error('AIS-request duurde te lang');
      throw error;
    }finally{clearTimeout(timer)}
  }

  function livePosition(){
    const nav=window.liveNavState||{};
    let lat=first(nav.currentLat,nav.lat,nav.position?.lat,nav.position?.latitude);
    let lon=first(nav.currentLon,nav.lon,nav.lng,nav.position?.lon,nav.position?.lng,nav.position?.longitude);
    let timestamp=first(nav.timestamp,nav.time,nav.position?.timestamp,nav.position?.time)||Date.now();
    if(lat===null||lon===null){
      for(const list of [nav.trackPoints,nav.track,nav.history,nav.gpsTrack,nav.points,nav.live?.points]){
        if(!Array.isArray(list)||!list.length)continue;
        const p=list[list.length-1]||{};
        lat=first(p.lat,p.latitude); lon=first(p.lon,p.lng,p.longitude);
        timestamp=first(p.time,p.timestamp)||Date.now();
        if(lat!==null&&lon!==null)break;
      }
    }
    if(lat===null||lon===null)return null;
    const kmh=first(nav.speedKmh,nav.speedKmH);
    return {
      lat,lon,timestamp,
      sog:first(nav.sog,nav.speedKnots,nav.speedKts,nav.speed?.knots,kmh!==null?kmh/1.852:null),
      cog:angle(first(nav.cog,nav.course,nav.courseOverGround,nav.position?.heading)),
      heading:angle(first(nav.heading,nav.headingDeg,nav.compassHeading,nav.trueHeading)),
      accuracy:first(nav.accuracy,nav.gpsAccuracy,nav.position?.accuracy),
      source:'Live GPS'
    };
  }

  function cachedPosition(){
    try{
      const p=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
      const lat=finite(p?.lat),lon=finite(p?.lon),timestamp=finite(p?.timestamp);
      if(lat===null||lon===null||timestamp===null||Date.now()-timestamp>24*60*60*1000)return null;
      return {...p,lat,lon,timestamp,source:'Laatst bekende GPS'};
    }catch{return null}
  }

  function savePosition(pos){
    try{localStorage.setItem(POSITION_KEY,JSON.stringify({...pos,timestamp:pos.timestamp||Date.now()}))}catch{}
  }

  function browserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS niet ondersteund'));
      navigator.geolocation.getCurrentPosition(result=>{
        const c=result.coords||{},speed=finite(c.speed);
        resolve({
          lat:Number(c.latitude),lon:Number(c.longitude),timestamp:Number(result.timestamp)||Date.now(),
          accuracy:finite(c.accuracy),sog:speed===null?null:speed*1.943844,
          cog:angle(c.heading),heading:null,source:'Apparaat-GPS'
        });
      },reject,{enableHighAccuracy:true,maximumAge:10000,timeout:10000});
    });
  }

  async function acquirePosition(force=false){
    const live=livePosition();
    if(live&&!force){savePosition(live);return live}
    try{
      const gps=await browserPosition();
      if(Number.isFinite(gps.lat)&&Number.isFinite(gps.lon)){savePosition(gps);return gps}
    }catch{}
    if(live){savePosition(live);return live}
    return cachedPosition();
  }

  function getPath(obj,path){try{return path.split('.').reduce((v,k)=>v?.[k],obj)}catch{return undefined}}
  function firstValue(obj,paths){for(const p of paths){const v=getPath(obj,p);if(v!==undefined&&v!==null&&v!=='')return v}return null}
  function normalizeTarget(raw,index){
    if(!raw||typeof raw!=='object')return null;
    const lat=finite(firstValue(raw,['latitude','lat','position.latitude','position.lat','location.latitude','location.lat','lastPosition.latitude']));
    const lon=finite(firstValue(raw,['longitude','lon','lng','position.longitude','position.lon','position.lng','location.longitude','location.lon','lastPosition.longitude']));
    if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    const mmsi=String(firstValue(raw,['mmsi','MMSI','vessel.mmsi','ship.mmsi','identifiers.mmsi','id'])||'').replace(/\D/g,'').slice(0,9);
    const name=String(firstValue(raw,['name','vesselName','shipName','vessel.name','ship.name','static.name'])||'').trim();
    const sog=finite(firstValue(raw,['sog','speedOverGround','speed','position.sog','position.speed','navigation.sog','lastPosition.sog']));
    const cog=angle(firstValue(raw,['cog','courseOverGround','course','position.cog','position.course','navigation.cog','lastPosition.cog']));
    return {id:mmsi||`${lat.toFixed(5)}:${lon.toFixed(5)}:${index}`,mmsi,name:name||(mmsi?`MMSI ${mmsi}`:'AIS-doel'),lat,lon,sog,cog};
  }
  function collectObjects(value,out=[],depth=0){
    if(depth>7||value==null)return out;
    if(Array.isArray(value)){value.forEach(v=>collectObjects(v,out,depth+1));return out}
    if(typeof value==='object'){out.push(value);Object.values(value).forEach(v=>{if(v&&typeof v==='object')collectObjects(v,out,depth+1)})}
    return out;
  }
  function parseTargets(payload){
    const out=[],seen=new Set();
    collectObjects(payload).forEach((raw,i)=>{
      const t=normalizeTarget(raw,i); if(!t)return;
      const key=t.mmsi||`${t.lat.toFixed(5)}:${t.lon.toFixed(5)}`; if(seen.has(key))return;
      seen.add(key);out.push(t);
    });
    return out;
  }

  function relativeNm(own,target){
    const lat0=own.lat*Math.PI/180;
    return {x:(target.lon-own.lon)*60*Math.cos(lat0),y:(target.lat-own.lat)*60};
  }
  function distanceNm(own,target){const r=relativeNm(own,target);return Math.hypot(r.x,r.y)}
  function velocity(sog,cog){
    const speed=finite(sog),course=angle(cog);
    if(speed===null||speed<0)return null;
    if(speed<0.05)return {x:0,y:0};
    if(course===null)return null;
    const rad=course*Math.PI/180; return {x:speed*Math.sin(rad)/60,y:speed*Math.cos(rad)/60};
  }
  function cpa(own,target){
    const r=relativeNm(own,target),ov=velocity(own.sog,own.cog),tv=velocity(target.sog,target.cog);
    if(!ov||!tv)return null;
    const vx=tv.x-ov.x,vy=tv.y-ov.y,vv=vx*vx+vy*vy;
    if(vv<1e-9)return {cpaNm:Math.hypot(r.x,r.y),tcpaMin:null};
    const t=-(r.x*vx+r.y*vy)/vv;
    if(t<=0)return {cpaNm:Math.hypot(r.x,r.y),tcpaMin:t};
    return {cpaNm:Math.hypot(r.x+vx*t,r.y+vy*t),tcpaMin:t};
  }
  function classify(t){
    const distanceM=t.distanceNm*1852;
    if(distanceM<50)return {level:'risk',label:'RISICO',rank:0};
    if(distanceM<120)return {level:'watch',label:'OPLETTEN',rank:1};
    if(!t.cpa||!Number.isFinite(t.cpa.cpaNm))return {level:'unknown',label:'ONBEKEND',rank:3};
    const future=Number.isFinite(t.cpa.tcpaMin)&&t.cpa.tcpaMin>0&&t.cpa.tcpaMin<=30;
    const cpaM=t.cpa.cpaNm*1852;
    if(future&&cpaM<50)return {level:'risk',label:'RISICO',rank:0};
    if(future&&cpaM<200)return {level:'watch',label:'OPLETTEN',rank:1};
    return {level:'safe',label:'VEILIG',rank:2};
  }
  function enrich(targets){
    return targets.map(t=>{
      const item={...t,distanceNm:distanceNm(state.position,t),cpa:cpa(state.own,t)};
      item.risk=classify(item);return item;
    }).filter(t=>t.distanceNm<=RANGE_NM*1.35)
      .sort((a,b)=>a.risk.rank-b.risk.rank||a.distanceNm-b.distanceNm).slice(0,25);
  }

  function ensureStyles(){
    if(document.getElementById('ms8206HybridStyle'))return;
    const style=document.createElement('style');style.id='ms8206HybridStyle';
    style.textContent=`
      .ms8206-fallback{display:grid;gap:14px}
      .ms8206-widget-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 16px;border:1px solid rgba(118,184,216,.24);border-radius:16px;background:rgba(4,24,37,.72)}
      .ms8206-widget-head strong{display:block;font-size:1.05rem}.ms8206-widget-head small{display:block;margin-top:4px;color:#a9c0ce}
      .ms8206-widget-badge{padding:7px 10px;border-radius:999px;border:1px solid rgba(86,224,141,.35);color:#75ee9b;background:rgba(20,88,58,.18);font-weight:800;white-space:nowrap}
      .ms8206-widget-wrap{position:relative;min-height:480px;height:min(66vh,720px);overflow:hidden;border-radius:18px;border:1px solid rgba(113,178,211,.28);background:#061827}
      .ms8206-widget-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#061827}
      .ms8206-fallback-note{padding:12px 14px;border-radius:14px;background:rgba(255,171,54,.08);border:1px solid rgba(255,171,54,.25);color:#dce8ee;font-size:.9rem}
      .ms8206-actions{display:flex;gap:8px;flex-wrap:wrap}.ms8206-actions button{min-height:38px}
      .ms8206-targets{display:grid;gap:8px}.ms8206-target{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px 12px;border-radius:13px;border:1px solid rgba(115,175,205,.18);background:rgba(3,19,30,.66)}
      .ms8206-target small{color:#9fb5c3}.ms8206-target em{font-style:normal;font-weight:900}.ms8206-target.safe em{color:#69e589}.ms8206-target.watch em{color:#ffc35c}.ms8206-target.risk em{color:#ff7777}.ms8206-target.unknown em{color:#aab9c4}
      @media(max-width:700px){.ms8206-widget-wrap{min-height:390px;height:58vh}.ms8206-widget-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    if(state.root?.isConnected)return state.root;
    const legacy=document.querySelector('.ms711-ais-hero')||document.getElementById('ms820AisRoot');
    if(!legacy)return null;
    const parent=legacy.parentElement;
    legacy.className='card ms820-ais-root';legacy.id='ms820AisRoot';
    if(parent)parent.querySelectorAll('.ms711-ais-map-card,.ms711-ais-disclaimer').forEach(el=>el.remove());
    state.root=legacy;ensureStyles();return legacy;
  }

  function widgetDocument(){
    const lat=Number(state.position.lat).toFixed(6),lon=Number(state.position.lon).toFixed(6);
    return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#061827}iframe,object,embed{width:100%!important;height:100%!important;min-height:100%!important;border:0!important;display:block!important}</style></head><body><script>var mst_width="100%";var mst_height=((window.innerHeight||620)+"px");var mst_border="0";var mst_map_style="simple";var mst_mmsi="";var mst_show_track="false";var mst_show_info="true";var mst_fleet="";var mst_lat="${lat}";var mst_lng="${lon}";var mst_zoom="13";var mst_show_names="1";var mst_scroll_wheel="true";var mst_show_menu="true";(function(){var sent=false;function ready(){if(sent)return;var x=document.querySelector("iframe,object,embed");if(!x)return;sent=true;try{parent.postMessage({source:"mijnserenity-ais-widget",state:"ready"},"*")}catch(e){}}new MutationObserver(ready).observe(document.documentElement,{childList:true,subtree:true});setTimeout(ready,500);setTimeout(function(){if(!sent)try{parent.postMessage({source:"mijnserenity-ais-widget",state:"waiting"},"*")}catch(e){}},9000)})();<\/script><script src="${WIDGET_SCRIPT}" async defer onerror="parent.postMessage({source:'mijnserenity-ais-widget',state:'error'},'*')"><\/script></body></html>`;
  }

  function fmtDist(nm){if(!Number.isFinite(nm))return '–';return nm<.1?`${Math.round(nm*1852)} m`:`${nm.toFixed(2)} NM`}
  function fmtCpa(t){return Number.isFinite(t?.cpa?.cpaNm)?fmtDist(t.cpa.cpaNm):'–'}
  function fmtTcpa(t){const n=t?.cpa?.tcpaMin;return Number.isFinite(n)&&n>0?`${Math.round(n)} min`:'–'}
  function fmtKn(n){return Number.isFinite(n)?`${n.toFixed(1)} kn`:'–'}
  function fmtDeg(n){const a=angle(n);return a===null?'–':`${String(Math.round(a)).padStart(3,'0')}°`}

  function radarSvg(){
    const targets=state.targets.filter(t=>t.distanceNm<=RANGE_NM).slice(0,20);
    const marks=targets.map(t=>{
      const r=relativeNm(state.position,t),x=200+(r.x/RANGE_NM)*166,y=200-(r.y/RANGE_NM)*166;
      const c=t.risk.level==='risk'?'#ff4d4d':t.risk.level==='watch'?'#ff9f1a':t.risk.level==='safe'?'#63dd4f':'#93a7b5';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    }).join('');
    const rot=angle(state.own.heading??state.own.cog)??0;
    return `<svg class="ms820-radar-svg" viewBox="0 0 400 400"><circle cx="200" cy="200" r="184" fill="#061827" stroke="#8ca8b7"/><g fill="none" stroke="rgba(92,220,157,.28)"><circle cx="200" cy="200" r="55"/><circle cx="200" cy="200" r="111"/><circle cx="200" cy="200" r="166"/><line x1="16" y1="200" x2="384" y2="200"/><line x1="200" y1="16" x2="200" y2="384"/></g>${marks}<g transform="rotate(${rot} 200 200)"><path d="M200 174 L212 214 L200 208 L188 214 Z" fill="#071722" stroke="#fff" stroke-width="3"/><line x1="200" y1="173" x2="200" y2="139" stroke="#66ee8b" stroke-width="3"/></g></svg>`;
  }

  function renderLoading(){
    if(!state.root)return;
    state.root.innerHTML=`<div class="ms820-topbar"><div><span class="ms820-kicker">AIS · LIVE</span><h2>◎ Aanvaringsradar</h2><p>GPS en AIS-bronnen worden gecontroleerd…</p></div><div class="ms820-top-actions"><span class="ms820-status busy"><i></i>AIS laden…</span></div></div>`;
  }

  function renderFallback(){
    if(!state.root||!state.position)return;
    const reason=state.configured===false?'VesselAPI is niet beschikbaar; de eerder gebruikte AIS-kaart is automatisch hersteld.':'VesselAPI reageert niet; daarom is automatisch overgeschakeld op de AIS-kaart die eerder werkte.';
    state.root.innerHTML=`
      <div class="ms820-topbar"><div><span class="ms820-kicker">AIS · LIVE KAART</span><h2>📡 Schepen rond Serenity</h2><p>Live AIS-kaart op de actuele GPS-positie</p></div>
        <div class="ms820-top-actions"><span id="ms8206WidgetStatus" class="ms820-status ok"><i></i>AIS-kaart laden…</span><button class="ms820-refresh" id="ms8206Refresh" type="button">↻</button></div></div>
      <div class="ms8206-fallback">
        <div class="ms8206-widget-head"><div><strong>AIS-kaart hersteld</strong><small>${esc(reason)}</small></div><span class="ms8206-widget-badge">Automatische fallback</span></div>
        <div class="ms8206-widget-wrap"><iframe id="ms8206Widget" title="Live AIS-schepen rond Serenity" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
        <div class="ms8206-fallback-note"><strong>Let op:</strong> de kaart toont weer AIS-schepen zoals eerder. CPA/TCPA en automatische aanvaringswaarschuwingen zijn alleen beschikbaar wanneer de VesselAPI-datastroom werkt.</div>
        <div class="ms8206-actions"><button id="ms8206RetryApi" type="button">Probeer radar opnieuw</button><button type="button" class="secondary" onclick="captainNavigate('live')">Naar Live varen</button></div>
      </div>`;
    const frame=document.getElementById('ms8206Widget');
    if(frame)frame.srcdoc=widgetDocument();
    document.getElementById('ms8206Refresh')?.addEventListener('click',()=>refresh(true));
    document.getElementById('ms8206RetryApi')?.addEventListener('click',()=>refresh(true));
    publish();
  }

  function renderRadar(){
    if(!state.root)return;
    const visible=state.targets.filter(t=>t.distanceNm<=RANGE_NM);
    const risk=visible.filter(t=>t.risk.level==='risk').length,watch=visible.filter(t=>t.risk.level==='watch').length;
    const headline=risk?`${risk} risico${risk===1?'':'’s'}`:watch?`${watch} doel${watch===1?'':'en'} opletten`:'Geen direct risico';
    state.root.innerHTML=`
      <div class="ms820-topbar"><div><span class="ms820-kicker">AIS · COLLISION AWARENESS</span><h2>◎ Aanvaringsradar</h2><p>Realtime AIS-doelen rond Serenity</p></div>
        <div class="ms820-top-actions"><span class="ms820-status ok"><i></i>AIS online</span><span class="ms820-status ${risk?'danger':watch?'warn':'ok'}">${risk?'⚠':watch?'!':'✓'} ${esc(headline)}</span><button id="ms8206Refresh" class="ms820-refresh" type="button">↻</button></div></div>
      ${state.error?`<div class="ms820-banner error">${esc(state.error)}</div>`:''}
      <div class="ms820-layout">
        <aside class="ms820-panel ms820-targets"><div class="ms820-panel-head"><div><small>DOELEN</small><strong>${visible.length} binnen ${RANGE_NM.toFixed(1)} NM</strong></div></div>
          <div class="ms8206-targets">${visible.length?visible.map(t=>`<div class="ms8206-target ${t.risk.level}"><div><strong>${esc(t.name)}</strong><small>${fmtDist(t.distanceNm)} · ${fmtKn(t.sog)} · ${fmtDeg(t.cog)}</small></div><div><em>${t.risk.label}</em><small>CPA ${fmtCpa(t)} · ${fmtTcpa(t)}</small></div></div>`).join(''):'<div class="ms820-empty"><span>◎</span><strong>Geen AIS-doelen binnen 1,5 NM</strong><small>De VesselAPI-datastroom is online.</small></div>'}</div>
        </aside>
        <main class="ms820-center"><div class="ms820-radar-wrap">${radarSvg()}<div class="ms820-radar-range"><strong>1.5 NM</strong><small>Bereik</small></div></div></main>
        <aside class="ms820-right"><section class="ms820-panel ms820-own"><div class="ms820-panel-head"><div><small>EIGEN SCHIP</small><strong>Serenity</strong></div><span class="gps-ok">● GPS</span></div><dl><dt>SOG</dt><dd>${fmtKn(state.own.sog)}</dd><dt>COG</dt><dd>${fmtDeg(state.own.cog)}</dd><dt>Heading</dt><dd>${fmtDeg(state.own.heading)}</dd><dt>GPS</dt><dd>${Number.isFinite(state.own.accuracy)?`±${Math.round(state.own.accuracy)} m`:'Fix'}</dd></dl><small class="ms820-own-source">${esc(state.own.source||'GPS')}</small></section></aside>
      </div>
      <div class="ms820-footnote"><span>ⓘ CPA = kleinste verwachte passeerafstand · TCPA = tijd tot dat punt.</span><strong>Internet-AIS kan vertraagd of onvolledig zijn. Blijf zelf uitkijken.</strong></div>`;
    document.getElementById('ms8206Refresh')?.addEventListener('click',()=>refresh(true));
    publish();
  }

  function renderError(){
    if(!state.root)return;
    state.root.innerHTML=`<div class="ms820-topbar"><div><span class="ms820-kicker">AIS</span><h2>📡 AIS</h2><p>${esc(state.error||'AIS kon niet worden geladen')}</p></div><div class="ms820-top-actions"><button id="ms8206Refresh" class="ms820-refresh" type="button">↻</button></div></div>`;
    document.getElementById('ms8206Refresh')?.addEventListener('click',()=>refresh(true));
    publish();
  }

  function publish(){
    window.ms820AisState={version:VERSION,mode:state.mode,online:state.online,configured:state.configured,targetCount:state.mode==='vesselapi'?state.targets.filter(t=>t.distanceNm<=RANGE_NM).length:null,lastFetch:state.lastFetch,error:state.error};
    window.dispatchEvent(new CustomEvent('mijnserenity:ais-update',{detail:window.ms820AisState}));
  }

  async function tryVesselApi(){
    let status;
    try{status=await fetchJson('/.netlify/functions/ais?mode=status')}
    catch(error){state.configured=null;state.error=error?.message||'AIS-service niet bereikbaar';return false}
    state.configured=Boolean(status?.configured);
    if(!state.configured){state.error='';return false}
    const q=new URLSearchParams({mode:'nearby',lat:state.position.lat.toFixed(6),lon:state.position.lon.toFixed(6),radiusKm:String(FETCH_RADIUS_KM),limit:'50'});
    try{
      const payload=await fetchJson(`/.netlify/functions/ais?${q}`);
      state.targets=enrich(parseTargets(payload?.data??payload));
      state.online=true;state.lastFetch=Date.now();state.error='';state.mode='vesselapi';
      return true;
    }catch(error){
      state.error=error?.message||'VesselAPI tijdelijk niet beschikbaar';
      return false;
    }
  }

  async function refresh(forceGps=false){
    if(state.busy)return;
    mount();state.busy=true;state.mode='loading';renderLoading();
    try{
      const pos=await acquirePosition(forceGps);
      if(!pos)throw new Error('Geen GPS-positie beschikbaar. Sta locatie toe om AIS te gebruiken.');
      state.position={lat:Number(pos.lat),lon:Number(pos.lon)};
      state.own={sog:finite(pos.sog),cog:angle(pos.cog),heading:angle(pos.heading),accuracy:finite(pos.accuracy),source:pos.source||'GPS'};
      savePosition({...pos,...state.own});
      const apiOk=await tryVesselApi();
      if(apiOk)renderRadar();
      else{
        state.mode='widget';state.online=true;state.targets=[];state.lastFetch=Date.now();
        renderFallback();
      }
    }catch(error){
      state.mode='error';state.online=false;state.targets=[];state.error=error?.message||'AIS kon niet worden geladen';renderError();
    }finally{state.busy=false;schedule()}
  }

  function pageVisible(){
    const root=state.root||document.querySelector('.ms711-ais-hero')||document.getElementById('ms820AisRoot');
    const section=root?.closest('section');
    return !document.hidden&&Boolean(root)&&(!section||!section.classList.contains('hidden'));
  }
  function schedule(){
    clearInterval(state.timer);
    const interval=state.mode==='widget'?FALLBACK_REFRESH_MS:POLL_MS;
    state.timer=setInterval(()=>{if(pageVisible())refresh(false)},interval);
  }
  function init(){if(!mount())return;refresh(false)}

  window.addEventListener('message',event=>{
    const data=event?.data;
    if(!data||data.source!=='mijnserenity-ais-widget')return;
    const node=document.getElementById('ms8206WidgetStatus');
    if(data.state==='ready'){
      state.widgetReady=true;state.widgetLoadedAt=Date.now();
      if(node){node.className='ms820-status ok';node.innerHTML='<i></i>AIS-kaart online'}
    }else if(data.state==='waiting'){
      if(node)node.innerHTML='<i></i>AIS-kaart laden…';
    }else if(data.state==='error'){
      if(node){node.className='ms820-status bad';node.innerHTML='<i></i>AIS-kaart niet bereikbaar'}
    }
  });
  window.initAisPage=init;
  window.ms711CenterAis=()=>refresh(true);
  window.ms711RefreshAis=()=>refresh(false);
  window.addEventListener('online',()=>{if(pageVisible())refresh(false)},{passive:true});
  window.addEventListener('offline',()=>{state.mode='error';state.online=false;state.error='Geen internetverbinding. AIS is tijdelijk niet beschikbaar.';renderError()},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pageVisible())refresh(false)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();