/* MijnSerenity 7.18.27 — document-scroll herstel voor iPhone/PWA */
(()=>{
  'use strict';
  if(window.__msMobileDocumentScroll71827)return;
  window.__msMobileDocumentScroll71827=true;

  const isMobile=()=>window.matchMedia?.('(max-width:760px)').matches;

  function normalize(){
    if(!isMobile())return;

    const pager=document.querySelector('.ms708-native-pager');
    const appView=document.getElementById('appView');

    /* Oude visualViewport-berekeningen mogen geen inline hoogte vasthouden. */
    pager?.style.removeProperty('height');
    pager?.style.removeProperty('max-height');
    appView?.style.removeProperty('height');
    appView?.style.removeProperty('max-height');

    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('height');
  }

  function scrollRouteToTop(){
    if(!isMobile())return;
    requestAnimationFrame(()=>{
      normalize();
      window.scrollTo({top:0,left:0,behavior:'auto'});
    });
  }

  window.addEventListener('mijnserenity:routechange',scrollRouteToTop,{passive:true});
  window.addEventListener('pageshow',normalize,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(normalize,120),{passive:true});
  window.addEventListener('resize',normalize,{passive:true});
  window.visualViewport?.addEventListener('resize',normalize,{passive:true});

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)normalize();
  },{passive:true});

  normalize();
  [100,350,900,1800,3500].forEach(delay=>setTimeout(normalize,delay));
})();
