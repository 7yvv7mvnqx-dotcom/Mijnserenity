/* MijnSerenity 7.17.0 — professionele dashboardloader */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71700)return;
  window.__msDashboardLoader71700=true;
  const VERSION='717000';

  function style(id,href){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;link.rel='stylesheet';link.href=href;
    document.head.appendChild(link);
  }

  function scriptExists(path){
    return [...document.scripts].some(script=>{
      try{return new URL(script.src).pathname===path}catch{return false}
    });
  }

  function load(src,key){
    const path=new URL(src,location.href).pathname;
    if(scriptExists(path)||document.querySelector(`script[data-ms-dashboard="${key}"]`))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.dataset.msDashboard=key;
      script.src=src;
      script.async=false;
      script.onload=()=>resolve();
      script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);resolve()};
      document.head.appendChild(script);
    });
  }

  function idle(){
    return new Promise(resolve=>{
      if('requestIdleCallback' in window)requestIdleCallback(()=>resolve(),{timeout:450});
      else setTimeout(resolve,32);
    });
  }

  async function start(){
    style('msPro71531Css',`/dashboard-pro-71531.css?v=${VERSION}`);
    style('msNav71548Css',`/dashboard-navigation-71548.css?v=${VERSION}`);
    style('msAiDestinationCss',`/ai-destination-search.css?v=${VERSION}`);

    const core=[
      [`/dashboard-pro-71700.js?v=${VERSION}`,'pro'],
      [`/dashboard-cockpit-portal.js?v=${VERSION}`,'portal'],
      [`/dashboard-alarm-live-fix-71540.js?v=${VERSION}`,'alarm'],
      [`/dashboard-wind-direction-fix-71541.js?v=${VERSION}`,'wind'],
      [`/dashboard-rudder-icons-fix-71545.js?v=${VERSION}`,'rudder'],
      [`/dashboard-navigation-71548.js?v=${VERSION}`,'navigation']
    ];

    for(const [src,key] of core){
      await idle();
      await load(src,key);
    }

    await idle();
    await load(`/ai-destination-search.js?v=${VERSION}`,'destination');
  }

  start().catch(error=>console.warn('Dashboardloader:',error));
})();
