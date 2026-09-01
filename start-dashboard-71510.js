/* MijnSerenity 8.21.3 — eenvoudige startpagina + harde release loader */
(()=>{
  'use strict';
  if(window.__msDashboardLoader8213)return;
  window.__msDashboardLoader8213=true;

  const BUILD='8.21.3';
  const TOKEN='821300';

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const version=document.getElementById('settingsAppVersion');
    if(version)version.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(node=>node.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function load(src,key,onload){
    const existing=document.querySelector(`script[data-ms-loader="${key}"]`);
    if(existing){onload?.();return existing;}
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.dataset.msLoader=key;
    if(onload)script.onload=onload;
    script.onerror=()=>console.warn(`MijnSerenity module kon niet worden geladen: ${src}`);
    document.head.appendChild(script);
    return script;
  }

  async function refreshServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register(`/sw.js?v=${TOKEN}`,{updateViaCache:'none'});
      await registration.update();
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){
      console.warn('MijnSerenity service worker vernieuwen mislukt:',error);
    }
  }

  function publishStart(){
    syncBuild();
    load(`start-dashboard-71900-bridge.js?v=${TOKEN}`,'dashboard-bridge-8213',()=>{
      load(`simple-start-8210.js?v=${TOKEN}`,'simple-start-8213',()=>{
        syncBuild();
        window.dispatchEvent(new CustomEvent('mijnserenity:release-ready',{detail:{build:BUILD}}));
      });
    });
    load(`inventory-edit-8212.js?v=${TOKEN}`,'inventory-editor-8213');
    refreshServiceWorker();
  }

  syncBuild();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',publishStart,{once:true});
  else publishStart();
  window.addEventListener('mijnserenity:boot-complete',syncBuild,{passive:true});
  window.addEventListener('mijnserenity:dashboard-ready',syncBuild,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncBuild()},{passive:true});
})();
