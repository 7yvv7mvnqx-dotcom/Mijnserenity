/* Oude bestandsnaam behouden voor bestaande caches; laadt uitsluitend de actuele 8.31 Start. */
(()=>{
  'use strict';
  if(window.__msStart8310){window.ms8300RefreshStart?.();return;}
  if(document.querySelector('script[data-ms-start-canonical]'))return;
  const script=document.createElement('script');
  script.src='/start-dashboard-core.js?v=831000';
  script.async=false;
  script.dataset.msStartCanonical='1';
  (document.head||document.documentElement).appendChild(script);
})();