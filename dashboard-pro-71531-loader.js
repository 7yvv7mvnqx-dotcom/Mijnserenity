/* MijnSerenity 7.18.36 — stabiele dashboardloader + echte iOS landscape-breedte */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71821)return;
  window.__msDashboardLoader71821=true;
  const V='718360';
  const CONTROL='718360';

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

  function loadCss(href,id){
    let link=document.getElementById(id);
    if(link){
      if(link.getAttribute('href')!==href)link.setAttribute('href',href);
      return;
    }
    link=document.createElement('link');
    link.id=id;
    link.rel='stylesheet';
    link.href=href;
    document.head.appendChild(link);
  }

  function syncVersion(){
    try{window.msSyncBuildVersion?.()}catch{}
    const build=window.MIJSERENITY_BUILD||'7.18.36';
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge&&badge.textContent!==build)badge.textContent=build;
  }

  function syncOrientation(){
    const legacy=typeof window.orientation==='number'?((window.orientation%360)+360)%360:null;
    const physicalLandscape=legacy===90||legacy===270;
    const vv=window.visualViewport;
    const width=Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||0);
    const height=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0);
    const orientation=physicalLandscape||width>height?'landscape':'portrait';
    document.documentElement.dataset.msOrientation=orientation;
    document.body?.setAttribute('data-ms-orientation',orientation);
    document.documentElement.style.setProperty('--ms-viewport-width',`${width}px`);
    document.documentElement.style.setProperty('--ms-viewport-height',`${height}px`);
    window.dispatchEvent(new CustomEvent('mijnserenity:orientationchange',{
      detail:{orientation,width,height}
    }));
  }

  function installOrientationRefresh(){
    let timer=0;
    const refresh=()=>{
      clearTimeout(timer);
      syncOrientation();
      timer=setTimeout(()=>{
        syncOrientation();
        window.dispatchEvent(new Event('mijnserenity:viewportsettled'));
      },260);
    };
    syncOrientation();
    window.addEventListener('orientationchange',refresh,{passive:true});
    window.visualViewport?.addEventListener('resize',refresh,{passive:true});
    window.addEventListener('pageshow',refresh,{passive:true});
  }

  async function start(){
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.getElementById('msMarineGlassMobile7182')?.remove();

    loadCss(`/marine-glass-mobile-7184.css?v=${V}`,'msMarineGlassMobile7184');
    loadCss(`/marine-glass-polish-7185.css?v=${V}`,'msMarineGlassPolish7185');
    loadCss(`/serenity-control-dashboard.css?v=${CONTROL}`,'msSerenityControlCss');
    if(!document.getElementById('msAiDestinationCss')){
      const link=document.createElement('link');
      link.id='msAiDestinationCss';
      link.rel='stylesheet';
      link.href=`/ai-destination-search.css?v=${V}`;
      document.head.appendChild(link);
    }else{
      document.getElementById('msAiDestinationCss').href=`/ai-destination-search.css?v=${V}`;
    }

    installOrientationRefresh();
    await load(`/orientation-layout-71835.js?v=${V}`,'orientation-layout');

    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');
    syncVersion();
    await load(`/start-battery-soc-71822.js?v=${V}`,'start-battery-soc');
    await load(`/tank-systems-climate-71823.js?v=${V}`,'tank-systems-climate');
    await load(`/dashboard-ais-map-71825.js?v=${V}`,'dashboard-ais-map');
    await load(`/marine-glass-start-fix-71801.js?v=${V}`,'marine-glass-start-fix');
    await load(`/marine-glass-polish-7185.js?v=${V}`,'marine-glass-polish');
    await load(`/marine-glass-waterkaarten-route-7188.js?v=${V}`,'waterkaarten-route-info');
    await load(`/cerbo-truth-71818.js?v=${V}`,'cerbo-truth');

    window.ms730HomeAssistantConnected=window.ms730HomeAssistantConnected||(()=>false);
    window.ms730GetStateSnapshot=window.ms730GetStateSnapshot||(()=>[]);

    await load(`/serenity-control-dashboard.js?v=${CONTROL}`,'serenity-control-dashboard');

    const loadDestination=()=>load(`/ai-destination-search.js?v=${V}`,'destination');
    if('requestIdleCallback' in window)requestIdleCallback(loadDestination,{timeout:800});
    else setTimeout(loadDestination,120);

    syncOrientation();
    syncVersion();
    setTimeout(syncVersion,250);
    setTimeout(syncVersion,1000);
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{
      detail:{build:window.MIJSERENITY_BUILD||'7.18.36'}
    }));
  }

  start().catch(error=>console.warn('Dashboard loader:',error));
})();