/* MijnSerenity 7.4.2 — compacte navigatie buiten de scrollcontainer */
(()=>{
  'use strict';

  const SELECTOR='.bottom-nav';
  let observer=null;
  let remountFrame=0;

  function nav(){
    return document.querySelector(SELECTOR);
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

    element.scrollTo({
      left:target,
      top:0,
      behavior:smooth?'smooth':'auto'
    });
  }

  function mount(){
    const element=nav();
    if(!element)return;

    if(element.parentElement!==document.body){
      document.body.appendChild(element);
    }

    element.classList.add(
      'ms742-compact-nav',
      'bottom-nav-viewport-fixed',
      'bottom-nav-always-visible'
    );
    element.classList.remove('bottom-nav-auto-hidden');
    element.dataset.autoHide='false';
    element.setAttribute('aria-hidden','false');

    requestAnimationFrame(()=>centerActiveNavigationItem(false));
  }

  function scheduleMount(){
    cancelAnimationFrame(remountFrame);
    remountFrame=requestAnimationFrame(mount);
  }

  function isTextControl(target){
    return target instanceof Element&&Boolean(
      target.closest('input,textarea,select,[contenteditable="true"]')
    );
  }

  function updateKeyboardState(){
    document.body.classList.toggle(
      'ms742-keyboard-open',
      isTextControl(document.activeElement)
    );
  }

  function initialise(){
    mount();

    document.addEventListener('focusin',updateKeyboardState,true);
    document.addEventListener('focusout',()=>{
      setTimeout(updateKeyboardState,80);
    },true);

    document.addEventListener('click',event=>{
      const item=event.target.closest?.('.bottom-nav-item');
      if(!item)return;
      requestAnimationFrame(()=>centerActiveNavigationItem(true));
    });

    window.addEventListener('pageshow',scheduleMount,{passive:true});
    window.addEventListener('orientationchange',()=>{
      setTimeout(scheduleMount,120);
    },{passive:true});

    window.visualViewport?.addEventListener('resize',scheduleMount,{passive:true});

    observer=new MutationObserver(()=>{
      const element=nav();
      if(element&&element.parentElement!==document.body)scheduleMount();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initialise,{once:true});
  }else{
    initialise();
  }
})();
