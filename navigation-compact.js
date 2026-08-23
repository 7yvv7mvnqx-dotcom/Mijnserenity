/* MijnSerenity 7.18.14 — navigatie echt vast aan de schermonderkant */
(()=>{
  'use strict';

  const SELECTOR='.bottom-nav';
  const NAV_CLASS='ms744-compact-nav';
  const KEYBOARD_CLASS='ms744-keyboard-open';
  const BOTTOM_VARIABLE='--ms751-nav-bottom';
  const root=document.documentElement;
  let observer=null;
  let resizeObserver=null;
  let frame=0;
  let settleTimer=0;

  function nav(){
    return document.querySelector(SELECTOR);
  }

  function isTextControl(target){
    return target instanceof Element&&Boolean(
      target.closest('input,textarea,select,[contenteditable="true"]')
    );
  }

  function viewportState(){
    const vv=window.visualViewport;
    const layoutHeight=Math.max(root.clientHeight||0,window.innerHeight||0);
    const active=document.activeElement;
    const textFocused=isTextControl(active);

    if(!vv||!layoutHeight){
      return {keyboardOpen:false,inset:0};
    }

    const visibleHeight=Number(vv.height)||layoutHeight;
    const heightLoss=Math.max(0,layoutHeight-visibleHeight);

    /*
      Safari/iOS maakt de Visual Viewport ook kleiner door browserbalken,
      zoomen en PWA-overgangen. Dat is géén toetsenbord. De navigatie mag
      daarom uitsluitend omhoog wanneer er werkelijk een invoerveld focus
      heeft én een groot deel van de viewport verdwijnt.
    */
    const keyboardOpen=Boolean(
      textFocused&&
      (heightLoss>140||visibleHeight<layoutHeight*.78)
    );

    if(!keyboardOpen)return {keyboardOpen:false,inset:0};

    const visibleBottom=(Number(vv.offsetTop)||0)+visibleHeight;
    const inset=Math.max(0,layoutHeight-visibleBottom);
    return {keyboardOpen:true,inset:Math.max(0,Math.round(inset))};
  }

  function forceNavToViewport(element,inset){
    if(!element)return;
    element.style.setProperty('position','fixed','important');
    element.style.setProperty('left','0','important');
    element.style.setProperty('right','0','important');
    element.style.setProperty('top','auto','important');
    element.style.setProperty('bottom',`${Math.max(0,inset||0)}px`,'important');
    element.style.setProperty('transform','none','important');
    element.style.setProperty('translate','none','important');
    element.style.setProperty('contain','none','important');
    element.style.setProperty('margin','0','important');
    element.style.setProperty('visibility','visible','important');
    element.style.setProperty('opacity','1','important');
    element.style.setProperty('pointer-events','auto','important');
    element.style.setProperty('z-index','2147483000','important');
  }

  function updateViewportInset(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const state=viewportState();
      root.style.setProperty(BOTTOM_VARIABLE,`${state.inset}px`);
      document.body?.classList.toggle(KEYBOARD_CLASS,state.keyboardOpen);
      forceNavToViewport(nav(),state.inset);
      if(state.keyboardOpen)keepFocusedControlVisible();
      if(typeof window.ms708ResizePager==='function')window.ms708ResizePager();
    });
  }

  function settleViewport(){
    clearTimeout(settleTimer);
    let attempt=0;
    const tick=()=>{
      updateViewportInset();
      attempt+=1;
      if(attempt<8)settleTimer=setTimeout(tick,80);
    };
    tick();
  }

  function keepFocusedControlVisible(){
    const active=document.activeElement;
    if(!isTextControl(active))return;

    const vv=window.visualViewport;
    const navHeight=Math.max(nav()?.getBoundingClientRect().height||0,58);
    const visibleTop=vv?.offsetTop||0;
    const visibleBottom=visibleTop+(vv?.height||window.innerHeight)-navHeight-10;
    const rect=active.getBoundingClientRect();

    if(rect.bottom>visibleBottom){
      window.scrollBy({top:rect.bottom-visibleBottom+12,left:0,behavior:'auto'});
    }else if(rect.top<visibleTop+8){
      window.scrollBy({top:rect.top-visibleTop-12,left:0,behavior:'auto'});
    }
  }

  function mount(){
    const element=nav();
    if(!element)return;

    /* Buiten scroll-, transform- en contain-containers houden. */
    if(element.parentElement!==document.body)document.body.appendChild(element);

    element.classList.remove(
      'ms742-compact-nav',
      'ms743-compact-nav',
      'bottom-nav-auto-hidden'
    );
    element.classList.add(
      NAV_CLASS,
      'bottom-nav-viewport-fixed',
      'bottom-nav-always-visible'
    );
    element.dataset.autoHide='false';
    element.setAttribute('aria-hidden','false');

    /* Zonder toetsenbord is bottom altijd exact 0. */
    root.style.setProperty(BOTTOM_VARIABLE,'0px');
    forceNavToViewport(element,0);
    updateViewportInset();
  }

  function initialise(){
    mount();

    document.addEventListener('focusin',settleViewport,true);
    document.addEventListener('focusout',()=>{
      root.style.setProperty(BOTTOM_VARIABLE,'0px');
      document.body?.classList.remove(KEYBOARD_CLASS);
      forceNavToViewport(nav(),0);
      settleViewport();
    },true);
    window.addEventListener('resize',settleViewport,{passive:true});
    window.addEventListener('orientationchange',settleViewport,{passive:true});
    window.addEventListener('pageshow',()=>{mount();settleViewport();},{passive:true});
    window.addEventListener('scroll',()=>{
      if(!document.body?.classList.contains(KEYBOARD_CLASS))forceNavToViewport(nav(),0);
    },{passive:true});

    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',settleViewport,{passive:true});
      window.visualViewport.addEventListener('scroll',updateViewportInset,{passive:true});
    }

    observer=new MutationObserver(()=>{
      const element=nav();
      if(element&&element.parentElement!==document.body)mount();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});

    if('ResizeObserver' in window){
      resizeObserver=new ResizeObserver(updateViewportInset);
      resizeObserver.observe(document.documentElement);
    }

    settleViewport();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }
})();
