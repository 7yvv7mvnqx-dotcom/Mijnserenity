
/* ============================================================
   MijnSerenity Cloud 7.0.6 — zijwaarts door pagina's vegen
   ============================================================ */

const ms706PageOrder=[
  'dashboard',
  'live',
  'map',
  'planner',
  'technical',
  'logbook',
  'pois',
  'finance',
  'settings'
];

const ms706PageLabels={
  dashboard:'Start',
  live:'Live varen',
  map:'Kaart',
  planner:'Reisplanner',
  technical:'Techniek',
  logbook:'Logboek',
  pois:'POI',
  finance:'Financieel',
  settings:'Boot'
};

let ms706Gesture=null;
let ms706TransitionBusy=false;
let ms706HintTimer=null;

function ms706CurrentPage(){
  const activeNav=document.querySelector(
    '.bottom-nav-item.active[data-target]'
  );

  const navTarget=activeNav?.dataset.target;

  if(ms706PageOrder.includes(navTarget)){
    return navTarget;
  }

  return ms706PageOrder.find(id=>
    !document.getElementById(id)
      ?.classList.contains('hidden')
  )||'dashboard';
}

function ms706ModalOpen(){
  return Boolean(
    document.querySelector(
      '.ms700-mission-modal:not(.hidden),'+
      '.ms705-route-control-modal:not(.hidden),'+
      '.planner-map-fullscreen:not(.hidden),'+
      '.radar-camera-fullscreen:not(.hidden),'+
      '.map-picker:not(.hidden),'+
      '.lightbox:not(.hidden),'+
      '.poi-detail-modal:not(.hidden),'+
      '.install-help:not(.hidden)'
    )
  );
}

function ms706ScrollableHorizontalElement(target){
  let element=target;

  while(
    element&&
    element!==document.body&&
    element!==document.documentElement
  ){
    const style=getComputedStyle(element);
    const overflowX=style.overflowX;
    const canScroll=
      element.scrollWidth>
      element.clientWidth+8&&
      ['auto','scroll'].includes(overflowX);

    if(canScroll)return element;

    element=element.parentElement;
  }

  return null;
}

function ms706IgnoredTarget(target){
  if(!target?.closest)return true;

  if(target.closest(
    'input,textarea,select,option,'+
    '[contenteditable="true"],'+
    '.bottom-nav,'+
    '.tabs,'+
    '.leaflet-container,'+
    '.live-radar-camera-viewport,'+
    '.radar-camera-actions,'+
    '.photo-grid,'+
    '.poi-web-photo-results,'+
    '.ms692-harbour-preview,'+
    '.ms700-modal-tabs,'+
    '.ms705-modal-tabs,'+
    '.ms702-split-buttons,'+
    '.route-import-preview,'+
    '.planner-map-card,'+
    '.map-picker,'+
    '.lightbox,'+
    '.poi-detail-modal,'+
    '.install-help'
  )){
    return true;
  }

  return Boolean(
    ms706ScrollableHorizontalElement(target)
  );
}

function ms706PointerDown(event){
  if(
    event.pointerType&&
    event.pointerType!=='touch'&&
    event.pointerType!=='pen'
  ){
    return;
  }

  if(
    ms706TransitionBusy||
    ms706ModalOpen()||
    ms706IgnoredTarget(event.target)
  ){
    ms706Gesture=null;
    return;
  }

  const edge=28;

  if(
    event.clientX<=edge||
    event.clientX>=window.innerWidth-edge
  ){
    ms706Gesture=null;
    return;
  }

  ms706Gesture={
    pointerId:event.pointerId,
    startX:event.clientX,
    startY:event.clientY,
    lastX:event.clientX,
    lastY:event.clientY,
    startedAt:performance.now(),
    cancelled:false,
    horizontal:false
  };
}

function ms706PointerMove(event){
  if(
    !ms706Gesture||
    event.pointerId!==ms706Gesture.pointerId
  ){
    return;
  }

  ms706Gesture.lastX=event.clientX;
  ms706Gesture.lastY=event.clientY;

  const dx=
    event.clientX-
    ms706Gesture.startX;
  const dy=
    event.clientY-
    ms706Gesture.startY;

  if(
    Math.abs(dy)>35&&
    Math.abs(dy)>Math.abs(dx)*1.1
  ){
    ms706Gesture.cancelled=true;
    return;
  }

  if(
    Math.abs(dx)>24&&
    Math.abs(dx)>Math.abs(dy)*1.35
  ){
    ms706Gesture.horizontal=true;
  }
}

function ms706PointerCancel(){
  ms706Gesture=null;
}

