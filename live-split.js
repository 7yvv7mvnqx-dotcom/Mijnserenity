/* ============================================================
   MijnSerenity Cloud 8.25.4-rws1 — OpenStreetMap + camera split view
   + betrouwbare Vaarwegberichten-loader voor Live varen
   ============================================================ */

let ms702CameraStartBusy=false;
let ms702LayoutTimer=null;
let ms702RwsLoadPromise=null;

const MS702_RWS_SRC='/rws-nearby.js?v=825401';

function ms702StorageKey(){
  return `mijnserenity-live-split-${currentBoat?.id||'serenity'}`;
}

function ms702ReadMode(){
  try{
    const value=localStorage.getItem(ms702StorageKey());
    return ['equal','map','camera'].includes(value)
      ?value
      :'equal';
  }catch{
    return 'equal';
  }
}

function ms702WriteMode(mode){
  try{
    localStorage.setItem(ms702StorageKey(),mode);
  }catch{}
}

function ms702SetButtonState(mode){
  const buttons={
    equal:document.getElementById('ms702EqualButton'),
    map:document.getElementById('ms702MapButton'),
    camera:document.getElementById('ms702CameraButton')
  };

  Object.entries(buttons).forEach(([name,button])=>{
    if(!button)return;
    button.classList.toggle('secondary',name!==mode);
    button.classList.toggle('active',name===mode);
  });
}

function ms702SetSplitMode(mode='equal'){
  const valid=['equal','map','camera'];
  const selected=valid.includes(mode)?mode:'equal';
  const split=document.getElementById('ms702LiveSplit');

  if(!split)return;

  split.classList.remove('mode-equal','mode-map','mode-camera');
  split.classList.add(`mode-${selected}`);
  ms702WriteMode(selected);
  ms702SetButtonState(selected);

  clearTimeout(ms702LayoutTimer);
  ms702LayoutTimer=setTimeout(()=>{
    try{
      liveMap?.invalidateSize({pan:false});
    }catch{}
    ms702EqualisePanels();
  },180);
}

function ms702EqualisePanels(){
  const split=document.getElementById('ms702LiveSplit');
  const mapCanvas=document.getElementById('liveMapCanvas');
  const cameraViewport=document.querySelector(
    '#ms702LiveSplit .live-radar-camera-viewport'
  );

  if(!split||!mapCanvas||!cameraViewport)return;

  if(window.innerWidth<650){
    mapCanvas.style.height='';
    cameraViewport.style.height='';
    return;
  }

  const available=Math.max(
    320,
    Math.min(
      620,
      Math.round(window.innerHeight*.46)
    )
  );

  mapCanvas.style.height=`${available}px`;
  cameraViewport.style.height=`${available}px`;

  try{
    liveMap?.invalidateSize({pan:false});
  }catch{}
}

function ms702RunRwsRefresh(){
  try{window.initRwsPage?.()}catch(error){
    console.warn('Vaarwegberichten initialiseren mislukt:',error);
  }
  setTimeout(()=>{
    try{window.ms710RefreshRws?.()}catch(error){
      console.warn('Vaarwegberichten vernieuwen mislukt:',error);
    }
  },80);
}

function ms702EnsureRwsLoaded(){
  if(typeof window.ms710RefreshRws==='function'){
    ms702RunRwsRefresh();
    return Promise.resolve(true);
  }

  if(ms702RwsLoadPromise)return ms702RwsLoadPromise;

  const existing=[...document.scripts].find(script=>{
    if(!script.src)return false;
    try{return new URL(script.src,location.href).pathname==='/rws-nearby.js'}catch{return false}
  });

  ms702RwsLoadPromise=new Promise((resolve,reject)=>{
    const ready=()=>{
      ms702RunRwsRefresh();
      resolve(true);
    };
    const failed=error=>{
      ms702RwsLoadPromise=null;
      const status=document.getElementById('rwsLiveStatus');
      if(status)status.textContent='Vaarwegberichten konden niet worden geladen. Tik op vernieuwen om opnieuw te proberen.';
      reject(error instanceof Error?error:new Error('Vaarwegberichten laden mislukt'));
    };

    if(existing){
      if(typeof window.ms710RefreshRws==='function'){
        ready();
        return;
      }
      existing.addEventListener('load',ready,{once:true});
      existing.addEventListener('error',failed,{once:true});
      setTimeout(()=>{
        if(typeof window.ms710RefreshRws==='function')ready();
      },1200);
      return;
    }

    const script=document.createElement('script');
    script.src=MS702_RWS_SRC;
    script.async=false;
    script.dataset.msVaarberichtenLoader='1';
    script.addEventListener('load',ready,{once:true});
    script.addEventListener('error',failed,{once:true});
    document.head.appendChild(script);
  });

  return ms702RwsLoadPromise;
}

