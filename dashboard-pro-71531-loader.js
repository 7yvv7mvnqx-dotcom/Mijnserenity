/* MijnSerenity 7.18.23 — stabiele dashboardloader + live Cerbo als enige tankbron */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71821)return;
  window.__msDashboardLoader71821=true;
  const V='718230';
  const CONTROL='718140c2';

  function load(src,key){
    const wanted=new URL(src,location.href).pathname;
    if([...document.scripts].some(script=>{try{return new URL(script.src,location.href).pathname===wanted}catch{return false}}))return Promise.resolve();
    return new Promise(resolve=>{
      const script=document.createElement('script');script.dataset.msDashboard=key;script.src=src;
      script.onload=()=>resolve();script.onerror=()=>{console.warn('Dashboardmodule kon niet laden:',src);resolve()};
      document.head.appendChild(script);
    });
  }

  function loadCss(href,id){
    let link=document.getElementById(id);
    if(link){if(link.getAttribute('href')!==href)link.setAttribute('href',href);return}
    link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }

  async function start(){
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
    document.getElementById('msMarineGlassMobile7182')?.remove();

    /* Marine Glass direct laden; het oude startdashboard blijft alleen als verborgen databron bestaan. */
    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');
    await load(`/start-battery-soc-71822.js?v=${V}`,'start-battery-soc');
    await load(`/tank-systems-climate-71823.js?v=${V}`,'tank-systems-climate');
    await load(`/marine-glass-start-fix-71801.js?v=${V}`,'marine-glass-start-fix');
    loadCss(`/marine-glass-mobile-7184.css?v=${V}`,'msMarineGlassMobile7184');
    loadCss(`/marine-glass-polish-7185.css?v=${V}`,'msMarineGlassPolish7185');
    await load(`/marine-glass-polish-7185.js?v=${V}`,'marine-glass-polish');
    await load(`/marine-glass-waterkaarten-route-7188.js?v=${V}`,'waterkaarten-route-info');

    /* Eén bron voor accu, PV en tanks: live Cerbo/VRM. Geen oude HA-tank-remap meer. */
    await load(`/cerbo-truth-71818.js?v=${V}`,'cerbo-truth');

    /* HA wordt later in de vroege module-queue geladen. Tot die tijd veilige lege functies. */
    window.ms730HomeAssistantConnected=window.ms730HomeAssistantConnected||(()=>false);
    window.ms730GetStateSnapshot=window.ms730GetStateSnapshot||(()=>[]);

    /* Nieuwe bediening: alleen een extra laag, geen wijziging aan login/navigatiekern. */
    loadCss(`/serenity-control-dashboard.css?v=${CONTROL}`,'msSerenityControlCss');
    await load(`/serenity-control-dashboard.js?v=${CONTROL}`,'serenity-control-dashboard');

    if(!document.getElementById('msAiDestinationCss')){
      const link=document.createElement('link');link.id='msAiDestinationCss';link.rel='stylesheet';link.href=`/ai-destination-search.css?v=${V}`;document.head.appendChild(link);
    }
    const loadDestination=()=>load(`/ai-destination-search.js?v=${V}`,'destination');
    if('requestIdleCallback' in window)requestIdleCallback(loadDestination,{timeout:800});else setTimeout(loadDestination,120);
  }

  start().catch(error=>console.warn('Dashboard loader:',error));
})();