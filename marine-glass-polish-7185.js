/* MijnSerenity 7.18.10 — connectiviteit, GPS en cockpitpolish */
(()=>{
  'use strict';
  if(window.__msMarineGlassPolish71810)return;
  window.__msMarineGlassPolish71810=true;
  const BUILD='7.18.10';
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

  function cleanMapControls(){const tools=document.querySelector('#msMarineGlass .mg-map-tools');if(tools)tools.hidden=true}
  function dashboardVisible(){const glass=$('msMarineGlass');if(!glass||glass.hidden)return false;const rect=glass.getBoundingClientRect();return rect.width>0&&rect.height>0}
  function polish(){
    syncVersion();syncInternet();if(!dashboardVisible())return;
    syncGps();syncRoutePresentation();syncEnergyWarning();syncAlarmPresentation();syncRadar();cleanMapControls();
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
    window.addEventListener('online',polish,{passive:true});window.addEventListener('offline',polish,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){polish();syncBluetooth()}},{passive:true});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
