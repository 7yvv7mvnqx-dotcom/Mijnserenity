/* MijnSerenity 8.21.7 — harde Start-weergave boven legacy dashboard */
(()=>{
  'use strict';

  const BUILD='8.21.7';
  const ROOT_ID='ms8210Start';
  const $=id=>document.getElementById(id);
  let observer=null;
  let enforcing=false;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=BUILD;
    const settings=$('settingsAppVersion');
    if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=BUILD;
  }

  function forceStart(){
    if(enforcing)return false;
    enforcing=true;
    try{
      syncBuild();
      const dashboard=$('dashboard');
      if(!dashboard)return false;

      /* De 8.21.6 hoofdmodule bouwt de tegels. Roep hem expliciet aan als de
         Start-root er nog niet is. */
      if(!$(ROOT_ID)){
        try{window.ms8210RefreshStart?.()}catch(error){console.warn('Start opbouwen mislukt:',error)}
      }

      const root=$(ROOT_ID);
      if(!root)return false;

      dashboard.classList.add('ms8216-simple-start','ms8217-hard-start');
      root.hidden=false;
      root.removeAttribute('aria-hidden');
      root.style.setProperty('display','block','important');
      root.style.setProperty('visibility','visible','important');
      root.style.setProperty('opacity','1','important');
      root.style.setProperty('position','relative','important');
      root.style.setProperty('z-index','20','important');
      root.style.setProperty('min-height','calc(100dvh - 150px)','important');

      /* Inline !important wint ook van de oude Marine Glass-regels. Daardoor
         kan kaart/meter-dashboard de eenvoudige Start niet meer overnemen. */
      [...dashboard.children].forEach(child=>{
        if(child===root)return;
        child.style.setProperty('display','none','important');
        child.setAttribute('aria-hidden','true');
      });

      return true;
    }finally{
      enforcing=false;
    }
  }

  function watch(){
    const dashboard=$('dashboard');
    if(!dashboard||observer)return;
    observer=new MutationObserver(()=>requestAnimationFrame(forceStart));
    observer.observe(dashboard,{childList:true});
  }

  function start(){
    forceStart();
    watch();
    [50,150,350,700,1200,2200,4000,7000].forEach(ms=>setTimeout(()=>{forceStart();watch()},ms));
    setInterval(()=>{if(!document.hidden)forceStart()},5000);
    ['mijnserenity:dashboard-ready','mijnserenity:routechange','mijnserenity:boot-complete','pageshow','online'].forEach(name=>window.addEventListener(name,forceStart,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)forceStart()},{passive:true});
    console.info(`MijnSerenity ${BUILD}: harde eenvoudige Start-weergave actief.`);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();