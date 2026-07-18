
/* ============================================================
   MijnSerenity Cloud 7.3.4 — OpenStreetMap + camera split view
   ============================================================ */

let ms702CameraStartBusy=false;
let ms702LayoutTimer=null;

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
