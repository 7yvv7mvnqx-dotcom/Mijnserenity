/* MijnSerenity 8.21.1 — dashboard loader */
(()=>{
  'use strict';
  if(window.__msDashboardLoader8210)return;
  window.__msDashboardLoader8210=true;

  function load(src,key,onload){
    if(document.querySelector(`script[data-ms-loader="${key}"]`)){onload?.();return;}
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.dataset.msLoader=key;
    if(onload)script.onload=onload;
    script.onerror=()=>console.warn(`MijnSerenity module kon niet worden geladen: ${src}`);
    document.head.appendChild(script);
  }

  load('start-dashboard-71900-bridge.js?v=71900','dashboard-bridge',()=>{
    load('simple-start-8210.js?v=82100','simple-start');
  });
  load('inventory-edit-8211.js?v=82110','inventory-editor');
})();
