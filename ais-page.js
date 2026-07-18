/* ============================================================
   MijnSerenity Cloud 7.2.2 — gratis MyShipTracking AIS-widget
   ============================================================ */

const MS711_WIDGET_SCRIPT='https://www.myshiptracking.com/js/widgetApi.js';
const MS711_EXTERNAL_MAP='https://www.myshiptracking.com/';
const MS711_WIDGET_ZOOM=13;
const MS711_WIDGET_TIMEOUT_MS=15000;
const MS711_POSITION_CACHE_KEY='mijnserenity-ais-last-position';

let ms711AisPosition=null;
let ms711AisLoadToken=0;
let ms711AisLoadTimer=null;
let ms711AisBusy=false;
let ms711AisInitialised=false;
let ms711AisLastLoadedAt=0;
let ms711AisFallbackFullscreen=false;

function ms711AisElement(id){
  return document.getElementById(id);
}

function ms711AisPageVisible(){
  const active=document.querySelector('.bottom-nav-item.active')?.dataset.target;
  if(active==='ais')return true;

  try{
    return typeof ms708CurrentPageId==='function'&&
      ms708CurrentPageId()==='ais'&&
      document.visibilityState==='visible';
  }catch{
    return false;
  }
}

function ms711SetButtonBusy(id,busy){
  const button=ms711AisElement(id);
  if(!button)return;
  button.classList.toggle('loading',Boolean(busy));
  button.disabled=Boolean(busy);
}

function ms711SetConnection(state,label){
  const pill=ms711AisElement('ms711AisConnection');
  if(!pill)return;
  pill.dataset.state=state;
  pill.innerHTML=`<i aria-hidden="true"></i> ${label}`;
}

function ms711SetStatus(message){
  const status=ms711AisElement('ms711AisStatus');
  if(status)status.textContent=message;
}

function ms711ShowNotice(kind,title,text){
  const notice=ms711AisElement('ms711AisNotice');
  const icon=ms711AisElement('ms711AisNoticeIcon');
  const titleElement=ms711AisElement('ms711AisNoticeTitle');
  const textElement=ms711AisElement('ms711AisNoticeText');

  if(!notice)return;

  const icons={
    loading:'◌',
    offline:'⌁',
    gps:'◎',
    error:'!',
    warning:'⚠'
  };

  notice.dataset.kind=kind;
  notice.classList.remove('hidden');
  if(icon)icon.textContent=icons[kind]||'!';
  if(titleElement)titleElement.textContent=title;
  if(textElement)textElement.textContent=text;
}

function ms711HideNotice(){
  ms711AisElement('ms711AisNotice')?.classList.add('hidden');
}

function ms711PositionLabel(position){
  if(!position)return 'GPS: nog niet beschikbaar';
  const accuracy=Number.isFinite(position.accuracy)
    ?` · ±${Math.round(position.accuracy)} m`
    :'';
  return `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}${accuracy}`;
}

function ms711UpdatePositionUi(position){
  const element=ms711AisElement('ms711AisPosition');
  if(element)element.textContent=`GPS: ${ms711PositionLabel(position)}`.replace('GPS: GPS: ','GPS: ');
}

function ms711SavePosition(position){
  try{
    localStorage.setItem(
      MS711_POSITION_CACHE_KEY,
      JSON.stringify(position)
    );
  }catch{}
}

function ms711ReadCachedPosition(){
  try{
    const value=JSON.parse(localStorage.getItem(MS711_POSITION_CACHE_KEY)||'null');
    const lat=Number(value?.lat);
    const lon=Number(value?.lon);
    const timestamp=Number(value?.timestamp);

    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    if(!Number.isFinite(timestamp)||Date.now()-timestamp>24*60*60*1000)return null;

    return {
      lat,
      lon,
      accuracy:Number.isFinite(Number(value.accuracy))?Number(value.accuracy):null,
      timestamp,
      source:'Laatst bekende GPS-positie'
    };
  }catch{
    return null;
  }
}

