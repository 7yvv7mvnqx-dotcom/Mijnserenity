/* MijnSerenity — actieve RWS-compatibiliteit, losgetrokken uit oud dashboard. */
(()=>{
  'use strict';
  if(window.__msRwsFetchProxy8232)return;
  window.__msRwsFetchProxy8232=true;
  const nativeFetch=window.fetch.bind(window);
  const catalog='https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES/OphalenCatalogus';
  const latest='https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen';
  window.fetch=function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url===catalog)return nativeFetch('/api/rws-water-catalogus',init);
    if(url===latest)return nativeFetch('/api/rws-water-latest',init);
    return nativeFetch(input,init);
  };
})();

(()=>{
  'use strict';
  if(window.__msRwsWaterTempFixLoader8233)return;
  window.__msRwsWaterTempFixLoader8233=true;
  const script=document.createElement('script');
  script.src='/rws-water-temp-8233.js?v=823300';
  script.async=true;
  script.dataset.msRwsWater8233='1';
  script.onerror=()=>console.warn('RWS watertemperatuur-herstel kon niet worden geladen.');
  document.head.appendChild(script);
})();
