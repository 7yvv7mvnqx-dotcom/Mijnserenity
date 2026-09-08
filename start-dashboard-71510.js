/* MijnSerenity compatibiliteit — geen hero-patchketen meer.
   Oud gecachte bootstraps mogen deze URL nog vragen; hij laadt uitsluitend 8.31.1. */
(()=>{
  'use strict';
  window.__msStart8304HeroFix=true;
  if(window.__msStart8311)return;
  const existing=[...document.scripts].find(s=>/\/start-dashboard-core-8311\.js(?:\?|$)/.test(s.src||''));
  if(existing)return;
  const script=document.createElement('script');
  script.src='/start-dashboard-core-8311.js?v=831100';
  script.async=false;
  script.dataset.msCompatibility='start-71510';
  script.onerror=()=>console.error('MijnSerenity 8.31.1 Start kon niet worden geladen.');
  (document.head||document.documentElement).appendChild(script);
})();