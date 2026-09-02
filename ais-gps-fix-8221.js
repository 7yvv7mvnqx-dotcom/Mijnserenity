/* MijnSerenity 8.22.1 — AIS GPS + MyShipTracking herstel voor iPhone/PWA */
(()=>{
  'use strict';
  if(window.__MS_AIS_GPS_FIX_8221)return;
  window.__MS_AIS_GPS_FIX_8221=true;

  const VERSION='8.22.1';
  const POSITION_KEYS=['ms8221-ais-last-position','mijnserenity-ais-last-position'];
  const CACHE_MAX_AGE=7*24*60*60*1000;
  const MAP_REFRESH_MS=2*60*1000;
  const WIDGET_SCRIPT='https://www.myshiptracking.com/js/widgetApi.js';

  let busy=false;
  let started=false;
  let lastRefresh=0;
  let lastGpsError=null;
  let pageTimer=null;
  let state={position:null,source:'',accuracy:null,updatedAt:null,widgetState:'waiting'};

  const finite=value=>{
    if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };
  const first=(...values)=>{for(const value of values){const n=finite(value);if(n!==null)return n}return null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function cleanLiteralNewline(){
    try{
      [...document.body.childNodes].forEach(node=>{
        if(node.nodeType===Node.TEXT_NODE&&String(node.nodeValue||'').includes('\\n')){
          node.nodeValue=String(node.nodeValue||'').replace(/\\n/g,'');
        }
      });
    }catch{}
  }

  function ensureStyles(){
    if(document.getElementById('ms8221AisStyle'))return;
    const style=document.createElement('style');
    style.id='ms8221AisStyle';
    style.textContent=`
      #ais .ms711-ais-hero,#ais #ms820AisRoot,#ais .ms711-ais-map-card,#ais .ms711-ais-disclaimer{display:none!important}
      #ais #ms8221AisRoot{display:block!important}
      .ms8221-ais-root{padding:0!important;overflow:hidden;border:1px solid rgba(105,190,225,.28)!important;background:linear-gradient(155deg,rgba(5,30,43,.97),rgba(2,17,29,.98))!important}
      .ms8221-head{padding:18px 18px 14px;border-bottom:1px solid rgba(105,190,225,.20)}
      .ms8221-kicker{display:block;color:#62d8ff;font-size:.76rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
      .ms8221-head h2{margin:0;font-size:1.55rem;line-height:1.15}.ms8221-head p{margin:7px 0 0;color:#adc3d0}
      .ms8221-status-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ms8221-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;border:1px solid rgba(113,181,211,.25);background:rgba(3,20,32,.55);font-size:.78rem;font-weight:800;color:#cfe1ea}
      .ms8221-pill.ok{color:#7aeda2;border-color:rgba(91,225,137,.34)}.ms8221-pill.warn{color:#ffd17b;border-color:rgba(255,190,81,.34)}.ms8221-pill.bad{color:#ff9a9a;border-color:rgba(255,105,105,.34)}
      .ms8221-body{padding:14px;display:grid;gap:12px}.ms8221-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .ms8221-actions button{min-height:48px;border-radius:14px;font-weight:900}.ms8221-map{position:relative;height:min(58vh,640px);min-height:390px;border-radius:17px;overflow:hidden;border:1px solid rgba(113,181,211,.26);background:#061827}
      .ms8221-map iframe{width:100%;height:100%;border:0;display:block;background:#061827}.ms8221-map-loading{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#b9cbd5;background:linear-gradient(145deg,#061827,#03111c);z-index:1}
      .ms8221-map-loading strong{display:block;color:#eef8fc;font-size:1.05rem;margin-bottom:6px}.ms8221-note{padding:11px 12px;border-radius:13px;background:rgba(3,19,30,.72);border:1px solid rgba(113,181,211,.18);color:#b8cad5;font-size:.84rem;line-height:1.4}
      .ms8221-error{padding:16px;border-radius:15px;background:rgba(115,36,42,.18);border:1px solid rgba(255,112,112,.28)}.ms8221-error strong{display:block;margin-bottom:5px;color:#fff}.ms8221-error p{margin:0 0 12px;color:#d9c3c7;line-height:1.45}
      .ms8221-error button{width:100%;min-height:48px;font-weight:900}.ms8221-coords{font-variant-numeric:tabular-nums}
      .ms8221-map.ms8221-fullscreen{position:fixed;z-index:99999;inset:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0) 0;height:auto!important;min-height:0!important;border-radius:0!important;border:0!important}.ms8221-map.ms8221-fullscreen iframe{height:100%}
      @media(max-width:700px){.ms8221-body{padding:12px}.ms8221-head{padding:16px 14px 13px}.ms8221-map{height:56vh;min-height:365px}.ms8221-actions button{font-size:.9rem}}
    `;
    document.head.appendChild(style);
  }

  function aisVisible(){
    const section=document.getElementById('ais');
    return Boolean(section&&!section.classList.contains('hidden')&&!document.hidden);
  }

  function ensureRoot(){
    const section=document.getElementById('ais');
    if(!section)return null;
    ensureStyles();
    section.querySelectorAll('.ms711-ais-hero,#ms820AisRoot,.ms711-ais-map-card,.ms711-ais-disclaimer').forEach(node=>{
      if(node.id!=='ms8221AisRoot')node.style.display='none';
    });
    let root=document.getElementById('ms8221AisRoot');
    if(!root){
      root=document.createElement('div');
      root.id='ms8221AisRoot';
      root.className='card ms8221-ais-root';
      section.appendChild(root);
    }
    return root;
  }

  function positionFromLiveState(){
    const nav=window.liveNavState||{};
    let lat=first(nav.currentLat,nav.lat,nav.position?.lat,nav.position?.latitude);
    let lon=first(nav.currentLon,nav.lon,nav.lng,nav.position?.lon,nav.position?.lng,nav.position?.longitude);
    let timestamp=first(nav.lastGpsAt,nav.timestamp,nav.time,nav.position?.timestamp,nav.position?.time)||Date.now();
    if(lat===null||lon===null){
      for(const list of [nav.points,nav.trackPoints,nav.track,nav.history,nav.gpsTrack,nav.live?.points]){
        if(!Array.isArray(list)||!list.length)continue;
        const point=list[list.length-1]||{};
        lat=first(point.lat,point.latitude);
        lon=first(point.lon,point.lng,point.longitude);
        timestamp=first(point.time,point.timestamp)||Date.now();
        if(lat!==null&&lon!==null)break;
      }
    }
    if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {lat,lon,timestamp,accuracy:first(nav.accuracy,nav.gpsAccuracy,nav.position?.accuracy),source:'Live GPS'};
  }

  function savePosition(position){
    const value={...position,timestamp:Number(position.timestamp)||Date.now()};
    for(const key of POSITION_KEYS){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  }

  function cachedPosition(){
    for(const key of POSITION_KEYS){
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        const lat=finite(value?.lat),lon=finite(value?.lon),timestamp=finite(value?.timestamp);
        if(lat===null||lon===null||timestamp===null)continue;
        if(Date.now()-timestamp>CACHE_MAX_AGE)continue;
        return {...value,lat,lon,timestamp,source:'Laatst bekende GPS'};
      }catch{}
    }
    return null;
  }

  function normalizeBrowserPosition(result){
    const coords=result?.coords||{};
    const position={
      lat:finite(coords.latitude),lon:finite(coords.longitude),
      timestamp:Number(result?.timestamp)||Date.now(),accuracy:finite(coords.accuracy),
      source:'iPhone GPS'
    };
    if(position.lat===null||position.lon===null)throw new Error('GPS gaf geen geldige positie terug.');
    try{if(typeof window.handleLivePosition==='function')window.handleLivePosition(result)}catch{}
    return position;
  }

  function gpsErrorText(error){
    const code=Number(error?.code||0);
    if(code===1)return 'Locatietoegang staat uit voor MijnSerenity. Tik hieronder op GPS opnieuw proberen en sta locatie toe.';
    if(code===2)return 'De iPhone kan op dit moment geen GPS-positie bepalen. Controleer Locatievoorzieningen en probeer opnieuw.';
    if(code===3)return 'Het bepalen van de GPS-positie duurde te lang. We proberen een snellere positiebepaling.';
    return String(error?.message||'GPS-positie is niet beschikbaar.');
  }

  function getPositionOnce(options){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS wordt op dit apparaat niet ondersteund.'));
      navigator.geolocation.getCurrentPosition(result=>{
        try{resolve(normalizeBrowserPosition(result))}catch(error){reject(error)}
      },reject,options);
    });
  }

  function watchFirstPosition(timeoutMs=18000){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('GPS wordt op dit apparaat niet ondersteund.'));
      let done=false;
      let watchId=null;
      const finish=(ok,value)=>{
        if(done)return;done=true;
        if(watchId!==null)try{navigator.geolocation.clearWatch(watchId)}catch{}
        clearTimeout(timer);
        ok?resolve(value):reject(value);
      };
      const timer=setTimeout(()=>finish(false,{code:3,message:'GPS timeout'}),timeoutMs);
      watchId=navigator.geolocation.watchPosition(result=>{
        try{finish(true,normalizeBrowserPosition(result))}catch(error){finish(false,error)}
      },error=>finish(false,error),{enableHighAccuracy:true,maximumAge:30000,timeout:12000});
    });
  }

  async function browserPosition(){
    try{return await watchFirstPosition(18000)}
    catch(firstError){
      lastGpsError=firstError;
      try{
        return await getPositionOnce({enableHighAccuracy:false,maximumAge:5*60*1000,timeout:10000});
      }catch(secondError){lastGpsError=secondError||firstError;throw lastGpsError}
    }
  }

  async function acquirePosition(force=false){
    lastGpsError=null;
    const live=positionFromLiveState();
    if(live&&!force){savePosition(live);return live}
    try{
      const gps=await browserPosition();
      savePosition(gps);
      return gps;
    }catch(error){lastGpsError=error}
    if(live){savePosition(live);return live}
    const cached=cachedPosition();
    if(cached)return cached;
    throw lastGpsError||new Error('Geen GPS-positie beschikbaar.');
  }

  function widgetDocument(position){
    const lat=Number(position.lat).toFixed(6);
    const lon=Number(position.lon).toFixed(6);
    return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#061827}iframe,object,embed{width:100%!important;height:100%!important;min-height:100%!important;border:0!important;display:block!important}</style></head><body><script>var mst_width="100%";var mst_height=((window.innerHeight||620)+"px");var mst_border="0";var mst_map_style="simple";var mst_mmsi="";var mst_show_track="false";var mst_show_info="true";var mst_fleet="";var mst_lat="${lat}";var mst_lng="${lon}";var mst_zoom="13";var mst_show_names="1";var mst_scroll_wheel="true";var mst_show_menu="true";(function(){var sent=false;function ready(){if(sent)return;var x=document.querySelector("iframe,object,embed");if(!x)return;sent=true;try{parent.postMessage({source:"ms8221-ais-widget",state:"ready"},"*")}catch(e){}}new MutationObserver(ready).observe(document.documentElement,{childList:true,subtree:true});setTimeout(ready,500);setTimeout(function(){if(!sent)try{parent.postMessage({source:"ms8221-ais-widget",state:"waiting"},"*")}catch(e){}},9000)})();<\/script><script src="${WIDGET_SCRIPT}" async defer onerror="parent.postMessage({source:'ms8221-ais-widget',state:'error'},'*')"><\/script></body></html>`;
  }

  function formatTime(timestamp){
    try{return new Date(timestamp||Date.now()).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}catch{return 'nu'}
  }

  function renderLoading(){
    const root=ensureRoot();if(!root)return;
    root.innerHTML=`<div class="ms8221-head"><span class="ms8221-kicker">GRATIS INTERNET-AIS · MYSHIPTRACKING</span><h2>📡 Boten rond Serenity</h2><p>Huidige GPS-locatie wordt bepaald…</p><div class="ms8221-status-row"><span class="ms8221-pill warn">● GPS zoeken</span><span class="ms8221-pill">AIS voorbereiden</span></div></div><div class="ms8221-body"><div class="ms8221-note">MijnSerenity probeert eerst de live vaar-GPS, daarna de iPhone-GPS en tenslotte de laatst bekende geldige positie.</div></div>`;
  }

  function renderError(error){
    const root=ensureRoot();if(!root)return;
    const message=gpsErrorText(error);
    root.innerHTML=`<div class="ms8221-head"><span class="ms8221-kicker">GRATIS INTERNET-AIS · MYSHIPTRACKING</span><h2>📡 Boten rond Serenity</h2><p>GPS is nodig om de AIS-kaart rond Serenity te openen.</p><div class="ms8221-status-row"><span class="ms8221-pill bad">● GPS niet beschikbaar</span></div></div><div class="ms8221-body"><div class="ms8221-error"><strong>Locatie kon niet worden bepaald</strong><p>${esc(message)}</p><button id="ms8221GpsRetry" type="button">📍 GPS opnieuw proberen</button></div><div class="ms8221-note">Werkt het nog niet? Controleer op de iPhone bij Instellingen → Privacy en beveiliging → Locatievoorzieningen of locatie voor Safari/MijnSerenity is toegestaan.</div></div>`;
    document.getElementById('ms8221GpsRetry')?.addEventListener('click',()=>refresh(true));
  }

  function renderMap(position){
    const root=ensureRoot();if(!root)return;
    const cached=position.source==='Laatst bekende GPS';
    const accuracy=finite(position.accuracy);
    const sourceLabel=cached?'Laatst bekende positie':position.source||'GPS';
    state={position:{lat:position.lat,lon:position.lon},source:sourceLabel,accuracy,updatedAt:position.timestamp||Date.now(),widgetState:'waiting'};
    root.innerHTML=`
      <div class="ms8221-head">
        <span class="ms8221-kicker">GRATIS INTERNET-AIS · MYSHIPTRACKING</span>
        <h2>📡 Boten rond Serenity</h2>
        <p>${cached?'Kaart geladen op de laatst bekende GPS-positie.':'Live AIS-kaart op de actuele positie van Serenity.'}</p>
        <div class="ms8221-status-row">
          <span class="ms8221-pill ${cached?'warn':'ok'}">● ${esc(sourceLabel)}${accuracy!==null?` · ±${Math.round(accuracy)} m`:''}</span>
          <span id="ms8221WidgetStatus" class="ms8221-pill warn">● AIS-kaart laden</span>
          <span class="ms8221-pill ms8221-coords">${Number(position.lat).toFixed(5)}, ${Number(position.lon).toFixed(5)}</span>
        </div>
      </div>
      <div class="ms8221-body">
        <div class="ms8221-actions">
          <button id="ms8221GpsRetry" type="button">📍 GPS</button>
          <button id="ms8221MapRefresh" type="button">↻ Ververs</button>
          <button id="ms8221Fullscreen" type="button">⛶ Groot</button>
        </div>
        <div id="ms8221Map" class="ms8221-map">
          <div id="ms8221MapLoading" class="ms8221-map-loading"><div><strong>AIS-kaart wordt geladen…</strong><span>Schepen rond Serenity worden opgehaald.</span></div></div>
          <iframe id="ms8221Widget" title="Live AIS-schepen rond Serenity" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div class="ms8221-note">Laatste GPS: ${formatTime(position.timestamp)}. Internet-AIS kan vertraagd of onvolledig zijn en vervangt geen eigen uitkijk of navigatieapparatuur.</div>
      </div>`;
    const frame=document.getElementById('ms8221Widget');
    if(frame)frame.srcdoc=widgetDocument(position);
    document.getElementById('ms8221GpsRetry')?.addEventListener('click',()=>refresh(true));
    document.getElementById('ms8221MapRefresh')?.addEventListener('click',()=>refresh(false,true));
    document.getElementById('ms8221Fullscreen')?.addEventListener('click',toggleFullscreen);
  }

  function toggleFullscreen(){
    const map=document.getElementById('ms8221Map');
    const button=document.getElementById('ms8221Fullscreen');
    if(!map)return;
    const full=map.classList.toggle('ms8221-fullscreen');
    document.body.style.overflow=full?'hidden':'';
    if(button)button.textContent=full?'× Sluit':'⛶ Groot';
    if(full){
      let close=document.getElementById('ms8221FullscreenClose');
      if(!close){
        close=document.createElement('button');close.id='ms8221FullscreenClose';close.type='button';close.textContent='×';
        close.setAttribute('aria-label','Volledig scherm sluiten');
        close.style.cssText='position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:100000;width:46px;height:46px;border-radius:50%;font-size:28px;font-weight:900';
        close.addEventListener('click',toggleFullscreen);document.body.appendChild(close);
      }
    }else document.getElementById('ms8221FullscreenClose')?.remove();
  }

  async function refresh(forceGps=false,forceMap=false){
    if(busy)return;
    if(!forceMap&&!aisVisible())return;
    busy=true;renderLoading();
    try{
      const position=await acquirePosition(forceGps);
      renderMap(position);
      lastRefresh=Date.now();started=true;
    }catch(error){
      renderError(error);started=true;lastRefresh=Date.now();
    }finally{busy=false}
  }

  function tick(){
    cleanLiteralNewline();
    ensureRoot();
    if(!aisVisible())return;
    if(!started||Date.now()-lastRefresh>MAP_REFRESH_MS)refresh(false);
  }

  window.addEventListener('message',event=>{
    const data=event?.data;
    if(!data||data.source!=='ms8221-ais-widget')return;
    const node=document.getElementById('ms8221WidgetStatus');
    const loading=document.getElementById('ms8221MapLoading');
    if(data.state==='ready'){
      state.widgetState='ready';
      if(node){node.className='ms8221-pill ok';node.textContent='● AIS-kaart online'}
      if(loading)loading.style.display='none';
    }else if(data.state==='error'){
      state.widgetState='error';
      if(node){node.className='ms8221-pill bad';node.textContent='● AIS-kaart niet bereikbaar'}
      if(loading){loading.innerHTML='<div><strong>AIS-kaart kon niet worden geladen</strong><span>Controleer de internetverbinding en tik op Ververs.</span></div>'}
    }else if(data.state==='waiting'){
      if(node){node.className='ms8221-pill warn';node.textContent='● AIS-kaart laden'}
    }
  });

  window.initAisPage=()=>refresh(false,true);
  window.ms711CenterAis=()=>refresh(true,true);
  window.ms711RefreshAis=()=>refresh(false,true);
  window.ms8221RefreshAis=()=>refresh(true,true);

  window.addEventListener('online',()=>{if(aisVisible())refresh(false,true)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&aisVisible())refresh(false)},{passive:true});
  window.addEventListener('hashchange',tick,{passive:true});

  function init(){
    cleanLiteralNewline();ensureRoot();
    clearInterval(pageTimer);pageTimer=setInterval(tick,1500);
    tick();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
