(function(){
  'use strict';
  if(window.__ms71527CompassLoader)return;
  window.__ms71527CompassLoader=true;
  const script=document.createElement('script');
  script.src='/wind-compass-fix-71527.js?v=715320';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msCaptainModeLoader800)return;
  window.__msCaptainModeLoader800=true;
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/captain-mode-800.css?v=800001';
  document.head.appendChild(css);
  const script=document.createElement('script');
  script.src='/captain-mode-800.js?v=800001';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msCaptainRouteLoader801)return;
  window.__msCaptainRouteLoader801=true;
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/captain-route-801.css?v=801001';
  document.head.appendChild(css);
  const script=document.createElement('script');
  script.src='/captain-route-801.js?v=801001';
  script.async=false;
  document.head.appendChild(script);
})();

/* 7.18.18 — Cerbo/VRM is de enige leidende bron voor dashboardwaarden. */
(function(){
  'use strict';
  if(window.__msCerboTruthLoader71818)return;
  window.__msCerboTruthLoader71818=true;
  const script=document.createElement('script');
  script.src='/cerbo-truth-71818.js?v=718181';
  script.async=false;
  document.head.appendChild(script);
})();

(function(){
  'use strict';
  if(window.__msSilentUpdaterInstalled)return;
  window.__msSilentUpdaterInstalled=true;
  const removeOldPrompt=()=>document.getElementById('msUpdatePrompt')?.remove();
  async function update(){
    if(!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      await reg?.update();
      if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){console.warn('Stille updatecontrole mislukt:',error);}
  }
  removeOldPrompt();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{removeOldPrompt();update();},{once:true});
  else update();
  window.addEventListener('focus',update,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();},{passive:true});
})();
