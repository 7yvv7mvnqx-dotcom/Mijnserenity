
/* ============================================================
   MijnSerenity Cloud 7.0.7 — pagina volgt de vinger
   ============================================================ */

const ms707PageOrder=[
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

const ms707PageLabels={
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

let ms707Gesture=null;
let ms707Frame=null;
let ms707Busy=false;
let ms707HintTimer=null;

function ms707CurrentPage(){
  const active=document.querySelector(
    '.bottom-nav-item.active[data-target]'
  );
  const id=active?.dataset.target;

  if(ms707PageOrder.includes(id)){
    return id;
  }

  return ms707PageOrder.find(pageId=>
    !document.getElementById(pageId)
      ?.classList.contains('hidden')
  )||'dashboard';
}

function ms707ModalOpen(){
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

function ms707HorizontalScroller(target){
  let element=target;

  while(
    element&&
    element!==document.body&&
    element!==document.documentElement
  ){
    const style=getComputedStyle(element);
    const scrollable=
      element.scrollWidth>
      element.clientWidth+8&&
      ['auto','scroll'].includes(
        style.overflowX
      );

    if(scrollable)return element;

    element=element.parentElement;
  }

  return null;
}

function ms707IgnoredTarget(target){
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
    ms707HorizontalScroller(target)
  );
}

function ms707ViewportWidth(){
  return Math.max(
    320,
    document.documentElement.clientWidth||
    window.innerWidth||
    320
  );
}

function ms707TargetForDirection(
  currentId,
  direction
){
  const currentIndex=
    ms707PageOrder.indexOf(currentId);

  if(currentIndex<0)return null;

  const targetIndex=
    currentIndex+direction;

  if(
    targetIndex<0||
    targetIndex>=ms707PageOrder.length
  ){
    return null;
  }

  return ms707PageOrder[targetIndex];
}

function ms707PrepareTarget(direction){
  const gesture=ms707Gesture;

  if(!gesture)return false;

  const targetId=
    ms707TargetForDirection(
      gesture.currentId,
      direction
    );

  if(!targetId){
    ms707ReleaseTarget();
    gesture.direction=direction;
    gesture.targetId=null;
    gesture.targetSection=null;
    return false;
  }

  if(
    gesture.targetId===targetId&&
    gesture.targetSection
  ){
    gesture.direction=direction;
    return true;
  }

  ms707ReleaseTarget();

  const target=
    document.getElementById(targetId);
  const current=
    gesture.currentSection;

  if(!target||!current)return false;

  gesture.direction=direction;
  gesture.targetId=targetId;
  gesture.targetSection=target;
  gesture.targetWasHidden=
    target.classList.contains('hidden');

  target.classList.remove('hidden');
  target.classList.add(
    'ms707-swipe-preview'
  );

  target.style.top=
    `${current.offsetTop}px`;
  target.style.left='0';
  target.style.width='100%';
  target.style.zIndex='31';
  target.style.willChange=
    'transform,opacity';

  current.classList.add(
    'ms707-swipe-current'
  );
  current.style.zIndex='32';
  current.style.willChange=
    'transform,opacity';

  ms707ApplyDrag(
    gesture.lastX-
    gesture.startX
  );

  return true;
}

function ms707ReleaseTarget(){
  const gesture=ms707Gesture;
  if(!gesture)return;

  const target=gesture.targetSection;

  if(target){
    target.classList.remove(
      'ms707-swipe-preview',
      'ms707-swipe-animating'
    );

    target.style.removeProperty('top');
    target.style.removeProperty('left');
    target.style.removeProperty('width');
    target.style.removeProperty('z-index');
    target.style.removeProperty('will-change');
    target.style.removeProperty('transform');
    target.style.removeProperty('opacity');
    target.style.removeProperty('transition');

    if(gesture.targetWasHidden){
      target.classList.add('hidden');
    }
  }

  gesture.targetSection=null;
  gesture.targetId=null;
  gesture.targetWasHidden=false;
}

function ms707Resistance(dx){
  const width=ms707ViewportWidth();
  const sign=Math.sign(dx)||1;
  const distance=Math.abs(dx);

  return sign*(
    width*
    (
      1-
      Math.exp(
        -distance/
        Math.max(1,width*.9)
      )
    )
  );
}

function ms707ScheduleDrag(dx){
  if(!ms707Gesture)return;

  ms707Gesture.pendingDx=dx;

  if(ms707Frame)return;

  ms707Frame=requestAnimationFrame(()=>{
    ms707Frame=null;

    if(!ms707Gesture)return;

    ms707ApplyDrag(
      ms707Gesture.pendingDx
    );
  });
}

function ms707ApplyDrag(rawDx){
  const gesture=ms707Gesture;
  if(!gesture)return;

  const width=ms707ViewportWidth();
  const direction=rawDx<0?1:-1;
  const hasTarget=
    ms707PrepareTarget(direction);

  let dx=rawDx;

  if(!hasTarget){
    dx=ms707Resistance(rawDx)*.22;
  }else{
    dx=Math.max(
      -width,
      Math.min(width,dx)
    );
  }

  gesture.renderedDx=dx;

  const progress=Math.min(
    1,
    Math.abs(dx)/width
  );

  const current=gesture.currentSection;
  const target=gesture.targetSection;

  if(current){
    current.style.transform=
      `translate3d(${dx}px,0,0)`;
    current.style.opacity=
      String(1-progress*.12);
  }

  if(target){
    const startX=
      direction>0
        ?width
        :-width;
    const targetX=startX+dx;

    target.style.transform=
      `translate3d(${targetX}px,0,0)`;
    target.style.opacity=
      String(.86+progress*.14);
  }

  document.documentElement.style.setProperty(
    '--ms707-progress',
    String(progress)
  );
}

function ms707PointerDown(event){
  if(
    ms707Busy||
    ms707ModalOpen()||
    ms707IgnoredTarget(event.target)
  ){
    return;
  }

  if(
    event.pointerType&&
    !['touch','pen'].includes(
      event.pointerType
    )
  ){
    return;
  }

  const edge=24;

  if(
    event.clientX<=edge||
    event.clientX>=window.innerWidth-edge
  ){
    return;
  }

  const currentId=
    ms707CurrentPage();
  const currentSection=
    document.getElementById(currentId);

  if(!currentSection)return;

  ms707Gesture={
    pointerId:event.pointerId,
    currentId,
    currentSection,
    targetId:null,
    targetSection:null,
    targetWasHidden:false,
    direction:0,
    startX:event.clientX,
    startY:event.clientY,
    lastX:event.clientX,
    lastY:event.clientY,
    startedAt:performance.now(),
    horizontal:false,
    cancelled:false,
    renderedDx:0,
    pendingDx:0
  };
}

function ms707PointerMove(event){
  const gesture=ms707Gesture;

  if(
    !gesture||
    event.pointerId!==gesture.pointerId
  ){
    return;
  }

  gesture.lastX=event.clientX;
  gesture.lastY=event.clientY;

  const dx=
    event.clientX-
    gesture.startX;
  const dy=
    event.clientY-
    gesture.startY;

  if(!gesture.horizontal){
    if(
      Math.abs(dy)>18&&
      Math.abs(dy)>Math.abs(dx)*1.12
    ){
      gesture.cancelled=true;
      ms707CancelGesture(false);
      return;
    }

    if(
      Math.abs(dx)>=12&&
      Math.abs(dx)>Math.abs(dy)*1.12
    ){
      gesture.horizontal=true;

      document.body.classList.add(
        'ms707-swipe-dragging'
      );

      try{
        event.currentTarget
          ?.setPointerCapture?.(
            event.pointerId
          );
      }catch{}
    }else{
      return;
    }
  }

  event.preventDefault();
  ms707ScheduleDrag(dx);
}

function ms707PointerUp(event){
  const gesture=ms707Gesture;

  if(
    !gesture||
    event.pointerId!==gesture.pointerId
  ){
    return;
  }

  if(
    !gesture.horizontal||
    gesture.cancelled
  ){
    ms707CancelGesture(false);
    return;
  }

  event.preventDefault();

  const dx=
    event.clientX-
    gesture.startX;
  const duration=
    Math.max(
      1,
      performance.now()-
      gesture.startedAt
    );
  const velocity=dx/duration;
  const width=ms707ViewportWidth();
  const direction=dx<0?1:-1;
  const targetId=
    ms707TargetForDirection(
      gesture.currentId,
      direction
    );

  const commit=Boolean(
    targetId&&
    (
      Math.abs(dx)>=width*.24||
      (
        Math.abs(dx)>=44&&
        Math.abs(velocity)>=.48
      )
    )
  );

  if(commit){
    ms707CompleteGesture(
      direction,
      targetId,
      velocity
    );
  }else{
    ms707CancelGesture(true);
  }
}

function ms707PointerCancel(){
  if(ms707Gesture){
    ms707CancelGesture(true);
  }
}

function ms707TransitionDuration(
  remaining,
  velocity
){
  const speed=Math.max(
    .45,
    Math.abs(velocity)
  );

  return Math.max(
    150,
    Math.min(
      300,
      remaining/speed*.42
    )
  );
}

function ms707CompleteGesture(
  direction,
  targetId,
  velocity
){
  const gesture=ms707Gesture;
  if(!gesture)return;

  if(
    !gesture.targetSection||
    gesture.targetId!==targetId
  ){
    ms707PrepareTarget(direction);
  }

  const width=ms707ViewportWidth();
  const currentX=
    Number(gesture.renderedDx)||0;
  const endX=
    direction>0
      ?-width
      :width;
  const remaining=
    Math.max(
      0,
      Math.abs(endX-currentX)
    );
  const duration=
    ms707TransitionDuration(
      remaining,
      velocity
    );
  const transition=
    `transform ${duration}ms cubic-bezier(.22,.78,.24,1), opacity ${duration}ms ease`;

  ms707Busy=true;

  gesture.currentSection
    ?.classList.add(
      'ms707-swipe-animating'
    );
  gesture.targetSection
    ?.classList.add(
      'ms707-swipe-animating'
    );

  if(gesture.currentSection){
    gesture.currentSection.style.transition=
      transition;
    gesture.currentSection.style.transform=
      `translate3d(${endX}px,0,0)`;
    gesture.currentSection.style.opacity='0.84';
  }

  if(gesture.targetSection){
    gesture.targetSection.style.transition=
      transition;
    gesture.targetSection.style.transform=
      'translate3d(0,0,0)';
    gesture.targetSection.style.opacity='1';
  }

  setTimeout(()=>{
    const currentSection=
      gesture.currentSection;
    const targetSection=
      gesture.targetSection;

    if(targetSection){
      gesture.targetWasHidden=false;
    }

    captainNavigate(targetId);

    ms707CleanupSection(
      currentSection
    );
    ms707CleanupSection(
      targetSection
    );

    document.body.classList.remove(
      'ms707-swipe-dragging'
    );
    document.documentElement.style
      .removeProperty(
        '--ms707-progress'
      );

    ms707Gesture=null;
    ms707Busy=false;

    ms707ShowPageToast(
      direction>0
        ?'Volgende pagina'
        :'Vorige pagina',
      ms707PageLabels[targetId]||
      targetId
    );

    ms707MarkSwipeUsed();

    const activeButton=
      document.querySelector(
        `.bottom-nav-item[data-target="${targetId}"]`
      );

    if(
      typeof scrollActiveBottomNavigationIntoView==='function'
    ){
      setTimeout(()=>{
        scrollActiveBottomNavigationIntoView(
          activeButton,
          true
        );
      },35);
    }
  },duration+20);
}

function ms707CancelGesture(animated=true){
  const gesture=ms707Gesture;
  if(!gesture)return;

  const current=gesture.currentSection;
  const target=gesture.targetSection;

  if(
    animated&&
    gesture.horizontal
  ){
    const duration=190;
    const transition=
      `transform ${duration}ms cubic-bezier(.22,.78,.24,1), opacity ${duration}ms ease`;
    const width=ms707ViewportWidth();
    const direction=
      gesture.direction||
      (
        gesture.renderedDx<0
          ?1
          :-1
      );

    if(current){
      current.style.transition=transition;
      current.style.transform=
        'translate3d(0,0,0)';
      current.style.opacity='1';
    }

    if(target){
      target.style.transition=transition;
      target.style.transform=
        `translate3d(${
          direction>0
            ?width
            :-width
        }px,0,0)`;
      target.style.opacity='.86';
    }

    setTimeout(()=>{
      ms707CleanupSection(current);
      ms707ReleaseTarget();
      document.body.classList.remove(
        'ms707-swipe-dragging'
      );
      document.documentElement.style
        .removeProperty(
          '--ms707-progress'
        );
      ms707Gesture=null;
    },duration+20);
  }else{
    ms707CleanupSection(current);
    ms707ReleaseTarget();
    document.body.classList.remove(
      'ms707-swipe-dragging'
    );
    document.documentElement.style
      .removeProperty(
        '--ms707-progress'
      );
    ms707Gesture=null;
  }
}

function ms707CleanupSection(section){
  if(!section)return;

  section.classList.remove(
    'ms707-swipe-current',
    'ms707-swipe-preview',
    'ms707-swipe-animating'
  );

  [
    'top',
    'left',
    'width',
    'z-index',
    'will-change',
    'transform',
    'opacity',
    'transition'
  ].forEach(property=>
    section.style.removeProperty(
      property
    )
  );
}

function ms707ShowPageToast(
  title,
  page
){
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
  },900);
}

