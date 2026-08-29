/* MijnSerenity 7.19.2 — standaard AIS-kaart in de bovenste dashboardkaart */
(()=>{
  'use strict';
  if(window.__msDashboardAis71825)return;
  window.__msDashboardAis71825=true;

  const WIDGET_SCRIPT='https://www.myshiptracking.com/js/widgetApi.js';
  const POSITION_KEY='mijnserenity-ais-last-position';
  const MODE_KEY='mijnserenity-dashboard-map-mode';
  const REFRESH_MS=120000;
  const $=id=>document.getElementById(id);
  let mode='map';
  let loading=false;
  let lastLoadedAt=0;
  let refreshTimer=0;
  let messageBound=false;

  function num(value){
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function livePosition(){
    const state=window.liveNavState||{};
    const lat=num(state.currentLat??state.lat??state.position?.lat??state.position?.latitude);
    const lon=num(state.currentLon??state.lon??state.lng??state.position?.lon??state.position?.lng??state.position?.longitude);
    if(lat!==null&&lon!==null)return {lat,lon,accuracy:num(state.accuracy??state.gpsAccuracy??state.position?.accuracy),timestamp:Date.now(),source:'Live GPS Serenity'};

    const sets=[state.trackPoints,state.track,state.history,state.gpsTrack,state.points,state.live?.points];
    for(const list of sets){
      if(!Array.isArray(list)||!list.length)continue;
      const point=list[list.length-1]||{};
      const pLat=num(point.lat??point.latitude);
      const pLon=num(point.lon??point.lng??point.longitude);
      if(pLat===null||pLon===null)continue;
      return {lat:pLat,lon:pLon,accuracy:num(point.accuracy??state.accuracy),timestamp:num(point.time??point.timestamp)??Date.now(),source:'Live GPS Serenity'};
    }
    return null;
  }

  function cachedPosition(){
    try{
      const value=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
      const lat=num(value?.lat),lon=num(value?.lon),timestamp=num(value?.timestamp);
      if(lat===null||lon===null)return null;
      if(timestamp!==null&&Date.now()-timestamp>24*60*60*1000)return null;
      return {lat,lon,accuracy:num(value?.accuracy),timestamp:timestamp??Date.now(),source:'Laatst bekende GPS'};
    }catch{return null}
  }

  function savePosition(position){
    if(!position)return;
    try{localStorage.setItem(POSITION_KEY,JSON.stringify(position))}catch{}
  }

  function browserPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){reject(new Error('GPS niet ondersteund'));return}
      navigator.geolocation.getCurrentPosition(
        result=>resolve({
          lat:num(result.coords.latitude),lon:num(result.coords.longitude),accuracy:num(result.coords.accuracy),
          timestamp:num(result.timestamp)??Date.now(),source:'Actuele GPS'
        }),
        reject,
        {enableHighAccuracy:true,maximumAge:15000,timeout:12000}
      );
    });
  }

  async function acquirePosition(){
    const live=livePosition();
    if(live){savePosition(live);return live}
    try{
      const gps=await browserPosition();
      if(gps.lat!==null&&gps.lon!==null){savePosition(gps);return gps}
    }catch{}
    return cachedPosition();
  }

  function widgetDocument(position){
    const lat=Number(position.lat).toFixed(6);
    const lon=Number(position.lon).toFixed(6);
    return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#061827}body>iframe,body>object,body>embed,iframe,object,embed{display:block!important;width:100%!important;height:100%!important;min-height:100%!important;border:0!important}</style></head><body><script>var mst_width="100%";var mst_height=((window.innerHeight||620)+"px");var mst_border="0";var mst_map_style="simple";var mst_mmsi="";var mst_show_track="false";var mst_show_info="true";var mst_fleet="";var mst_lat="${lat}";var mst_lng="${lon}";var mst_zoom="13";var mst_show_names="1";var mst_scroll_wheel="true";var mst_show_menu="true";(function(){var send=function(state,message){try{parent.postMessage({source:'mijnserenity-dashboard-ais',state:state,message:message||''},'*')}catch(e){}};var done=false;var ready=function(){if(done)return;var map=document.querySelector('iframe,object,embed');if(!map)return;done=true;map.style.width='100%';map.style.height='100%';map.style.minHeight='100%';map.style.border='0';send('ready','')};var observer=new MutationObserver(ready);observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',ready);setTimeout(ready,500);setTimeout(function(){if(!done)send('waiting','')},9000)})();<\/script><script id="myshiptrackingscript" src="${WIDGET_SCRIPT}" async defer onerror="parent.postMessage({source:'mijnserenity-dashboard-ais',state:'error',message:'AIS-bron kon niet worden geladen'},'*')"><\/script></body></html>`;
  }

  function ensureStyle(){
    if($('mgDashboardAis71825Style'))return;
    $('mgDashboardAis71824Style')?.remove();
    const style=document.createElement('style');
    style.id='mgDashboardAis71825Style';
    style.textContent=`
      #msMarineGlass .mg-map{isolation:isolate}
      #msMarineGlass .mg-map-mode-switch{position:absolute;z-index:780;left:50%;top:12px;transform:translateX(-50%);display:flex;gap:3px;padding:3px;border:1px solid rgba(160,205,230,.30);border-radius:999px;background:rgba(3,18,30,.90);box-shadow:0 8px 18px rgba(0,0,0,.28);backdrop-filter:blur(12px)}
      #msMarineGlass .mg-map-mode-switch button{min-height:34px!important;padding:0 13px!important;border:0!important;border-radius:999px!important;background:transparent!important;color:#a9becc!important;font-size:11px!important;font-weight:760!important;white-space:nowrap!important}
      #msMarineGlass .mg-map-mode-switch button.active{background:#0e466d!important;color:#eefaff!important;box-shadow:inset 0 0 0 1px rgba(77,188,255,.30)!important}
      #msMarineGlass .mg-map-mode-switch button[data-mode="ais"].active:before{content:"";display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#51e68e;box-shadow:0 0 9px rgba(81,230,142,.75)}
      #msMarineGlass .mg-radar{display:none!important}
      #msMarineGlass .mg-ais-live-layer{position:absolute;inset:0;z-index:700;background:#061827;display:none;overflow:hidden}
      #msMarineGlass .mg-map.mg-ais-mode .mg-ais-live-layer{display:block}
      #msMarineGlass .mg-ais-live-layer>iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#061827}
      #msMarineGlass .mg-ais-overlay{position:absolute;z-index:760;left:10px;right:10px;bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;pointer-events:none}
      #msMarineGlass .mg-ais-status{display:flex;align-items:center;gap:7px;max-width:72%;padding:7px 10px;border:1px solid rgba(130,179,207,.28);border-radius:999px;background:rgba(3,17,28,.91);color:#c9dce8;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 7px 16px rgba(0,0,0,.25)}
      #msMarineGlass .mg-ais-status i{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:#f3bd49;box-shadow:0 0 8px rgba(243,189,73,.55)}
      #msMarineGlass .mg-ais-status.online i{background:#51e68e;box-shadow:0 0 9px rgba(81,230,142,.75)}
      #msMarineGlass .mg-ais-status.error i{background:#ff6762;box-shadow:0 0 9px rgba(255,103,98,.65)}
      #msMarineGlass .mg-ais-open{pointer-events:auto!important;min-height:34px!important;padding:0 11px!important;border:1px solid rgba(80,172,226,.40)!important;border-radius:9px!important;background:rgba(5,32,51,.93)!important;color:#8ed8ff!important;font-size:10px!important;font-weight:760!important;white-space:nowrap!important}
      #msMarineGlass .mg-map.mg-ais-mode #mgMap,#msMarineGlass .mg-map.mg-ais-mode .mg-north,#msMarineGlass .mg-map.mg-ais-mode .leaflet-control-container{visibility:hidden!important;pointer-events:none!important}
      #msMarineGlass .mg-map.mg-ais-mode .mg-map-mode-switch{visibility:visible!important;pointer-events:auto!important}
      @media(max-width:760px){#msMarineGlass .mg-map-mode-switch{top:9px}#msMarineGlass .mg-map-mode-switch button{min-height:32px!important;padding:0 11px!important;font-size:10px!important}#msMarineGlass .mg-ais-overlay{bottom:8px;left:8px;right:8px}#msMarineGlass .mg-ais-status{max-width:67%;font-size:9px;padding:6px 8px}#msMarineGlass .mg-ais-open{font-size:9px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi(){
    const card=document.querySelector('#msMarineGlass .mg-map');
    if(!card)return null;
    ensureStyle();

    const radar=card.querySelector('.mg-radar');
    if(radar){
      radar.hidden=true;
      radar.setAttribute('aria-hidden','true');
      radar.removeAttribute('role');
      radar.removeAttribute('tabindex');
    }

    let switcher=$('mgMapModeSwitch');
    if(!switcher){
      switcher=document.createElement('div');
      switcher.id='mgMapModeSwitch';
      switcher.className='mg-map-mode-switch';
      switcher.setAttribute('role','group');
      switcher.setAttribute('aria-label','Kaartweergave');
      switcher.innerHTML='<button type="button" data-mode="map" class="active">Kaart</button><button type="button" data-mode="ais">AIS kaart</button>';
      card.appendChild(switcher);
    }else{
      const aisButton=switcher.querySelector('button[data-mode="ais"]');
      if(aisButton)aisButton.textContent='AIS kaart';
    }
    if(!switcher.dataset.ais71825){
      switcher.dataset.ais71825='1';
      switcher.addEventListener('click',event=>{
        const button=event.target.closest('button[data-mode]');
        if(!button)return;
        event.preventDefault();
        event.stopPropagation();
        setMode(button.dataset.mode,true);
      });
    }

    let layer=$('mgAisLiveLayer');
    if(!layer){
      layer=document.createElement('div');
      layer.id='mgAisLiveLayer';
      layer.className='mg-ais-live-layer';
      layer.innerHTML='<iframe id="mgAisLiveFrame" title="Standaard AIS-kaart rond Serenity" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="mg-ais-overlay"><span id="mgAisLiveStatus" class="mg-ais-status"><i></i><span>AIS gereed</span></span><button id="mgAisOpenFull" class="mg-ais-open" type="button">Volledige AIS ›</button></div>';
      card.appendChild(layer);
    }
    const open=$('mgAisOpenFull');
    if(open&&!open.dataset.ais71825){
      open.dataset.ais71825='1';
      open.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(typeof window.captainNavigate==='function')window.captainNavigate('ais');
        else window.ms708GoToPage?.('ais',true);
      });
    }
    return card;
  }

  function status(text,state=''){
    const node=$('mgAisLiveStatus');
    if(!node)return;
    node.classList.toggle('online',state==='online');
    node.classList.toggle('error',state==='error');
    const span=node.querySelector('span');
    if(span)span.textContent=text;
  }

  function bindMessages(){
    if(messageBound)return;
    messageBound=true;
    window.addEventListener('message',event=>{
      const data=event?.data;
      if(!data||data.source!=='mijnserenity-dashboard-ais')return;
      if(data.state==='ready'){
        lastLoadedAt=Date.now();
        const time=new Date(lastLoadedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
        status(`AIS online · schepen in de buurt · ${time}`,'online');
      }else if(data.state==='error'){
        status(data.message||'AIS tijdelijk niet beschikbaar','error');
      }else if(data.state==='waiting'){
        status('AIS-kaart wordt nog geladen…');
      }
    });
  }

  async function loadAis(force=false){
    if(loading||mode!=='ais')return;
    if(!navigator.onLine){status('Geen internet · AIS niet beschikbaar','error');return}
    if(!force&&lastLoadedAt&&Date.now()-lastLoadedAt<REFRESH_MS-5000)return;
    loading=true;
    status('GPS bepalen en AIS laden…');
    try{
      const position=await acquirePosition();
      if(!position)throw new Error('Geen GPS-positie beschikbaar');
      const frame=$('mgAisLiveFrame');
      if(!frame)throw new Error('AIS-kaart ontbreekt');
      frame.src='about:blank';
      frame.srcdoc=widgetDocument(position);
      const source=position.source==='Laatst bekende GPS'?'laatste GPS':'live GPS';
      status(`AIS laden · ${source}`);
    }catch(error){
      status(error?.message||'AIS kon niet worden geladen','error');
    }finally{
      loading=false;
    }
  }

  function updateButtons(){
    const switcher=$('mgMapModeSwitch');
    if(!switcher)return;
    switcher.querySelectorAll('button[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  }

  function setMode(next,userAction=false){
    if(next!=='ais')next='map';
    mode=next;
    const card=ensureUi();
    if(!card)return;
    card.classList.toggle('mg-ais-mode',mode==='ais');
    updateButtons();
    if(userAction){try{localStorage.setItem(MODE_KEY,mode)}catch{}}
    if(mode==='ais')loadAis(true);
    else setTimeout(()=>{try{window.dispatchEvent(new Event('resize'))}catch{}},50);
  }

  function refreshIfNeeded(){
    if(mode!=='ais'||document.hidden)return;
    const next=livePosition();
    if(next)savePosition(next);
    loadAis(false);
  }

  function mount(){
    bindMessages();
    const card=ensureUi();
    if(!card)return false;
    let saved='map';
    try{saved=localStorage.getItem(MODE_KEY)||'map'}catch{}
    setMode(saved==='ais'?'ais':'map',false);
    if(!refreshTimer)refreshTimer=setInterval(refreshIfNeeded,30000);
    return true;
  }

  window.msSetDashboardMapMode=setMode;
  window.msRefreshDashboardAis=()=>loadAis(true);

  function start(){
    if(!mount()){
      [200,700,1500,3000,6000].forEach(delay=>setTimeout(mount,delay));
    }
    ['mijnserenity:routechange','mijnserenity:modules-ready','mijnserenity-ha-state-updated'].forEach(name=>window.addEventListener(name,()=>{ensureUi();refreshIfNeeded()},{passive:true}));
    window.addEventListener('online',()=>{if(mode==='ais')loadAis(true)},{passive:true});
    window.addEventListener('offline',()=>{if(mode==='ais')status('Geen internet · AIS niet beschikbaar','error')},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){ensureUi();refreshIfNeeded()}},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();