/* MijnSerenity 7.4.7 — navigatie altijd zichtbaar op iPad/iPhone */
(()=>{
  'use strict';

  const SELECTOR='.bottom-nav';
  const IOS_CLASS='ms744-ios-viewport';
  const NAV_CLASS='ms744-compact-nav';
  const KEYBOARD_CLASS='ms744-keyboard-open';
  const REPOSITION_CLASS='ms744-nav-repositioning';

  let observer=null;
  let frame=0;
  let settleTimer=0;
  let lastTop='';

  const root=document.documentElement;
  const isIOS=(()=>{
    const platform=navigator.platform||'';
    const ua=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(ua)||
      (platform==='MacIntel'&&navigator.maxTouchPoints>1);
  })();

  function nav(){
    return document.querySelector(SELECTOR);
  }

  function viewportMetrics(){
    const vv=window.visualViewport;
    const pageTop=vv
      ? (Number.isFinite(vv.pageTop)?vv.pageTop:window.scrollY+(vv.offsetTop||0))
      : window.scrollY;
    const height=vv?.height||window.innerHeight||root.clientHeight;
    return {pageTop,height};
  }

  function keyboardIsVisible(){
    const vv=window.visualViewport;
    if(!vv)return false;
    const layoutHeight=Math.max(root.clientHeight||0,window.innerHeight||0);
    if(!layoutHeight)return false;
    return vv.height < layoutHeight*0.78;
  }

  function setKeyboardState(open){
    document.body?.classList.toggle(KEYBOARD_CLASS,Boolean(open));
  }

  function positionForVisibleViewport(force=false){
    const element=nav();
    if(!element)return;

    setKeyboardState(keyboardIsVisible());

    if(!isIOS){
      root.style.removeProperty('--ms744-nav-top');
      return;
    }

    const {pageTop,height}=viewportMetrics();
    const navHeight=Math.max(
      element.getBoundingClientRect().height,
      parseFloat(getComputedStyle(root).getPropertyValue('--nav-height'))||58
    );
    const maxDocumentTop=Math.max(0,document.documentElement.scrollHeight-navHeight);
    const calculated=Math.min(
      maxDocumentTop,
      Math.max(0,pageTop+height-navHeight)
    );
    const nextTop=`${Math.round(calculated)}px`;

    if(force||nextTop!==lastTop){
      lastTop=nextTop;
      root.style.setProperty('--ms744-nav-top',nextTop);
    }
  }

  function requestPosition(force=false){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>positionForVisibleViewport(force));
  }

  function settlePosition(){
    clearTimeout(settleTimer);
    document.body?.classList.add(REPOSITION_CLASS);
    let attempt=0;

    const tick=()=>{
      attempt+=1;
      requestPosition(true);
      keepFocusedControlVisible();
      if(attempt<12){
        settleTimer=setTimeout(tick,70);
      }else{
        document.body?.classList.remove(REPOSITION_CLASS);
      }
    };

    tick();
  }

  function centerActiveNavigationItem(smooth=false){
    const element=nav();
    const active=element?.querySelector('.bottom-nav-item.active');
    if(!element||!active)return;

    const maxLeft=Math.max(0,element.scrollWidth-element.clientWidth);
    const target=Math.max(
      0,
      Math.min(
        active.offsetLeft-(element.clientWidth-active.offsetWidth)/2,
        maxLeft
      )
    );

    element.scrollTo({left:target,top:0,behavior:smooth?'smooth':'auto'});
  }

  function isTextControl(target){
    return target instanceof Element&&Boolean(
      target.closest('input,textarea,select,[contenteditable="true"]')
    );
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

    if(element.parentElement!==document.body){
      document.body.appendChild(element);
    }

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

    if(isIOS)root.classList.add(IOS_CLASS);
    else root.classList.remove(IOS_CLASS);

    requestAnimationFrame(()=>{
      requestPosition(true);
      centerActiveNavigationItem(false);
    });
  }

  function scheduleMount(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(mount);
  }

  function initialise(){
    mount();

    document.addEventListener('focusin',()=>{
      setKeyboardState(true);
      settlePosition();
    },true);

    document.addEventListener('focusout',()=>{
      settlePosition();
    },true);

    document.addEventListener('click',event=>{
      const item=event.target.closest?.('.bottom-nav-item');
      if(!item)return;
      requestAnimationFrame(()=>centerActiveNavigationItem(true));
    });

    window.addEventListener('scroll',()=>requestPosition(),{passive:true});
    window.addEventListener('resize',settlePosition,{passive:true});
    window.addEventListener('pageshow',()=>{
      mount();
      settlePosition();
    },{passive:true});
    window.addEventListener('orientationchange',settlePosition,{passive:true});

    if(window.visualViewport){
      window.visualViewport.addEventListener('scroll',()=>requestPosition(),{passive:true});
      window.visualViewport.addEventListener('resize',settlePosition,{passive:true});
    }

    observer=new MutationObserver(()=>{
      const element=nav();
      if(element&&element.parentElement!==document.body)scheduleMount();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});

    if('ResizeObserver' in window){
      const resizeObserver=new ResizeObserver(()=>requestPosition());
      resizeObserver.observe(document.body);
    }

    setKeyboardState(keyboardIsVisible());
    settlePosition();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }
})();
