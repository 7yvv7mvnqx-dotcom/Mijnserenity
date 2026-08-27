/* MijnSerenity 7.18.36 — iOS/PWA landscape breedte via vmin/vmax */
(()=>{
  'use strict';
  if(window.__msOrientationLayout71836)return;
  window.__msOrientationLayout71836=true;

  const STYLE_ID='msOrientationLayout71836Style';
  const TARGETS='body > main, #appView, #dashboard, #dashboard.mg-active, #msMarineGlass, .ms708-native-pager, .ms708-native-pager > .ms708-native-page';
  const touchDevice=()=>window.matchMedia?.('(pointer:coarse)').matches||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0;
  const standalone=()=>window.matchMedia?.('(display-mode:standalone)').matches||window.navigator.standalone===true;

  let physicalOrientation=null;

  function dimensionsOrientation(){
    const vv=window.visualViewport;
    const w=Math.max(Number(vv?.width)||0,Number(window.innerWidth)||0,Number(document.documentElement.clientWidth)||0);
    const h=Math.max(Number(vv?.height)||0,Number(window.innerHeight)||0,Number(document.documentElement.clientHeight)||0);
    if(w>h*1.08)return 'landscape';
    if(h>w*1.08)return 'portrait';
    return null;
  }

  function angleLandscape(){
    const values=[window.orientation,window.screen?.orientation?.angle];
    for(const value of values){
      if(typeof value!=='number'||!Number.isFinite(value))continue;
      const angle=((Math.round(value)%360)+360)%360;
      if(angle===90||angle===270)return true;
    }
    return false;
  }

  function initialOrientation(){
    if(angleLandscape())return 'landscape';
    return dimensionsOrientation()||'portrait';
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html,body{
        box-sizing:border-box!important;
        min-width:0!important;
        overflow-x:hidden!important;
      }
      html[data-ms-orientation="portrait"],
      html[data-ms-orientation="portrait"] body{
        width:var(--ms-physical-width,100vmin)!important;
        max-width:var(--ms-physical-width,100vmin)!important;
      }
      html[data-ms-orientation="landscape"],
      html[data-ms-orientation="landscape"] body{
        width:var(--ms-physical-width,100vmax)!important;
        max-width:var(--ms-physical-width,100vmax)!important;
      }
      body > main,
      body.ms750-simple-ui > main,
      body.ms760-captain-experience > main,
      body.ms708-native-pages-active > main,
      #appView,#dashboard,#dashboard.mg-active,#msMarineGlass,
      .ms708-native-pager,.ms708-native-pager > .ms708-native-page{
        box-sizing:border-box!important;
        width:var(--ms-physical-width,100%)!important;
        max-width:var(--ms-physical-width,100%)!important;
        min-width:0!important;
        margin-left:0!important;
        margin-right:0!important;
      }
      #msMarineGlass > .mg-top,#msMarineGlass > main.mg-grid{
        width:100%!important;
        max-width:none!important;
        box-sizing:border-box!important;
      }
      .bottom-nav,.bottom-nav.ms744-compact-nav{
        box-sizing:border-box!important;
        width:var(--ms-physical-width,100%)!important;
        max-width:var(--ms-physical-width,100%)!important;
        left:0!important;
        right:auto!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass{
        padding-left:max(8px,env(safe-area-inset-left))!important;
        padding-right:max(8px,env(safe-area-inset-right))!important;
      }
      html[data-ms-orientation="landscape"] #msMarineGlass > main.mg-grid{
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
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
      html[data-ms-orientation="landscape"] #msMarineGlass .mg-gauge{min-height:138px!important}
      html[data-ms-orientation="landscape"] #msMarineGlass .mg-dial{width:min(112px,76%)!important}
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

  function physicalWidthCss(){
    if(!(touchDevice()||standalone()))return '100%';
    return physicalOrientation==='landscape'?'100vmax':'100vmin';
  }

  function apply(){
    ensureStyle();
    if(!physicalOrientation)physicalOrientation=initialOrientation();

    const widthCss=physicalWidthCss();
    const root=document.documentElement;
    root.dataset.msOrientation=physicalOrientation;
    document.body?.setAttribute('data-ms-orientation',physicalOrientation);
    root.style.setProperty('--ms-physical-width',widthCss);
    root.style.setProperty('--ms-layout-width',widthCss);

    document.querySelectorAll(TARGETS).forEach(node=>{
      node.style.setProperty('width',widthCss,'important');
      node.style.setProperty('max-width',widthCss,'important');
      node.style.setProperty('min-width','0','important');
      node.style.setProperty('box-sizing','border-box','important');
      node.style.setProperty('margin-left','0','important');
      node.style.setProperty('margin-right','0','important');
    });

    const nav=document.querySelector('.bottom-nav');
    if(nav){
      nav.style.setProperty('width',widthCss,'important');
      nav.style.setProperty('max-width',widthCss,'important');
      nav.style.setProperty('left','0','important');
      nav.style.setProperty('right','auto','important');
    }

    window.dispatchEvent(new CustomEvent('mijnserenity:layoutwidth',{
      detail:{orientation:physicalOrientation,widthCss,standalone:standalone()}
    }));
  }

  function afterRotation(){
    /* orientationchange zelf is op iOS betrouwbaarder dan de viewportmaten.
       Als iOS de oude portrait-afmetingen blijft rapporteren, wisselen we
       daarom de fysieke stand expliciet om. */
    physicalOrientation=physicalOrientation==='landscape'?'portrait':'landscape';
    [0,60,140,260,500,900,1400].forEach(delay=>setTimeout(apply,delay));
  }

  function refreshWithoutChangingOrientation(){
    [0,80,240].forEach(delay=>setTimeout(apply,delay));
  }

  physicalOrientation=initialOrientation();
  ensureStyle();
  apply();

  window.addEventListener('orientationchange',afterRotation,{passive:true});
  window.addEventListener('pageshow',refreshWithoutChangingOrientation,{passive:true});
  window.addEventListener('resize',refreshWithoutChangingOrientation,{passive:true});
  window.visualViewport?.addEventListener('resize',refreshWithoutChangingOrientation,{passive:true});

  const observer=new MutationObserver(()=>apply());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();