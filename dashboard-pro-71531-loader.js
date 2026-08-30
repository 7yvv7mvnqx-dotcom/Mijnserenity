/* MijnSerenity 7.19.15 — één responsive Marine Glass dashboard voor iPhone en iPad */
(()=>{
  'use strict';
  if(window.__msDashboardLoader719150)return;
  window.__msDashboardLoader719150=true;
  const V='719150';
  const BUILD='7.19.15';

  function currentPath(src){try{return new URL(src,location.href).pathname}catch{return src}}
  function scriptAlreadyLoaded(src){const wanted=currentPath(src);return [...document.scripts].some(script=>script.src&&currentPath(script.src)===wanted&&script.dataset.ms719Loaded==='1')}
  function load(src,key,timeoutMs=7000){
    if(scriptAlreadyLoaded(src))return Promise.resolve(true);
    return new Promise(resolve=>{
      const script=document.createElement('script');let done=false;
      const finish=ok=>{if(done)return;done=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(!ok)console.warn('Dashboardmodule overgeslagen of te traag:',src);resolve(ok)};
      const timer=setTimeout(()=>finish(false),timeoutMs);
      script.src=src;script.async=false;script.dataset.ms719Loaded='1';script.dataset.msDashboard=key;
      script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.appendChild(script);
    });
  }
  function ensureCssLink(id,href){let link=document.getElementById(id);if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link)}if(link.getAttribute('href')!==href)link.setAttribute('href',href)}
  function ensureStableCss(){
    ensureCssLink('msStableShell71900',`/marine-glass-mobile-7184.css?v=${V}`);
    ensureCssLink('msMarineGlassFixes7193',`/marine-glass-fixes-7193.css?v=${V}`);
    ensureCssLink('msNavigationAccess71913',`/navigation-access-71913.css?v=${V}`);
    document.getElementById('msMarineGlassStable71900')?.remove();
  }
  function removeConflicts(){
    ['msOrientationLayout71835Style','msOrientationLayout71836Style','msMarineGlassPolish7185','msSerenityControlCss','msSerenityControl','msMarineGlassStable71900'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{if(currentPath(link.href).endsWith('/victron-energy-71559.css'))link.remove()});
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(panel=>panel.remove());
    const dashboard=document.getElementById('dashboard');dashboard?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('bottom-nav-viewport-fixed','bottom-nav-auto-hidden');
    document.documentElement.removeAttribute('data-ms-ipad-safe');
  }
  function syncVersion(){
    window.MIJSERENITY_BUILD=BUILD;
    const meta=document.querySelector('meta[name="mijnserenity-build"]');if(meta)meta.content=BUILD;
    const badge=document.querySelector('#msMarineGlass .mg-brand sup');if(badge)badge.textContent=BUILD;
    const settings=document.getElementById('settingsAppVersion');if(settings)settings.textContent=BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>el.textContent=BUILD);
  }

  async function start(){
    removeConflicts();ensureStableCss();syncVersion();

    /* Alle schermen gebruiken dezelfde responsive cockpit. De bestaande
       Energie & Stroom-kaart blijft intact; alleen de live-data wordt eroverheen
       gesynchroniseerd, zodat een tweede Victron-layout de kaart niet vervangt. */
    await load(`/mobile-viewport-guard-71911.js?v=${V}`,'mobile-viewport-guard',5000);
    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass',9000);
    await load(`/dashboard-live-values-fix-71914.js?v=${V}`,'dashboard-live-values-fix',5000);

    removeConflicts();ensureStableCss();syncVersion();
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();