function ms706PointerUp(event){
  const gesture=ms706Gesture;
  ms706Gesture=null;

  if(
    !gesture||
    gesture.cancelled||
    !gesture.horizontal||
    event.pointerId!==gesture.pointerId||
    ms706ModalOpen()
  ){
    return;
  }

  const dx=
    event.clientX-
    gesture.startX;
  const dy=
    event.clientY-
    gesture.startY;
  const duration=
    performance.now()-
    gesture.startedAt;
  const distance=
    Math.abs(dx);
  const velocity=
    distance/
    Math.max(1,duration);

  const valid=
    Math.abs(dx)>
    Math.abs(dy)*1.35&&
    (
      distance>=72||
      (
        distance>=48&&
        velocity>=.55
      )
    )&&
    duration<=1100;

  if(!valid)return;

  if(dx<0){
    ms706NavigateRelative(1);
  }else{
    ms706NavigateRelative(-1);
  }
}

function ms706NavigateRelative(step){
  if(ms706TransitionBusy)return;

  const current=ms706CurrentPage();
  const currentIndex=
    ms706PageOrder.indexOf(current);

  if(currentIndex<0)return;

  const nextIndex=
    currentIndex+step;

  if(
    nextIndex<0||
    nextIndex>=ms706PageOrder.length
  ){
    ms706EdgeFeedback(step);
    return;
  }

  const target=
    ms706PageOrder[nextIndex];

  ms706TransitionBusy=true;

  captainNavigate(target);

  const section=
    document.getElementById(target);

  if(section){
    section.classList.remove(
      'ms706-enter-from-left',
      'ms706-enter-from-right'
    );

    void section.offsetWidth;

    section.classList.add(
      step>0
        ?'ms706-enter-from-right'
        :'ms706-enter-from-left'
    );

    setTimeout(()=>{
      section.classList.remove(
        'ms706-enter-from-left',
        'ms706-enter-from-right'
      );
    },330);
  }

  const activeButton=document.querySelector(
    `.bottom-nav-item[data-target="${target}"]`
  );

  if(
    typeof scrollActiveBottomNavigationIntoView==='function'
  ){
    setTimeout(()=>{
      scrollActiveBottomNavigationIntoView(
        activeButton,
        true
      );
    },50);
  }

  ms706ShowPageToast(
    step>0?'Volgende pagina':'Vorige pagina',
    ms706PageLabels[target]||target
  );

  ms706MarkSwipeUsed();

  setTimeout(()=>{
    ms706TransitionBusy=false;
  },340);
}

function ms706EdgeFeedback(step){
  const label=step<0
    ?'Dit is de eerste pagina'
    :'Dit is de laatste pagina';

  ms706ShowPageToast(
    label,
    ms706PageLabels[ms706CurrentPage()]||''
  );
}

function ms706ShowPageToast(title,page){
  let toast=document.getElementById(
    'ms706PageToast'
  );

  if(!toast){
    toast=document.createElement('div');
    toast.id='ms706PageToast';
    toast.className='ms706-page-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML=`
    <small>${esc(title)}</small>
    <strong>${esc(page)}</strong>
  `;

  toast.classList.remove('show');

  void toast.offsetWidth;

  toast.classList.add('show');

  clearTimeout(toast._hideTimer);

  toast._hideTimer=setTimeout(()=>{
    toast.classList.remove('show');
  },1150);
}

function ms706HintKey(){
  return 'mijnserenity-706-swipe-hint-seen';
}

function ms706MarkSwipeUsed(){
  try{
    localStorage.setItem(
      ms706HintKey(),
      '1'
    );
  }catch{}

  ms706HideHint();
}

function ms706HideHint(){
  clearTimeout(ms706HintTimer);

  document.getElementById(
    'ms706SwipeHint'
  )?.classList.add('hidden');
}

function ms706MaybeShowHint(){
  let seen=false;

  try{
    seen=
      localStorage.getItem(
        ms706HintKey()
      )==='1';
  }catch{}

  if(seen)return;

  const hint=document.getElementById(
    'ms706SwipeHint'
  );

  if(!hint)return;

  setTimeout(()=>{
    hint.classList.remove('hidden');
  },1800);

  ms706HintTimer=setTimeout(
    ms706HideHint,
    8000
  );
}

function ms706AttachSwipeNavigation(){
  const appView=document.getElementById(
    'appView'
  );

  if(
    !appView||
    appView.dataset.ms706SwipeReady==='true'
  ){
    return;
  }

  appView.dataset.ms706SwipeReady='true';

  appView.addEventListener(
    'pointerdown',
    ms706PointerDown,
    {passive:true}
  );

  appView.addEventListener(
    'pointermove',
    ms706PointerMove,
    {passive:true}
  );

  appView.addEventListener(
    'pointerup',
    ms706PointerUp,
    {passive:true}
  );

  appView.addEventListener(
    'pointercancel',
    ms706PointerCancel,
    {passive:true}
  );

  appView.addEventListener(
    'lostpointercapture',
    ms706PointerCancel,
    {passive:true}
  );

  ms706MaybeShowHint();
}

document.addEventListener(
  'DOMContentLoaded',
  ()=>{
    ms706AttachSwipeNavigation();
  }
);

window.addEventListener(
  'pageshow',
  ms706AttachSwipeNavigation,
  {passive:true}
);
