/* MijnSerenity 7.5.1 — navigatie echt vast aan het scherm */
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

  function viewportBottomInset(){
    const vv=window.visualViewport;
    if(!vv)return 0;

    const layoutHeight=Math.max(
      document.documentElement.clientHeight||0,
      window.innerHeight||0
    );
    if(!layoutHeight)return 0;

    const visibleBottom=(Number(vv.offsetTop)||0)+(Number(vv.height)||layoutHeight);
    const inset=Math.max(0,layoutHeight-visibleBottom);
    return inset<4?0:Math.round(inset);
  }

  function updateViewportInset(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const inset=viewportBottomInset();
      root.style.setProperty(BOTTOM_VARIABLE,`${inset}px`);
      const vv=window.visualViewport;
      const layoutHeight=Math.max(root.clientHeight||0,window.innerHeight||0);
      const keyboardOpen=Boolean(
        inset>70||
        (vv&&layoutHeight&&vv.height<layoutHeight*.78)
      );
      document.body?.classList.toggle(KEYBOARD_CLASS,keyboardOpen);
      keepFocusedControlVisible();
    });
  }

  function settleViewport(){
    clearTimeout(settleTimer);
    let attempt=0;
    const tick=()=>{
      updateViewportInset();
      attempt+=1;
      if(attempt<10)settleTimer=setTimeout(tick,70);
    };
    tick();
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

    updateViewportInset();
  }

  function initialise(){
    mount();

    document.addEventListener('focusin',settleViewport,true);
    document.addEventListener('focusout',settleViewport,true);
    window.addEventListener('resize',settleViewport,{passive:true});
    window.addEventListener('orientationchange',settleViewport,{passive:true});
    window.addEventListener('pageshow',()=>{mount();settleViewport();},{passive:true});

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
