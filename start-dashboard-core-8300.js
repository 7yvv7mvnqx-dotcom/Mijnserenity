/* MijnSerenity compatibiliteit — oude URL verwijst alleen nog naar de canonieke 8.31.1 Start. */
(()=>{
  'use strict';
  if(window.__msStart8311)return;
  const existing=[...document.scripts].find(s=>/\/start-dashboard-core-8311\.js(?:\?|$)/.test(s.src||''));
  if(existing)return;
  const script=document.createElement('script');
  script.src='/start-dashboard-core-8311.js?v=831100';
  script.async=false;
  script.dataset.msCompatibility='start-8300';
  script.onerror=()=>console.error('MijnSerenity 8.31.1 Start kon niet worden geladen.');
  (document.head||document.documentElement).appendChild(script);
})();