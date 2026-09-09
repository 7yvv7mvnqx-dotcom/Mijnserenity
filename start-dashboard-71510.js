/* MijnSerenity 8.31.0 — compatibiliteitsloader naar één canonieke Start. */
(()=>{
  'use strict';
  if(window.__msStart8310Loader)return;
  window.__msStart8310Loader=true;
  if(window.__msStart8310){window.ms8300RefreshStart?.();return;}
  const script=document.createElement('script');
  script.src='/start-dashboard-core.js?v=831000';
  script.async=false;
  script.dataset.msStartCanonical='1';
  script.onerror=()=>console.error('MijnSerenity: canonieke Start kon niet worden geladen.');
  (document.head||document.documentElement).appendChild(script);
})();