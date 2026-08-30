/* MijnSerenity 7.19.12 — stabiele cockpit met iPad safe mode */
(()=>{
  'use strict';
  if(window.__msDashboardLoader719120)return;
  window.__msDashboardLoader719120=true;
  const V='719120';
  const BUILD='7.19.12';
  const isIPadLike=()=>/iPad/i.test(navigator.userAgent||'')||((navigator.platform==='MacIntel'||/Macintosh/i.test(navigator.userAgent||''))&&Number(navigator.maxTouchPoints||0)>1&&Math.min(Number(screen.width||0),Number(screen.height||0))>=700);

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
  function ensureStableCss(){ensureCssLink('msStableShell71900',`/marine-glass-mobile-7184.css?v=${V}`);ensureCssLink('msMarineGlassFixes7193',`/marine-glass-fixes-7193.css?v=${V}`);document.getElementById('msMarineGlassStable71900')?.remove()}
  function removeConflicts(){
    ['msOrientationLayout71835Style','msOrientationLayout71836Style','msMarineGlassPolish7185','msSerenityControlCss','msSerenityControl','mgMoreNav','msMarineGlassStable71900'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{if(currentPath(link.href).endsWith('/victron-energy-71559.css'))link.remove()});
    document.querySelectorAll('[id="msMarineGlass"][data-ms-victron-live]').forEach(panel=>panel.remove());
    const dashboard=document.getElementById('dashboard');dashboard?.classList.remove('scd-active','mspro-active');
    document.querySelector('.bottom-nav')?.classList.remove('mg-nav','bottom-nav-viewport-fixed','bottom-nav-always-visible','bottom-nav-auto-hidden');
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

    /* De iPhone heeft de viewport-correctie nodig; op iPad laten we de goede eerste layout onaangeroerd. */
    if(!isIPadLike())await load(`/mobile-viewport-guard-71911.js?v=${V}`,'mobile-viewport-guard',5000);
    await load(`/dashboard-pro-71700.js?v=${V}`,'marine-glass',9000);
    await load(`/victron-live-panel-71990.js?v=${V}`,'victron-live-panel',5000);

    removeConflicts();ensureStableCss();syncVersion();
    if(isIPadLike())document.documentElement.dataset.msIpadSafe='1';
    window.dispatchEvent(new CustomEvent('mijnserenity:dashboard-ready',{detail:{build:BUILD,ipadSafe:isIPadLike()}}));

    /* Geen late dashboardmodules zolang iPad safe mode actief is. */
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(console.warn),{once:true});
  else start().catch(console.warn);
})();