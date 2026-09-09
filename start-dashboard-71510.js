/* MijnSerenity 8.31.1 — compatibiliteitsloader: eerst runtime-guard, daarna één canonieke Start. */
(()=>{
  'use strict';
  if(window.__msStart8310Loader)return;
  window.__msStart8310Loader=true;

  const loadCanonical=()=>{
    if(window.__msStart8310){window.ms8300RefreshStart?.();return;}
    if([...document.scripts].some(s=>{try{return new URL(s.src,location.href).pathname==='/start-dashboard-core.js'}catch{return false}}))return;
    const script=document.createElement('script');
    script.src='/start-dashboard-core.js?v=831100';
    script.async=false;
    script.dataset.msStartCanonical='1';
    script.onerror=()=>console.error('MijnSerenity: canonieke Start kon niet worden geladen.');
    (document.head||document.documentElement).appendChild(script);
  };

  if(window.__msRuntimeHotfix8311){loadCanonical();return;}
  const guard=document.createElement('script');
  guard.src='/runtime-hotfix-8311.js?v=831100';
  guard.async=false;
  guard.dataset.msRuntimeGuard='1';
  guard.onload=loadCanonical;
  guard.onerror=()=>{console.warn('MijnSerenity: runtime-guard kon niet worden geladen; Start wordt wel geopend.');loadCanonical();};
  (document.head||document.documentElement).appendChild(guard);
})();
