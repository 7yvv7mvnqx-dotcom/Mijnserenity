/* MijnSerenity 8.28.1 — release- en dashboardherstel voor web/PWA/native. */
(()=>{
  'use strict';
  if(window.__msBootstrap828100)return;
  window.__msBootstrap828100=true;
  window.__msDisableLegacyVisuals=true;

  const BUILD='8.28.1';
  const VERSION='828100';
  const CORE='/auth-bootstrap-core-8235.js';
  const DASHBOARD='/start-dashboard-71510.js';
  const LEGACY_IDS=['serenityIvms','ms71510Dashboard','ms71510Start','msMarineGlass','msStartCockpit7144','msDashboardAnalog7141','msWelcomeCard7140'];
  let observer=null;
  let authObserver=null;
  let authReadyTimer=0;

  function syncBuild(){
    window.MIJSERENITY_BUILD=BUILD;
    window.APP_BUILD=BUILD;
    document.querySelector('meta[name="mijnserenity-build"]')?.setAttribute('content',BUILD);
    document.querySelector('meta[name="ms-build"]')?.setAttribute('content',BUILD);
    const settings=document.getElementById('settingsAppVersion');
    if(settings&&settings.textContent!==BUILD)settings.textContent=BUILD;
    const stamp=document.getElementById('buildStamp');
    if(stamp&&stamp.textContent!=='v'+BUILD)stamp.textContent='v'+BUILD;
    document.querySelectorAll('[data-ms-build-version]').forEach(el=>{
      if(el.textContent!==BUILD)el.textContent=BUILD;
    });
  }

  function syncAuthChrome(){
    const app=document.getElementById('appView');
    const appVisible=!!app&&!app.classList.contains('hidden');
    document.body?.classList.toggle('ms8281-app-visible',appVisible);
  }

  function installGuardStyle(){
    let style=document.getElementById('ms8281ReleaseGuard');
    if(!style){style=document.createElement('style');style.id='ms8281ReleaseGuard';document.head.appendChild(style)}
    style.textContent=`
      #dashboard>#serenityIvms,#dashboard>#ms71510Dashboard,#dashboard>#ms71510Start,
      #dashboard>#msMarineGlass,#dashboard>#msStartCockpit7144,#dashboard>#msDashboardAnalog7141,
      #dashboard>#msWelcomeCard7140{display:none!important;visibility:hidden!important;pointer-events:none!important}
      body:not(.ms8281-app-visible) .bottom-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}
    `;
  }

  function retireLegacy(){
    installGuardStyle();
    document.body?.classList.remove('ivms-dashboard-active');
    document.querySelector('.bottom-nav')?.classList.remove('ivms-dashboard-hidden');
    LEGACY_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.dataset.ms8281Retired='1';
      el.style.setProperty('display','none','important');
      el.style.setProperty('visibility','hidden','important');
      el.style.setProperty('pointer-events','none','important');
    });
    document.getElementById('dashboard')?.classList.remove('mg-active','scd-active','mspro-active');
  }

  function containsLegacy(node){
    if(!(node instanceof Element))return false;
    if(LEGACY_IDS.includes(node.id))return true;
    return LEGACY_IDS.some(id=>node.querySelector?.(`#${id}`));
  }

  function watchLegacy(){
    if(observer||!document.documentElement)return;
    observer=new MutationObserver(mutations=>{
      const legacyAdded=mutations.some(mutation=>
        [...mutation.addedNodes].some(node=>containsLegacy(node))
      );
      if(legacyAdded)retireLegacy();
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
  }

  function watchAuthChrome(){
    if(authObserver)return;
    const app=document.getElementById('appView');
    if(!app)return;
    authObserver=new MutationObserver(syncAuthChrome);
    authObserver.observe(app,{attributes:true,attributeFilter:['class']});
    syncAuthChrome();
  }

  function monitorAuthReady(){
    clearInterval(authReadyTimer);
    const started=Date.now();
    authReadyTimer=setInterval(()=>{
      watchAuthChrome();
      syncAuthChrome();
      const message=document.getElementById('authMsg');
      const button=document.getElementById('signInButton');
      if(typeof window.signIn==='function'){
        clearInterval(authReadyTimer);
        authReadyTimer=0;
        if(button)button.disabled=false;
        if(message&&/wordt geladen|wordt gestart/i.test(message.textContent||'')){
          message.textContent='Klaar om in te loggen.';
        }
        return;
      }
      if(Date.now()-started>15000){
        clearInterval(authReadyTimer);
        authReadyTimer=0;
        if(message&&/wordt geladen|wordt gestart/i.test(message.textContent||'')){
          message.textContent='De beveiligde inlog kon niet volledig worden geladen. Tik op “App herstellen en vernieuwen”.';
          message.classList.add('error');
        }
      }
    },250);
  }

  async function purgeOldCaches(){
    let previous='';
    try{previous=localStorage.getItem('mijnserenity-runtime-build')||''}catch{}
    if(previous===BUILD)return;
    try{
      if('caches' in window){
        const names=await caches.keys();
        await Promise.all(names.filter(name=>name.startsWith('mijnserenity-')).map(name=>caches.delete(name)));
      }
    }catch(error){console.warn('Oude MijnSerenity-cache kon niet volledig worden gewist:',error)}
    try{localStorage.setItem('mijnserenity-runtime-build',BUILD)}catch{}
  }

  async function updateServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register(`/sw.js?v=${VERSION}`,{updateViaCache:'none'});
      await registration.update();
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){console.warn('Service worker 8.28.1 kon niet direct worden vernieuwd:',error)}
  }

  function loadFreshDashboard(){
    retireLegacy();
    syncBuild();
    if(window.__msApprovedHomeBootstrap8281)return;
    if([...document.scripts].some(script=>script.dataset?.ms8281Bootstrap==='1'))return;
    const script=document.createElement('script');
    script.src=`${DASHBOARD}?v=${VERSION}&bootstrap=1`;
    script.async=false;
    script.dataset.ms8281Bootstrap='1';
    script.onerror=()=>console.warn('Actuele MijnSerenity 8.28.1 Start kon niet direct worden geladen.');
    document.head.appendChild(script);
  }

  function loadStableCore(){
    if(window.__msBootstrap823500){loadFreshDashboard();return}
    if([...document.scripts].some(script=>script.dataset?.ms8281StableCore==='1'))return;
    const message=document.getElementById('authMsg');
    const button=document.getElementById('signInButton');
    if(button)button.disabled=true;
    if(message&&/wordt geladen/i.test(message.textContent||''))message.textContent='Beveiligde inlog wordt gestart…';
    const script=document.createElement('script');
    script.src=`${CORE}?v=${VERSION}`;
    script.async=false;
    script.dataset.ms8281StableCore='1';
    script.addEventListener('load',()=>{
      syncBuild();retireLegacy();loadFreshDashboard();
      [300,900,2200].forEach(ms=>setTimeout(()=>{syncBuild();retireLegacy();loadFreshDashboard()},ms));
    },{once:true});
    script.onerror=()=>{
      console.error('Stabiele MijnSerenity-core kon niet worden geladen.');
      if(message){message.textContent='De beveiligde inlogmodule kon niet worden geladen. Tik op “App herstellen en vernieuwen”.';message.classList.add('error')}
      loadFreshDashboard();
    };
    document.head.appendChild(script);
  }

  function init(){
    syncBuild();
    installGuardStyle();
    syncAuthChrome();
    watchAuthChrome();
    retireLegacy();
    watchLegacy();
    monitorAuthReady();
    purgeOldCaches().finally(()=>updateServiceWorker());
    loadStableCore();
  }

  window.addEventListener('mijnserenity:dashboard-ready',()=>{syncBuild();retireLegacy();syncAuthChrome()},{passive:true});
  window.addEventListener('mijnserenity:live-core-ready',()=>{syncBuild();retireLegacy();syncAuthChrome()},{passive:true});
  window.addEventListener('mijnserenity:modules-ready',()=>{syncBuild();retireLegacy();syncAuthChrome()},{passive:true});
  window.addEventListener('pageshow',()=>{syncBuild();retireLegacy();syncAuthChrome();loadFreshDashboard()},{passive:true});

  init();
})();