async function ms702EnsureCameraStarted(){
  if(
    ms702CameraStartBusy||
    document.hidden||
    document.getElementById('live')?.classList.contains('hidden')
  ){
    return;
  }

  const configured=Boolean(
    typeof radarCameraLiveUrl==='function'&&
    radarCameraLiveUrl()
  );

  if(
    !configured||
    (
      typeof radarCameraLiveActive!=='undefined'&&
      radarCameraLiveActive
    )
  ){
    return;
  }

  ms702CameraStartBusy=true;

  try{
    if(typeof loadTechnicalDashboard==='function'){
      await loadTechnicalDashboard(true);
    }

    if(typeof startRadarLiveStream==='function'){
      startRadarLiveStream(false);
    }
  }catch(error){
    console.warn(
      'Automatisch starten van livecamera mislukt:',
      error
    );
  }finally{
    ms702CameraStartBusy=false;
  }
}

function ms702ShowSplitView(){
  const split=document.getElementById('ms702LiveSplit');

  split?.scrollIntoView({
    behavior:'smooth',
    block:'center'
  });

  ms702SetSplitMode(
    ms702ReadMode()
  );

  setTimeout(()=>{
    try{
      liveMap?.invalidateSize({pan:false});
      centerLiveMap();
    }catch{}
    ms702EnsureCameraStarted();
    ms702EnsureRwsLoaded().catch(()=>{});
  },320);
}

function ms702RestoreSplitView(){
  ms702SetSplitMode(
    ms702ReadMode()
  );
  ms702EqualisePanels();
}

const ms702OriginalInitLiveMode=
  initLiveMode;

initLiveMode=async function(){
  const result=
    await ms702OriginalInitLiveMode();

  ms702RestoreSplitView();

  setTimeout(
    ms702EnsureCameraStarted,
    250
  );
  ms702EnsureRwsLoaded().catch(()=>{});

  return result;
};

const ms702OriginalRenderLiveState=
  renderLiveState;

renderLiveState=function(){
  const result=
    ms702OriginalRenderLiveState();

  ms702RestoreSplitView();

  if(
    !document.getElementById('live')?.classList.contains('hidden')
  ){
    ms702EnsureCameraStarted();
  }

  return result;
};

window.addEventListener(
  'resize',
  ()=>{
    clearTimeout(ms702LayoutTimer);
    ms702LayoutTimer=setTimeout(
      ms702EqualisePanels,
      160
    );
  },
  {passive:true}
);

window.addEventListener(
  'orientationchange',
  ()=>{
    setTimeout(
      ms702RestoreSplitView,
      350
    );
  },
  {passive:true}
);

document.addEventListener(
  'visibilitychange',
  ()=>{
    if(!document.hidden){
      ms702RestoreSplitView();
      ms702EnsureCameraStarted();
      if(!document.getElementById('live')?.classList.contains('hidden')){
        ms702EnsureRwsLoaded().catch(()=>{});
      }
    }
  }
);

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    setTimeout(
      ms702RestoreSplitView,
      900
    );

    setInterval(()=>{
      const liveVisible=
        !document.getElementById('live')
          ?.classList.contains('hidden');

      if(liveVisible){
        ms702EnsureCameraStarted();
      }
    },5000);
  }
);

/* De Live-route toont de Vaarwegberichtenkaart al in de HTML. Zorg daarom
   direct bij het laden van deze Live-module dat de logica erachter ook actief is. */
setTimeout(()=>ms702EnsureRwsLoaded().catch(()=>{}),0);
