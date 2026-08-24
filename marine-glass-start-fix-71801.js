/* MijnSerenity — stabiele Marine Glass start zonder legacy fallback */
(()=>{
  'use strict';
  if(window.__msMarineGlassStartFixCurrent)return;
  window.__msMarineGlassStartFixCurrent=true;

  function currentBuild(){
    return window.MIJSERENITY_BUILD||document.querySelector('meta[name="mijnserenity-build"]')?.content||'7.18.16';
  }

  function hideLegacy(){
    window.__msDisableLegacyVisuals=true;
    ['ms71510Dashboard','serenityIvms','msMarineGlassMobile7182'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){
        el.hidden=true;
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
      }
    });
    document.body?.classList.remove('mg-mode');
  }

  function syncVersion(){
    const build=currentBuild();
    const meta=document.querySelector('meta[name="mijnserenity-build"]');
    if(meta)meta.content=build;
    const settings=document.getElementById('settingsAppVersion');
    if(settings)settings.textContent=build;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=build);
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');
    if(badge)badge.textContent=build;
  }

  function cleanNavigation(){
    document.getElementById('mgNav718Style')?.remove();
    document.getElementById('mgMoreNav')?.remove();
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav');
  }

  function showCurrentDashboard(){
    const dashboard=document.getElementById('dashboard');
    const glass=document.getElementById('msMarineGlass');
    if(!dashboard||!glass)return false;

    dashboard.hidden=false;
    dashboard.classList.add('active','mg-active');
    dashboard.style.removeProperty('display');
    dashboard.style.removeProperty('visibility');
    dashboard.style.removeProperty('opacity');

    glass.hidden=false;
    glass.style.setProperty('display','block','important');
    glass.style.setProperty('visibility','visible','important');
    glass.style.setProperty('opacity','1','important');
    return true;
  }

  function repair(){
    hideLegacy();
    cleanNavigation();
    syncVersion();
    showCurrentDashboard();
  }

  function start(){
    repair();
    requestAnimationFrame(repair);
    setTimeout(repair,300);

    const app=document.getElementById('appView');
    if(app&&window.MutationObserver){
      const observer=new MutationObserver(()=>{
        if(!app.classList.contains('hidden'))requestAnimationFrame(repair);
      });
      observer.observe(app,{attributes:true,attributeFilter:['class','hidden']});
    }

    window.addEventListener('mijnserenity:modules-ready',repair,{passive:true});
    window.addEventListener('pageshow',repair,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair()},{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
