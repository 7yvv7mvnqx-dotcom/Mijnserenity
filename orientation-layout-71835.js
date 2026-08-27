/* MijnSerenity 7.18.35 — iOS/PWA portrait-landscape breedteherstel */
(()=>{
  'use strict';
  if(window.__msOrientationLayout71835)return;
  window.__msOrientationLayout71835=true;

  const STYLE_ID='msOrientationLayout71835Style';
  const TARGETS='body > main, #appView, #dashboard, #dashboard.mg-active, #msMarineGlass, .ms708-native-pager, .ms708-native-pager > .ms708-native-page';

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html,body{
        box-sizing:border-box!important;
        width:var(--ms-layout-width,100%)!important;
        max-width:var(--ms-layout-width,100%)!important;
        min-width:0!important;
        overflow-x:hidden!important;
      }
      body > main,
      body.ms750-simple-ui > main,
      body.ms760-captain-experience > main,
      body.ms708-native-pages-active > main,
      #appView,
      #dashboard,
      #dashboard.mg-active,
      #msMarineGlass,
      .ms708-native-pager,
      .ms708-native-pager > .ms708-native-page{
        box-sizing:border-box!important;
        width:var(--ms-layout-width,100%)!important;
        max-width:var(--ms-layout-width,100%)!important;
        min-width:0!important;
        margin-left:0!important;
        margin-right:0!important;
      }
      #msMarineGlass > .mg-top,
      #msMarineGlass > main.mg-grid{
        box-sizing:border-box!important;
        width:100%!important;
        max-width:none!important;
      }
      .bottom-nav,
      .bottom-nav.ms744-compact-nav{
        box-sizing:border-box!important;
        width:var(--ms-layout-width,100%)!important;
        max-width:var(--ms-layout-width,100%)!important;
        left:0!important;
        right:auto!important;
      }

      /* Liggende telefoon: echt gebruikmaken van de extra breedte. */
      @media (orientation:landscape) and (max-height:700px){
        #msMarineGlass{
          padding-left:max(8px,env(safe-area-inset-left))!important;
          padding-right:max(8px,env(safe-area-inset-right))!important;
        }
        #msMarineGlass > main.mg-grid{
          display:flex!important;
          flex-direction:column!important;
          gap:8px!important;
        }
        #msMarineGlass > main.mg-grid > .mg-map{
          width:100%!important;
          height:min(52dvh,360px)!important;
          min-height:245px!important;
          max-height:360px!important;
        }
        #msMarineGlass > main.mg-grid > .mg-gauges{
          width:100%!important;
          display:grid!important;
          grid-template-columns:repeat(3,minmax(0,1fr))!important;
          grid-auto-rows:auto!important;
        }
        #msMarineGlass .mg-gauge{
          min-height:138px!important;
        }
        #msMarineGlass .mg-dial{
          width:min(112px,76%)!important;
        }
        #msMarineGlass .mg-energy-grid{
          grid-template-columns:minmax(180px,.8fr) minmax(0,1.7fr)!important;
        }
        .bottom-nav,
        .bottom-nav.ms744-compact-nav{
          height:calc(58px + env(safe-area-inset-bottom))!important;
          min-height:calc(58px + env(safe-area-inset-bottom))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  }

  function orientationIsLandscape(){
    if(window.matchMedia?.('(orientation: landscape)').matches)return true;
    const vv=window.visualViewport;
    const w=vv?.width||window.innerWidth||0;
    const h=vv?.height||window.innerHeight||0;
    return w>h;
  }

  function measure(){
    ensureStyle();
    const landscape=orientationIsLandscape();
    const vv=window.visualViewport;
    const innerW=Math.round(window.innerWidth||0);
    const innerH=Math.round(window.innerHeight||0);
    const clientW=Math.round(document.documentElement.clientWidth||0);
    const clientH=Math.round(document.documentElement.clientHeight||0);
    const vvW=Math.round(vv?.width||0);
    const vvH=Math.round(vv?.height||0);
    const screenW=Math.round(window.screen?.width||0);
    const screenH=Math.round(window.screen?.height||0);

    let width=Math.max(vvW,innerW,clientW,1);
    let height=Math.max(vvH,innerH,clientH,1);

    /* iOS kan in een geïnstalleerde PWA na rotatie nog kort de portrait-
       viewport rapporteren. In standalone modus is de lange/korte zijde van
       screen wél betrouwbaar, dus gebruiken we die als ondergrens. */
    if(isStandalone()&&screenW&&screenH){
      const longSide=Math.max(screenW,screenH);
      const shortSide=Math.min(screenW,screenH);
      width=landscape?Math.max(width,longSide):Math.min(width||shortSide,shortSide);
      height=landscape?Math.min(height||shortSide,shortSide):Math.max(height,longSide);
    }

    const root=document.documentElement;
    root.dataset.msOrientation=landscape?'landscape':'portrait';
    document.body?.setAttribute('data-ms-orientation',landscape?'landscape':'portrait');
    root.style.setProperty('--ms-layout-width',`${width}px`);
    root.style.setProperty('--ms-layout-height',`${height}px`);
    root.style.setProperty('--ms-viewport-width',`${width}px`);
    root.style.setProperty('--ms-viewport-height',`${height}px`);

    document.querySelectorAll(TARGETS).forEach(node=>{
      node.style.setProperty('width',`${width}px`,'important');
      node.style.setProperty('max-width',`${width}px`,'important');
      node.style.setProperty('min-width','0','important');
      node.style.setProperty('box-sizing','border-box','important');
    });

    const nav=document.querySelector('.bottom-nav');
    if(nav){
      nav.style.setProperty('width',`${width}px`,'important');
      nav.style.setProperty('max-width',`${width}px`,'important');
      nav.style.setProperty('left','0','important');
      nav.style.setProperty('right','auto','important');
    }

    window.dispatchEvent(new CustomEvent('mijnserenity:layoutwidth',{
      detail:{orientation:landscape?'landscape':'portrait',width,height,standalone:isStandalone()}
    }));
  }

  let timer=0;
  function refresh(){
    clearTimeout(timer);
    [0,80,220,500,900].forEach(delay=>setTimeout(measure,delay));
    timer=setTimeout(measure,1200);
  }

  ensureStyle();
  refresh();
  window.addEventListener('orientationchange',refresh,{passive:true});
  window.addEventListener('resize',refresh,{passive:true});
  window.addEventListener('pageshow',refresh,{passive:true});
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});

  const observer=new MutationObserver(()=>measure());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();