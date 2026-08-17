/* MijnSerenity 7.18.1 — Marine Glass dashboardloader */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71801)return;
  window.__msDashboardLoader71801=true;
  const V='718010';

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{
      try{return new URL(script.src,location.href).pathname===wanted}catch{return false}
    }))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.onload=()=>resolve();
      script.onerror=()=>{
        console.warn('Dashboardmodule kon niet laden:',src);
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  async function start(){
    /* Geen eigen ondernavigatie meer: de bestaande MijnSerenity navigatie blijft leidend. */
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');

    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');
    await load(`/marine-glass-start-fix-71801.js?v=${V}`,'marine-glass-start-fix');

    if(!document.getElementById('msAiDestinationCss')){
      const link=document.createElement('link');
      link.id='msAiDestinationCss';
      link.rel='stylesheet';
      link.href=`/ai-destination-search.css?v=${V}`;
      document.head.appendChild(link);
    }

    const loadDestination=()=>load(`/ai-destination-search.js?v=${V}`,'destination');
    if('requestIdleCallback' in window)requestIdleCallback(loadDestination,{timeout:800});
    else setTimeout(loadDestination,120);
  }

  start().catch(error=>console.warn('Marine Glass loader:',error));
})();