function ms711PositionFromLiveMode(){
  try{
    if(typeof liveNavState==='undefined')return null;
    const points=Array.isArray(liveNavState?.points)?liveNavState.points:[];
    const point=points.at(-1);
    const lat=Number(point?.lat);
    const lon=Number(point?.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;

    const timestamp=Number(point?.time||point?.timestamp)||Date.now();
    if(Date.now()-timestamp>2*60*1000)return null;

    return {
      lat,
      lon,
      accuracy:Number.isFinite(Number(liveNavState?.accuracy))
        ?Number(liveNavState.accuracy)
        :null,
      timestamp,
      source:'Live GPS van Serenity'
    };
  }catch{
    return null;
  }
}

function ms711GeolocationErrorMessage(error){
  if(error?.code===1){
    return 'Locatietoegang is geweigerd. Sta locatie toe voor MijnSerenity en probeer opnieuw.';
  }
  if(error?.code===2){
    return 'De GPS-positie is op dit moment niet beschikbaar.';
  }
  if(error?.code===3){
    return 'Het bepalen van de GPS-positie duurde te lang.';
  }
  return 'De huidige GPS-positie kon niet worden bepaald.';
}

function ms711GetGpsPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject(new Error('GPS wordt niet ondersteund op dit apparaat.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        lat:Number(position.coords.latitude),
        lon:Number(position.coords.longitude),
        accuracy:Number.isFinite(Number(position.coords.accuracy))
          ?Number(position.coords.accuracy)
          :null,
        timestamp:Number(position.timestamp)||Date.now(),
        source:'Actuele GPS-locatie'
      }),
      reject,
      {
        enableHighAccuracy:true,
        maximumAge:10000,
        timeout:15000
      }
    );
  });
}

