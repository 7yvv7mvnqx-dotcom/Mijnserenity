/* MijnSerenity 7.19.3 — connectiviteit, GPS, live weer en RWS-getijden */
(()=>{
  'use strict';
  if(window.__msMarineGlassPolish7193)return;
  window.__msMarineGlassPolish7193=true;
  const FALLBACK_BUILD='7.19.3';
  const $=id=>document.getElementById(id);
  const num=value=>{
    const match=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  };
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};

  function syncVersion(){
    /* Deze polish-module mag nooit de globale appversie terugzetten.
       Hij leest alleen de versie die de bootstrap heeft vastgesteld. */
    const build=String(window.MIJSERENITY_BUILD||FALLBACK_BUILD);
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=build;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=build);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=build;
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
    try{
      const cached=JSON.parse(localStorage.getItem('mijnserenity-ais-last-position')||'null');
      if(Number.isFinite(Number(cached?.lat))&&Number.isFinite(Number(cached?.lon))&&Date.now()-Number(cached.timestamp||0)<24*60*60*1000){
        return {lat:Number(cached.lat),lon:Number(cached.lon),accuracy:cached.accuracy};
      }
    }catch{}
    return null;
  }

  let geoPromise=null;
  async function resolvePosition(){
    const live=latestPosition();
    if(live)return live;
    if(!navigator.geolocation)return null;
    if(geoPromise)return geoPromise;
    geoPromise=new Promise(resolve=>navigator.geolocation.getCurrentPosition(
      pos=>resolve({lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy}),
      ()=>resolve(null),
      {enableHighAccuracy:false,maximumAge:5*60*1000,timeout:9000}
    )).finally(()=>{geoPromise=null});
    return geoPromise;
  }

  function syncGps(){
    const pos=latestPosition();
    if(pos){
      const accuracy=num(pos.accuracy);
      set('mgGps',accuracy!=null&&accuracy>0?`Actief · ±${Math.round(accuracy)} m`:'Actief');
    }else set('mgGps','Geen fix');
  }

  function activeNavigationPlan(){
    const candidates=[window.MIJSERENITY_ACTIVE_WATERKAARTEN_PLAN,window.MIJSERENITY_IMPORTED_ROUTE_PLAN];
    try{candidates.push(window.ms660NavigationPlan?.())}catch{}
    candidates.push(window.plannerCurrentPlan);
    return candidates.find(plan=>plan&&typeof plan==='object')||{};
  }

  function routeIsActive(){
    const plan=activeNavigationPlan();
    const state=window.liveNavState||{};
    const arrays=[plan.routeCoordinates,plan.route?.coordinates,plan.routeGeometry?.coordinates,plan.points,state.routeCoordinates,state.route,state.plannedRoute];
    if(arrays.some(value=>Array.isArray(value)&&value.length>1))return true;
    if(Array.isArray(plan.segments)&&plan.segments.some(segment=>Array.isArray(segment?.routeCoordinates)&&segment.routeCoordinates.length>1))return true;
    return Boolean(plan.destination||plan.destinationName||plan.waterkaartenRouteId||state.destination||state.destinationName);
  }

  function syncRoutePresentation(){
    if(routeIsActive())return;
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

  function connectionLabel(){
    if(!navigator.onLine)return 'Offline';
    const nativeType=String(window.MIJSERENITY_NETWORK_TYPE||'').trim();
    if(nativeType)return nativeType;
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const type=String(connection?.type||'').toLowerCase();
    if(type==='wifi')return 'Wifi / hotspot';
    if(type==='cellular')return 'Mobiel';
    if(type==='ethernet')return 'Ethernet';
    return 'Online';
  }
  function syncInternet(){set('mgNet',connectionLabel())}

  async function connectedBluetoothDevices(){
    const bridged=Array.isArray(window.MIJSERENITY_BLUETOOTH_DEVICES)
      ?window.MIJSERENITY_BLUETOOTH_DEVICES.filter(device=>device&&device.connected!==false)
      :[];
    if(bridged.length)return bridged.map(device=>({name:String(device.name||device.label||'Bluetooth-apparaat')}));
    const bluetooth=navigator.bluetooth;
    if(!bluetooth||typeof bluetooth.getDevices!=='function')return [];
    try{
      const devices=await bluetooth.getDevices();
      return devices.filter(device=>device?.gatt?.connected).map(device=>({name:device.name||'Bluetooth-apparaat'}));
    }catch{return []}
  }

  async function syncBluetooth(){
    const status=document.querySelector('#msMarineGlass .mg-status');
    if(!status)return;
    const devices=await connectedBluetoothDevices();
    let button=$('mgBluetoothStatus');
    if(!devices.length){button?.remove();return}
    if(!button){
      button=document.createElement('button');button.id='mgBluetoothStatus';button.type='button';button.className='mg-bluetooth';
      button.innerHTML='<small>Bluetooth</small><strong></strong>';
      const alarm=status.querySelector('.alarm');if(alarm)status.insertBefore(button,alarm);else status.appendChild(button);
    }
    const names=devices.map(device=>device.name).filter(Boolean);
    button.querySelector('strong').textContent=`◉ ${names.length===1?names[0]:`${names.length} verbonden`}`;
    button.title=`Verbonden Bluetooth: ${names.join(', ')}`;
  }

  function aisStatus(){
    const text=String($('ms711AisConnection')?.textContent||'').trim();
    if(/AIS online/i.test(text))return {online:true,label:'AIS online',sub:'Open AIS-kaart'};
    if(/offline/i.test(text))return {online:false,label:'AIS offline',sub:'Internet vereist'};
    return {online:false,label:'AIS omgeving',sub:'Open AIS-kaart'};
  }
  function openAis(){if(typeof window.captainNavigate==='function')window.captainNavigate('ais');else window.ms708GoToPage?.('ais',true)}
  function syncRadar(){
    const radar=document.querySelector('#msMarineGlass .mg-radar');if(!radar)return;
    radar.classList.add('mg-ais-shortcut');radar.setAttribute('role','button');radar.setAttribute('tabindex','0');radar.setAttribute('aria-label','Open AIS-kaart');
    radar.onclick=openAis;radar.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openAis()}};
    let status=radar.querySelector('.mg-radar-status');if(!status){status=document.createElement('div');status.className='mg-radar-status';radar.appendChild(status)}
    const info=aisStatus();radar.classList.toggle('ais-online',info.online);status.innerHTML=`<strong>${info.label}</strong><small>${info.sub}</small>`;
    const range=radar.querySelector(':scope > span');if(range)range.textContent='AIS';
    const course=num($('mg-course')?.textContent);const sweep=radar.querySelector(':scope > i');if(sweep)sweep.style.transform=`rotate(${(course??0)-90}deg)`;
  }

  const weatherState={busy:false,nextAt:0,key:'',data:null};
  function marineWeatherElements(){
    const foot=document.querySelector('#msMarineGlass .mg-weather-foot');
    if(!foot)return null;
    const cells=foot.querySelectorAll('span');
    if(cells.length<3)return null;
    return {pressure:cells[0].querySelector('b'),visibility:cells[1].querySelector('b'),precipitation:cells[2].querySelector('b')};
  }
  function renderMarineWeather(data=weatherState.data){
    if(!data)return;
    const els=marineWeatherElements();if(!els)return;
    const put=(el,value)=>{if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};
    put(els.pressure,data.pressure==null?'–':`${Math.round(data.pressure)} hPa`);
    const km=data.visibility==null?null:data.visibility/1000;
    put(els.visibility,km==null?'–':km>=10?'10+ km':`${km.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} km`);
    put(els.precipitation,data.precipitation==null?'–':`${Number(data.precipitation).toLocaleString('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:1})} mm`);
  }
  async function syncMarineWeather(force=false){
    renderMarineWeather();
    if(weatherState.busy||(!force&&Date.now()<weatherState.nextAt))return;
    const pos=await resolvePosition();if(!pos)return;
    const key=`${Number(pos.lat).toFixed(3)},${Number(pos.lon).toFixed(3)}`;
    if(!force&&key===weatherState.key&&Date.now()<weatherState.nextAt)return;
    weatherState.busy=true;weatherState.key=key;weatherState.nextAt=Date.now()+10*60*1000;
    try{
      const query=new URLSearchParams({latitude:Number(pos.lat).toFixed(5),longitude:Number(pos.lon).toFixed(5),current:'pressure_msl,visibility,precipitation',timezone:'auto'});
      const response=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`Weer ${response.status}`);
      const data=await response.json();const current=data?.current||{};
      weatherState.data={pressure:num(current.pressure_msl),visibility:num(current.visibility),precipitation:num(current.precipitation)};
      renderMarineWeather();
    }catch(error){
      console.warn('Marine Glass weerfooter niet bijgewerkt',error);weatherState.nextAt=Date.now()+2*60*1000;
    }finally{weatherState.busy=false}
  }

  const tideState={busy:false,nextAt:0,key:'',data:null};
  function tideCard(){return document.querySelector('#msMarineGlass .mg-tide')}
  function tideRows(card=tideCard()){return card?[...card.querySelectorAll('p')]:[]}
  function tideSubtitle(card=tideCard()){return card?.querySelector('h3 small')||null}
  function formatTideTime(value){
    const date=new Date(value);if(!Number.isFinite(date.getTime()))return '–';
    const now=new Date();const same=date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
    const time=date.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
    return same?time:`${date.toLocaleDateString('nl-NL',{weekday:'short'})} ${time}`;
  }
  function tideRow(row,event){
    const high=event?.type==='high',low=event?.type==='low';
    const label=high?'Hoogwater':low?'Laagwater':'Getij';
    const icon=high?'⌃':low?'⌄':'≈';
    const height=Number.isFinite(Number(event?.height))?`${Number(event.height).toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2})} m`:'– m';
    row.innerHTML=`<span class="mg-tide-icon">${icon}</span><b>${label}</b><span>${formatTideTime(event?.time)}</span><em>${height}</em>`;
  }
  function renderTideGraph(card,data){
    const svg=card.querySelector('svg');if(!svg)return;
    const path=svg.querySelector('path'),circle=svg.querySelector('circle');
    const events=(Array.isArray(data?.context)?data.context:[]).filter(e=>Number.isFinite(Number(e?.height))&&Number.isFinite(new Date(e?.time).getTime()));
    if(events.length<2){svg.hidden=true;return}
    svg.hidden=false;
    const min=Math.min(...events.map(e=>Number(e.height))),max=Math.max(...events.map(e=>Number(e.height))),span=Math.max(.05,max-min);
    const t0=new Date(events[0].time).getTime(),t1=new Date(events.at(-1).time).getTime(),duration=Math.max(1,t1-t0);
    const pt=e=>({x:8+(new Date(e.time).getTime()-t0)/duration*244,y:92-(Number(e.height)-min)/span*72});
    const points=events.map(pt);
    if(path)path.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
    const line=svg.querySelector('line');if(line){const zero=92-(0-min)/span*72;line.setAttribute('y1',String(Math.max(18,Math.min(92,zero))));line.setAttribute('y2',String(Math.max(18,Math.min(92,zero))))}
    const now=Date.now();let current=null;
    for(let i=0;i<events.length-1;i++){
      const a=events[i],b=events[i+1],ta=new Date(a.time).getTime(),tb=new Date(b.time).getTime();
      if(now>=ta&&now<=tb){const f=(now-ta)/(tb-ta),h=Number(a.height)+(Number(b.height)-Number(a.height))*(1-Math.cos(Math.PI*f))/2;current={x:8+(now-t0)/duration*244,y:92-(h-min)/span*72};break}
    }
    if(circle){circle.hidden=!current;if(current){circle.setAttribute('cx',current.x.toFixed(1));circle.setAttribute('cy',current.y.toFixed(1))}}
  }
  function renderTides(data=tideState.data){
    const card=tideCard();if(!card||!data)return;
    const rows=tideRows(card),subtitle=tideSubtitle(card),svg=card.querySelector('svg');
    card.classList.toggle('mg-no-tide',data.available===false&&data.reason==='non_tidal');
    card.classList.toggle('mg-tide-error',data.available===false&&data.reason==='error');
    if(data.available&&Array.isArray(data.events)&&data.events.length){
      if(subtitle)subtitle.textContent=data.station?.name||'RWS getijstation';
      rows.forEach((row,i)=>{row.hidden=!data.events[i];if(data.events[i])tideRow(row,data.events[i])});
      renderTideGraph(card,data);
      card.title=`Astronomische getij-extremen via Rijkswaterstaat${data.reference?` · t.o.v. ${data.reference}`:''}${data.station?.distanceKm!=null?` · station ${Number(data.station.distanceKm).toFixed(1)} km van Serenity`:''}`;
      return;
    }
    const noTide=data.reason==='non_tidal';
    if(subtitle)subtitle.textContent=noTide?'geen getij op deze locatie':'getijdata niet beschikbaar';
    rows.forEach((row,i)=>{row.hidden=i>0});
    if(rows[0])rows[0].innerHTML=noTide?'<span class="mg-tide-icon">≈</span><b>Geen getij</b><span>Binnenwater</span><em>n.v.t.</em>':'<span class="mg-tide-icon">!</span><b>Geen data</b><span>RWS</span><em>opnieuw proberen</em>';
    if(svg)svg.hidden=true;
    card.title=noTide?'Op deze locatie is geen astronomisch getij van toepassing.':'Rijkswaterstaat getijdata kon niet worden opgehaald.';
  }
  function renderTideLoading(){
    const card=tideCard();if(!card||tideState.data)return;
    const subtitle=tideSubtitle(card),rows=tideRows(card),svg=card.querySelector('svg');
    if(subtitle)subtitle.textContent='actuele locatie · laden…';
    rows.forEach((row,i)=>{row.hidden=i>0});
    if(rows[0])rows[0].innerHTML='<span class="mg-tide-icon">↻</span><b>Getijden</b><span>Ophalen…</span><em>RWS</em>';
    if(svg)svg.hidden=true;
  }
  async function syncTides(force=false){
    renderTides();
    if(tideState.busy||(!force&&Date.now()<tideState.nextAt))return;
    const pos=await resolvePosition();if(!pos)return;
    const key=`${Number(pos.lat).toFixed(2)},${Number(pos.lon).toFixed(2)}`;
    if(!force&&key===tideState.key&&Date.now()<tideState.nextAt)return;
    tideState.busy=true;tideState.key=key;tideState.nextAt=Date.now()+30*60*1000;renderTideLoading();
    try{
      const response=await fetch(`/.netlify/functions/tides?lat=${encodeURIComponent(Number(pos.lat).toFixed(6))}&lon=${encodeURIComponent(Number(pos.lon).toFixed(6))}`,{cache:'no-store'});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data)throw new Error(data?.error||`Getij ${response.status}`);
      tideState.data=data;renderTides();
    }catch(error){
      console.warn('RWS getijden niet bijgewerkt',error);tideState.data={available:false,reason:'error'};tideState.nextAt=Date.now()+3*60*1000;renderTides();
    }finally{tideState.busy=false}
  }

  function cleanMapControls(){const tools=document.querySelector('#msMarineGlass .mg-map-tools');if(tools)tools.hidden=true}
  function dashboardVisible(){const glass=$('msMarineGlass');if(!glass||glass.hidden)return false;const rect=glass.getBoundingClientRect();return rect.width>0&&rect.height>0}
  function polish(){
    syncVersion();syncInternet();if(!dashboardVisible())return;
    syncGps();syncRoutePresentation();syncEnergyWarning();syncAlarmPresentation();syncRadar();cleanMapControls();syncMarineWeather();syncTides();
  }

  function guardStatusFields(){
    const net=$('mgNet'),gps=$('mgGps');if(!window.MutationObserver)return;
    if(net)new MutationObserver(()=>queueMicrotask(syncInternet)).observe(net,{childList:true,characterData:true,subtree:true});
    if(gps)new MutationObserver(()=>queueMicrotask(syncGps)).observe(gps,{childList:true,characterData:true,subtree:true});
  }

  function start(){
    polish();syncBluetooth();
    setTimeout(()=>{polish();guardStatusFields();syncBluetooth()},300);
    setTimeout(polish,1200);setTimeout(polish,3200);
    const timer=setInterval(()=>{if(!document.hidden){polish();syncBluetooth()}},5000);
    window.addEventListener('mijnserenity:modules-ready',polish,{passive:true});
    window.addEventListener('mijnserenity:routechange',()=>setTimeout(polish,50),{passive:true});
    window.addEventListener('mijnserenity:waterkaarten-route-imported',()=>setTimeout(polish,50),{passive:true});
    window.addEventListener('mijnserenity:waterkaarten-route-enriched',()=>setTimeout(polish,50),{passive:true});
    window.addEventListener('online',()=>{tideState.nextAt=0;weatherState.nextAt=0;polish()},{passive:true});window.addEventListener('offline',polish,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){polish();syncBluetooth()}},{passive:true});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
