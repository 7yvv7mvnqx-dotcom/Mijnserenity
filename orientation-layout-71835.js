/* MijnSerenity 7.18.36 — iOS/PWA portrait-landscape breedteherstel */
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

      html[data-ms-orientation="landscape"],
      html[data-ms-orientation="landscape"] body{
        width:var(--ms-landscape-width,100vw)!important;
        max-width:var(--ms-landscape-width,100vw)!important;
      }

      /* Liggende telefoon: echt gebruikmaken van de extra breedte. */
      html[data-ms-orientation="landscape"] #msMarineGlass{
        padding-left:max(8px,env(safe-area-inset-left))!important;
        padding-right:max(8px,env(safe-area-inset-right))!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass > main.mg-grid{
        display:flex!important;
        flex-direction:column!important;
        gap:8px!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass > main.mg-grid > .mg-map{
        width:100%!important;
        height:min(52dvh,360px)!important;
        min-height:245px!important;
        max-height:360px!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass > main.mg-grid > .mg-gauges{
        width:100%!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        grid-auto-rows:auto!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass .mg-gauge{
        min-height:138px!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass .mg-dial{
        width:min(112px,76%)!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass .mg-energy-grid{
        grid-template-columns:minmax(180px,.8fr) minmax(0,1.7fr)!important;
      }
      html[data-ms-orientation="landscape"] .bottom-nav,
      html[data-ms-orientation="landscape"] .bottom-nav.ms744-compact-nav{
        height:calc(58px + env(safe-area-inset-bottom))!important;
        min-height:calc(58px + env(safe-area-inset-bottom))!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  }

  function normalizedAngle(value){
    if(typeof value!=='number'||!Number.isFinite(value))return null;
    return ((Math.round(value)%360)+360)%360;
  }

  function orientationIsLandscape(){
    /* Op iPhone is window.orientation in een geïnstalleerde PWA vaak
       betrouwbaarder dan innerWidth tijdens de eerste frames na draaien. */
    const legacy=normalizedAngle(window.orientation);
    if(legacy!==null){
      if(legacy===90||legacy===270)return true;
      if(legacy===0||legacy===180)return false;
    }

    const screenAngle=normalizedAngle(window.screen?.orientation?.angle);
    if(screenAngle!==null){
      if(screenAngle===90||screenAngle===270)return true;
      if(screenAngle===0||screenAngle===180){
        const sw=Number(window.screen?.width)||0;
        const sh=Number(window.screen?.height)||0;
        if(sw&&sh&&sw!==sh)return sw>sh;
      }
    }

    if(window.matchMedia?.('(orientation: landscape)').matches)return true;
    if(window.matchMedia?.('(orientation: portrait)').matches)return false;

    const vv=window.visualViewport;
    const w=Math.max(vv?.width||0,window.innerWidth||0,document.documentElement.clientWidth||0);
    const h=Math.max(vv?.height||0,window.innerHeight||0,document.documentElement.clientHeight||0);
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
    const availW=Math.round(window.screen?.availWidth||0);
    const availH=Math.round(window.screen?.availHeight||0);

    const screenLong=Math.max(screenW,screenH,availW,availH,1);
    const screenShort=Math.max(1,Math.min(
      ...[screenW,screenH,availW,availH].filter(value=>value>0)
    ));

    let width=Math.max(vvW,innerW,clientW,1);
    let height=Math.max(vvH,innerH,clientH,1);

    /* Belangrijk: bij fysieke landscape mag een nog-oude portrait viewport
       nooit de breedte bepalen. Gebruik dan minimaal de lange schermzijde. */
    if(landscape){
      width=Math.max(width,screenLong);
      height=Math.min(height,screenShort);
    }else if(isStandalone()&&screenLong>1&&screenShort>1){
      width=Math.min(width,screenShort);
      height=Math.max(height,screenLong);
    }

    const root=document.documentElement;
    root.dataset.msOrientation=landscape?'landscape':'portrait';
    document.body?.setAttribute('data-ms-orientation',landscape?'landscape':'portrait');
    root.style.setProperty('--ms-layout-width',`${width}px`);
    root.style.setProperty('--ms-layout-height',`${height}px`);
    root.style.setProperty('--ms-viewport-width',`${width}px`);
    root.style.setProperty('--ms-viewport-height',`${height}px`);
    root.style.setProperty('--ms-landscape-width',landscape?`${width}px`:'100vw');

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
      detail:{orientation:landscape?'landscape':'portrait',width,height,standalone:isStandalone(),legacyOrientation:window.orientation??null}
    }));
  }

  let timer=0;
  function refresh(){
    clearTimeout(timer);
    [0,60,140,260,500,900].forEach(delay=>setTimeout(measure,delay));
    timer=setTimeout(measure,1400);
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