function ms711EscapeSrcdoc(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function ms711WidgetDocument(position,token){
  const lat=Number(position.lat).toFixed(6);
  const lon=Number(position.lon).toFixed(6);
  const scriptUrl=ms711EscapeSrcdoc(MS711_WIDGET_SCRIPT);

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#061827}
iframe,object,embed{display:block!important;width:100%!important;height:100%!important;border:0!important}
</style>
</head>
<body>
<script>
var mst_width="100%";
var mst_height="100%";
var mst_border="0";
var mst_map_style="simple";
var mst_mmsi="";
var mst_show_track="false";
var mst_show_info="true";
var mst_fleet="";
var mst_lat="${lat}";
var mst_lng="${lon}";
var mst_zoom="${MS711_WIDGET_ZOOM}";
var mst_show_names="1";
var mst_scroll_wheel="true";
var mst_show_menu="true";
(function(){
  var send=function(state,message){
    parent.postMessage({source:'mijnserenity-myshiptracking',token:${token},state:state,message:message||''},'*');
  };
  window.addEventListener('error',function(event){
    send('error',event.message||'De externe AIS-widget gaf een fout.');
  });
  var observer=new MutationObserver(function(){
    var map=document.querySelector('iframe,object,embed');
    if(!map)return;
    map.style.width='100%';
    map.style.height='100%';
    map.style.border='0';
    observer.disconnect();
    send('ready','');
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(function(){send('waiting','');},10000);
})();
</script>
<script id="myshiptrackingscript" src="${scriptUrl}" async defer
  onload="parent.postMessage({source:'mijnserenity-myshiptracking',token:${token},state:'script-loaded',message:''},'*')"
  onerror="parent.postMessage({source:'mijnserenity-myshiptracking',token:${token},state:'error',message:'De externe MyShipTracking-widget kon niet worden geladen.'},'*')"></script>
</body>
</html>`;
}

function ms711MarkWidgetReady(){
  clearTimeout(ms711AisLoadTimer);
  ms711AisLoadTimer=null;
  ms711AisLastLoadedAt=Date.now();

  const usesCachedPosition=ms711AisPosition?.source==='Laatst bekende GPS-positie';
  if(usesCachedPosition){
    ms711SetConnection('warning','GPS beperkt');
    ms711SetStatus('GPS is niet beschikbaar; de AIS-kaart gebruikt de laatst bekende positie van Serenity.');
  }else{
    ms711SetConnection('online','AIS online');
    ms711SetStatus('AIS-kaart gecentreerd op de actuele positie van Serenity.');
  }
  ms711HideNotice();

  const updated=ms711AisElement('ms711AisUpdated');
  if(updated){
    updated.textContent=`Laatste verversing: ${new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}`;
  }
}

function ms711WidgetFailed(message){
  clearTimeout(ms711AisLoadTimer);
  ms711AisLoadTimer=null;
  ms711SetConnection('error','AIS niet beschikbaar');
  ms711SetStatus('De externe AIS-kaart kon niet worden geladen.');
  ms711ShowNotice(
    'error',
    'Externe AIS-kaart niet beschikbaar',
    message||'Probeer opnieuw of open de volledige kaart van MyShipTracking.'
  );
}

function ms711LoadWidget(position,statusMessage='AIS-kaart laden…'){
  if(!navigator.onLine){
    ms711HandleOffline();
    return;
  }

  const frame=ms711AisElement('ms711AisWidget');
  if(!frame)return;

  clearTimeout(ms711AisLoadTimer);
  ms711AisLoadToken+=1;
  const token=ms711AisLoadToken;

  ms711SetConnection('loading','Verbinden');
  ms711SetStatus(statusMessage);
  ms711ShowNotice(
    'loading',
    'AIS-kaart laden…',
    'MyShipTracking wordt rond de positie van Serenity geopend.'
  );

  frame.src='about:blank';
  frame.srcdoc=ms711WidgetDocument(position,token);

  ms711AisLoadTimer=setTimeout(()=>{
    if(token!==ms711AisLoadToken)return;
    ms711WidgetFailed(
      'De widget reageert niet. Controleer de internetverbinding of open de volledige externe kaart.'
    );
  },MS711_WIDGET_TIMEOUT_MS);
}

async function ms711AcquireAndLoad(forceGps=true){
  if(ms711AisBusy)return;
  ms711AisBusy=true;
  ms711SetButtonBusy('ms711LocateButton',true);

  if(!navigator.onLine){
    ms711HandleOffline();
    ms711AisBusy=false;
    ms711SetButtonBusy('ms711LocateButton',false);
    return;
  }

  ms711SetConnection('loading','GPS zoeken');
  ms711SetStatus('Actuele GPS-locatie van Serenity bepalen…');
  ms711ShowNotice(
    'gps',
    'GPS-locatie bepalen…',
    'Geef MijnSerenity toestemming om de huidige locatie te gebruiken.'
  );

  try{
    const livePosition=!forceGps?ms711PositionFromLiveMode():null;
    const position=livePosition||await ms711GetGpsPosition();

    ms711AisPosition=position;
    ms711SavePosition(position);
    ms711UpdatePositionUi(position);
    ms711LoadWidget(position,'AIS-kaart op actuele GPS-locatie laden…');
  }catch(error){
    const fallback=ms711PositionFromLiveMode()||ms711ReadCachedPosition();
    const message=error instanceof Error&&error.message.includes('ondersteund')
      ?error.message
      :ms711GeolocationErrorMessage(error);

    if(fallback){
      ms711AisPosition=fallback;
      ms711UpdatePositionUi(fallback);
      ms711LoadWidget(
        fallback,
        `${message} Daarom wordt de laatst bekende positie gebruikt.`
      );
    }else{
      ms711SetConnection('error','GPS niet beschikbaar');
      ms711SetStatus(message);
      ms711ShowNotice(
        'gps',
        'GPS niet beschikbaar',
        `${message} Zonder locatie kan de kaart niet automatisch op Serenity worden gecentreerd.`
      );
    }
  }finally{
    ms711AisBusy=false;
    ms711SetButtonBusy('ms711LocateButton',false);
  }
}

function ms711HandleOffline(){
  clearTimeout(ms711AisLoadTimer);
  ms711AisLoadTimer=null;
  ms711SetConnection('offline','Offline');
  ms711SetStatus('Geen internetverbinding. Internet-AIS is tijdelijk niet beschikbaar.');
  ms711ShowNotice(
    'offline',
    'Geen internetverbinding',
    'Maak verbinding met internet en probeer daarna opnieuw.'
  );
}

function ms711CenterAis(){
  ms711AcquireAndLoad(true);
}

function ms711RefreshAis(){
  if(ms711AisBusy)return;
  ms711SetButtonBusy('ms711RefreshButton',true);

  try{
    if(!navigator.onLine){
      ms711HandleOffline();
      return;
    }

    if(!ms711AisPosition){
      ms711AcquireAndLoad(true);
      return;
    }

    ms711LoadWidget(ms711AisPosition,'AIS-kaart verversen…');
  }finally{
    setTimeout(()=>ms711SetButtonBusy('ms711RefreshButton',false),500);
  }
}

function ms711ExternalAisUrl(){
  const url=new URL(MS711_EXTERNAL_MAP);
  if(ms711AisPosition){
    url.searchParams.set('lat',ms711AisPosition.lat.toFixed(6));
    url.searchParams.set('lng',ms711AisPosition.lon.toFixed(6));
    url.searchParams.set('zoom',String(MS711_WIDGET_ZOOM));
  }
  return url.toString();
}

function ms711OpenExternalAis(){
  const url=ms711ExternalAisUrl();
  const opened=window.open(url,'_blank','noopener,noreferrer');
  if(!opened)window.location.href=url;
}

function ms711SetFullscreenState(active){
  const button=ms711AisElement('ms711FullscreenButton');
  const exitButton=ms711AisElement('ms711FullscreenExitButton');

  if(button){
    button.textContent=active?'×':'⛶';
    button.setAttribute('aria-label',active?'Sluit volledig scherm':'AIS-kaart volledig scherm');
    button.title=active?'Sluit volledig scherm':'AIS-kaart volledig scherm';
  }

  exitButton?.classList.toggle('hidden',!active);
}

function ms711CloseFallbackFullscreen(){
  const shell=ms711AisElement('ms711AisMapShell');
  shell?.classList.remove('ms711-ais-fullscreen-fallback');
  document.body.classList.remove('ms711-ais-fullscreen-open');
  ms711AisFallbackFullscreen=false;
  ms711SetFullscreenState(false);
}

async function ms711ToggleAisFullscreen(){
  const shell=ms711AisElement('ms711AisMapShell');
  if(!shell)return;

  if(document.fullscreenElement){
    await document.exitFullscreen?.();
    return;
  }

  if(ms711AisFallbackFullscreen){
    ms711CloseFallbackFullscreen();
    return;
  }

  if(typeof shell.requestFullscreen==='function'){
    try{
      await shell.requestFullscreen();
      return;
    }catch{}
  }

  shell.classList.add('ms711-ais-fullscreen-fallback');
  document.body.classList.add('ms711-ais-fullscreen-open');
  ms711AisFallbackFullscreen=true;
  ms711SetFullscreenState(true);
}

async function initAisPage(){
  if(!ms711AisElement('ms711AisWidget'))return;

  if(!navigator.onLine){
    ms711HandleOffline();
    return;
  }

  const positionIsFresh=ms711AisPosition&&
    Date.now()-Number(ms711AisPosition.timestamp||0)<5*60*1000;
  const widgetIsFresh=ms711AisLastLoadedAt&&
    Date.now()-ms711AisLastLoadedAt<5*60*1000;

  if(ms711AisInitialised&&positionIsFresh&&widgetIsFresh)return;

  ms711AisInitialised=true;
  await ms711AcquireAndLoad(false);
}

window.addEventListener('message',event=>{
  const frame=ms711AisElement('ms711AisWidget');
  const data=event.data;

  if(event.source!==frame?.contentWindow)return;
  if(data?.source!=='mijnserenity-myshiptracking')return;
  if(Number(data.token)!==ms711AisLoadToken)return;

  if(data.state==='ready'||data.state==='script-loaded'){
    setTimeout(()=>{
      if(Number(data.token)===ms711AisLoadToken)ms711MarkWidgetReady();
    },data.state==='ready'?100:900);
  }else if(data.state==='error'){
    ms711WidgetFailed(data.message);
  }
});

window.addEventListener('offline',ms711HandleOffline,{passive:true});
window.addEventListener('online',()=>{
  if(ms711AisPageVisible())ms711AcquireAndLoad(true);
},{passive:true});

window.addEventListener('fullscreenchange',()=>{
  const shell=ms711AisElement('ms711AisMapShell');
  const active=document.fullscreenElement===shell||ms711AisFallbackFullscreen;
  ms711SetFullscreenState(active);
},{passive:true});

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&ms711AisPageVisible())initAisPage();
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&ms711AisFallbackFullscreen){
    ms711CloseFallbackFullscreen();
  }
});