function ms707HintKey(){
  return 'mijnserenity-707-swipe-hint-seen';
}

function ms707MarkSwipeUsed(){
  try{
    localStorage.setItem(
      ms707HintKey(),
      '1'
    );
  }catch{}

  ms707HideHint();
}

function ms707HideHint(){
  clearTimeout(ms707HintTimer);

  document.getElementById(
    'ms706SwipeHint'
  )?.classList.add('hidden');
}

function ms707MaybeShowHint(){
  let seen=false;

  try{
    seen=
      localStorage.getItem(
        ms707HintKey()
      )==='1';
  }catch{}

  if(seen)return;

  const hint=document.getElementById(
    'ms706SwipeHint'
  );

  if(!hint)return;

  hint.querySelector('strong').textContent=
    'Veeg: de pagina volgt je hand';

  setTimeout(()=>{
    hint.classList.remove('hidden');
  },1500);

  ms707HintTimer=setTimeout(
    ms707HideHint,
    7500
  );
}

function ms707Attach(){
  const appView=document.getElementById(
    'appView'
  );

  if(
    !appView||
    appView.dataset.ms707SwipeReady==='true'
  ){
    return;
  }

  appView.dataset.ms707SwipeReady='true';

  appView.addEventListener(
    'pointerdown',
    ms707PointerDown,
    {passive:true}
  );

  appView.addEventListener(
    'pointermove',
    ms707PointerMove,
    {passive:false}
  );

  appView.addEventListener(
    'pointerup',
    ms707PointerUp,
    {passive:false}
  );

  appView.addEventListener(
    'pointercancel',
    ms707PointerCancel,
    {passive:true}
  );

  appView.addEventListener(
    'lostpointercapture',
    ms707PointerCancel,
    {passive:true}
  );

  ms707MaybeShowHint();
}

document.addEventListener(
  'DOMContentLoaded',
  ms707Attach
);

window.addEventListener(
  'pageshow',
  ms707Attach,
  {passive:true}
);

window.addEventListener(
  'resize',
  ()=>{
    if(ms707Gesture){
      ms707CancelGesture(false);
    }
  },
  {passive:true}
);
