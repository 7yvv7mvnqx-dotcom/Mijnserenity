/* MijnSerenity 7.18.33 — Marine Glass loader wacht op daadwerkelijke cockpit-DOM */
(()=>{
  'use strict';
  if(window.__msDashboardLoader71833)return;
  window.__msDashboardLoader71833=true;
  window.__msDashboardLoader71829=true;
  window.__msDashboardLoader71828=true;
  window.__msDashboardLoader71827=true;
  window.__msDashboardLoader71825=true;
  window.__msDashboardLoader71824=true;
  window.__msDashboardLoader71823=true;

  const V='718330';
  const BUILD='7.18.33';

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

  function waitForElement(id,timeoutMs=5000){
    const existing=document.getElementById(id);
    if(existing)return Promise.resolve(existing);
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(value,error)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        observer.disconnect();
        if(error)reject(error);else resolve(value);
      };
      const observer=new MutationObserver(()=>{
        const element=document.getElementById(id);
        if(element)finish(element,null);
      });
      observer.observe(document.documentElement,{childList:true,subtree:true});
      const timer=setTimeout(()=>{
        const element=document.getElementById(id);
        if(element)finish(element,null);
        else finish(null,new Error(`${id} is niet binnen ${timeoutMs} ms opgebouwd.`));
      },timeoutMs);
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

  function removeLegacyVisuals(){
    window.__msDisableLegacyVisuals=true;
    ['msStartCockpit7144','msDashboardPremium7143','msMarineGlassMobile7182']
      .forEach(id=>document.getElementById(id)?.remove());
  }

  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  async function start(){
    removeLegacyVisuals();
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.getElementById('mgMore')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');

    loadCss(`/page-swipe.css?v=${V}`,'msPageSwipe71833');
    await load(`/page-swipe.js?v=${V}`,'document-scroll-rescue');

    loadCss(`/marine-glass-mobile-7184.css?v=${V}`,'msMarineGlassMobile7184');
    loadCss(`/marine-glass-polish-7185.css?v=${V}`,'msMarineGlassPolish7185');

    /* dashboard-pro-71700 kan tijdens document.readyState='loading' eerst een
       DOMContentLoaded-listener plaatsen. De oude loader controleerde hier te
       vroeg en viel dan onterecht terug op het oude Start-dashboard. */
    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass');
    await waitForElement('msMarineGlass',5000);

    await Promise.all([
      load(`/marine-glass-start-fix-71801.js?v=${V}`,'marine-glass-start-fix'),
      load(`/marine-glass-polish-7185.js?v=${V}`,'marine-glass-polish'),
      load(`/marine-glass-waterkaarten-route-7188.js?v=${V}`,'waterkaarten-route-info'),
      load(`/energy-flow-fix-71819.js?v=${V}`,'energy-flow-fix'),
      load(`/version-fix-71820.js?v=${V}`,'version-fix'),
      load(`/poi-bearing-71826.js?v=${V}`,'poi-bearing')
    ]);

    removeLegacyVisuals();
    document.documentElement.classList.add('ms-marine-glass-ready');
    syncVersion();
    window.ms708ResizePager?.();
    setTimeout(()=>{syncVersion();window.ms708ResizePager?.()},250);
    setTimeout(()=>{syncVersion();window.ms708ResizePager?.()},1200);

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

    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD}}));
    return true;
  }

  const ready=start().catch(error=>{
    document.documentElement.classList.remove('ms-marine-glass-ready');
    console.warn('Marine Glass loader:',error);
    throw error;
  });
  window.__msDashboardReady71833=ready;
  window.__msDashboardReady71829=ready;
  window.__msDashboardReady71828=ready;
  window.__msDashboardReady71827=ready;
  window.__msDashboardReady71825=ready;
  window.__msDashboardReady71824=ready;
  window.__msDashboardReady71823=ready;
})();
