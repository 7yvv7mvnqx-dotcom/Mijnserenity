/* MijnSerenity 7.19.8 — dashboardloader met iPhone layoutfix direct gecachebust */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71980)return;
  window.__msDashboardLoader71980=true;
  const V='719080';

  function currentPath(src){
    try{return new URL(src,location.href).pathname}catch{return src}
  }
  function scriptAlreadyLoaded(src){
    const wanted=currentPath(src);
    return [...document.scripts].some(script=>script.src&&currentPath(script.src)===wanted&&script.dataset.ms719Loaded==='1');
  }
  function load(src,key){
    if(scriptAlreadyLoaded(src))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.dataset.ms719Loaded='1';
      script.dataset.msDashboard=key;
      script.onload=()=>resolve();
      script.onerror=()=>{console.warn('Dashboardmodule overgeslagen:',src);resolve()};
      document.head.appendChild(script);
    });
  }
  function ensureCssLink(id,href){
    let link=document.getElementById(id);
    if(!link){
      link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      document.head.appendChild(link);
    }
    if(link.getAttribute('href')!==href)link.setAttribute('href',href);
  }
  function ensureStableCss(){
    ensureCssLink('msStableShell71900',`/marine-glass-mobile-7184.css?v=${V}`);
    ensureCssLink('msMarineGlassFixes7193',`/marine-glass-fixes-7193.css?v=${V}`);
    document.getElementById('msMarineGlassStable71900')?.remove();
  }
  function removeConflicts(){
    document.getElementById('msOrientationLayout71835Style')?.remove();
    document.getElementById('msOrientationLayout71836Style')?.remove();
    document.getElementById('msMarineGlassPolish7185')?.remove();
    document.getElementById('msSerenityControlCss')?.remove();
    document.getElementById('msSerenityControl')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('msMarineGlassStable71900')?.remove();
    const dashboard=document.getElementById('dashboard');
    dashboard?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav','bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden');
  }
  function syncVersion(){
    const build=window.MIJSERENITY_BUILD||'7.19.8';
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=build;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=build;
  }

  async function start(){
    removeConflicts();
    ensureStableCss();

    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');
    await load(`/marine-glass-polish-7185.js?v=${V}`,'live-weather-tides');
    await load(`/marine-glass-weather-fix-71931.js?v=${V}`,'live-weather-unified');
    await load(`/start-battery-soc-71822.js?v=${V}`,'start-battery-soc');
    await load(`/tank-systems-climate-71823.js?v=${V}`,'tank-systems-climate');
    await load(`/dashboard-ais-map-71825.js?v=${V}`,'dashboard-ais-map');
    await load(`/marine-glass-waterkaarten-route-7188.js?v=${V}`,'waterkaarten-route-info');
    await load(`/cerbo-truth-71818.js?v=${V}`,'cerbo-truth');
    await load(`/victron-live-direct-71960.js?v=${V}`,'victron-live-direct');
    await load(`/victron-panel-layout-fix-71971.js?v=${V}`,'victron-panel-layout');

    removeConflicts();
    ensureStableCss();
    syncVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:window.MIJSERENITY_BUILD||'7.19.8'}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();
