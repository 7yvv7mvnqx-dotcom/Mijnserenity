/* MijnSerenity 8.31.1 runtime hotfix — blokkeer legacy dashboard-flash en herstel iPhone-landschap. */
(()=>{
  'use strict';
  if(window.__msRuntimeHotfix8311)return;
  window.__msRuntimeHotfix8311=true;
  window.MIJSERENITY_RUNTIME_PATCH='8.31.1';

  const html=document.documentElement;
  const LEGACY_IDS=[
    'ms71510Dashboard','serenityIvms','msDashboardAnalog7141','msDashboardPremium7143',
    'msStartCockpit7144','msWelcomeCard7140','msWelcomeCard7137'
  ];

  function ensureGuard(){
    let style=document.getElementById('ms8311RuntimeGuard');
    if(style)return style;
    style=document.createElement('style');
    style.id='ms8311RuntimeGuard';
    style.textContent=`
      html[data-ms-start-boot="1"] #dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important;pointer-events:none!important}
      html[data-ms-start-boot="1"] #appView:not(.hidden){visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      #dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important;pointer-events:none!important}
      #msLegacyTelemetryBridge{display:none!important}
      html[data-ms-phone-landscape="1"],html[data-ms-phone-landscape="1"] body{width:100%!important;min-width:0!important;max-width:none!important;overflow-x:hidden!important}
      html[data-ms-phone-landscape="1"] body>main,html[data-ms-phone-landscape="1"] main,html[data-ms-phone-landscape="1"] #appView,html[data-ms-phone-landscape="1"] #dashboard,html[data-ms-phone-landscape="1"] #ms8210Start{box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:none!important;margin-left:0!important;margin-right:0!important}
      html[data-ms-phone-landscape="1"] body>main,html[data-ms-phone-landscape="1"] main{padding:8px max(10px,env(safe-area-inset-right)) 8px max(10px,env(safe-area-inset-left))!important}
      html[data-ms-phone-landscape="1"] #ms8210Start .ms8300-hero{width:100%!important;min-width:0!important;max-width:none!important}
      html[data-ms-phone-landscape="1"] #ms8210Start .ms8300-status-grid,html[data-ms-phone-landscape="1"] #ms8210Start .ms8300-features{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    `;
    (document.head||document.documentElement).appendChild(style);
    return style;
  }

  function removeLegacy(){
    for(const id of LEGACY_IDS)document.getElementById(id)?.remove();
  }

  function ensureCanonicalCss(){
    const wanted='/start-dashboard-71510.css?v=831100';
    let link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(node=>{
      try{return new URL(node.href,location.href).pathname==='/start-dashboard-71510.css'}catch{return false}
    });
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      (document.head||document.documentElement).appendChild(link);
    }
    if(!link.href.endsWith(wanted))link.href=wanted;
  }

  function isPhoneLandscape(){
    const vv=window.visualViewport;
    const vw=Math.max(1,Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||0));
    const vh=Math.max(1,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0));
    const sw=Math.max(Number(screen?.width)||0,Number(screen?.height)||0,vw,vh);
    const sh=Math.min(Number(screen?.width)||vw,Number(screen?.height)||vh,vw,vh);
    const orientationLandscape=(screen?.orientation?.type||'').includes('landscape')||Math.abs(Number(window.orientation))===90||vw>vh;
    const phoneLike=sh<=540&&sw<=1100;
    return orientationLandscape&&phoneLike;
  }

  function normalizeLayout(){
    const landscape=isPhoneLandscape();
    if(landscape)html.dataset.msPhoneLandscape='1';else html.removeAttribute('data-ms-phone-landscape');
    for(const selector of ['body>main','main','#appView','#dashboard','#ms8210Start']){
      document.querySelectorAll(selector).forEach(node=>{
        for(const prop of ['width','min-width','max-width','margin-left','margin-right'])node.style.removeProperty(prop);
      });
    }
  }

  function finishGuard(){
    removeLegacy();normalizeLayout();
    if(document.getElementById('ms8210Start'))html.removeAttribute('data-ms-start-boot');
  }

  function scheduleNormalize(){
    normalizeLayout();
    for(const delay of [60,220,650,1400])setTimeout(()=>{removeLegacy();normalizeLayout();finishGuard()},delay);
  }

  html.dataset.msStartBoot='1';
  ensureGuard();
  ensureCanonicalCss();
  removeLegacy();
  normalizeLayout();

  const observer=new MutationObserver(()=>{
    removeLegacy();
    if(document.getElementById('ms8210Start'))finishGuard();
  });
  if(document.body)observer.observe(document.body,{subtree:true,childList:true});
  else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{subtree:true,childList:true}),{once:true});

  window.addEventListener('orientationchange',scheduleNormalize,{passive:true});
  window.addEventListener('resize',scheduleNormalize,{passive:true});
  window.addEventListener('pageshow',scheduleNormalize,{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',scheduleNormalize,{passive:true});
  window.addEventListener('mijnserenity:boot-complete',scheduleNormalize,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleNormalize,{passive:true});
  window.visualViewport?.addEventListener('scroll',normalizeLayout,{passive:true});

  document.addEventListener('DOMContentLoaded',()=>{
    ensureCanonicalCss();removeLegacy();scheduleNormalize();finishGuard();
  },{once:true});
})();
